import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, parse } from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import {
  LocalMediaStore,
  LocalMediaStoreError,
} from '../lib/media/local-media-store.ts';

const firstTime = '2026-08-27T16:00:00Z';
const secondTime = '2026-08-27T16:01:00Z';
const thirdTime = '2026-08-27T16:02:00Z';
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function mp4Box(type: string, payload: Uint8Array): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + payload.byteLength, 0);
  header.write(type, 4, 4, 'ascii');
  return Buffer.concat([header, payload]);
}

const mp4 = Buffer.concat([
  mp4Box(
    'ftyp',
    Buffer.concat([
      Buffer.from('isom', 'ascii'),
      Buffer.alloc(4),
      Buffer.from('isomiso2mp41', 'ascii'),
    ]),
  ),
  mp4Box('moov', Buffer.from('synthetic-vide-track', 'ascii')),
  mp4Box('mdat', Buffer.from('synthetic-frame-bytes', 'ascii')),
]);

function assertCode(error: unknown, code: LocalMediaStoreError['code']): boolean {
  return error instanceof LocalMediaStoreError && error.code === code;
}

async function temporaryStore(clock: () => string = () => firstTime) {
  const root = await mkdtemp(join(tmpdir(), 'pecadosvip-media-'));
  return { root, store: new LocalMediaStore(root, clock) };
}

test('stores validated media atomically with an opaque key and defensive records', async (t) => {
  const { root, store } = await temporaryStore();
  t.after(() => rm(root, { recursive: true, force: true }));

  const record = await store.store({
    bytes: png,
    contentType: 'image/png',
    alt: 'Retrato de prueba sin persona real',
    rightsEvidenceReference: 'evidence:test-image-001',
  });

  assert.match(record.id, /^[0-9a-f-]{36}$/i);
  assert.equal(record.storageKey, `${record.id}/desktop.webp`);
  assert.equal(record.contentType, 'image/webp');
  assert.equal(record.sha256.length, 64);
  assert.equal(record.processing?.pipeline, 'sharp-webp-v1');
  assert.equal(record.processing?.sourceContentType, 'image/png');
  assert.equal(record.processing?.metadataStripped, true);
  assert.deepEqual(
    record.processing?.variants.map((variant) => variant.name),
    ['desktop', 'mobile'],
  );
  assert.equal(record.status, 'active');
  assert.equal(record.revision, 1);
  assert.deepEqual(
    record.auditEvents.map((event) => event.action),
    ['store'],
  );
  const optimized = await readFile(join(root, record.storageKey));
  assert.notDeepEqual(optimized, Buffer.from(png));
  assert.equal((await sharp(optimized).metadata()).format, 'webp');

  record.alt = 'outside mutation';
  assert.equal((await store.get(record.id)).alt, 'Retrato de prueba sin persona real');
});

test('rejects a mismatched signature and missing opaque rights evidence', async (t) => {
  const { root, store } = await temporaryStore();
  t.after(() => rm(root, { recursive: true, force: true }));

  await assert.rejects(
    store.store({
      bytes: Uint8Array.from([0x00, 0x01, 0x02]),
      contentType: 'image/png',
      alt: 'Prueba',
      rightsEvidenceReference: 'evidence:test-image-002',
    }),
    (error) => assertCode(error, 'UNSUPPORTED_MEDIA'),
  );
  await assert.rejects(
    store.store({
      bytes: png,
      contentType: 'image/png',
      alt: 'Prueba',
      rightsEvidenceReference: 'contains personal content and spaces',
    }),
    (error) => assertCode(error, 'INVALID_INPUT'),
  );
  await assert.rejects(
    store.store({
      bytes: png,
      contentType: '__proto__' as never,
      alt: 'Prueba',
      rightsEvidenceReference: 'evidence:test-image-unsupported-type',
    }),
    (error) => assertCode(error, 'UNSUPPORTED_MEDIA'),
  );
  assert.deepEqual(await store.list(), []);
});

