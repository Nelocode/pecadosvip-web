import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  lstat,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { PersistentJsonProfileRepository } from '../lib/content/persistent-repository.ts';
import {
  exportLocalPublicationCandidate,
  PublicationCandidateError,
} from '../lib/publication/local-publication-candidate.ts';
import type { ContentSnapshot } from '../lib/content/types.ts';
import { makeSnapshot } from './helpers.ts';

type Fixture = {
  root: string;
  stateFilePath: string;
  referencesFilePath: string;
  outputDirectory: string;
  snapshot: ContentSnapshot;
};

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const candidateScript = join(
  repositoryRoot,
  'scripts',
  'local-publication-candidate.ts',
);

function runCandidateCli(
  setup: Fixture,
  outputDirectory: string,
  nodeEnvironment: 'development' | 'production',
) {
  return spawnSync(
    process.execPath,
    ['--experimental-strip-types', candidateScript],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      env: {
        ...process.env,
        NODE_ENV: nodeEnvironment,
        PECADOSVIP_LOCAL_CMS_DATA_DIR: dirname(setup.stateFilePath),
        PECADOSVIP_PUBLICATION_CANDIDATE_REFERENCES_FILE:
          setup.referencesFilePath,
        PECADOSVIP_PUBLICATION_CANDIDATE_OUTPUT_DIR: outputDirectory,
      },
    },
  );
}

function hasCode(
  error: unknown,
  code: PublicationCandidateError['code'],
): error is PublicationCandidateError {
  return error instanceof PublicationCandidateError && error.code === code;
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function prepareSnapshot(reverse = false): ContentSnapshot {
  const snapshot = makeSnapshot();
  snapshot.profiles.forEach((profile) => {
    profile.approval.approvedBy = 'internal-approver-do-not-export';
    profile.approval.sourceReference = 'internal-evidence-do-not-export';
    profile.verificationEvidenceReference = 'internal-evidence-do-not-export';
    profile.media.forEach((media) => {
      media.desktopUrl = `/assets/${profile.slug}-${media.order}.jpg`;
      media.rightsEvidence = 'internal-evidence-do-not-export';
    });
  });
  snapshot.cities.forEach((city) => {
    city.approval.approvedBy = 'internal-approver-do-not-export';
    city.approval.sourceReference = 'internal-evidence-do-not-export';
  });
  snapshot.services.forEach((service) => {
    service.approval.approvedBy = 'internal-approver-do-not-export';
    service.approval.sourceReference = 'internal-evidence-do-not-export';
  });
  Object.values(snapshot.settings.legal).forEach((document) => {
    document.approval.approvedBy = 'internal-approver-do-not-export';
    document.approval.sourceReference = 'internal-evidence-do-not-export';
  });
  if (reverse) {
    snapshot.profiles.reverse();
    snapshot.cities.reverse();
    snapshot.services.reverse();
  }
  return snapshot;
}

async function fixture(
  context: { after(callback: () => void): void },
  reverse = false,
): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), 'pecadosvip-candidate-test-'));
  context.after(() => {
    void rm(root, { recursive: true, force: true });
  });
  const snapshot = prepareSnapshot(reverse);
  const stateFilePath = join(root, 'cms', 'profiles.json');
  const referencesFilePath = join(root, 'references', 'candidate-references.json');
  const outputDirectory = join(root, 'candidate');
  await mkdir(dirname(referencesFilePath), { recursive: true });
  await writeFile(
    referencesFilePath,
    `${JSON.stringify({
      schema: 'pecadosvip.publication-candidate-references',
      version: 1,
      cities: snapshot.cities,
      services: snapshot.services,
      settings: snapshot.settings,
    })}\n`,
  );
  new PersistentJsonProfileRepository({
    filePath: stateFilePath,
    runtimeMode: 'test',
    seedProfiles: snapshot.profiles,
    publicationReferences: {
      cities: snapshot.cities,
      services: snapshot.services,
    },
  });
  return {
    root,
    stateFilePath,
    referencesFilePath,
    outputDirectory,
    snapshot,
  };
}

function collectKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectKeys(entry, keys));
  } else if (value && typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) {
      keys.add(key);
      collectKeys(entry, keys);
    }
  }
  return keys;
}

