import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

import { PersistentJsonProfileRepository } from '../lib/content/persistent-repository.ts';
import { RepositoryError } from '../lib/content/repository.ts';
import type {
  Actor,
  NewProfileInput,
  WriteContext,
} from '../lib/content/repository.ts';
import { makeProfile, makeSnapshot } from './helpers.ts';

const now = '2026-08-27T16:00:00-05:00';
const admin: Actor = { id: 'admin-test', role: 'admin' };
const editor: Actor = { id: 'editor-test', role: 'editor' };

type CleanupContext = {
  after(callback: () => void): void;
};

function temporaryStatePath(context: CleanupContext): string {
  const directory = mkdtempSync(join(tmpdir(), 'pecadosvip-repository-'));
  context.after(() => rmSync(directory, { recursive: true, force: true }));
  return join(directory, 'nested', 'profiles.json');
}

function write(
  requestId: string,
  expectedRevision: number,
  actor: Actor = editor,
): WriteContext {
  return { actor, requestId, expectedRevision };
}

function createInput(index: number): NewProfileInput {
  const profile = makeProfile(index);
  return {
    id: profile.id,
    slug: profile.slug,
    displayName: profile.displayName,
    age: profile.age,
    biography: profile.biography,
    measurements: structuredClone(profile.measurements),
    languages: [...profile.languages],
    serviceIds: [...profile.serviceIds],
    media: structuredClone(profile.media),
    citySlugs: [...profile.citySlugs],
  };
}

function hasCode(error: unknown, code: RepositoryError['code']): boolean {
  return error instanceof RepositoryError && error.code === code;
}

test('creates a versioned envelope in a nested directory and persists defensive clones', (context) => {
  const filePath = temporaryStatePath(context);
  const repository = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    clock: () => now,
  });
  const created = repository.createProfile(createInput(21), {
    actor: editor,
    requestId: 'create-persistent-1',
  });

  created.displayName = 'outside mutation';
  created.languages.push('outside');
  const stored = repository.getProfile(created.id, editor);
  assert.notEqual(stored.displayName, created.displayName);
  assert.equal(stored.languages.includes('outside'), false);

  const envelope = JSON.parse(readFileSync(filePath, 'utf8')) as {
    schema: string;
    version: number;
    state: { auditEvents: unknown[]; profiles: unknown[] };
  };
  assert.equal(envelope.schema, 'pecadosvip.profile-repository');
  assert.equal(envelope.version, 1);
  assert.equal(envelope.state.profiles.length, 1);
  assert.equal(envelope.state.auditEvents.length, 1);
  assert.equal(
    JSON.stringify(envelope.state.auditEvents).includes(stored.displayName),
    false,
  );
  assert.deepEqual(readdirSync(dirname(filePath)).sort(), ['profiles.json']);
});

test('survives restart with optimistic revisions, audit sequence and replay protection intact', (context) => {
  const filePath = temporaryStatePath(context);
  const first = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    clock: () => now,
  });
  const created = first.createProfile(createInput(22), {
    actor: editor,
    requestId: 'create-persistent-2',
  });
  const second = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    clock: () => now,
  });

  assert.throws(
    () =>
      second.updateProfile(
        created.id,
        { biography: 'Replay must fail.' },
        write('create-persistent-2', created.revision),
      ),
    (error) => hasCode(error, 'DUPLICATE_REQUEST'),
  );
  const updated = second.updateProfile(
    created.id,
    { biography: 'Committed after restart.' },
    write('edit-after-restart', created.revision),
  );
  assert.equal(updated.revision, 2);

  const third = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    clock: () => now,
  });
  assert.equal(
    third.getProfile(created.id, editor).biography,
    'Committed after restart.',
  );
  assert.deepEqual(
    third.listAuditEvents(admin).map((event) => [event.id, event.requestId]),
    [
      ['audit-000001', 'create-persistent-2'],
      ['audit-000002', 'edit-after-restart'],
    ],
  );
});

test('same-process instances reload the latest file and reject stale revisions', (context) => {
  const filePath = temporaryStatePath(context);
  const seed = makeProfile(23);
  seed.status = 'hidden';
  const first = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    seedProfiles: [seed],
    clock: () => now,
  });
  const second = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    clock: () => now,
  });

  const edited = first.updateProfile(
    seed.id,
    { biography: 'First instance committed.' },
    write('multi-instance-edit', 1),
  );
  const available = second.setAvailability(
    seed.id,
    'limited',
    write('multi-instance-availability', edited.revision),
  );
  assert.equal(available.revision, 3);
  assert.throws(
    () =>
      first.setAvailability(
        seed.id,
        'available',
        write('multi-instance-stale', edited.revision),
      ),
    (error) => hasCode(error, 'REVISION_CONFLICT'),
  );
  const finalState = first.getProfile(seed.id, editor);
  assert.equal(finalState.biography, 'First instance committed.');
  assert.equal(finalState.availability, 'limited');
});

