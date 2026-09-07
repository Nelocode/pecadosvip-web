import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  parse,
  relative,
  resolve,
  sep,
} from 'node:path';

import {
  LocalFileLockError,
  withLocalFileLock,
} from './local-file-lock.ts';

const BACKUP_SCHEMA = 'pecadosvip.local-backup';
const BACKUP_VERSION = 1;
const CMS_LOGICAL_PATH = 'cms/state.json';
const MANIFEST_FILE = 'manifest.json';
const PAYLOAD_DIRECTORY = 'payload';
const MAX_FILE_BYTES = 128 * 1024 * 1024;
const MAX_TOTAL_BYTES = 768 * 1024 * 1024;
const MAX_MANIFEST_BYTES = 1024 * 1024;
const MAX_FILE_COUNT = 10_000;

export type LocalRuntimeMode = 'development' | 'test';

export type LocalBackupFile = {
  path: string;
  byteLength: number;
  sha256: string;
};

export type LocalBackupManifest = {
  schema: typeof BACKUP_SCHEMA;
  version: typeof BACKUP_VERSION;
  createdAt: string;
  fileCount: number;
  totalBytes: number;
  files: LocalBackupFile[];
};

export type CreateLocalBackupOptions = {
  runtimeMode: LocalRuntimeMode;
  cmsStateFile: string;
  mediaRoot: string;
  backupDirectory: string;
  clock?: () => string;
};

export type RestoreLocalBackupOptions = {
  runtimeMode: LocalRuntimeMode;
  backupDirectory: string;
  destinationRoot: string;
  overwrite?: boolean;
};

export type RestoredLocalState = {
  manifest: LocalBackupManifest;
  destinationRoot: string;
  cmsStateFile: string;
  mediaRoot: string;
};

export type LocalBackupErrorCode =
  | 'INVALID_RUNTIME'
  | 'INVALID_PATH'
  | 'SOURCE_BUSY'
  | 'SOURCE_CHANGED'
  | 'SOURCE_UNAVAILABLE'
  | 'UNSAFE_ENTRY'
  | 'BACKUP_EXISTS'
  | 'DESTINATION_NOT_EMPTY'
  | 'CORRUPT_BACKUP'
  | 'IO_FAILURE';

export class LocalBackupError extends Error {
  public readonly code: LocalBackupErrorCode;

  constructor(code: LocalBackupErrorCode, message: string) {
    super(message);
    this.name = 'LocalBackupError';
    this.code = code;
  }
}

type SafeFile = {
  logicalPath: string;
  absolutePath: string;
};

function isFileSystemError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function assertLocalRuntime(runtimeMode: LocalRuntimeMode): void {
  if (
    (runtimeMode !== 'development' && runtimeMode !== 'test') ||
    process.env.NODE_ENV === 'production'
  ) {
    throw new LocalBackupError(
      'INVALID_RUNTIME',
      'Local backup and restore are restricted to development and tests.',
    );
  }
}

function normalizeExplicitPath(value: string, label: string): string {
  if (!value.trim() || !isAbsolute(value)) {
    throw new LocalBackupError(
      'INVALID_PATH',
      `${label} requires an explicit absolute path.`,
    );
  }
  const normalized = resolve(value);
  if (normalized === parse(normalized).root) {
    throw new LocalBackupError(
      'INVALID_PATH',
      `${label} cannot be a filesystem root.`,
    );
  }
  return normalized;
}

function isWithin(parent: string, candidate: string): boolean {
  const child = relative(parent, candidate);
  return (
    child !== '' &&
    child !== '..' &&
    !child.startsWith(`..${sep}`) &&
    !isAbsolute(child)
  );
}

function pathsOverlap(left: string, right: string): boolean {
  return left === right || isWithin(left, right) || isWithin(right, left);
}

async function optionalLstat(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (isFileSystemError(error, 'ENOENT')) {
      return undefined;
    }
    throw new LocalBackupError(
      'IO_FAILURE',
      'A local backup path could not be inspected.',
    );
  }
}

