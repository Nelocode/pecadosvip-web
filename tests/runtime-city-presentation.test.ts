import assert from 'node:assert/strict';
import test from 'node:test';

import { cities, CITY_SLUGS } from '../app/city-data.ts';
import {
  resolveCityPresentationFromSnapshot,
} from '../app/runtime-city-presentation.ts';
import { makeSnapshot } from './helpers.ts';

test('all seven city landings project only their effective approved snapshot entity', () => {
  const snapshot = makeSnapshot();

  for (const slug of CITY_SLUGS) {
    const approved = snapshot.cities.find((city) => city.slug === slug);
    assert.ok(approved);

    const presentation = resolveCityPresentationFromSnapshot(
      snapshot,
      'es',
      slug,
      cities[slug],
    );

    assert.equal(presentation.releaseReady, true);
    assert.equal(presentation.renderPublicExperience, true);
    assert.equal(presentation.routeIndexable, true);
    assert.equal(presentation.approvedCity?.slug, slug);
    assert.equal(presentation.content.city, approved.name);
    assert.equal(presentation.content.headline, approved.headline);
    assert.deepEqual(
      presentation.content.introBody,
      [approved.introduction],
    );
    assert.deepEqual(presentation.content.faqs, approved.faqs);
    assert.deepEqual(
      [
        ...presentation.content.highlights.map((area) => area.name),
        ...presentation.content.locations,
      ],
      approved.coverageAreas.map((area) => area.name),
    );
  }
});

test('blocked snapshots retain the draft shell only behind the holding boundary', () => {
  const snapshot = makeSnapshot();
  snapshot.settings.publicationEnabled = false;
  const shell = cities.madrid;

  const presentation = resolveCityPresentationFromSnapshot(
    snapshot,
    'es',
    'madrid',
    shell,
  );

  assert.equal(presentation.releaseReady, false);
  assert.equal(presentation.renderPublicExperience, false);
  assert.equal(presentation.routeIndexable, false);
  assert.equal(presentation.approvedCity, undefined);
  assert.equal(presentation.content, shell);
});