test('failed persistence does not publish memory state or consume the request ID', (context) => {
  const filePath = temporaryStatePath(context);
  const seed = makeProfile(24);
  seed.status = 'hidden';
  const repository = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    seedProfiles: [seed],
    clock: () => now,
  });
  const oversizedBiography = 'x'.repeat(17 * 1024 * 1024);

  assert.throws(
    () =>
      repository.updateProfile(
        seed.id,
        { biography: oversizedBiography },
        write('retry-after-storage-failure', 1),
      ),
    (error) => hasCode(error, 'PERSISTENCE_UNAVAILABLE'),
  );
  assert.equal(repository.getProfile(seed.id, editor).revision, 1);
  assert.notEqual(
    repository.getProfile(seed.id, editor).biography,
    oversizedBiography,
  );

  const retried = repository.updateProfile(
    seed.id,
    { biography: 'Small retry succeeds.' },
    write('retry-after-storage-failure', 1),
  );
  assert.equal(retried.revision, 2);
  assert.equal(repository.listAuditEvents(admin).length, 1);
});

test('archive remains recoverable in the file and no physical-delete API is exposed', (context) => {
  const filePath = temporaryStatePath(context);
  const seed = makeProfile(25);
  const repository = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    seedProfiles: [seed],
    clock: () => now,
  });
  const archived = repository.setStatus(
    seed.id,
    'archived',
    write('persistent-archive', 1, admin),
  );
  assert.equal(archived.status, 'archived');
  assert.equal('deleteProfile' in repository, false);

  const envelope = JSON.parse(readFileSync(filePath, 'utf8')) as {
    state: { profiles: Array<{ id: string; status: string }> };
  };
  assert.deepEqual(
    envelope.state.profiles.map((profile) => [profile.id, profile.status]),
    [[seed.id, 'archived']],
  );
  const restarted = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    clock: () => now,
  });
  assert.equal(restarted.getProfile(seed.id, admin, true).status, 'archived');
});

test('reorder, evidence, approval, publication and duplication all persist through the domain contract', (context) => {
  const filePath = temporaryStatePath(context);
  const seed = makeProfile(27);
  seed.status = 'draft';
  seed.approval = { state: 'pending' };
  seed.adultAgeConfirmed = false;
  seed.publicationConsentConfirmed = false;
  seed.rightsConfirmed = false;
  seed.media.push({
    ...seed.media[0],
    id: 'persistent-media-extra',
    order: 1,
  });
  const references = makeSnapshot();
  const repository = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    seedProfiles: [seed],
    publicationReferences: {
      cities: references.cities,
      services: references.services,
    },
    clock: () => now,
  });

  const reordered = repository.reorderMedia(
    seed.id,
    ['persistent-media-extra', seed.media[0].id],
    write('persistent-reorder', 1),
  );
  const evidenced = repository.recordEvidence(
    seed.id,
    {
      adultAgeConfirmed: true,
      publicationConsentConfirmed: true,
      rightsConfirmed: true,
      sourceReference: 'test-only-persistent-evidence',
    },
    write('persistent-evidence', reordered.revision, admin),
  );
  const approved = repository.approveProfile(
    seed.id,
    'test-only-persistent-approval',
    write('persistent-approval', evidenced.revision, admin),
  );
  const published = repository.setStatus(
    seed.id,
    'published',
    write('persistent-publication', approved.revision, admin),
  );
  const duplicate = repository.duplicateProfile(
    seed.id,
    { id: 'persistent-copy', slug: 'persistent-copy' },
    write('persistent-duplicate', published.revision),
  );
  assert.equal(published.status, 'published');
  assert.equal(duplicate.status, 'draft');
  assert.deepEqual(duplicate.media, []);

  const restarted = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    publicationReferences: {
      cities: references.cities,
      services: references.services,
    },
    clock: () => now,
  });
  assert.deepEqual(
    restarted.listProfiles(admin).map((profile) => profile.id).sort(),
    ['persistent-copy', seed.id].sort(),
  );
  assert.deepEqual(
    restarted.listAuditEvents(admin).map((event) => event.action),
    ['reorder-media', 'record-evidence', 'approve', 'publish', 'duplicate'],
  );
});