async function assertNoSymlinkInExistingPath(path: string): Promise<void> {
  let current = resolve(path);
  const root = parse(current).root;
  while (current !== root) {
    const entry = await optionalLstat(current);
    if (entry?.isSymbolicLink()) {
      throw new LocalBackupError(
        'UNSAFE_ENTRY',
        'Symbolic links are not accepted in local backup paths.',
      );
    }
    current = dirname(current);
  }
}

async function ensureSafeDirectory(path: string): Promise<void> {
  await assertNoSymlinkInExistingPath(path);
  try {
    await mkdir(path, { recursive: true, mode: 0o700 });
  } catch {
    throw new LocalBackupError(
      'IO_FAILURE',
      'A local backup directory could not be created.',
    );
  }
  await assertSafeDirectory(path, 'IO_FAILURE');
}

async function assertSafeDirectory(
  path: string,
  code: LocalBackupErrorCode,
): Promise<void> {
  await assertNoSymlinkInExistingPath(path);
  const entry = await optionalLstat(path);
  if (!entry?.isDirectory() || entry.isSymbolicLink()) {
    throw new LocalBackupError(code, 'Expected a safe regular directory.');
  }
}

async function assertSafeRegularFile(
  path: string,
  code: LocalBackupErrorCode,
  maxBytes = MAX_FILE_BYTES,
) {
  await assertNoSymlinkInExistingPath(path);
  const entry = await optionalLstat(path);
  if (
    !entry?.isFile() ||
    entry.isSymbolicLink() ||
    entry.size < 1 ||
    entry.size > maxBytes
  ) {
    throw new LocalBackupError(code, 'Expected a bounded regular file.');
  }
  return entry;
}

function assertSafeLogicalPath(value: string): void {
  if (
    !value ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes('\0') ||
    value.length > 512
  ) {
    throw new LocalBackupError(
      'CORRUPT_BACKUP',
      'The backup manifest contains an unsafe path.',
    );
  }
  const segments = value.split('/');
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === '.' ||
        segment === '..' ||
        segment.endsWith('.') ||
        segment.endsWith(' ') ||
        /^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(segment) ||
        /[<>:"|?*]/.test(segment),
    )
  ) {
    throw new LocalBackupError(
      'CORRUPT_BACKUP',
      'The backup manifest contains an unsafe path segment.',
    );
  }
  if (
    value !== CMS_LOGICAL_PATH &&
    !(segments[0] === 'media' && segments.length >= 2)
  ) {
    throw new LocalBackupError(
      'CORRUPT_BACKUP',
      'The backup manifest contains an unsupported payload path.',
    );
  }
}

function assertSafeMediaRelativePath(value: string): void {
  assertSafeLogicalPath(`media/${value.replaceAll('\\', '/')}`);
}

