import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  startLocalCmsWorkbench,
} from '../lib/workbench/local-cms-workbench.ts';
import type {
  LocalCmsWorkbenchHandle,
  LocalWorkbenchOperator,
} from '../lib/workbench/local-cms-workbench.ts';
import { makeProfile } from './helpers.ts';

const adminToken = 'admin-local-token-0123456789-ABCDEFGHIJ_klmno';
const editorToken = 'editor-local-token-0123456789-ABCDEFG_HIJKLMNO';
const operators: LocalWorkbenchOperator[] = [
  { token: adminToken, actorId: 'admin-local-test', role: 'admin' },
  { token: editorToken, actorId: 'editor-local-test', role: 'editor' },
];
let idempotencySequence = 0;

type TestContext = {
  after(callback: () => void | Promise<void>): void;
};

function temporaryWorkspace(context: TestContext): {
  root: string;
  stateFilePath: string;
  mediaRoot: string;
} {
  const root = mkdtempSync(join(tmpdir(), 'pecadosvip-workbench-'));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  return {
    root,
    stateFilePath: join(root, 'state', 'profiles.json'),
    mediaRoot: join(root, 'media'),
  };
}

async function start(
  context: TestContext,
  paths = temporaryWorkspace(context),
): Promise<LocalCmsWorkbenchHandle> {
  const handle = await startLocalCmsWorkbench({
    runtimeMode: 'test',
    stateFilePath: paths.stateFilePath,
    mediaRoot: paths.mediaRoot,
    operators,
    host: '127.0.0.1',
    port: 0,
    clock: () => '2026-08-27T18:00:00-05:00',
  });
  context.after(() => handle.close());
  return handle;
}

