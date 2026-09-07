import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { getPublicProfileDetail } from '../lib/content/public-profiles.ts';
import { buildRouteManifest } from '../lib/content/route-manifest.ts';
import {
  RUNTIME_SNAPSHOT_SCHEMA,
  RUNTIME_SNAPSHOT_VERSION,
} from '../lib/content/runtime-content-activation.ts';
import {
  RUNTIME_CONTENT_ACTIVATION_ENV,
  RUNTIME_CONTENT_ROOT_ENV,
  RUNTIME_CONTENT_SOURCE_ENV,
  resolveRuntimeContentFromEnvironment,
} from '../lib/content/runtime-content-source.ts';
import { getRuntimeContentResolution } from '../lib/content/runtime-snapshot.ts';
import type { ContentSnapshot } from '../lib/content/types.ts';
import { makeSnapshot } from './helpers.ts';

const approvedAt = '2026-08-28T20:00:00-05:00';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function runtimeReadySnapshot(): ContentSnapshot {
  const snapshot = makeSnapshot();
  snapshot.profiles.forEach((profile) => {
    profile.media.forEach((media) => {
      media.desktopUrl = `/assets/runtime/${profile.slug}-${media.order}.jpg`;
    });
  });
  return snapshot;
}

function runtimeEnvelope(
  snapshot = runtimeReadySnapshot(),
  productionActivation = true,
) {
  return {
    schema: RUNTIME_SNAPSHOT_SCHEMA,
    version: RUNTIME_SNAPSHOT_VERSION,
    purpose: 'runtime-activation',
    productionActivation,
    evidence: {
      releaseId: 'release-test-001',
      approvedBy: 'test-release-approver',
      approvedAt,
      sourceReference: 'test-approval-record',
    },
    snapshot,
  };
}

async function fixture(context: { after(callback: () => void): void }) {
  const root = await mkdtemp(join(tmpdir(), 'pecadosvip-runtime-test-'));
  context.after(() => {
    void rm(root, { recursive: true, force: true });
  });
  const sourcePath = join(root, 'approved', 'runtime-snapshot.json');
  await mkdir(dirname(sourcePath), { recursive: true });
  return { root, sourcePath };
}

function environment(
  root: string,
  sourcePath: string,
  activation = 'true',
) {
  return {
    [RUNTIME_CONTENT_ROOT_ENV]: root,
    [RUNTIME_CONTENT_SOURCE_ENV]: sourcePath,
    [RUNTIME_CONTENT_ACTIVATION_ENV]: activation,
  };
}

test('uses an isolated draft snapshot when no runtime source is configured', () => {
  const first = getRuntimeContentResolution({});
  assert.equal(first.activation.status, 'default-draft');
  assert.equal(first.activation.reasonCode, 'DEFAULT_DRAFT');
  assert.equal(first.activation.configured, false);
  assert.equal(first.snapshot.settings.publicationEnabled, false);

  first.snapshot.settings.publicationEnabled = true;
  const second = getRuntimeContentResolution({});
  assert.equal(second.snapshot.settings.publicationEnabled, false);
});

test('activates a complete approved snapshot only with both explicit controls', async (context) => {
  const setup = await fixture(context);
  const serialized = `${JSON.stringify(runtimeEnvelope())}\n`;
  await writeFile(setup.sourcePath, serialized);

  const resolution = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, setup.sourcePath),
  );

  assert.equal(resolution.activation.status, 'activated');
  assert.equal(resolution.activation.reasonCode, 'ACTIVATED');
  assert.equal(resolution.activation.sourceKind, 'snapshot');
  assert.equal(resolution.activation.sourceSchema, RUNTIME_SNAPSHOT_SCHEMA);
  assert.equal(resolution.activation.sourceSha256, sha256(serialized));
  assert.deepEqual(resolution.activation.evidence, {
    releaseId: 'release-test-001',
    approvedBy: 'test-release-approver',
    approvedAt,
    sourceReference: 'test-approval-record',
  });
  assert.equal(resolution.snapshot.settings.publicationEnabled, true);
  assert.equal(resolution.snapshot.profiles.length, 8);
});

test('keeps a valid approved source blocked without the environment activation flag', async (context) => {
  const setup = await fixture(context);
  await writeFile(setup.sourcePath, JSON.stringify(runtimeEnvelope()));

  const resolution = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, setup.sourcePath, 'false'),
  );

  assert.equal(resolution.activation.status, 'blocked');
  assert.equal(
    resolution.activation.reasonCode,
    'EXPLICIT_ACTIVATION_REQUIRED',
  );
  assert.equal(resolution.snapshot.settings.publicationEnabled, false);
});