test('malformed JSON, unsupported versions, invalid state and missing state fail closed', (context) => {
  const malformedPath = temporaryStatePath(context);
  const malformed = new PersistentJsonProfileRepository({
    filePath: malformedPath,
    runtimeMode: 'test',
    clock: () => now,
  });
  writeFileSync(malformedPath, '{not-json', 'utf8');
  assert.throws(
    () => malformed.listProfiles(admin),
    (error) => hasCode(error, 'PERSISTENCE_CORRUPT'),
  );

  writeFileSync(
    malformedPath,
    JSON.stringify({
      schema: 'pecadosvip.profile-repository',
      version: 2,
      state: {},
    }),
    'utf8',
  );
  assert.throws(
    () =>
      new PersistentJsonProfileRepository({
        filePath: malformedPath,
        runtimeMode: 'test',
      }),
    (error) => hasCode(error, 'PERSISTENCE_CORRUPT'),
  );

  writeFileSync(
    malformedPath,
    JSON.stringify({
      schema: 'pecadosvip.profile-repository',
      version: 1,
      state: {
        profiles: [{ id: 'private-content-must-not-appear-in-error' }],
        auditEvents: [],
        requestIds: [],
        auditSequence: 0,
      },
    }),
    'utf8',
  );
  assert.throws(
    () =>
      new PersistentJsonProfileRepository({
        filePath: malformedPath,
        runtimeMode: 'test',
      }),
    (error) =>
      hasCode(error, 'PERSISTENCE_CORRUPT') &&
      !String(error).includes('private-content-must-not-appear-in-error'),
  );

  const missingPath = temporaryStatePath(context);
  const missing = new PersistentJsonProfileRepository({
    filePath: missingPath,
    runtimeMode: 'test',
  });
  unlinkSync(missingPath);
  assert.throws(
    () => missing.listProfiles(admin),
    (error) => hasCode(error, 'PERSISTENCE_CORRUPT'),
  );

  const auditPath = temporaryStatePath(context);
  const audited = new PersistentJsonProfileRepository({
    filePath: auditPath,
    runtimeMode: 'test',
    clock: () => now,
  });
  audited.createProfile(createInput(28), {
    actor: editor,
    requestId: 'audit-content-guard',
  });
  const tampered = JSON.parse(readFileSync(auditPath, 'utf8')) as {
    state: { auditEvents: Array<Record<string, unknown>> };
  };
  tampered.state.auditEvents[0].privateContent =
    'private-content-must-not-be-restored';
  writeFileSync(auditPath, JSON.stringify(tampered), 'utf8');
  assert.throws(
    () => audited.listAuditEvents(admin),
    (error) =>
      hasCode(error, 'PERSISTENCE_CORRUPT') &&
      !String(error).includes('private-content-must-not-be-restored'),
  );

  assert.throws(
    () =>
      new PersistentJsonProfileRepository({
        filePath: auditPath.replace(/\.json$/, '.txt'),
        runtimeMode: 'test',
      }),
    (error) => hasCode(error, 'INVALID_INPUT'),
  );
});

test('same-path reentrancy is rejected while a mutation holds the local file lock', (context) => {
  const filePath = temporaryStatePath(context);
  let probeLock = false;
  const clock = (): string => {
    if (probeLock) {
      assert.throws(
        () => repository.listProfiles(admin),
        (error) => hasCode(error, 'PERSISTENCE_BUSY'),
      );
    }
    return now;
  };
  const repository = new PersistentJsonProfileRepository({
    filePath,
    runtimeMode: 'test',
    clock,
  });
  probeLock = true;
  const created = repository.createProfile(createInput(26), {
    actor: editor,
    requestId: 'reentrant-create',
  });
  assert.equal(created.revision, 1);
});

test('production mode is refused even if a caller labels the adapter development-only', (context) => {
  const filePath = temporaryStatePath(context);
  const moduleUrl = pathToFileURL(
    resolve('lib/content/persistent-repository.ts'),
  ).href;
  const childScript = `
    import { PersistentJsonProfileRepository } from ${JSON.stringify(moduleUrl)};
    try {
      new PersistentJsonProfileRepository({
        filePath: ${JSON.stringify(filePath)},
        runtimeMode: 'development'
      });
      process.exitCode = 2;
    } catch (error) {
      process.exitCode = error?.code === 'PERSISTENCE_UNAVAILABLE' ? 0 : 3;
    }
  `;
  const result = spawnSync(
    process.execPath,
    ['--experimental-strip-types', '--input-type=module', '--eval', childScript],
    {
      encoding: 'utf8',
      env: { ...process.env, NODE_ENV: 'production' },
    },
  );
  assert.equal(result.status, 0, result.stderr);
});