function safePayloadPath(payloadRoot: string, logicalPath: string): string {
  assertSafeLogicalPath(logicalPath);
  const candidate = resolve(payloadRoot, ...logicalPath.split('/'));
  if (!isWithin(payloadRoot, candidate)) {
    throw new LocalBackupError(
      'CORRUPT_BACKUP',
      'The backup payload path escapes its root.',
    );
  }
  return candidate;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function readStableFile(
  path: string,
  code: LocalBackupErrorCode,
  maxBytes = MAX_FILE_BYTES,
): Promise<Buffer> {
  const before = await assertSafeRegularFile(path, code, maxBytes);
  let bytes: Buffer;
  try {
    bytes = await readFile(path);
  } catch {
    throw new LocalBackupError(code, 'A local backup file could not be read.');
  }
  const after = await assertSafeRegularFile(path, code, maxBytes);
  if (
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs ||
    bytes.byteLength !== after.size
  ) {
    throw new LocalBackupError(
      code,
      'A local backup source changed while it was being read.',
    );
  }
  return bytes;
}

async function writeExclusive(path: string, bytes: Uint8Array | string) {
  const handle = await open(path, 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function listSourceFiles(
  root: string,
  logicalPrefix: 'media',
): Promise<SafeFile[]> {
  await assertSafeDirectory(root, 'SOURCE_UNAVAILABLE');
  const files: SafeFile[] = [];

  async function visit(directory: string, relativeDirectory: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch {
      throw new LocalBackupError(
        'SOURCE_UNAVAILABLE',
        'The local media source could not be enumerated.',
      );
    }
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const absolutePath = resolve(directory, entry.name);
      if (!isWithin(root, absolutePath)) {
        throw new LocalBackupError(
          'UNSAFE_ENTRY',
          'A local media source path escapes its root.',
        );
      }
      const relativePath = relativeDirectory
        ? `${relativeDirectory}/${entry.name}`
        : entry.name;
      assertSafeMediaRelativePath(relativePath);
      const inspected = await optionalLstat(absolutePath);
      if (
        !inspected ||
        inspected.isSymbolicLink() ||
        (!inspected.isDirectory() && !inspected.isFile())
      ) {
        throw new LocalBackupError(
          'UNSAFE_ENTRY',
          'Local backups accept only regular files and directories.',
        );
      }
      if (inspected.isDirectory()) {
        await visit(absolutePath, relativePath);
      } else {
        if (inspected.size < 1 || inspected.size > MAX_FILE_BYTES) {
          throw new LocalBackupError(
            'SOURCE_UNAVAILABLE',
            'A local media file exceeds the supported size.',
          );
        }
        files.push({
          logicalPath: `${logicalPrefix}/${relativePath.replaceAll('\\', '/')}`,
          absolutePath,
        });
        if (files.length >= MAX_FILE_COUNT) {
          throw new LocalBackupError(
            'SOURCE_UNAVAILABLE',
            'The local backup contains too many files.',
          );
        }
      }
    }
  }

  await visit(root, '');
  return files;
}

async function assertSourceSnapshotUnchanged(
  cmsStateFile: string,
  mediaRoot: string,
  originalSources: readonly SafeFile[],
  copiedFiles: readonly LocalBackupFile[],
): Promise<void> {
  let currentSources: SafeFile[];
  try {
    currentSources = [
      { logicalPath: CMS_LOGICAL_PATH, absolutePath: cmsStateFile },
      ...(await listSourceFiles(mediaRoot, 'media')),
    ].sort((left, right) => left.logicalPath.localeCompare(right.logicalPath));
  } catch (error) {
    if (error instanceof LocalBackupError && error.code === 'UNSAFE_ENTRY') {
      throw error;
    }
    throw new LocalBackupError(
      'SOURCE_CHANGED',
      'The local backup source tree changed during snapshot creation.',
    );
  }
  if (
    currentSources.length !== originalSources.length ||
    currentSources.some(
      (source, index) =>
        source.logicalPath !== originalSources[index]?.logicalPath ||
        source.absolutePath !== originalSources[index]?.absolutePath,
    )
  ) {
    throw new LocalBackupError(
      'SOURCE_CHANGED',
      'The local backup source inventory changed during snapshot creation.',
    );
  }
  for (let index = 0; index < currentSources.length; index += 1) {
    const source = currentSources[index]!;
    const copied = copiedFiles[index];
    if (!copied || source.logicalPath !== copied.path) {
      throw new LocalBackupError(
        'SOURCE_CHANGED',
        'The local backup source ordering changed during snapshot creation.',
      );
    }
    const bytes = await readStableFile(source.absolutePath, 'SOURCE_CHANGED');
    if (bytes.byteLength !== copied.byteLength || sha256(bytes) !== copied.sha256) {
      throw new LocalBackupError(
        'SOURCE_CHANGED',
        'A local backup source changed during snapshot creation.',
      );
    }
  }
}

async function cleanupPrivateDirectory(path: string, parent: string): Promise<void> {
  if (!isWithin(parent, path) || !basename(path).startsWith('.pecadosvip-')) {
    return;
  }
  await rm(path, { recursive: true, force: true }).catch(() => undefined);
}

function parseManifest(value: unknown): LocalBackupManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new LocalBackupError('CORRUPT_BACKUP', 'Invalid backup manifest.');
  }
  const candidate = value as Partial<LocalBackupManifest>;
  if (
    Object.keys(candidate).sort().join(',') !==
      'createdAt,fileCount,files,schema,totalBytes,version' ||
    candidate.schema !== BACKUP_SCHEMA ||
    candidate.version !== BACKUP_VERSION ||
    typeof candidate.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.createdAt)) ||
    !Number.isSafeInteger(candidate.fileCount) ||
    !Number.isSafeInteger(candidate.totalBytes) ||
    !Array.isArray(candidate.files) ||
    candidate.files.length < 1 ||
    candidate.files.length > MAX_FILE_COUNT ||
    candidate.fileCount !== candidate.files.length
  ) {
    throw new LocalBackupError(
      'CORRUPT_BACKUP',
      'The backup manifest has an unsupported envelope.',
    );
  }

  const files: LocalBackupFile[] = [];
  const seen = new Set<string>();
  let totalBytes = 0;
  for (const value of candidate.files) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new LocalBackupError(
        'CORRUPT_BACKUP',
        'The backup manifest contains an invalid file entry.',
      );
    }
    const file = value as Partial<LocalBackupFile>;
    if (
      Object.keys(file).sort().join(',') !== 'byteLength,path,sha256' ||
      typeof file.path !== 'string' ||
      typeof file.byteLength !== 'number' ||
      !Number.isSafeInteger(file.byteLength) ||
      file.byteLength < 1 ||
      file.byteLength > MAX_FILE_BYTES ||
      typeof file.sha256 !== 'string' ||
      !/^[0-9a-f]{64}$/.test(file.sha256)
    ) {
      throw new LocalBackupError(
        'CORRUPT_BACKUP',
        'The backup manifest contains invalid integrity metadata.',
      );
    }
    assertSafeLogicalPath(file.path);
    if (seen.has(file.path)) {
      throw new LocalBackupError(
        'CORRUPT_BACKUP',
        'The backup manifest contains duplicate paths.',
      );
    }
    seen.add(file.path);
    totalBytes += file.byteLength;
    if (!Number.isSafeInteger(totalBytes) || totalBytes > MAX_TOTAL_BYTES) {
      throw new LocalBackupError(
        'CORRUPT_BACKUP',
        'The backup manifest total exceeds the safe local restore budget.',
      );
    }
    files.push({
      path: file.path,
      byteLength: file.byteLength,
      sha256: file.sha256,
    });
  }
  if (
    !seen.has(CMS_LOGICAL_PATH) ||
    candidate.totalBytes !== totalBytes ||
    files.some((file, index) => index > 0 && files[index - 1]!.path >= file.path)
  ) {
    throw new LocalBackupError(
      'CORRUPT_BACKUP',
      'The backup manifest is incomplete or non-canonical.',
    );
  }

  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    createdAt: candidate.createdAt,
    fileCount: files.length,
    totalBytes,
    files,
  };
}

