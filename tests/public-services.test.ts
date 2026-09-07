import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getPublicProfilesForService,
  getPublicService,
  getPublicServices,
} from '../lib/content/public-services.ts';
import {
  buildLocalizedRouteManifest,
  buildRouteManifest,
  hasServiceCandidateRoute,
} from '../lib/content/route-manifest.ts';
import { makeSnapshot } from './helpers.ts';

test('approved services used by public profiles receive hub and detail routes', () => {
  const snapshot = makeSnapshot();
  const services = getPublicServices(snapshot);
  const slug = snapshot.services[0].slug;

  assert.equal(services.length, 1);
  assert.equal(services[0]?.slug, slug);
  assert.equal(services[0]?.profileCount, snapshot.profiles.length);
  assert.equal(getPublicService(snapshot, slug)?.name, snapshot.services[0].name);
  assert.equal(getPublicService(snapshot, '../invalid'), undefined);
  assert.equal(hasServiceCandidateRoute(snapshot, slug), true);

  const routes = buildRouteManifest(snapshot);
  assert.equal(routes.some((route) => route.kind === 'services' && route.path === '/servicios'), true);
  assert.equal(routes.some((route) => route.kind === 'service' && route.path === `/servicios/${slug}`), true);
});

test('service routes fail closed when content, approval or profile linkage is missing', () => {
  const snapshot = makeSnapshot();
  const slug = snapshot.services[0].slug;
  snapshot.services[0].approval = { state: 'pending' };

  assert.deepEqual(getPublicServices(snapshot), []);
  assert.equal(hasServiceCandidateRoute(snapshot, slug), false);

  const orphan = makeSnapshot();
  orphan.profiles.forEach((profile) => {
    profile.serviceIds = [];
  });
  assert.equal(hasServiceCandidateRoute(orphan, orphan.services[0].slug), false);
});

test('dynamic service content remains non-indexable outside the approved source locale', () => {
  const manifest = buildLocalizedRouteManifest(makeSnapshot()).filter(
    (route) => route.kind === 'services' || route.kind === 'service',
  );
  assert.ok(manifest.length > 0);
  assert.equal(
    manifest.every((route) =>
      route.locale === 'es' ? route.indexable : !route.indexable,
    ),
    true,
  );
});

test('service detail returns every linked public profile across bounded query pages', () => {
  const snapshot = makeSnapshot(53);
  const slug = snapshot.services[0].slug;

  const profiles = getPublicProfilesForService(snapshot, slug);

  assert.equal(profiles?.length, 53);
  assert.equal(new Set(profiles?.map((profile) => profile.slug)).size, 53);
  assert.equal(getPublicProfilesForService(snapshot, 'missing-service'), undefined);
});
