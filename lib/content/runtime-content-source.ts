import type { ContentSnapshot } from './types.ts';
import {
  defaultRuntimeContentResolution,
  parsePublicationCandidateSource,
  parseRuntimeSnapshotSource,
  resolveRuntimeContentActivation,
} from './runtime-content-activation.ts';
import type {
  RuntimeContentResolution,
  RuntimeContentSourceReadResult,
} from './runtime-content-activation.ts';

export const RUNTIME_CONTENT_ROOT_ENV =
  'PECADOSVIP_RUNTIME_CONTENT_ROOT' as const;
export const RUNTIME_CONTENT_SOURCE_ENV =
  'PECADOSVIP_RUNTIME_CONTENT_SOURCE' as const;
export const RUNTIME_CONTENT_ACTIVATION_ENV =
  'PECADOSVIP_RUNTIME_CONTENT_ACTIVATION' as const;

const MAX_SNAPSHOT_BYTES = 32 * 1024 * 1024;
const MAX_CANDIDATE_MANIFEST_BYTES = 1024 * 1024;
const MAX_CANDIDATE_CONTENT_BYTES = 32 * 1024 * 1024;

type Environment = Readonly<Record<string, string | undefined>>;
type NodeFs = typeof import('node:fs');
type NodePath = typeof import('node:path');
type NodeCrypto = typeof import('node:crypto');

type NodeBuiltins = {
  fs: NodeFs;
  path: NodePath;
  crypto: NodeCrypto;
};

type StableFile = {
  text: string;
  byteLength: number;
  sha256: string;
};

type RuntimeSourceFailureReason =
  | 'UNSAFE_SOURCE_PATH'
  | 'SOURCE_MISSING'
  | 'SOURCE_UNREADABLE'
  | 'SOURCE_CHANGED'
  | 'SOURCE_TOO_LARGE';

class RuntimeSourceError extends Error {
  public readonly reasonCode: RuntimeSourceFailureReason;

  constructor(reasonCode: RuntimeSourceFailureReason) {
    super(reasonCode);
    this.name = 'RuntimeSourceError';
    this.reasonCode = reasonCode;
  }
}

function getNodeBuiltins(): NodeBuiltins | undefined {
  const getBuiltinModule = process.getBuiltinModule as
    | ((name: string) => unknown)
    | undefined;
  if (!getBuiltinModule) return undefined;
  const fs = getBuiltinModule('node:fs') as NodeFs | undefined;
  const path = getBuiltinModule('node:path') as NodePath | undefined;
  const crypto = getBuiltinModule('node:crypto') as NodeCrypto | undefined;
  return fs && path && crypto ? { fs, path, crypto } : undefined;
}

function isWithinRoot(path: NodePath, root: string, candidate: string): boolean {
  const relativePath = path.relative(root, candidate);
  return (
    relativePath === '' ||
    (relativePath !== '..' &&
      !relativePath.startsWith(`..${path.sep}`) &&
      !path.isAbsolute(relativePath))
  );
}

function containsTraversalSegment(value: string): boolean {
  return value.split(/[\\/]+/).includes('..');
}

function assertNoSymlinkInExistingPath(
  builtins: NodeBuiltins,
  target: string,
): void {
  const { fs, path } = builtins;
  let current = path.resolve(target);
  const root = path.parse(current).root;
  while (current !== root) {
    try {
      if (fs.lstatSync(current).isSymbolicLink()) {
        throw new RuntimeSourceError('UNSAFE_SOURCE_PATH');
      }
    } catch (error) {
      if (error instanceof RuntimeSourceError) throw error;
      if (
        !(
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'ENOENT'
        )
      ) {
        throw new RuntimeSourceError('SOURCE_UNREADABLE');
      }
    }
    current = path.dirname(current);
  }
}

function sha256(builtins: NodeBuiltins, bytes: Uint8Array): string {
  return builtins.crypto.createHash('sha256').update(bytes).digest('hex');
}

function readStableFile(
  builtins: NodeBuiltins,
  filePath: string,
  maxBytes: number,
): StableFile {
  const { fs } = builtins;
  assertNoSymlinkInExistingPath(builtins, filePath);
  let before;
  try {
    before = fs.lstatSync(filePath);
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    ) {
      throw new RuntimeSourceError('SOURCE_MISSING');
    }
    throw new RuntimeSourceError('SOURCE_UNREADABLE');
  }
  if (!before.isFile() || before.isSymbolicLink()) {
    throw new RuntimeSourceError('UNSAFE_SOURCE_PATH');
  }
  if (before.size < 1 || before.size > maxBytes) {
    throw new RuntimeSourceError('SOURCE_TOO_LARGE');
  }

  let descriptor: number | undefined;
  try {
    descriptor = fs.openSync(filePath, 'r');
    const openedBefore = fs.fstatSync(descriptor);
    if (
      !openedBefore.isFile() ||
      openedBefore.dev !== before.dev ||
      openedBefore.ino !== before.ino ||
      openedBefore.size !== before.size
    ) {
      throw new RuntimeSourceError('SOURCE_CHANGED');
    }
    const bytes = fs.readFileSync(descriptor);
    const openedAfter = fs.fstatSync(descriptor);
    if (
      openedAfter.size !== openedBefore.size ||
      openedAfter.mtimeMs !== openedBefore.mtimeMs ||
      bytes.byteLength !== openedAfter.size
    ) {
      throw new RuntimeSourceError('SOURCE_CHANGED');
    }
    const after = fs.lstatSync(filePath);
    if (
      after.isSymbolicLink() ||
      after.dev !== before.dev ||
      after.ino !== before.ino ||
      after.size !== before.size ||
      after.mtimeMs !== before.mtimeMs
    ) {
      throw new RuntimeSourceError('SOURCE_CHANGED');
    }
    return {
      text: bytes.toString('utf8'),
      byteLength: bytes.byteLength,
      sha256: sha256(builtins, bytes),
    };
  } catch (error) {
    if (error instanceof RuntimeSourceError) throw error;
    throw new RuntimeSourceError('SOURCE_UNREADABLE');
  } finally {
    if (descriptor !== undefined) {
      try {
        fs.closeSync(descriptor);
      } catch {
        // The read result remains fail-closed if the descriptor cannot close.
      }
    }
  }
}