async function enumeratePayloadFiles(payloadRoot: string): Promise<string[]> {
  await assertSafeDirectory(payloadRoot, 'CORRUPT_BACKUP');
  const files: string[] = [];

  async function visit(directory: string, logicalDirectory: string): Promise<void> {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => {
      throw new LocalBackupError(
        'CORRUPT_BACKUP',
        'The backup payload could not be enumerated.',
      );
    });
    entries.sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      const logicalPath = logicalDirectory
        ? `${logicalDirectory}/${entry.name}`
        : entry.name;
      const absolutePath = resolve(directory, entry.name);
      if (!isWithin(payloadRoot, absolutePath)) {
        throw new LocalBackupError(
          'CORRUPT_BACKUP',
          'The backup payload escapes its root.',
        );
      }
      const inspected = await optionalLstat(absolutePath);
      if (
        !inspected ||
        inspected.isSymbolicLink() ||
        (!inspected.isDirectory() && !inspected.isFile())
      ) {
        throw new LocalBackupError(
          'CORRUPT_BACKUP',
          'The backup payload contains an unsafe entry.',
        );
      }
      if (inspected.isDirectory()) {
        const isAllowedDirectory =
          logicalPath === 'cms' ||
          logicalPath === 'media' ||
          logicalPath.startsWith('media/');
        if (!isAllowedDirectory) {
          throw new LocalBackupError(
            'CORRUPT_BACKUP',
            'The backup payload contains an unsupported directory.',
          );
        }
        await visit(absolutePath, logicalPath);
      } else {
        assertSafeLogicalPath(logicalPath);
        files.push(logicalPath);
        if (files.length > MAX_FILE_COUNT) {
          throw new LocalBackupError(
            'CORRUPT_BACKUP',
            'The backup payload contains too many files.',
          );
        }
      }
    }
  }

  await visit(payloadRoot, '');
  return files.sort((left, right) => left.localeCompare(right));
}

