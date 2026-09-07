import { randomUUID } from 'node:crypto';
import {
  closeSync,
  fstatSync,
  fsyncSync,
  lstatSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, isAbsolute, parse, resolve } from 'node:path';

const LOCK_SCHEMA = 'pecadosvip.local-file-lock';
const LOCK_VERSION = 1;
const MAX_LOCK_BYTES = 4096;

export type LocalFileLockErrorCode =
  | 'LOCK_BUSY'
  | 'LOCK_OWNERSHIP_LOST'
  | 'LOCK_UNAVAILABLE';

export class LocalFileLockError extends Error {
  public readonly code: LocalFileLockErrorCode;

  constructor(code: LocalFileLockErrorCode, message: string) {
    super(message);
    this.name = 'LocalFileLockError';
    this.code = code;
  }
}

type LockPayload = {
  schema: typeof LOCK_SCHEMA;
  version: typeof LOCK_VERSION;
  ownerToken: string;
  pid: number;
  createdAt: string;
  resourceName: string;
};

type LockLease = {
  descriptor: number;
  device: number;
  inode: number;
  lockPath: string;
  ownerToken: string;
};

function isFileSystemError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function lockFailure(
  code: LocalFileLockErrorCode,
  message: string,
  cause?: unknown,
): LocalFileLockError {
  return new LocalFileLockError(
    code,
    cause instanceof Error ? `${message} ${cause.message}` : message,
  );
}

function assertSafeExistingDirectory(directory: string): void {
  const root = parse(directory).root;
  let current = directory;
  while (current !== root) {
    let entry: ReturnType<typeof lstatSync>;
    try {
      entry = lstatSync(current);
    } catch (error) {
      throw lockFailure(
        'LOCK_UNAVAILABLE',
        'The local lock directory could not be inspected.',
        error,
      );
    }
    if (entry.isSymbolicLink()) {
      throw new LocalFileLockError(
        'LOCK_UNAVAILABLE',
        'Symbolic links are not accepted in local lock paths.',
      );
    }
    if (current === directory && !entry.isDirectory()) {
      throw new LocalFileLockError(
        'LOCK_UNAVAILABLE',
        'The local lock parent is not a regular directory.',
      );
    }
    current = dirname(current);
  }
}

export function getLocalFileLockPath(resourcePath: string): string {
  if (!resourcePath.trim() || !isAbsolute(resourcePath)) {
    throw new LocalFileLockError(
      'LOCK_UNAVAILABLE',
      'A local lock requires an explicit absolute resource path.',
    );
  }
  const normalizedResource = resolve(resourcePath);
  if (normalizedResource === parse(normalizedResource).root) {
    throw new LocalFileLockError(
      'LOCK_UNAVAILABLE',
      'A filesystem root cannot be used as a local lock resource.',
    );
  }
  return resolve(
    dirname(normalizedResource),
    `.${basename(normalizedResource)}.lock`,
  );
}

function parseLockPayload(serialized: string): LockPayload | undefined {
  let value: unknown;
  try {
    value = JSON.parse(serialized);
  } catch {
    return undefined;
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !==
      'createdAt,ownerToken,pid,resourceName,schema,version'
  ) {
    return undefined;
  }
  const candidate = value as Partial<LockPayload>;
  if (
    candidate.schema !== LOCK_SCHEMA ||
    candidate.version !== LOCK_VERSION ||
    typeof candidate.ownerToken !== 'string' ||
    !/^[0-9a-f-]{36}$/iu.test(candidate.ownerToken) ||
    typeof candidate.pid !== 'number' ||
    !Number.isSafeInteger(candidate.pid) ||
    candidate.pid < 1 ||
    typeof candidate.createdAt !== 'string' ||
    !Number.isFinite(Date.parse(candidate.createdAt)) ||
    typeof candidate.resourceName !== 'string' ||
    !candidate.resourceName ||
    candidate.resourceName.includes('/') ||
    candidate.resourceName.includes('\\')
  ) {
    return undefined;
  }
  return candidate as LockPayload;
}

function verifyOwnedLock(lease: LockLease): void {
  let entry: ReturnType<typeof lstatSync>;
  try {
    entry = lstatSync(lease.lockPath);
  } catch (error) {
    throw lockFailure(
      'LOCK_OWNERSHIP_LOST',
      'The owned local lock disappeared before release.',
      error,
    );
  }
  if (
    entry.isSymbolicLink() ||
    !entry.isFile() ||
    entry.size < 1 ||
    entry.size > MAX_LOCK_BYTES ||
    entry.dev !== lease.device ||
    entry.ino !== lease.inode
  ) {
    throw new LocalFileLockError(
      'LOCK_OWNERSHIP_LOST',
      'The local lock path no longer identifies the acquired lock.',
    );
  }
  let payload: LockPayload | undefined;
  try {
    payload = parseLockPayload(readFileSync(lease.lockPath, 'utf8'));
  } catch (error) {
    throw lockFailure(
      'LOCK_OWNERSHIP_LOST',
      'The owned local lock could not be verified before release.',
      error,
    );
  }
  if (payload?.ownerToken !== lease.ownerToken || payload.pid !== process.pid) {
    throw new LocalFileLockError(
      'LOCK_OWNERSHIP_LOST',
      'The local lock ownership token changed before release.',
    );
  }
}

