import assert from 'node:assert/strict';
import test from 'node:test';

import {
  InMemoryProfileRepository,
  RepositoryError,
} from '../lib/content/repository.ts';
import type {
  Actor,
  CreateContext,
  NewProfileInput,
  WriteContext,
} from '../lib/content/repository.ts';
import { makeProfile, makeSnapshot } from './helpers.ts';

const now = '2026-08-27T03:00:00-05:00';
const admin: Actor = { id: 'admin-test', role: 'admin' };
const editor: Actor = { id: 'editor-test', role: 'editor' };

function write(
  actor: Actor,
  requestId: string,
  expectedRevision: number,
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

function assertCode(
  error: unknown,
  code: RepositoryError['code'],
): boolean {
  return error instanceof RepositoryError && error.code === code;
}

test('create is fail-closed, cloned and audited without personal content in the log', () => {
  const repository = new InMemoryProfileRepository([], () => now);
  const context: CreateContext = {
    actor: editor,
    requestId: 'create-1',
  };
  const created = repository.createProfile(createInput(1), context);

  assert.equal(created.status, 'draft');
  assert.equal(created.availability, 'unavailable');
  assert.equal(created.approval.state, 'pending');
  assert.equal(created.adultAgeConfirmed, false);
  assert.equal(created.revision, 1);

  created.displayName = 'mutated outside repository';
  assert.notEqual(
    repository.getProfile(created.id, editor).displayName,
    created.displayName,
  );

  const [event] = repository.listAuditEvents(admin);
  assert.equal(event.actorId, editor.id);
  assert.equal(event.action, 'create');
  assert.equal(JSON.stringify(event).includes('Synthetic content'), false);
});

test('unknown runtime roles, duplicate IDs, slugs and request replays fail closed', () => {
  const seed = makeProfile(2);
  const repository = new InMemoryProfileRepository([seed], () => now);

  assert.throws(
    () =>
      repository.listProfiles({
        id: 'intruder',
        role: 'owner' as never,
      }),
    (error) => assertCode(error, 'FORBIDDEN'),
  );
  assert.throws(
    () =>
      repository.createProfile(
        { ...createInput(3), id: seed.id },
        { actor: editor, requestId: 'dup-id' },
      ),
    (error) => assertCode(error, 'DUPLICATE_ID'),
  );
  assert.throws(
    () =>
      repository.createProfile(
        { ...createInput(3), slug: seed.slug },
        { actor: editor, requestId: 'dup-slug' },
      ),
    (error) => assertCode(error, 'DUPLICATE_SLUG'),
  );
  assert.throws(
    () =>
      repository.createProfile(createInput(9), {
        actor: editor,
        requestId: 'contains personal text',
      }),
    (error) => assertCode(error, 'INVALID_INPUT'),
  );

  repository.setAvailability(
    seed.id,
    'limited',
    write(editor, 'once', 1),
  );
  assert.throws(
    () =>
      repository.setAvailability(
        seed.id,
        'available',
        write(editor, 'once', 2),
      ),
    (error) => assertCode(error, 'DUPLICATE_REQUEST'),
  );
});

test('repository rejects ambiguous clocks and non-canonical stored timestamps', () => {
  const ambiguousClock = new InMemoryProfileRepository(
    [],
    () => '01/02/2026',
  );
  assert.throws(
    () =>
      ambiguousClock.createProfile(createInput(20), {
        actor: editor,
        requestId: 'ambiguous-clock',
      }),
    (error) => assertCode(error, 'VALIDATION_FAILED'),
  );

  const invalidStoredProfile = makeProfile(21);
  invalidStoredProfile.updatedAt = '2026-02-29T12:00:00Z';
  assert.throws(
    () => new InMemoryProfileRepository([invalidStoredProfile], () => now),
    (error) => assertCode(error, 'VALIDATION_FAILED'),
  );

  const unknownOffsetClock = new InMemoryProfileRepository(
    [],
    () => '2026-08-27T12:00:00-00:00',
  );
  assert.throws(
    () =>
      unknownOffsetClock.createProfile(createInput(22), {
        actor: editor,
        requestId: 'unknown-offset-clock',
      }),
    (error) => assertCode(error, 'VALIDATION_FAILED'),
  );
});

test('optimistic revision rejects stale writes without changing data or audit', () => {
  const seed = makeProfile(4);
  seed.status = 'hidden';
  const repository = new InMemoryProfileRepository([seed], () => now);
  const changed = repository.updateProfile(
    seed.id,
    { biography: 'First committed edit.' },
    write(editor, 'edit-1', 1),
  );
  const auditCount = repository.listAuditEvents(admin).length;

  assert.equal(changed.revision, 2);
  assert.throws(
    () =>
      repository.updateProfile(
        seed.id,
        { biography: 'Stale edit.' },
        write(editor, 'edit-2', 1),
      ),
    (error) => assertCode(error, 'REVISION_CONFLICT'),
  );
  assert.equal(
    repository.getProfile(seed.id, editor).biography,
    'First committed edit.',
  );
  assert.equal(repository.listAuditEvents(admin).length, auditCount);
});

test('publishing requires admin plus fresh complete evidence and approval', () => {
  const draft = makeProfile(5);
  draft.status = 'draft';
  draft.approval = { state: 'pending' };
  draft.adultAgeConfirmed = false;
  draft.publicationConsentConfirmed = false;
  draft.rightsConfirmed = false;
  const referenceSnapshot = makeSnapshot();
  const repository = new InMemoryProfileRepository(
    [draft],
    () => now,
    {
      cities: referenceSnapshot.cities,
      services: referenceSnapshot.services,
    },
  );

  assert.throws(
    () =>
      repository.setStatus(
        draft.id,
        'published',
        write(editor, 'publish-editor', 1),
      ),
    (error) => assertCode(error, 'FORBIDDEN'),
  );
  const evidenced = repository.recordEvidence(
    draft.id,
    {
      adultAgeConfirmed: true,
      publicationConsentConfirmed: true,
      rightsConfirmed: true,
      sourceReference: 'test-only-evidence',
    },
    write(admin, 'evidence-1', 1),
  );
  const approved = repository.approveProfile(
    draft.id,
    'test-only-approval',
    write(admin, 'approval-1', evidenced.revision),
  );
  assert.equal(
    approved.verificationEvidenceReference,
    'test-only-evidence',
  );
  const published = repository.setStatus(
    draft.id,
    'published',
    write(admin, 'publish-admin', approved.revision),
  );

  assert.equal(published.status, 'published');
  assert.equal(published.revision, 4);
});

test('publication fails without canonical references or with non-boolean evidence', () => {
  const draft = makeProfile(10);
  draft.status = 'draft';
  const unguarded = new InMemoryProfileRepository([draft], () => now);

  assert.throws(
    () =>
      unguarded.setStatus(
        draft.id,
        'published',
        write(admin, 'publish-without-references', 1),
      ),
    (error) => assertCode(error, 'VALIDATION_FAILED'),
  );

  draft.approval = { state: 'pending' };
  draft.adultAgeConfirmed = false;
  draft.publicationConsentConfirmed = false;
  draft.rightsConfirmed = false;
  const guarded = new InMemoryProfileRepository([draft], () => now);
  assert.throws(
    () =>
      guarded.recordEvidence(
        draft.id,
        {
          adultAgeConfirmed: 'false' as never,
          publicationConsentConfirmed: 'false' as never,
          rightsConfirmed: 'false' as never,
          sourceReference: 'test-only-invalid-evidence',
        },
        write(admin, 'invalid-runtime-booleans', 1),
      ),
    (error) => assertCode(error, 'INVALID_INPUT'),
  );
  assert.equal(guarded.getProfile(draft.id, admin).revision, 1);
  assert.equal(guarded.listAuditEvents(admin).length, 0);
});

test('canonical publication validation rejects references and domain invariants atomically', () => {
  const unsafe = makeProfile(11);
  unsafe.status = 'draft';
  unsafe.measurements.heightCm = -1;
  unsafe.serviceIds = ['missing-service'];
  unsafe.media[0].order = 2;
  const referenceSnapshot = makeSnapshot();
  const repository = new InMemoryProfileRepository(
    [unsafe],
    () => now,
    {
      cities: referenceSnapshot.cities,
      services: referenceSnapshot.services,
    },
  );

  assert.throws(
    () =>
      repository.setStatus(
        unsafe.id,
        'published',
        write(admin, 'publish-invalid-aggregate', 1),
      ),
    (error) => assertCode(error, 'VALIDATION_FAILED'),
  );
  assert.equal(repository.getProfile(unsafe.id, admin).status, 'draft');
  assert.equal(repository.getProfile(unsafe.id, admin).revision, 1);
  assert.equal(repository.listAuditEvents(admin).length, 0);
});

test('duplicate removes personal evidence and does not share mutable structures', () => {
  const source = makeProfile(6);
  source.status = 'hidden';
  const repository = new InMemoryProfileRepository([source], () => now);
  const duplicate = repository.duplicateProfile(
    source.id,
    { id: 'profile-copy', slug: 'synthetic-profile-copy' },
    write(editor, 'duplicate-1', 1),
  );

  assert.equal(duplicate.age, null);
  assert.deepEqual(duplicate.measurements, {});
  assert.deepEqual(duplicate.media, []);
  assert.equal(duplicate.adultAgeConfirmed, false);
  duplicate.serviceIds.push('outside-mutation');
  assert.equal(
    repository
      .getProfile(duplicate.id, editor)
      .serviceIds.includes('outside-mutation'),
    false,
  );
  const event = repository.listAuditEvents(admin)[0];
  assert.equal(event.sourceEntityId, source.id);
  assert.equal(event.fromRevision, undefined);
});

test('archive is recoverable only by admin and restore renews approvals', () => {
  const source = makeProfile(7);
  const repository = new InMemoryProfileRepository([source], () => now);
  const archived = repository.setStatus(
    source.id,
    'archived',
    write(admin, 'archive-1', 1),
  );

  assert.equal(archived.availability, 'unavailable');
  assert.throws(
    () => repository.getProfile(source.id, editor),
    (error) => assertCode(error, 'NOT_FOUND'),
  );
  assert.throws(
    () =>
      repository.setStatus(
        source.id,
        'draft',
        write(editor, 'restore-editor', 2),
      ),
    (error) => assertCode(error, 'FORBIDDEN'),
  );

  const restored = repository.setStatus(
    source.id,
    'draft',
    write(admin, 'restore-admin', 2),
  );
  assert.equal(restored.status, 'draft');
  assert.equal(restored.approval.state, 'pending');
  assert.equal(restored.publicationConsentConfirmed, false);
  assert.equal(restored.verificationEvidenceReference, undefined);
  assert.equal('deleteProfile' in repository, false);
  const events = repository.listAuditEvents(admin);
  assert.deepEqual(events[0].changedFields, ['status', 'availability']);
  assert.equal(events[1].changedFields.includes('approval'), true);
});

test('hidden to draft is audited as return-to-draft rather than restore', () => {
  const source = makeProfile(12);
  source.status = 'hidden';
  const repository = new InMemoryProfileRepository([source], () => now);

  const draft = repository.setStatus(
    source.id,
    'draft',
    write(editor, 'return-to-draft-1', 1),
  );

  assert.equal(draft.status, 'draft');
  assert.equal(
    repository.listAuditEvents(admin)[0].action,
    'return-to-draft',
  );
});

test('media reorder requires an exact permutation and records one atomic revision', () => {
  const source = makeProfile(8);
  source.status = 'hidden';
  source.media.push({
    ...source.media[0],
    id: 'media-extra',
    order: 1,
  });
  const repository = new InMemoryProfileRepository([source], () => now);

  assert.throws(
    () =>
      repository.reorderMedia(
        source.id,
        [source.media[0].id],
        write(editor, 'bad-order', 1),
      ),
    (error) => assertCode(error, 'INVALID_INPUT'),
  );
  assert.equal(repository.listAuditEvents(admin).length, 0);

  const reordered = repository.reorderMedia(
    source.id,
    ['media-extra', source.media[0].id],
    write(editor, 'good-order', 1),
  );
  assert.deepEqual(
    reordered.media.map((media) => [media.id, media.order]),
    [
      ['media-extra', 0],
      [source.media[0].id, 1],
    ],
  );
  assert.equal(
    repository.listAuditEvents(admin)[0].action,
    'reorder-media',
  );
});