async function validateBackup(backupDirectory: string) {
  await assertSafeDirectory(backupDirectory, 'CORRUPT_BACKUP');
  const rootEntries = await readdir(backupDirectory, { withFileTypes: true }).catch(
    () => {
      throw new LocalBackupError(
        'CORRUPT_BACKUP',
        'The local backup could not be enumerated.',
      );
    },
  );
  const rootNames = rootEntries.map((entry) => entry.name).sort();
  if (
    rootNames.length !== 2 ||
    rootNames[0] !== MANIFEST_FILE ||
    rootNames[1] !== PAYLOAD_DIRECTORY ||
    rootEntries.some((entry) => entry.isSymbolicLink())
  ) {
    throw new LocalBackupError(
      'CORRUPT_BACKUP',
      'The local backup envelope contains unexpected entries.',
    );
  }

  const manifestPath = resolve(backupDirectory, MANIFEST_FILE);
  const manifestBytes = await readStableFile(
    manifestPath,
    'CORRUPT_BACKUP',
    MAX_MANIFEST_BYTES,
  );
  let parsed: unknown;
  try {
    parsed = JSON.parse(manifestBytes.toString('utf8'));
  } catch {
    throw new LocalBackupError(
      'CORRUPT_BACKUP',
      'The backup manifest is not valid JSON.',
    );
  }
  const manifest = parseManifest(parsed);
  const payloadRoot = resolve(backupDirectory, PAYLOAD_DIRECTORY);
  const payloadFiles = await enumeratePayloadFiles(payloadRoot);
  const manifestFiles = manifest.files.map((file) => file.path);
  if (
    payloadFiles.length !== manifestFiles.length ||
    payloadFiles.some((path, index) => path !== manifestFiles[index])
  ) {
    throw new LocalBackupError(
      'CORRUPT_BACKUP',
      'The backup manifest does not match its payload.',
    );
  }
  for (const file of manifest.files) {
    const bytes = await readStableFile(
      safePayloadPath(payloadRoot, file.path),
      'CORRUPT_BACKUP',
    );
    if (bytes.byteLength !== file.byteLength || sha256(bytes) !== file.sha256) {
      throw new LocalBackupError(
        'CORRUPT_BACKUP',
        'The backup payload failed its integrity check.',
      );
    }
  }
  return { manifest, payloadRoot };
}