test('keeps a valid source blocked when its own activation approval is false', async (context) => {
  const setup = await fixture(context);
  await writeFile(
    setup.sourcePath,
    JSON.stringify(runtimeEnvelope(runtimeReadySnapshot(), false)),
  );

  const resolution = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, setup.sourcePath),
  );

  assert.equal(resolution.activation.status, 'blocked');
  assert.equal(
    resolution.activation.reasonCode,
    'SOURCE_NOT_APPROVED_FOR_ACTIVATION',
  );
  assert.equal(resolution.snapshot.settings.publicationEnabled, false);
});

test('fails closed for missing, malformed and release-blocked snapshots', async (context) => {
  const setup = await fixture(context);
  const missing = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, setup.sourcePath),
  );
  assert.equal(missing.activation.reasonCode, 'SOURCE_MISSING');
  assert.equal(missing.snapshot.settings.publicationEnabled, false);

  await writeFile(setup.sourcePath, '{invalid json');
  const malformed = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, setup.sourcePath),
  );
  assert.equal(malformed.activation.reasonCode, 'SOURCE_INVALID');
  assert.deepEqual(malformed.activation.validationIssueCodes, [
    'RUNTIME_SNAPSHOT_SCHEMA_INVALID',
  ]);

  const blockedSnapshot = runtimeReadySnapshot();
  blockedSnapshot.settings.publicationEnabled = false;
  await writeFile(
    setup.sourcePath,
    JSON.stringify(runtimeEnvelope(blockedSnapshot)),
  );
  const blocked = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, setup.sourcePath),
  );
  assert.equal(blocked.activation.reasonCode, 'RELEASE_BLOCKED');
  assert.equal(
    blocked.activation.releaseBlockerCodes.includes('PUBLICATION_DISABLED'),
    true,
  );
  assert.equal(blocked.snapshot.settings.publicationEnabled, false);
});

test('rejects missing rights evidence and local-only runtime media without repairing them', async (context) => {
  const setup = await fixture(context);
  const noRights = runtimeReadySnapshot();
  noRights.profiles[0].media[0].rightsConfirmed = false;
  noRights.profiles[0].media[0].rightsEvidence = undefined;
  await writeFile(setup.sourcePath, JSON.stringify(runtimeEnvelope(noRights)));

  const rightsBlocked = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, setup.sourcePath),
  );
  assert.equal(rightsBlocked.activation.reasonCode, 'CONTENT_INVALID');
  assert.equal(
    rightsBlocked.activation.validationIssueCodes.includes(
      'MEDIA_RIGHTS_MISSING',
    ),
    true,
  );
  assert.equal(rightsBlocked.snapshot.profiles.length, 0);

  const localMedia = runtimeReadySnapshot();
  localMedia.profiles[0].media[0].desktopUrl = '/test-only/profile.jpg';
  await writeFile(
    setup.sourcePath,
    JSON.stringify(runtimeEnvelope(localMedia)),
  );
  const mediaBlocked = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, setup.sourcePath),
  );
  assert.equal(mediaBlocked.activation.reasonCode, 'CONTENT_INVALID');
  assert.equal(
    mediaBlocked.activation.validationIssueCodes.includes(
      'RUNTIME_MEDIA_URL_NOT_PUBLIC',
    ),
    true,
  );

  const thirdPartyMedia = runtimeReadySnapshot();
  thirdPartyMedia.profiles[0].media[0].desktopUrl =
    'https://cdn.example.org/profile.jpg';
  await writeFile(
    setup.sourcePath,
    JSON.stringify(runtimeEnvelope(thirdPartyMedia)),
  );
  const thirdPartyBlocked = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, setup.sourcePath),
  );
  assert.equal(thirdPartyBlocked.activation.reasonCode, 'CONTENT_INVALID');
  assert.equal(
    thirdPartyBlocked.activation.validationIssueCodes.includes(
      'RUNTIME_MEDIA_URL_NOT_PUBLIC',
    ),
    true,
  );

  const thirdPartyMobileMedia = runtimeReadySnapshot();
  thirdPartyMobileMedia.profiles[0].media[0].mobileUrl =
    'https://cdn.example.org/profile-mobile.jpg';
  await writeFile(
    setup.sourcePath,
    JSON.stringify(runtimeEnvelope(thirdPartyMobileMedia)),
  );
  const thirdPartyMobileBlocked = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, setup.sourcePath),
  );
  assert.equal(
    thirdPartyMobileBlocked.activation.validationIssueCodes.includes(
      'RUNTIME_MEDIA_URL_NOT_PUBLIC',
    ),
    true,
  );
});