test('normalizes image orientation, dimensions and metadata into bounded WebP variants', async (t) => {
  const { root, store } = await temporaryStore();
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = await sharp({
    create: {
      width: 1_900,
      height: 2_400,
      channels: 3,
      background: '#7a5238',
    },
  })
    .withMetadata({ exif: { IFD0: { Artist: 'Synthetic private author' } } })
    .jpeg({ quality: 90 })
    .toBuffer();
  assert.ok((await sharp(source).metadata()).exif);

  const record = await store.store({
    bytes: source,
    contentType: 'image/jpeg',
    alt: 'Imagen sintética normalizada',
    rightsEvidenceReference: 'evidence:synthetic-normalization-001',
  });

  assert.equal(record.processing?.sourceSha256.length, 64);
  assert.equal(record.processing?.sourceByteLength, source.byteLength);
  assert.equal(record.processing?.variants.length, 2);
  for (const variant of record.processing!.variants) {
    const bytes = await readFile(join(root, variant.storageKey));
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.xmp, undefined);
    assert.equal(metadata.iptc, undefined);
    assert.equal(metadata.width, variant.width);
    assert.equal(metadata.height, variant.height);
    assert.ok((variant.width ?? 0) <= (variant.name === 'desktop' ? 1_600 : 768));
    assert.ok((variant.height ?? 0) <= (variant.name === 'desktop' ? 2_000 : 1_024));
  }
  assert.deepEqual(
    (await readdir(root)).filter((entry) => entry.startsWith('.')),
    [],
  );
});

test('rejects over-dimensioned images before committing any media record', async (t) => {
  const { root, store } = await temporaryStore();
  t.after(() => rm(root, { recursive: true, force: true }));
  const overDimensioned = await sharp({
    create: {
      width: 8_193,
      height: 1,
      channels: 3,
      background: '#000000',
    },
  })
    .png()
    .toBuffer();

  await assert.rejects(
    store.store({
      bytes: overDimensioned,
      contentType: 'image/png',
      alt: 'Imagen sintética demasiado ancha',
      rightsEvidenceReference: 'evidence:synthetic-dimension-001',
    }),
    (error) => assertCode(error, 'UNSUPPORTED_MEDIA'),
  );
  assert.deepEqual(await readdir(root), []);
});

test('stores a bounded non-fragmented MP4 after structural container validation', async (t) => {
  const { root, store } = await temporaryStore();
  t.after(() => rm(root, { recursive: true, force: true }));

  const record = await store.store({
    bytes: mp4,
    contentType: 'video/mp4',
    alt: 'Vídeo MP4 sintético de prueba',
    rightsEvidenceReference: 'evidence:synthetic-video-001',
  });
  assert.equal(record.kind, 'video');
  assert.equal(record.contentType, 'video/mp4');
  assert.equal(record.storageKey, `${record.id}/original.mp4`);
  assert.equal(record.processing?.pipeline, 'bounded-mp4-container-v1');
  assert.equal(record.processing?.metadataStripped, false);
  assert.deepEqual(await readFile(join(root, record.storageKey)), mp4);
  assert.deepEqual((await store.readVariant(record.id, 'original')).bytes, mp4);
  await assert.rejects(
    store.readVariant(record.id, 'desktop'),
    (error) => assertCode(error, 'MEDIA_NOT_FOUND'),
  );
});

test('rejects malformed and fragmented MP4 containers', async (t) => {
  const { root, store } = await temporaryStore();
  t.after(() => rm(root, { recursive: true, force: true }));
  const fragmented = Buffer.concat([
    mp4Box(
      'ftyp',
      Buffer.concat([Buffer.from('isom', 'ascii'), Buffer.alloc(4)]),
    ),
    mp4Box('moov', Buffer.from('vide', 'ascii')),
    mp4Box('moof', Buffer.from('fragment', 'ascii')),
    mp4Box('mdat', Buffer.from('payload', 'ascii')),
  ]);
  for (const bytes of [mp4.subarray(0, 24), fragmented]) {
    await assert.rejects(
      store.store({
        bytes,
        contentType: 'video/mp4',
        alt: 'Vídeo rechazado',
        rightsEvidenceReference: 'evidence:synthetic-video-rejected',
      }),
      (error) => assertCode(error, 'UNSUPPORTED_MEDIA'),
    );
  }
  assert.deepEqual(await readdir(root), []);
});