export async function createLocalBackup(
  options: CreateLocalBackupOptions,
): Promise<LocalBackupManifest> {
  assertLocalRuntime(options.runtimeMode);
  const cmsStateFile = normalizeExplicitPath(
    options.cmsStateFile,
    'CMS state source',
  );
  const mediaRoot = normalizeExplicitPath(options.mediaRoot, 'Media source');
  const backupDirectory = normalizeExplicitPath(
    options.backupDirectory,
    'Backup destination',
  );
  if (
    pathsOverlap(cmsStateFile, mediaRoot) ||
    pathsOverlap(backupDirectory, cmsStateFile) ||
    pathsOverlap(backupDirectory, mediaRoot)
  ) {
    throw new LocalBackupError(
      'INVALID_PATH',
      'Backup sources and destination must be disjoint.',
    );
  }
  await assertSafeRegularFile(cmsStateFile, 'SOURCE_UNAVAILABLE');
  await assertSafeDirectory(mediaRoot, 'SOURCE_UNAVAILABLE');
  if (await optionalLstat(backupDirectory)) {
    throw new LocalBackupError(
      'BACKUP_EXISTS',
      'The backup destination already exists.',
    );
  }

  const parent = dirname(backupDirectory);
  await ensureSafeDirectory(parent);
  const staging = resolve(
    parent,
    `.pecadosvip-backup-staging-${randomUUID()}`,
  );
  if (!isWithin(parent, staging)) {
    throw new LocalBackupError('INVALID_PATH', 'Unsafe backup staging path.');
  }

  try {
    return await withLocalFileLock(cmsStateFile, () =>
      withLocalFileLock(mediaRoot, async () => {
      await assertSafeRegularFile(cmsStateFile, 'SOURCE_UNAVAILABLE');
      await assertSafeDirectory(mediaRoot, 'SOURCE_UNAVAILABLE');
      if (await optionalLstat(backupDirectory)) {
        throw new LocalBackupError(
          'BACKUP_EXISTS',
          'The backup destination already exists.',
        );
      }
      try {
        await mkdir(staging, { mode: 0o700 });
        const payloadRoot = resolve(staging, PAYLOAD_DIRECTORY);
        await mkdir(resolve(payloadRoot, 'cms'), {
          recursive: true,
          mode: 0o700,
        });
        await mkdir(resolve(payloadRoot, 'media'), {
          recursive: true,
          mode: 0o700,
        });

        const sources: SafeFile[] = [
          { logicalPath: CMS_LOGICAL_PATH, absolutePath: cmsStateFile },
          ...(await listSourceFiles(mediaRoot, 'media')),
        ].sort((left, right) => left.logicalPath.localeCompare(right.logicalPath));
        const files: LocalBackupFile[] = [];
        let totalBytes = 0;
        for (const source of sources) {
          const bytes = await readStableFile(
            source.absolutePath,
            'SOURCE_UNAVAILABLE',
          );
          const destination = safePayloadPath(payloadRoot, source.logicalPath);
          await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
          await writeExclusive(destination, bytes);
          files.push({
            path: source.logicalPath,
            byteLength: bytes.byteLength,
            sha256: sha256(bytes),
          });
          totalBytes += bytes.byteLength;
          if (!Number.isSafeInteger(totalBytes) || totalBytes > MAX_TOTAL_BYTES) {
            throw new LocalBackupError(
              'SOURCE_UNAVAILABLE',
              'The local backup exceeds the safe aggregate size budget.',
            );
          }
        }
        await assertSourceSnapshotUnchanged(
          cmsStateFile,
          mediaRoot,
          sources,
          files,
        );

        const createdAt = (options.clock ?? (() => new Date().toISOString()))();
        if (!Number.isFinite(Date.parse(createdAt))) {
          throw new LocalBackupError(
            'IO_FAILURE',
            'The local backup clock returned an invalid timestamp.',
          );
        }
        const manifest: LocalBackupManifest = {
          schema: BACKUP_SCHEMA,
          version: BACKUP_VERSION,
          createdAt,
          fileCount: files.length,
          totalBytes,
          files,
        };
        await writeExclusive(
          resolve(staging, MANIFEST_FILE),
          `${JSON.stringify(manifest, null, 2)}\n`,
        );
        await validateBackup(staging);
        await rename(staging, backupDirectory);
        return structuredClone(manifest);
      } catch (error) {
        await cleanupPrivateDirectory(staging, parent);
        if (error instanceof LocalBackupError) {
          throw error;
        }
        throw new LocalBackupError(
          'IO_FAILURE',
          'The local backup could not be committed atomically.',
        );
      }
      }),
    );
  } catch (error) {
    if (
      error instanceof LocalFileLockError &&
      error.code === 'LOCK_BUSY'
    ) {
      throw new LocalBackupError(
        'SOURCE_BUSY',
        'The local CMS state is already in use by another operation.',
      );
    }
    if (error instanceof LocalBackupError) {
      throw error;
    }
    throw new LocalBackupError(
      'IO_FAILURE',
      'The local backup lock could not be acquired or released safely.',
    );
  }
}