test('rejects traversal and sources outside the configured root', async (context) => {
  const setup = await fixture(context);
  const traversal = `${setup.root}\\..\\outside-runtime.json`;
  const traversalResult = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, traversal),
  );
  assert.equal(traversalResult.activation.status, 'blocked');
  assert.equal(
    traversalResult.activation.reasonCode,
    'INVALID_CONFIGURATION',
  );

  const outsidePath = join(tmpdir(), 'outside-runtime.json');
  const outsideResult = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, outsidePath),
  );
  assert.equal(outsideResult.activation.reasonCode, 'UNSAFE_SOURCE_PATH');
});

test('verifies but never activates the current local-review publication candidate', async (context) => {
  const setup = await fixture(context);
  const candidateDirectory = join(setup.root, 'candidate');
  const snapshot = runtimeReadySnapshot();
  const routes = buildRouteManifest(snapshot)
    .filter((route) => route.indexable)
    .map((route) => ({
      path: route.path,
      kind: route.kind,
      indexable: true,
      ...(route.lastModified ? { lastModified: route.lastModified } : {}),
    }));
  const profiles = snapshot.profiles.map((profile) => {
    const projected = getPublicProfileDetail(snapshot, profile.slug);
    assert.ok(projected);
    return projected;
  });
  const content = {
    schema: 'pecadosvip.publication-candidate',
    version: 1,
    purpose: 'local-review-only',
    productionActivation: false,
    canonicalOrigin: snapshot.settings.canonicalOrigin,
    brandName: snapshot.settings.brandName,
    routes,
    cities: snapshot.cities.map((city) => ({
      slug: city.slug,
      name: city.name,
      headline: city.headline,
      introduction: city.introduction,
      differentiators: city.differentiators,
      coverageAreas: city.coverageAreas.map((area) => area.name),
      faqs: city.faqs,
      nearbyCitySlugs: city.nearbyCitySlugs,
      seo: {
        title: city.seo.title,
        description: city.seo.description,
        canonicalPath: city.seo.canonicalPath,
        lastModified: city.seo.lastModified,
      },
    })),
    profiles,
    services: snapshot.services.map((service) => ({
      slug: service.slug,
      name: service.name,
      description: service.description,
    })),
    contact: snapshot.settings.contact,
    legalDocuments: [
      ['aviso-legal', snapshot.settings.legal.legalNotice],
      ['privacidad', snapshot.settings.legal.privacy],
      ['cookies', snapshot.settings.legal.cookies],
      ['terminos-del-servicio', snapshot.settings.legal.serviceTerms],
    ].map(([slug, document]) => ({
      slug,
      title: typeof document === 'string' ? '' : document.title,
      body: typeof document === 'string' ? '' : document.body,
      updatedAt: typeof document === 'string' ? '' : document.updatedAt,
    })),
  };
  const contentSerialized = `${JSON.stringify(content)}\n`;
  const manifest = {
    schema: 'pecadosvip.publication-candidate-manifest',
    version: 1,
    purpose: 'local-review-only',
    productionActivation: false,
    fileCount: 1,
    totalBytes: Buffer.byteLength(contentSerialized),
    files: [
      {
        path: 'payload/content.json',
        byteLength: Buffer.byteLength(contentSerialized),
        sha256: sha256(contentSerialized),
      },
    ],
  };
  await mkdir(join(candidateDirectory, 'payload'), { recursive: true });
  await writeFile(
    join(candidateDirectory, 'manifest.json'),
    JSON.stringify(manifest),
  );
  await writeFile(
    join(candidateDirectory, 'payload', 'content.json'),
    contentSerialized,
  );

  const resolution = resolveRuntimeContentFromEnvironment(
    getRuntimeContentResolution({}).snapshot,
    environment(setup.root, candidateDirectory),
  );
  assert.equal(resolution.activation.status, 'blocked');
  assert.equal(
    resolution.activation.reasonCode,
    'CANDIDATE_LOCAL_REVIEW_ONLY',
  );
  assert.equal(resolution.activation.sourceKind, 'publication-candidate');
  assert.equal(resolution.activation.sourceSha256, sha256(contentSerialized));
  assert.equal(resolution.snapshot.settings.publicationEnabled, false);
});
