import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import {
  lstat,
  mkdir,
  readFile,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';

import { PersistentJsonProfileRepository } from '../lib/content/persistent-repository.ts';
import { RepositoryError } from '../lib/content/repository.ts';
import {
  getLocalFileLockPath,
  LocalFileLockError,
  withLocalFileLock,
  withLocalFileLockSync,
} from '../lib/operations/local-file-lock.ts';
import {
  createLocalBackup,
  LocalBackupError,
} from '../lib/operations/local-backup.ts';
import {
  exportLocalPublicationCandidate,
  PublicationCandidateError,
} from '../lib/publication/local-publication-candidate.ts';
import { makeProfile, makeSnapshot } from './helpers.ts';

const timestamp = '2026-08-27T22:00:00.000Z';

function hasLockCode(
  error: unknown,
  code: LocalFileLockError['code'],
): boolean {
  return error instanceof LocalFileLockError && error.code === code;
}

function temporaryRoot(
  context: { after(callback: () => void): void },
  prefix: string,
): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}

test('exclusive-create contention preserves foreign locks and finally releases owned locks', (context) => {
  const root = temporaryRoot(context, 'pecadosvip-lock-test-');
  const resource = join(root, 'state.json');
  const lockPath = getLocalFileLockPath(resource);
  writeFileSync(resource, '{}\n');
  const foreignLock = 'foreign-lock-must-remain\n';
  writeFileSync(lockPath, foreignLock, { flag: 'wx' });

  assert.throws(
    () => withLocalFileLockSync(resource, () => undefined),
    (error) => hasLockCode(error, 'LOCK_BUSY'),
  );
  assert.equal(readFileSync(lockPath, 'utf8'), foreignLock);
  rmSync(lockPath);

  assert.throws(
    () =>
      withLocalFileLockSync(resource, () => {
        assert.equal(existsSync(lockPath), true);
        throw new Error('synthetic operation failure');
      }),
    /synthetic operation failure/u,
  );
  assert.equal(existsSync(lockPath), false);
});

test('a child process cannot overwrite state while another process owns the lock', (context) => {
  const root = temporaryRoot(context, 'pecadosvip-lock-process-test-');
  const stateFile = join(root, 'profiles.json');
  const seed = makeProfile(91);
  seed.status = 'hidden';
  const parentRepository = new PersistentJsonProfileRepository({
    filePath: stateFile,
    runtimeMode: 'test',
    seedProfiles: [seed],
    clock: () => timestamp,
  });
  const moduleUrl = pathToFileURL(
    resolve('lib/content/persistent-repository.ts'),
  ).href;
  const childScript = `
    import { PersistentJsonProfileRepository } from ${JSON.stringify(moduleUrl)};
    try {
      const repository = new PersistentJsonProfileRepository({
        filePath: ${JSON.stringify(stateFile)},
        runtimeMode: 'test',
        clock: () => ${JSON.stringify(timestamp)}
      });
      const updated = repository.updateProfile(
        ${JSON.stringify(seed.id)},
        { biography: 'Committed by child process.' },
        {
          actor: { id: 'child-editor', role: 'editor' },
          requestId: 'child-process-update',
          expectedRevision: 1
        }
      );
      process.stdout.write(JSON.stringify({ result: 'committed', revision: updated.revision }));
    } catch (error) {
      process.stdout.write(JSON.stringify({ result: 'rejected', code: error?.code ?? 'UNKNOWN' }));
    }
  `;
  const runChild = () =>
    spawnSync(
      process.execPath,
      ['--experimental-strip-types', '--input-type=module', '--eval', childScript],
      {
        encoding: 'utf8',
        env: { ...process.env, NODE_ENV: 'test' },
      },
    );

  let contended!: ReturnType<typeof runChild>;
  withLocalFileLockSync(stateFile, () => {
    contended = runChild();
  });
  assert.equal(contended.status, 0, contended.stderr);
  assert.deepEqual(JSON.parse(contended.stdout), {
    result: 'rejected',
    code: 'PERSISTENCE_BUSY',
  });
  assert.equal(parentRepository.getProfile(seed.id, { id: 'admin', role: 'admin' }).revision, 1);

  const committed = runChild();
  assert.equal(committed.status, 0, committed.stderr);
  assert.deepEqual(JSON.parse(committed.stdout), {
    result: 'committed',
    revision: 2,
  });
  assert.throws(
    () =>
      parentRepository.updateProfile(
        seed.id,
        { biography: 'Stale parent update must not overwrite.' },
        {
          actor: { id: 'parent-editor', role: 'editor' },
          requestId: 'stale-parent-update',
          expectedRevision: 1,
        },
      ),
    (error) =>
      error instanceof RepositoryError && error.code === 'REVISION_CONFLICT',
  );
  const finalProfile = parentRepository.getProfile(
    seed.id,
    { id: 'admin', role: 'admin' },
  );
  assert.equal(finalProfile.revision, 2);
  assert.equal(finalProfile.biography, 'Committed by child process.');
});