test('exports a hashed local-review artifact without internal CMS fields', async (context) => {
  const setup = await fixture(context);
  const stateBefore = await readFile(setup.stateFilePath);
  const result = await exportLocalPublicationCandidate({
    runtimeMode: 'test',
    stateFilePath: setup.stateFilePath,
    referencesFilePath: setup.referencesFilePath,
    outputDirectory: setup.outputDirectory,
  });

  assert.equal(result.manifest.schema, 'pecadosvip.publication-candidate-manifest');
  assert.equal(result.manifest.version, 1);
  assert.equal(result.manifest.purpose, 'local-review-only');
  assert.equal(result.manifest.productionActivation, false);
  assert.equal(result.content.productionActivation, false);
  assert.equal(result.content.profiles.length, 8);
  assert.equal(result.content.cities.length, 7);
  assert.equal(result.content.services.length, 1);

  const contentBytes = await readFile(
    join(setup.outputDirectory, 'payload', 'content.json'),
  );
  const manifest = JSON.parse(
    await readFile(join(setup.outputDirectory, 'manifest.json'), 'utf8'),
  ) as typeof result.manifest;
  assert.equal(manifest.files[0].path, 'payload/content.json');
  assert.equal(manifest.files[0].byteLength, contentBytes.byteLength);
  assert.equal(manifest.files[0].sha256, sha256(contentBytes));
  assert.deepEqual(await readFile(setup.stateFilePath), stateBefore);

  const content = JSON.parse(contentBytes.toString('utf8')) as unknown;
  const keys = collectKeys(content);
  for (const forbidden of [
    'id',
    'revision',
    'approval',
    'approvedBy',
    'approvedAt',
    'sourceReference',
    'verificationEvidenceReference',
    'rightsEvidence',
    'rightsConfirmed',
    'adultAgeConfirmed',
    'publicationConsentConfirmed',
    'auditEvents',
    'requestIds',
    'actorId',
  ]) {
    assert.equal(keys.has(forbidden), false, forbidden);
  }
  const serialized = contentBytes.toString('utf8');
  assert.equal(serialized.includes('internal-approver-do-not-export'), false);
  assert.equal(serialized.includes('internal-evidence-do-not-export'), false);
  assert.equal(serialized.includes('media-1'), false);
});

test('is byte-for-byte deterministic across equivalent source ordering', async (context) => {
  const first = await fixture(context);
  const second = await fixture(context, true);
  const firstOutput = join(first.root, 'candidate-a');
  const secondOutput = join(second.root, 'candidate-b');

  await exportLocalPublicationCandidate({
    runtimeMode: 'test',
    stateFilePath: first.stateFilePath,
    referencesFilePath: first.referencesFilePath,
    outputDirectory: firstOutput,
  });
  await exportLocalPublicationCandidate({
    runtimeMode: 'test',
    stateFilePath: second.stateFilePath,
    referencesFilePath: second.referencesFilePath,
    outputDirectory: secondOutput,
  });

  assert.deepEqual(
    await readFile(join(firstOutput, 'payload', 'content.json')),
    await readFile(join(secondOutput, 'payload', 'content.json')),
  );
  assert.deepEqual(
    await readFile(join(firstOutput, 'manifest.json')),
    await readFile(join(secondOutput, 'manifest.json')),
  );
});

test('CLI creates only a local-review candidate and reports its content hash', async (context) => {
  const setup = await fixture(context);
  const outputDirectory = join(setup.root, 'cli-candidate');
  const cli = runCandidateCli(setup, outputDirectory, 'development');
  assert.equal(cli.status, 0, cli.stderr);
  const report = JSON.parse(cli.stdout) as {
    result: string;
    purpose: string;
    productionActivation: boolean;
    contentSha256: string;
  };
  assert.equal(report.result, 'publication-candidate-created');
  assert.equal(report.purpose, 'local-review-only');
  assert.equal(report.productionActivation, false);
  assert.equal(
    report.contentSha256,
    sha256(await readFile(join(outputDirectory, 'payload', 'content.json'))),
  );
});

test('fails closed for an empty persistent CMS state and creates no artifact', async (context) => {
  const setup = await fixture(context);
  const emptyState = join(setup.root, 'empty', 'profiles.json');
  new PersistentJsonProfileRepository({
    filePath: emptyState,
    runtimeMode: 'test',
    publicationReferences: {
      cities: setup.snapshot.cities,
      services: setup.snapshot.services,
    },
  });
  const outputDirectory = join(setup.root, 'empty-candidate');

  await assert.rejects(
    exportLocalPublicationCandidate({
      runtimeMode: 'test',
      stateFilePath: emptyState,
      referencesFilePath: setup.referencesFilePath,
      outputDirectory,
    }),
    (error) =>
      hasCode(error, 'RELEASE_BLOCKED') &&
      error.blockerCodes.includes('INITIAL_PROFILE_LOAD_INCOMPLETE'),
  );
  await assert.rejects(lstat(outputDirectory));
});

test('reports incomplete external gates without writing a partial destination', async (context) => {
  const setup = await fixture(context);
  const references = JSON.parse(
    await readFile(setup.referencesFilePath, 'utf8'),
  ) as {
    settings: ContentSnapshot['settings'];
  };
  references.settings.publicationEnabled = false;
  references.settings.canonicalOrigin = undefined;
  references.settings.contact = {};
  references.settings.legal.privacy.approval = { state: 'pending' };
  await writeFile(setup.referencesFilePath, `${JSON.stringify(references)}\n`);

  await assert.rejects(
    exportLocalPublicationCandidate({
      runtimeMode: 'test',
      stateFilePath: setup.stateFilePath,
      referencesFilePath: setup.referencesFilePath,
      outputDirectory: setup.outputDirectory,
    }),
    (error) =>
      hasCode(error, 'RELEASE_BLOCKED') &&
      ['PUBLICATION_DISABLED', 'CANONICAL_ORIGIN_INVALID', 'CONTACT_CHANNEL_MISSING', 'LEGAL_APPROVAL_MISSING'].every(
        (code) => error.blockerCodes.includes(code),
      ),
  );
  await assert.rejects(lstat(setup.outputDirectory));
});