function readConfiguredSource(
  builtins: NodeBuiltins,
  configuredRoot: string,
  configuredSource: string,
): RuntimeContentSourceReadResult {
  const { fs, path } = builtins;
  if (
    !configuredRoot.trim() ||
    !configuredSource.trim() ||
    !path.isAbsolute(configuredRoot) ||
    !path.isAbsolute(configuredSource) ||
    containsTraversalSegment(configuredRoot) ||
    containsTraversalSegment(configuredSource)
  ) {
    return {
      ok: false,
      sourceKind: 'unknown',
      reasonCode: 'INVALID_CONFIGURATION',
    };
  }
  const root = path.resolve(configuredRoot);
  const sourcePath = path.resolve(configuredSource);
  if (
    root === path.parse(root).root ||
    !isWithinRoot(path, root, sourcePath)
  ) {
    return {
      ok: false,
      sourcePath,
      sourceKind: 'unknown',
      reasonCode: 'UNSAFE_SOURCE_PATH',
    };
  }

  try {
    assertNoSymlinkInExistingPath(builtins, root);
    assertNoSymlinkInExistingPath(builtins, sourcePath);
    const rootEntry = fs.lstatSync(root);
    if (!rootEntry.isDirectory() || rootEntry.isSymbolicLink()) {
      throw new RuntimeSourceError('UNSAFE_SOURCE_PATH');
    }
    const sourceEntry = fs.lstatSync(sourcePath);
    if (sourceEntry.isFile() && !sourceEntry.isSymbolicLink()) {
      const source = readStableFile(
        builtins,
        sourcePath,
        MAX_SNAPSHOT_BYTES,
      );
      const parsed = parseRuntimeSnapshotSource(source.text, source.sha256);
      return parsed.ok
        ? { ok: true, sourcePath, source: parsed.source }
        : {
            ok: false,
            sourcePath,
            sourceKind: 'snapshot',
            reasonCode: parsed.reasonCode,
            validationIssueCodes: parsed.validationIssueCodes,
          };
    }
    if (!sourceEntry.isDirectory() || sourceEntry.isSymbolicLink()) {
      throw new RuntimeSourceError('UNSAFE_SOURCE_PATH');
    }

    const manifestPath = path.join(sourcePath, 'manifest.json');
    const contentPath = path.join(sourcePath, 'payload', 'content.json');
    if (
      !isWithinRoot(path, sourcePath, manifestPath) ||
      !isWithinRoot(path, sourcePath, contentPath)
    ) {
      throw new RuntimeSourceError('UNSAFE_SOURCE_PATH');
    }
    const manifest = readStableFile(
      builtins,
      manifestPath,
      MAX_CANDIDATE_MANIFEST_BYTES,
    );
    const content = readStableFile(
      builtins,
      contentPath,
      MAX_CANDIDATE_CONTENT_BYTES,
    );
    const parsed = parsePublicationCandidateSource(
      manifest.text,
      content.text,
      content.byteLength,
      content.sha256,
    );
    return parsed.ok
      ? { ok: true, sourcePath, source: parsed.source }
      : {
          ok: false,
          sourcePath,
          sourceKind: 'publication-candidate',
          reasonCode: parsed.reasonCode,
          validationIssueCodes: parsed.validationIssueCodes,
        };
  } catch (error) {
    const reasonCode =
      error instanceof RuntimeSourceError
        ? error.reasonCode
        : typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === 'ENOENT'
          ? 'SOURCE_MISSING'
          : 'SOURCE_UNREADABLE';
    return {
      ok: false,
      sourcePath,
      sourceKind: 'unknown',
      reasonCode,
    };
  }
}

export function resolveRuntimeContentFromEnvironment(
  draftSnapshot: ContentSnapshot,
  environment: Environment = process.env,
): RuntimeContentResolution {
  const configuredRoot = environment[RUNTIME_CONTENT_ROOT_ENV];
  const configuredSource = environment[RUNTIME_CONTENT_SOURCE_ENV];
  const activationValue = environment[RUNTIME_CONTENT_ACTIVATION_ENV];
  const anyConfigured =
    configuredRoot !== undefined ||
    configuredSource !== undefined ||
    activationValue !== undefined;
  if (!anyConfigured) {
    return defaultRuntimeContentResolution(draftSnapshot);
  }

  const activationRequested = activationValue === 'true';
  if (
    !configuredRoot ||
    !configuredSource ||
    (activationValue !== undefined &&
      activationValue !== 'true' &&
      activationValue !== 'false')
  ) {
    return resolveRuntimeContentActivation(draftSnapshot, activationRequested, {
      ok: false,
      sourceKind: 'unknown',
      reasonCode: 'INVALID_CONFIGURATION',
    });
  }

  const builtins = getNodeBuiltins();
  if (!builtins) {
    return resolveRuntimeContentActivation(draftSnapshot, activationRequested, {
      ok: false,
      sourceKind: 'unknown',
      reasonCode: 'RUNTIME_IO_UNAVAILABLE',
    });
  }
  return resolveRuntimeContentActivation(
    draftSnapshot,
    activationRequested,
    readConfiguredSource(builtins, configuredRoot, configuredSource),
  );
}