function removeFailedAcquisition(
  lockPath: string,
  descriptor: number,
): void {
  let ownedIdentity: { device: number; inode: number } | undefined;
  try {
    const descriptorEntry = fstatSync(descriptor);
    ownedIdentity = {
      device: descriptorEntry.dev,
      inode: descriptorEntry.ino,
    };
  } catch {
    // Without an identity proof the path must be left in place.
  }
  try {
    closeSync(descriptor);
  } catch {
    return;
  }
  if (!ownedIdentity) {
    return;
  }
  try {
    const pathEntry = lstatSync(lockPath);
    if (
      pathEntry.isFile() &&
      !pathEntry.isSymbolicLink() &&
      pathEntry.dev === ownedIdentity.device &&
      pathEntry.ino === ownedIdentity.inode
    ) {
      unlinkSync(lockPath);
    }
  } catch {
    // Failed acquisition cleanup is best effort and never removes an
    // unverified path.
  }
}

function acquireLocalFileLock(resourcePath: string): LockLease {
  const lockPath = getLocalFileLockPath(resourcePath);
  assertSafeExistingDirectory(dirname(lockPath));
  let descriptor: number;
  try {
    descriptor = openSync(lockPath, 'wx', 0o600);
  } catch (error) {
    if (isFileSystemError(error, 'EEXIST')) {
      throw new LocalFileLockError(
        'LOCK_BUSY',
        'The local resource is already locked by another operation.',
      );
    }
    throw lockFailure(
      'LOCK_UNAVAILABLE',
      'The local resource lock could not be created exclusively.',
      error,
    );
  }

  const ownerToken = randomUUID();
  const payload: LockPayload = {
    schema: LOCK_SCHEMA,
    version: LOCK_VERSION,
    ownerToken,
    pid: process.pid,
    createdAt: new Date().toISOString(),
    resourceName: basename(resolve(resourcePath)),
  };
  try {
    writeFileSync(descriptor, `${JSON.stringify(payload)}\n`, {
      encoding: 'utf8',
    });
    fsyncSync(descriptor);
    const entry = fstatSync(descriptor);
    return {
      descriptor,
      device: entry.dev,
      inode: entry.ino,
      lockPath,
      ownerToken,
    };
  } catch (error) {
    removeFailedAcquisition(lockPath, descriptor);
    throw lockFailure(
      'LOCK_UNAVAILABLE',
      'The local resource lock could not be initialized.',
      error,
    );
  }
}

function releaseLocalFileLock(lease: LockLease): void {
  let verificationError: unknown;
  try {
    verifyOwnedLock(lease);
  } catch (error) {
    verificationError = error;
  }
  try {
    closeSync(lease.descriptor);
  } catch (error) {
    throw lockFailure(
      'LOCK_OWNERSHIP_LOST',
      'The owned local lock descriptor could not be closed.',
      error,
    );
  }
  if (verificationError) {
    throw verificationError;
  }

  // A second verification after close prevents cooperative local contenders
  // from having their lock removed. This is a local filesystem protocol, not
  // a distributed lease and not protection against a privileged hostile host.
  verifyOwnedLock(lease);
  try {
    unlinkSync(lease.lockPath);
  } catch (error) {
    throw lockFailure(
      'LOCK_OWNERSHIP_LOST',
      'The owned local lock could not be removed safely.',
      error,
    );
  }
}

function combineOperationAndReleaseErrors(options: {
  operationFailed: boolean;
  operationError: unknown;
  releaseFailed: boolean;
  releaseError: unknown;
}): never {
  if (options.operationFailed && options.releaseFailed) {
    throw new AggregateError(
      [options.operationError, options.releaseError],
      'The local operation and its lock release both failed.',
    );
  }
  if (options.operationFailed) {
    throw options.operationError;
  }
  throw options.releaseError;
}

export function withLocalFileLockSync<T>(
  resourcePath: string,
  operation: () => T,
): T {
  const lease = acquireLocalFileLock(resourcePath);
  let result: T | undefined;
  let operationFailed = false;
  let operationError: unknown;
  try {
    result = operation();
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }
  let releaseFailed = false;
  let releaseError: unknown;
  try {
    releaseLocalFileLock(lease);
  } catch (error) {
    releaseFailed = true;
    releaseError = error;
  }
  if (operationFailed || releaseFailed) {
    combineOperationAndReleaseErrors({
      operationFailed,
      operationError,
      releaseFailed,
      releaseError,
    });
  }
  return result as T;
}

export async function withLocalFileLock<T>(
  resourcePath: string,
  operation: () => Promise<T> | T,
): Promise<T> {
  const lease = acquireLocalFileLock(resourcePath);
  let result: T | undefined;
  let operationFailed = false;
  let operationError: unknown;
  try {
    result = await operation();
  } catch (error) {
    operationFailed = true;
    operationError = error;
  }
  let releaseFailed = false;
  let releaseError: unknown;
  try {
    releaseLocalFileLock(lease);
  } catch (error) {
    releaseFailed = true;
    releaseError = error;
  }
  if (operationFailed || releaseFailed) {
    combineOperationAndReleaseErrors({
      operationFailed,
      operationError,
      releaseFailed,
      releaseError,
    });
  }
  return result as T;
}