test('archive is recoverable metadata and never physically deletes media', async (t) => {
  let now = firstTime;
  const { root, store } = await temporaryStore(() => now);
  t.after(() => rm(root, { recursive: true, force: true }));
  const record = await store.store({
    bytes: png,
    contentType: 'image/png',
    alt: 'Activo recuperable de prueba',
    rightsEvidenceReference: 'evidence:test-image-003',
  });
  const storedBytes = await readFile(join(root, record.storageKey));

  now = secondTime;
  const archived = await store.archive(record.id);
  assert.equal(archived.status, 'archived');
  assert.equal(archived.archivedAt, secondTime);
  await assert.rejects(store.get(record.id), (error) => assertCode(error, 'MEDIA_NOT_FOUND'));
  assert.equal((await store.get(record.id, true)).status, 'archived');
  assert.deepEqual(await readFile(join(root, record.storageKey)), storedBytes);
  assert.deepEqual(await store.list(), []);
  assert.equal((await store.list(true)).length, 1);

  now = thirdTime;
  const restored = await store.restore(record.id, {
    actorId: 'admin-test',
    requestId: 'restore-media-test-003',
  });
  assert.equal(restored.status, 'active');
  assert.equal(restored.revision, 3);
  assert.deepEqual(
    restored.auditEvents.map((event) => event.action),
    ['store', 'archive', 'restore'],
  );
  assert.deepEqual(await readFile(join(root, record.storageKey)), storedBytes);
});

test('detects content tampering instead of returning a trusted record', async (t) => {
  const { root, store } = await temporaryStore();
  t.after(() => rm(root, { recursive: true, force: true }));
  const record = await store.store({
    bytes: png,
    contentType: 'image/png',
    alt: 'Activo de integridad',
    rightsEvidenceReference: 'evidence:test-image-004',
  });
  const storedBytes = await readFile(join(root, record.storageKey));
  await writeFile(
    join(root, record.storageKey),
    Uint8Array.from(storedBytes.map((value) => value ^ 1)),
  );

  await assert.rejects(
    store.get(record.id),
    (error) => assertCode(error, 'INTEGRITY_FAILURE'),
  );
});

test('rejects oversized local metadata before parsing it', async (t) => {
  const { root, store } = await temporaryStore();
  t.after(() => rm(root, { recursive: true, force: true }));
  const record = await store.store({
    bytes: png,
    contentType: 'image/png',
    alt: 'Activo con metadatos limitados',
    rightsEvidenceReference: 'evidence:test-image-metadata-limit',
  });
  await writeFile(
    join(root, record.id, 'metadata.json'),
    'x'.repeat(256 * 1024 + 1),
  );

  await assert.rejects(
    store.get(record.id),
    (error) => assertCode(error, 'INTEGRITY_FAILURE'),
  );
});

test('serializes concurrent writes and rejects filesystem roots', async (t) => {
  assert.throws(
    () => new LocalMediaStore(parse(process.cwd()).root),
    (error) => assertCode(error, 'INVALID_ROOT'),
  );
  const { root, store } = await temporaryStore();
  t.after(() => rm(root, { recursive: true, force: true }));
  const records = await Promise.all(
    Array.from({ length: 4 }, (_, index) =>
      store.store({
        bytes: png,
        contentType: 'image/png',
        alt: `Activo concurrente ${index}`,
        rightsEvidenceReference: `evidence:test-image-10${index}`,
      }),
    ),
  );

  assert.equal(new Set(records.map((record) => record.id)).size, 4);
  assert.equal((await store.list()).length, 4);
});

test('refuses direct construction in production', () => {
  const previousEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, 'NODE_ENV', 'production');
  try {
    assert.throws(
      () => new LocalMediaStore(join(tmpdir(), 'pecadosvip-media-production')),
      (error) => assertCode(error, 'INVALID_RUNTIME'),
    );
  } finally {
    if (previousEnvironment === undefined) {
      Reflect.deleteProperty(process.env, 'NODE_ENV');
    } else {
      Reflect.set(process.env, 'NODE_ENV', previousEnvironment);
    }
  }
});

