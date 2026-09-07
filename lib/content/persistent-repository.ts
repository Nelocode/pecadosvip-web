import { randomUUID } from 'node:crypto';
import {
  closeSync,
  fsyncSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, parse, resolve } from 'node:path';

import {
  LocalFileLockError,
  withLocalFileLockSync,
} from '../operations/local-file-lock.ts';
import {
  InMemoryProfileRepository,
  RepositoryError,
} from './repository.ts';
import type {
  Actor,
  CreateContext,
  EditableProfilePatch,
  NewProfileInput,
  ProfileRepository,
  ProfileRepositoryState,
  VerificationEvidence,
  WriteContext,
} from './repository.ts';
import type { ProfilePublicationReferences } from './validation.ts';
import type {
  AuditEvent,
  Availability,
  Profile,
  PublicationStatus,
} from './types.ts';

const ENVELOPE_SCHEMA = 'pecadosvip.profile-repository';
const ENVELOPE_VERSION = 1;
const MAX_STATE_BYTES = 16 * 1024 * 1024;

type JsonRepositoryEnvelope = {
  schema: typeof ENVELOPE_SCHEMA;
  version: typeof ENVELOPE_VERSION;
  state: ProfileRepositoryState;
};

export type PersistentJsonProfileRepositoryOptions = {
  filePath: string;
  runtimeMode: 'development' | 'test';
  seedProfiles?: readonly Profile[];
  clock?: () => string;
  publicationReferences?: ProfilePublicationReferences;
};

function isFileSystemError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function getEntry(path: string): ReturnType<typeof lstatSync> | undefined {
  try {
    return lstatSync(path);
  } catch (error) {
    if (isFileSystemError(error, 'ENOENT')) {
      return undefined;
    }
    throw new RepositoryError(
      'PERSISTENCE_UNAVAILABLE',
      'The local repository storage could not be inspected.',
    );
  }
}

function assertNoSymlinkInExistingPath(path: string): void {
  const root = parse(path).root;
  let current = path;
  while (current !== root) {
    const entry = getEntry(current);
    if (entry?.isSymbolicLink()) {
      throw new RepositoryError(
        'PERSISTENCE_UNAVAILABLE',
        'Symbolic links are not accepted for local repository storage.',
      );
    }
    current = dirname(current);
  }
}

function ensureSafeDirectory(directory: string): void {
  assertNoSymlinkInExistingPath(directory);
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
  } catch {
    throw new RepositoryError(
      'PERSISTENCE_UNAVAILABLE',
      'The local repository directory could not be created.',
    );
  }
  const entry = getEntry(directory);
  if (!entry?.isDirectory() || entry.isSymbolicLink()) {
    throw new RepositoryError(
      'PERSISTENCE_UNAVAILABLE',
      'The local repository directory is not a safe directory.',
    );
  }
}

function assertSafeStateFile(filePath: string):
  | ReturnType<typeof lstatSync>
  | undefined {
  const entry = getEntry(filePath);
  if (!entry) {
    return undefined;
  }
  if (!entry.isFile() || entry.isSymbolicLink()) {
    throw new RepositoryError(
      'PERSISTENCE_CORRUPT',
      'The local repository state is not a regular file.',
    );
  }
  if (entry.size > MAX_STATE_BYTES) {
    throw new RepositoryError(
      'PERSISTENCE_CORRUPT',
      'The local repository state exceeds the supported size.',
    );
  }
  return entry;
}

function parseEnvelope(serialized: string): ProfileRepositoryState {
  let candidate: unknown;
  try {
    candidate = JSON.parse(serialized);
  } catch {
    throw new RepositoryError(
      'PERSISTENCE_CORRUPT',
      'The local repository state is not valid JSON.',
    );
  }
  if (
    typeof candidate !== 'object' ||
    candidate === null ||
    Array.isArray(candidate) ||
    Object.keys(candidate).some(
      (key) => !['schema', 'version', 'state'].includes(key),
    ) ||
    !('schema' in candidate) ||
    candidate.schema !== ENVELOPE_SCHEMA ||
    !('version' in candidate) ||
    candidate.version !== ENVELOPE_VERSION ||
    !('state' in candidate)
  ) {
    throw new RepositoryError(
      'PERSISTENCE_CORRUPT',
      'The local repository state has an unsupported envelope.',
    );
  }
  return candidate.state as ProfileRepositoryState;
}

