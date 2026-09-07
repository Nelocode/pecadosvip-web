import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, parse } from 'node:path';
import test from 'node:test';

import {
  createLocalBackup,
  LocalBackupError,
  restoreLocalBackup,
} from '../lib/operations/local-backup.ts';

const createdAt = '2026-08-27T18:00:00.000Z';
const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00,
]);

function hasCode(error: unknown, code: LocalBackupError['code']): boolean {
  return error instanceof LocalBackupError && error.code === code;
}

async function fixture(t: { after(callback: () => void): void }) {
  const root = await mkdtemp(join(tmpdir(), 'pecadosvip-backup-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = join(root, 'source');
  const mediaRoot = join(source, 'media');
  const cmsStateFile = join(source, 'cms-state.json');
  const backupDirectory = join(root, 'backup-v1');
  await mkdir(join(mediaRoot, 'nested'), { recursive: true });
  await writeFile(
    cmsStateFile,
    `${JSON.stringify({ schema: 'test.cms', profiles: [], auditEvents: [] })}\n`,
  );
  await writeFile(join(mediaRoot, 'asset.png'), png);
  await writeFile(
    join(mediaRoot, 'nested', 'asset.json'),
    `${JSON.stringify({ id: 'synthetic-asset', sha256: '0'.repeat(64) })}\n`,
  );
  return { root, mediaRoot, cmsStateFile, backupDirectory };
}

test('round-trips CMS state and media through a versioned integrity manifest', async (t) => {
  const setup = await fixture(t);
  const manifest = await createLocalBackup({
    runtimeMode: 'test',
    cmsStateFile: setup.cmsStateFile,
    mediaRoot: setup.mediaRoot,
    backupDirectory: setup.backupDirectory,
    clock: () => createdAt,
  });

  assert.equal(manifest.schema, 'pecadosvip.local-backup');
  assert.equal(manifest.version, 1);
  assert.equal(manifest.createdAt, createdAt);
  assert.deepEqual(
    manifest.files.map((file) => file.path),
    ['cms/state.json', 'media/asset.png', 'media/nested/asset.json'],
  );
  assert.equal(
    manifest.totalBytes,
    manifest.files.reduce((total, file) => total + file.byteLength, 0),
  );
  assert.ok(manifest.files.every((file) => /^[0-9a-f]{64}$/.test(file.sha256)));
  assert.equal(
    (await readFile(join(setup.backupDirectory, 'manifest.json'), 'utf8')).includes(
      setup.root,
    ),
    false,
  );

  const restored = await restoreLocalBackup({
    runtimeMode: 'test',
    backupDirectory: setup.backupDirectory,
    destinationRoot: join(setup.root, 'restored'),
  });
  assert.deepEqual(
    await readFile(restored.cmsStateFile),
    await readFile(setup.cmsStateFile),
  );
  assert.equal(restored.cmsStateFile, join(setup.root, 'restored', 'profiles.json'));
  assert.deepEqual(
    (await readdir(join(setup.root, 'restored'))).sort(),
    ['media', 'profiles.json'],
  );
  assert.deepEqual(
    await readFile(join(restored.mediaRoot, 'asset.png')),
    Buffer.from(png),
  );
  assert.deepEqual(
    await readFile(join(restored.mediaRoot, 'nested', 'asset.json')),
    await readFile(join(setup.mediaRoot, 'nested', 'asset.json')),
  );
  assert.deepEqual(
    (await readdir(setup.root)).filter((name) => name.includes('staging')),
    [],
  );
});

test('rejects tampering before creating a restore destination', async (t) => {
  const setup = await fixture(t);
  await createLocalBackup({
    runtimeMode: 'test',
    cmsStateFile: setup.cmsStateFile,
    mediaRoot: setup.mediaRoot,
    backupDirectory: setup.backupDirectory,
  });
  await writeFile(
    join(setup.backupDirectory, 'payload', 'media', 'asset.png'),
    Uint8Array.from(png.map((value) => value ^ 1)),
  );
  const destinationRoot = join(setup.root, 'tampered-restore');

  await assert.rejects(
    restoreLocalBackup({
      runtimeMode: 'test',
      backupDirectory: setup.backupDirectory,
      destinationRoot,
    }),
    (error) => hasCode(error, 'CORRUPT_BACKUP'),
  );
  await assert.rejects(readFile(join(destinationRoot, 'profiles.json')));
});

test('rejects manifest traversal and unexpected payload paths', async (t) => {
  const setup = await fixture(t);
  await createLocalBackup({
    runtimeMode: 'test',
    cmsStateFile: setup.cmsStateFile,
    mediaRoot: setup.mediaRoot,
    backupDirectory: setup.backupDirectory,
  });
  const manifestPath = join(setup.backupDirectory, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    files: Array<{ path: string }>;
  };
  manifest.files[1]!.path = 'media/../../escape.txt';
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  await assert.rejects(
    restoreLocalBackup({
      runtimeMode: 'test',
      backupDirectory: setup.backupDirectory,
      destinationRoot: join(setup.root, 'traversal-restore'),
    }),
    (error) => hasCode(error, 'CORRUPT_BACKUP'),
  );
});

test('rejects a manifest whose aggregate restore budget is excessive', async (t) => {
  const setup = await fixture(t);
  await createLocalBackup({
    runtimeMode: 'test',
    cmsStateFile: setup.cmsStateFile,
    mediaRoot: setup.mediaRoot,
    backupDirectory: setup.backupDirectory,
  });
  const manifestPath = join(setup.backupDirectory, 'manifest.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as {
    fileCount: number;
    totalBytes: number;
    files: Array<{ path: string; byteLength: number; sha256: string }>;
  };
  manifest.files = [
    manifest.files[0]!,
    ...Array.from({ length: 7 }, (_, index) => ({
      path: `media/oversized-${index}.bin`,
      byteLength: 128 * 1024 * 1024,
      sha256: '0'.repeat(64),
    })),
  ];
  manifest.fileCount = manifest.files.length;
  manifest.totalBytes = manifest.files.reduce(
    (total, file) => total + file.byteLength,
    0,
  );
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  await assert.rejects(
    restoreLocalBackup({
      runtimeMode: 'test',
      backupDirectory: setup.backupDirectory,
      destinationRoot: join(setup.root, 'oversized-restore'),
    }),
    (error) => hasCode(error, 'CORRUPT_BACKUP'),
  );
});

test('requires an empty destination unless overwrite is explicit', async (t) => {
  const setup = await fixture(t);
  await createLocalBackup({
    runtimeMode: 'test',
    cmsStateFile: setup.cmsStateFile,
    mediaRoot: setup.mediaRoot,
    backupDirectory: setup.backupDirectory,
  });
  const destinationRoot = join(setup.root, 'existing-state');
  await mkdir(destinationRoot);
  await writeFile(join(destinationRoot, 'keep.txt'), 'preserve without approval');

  await assert.rejects(
    restoreLocalBackup({
      runtimeMode: 'test',
      backupDirectory: setup.backupDirectory,
      destinationRoot,
    }),
    (error) => hasCode(error, 'DESTINATION_NOT_EMPTY'),
  );
  assert.equal(await readFile(join(destinationRoot, 'keep.txt'), 'utf8'), 'preserve without approval');

  const restored = await restoreLocalBackup({
    runtimeMode: 'test',
    backupDirectory: setup.backupDirectory,
    destinationRoot,
    overwrite: true,
  });
  assert.deepEqual(
    await readFile(restored.cmsStateFile),
    await readFile(setup.cmsStateFile),
  );
  await assert.rejects(readFile(join(destinationRoot, 'keep.txt')));
});

test('rejects filesystem roots, relative paths and production execution', async (t) => {
  const setup = await fixture(t);
  await assert.rejects(
    createLocalBackup({
      runtimeMode: 'test',
      cmsStateFile: setup.cmsStateFile,
      mediaRoot: setup.mediaRoot,
      backupDirectory: 'relative-backup',
    }),
    (error) => hasCode(error, 'INVALID_PATH'),
  );
  await assert.rejects(
    restoreLocalBackup({
      runtimeMode: 'test',
      backupDirectory: setup.backupDirectory,
      destinationRoot: parse(setup.root).root,
    }),
    (error) => hasCode(error, 'INVALID_PATH'),
  );

  const previousNodeEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, 'NODE_ENV', 'production');
  try {
    await assert.rejects(
      createLocalBackup({
        runtimeMode: 'test',
        cmsStateFile: setup.cmsStateFile,
        mediaRoot: setup.mediaRoot,
        backupDirectory: setup.backupDirectory,
      }),
      (error) => hasCode(error, 'INVALID_RUNTIME'),
    );
    await assert.rejects(
      restoreLocalBackup({
        runtimeMode: 'test',
        backupDirectory: setup.backupDirectory,
        destinationRoot: join(setup.root, 'production-restore'),
      }),
      (error) => hasCode(error, 'INVALID_RUNTIME'),
    );
  } finally {
    if (previousNodeEnvironment === undefined) {
      Reflect.deleteProperty(process.env, 'NODE_ENV');
    } else {
      Reflect.set(process.env, 'NODE_ENV', previousNodeEnvironment);
    }
  }
});

test('rejects symbolic links in source trees when the platform permits them', async (t) => {
  const setup = await fixture(t);
  const outside = join(setup.root, 'outside.txt');
  const link = join(setup.mediaRoot, 'linked.txt');
  await writeFile(outside, 'not part of media storage');
  try {
    await symlink(outside, link, 'file');
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error.code === 'EPERM' || error.code === 'EACCES')
    ) {
      t.skip('The current Windows policy does not permit creating a test symlink.');
      return;
    }
    throw error;
  }

  await assert.rejects(
    createLocalBackup({
      runtimeMode: 'test',
      cmsStateFile: setup.cmsStateFile,
      mediaRoot: setup.mediaRoot,
      backupDirectory: setup.backupDirectory,
    }),
    (error) => hasCode(error, 'UNSAFE_ENTRY'),
  );
});