test('backup and candidate export fail closed when their CMS snapshot is contended', async (context) => {
  const root = temporaryRoot(context, 'pecadosvip-lock-snapshot-test-');
  const sourceRoot = join(root, 'source');
  const mediaRoot = join(sourceRoot, 'media');
  const stateFile = join(sourceRoot, 'profiles.json');
  const referencesFile = join(sourceRoot, 'references.json');
  const backupDirectory = join(root, 'backup');
  const candidateDirectory = join(root, 'candidate');
  await mkdir(mediaRoot, { recursive: true });
  await writeFile(join(mediaRoot, 'asset.bin'), 'synthetic-media\n');
  const snapshot = makeSnapshot();
  snapshot.profiles.forEach((profile) => {
    profile.media.forEach((media) => {
      media.desktopUrl = `/assets/${profile.slug}-${media.order}.jpg`;
    });
  });
  new PersistentJsonProfileRepository({
    filePath: stateFile,
    runtimeMode: 'test',
    seedProfiles: snapshot.profiles,
    publicationReferences: {
      cities: snapshot.cities,
      services: snapshot.services,
    },
    clock: () => timestamp,
  });
  await writeFile(
    referencesFile,
    `${JSON.stringify({
      schema: 'pecadosvip.publication-candidate-references',
      version: 1,
      cities: snapshot.cities,
      services: snapshot.services,
      settings: snapshot.settings,
    })}\n`,
  );

  await withLocalFileLock(stateFile, async () => {
    await assert.rejects(
      createLocalBackup({
        runtimeMode: 'test',
        cmsStateFile: stateFile,
        mediaRoot,
        backupDirectory,
      }),
      (error) =>
        error instanceof LocalBackupError && error.code === 'SOURCE_BUSY',
    );
    await assert.rejects(
      exportLocalPublicationCandidate({
        runtimeMode: 'test',
        stateFilePath: stateFile,
        referencesFilePath: referencesFile,
        outputDirectory: candidateDirectory,
      }),
      (error) =>
        error instanceof PublicationCandidateError &&
        error.code === 'SOURCE_BUSY',
    );
  });
  await assert.rejects(lstat(backupDirectory));
  await assert.rejects(lstat(candidateDirectory));

  const manifest = await createLocalBackup({
    runtimeMode: 'test',
    cmsStateFile: stateFile,
    mediaRoot,
    backupDirectory,
    clock: () => timestamp,
  });
  const exported = await exportLocalPublicationCandidate({
    runtimeMode: 'test',
    stateFilePath: stateFile,
    referencesFilePath: referencesFile,
    outputDirectory: candidateDirectory,
  });
  assert.equal(manifest.files[0]?.path, 'cms/state.json');
  assert.equal(exported.manifest.productionActivation, false);
  assert.deepEqual(
    await readFile(join(backupDirectory, 'payload', 'cms', 'state.json')),
    await readFile(stateFile),
  );
});

test('backup also fails closed while a media-store snapshot lock is held', async (context) => {
  const root = temporaryRoot(context, 'pecadosvip-lock-media-test-');
  const sourceRoot = join(root, 'source');
  const mediaRoot = join(sourceRoot, 'media');
  const stateFile = join(sourceRoot, 'profiles.json');
  const backupDirectory = join(root, 'backup');
  await mkdir(mediaRoot, { recursive: true });
  await writeFile(stateFile, '{"schema":"synthetic-state"}\n');
  await writeFile(join(mediaRoot, 'asset.bin'), 'synthetic-media\n');

  await withLocalFileLock(mediaRoot, async () => {
    await assert.rejects(
      createLocalBackup({
        runtimeMode: 'test',
        cmsStateFile: stateFile,
        mediaRoot,
        backupDirectory,
      }),
      (error) =>
        error instanceof LocalBackupError && error.code === 'SOURCE_BUSY',
    );
  });
  await assert.rejects(lstat(backupDirectory));
});