export async function restoreLocalBackup(
  options: RestoreLocalBackupOptions,
): Promise<RestoredLocalState> {
  assertLocalRuntime(options.runtimeMode);
  const backupDirectory = normalizeExplicitPath(
    options.backupDirectory,
    'Backup source',
  );
  const destinationRoot = normalizeExplicitPath(
    options.destinationRoot,
    'Restore destination',
  );
  if (pathsOverlap(backupDirectory, destinationRoot)) {
    throw new LocalBackupError(
      'INVALID_PATH',
      'Backup source and restore destination must be disjoint.',
    );
  }
  const { manifest, payloadRoot } = await validateBackup(backupDirectory);
  const parent = dirname(destinationRoot);
  await ensureSafeDirectory(parent);
  await assertNoSymlinkInExistingPath(destinationRoot);
  const existing = await optionalLstat(destinationRoot);
  if (existing && (!existing.isDirectory() || existing.isSymbolicLink())) {
    throw new LocalBackupError(
      'UNSAFE_ENTRY',
      'The restore destination is not a safe directory.',
    );
  }
  if (existing) {
    const entries = await readdir(destinationRoot);
    if (entries.length > 0 && options.overwrite !== true) {
      throw new LocalBackupError(
        'DESTINATION_NOT_EMPTY',
        'A non-empty restore destination requires explicit overwrite.',
      );
    }
  }

  const staging = resolve(
    parent,
    `.pecadosvip-restore-staging-${randomUUID()}`,
  );
  const rollback = resolve(
    parent,
    `.pecadosvip-restore-rollback-${randomUUID()}`,
  );
  if (!isWithin(parent, staging) || !isWithin(parent, rollback)) {
    throw new LocalBackupError('INVALID_PATH', 'Unsafe restore staging path.');
  }
  let displaced = false;
  let committed = false;
  try {
    await mkdir(staging, { mode: 0o700 });
    for (const file of manifest.files) {
      const source = safePayloadPath(payloadRoot, file.path);
      const bytes = await readStableFile(source, 'CORRUPT_BACKUP');
      if (bytes.byteLength !== file.byteLength || sha256(bytes) !== file.sha256) {
        throw new LocalBackupError(
          'CORRUPT_BACKUP',
          'The backup payload changed during restore.',
        );
      }
      // The backup envelope keeps the CMS document namespaced as
      // `cms/state.json`, while an activated local data root must match the
      // workbench contract (`profiles.json` beside `media/`). Restore directly
      // into that launcher-compatible layout so a validated destination can be
      // selected without a second, unverified copy step.
      const destination =
        file.path === CMS_LOGICAL_PATH
          ? resolve(staging, 'profiles.json')
          : safePayloadPath(staging, file.path);
      await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
      await writeExclusive(destination, bytes);
    }
    if (existing) {
      await rename(destinationRoot, rollback);
      displaced = true;
    }
    await rename(staging, destinationRoot);
    committed = true;
    if (displaced) {
      await cleanupPrivateDirectory(rollback, parent);
    }
    return {
      manifest: structuredClone(manifest),
      destinationRoot,
      cmsStateFile: resolve(destinationRoot, 'profiles.json'),
      mediaRoot: resolve(destinationRoot, 'media'),
    };
  } catch (error) {
    await cleanupPrivateDirectory(staging, parent);
    if (displaced && !committed && !(await optionalLstat(destinationRoot))) {
      await rename(rollback, destinationRoot).catch(() => undefined);
    }
    if (error instanceof LocalBackupError) {
      throw error;
    }
    throw new LocalBackupError(
      'IO_FAILURE',
      'The local backup could not be restored atomically.',
    );
  } finally {
    if (committed) {
      await cleanupPrivateDirectory(rollback, parent);
    }
  }
}