test('rejects replayed media mutation request IDs across records', async (t) => {
  const { root, store } = await temporaryStore();
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = {
    bytes: png,
    contentType: 'image/png' as const,
    alt: 'Activo con protección de replay',
    rightsEvidenceReference: 'evidence:test-image-replay',
  };
  const context = {
    actorId: 'editor-test',
    requestId: 'store-media-replay-001',
  };
  await store.store(input, context);
  await assert.rejects(
    store.store(input, context),
    (error) => assertCode(error, 'DUPLICATE_REQUEST'),
  );
  assert.equal((await store.list()).length, 1);
});

test('two store instances cannot commit the same request ID twice', async (t) => {
  const { root, store: first } = await temporaryStore();
  const second = new LocalMediaStore(root, () => secondTime);
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = {
    bytes: png,
    contentType: 'image/png' as const,
    alt: 'Activo de concurrencia entre instancias',
    rightsEvidenceReference: 'evidence:test-cross-instance-replay',
  };
  const context = {
    actorId: 'editor-test',
    requestId: 'cross-instance-request-001',
  };

  const attempts = await Promise.allSettled([
    first.store(input, context),
    second.store(input, context),
  ]);
  const committed = attempts.filter(
    (attempt): attempt is PromiseFulfilledResult<Awaited<ReturnType<typeof first.store>>> =>
      attempt.status === 'fulfilled',
  );
  const rejected = attempts.filter(
    (attempt): attempt is PromiseRejectedResult => attempt.status === 'rejected',
  );

  assert.equal(committed.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(
    assertCode(rejected[0]!.reason, 'MEDIA_BUSY') ||
      assertCode(rejected[0]!.reason, 'DUPLICATE_REQUEST'),
    true,
  );
  assert.equal((await first.list(true)).length, 1);
  await assert.rejects(
    second.store(input, context),
    (error) => assertCode(error, 'DUPLICATE_REQUEST'),
  );
  assert.equal((await first.list(true)).length, 1);
});

test('cross-instance mutations preserve the item quota boundary', async (t) => {
  const { root, store: first } = await temporaryStore();
  const second = new LocalMediaStore(root, () => secondTime);
  t.after(() => rm(root, { recursive: true, force: true }));
  const sha256 = createHash('sha256').update(png).digest('hex');
  await Promise.all(
    Array.from({ length: 500 }, async (_, index) => {
      const suffix = String(index + 1).padStart(12, '0');
      const id = `00000000-0000-4000-8000-${suffix}`;
      const requestId = `quota-seed-${index + 1}`;
      const metadata = {
        schemaVersion: 1,
        id,
        kind: 'image',
        contentType: 'image/png',
        storageKey: `${id}.png`,
        byteLength: png.byteLength,
        sha256,
        alt: `Activo sintético de cuota ${index + 1}`,
        rightsEvidenceReference: `evidence:quota-${index + 1}`,
        status: 'active',
        createdAt: firstTime,
        updatedAt: firstTime,
        revision: 1,
        auditEvents: [
          {
            id: 'media-audit-000001',
            action: 'store',
            actorId: 'quota-test',
            requestId,
            occurredAt: firstTime,
            toStatus: 'active',
          },
        ],
      };
      await Promise.all([
        writeFile(join(root, `${id}.png`), png),
        writeFile(join(root, `${id}.json`), `${JSON.stringify(metadata)}\n`),
      ]);
    }),
  );
  const input = {
    bytes: png,
    contentType: 'image/png' as const,
    alt: 'No debe exceder la cuota',
    rightsEvidenceReference: 'evidence:quota-overflow',
  };
  const attempts = await Promise.allSettled([
    first.store(input, {
      actorId: 'quota-test',
      requestId: 'quota-overflow-a',
    }),
    second.store(input, {
      actorId: 'quota-test',
      requestId: 'quota-overflow-b',
    }),
  ]);

  assert.equal(attempts.every((attempt) => attempt.status === 'rejected'), true);
  assert.equal(
    attempts.some(
      (attempt) =>
        attempt.status === 'rejected' &&
        assertCode(attempt.reason, 'CAPACITY_EXCEEDED'),
    ),
    true,
  );
  assert.equal(
    attempts.every(
      (attempt) =>
        attempt.status === 'rejected' &&
        (assertCode(attempt.reason, 'CAPACITY_EXCEEDED') ||
          assertCode(attempt.reason, 'MEDIA_BUSY')),
    ),
    true,
  );
  assert.equal((await first.list(true)).length, 500);
});