function loadState(filePath: string): ProfileRepositoryState | undefined {
  if (!assertSafeStateFile(filePath)) {
    return undefined;
  }
  try {
    return parseEnvelope(readFileSync(filePath, 'utf8'));
  } catch (error) {
    if (error instanceof RepositoryError) {
      throw error;
    }
    throw new RepositoryError(
      'PERSISTENCE_UNAVAILABLE',
      'The local repository state could not be read.',
    );
  }
}

function removeTemporaryFile(filePath: string): void {
  try {
    unlinkSync(filePath);
  } catch (error) {
    if (!isFileSystemError(error, 'ENOENT')) {
      // A failed cleanup must not replace the original persistence error.
    }
  }
}

function saveStateAtomically(
  filePath: string,
  state: ProfileRepositoryState,
): void {
  const directory = dirname(filePath);
  ensureSafeDirectory(directory);
  assertSafeStateFile(filePath);
  const envelope: JsonRepositoryEnvelope = {
    schema: ENVELOPE_SCHEMA,
    version: ENVELOPE_VERSION,
    state: structuredClone(state),
  };
  const serialized = JSON.stringify(envelope) + '\n';
  if (Buffer.byteLength(serialized, 'utf8') > MAX_STATE_BYTES) {
    throw new RepositoryError(
      'PERSISTENCE_UNAVAILABLE',
      'The local repository state exceeds the supported size.',
    );
  }
  const temporaryPath = resolve(
    directory,
    `.${basename(filePath)}.${process.pid}.${randomUUID()}.tmp`,
  );
  let descriptor: number | undefined;
  try {
    descriptor = openSync(temporaryPath, 'wx', 0o600);
    writeFileSync(descriptor, serialized, { encoding: 'utf8' });
    fsyncSync(descriptor);
    closeSync(descriptor);
    descriptor = undefined;
    renameSync(temporaryPath, filePath);
  } catch {
    if (descriptor !== undefined) {
      try {
        closeSync(descriptor);
      } catch {
        // Preserve the original persistence failure.
      }
    }
    removeTemporaryFile(temporaryPath);
    throw new RepositoryError(
      'PERSISTENCE_UNAVAILABLE',
      'The local repository state could not be committed atomically.',
    );
  }
}

/**
 * Local development/test adapter. It deliberately has no production mode,
 * network provider, authentication facade, public route or physical delete.
 * Atomic rename protects each file commit; an adjacent exclusive-create lock
 * serializes cooperating processes on this local filesystem. It is not a
 * distributed lease and stale locks are never deleted automatically.
 */
export class PersistentJsonProfileRepository implements ProfileRepository {
  private readonly filePath: string;
  private readonly clock: () => string;
  private readonly publicationReferences?: ProfilePublicationReferences;
  private repository!: InMemoryProfileRepository;

  constructor(options: PersistentJsonProfileRepositoryOptions) {
    if (
      (options.runtimeMode !== 'development' && options.runtimeMode !== 'test') ||
      process.env.NODE_ENV === 'production'
    ) {
      throw new RepositoryError(
        'PERSISTENCE_UNAVAILABLE',
        'Local JSON persistence is restricted to development and tests.',
      );
    }
    if (!options.filePath.trim()) {
      throw new RepositoryError(
        'INVALID_INPUT',
        'A local JSON state file path is required.',
      );
    }
    this.filePath = resolve(options.filePath);
    if (!basename(this.filePath).toLowerCase().endsWith('.json')) {
      throw new RepositoryError(
        'INVALID_INPUT',
        'The local repository state file must use the JSON extension.',
      );
    }
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.publicationReferences = options.publicationReferences
      ? structuredClone(options.publicationReferences)
      : undefined;
    ensureSafeDirectory(dirname(this.filePath));
    this.withExclusiveFileOperation(() => {
      const state = loadState(this.filePath);
      if (state) {
        this.repository = this.restore(state);
        return;
      }
      this.repository = new InMemoryProfileRepository(
        options.seedProfiles ?? [],
        this.clock,
        this.publicationReferences,
      );
      saveStateAtomically(this.filePath, this.repository.exportState());
    });
  }