async function api(
  handle: LocalCmsWorkbenchHandle,
  path: string,
  options: {
    token?: string;
    method?: 'GET' | 'POST';
    body?: Record<string, unknown>;
    origin?: string | false;
    idempotencyKey?: string | false;
  } = {},
): Promise<{ response: Response; body: Record<string, unknown> }> {
  const headers = new Headers();
  if (options.token) headers.set('Authorization', `Bearer ${options.token}`);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (options.method === 'POST' && options.origin !== false) {
    headers.set('Origin', options.origin ?? handle.origin);
  }
  if (options.method === 'POST' && options.idempotencyKey !== false) {
    idempotencySequence += 1;
    headers.set(
      'Idempotency-Key',
      options.idempotencyKey ?? `test-operation-${idempotencySequence}`,
    );
  }
  const response = await fetch(`${handle.origin}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  return {
    response,
    body: (await response.json()) as Record<string, unknown>,
  };
}

function createBody(index: number): Record<string, unknown> {
  return {
    id: `local-profile-${index}`,
    slug: `local-profile-${index}`,
    displayName: `Local draft ${index}`,
    age: 25,
    biography: 'Local authorized draft content.',
    languages: ['es'],
    serviceIds: [],
    citySlugs: ['madrid'],
  };
}

function mp4Box(type: string, payload: Uint8Array): Buffer {
  const header = Buffer.alloc(8);
  header.writeUInt32BE(8 + payload.byteLength, 0);
  header.write(type, 4, 4, 'ascii');
  return Buffer.concat([header, payload]);
}

function syntheticMp4(): Buffer {
  return Buffer.concat([
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
}

test('serves a noindex local shell with defensive browser headers and no embedded token', async (context) => {
  const handle = await start(context);
  const response = await fetch(handle.origin);
  const html = await response.text();

  assert.equal(response.status, 200);
  assert.match(html, /CMS local PecadosVip/);
  assert.match(html, /Solo desarrollo local/);
  assert.doesNotMatch(html, new RegExp(adminToken));
  assert.equal(response.headers.get('x-robots-tag'), 'noindex, nofollow, noarchive');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.match(response.headers.get('content-security-policy') ?? '', /frame-ancestors 'none'/);

  const favicon = await fetch(`${handle.origin}/favicon.ico`);
  assert.equal(favicon.status, 204);

  const browserScript = await fetch(`${handle.origin}/workbench.js`);
  const browserJavaScript = await browserScript.text();
  assert.match(browserJavaScript, /const form = event\.currentTarget/);
  assert.doesNotMatch(browserJavaScript, /event\.currentTarget\.reset/);

  const health = await fetch(`${handle.origin}/health`);
  assert.deepEqual(await health.json(), {
    status: 'local-only',
    production: false,
    persistence: 'configured',
  });
  await handle.close();
  await handle.close();
});

test('derives actor and role from the server-side token mapping and enforces exact origin', async (context) => {
  const handle = await start(context);
  const anonymous = await api(handle, '/api/session');
  assert.equal(anonymous.response.status, 401);
  assert.equal(anonymous.body.code, 'AUTHENTICATION_REQUIRED');

  const session = await api(handle, '/api/session', { token: editorToken });
  assert.equal(session.response.status, 200);
  assert.deepEqual(session.body.actor, {
    id: 'editor-local-test',
    role: 'editor',
  });

  const missingOrigin = await api(handle, '/api/profiles', {
    token: adminToken,
    method: 'POST',
    body: createBody(1),
    origin: false,
  });
  assert.equal(missingOrigin.response.status, 403);
  assert.equal(missingOrigin.body.code, 'ORIGIN_REJECTED');

  const missingIdempotency = await api(handle, '/api/profiles', {
    token: adminToken,
    method: 'POST',
    body: createBody(1),
    idempotencyKey: false,
  });
  assert.equal(missingIdempotency.response.status, 400);
  assert.equal(missingIdempotency.body.code, 'IDEMPOTENCY_KEY_REQUIRED');

  const forgedRole = await api(handle, '/api/profiles', {
    token: editorToken,
    method: 'POST',
    body: { ...createBody(1), actor: { id: 'forged', role: 'admin' } },
  });
  assert.equal(forgedRole.response.status, 400);
  assert.equal(forgedRole.body.code, 'INVALID_INPUT');

  const created = await api(handle, '/api/profiles', {
    token: editorToken,
    method: 'POST',
    body: createBody(1),
    idempotencyKey: 'replay-create-profile-1',
  });
  assert.equal(created.response.status, 201);
  assert.equal((created.body.profile as { status: string }).status, 'draft');
  const replay = await api(handle, '/api/profiles', {
    token: editorToken,
    method: 'POST',
    body: createBody(1),
    idempotencyKey: 'replay-create-profile-1',
  });
  assert.equal(replay.response.status, 409);
  assert.equal(replay.body.code, 'DUPLICATE_REQUEST');

  const editorAudit = await api(handle, '/api/audit', { token: editorToken });
  assert.equal(editorAudit.response.status, 403);
  const adminAudit = await api(handle, '/api/audit', { token: adminToken });
  assert.equal(adminAudit.response.status, 200);
  assert.equal((adminAudit.body.events as unknown[]).length, 1);
});

test('projects sensitive evidence fields by local operator role', async (context) => {
  const paths = temporaryWorkspace(context);
  const seed = makeProfile(91);
  seed.status = 'draft';
  const handle = await startLocalCmsWorkbench({
    runtimeMode: 'test',
    stateFilePath: paths.stateFilePath,
    mediaRoot: paths.mediaRoot,
    operators,
    host: '127.0.0.1',
    port: 0,
    seedProfiles: [seed],
  });
  context.after(() => handle.close());

  const editorList = await api(handle, '/api/profiles', { token: editorToken });
  const editorProfile = (editorList.body.profiles as Array<Record<string, unknown>>)[0]!;
  const editorMedia = (editorProfile.media as Array<Record<string, unknown>>)[0]!;
  assert.equal('verificationEvidenceReference' in editorProfile, false);
  assert.deepEqual(editorProfile.approval, { state: 'approved' });
  assert.equal('rightsEvidence' in editorMedia, false);

  const adminList = await api(handle, '/api/profiles', { token: adminToken });
  const adminProfile = (adminList.body.profiles as Array<Record<string, unknown>>)[0]!;
  const adminMedia = (adminProfile.media as Array<Record<string, unknown>>)[0]!;
  assert.equal(adminProfile.verificationEvidenceReference, 'synthetic-test-only');
  assert.equal(
    (adminProfile.approval as Record<string, unknown>).sourceReference,
    'synthetic-test-only',
  );
  assert.equal(adminMedia.rightsEvidence, 'synthetic-test-only');
});

test('executes the local CMS vertical and preserves revisions, replay state and audit after restart', async (context) => {
  const paths = temporaryWorkspace(context);
  const first = await startLocalCmsWorkbench({
    runtimeMode: 'test',
    stateFilePath: paths.stateFilePath,
    mediaRoot: paths.mediaRoot,
    operators,
    host: '127.0.0.1',
    port: 0,
    clock: () => '2026-08-27T18:00:00-05:00',
  });

  const created = await api(first, '/api/profiles', {
    token: editorToken,
    method: 'POST',
    body: createBody(2),
  });
  assert.equal(created.response.status, 201);

  const updated = await api(first, '/api/profiles/local-profile-2/update', {
    token: editorToken,
    method: 'POST',
    body: { expectedRevision: 1, displayName: 'Local edited draft' },
  });
  assert.equal((updated.body.profile as { revision: number }).revision, 2);

  const availability = await api(
    first,
    '/api/profiles/local-profile-2/availability',
    {
      token: editorToken,
      method: 'POST',
      body: { expectedRevision: 2, availability: 'limited' },
    },
  );
  assert.equal((availability.body.profile as { revision: number }).revision, 3);

  const duplicated = await api(
    first,
    '/api/profiles/local-profile-2/duplicate',
    {
      token: editorToken,
      method: 'POST',
      body: {
        expectedRevision: 3,
        id: 'local-profile-2-copy',
        slug: 'local-profile-2-copy',
      },
    },
  );
  assert.equal(duplicated.response.status, 201);
  assert.equal((duplicated.body.profile as { revision: number }).revision, 1);

  const archived = await api(first, '/api/profiles/local-profile-2/status', {
    token: adminToken,
    method: 'POST',
    body: { expectedRevision: 3, status: 'archived' },
  });
  assert.equal((archived.body.profile as { status: string }).status, 'archived');
  const restored = await api(first, '/api/profiles/local-profile-2/status', {
    token: adminToken,
    method: 'POST',
    body: { expectedRevision: 4, status: 'draft' },
  });
  assert.equal((restored.body.profile as { revision: number }).revision, 5);
  await first.close();

  const second = await start(context, paths);
  const profiles = await api(second, '/api/profiles?includeArchived=1', {
    token: adminToken,
  });
  assert.equal(profiles.response.status, 200);
  assert.deepEqual(
    (profiles.body.profiles as Array<{ id: string; revision: number }>).map(
      (profile) => [profile.id, profile.revision],
    ),
    [
      ['local-profile-2', 5],
      ['local-profile-2-copy', 1],
    ],
  );
  const audit = await api(second, '/api/audit', { token: adminToken });
  assert.deepEqual(
    (audit.body.events as Array<{ id: string; action: string }>).map(
      (event) => [event.id, event.action],
    ),
    [
      ['audit-000001', 'create'],
      ['audit-000002', 'edit'],
      ['audit-000003', 'availability-change'],
      ['audit-000004', 'duplicate'],
      ['audit-000005', 'archive'],
      ['audit-000006', 'restore'],
    ],
  );
});

test('audits media, links it to a profile, reorders it and restores it without physical deletion', async (context) => {
  const handle = await start(context);
  const created = await api(handle, '/api/profiles', {
    token: editorToken,
    method: 'POST',
    body: createBody(3),
  });
  assert.equal(created.response.status, 201);
  const png =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const stored = await api(handle, '/api/media', {
    token: editorToken,
    method: 'POST',
    idempotencyKey: 'media-store-replay-1',
    body: {
      bytesBase64: png,
      contentType: 'image/png',
      alt: 'Synthetic local media used by the workbench test',
      rightsEvidenceReference: 'synthetic:rights:workbench-1',
    },
  });
  assert.equal(stored.response.status, 201);
  const media = stored.body.media as Record<string, unknown> & {
    id: string;
    status: string;
  };
  assert.equal(media.status, 'active');
  assert.equal('sha256' in media, false);
  assert.equal('storageKey' in media, false);
  assert.equal('rightsEvidenceReference' in media, false);
  assert.equal('auditEvents' in media, false);
  const editorProcessing = media.processing as {
    pipeline: string;
    variants: Array<Record<string, unknown>>;
  };
  assert.equal(editorProcessing.pipeline, 'sharp-webp-v1');
  assert.equal('sourceSha256' in editorProcessing, false);
  assert.deepEqual(
    editorProcessing.variants.map((variant) => variant.name),
    ['desktop', 'mobile'],
  );
  assert.ok(
    editorProcessing.variants.every(
      (variant) => !('sha256' in variant) && !('storageKey' in variant),
    ),
  );

  const anonymousMedia = await fetch(
    `${handle.origin}/__local-media/${media.id}/desktop`,
  );
  assert.equal(anonymousMedia.status, 401);
  const authorizedMedia = await fetch(
    `${handle.origin}/__local-media/${media.id}/desktop`,
    { headers: { Authorization: `Bearer ${editorToken}` } },
  );
  assert.equal(authorizedMedia.status, 200);
  assert.equal(authorizedMedia.headers.get('content-type'), 'image/webp');
  assert.equal(authorizedMedia.headers.get('cache-control'), 'no-store, max-age=0');
  assert.ok((await authorizedMedia.arrayBuffer()).byteLength > 0);

  const replay = await api(handle, '/api/media', {
    token: editorToken,
    method: 'POST',
    idempotencyKey: 'media-store-replay-1',
    body: {
      bytesBase64: png,
      contentType: 'image/png',
      alt: 'Synthetic local media used by the workbench test',
      rightsEvidenceReference: 'synthetic:rights:workbench-1',
    },
  });
  assert.equal(replay.response.status, 409);
  assert.equal(replay.body.code, 'DUPLICATE_REQUEST');

  const attached = await api(
    handle,
    '/api/profiles/local-profile-3/attach-media',
    {
      token: editorToken,
      method: 'POST',
      body: { expectedRevision: 1, mediaId: media.id },
    },
  );
  const attachedProfile = attached.body.profile as {
    revision: number;
    media: Array<{ id: string; rightsConfirmed: boolean }>;
  };
  assert.equal(attachedProfile.revision, 2);
  assert.deepEqual(attachedProfile.media, [
    {
      id: media.id,
      kind: 'image',
      desktopUrl: `/__local-media/${media.id}/desktop`,
      mobileUrl: `/__local-media/${media.id}/mobile`,
      alt: 'Synthetic local media used by the workbench test',
      order: 0,
      rightsConfirmed: false,
    },
  ]);

  const reordered = await api(
    handle,
    '/api/profiles/local-profile-3/reorder-media',
    {
      token: editorToken,
      method: 'POST',
      body: { expectedRevision: 2, orderedMediaIds: [media.id] },
    },
  );
  assert.equal((reordered.body.profile as { revision: number }).revision, 3);

  const stillAttached = await api(handle, `/api/media/${media.id}/archive`, {
    token: adminToken,
    method: 'POST',
    body: {},
  });
  assert.equal(stillAttached.response.status, 409);
  assert.equal(stillAttached.body.code, 'MEDIA_STILL_ATTACHED');

  const detached = await api(
    handle,
    '/api/profiles/local-profile-3/detach-media',
    {
      token: editorToken,
      method: 'POST',
      body: { expectedRevision: 3, mediaId: media.id },
    },
  );
  assert.deepEqual(
    (detached.body.profile as { revision: number; media: unknown[] }).media,
    [],
  );

  const archived = await api(handle, `/api/media/${media.id}/archive`, {
    token: adminToken,
    method: 'POST',
    body: {},
  });
  assert.equal((archived.body.media as { status: string }).status, 'archived');

  const publicList = await api(handle, '/api/media', { token: editorToken });
  assert.deepEqual(publicList.body.media, []);
  const forbiddenArchiveList = await api(
    handle,
    '/api/media?includeArchived=1',
    { token: editorToken },
  );
  assert.equal(forbiddenArchiveList.response.status, 403);
  const adminList = await api(handle, '/api/media?includeArchived=1', {
    token: adminToken,
  });
  assert.equal((adminList.body.media as unknown[]).length, 1);
  const adminMedia = (adminList.body.media as Array<Record<string, unknown>>)[0]!;
  assert.match(String(adminMedia.sha256), /^[0-9a-f]{64}$/);
  assert.match(
    String(
      (adminMedia.processing as Record<string, unknown>).sourceSha256,
    ),
    /^[0-9a-f]{64}$/,
  );
  assert.equal(
    adminMedia.rightsEvidenceReference,
    'synthetic:rights:workbench-1',
  );

  const restored = await api(handle, `/api/media/${media.id}/restore`, {
    token: adminToken,
    method: 'POST',
    body: {},
  });
  assert.equal((restored.body.media as { status: string }).status, 'active');
  const audit = await api(handle, '/api/audit', { token: adminToken });
  assert.deepEqual(
    (audit.body.mediaEvents as Array<{ action: string; entityId: string }>).map(
      (event) => [event.action, event.entityId],
    ),
    [
      ['store', media.id],
      ['archive', media.id],
      ['restore', media.id],
    ],
  );
});

test('accepts bounded MP4 locally, serves it only with a valid token and attaches a video reference', async (context) => {
  const handle = await start(context);
  const created = await api(handle, '/api/profiles', {
    token: editorToken,
    method: 'POST',
    body: createBody(4),
  });
  assert.equal(created.response.status, 201);
  const bytes = syntheticMp4();
  const stored = await api(handle, '/api/media', {
    token: editorToken,
    method: 'POST',
    body: {
      bytesBase64: bytes.toString('base64'),
      contentType: 'video/mp4',
      alt: 'Vídeo MP4 sintético del workbench',
      rightsEvidenceReference: 'synthetic:rights:workbench-video-1',
    },
  });
  assert.equal(stored.response.status, 201);
  const media = stored.body.media as Record<string, unknown> & { id: string };
  assert.equal(media.kind, 'video');
  assert.equal(media.contentType, 'video/mp4');
  assert.equal(
    (media.processing as Record<string, unknown>).pipeline,
    'bounded-mp4-container-v1',
  );
  assert.equal('sourceSha256' in (media.processing as object), false);

  const served = await fetch(
    `${handle.origin}/__local-media/${media.id}/original`,
    { headers: { Authorization: `Bearer ${editorToken}` } },
  );
  assert.equal(served.status, 200);
  assert.equal(served.headers.get('content-type'), 'video/mp4');
  assert.deepEqual(Buffer.from(await served.arrayBuffer()), bytes);

  const attached = await api(
    handle,
    '/api/profiles/local-profile-4/attach-media',
    {
      token: editorToken,
      method: 'POST',
      body: { expectedRevision: 1, mediaId: media.id },
    },
  );
  assert.deepEqual(
    (attached.body.profile as { media: unknown[] }).media,
    [
      {
        id: media.id,
        kind: 'video',
        desktopUrl: `/__local-media/${media.id}/original`,
        alt: 'Vídeo MP4 sintético del workbench',
        order: 0,
        rightsConfirmed: false,
      },
    ],
  );
});

test('refuses production, non-loopback binding and weak local credentials', async (context) => {
  const paths = temporaryWorkspace(context);
  await assert.rejects(
    startLocalCmsWorkbench({
      runtimeMode: 'test',
      stateFilePath: paths.stateFilePath,
      mediaRoot: paths.mediaRoot,
      operators,
      host: '0.0.0.0' as '127.0.0.1',
    }),
    /loopback/i,
  );
  await assert.rejects(
    startLocalCmsWorkbench({
      runtimeMode: 'test',
      stateFilePath: paths.stateFilePath,
      mediaRoot: paths.mediaRoot,
      operators: [{ token: 'weak', actorId: 'admin', role: 'admin' }],
    }),
    /opaque token/i,
  );
  await assert.rejects(
    startLocalCmsWorkbench({
      runtimeMode: 'test',
      stateFilePath: paths.stateFilePath,
      mediaRoot: paths.mediaRoot,
      operators: [{ token: 'A'.repeat(43), actorId: 'admin', role: 'admin' }],
    }),
    /opaque token/i,
  );

  const previousEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, 'NODE_ENV', 'production');
  try {
    await assert.rejects(
      startLocalCmsWorkbench({
        runtimeMode: 'development',
        stateFilePath: paths.stateFilePath,
        mediaRoot: paths.mediaRoot,
        operators,
      }),
      /cannot run in production/i,
    );
  } finally {
    if (previousEnvironment === undefined) {
      Reflect.deleteProperty(process.env, 'NODE_ENV');
    } else {
      Reflect.set(process.env, 'NODE_ENV', previousEnvironment);
    }
  }
});