test('rejects local workbench media references even when the general release gate passes', async (context) => {
  const setup = await fixture(context);
  const unsafeSnapshot = prepareSnapshot();
  unsafeSnapshot.profiles[0].media[0].desktopUrl =
    `/__local-media/${unsafeSnapshot.profiles[0].media[0].id}`;
  const unsafeState = join(setup.root, 'unsafe-media', 'profiles.json');
  new PersistentJsonProfileRepository({
    filePath: unsafeState,
    runtimeMode: 'test',
    seedProfiles: unsafeSnapshot.profiles,
    publicationReferences: {
      cities: setup.snapshot.cities,
      services: setup.snapshot.services,
    },
  });

  await assert.rejects(
    exportLocalPublicationCandidate({
      runtimeMode: 'test',
      stateFilePath: unsafeState,
      referencesFilePath: setup.referencesFilePath,
      outputDirectory: setup.outputDirectory,
    }),
    (error) => hasCode(error, 'LOCAL_MEDIA_REFERENCE'),
  );
  await assert.rejects(lstat(setup.outputDirectory));
});

test('rejects existing, overlapping and oversized paths without replacing data', async (context) => {
  const setup = await fixture(context);
  await mkdir(setup.outputDirectory);
  const sentinel = join(setup.outputDirectory, 'keep.txt');
  await writeFile(sentinel, 'preserve');
  await assert.rejects(
    exportLocalPublicationCandidate({
      runtimeMode: 'test',
      stateFilePath: setup.stateFilePath,
      referencesFilePath: setup.referencesFilePath,
      outputDirectory: setup.outputDirectory,
    }),
    (error) => hasCode(error, 'DESTINATION_EXISTS'),
  );
  assert.equal(await readFile(sentinel, 'utf8'), 'preserve');

  await assert.rejects(
    exportLocalPublicationCandidate({
      runtimeMode: 'test',
      stateFilePath: setup.stateFilePath,
      referencesFilePath: setup.referencesFilePath,
      outputDirectory: dirname(setup.stateFilePath),
    }),
    (error) => hasCode(error, 'INVALID_PATH'),
  );

  const oversized = join(setup.root, 'oversized-references.json');
  await writeFile(oversized, Buffer.alloc(16 * 1024 * 1024 + 1, 0x20));
  await assert.rejects(
    exportLocalPublicationCandidate({
      runtimeMode: 'test',
      stateFilePath: setup.stateFilePath,
      referencesFilePath: oversized,
      outputDirectory: join(setup.root, 'oversized-candidate'),
    }),
    (error) => hasCode(error, 'SOURCE_UNAVAILABLE'),
  );
});

test('rejects malformed state, symlink sources and production execution', async (context) => {
  const setup = await fixture(context);
  const corruptState = join(setup.root, 'corrupt', 'profiles.json');
  await mkdir(dirname(corruptState), { recursive: true });
  await writeFile(
    corruptState,
    `${JSON.stringify({
      schema: 'pecadosvip.profile-repository',
      version: 999,
      state: {},
    })}\n`,
  );
  await assert.rejects(
    exportLocalPublicationCandidate({
      runtimeMode: 'test',
      stateFilePath: corruptState,
      referencesFilePath: setup.referencesFilePath,
      outputDirectory: setup.outputDirectory,
    }),
    (error) => hasCode(error, 'SOURCE_UNAVAILABLE'),
  );

  const referenceLink = join(setup.root, 'references-link.json');
  try {
    await symlink(setup.referencesFilePath, referenceLink, 'file');
    await assert.rejects(
      exportLocalPublicationCandidate({
        runtimeMode: 'test',
        stateFilePath: setup.stateFilePath,
        referencesFilePath: referenceLink,
        outputDirectory: join(setup.root, 'symlink-candidate'),
      }),
      (error) => hasCode(error, 'UNSAFE_ENTRY'),
    );
  } catch (error) {
    if (
      !(
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        (error.code === 'EPERM' || error.code === 'EACCES')
      )
    ) {
      throw error;
    }
  }

  const previousNodeEnvironment = process.env.NODE_ENV;
  Reflect.set(process.env, 'NODE_ENV', 'production');
  try {
    await assert.rejects(
      exportLocalPublicationCandidate({
        runtimeMode: 'test',
        stateFilePath: setup.stateFilePath,
        referencesFilePath: setup.referencesFilePath,
        outputDirectory: join(setup.root, 'production-candidate'),
      }),
      (error) => hasCode(error, 'INVALID_RUNTIME'),
    );

    const cli = runCandidateCli(
      setup,
      join(setup.root, 'production-cli-candidate'),
      'production',
    );
    assert.notEqual(cli.status, 0);
    assert.match(cli.stderr, /restricted to local development and tests/i);
  } finally {
    if (previousNodeEnvironment === undefined) {
      Reflect.deleteProperty(process.env, 'NODE_ENV');
    } else {
      Reflect.set(process.env, 'NODE_ENV', previousNodeEnvironment);
    }
  }
});
