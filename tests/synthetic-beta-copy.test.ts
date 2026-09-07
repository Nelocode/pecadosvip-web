import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getSyntheticBetaCopy,
  SYNTHETIC_BETA_PROFILE_SLUGS,
  type SyntheticBetaCopy,
} from '../lib/preview/synthetic-beta-copy.ts';
import { SUPPORTED_LOCALES, type Locale } from '../lib/i18n/locales.ts';

type StringLeaf = Readonly<{ path: string; value: string }>;

function flattenStrings(value: unknown, prefix = ''): StringLeaf[] {
  if (typeof value === 'string') return [{ path: prefix, value }];
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      flattenStrings(entry, `${prefix}[${index}]`),
    );
  }
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, entry]) =>
      flattenStrings(entry, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [];
}

function placeholders(value: string): string[] {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9]*)\}/gu)]
    .map((match) => match[1])
    .sort();
}

function byPath(copy: SyntheticBetaCopy): Map<string, string> {
  return new Map(flattenStrings(copy).map((leaf) => [leaf.path, leaf.value]));
}

test('synthetic beta copy is complete for exactly ES, EN, FR and IT', () => {
  assert.deepEqual(SUPPORTED_LOCALES, ['es', 'en', 'fr', 'it']);

  for (const locale of SUPPORTED_LOCALES) {
    const localized = getSyntheticBetaCopy(locale);
    assert.equal(localized.locale, locale);
    assert.equal(localized.brand.name, 'PecadosVip');
    assert.equal(localized.trustSignals.length, 4);
    assert.equal(localized.homeServices.length, 6);
    assert.equal(localized.security.items.length, 4);
    assert.deepEqual(
      Object.keys(localized.profiles),
      [...SYNTHETIC_BETA_PROFILE_SLUGS],
    );
    assert.deepEqual(
      Object.keys(localized.filters.availability).sort(),
      ['available', 'limited', 'on-request', 'unavailable'],
    );
    assert.deepEqual(
      Object.keys(localized.profile.availability).sort(),
      ['available', 'limited', 'on-request', 'unavailable'],
    );

    const leaves = flattenStrings(localized);
    assert.ok(leaves.length > 160, `${locale} copy is unexpectedly small`);
    assert.equal(
      leaves.every((leaf) => leaf.value.trim().length > 0),
      true,
      `${locale} contains an empty copy leaf`,
    );
  }
});

test('all locale projections preserve structure and placeholder contracts', () => {
  const source = byPath(getSyntheticBetaCopy('es'));

  for (const locale of SUPPORTED_LOCALES) {
    const target = byPath(getSyntheticBetaCopy(locale));
    assert.deepEqual([...target.keys()], [...source.keys()]);

    for (const [path, sourceValue] of source) {
      assert.deepEqual(
        placeholders(target.get(path) ?? ''),
        placeholders(sourceValue),
        `${locale}:${path} has different placeholders`,
      );
    }
  }
});

test('visible high-risk surfaces do not silently reuse Spanish copy', () => {
  const source = getSyntheticBetaCopy('es');
  const paths: Array<(copy: SyntheticBetaCopy) => string> = [
    (copy) => copy.metadata.homeDescription,
    (copy) => copy.hero.titlePrimary,
    (copy) => copy.navigation.privateBookingAria,
    (copy) => copy.coverage.body,
    (copy) => copy.filters.invalidBody,
    (copy) => copy.profilesSection.note,
    (copy) => copy.servicesSection.conversionBody,
    (copy) => copy.security.items[0]!,
    (copy) => copy.profile.contactDisabledBody,
    (copy) => copy.profile.publicationValue,
    (copy) => copy.profiles.valeria.biography,
  ];

  for (const locale of ['en', 'fr', 'it'] as const satisfies readonly Locale[]) {
    const target = getSyntheticBetaCopy(locale);
    for (const read of paths) {
      assert.notEqual(read(target), read(source), `${locale} leaks Spanish copy`);
    }
  }
});

test('service and trust identifiers stay stable across translations', () => {
  const source = getSyntheticBetaCopy('es');
  for (const locale of SUPPORTED_LOCALES) {
    const localized = getSyntheticBetaCopy(locale);
    assert.deepEqual(
      localized.trustSignals.map(({ code }) => code),
      source.trustSignals.map(({ code }) => code),
    );
    assert.deepEqual(
      localized.homeServices.map(({ number, category }) => ({ number, category })),
      source.homeServices.map(({ number, category }) => ({ number, category })),
    );
  }
});

test('every locale keeps beta, synthetic-identity and disabled-conversion disclosures', () => {
  for (const locale of SUPPORTED_LOCALES) {
    const localized = getSyntheticBetaCopy(locale);
    assert.match(localized.navigation.betaStatus, /\S/u);
    assert.match(localized.hero.generatedImageDisclosure, /IA|AI/u);
    assert.match(localized.profile.syntheticNotice, /IA|AI/u);
    assert.match(localized.servicesSection.contactDisabled, /\S/u);
    assert.match(localized.footer.reviewStatus, /\S/u);
  }
});
