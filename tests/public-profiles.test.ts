import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPublicProfileDetail,
  queryPublicProfiles,
} from '../lib/content/public-profiles.ts';
import { parsePublicProfileSearchParams } from '../lib/content/public-query-params.ts';
import { makeSnapshot } from './helpers.ts';

test('public profile queries fail closed while the aggregate release is blocked', () => {
  const snapshot = makeSnapshot();
  snapshot.settings.publicationEnabled = false;

  assert.deepEqual(queryPublicProfiles(snapshot), {
    ok: false,
    reason: 'RELEASE_NOT_READY',
    items: [],
    total: 0,
    page: 1,
    pageSize: 24,
  });
  assert.equal(
    getPublicProfileDetail(snapshot, snapshot.profiles[0].slug),
    undefined,
  );
});

test('public queries filter and paginate an unbounded profile collection', () => {
  const snapshot = makeSnapshot(9);
  const selected = snapshot.profiles[0];
  selected.availability = 'available';
  selected.age = 31;

  const filtered = queryPublicProfiles(snapshot, {
    city: selected.citySlugs[0],
    availability: 'available',
    minAge: 30,
    maxAge: 35,
    serviceSlug: snapshot.services[0].slug,
    page: 1,
    pageSize: 1,
  });

  assert.equal(filtered.ok, true);
  if (!filtered.ok) return;
  assert.equal(filtered.total, 1);
  assert.equal(filtered.items[0].slug, selected.slug);
  assert.equal(filtered.items[0].cover.order, 0);
});

test('invalid runtime filters return no data', () => {
  const snapshot = makeSnapshot();

  const result = queryPublicProfiles(snapshot, {
    city: 'unknown',
    minAge: 17,
    pageSize: 500,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'INVALID_QUERY');
  assert.deepEqual(result.items, []);
});

test('URL search parameters parse only one canonical value per supported key', () => {
  const result = parsePublicProfileSearchParams(
    new URLSearchParams(
      'city=madrid&availability=available&minAge=21&maxAge=35&service=hotel&page=2&pageSize=12',
    ),
  );

  assert.deepEqual(result, {
    ok: true,
    query: {
      city: 'madrid',
      availability: 'available',
      minAge: 21,
      maxAge: 35,
      serviceSlug: 'hotel',
      page: 2,
      pageSize: 12,
    },
  });
});

test('browser GET forms may submit unused filters as empty values', () => {
  const result = parsePublicProfileSearchParams(
    new URLSearchParams(
      'city=madrid&availability=&minAge=&maxAge=&service=&page=&pageSize=',
    ),
  );

  assert.deepEqual(result, {
    ok: true,
    query: { city: 'madrid' },
  });
});

test('URL search parameters reject duplicates, unknown keys and ambiguous integers', () => {
  const rejected = [
    'city=madrid&city=barcelona',
    'utm_source=test',
    'city=unknown',
    'availability=secret',
    'minAge=17',
    'minAge=35&maxAge=21',
    'pageSize=51',
    'service=..%2Finternal',
    'page=01',
    'page=1.5',
    'page=9007199254740992',
  ];

  for (const query of rejected) {
    assert.deepEqual(
      parsePublicProfileSearchParams(new URLSearchParams(query)),
      { ok: false, reason: 'INVALID_QUERY' },
    );
  }
});

test('runtime numeric filters reject unsafe integers', () => {
  const snapshot = makeSnapshot();
  const result = queryPublicProfiles(snapshot, {
    page: Number.MAX_SAFE_INTEGER + 1,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, 'INVALID_QUERY');
});

test('hidden records stay private without blocking an otherwise complete release', () => {
  const snapshot = makeSnapshot(9);
  const hidden = snapshot.profiles[0];
  hidden.status = 'hidden';

  const result = queryPublicProfiles(snapshot);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.total, 8);
  assert.equal(
    result.items.some((profile) => profile.slug === hidden.slug),
    false,
  );
});

test('public detail omits internal IDs, approvals, evidence and rights metadata', () => {
  const snapshot = makeSnapshot();
  const source = snapshot.profiles[0];
  const detail = getPublicProfileDetail(snapshot, source.slug);

  assert.notEqual(detail, undefined);
  if (!detail) return;
  const serialized = JSON.stringify(detail);
  assert.equal('id' in detail, false);
  assert.equal(serialized.includes('approvedBy'), false);
  assert.equal(serialized.includes('verificationEvidenceReference'), false);
  assert.equal(serialized.includes('rightsEvidence'), false);
  assert.equal(detail.services[0].slug, snapshot.services[0].slug);
});