  getProfile(id: string, actor: Actor, includeArchived = false): Profile {
    return this.read((repository) =>
      repository.getProfile(id, actor, includeArchived),
    );
  }

  listProfiles(actor: Actor, includeArchived = false): Profile[] {
    return this.read((repository) =>
      repository.listProfiles(actor, includeArchived),
    );
  }

  createProfile(input: NewProfileInput, context: CreateContext): Profile {
    return this.mutate((repository) => repository.createProfile(input, context));
  }

  updateProfile(
    id: string,
    patch: EditableProfilePatch,
    context: WriteContext,
  ): Profile {
    return this.mutate((repository) =>
      repository.updateProfile(id, patch, context),
    );
  }

  duplicateProfile(
    sourceId: string,
    identity: { id: string; slug: string },
    context: WriteContext,
  ): Profile {
    return this.mutate((repository) =>
      repository.duplicateProfile(sourceId, identity, context),
    );
  }

  setStatus(
    id: string,
    status: PublicationStatus,
    context: WriteContext,
  ): Profile {
    return this.mutate((repository) =>
      repository.setStatus(id, status, context),
    );
  }

  setAvailability(
    id: string,
    availability: Availability,
    context: WriteContext,
  ): Profile {
    return this.mutate((repository) =>
      repository.setAvailability(id, availability, context),
    );
  }

  reorderMedia(
    id: string,
    orderedMediaIds: readonly string[],
    context: WriteContext,
  ): Profile {
    return this.mutate((repository) =>
      repository.reorderMedia(id, orderedMediaIds, context),
    );
  }

  recordEvidence(
    id: string,
    evidence: VerificationEvidence,
    context: WriteContext,
  ): Profile {
    return this.mutate((repository) =>
      repository.recordEvidence(id, evidence, context),
    );
  }

  approveProfile(
    id: string,
    sourceReference: string,
    context: WriteContext,
  ): Profile {
    return this.mutate((repository) =>
      repository.approveProfile(id, sourceReference, context),
    );
  }

  listAuditEvents(actor: Actor): AuditEvent[] {
    return this.read((repository) => repository.listAuditEvents(actor));
  }

  private read<T>(operation: (repository: InMemoryProfileRepository) => T): T {
    return this.withExclusiveFileOperation(() => {
      this.repository = this.loadRequiredRepository();
      return operation(this.repository);
    });
  }

  private mutate<T>(
    operation: (repository: InMemoryProfileRepository) => T,
  ): T {
    return this.withExclusiveFileOperation(() => {
      const workingRepository = this.loadRequiredRepository();
      const result = operation(workingRepository);
      saveStateAtomically(this.filePath, workingRepository.exportState());
      this.repository = workingRepository;
      return result;
    });
  }

  private loadRequiredRepository(): InMemoryProfileRepository {
    const state = loadState(this.filePath);
    if (!state) {
      throw new RepositoryError(
        'PERSISTENCE_CORRUPT',
        'The initialized local repository state file is missing.',
      );
    }
    return this.restore(state);
  }

  private restore(state: ProfileRepositoryState): InMemoryProfileRepository {
    try {
      return InMemoryProfileRepository.fromState(
        state,
        this.clock,
        this.publicationReferences,
      );
    } catch {
      throw new RepositoryError(
        'PERSISTENCE_CORRUPT',
        'The local repository state failed validation.',
      );
    }
  }

  private withExclusiveFileOperation<T>(operation: () => T): T {
    try {
      return withLocalFileLockSync(this.filePath, operation);
    } catch (error) {
      if (
        error instanceof LocalFileLockError &&
        error.code === 'LOCK_BUSY'
      ) {
        throw new RepositoryError(
          'PERSISTENCE_BUSY',
          'The local repository state is already in use by another operation.',
        );
      }
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError(
        'PERSISTENCE_UNAVAILABLE',
        'The local repository lock could not be acquired or released safely.',
      );
    }
  }
}
