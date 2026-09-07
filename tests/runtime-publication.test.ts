import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  evaluateRuntimeContact,
  evaluateRuntimeVisibility,
  getRuntimePublicationState,
  getRuntimeSitemapRoutes,
  isRuntimeRouteIndexable,
} from '../lib/content/runtime-publication.ts';
import { resolveContactConfig } from '../lib/contact-config.ts';
import { getRuntimeContentSnapshot } from '../lib/content/runtime-snapshot.ts';
import { validateContentSnapshot } from '../lib/content/validation.ts';
import { makeSnapshot } from './helpers.ts';

test('runtime snapshot contains only unapproved draft cities and no profiles or services', () => {
  const snapshot = getRuntimeContentSnapshot();

  assert.deepEqual(
    snapshot.cities.map((city) => city.slug).sort(),
    [
      'barcelona',
      'girona',
      'guadalajara',
      'madrid',
      'segovia',
      'tarragona',
      'toledo',
    ],
  );
  assert.equal(snapshot.cities.every((city) => city.status === 'draft'), true);
  assert.equal(snapshot.cities.every((city) => city.approval.state === 'pending'), true);
  assert.equal(snapshot.cities.every((city) => city.serviceConfirmed === false), true);
  assert.deepEqual(snapshot.profiles, []);
  assert.deepEqual(snapshot.services, []);
  assert.equal(snapshot.settings.publicationEnabled, false);
  assert.equal(snapshot.settings.analyticsConsentConfigured, false);
  assert.equal(snapshot.settings.legal.legalNotice.body, '');
  assert.equal(snapshot.settings.legal.privacy.body, '');
  assert.equal(snapshot.settings.legal.cookies.body, '');
  assert.equal(snapshot.settings.legal.serviceTerms.body, '');
  assert.deepEqual(validateContentSnapshot(snapshot, 'draft'), []);
});

test('runtime publication, route indexability and sitemap fail closed', () => {
  const state = getRuntimePublicationState();

  assert.equal(state.activation.status, 'default-draft');
  assert.equal(state.activation.reasonCode, 'DEFAULT_DRAFT');
  assert.equal(state.release.ok, false);
  assert.equal(state.release.blockerCodes.includes('PUBLICATION_DISABLED'), true);
  assert.equal(state.release.blockerCodes.includes('LEGAL_CONTENT_MISSING'), true);
  assert.equal(state.release.blockerCodes.includes('INITIAL_PROFILE_LOAD_INCOMPLETE'), true);
  assert.equal(state.manifest.length, 16);
  assert.equal(state.manifest.every((route) => route.indexable === false), true);
  assert.deepEqual(
    state.manifest.filter((route) => route.kind === 'home').map((route) => route.path),
    ['/es', '/en', '/fr', '/it'],
  );
  assert.equal(isRuntimeRouteIndexable('/'), false);
  assert.equal(isRuntimeRouteIndexable('/es/madrid'), false);
  assert.equal(isRuntimeRouteIndexable('/es/servicios'), false);
  assert.deepEqual(getRuntimeSitemapRoutes(), []);
});

test('blocked release suppresses approved contact destinations', () => {
  const approvedConfig = resolveContactConfig({
    NEXT_PUBLIC_CONTACT_APPROVED: 'true',
    NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED: 'true',
    NEXT_PUBLIC_WHATSAPP_URL: 'https://wa.me/34123456789',
  });
  const blocked = evaluateRuntimeContact(
    getRuntimeContentSnapshot(),
    approvedConfig,
  );

  assert.equal(approvedConfig.enabled, true);
  assert.equal(blocked.releaseGateSatisfied, false);
  assert.equal(blocked.configurationGateSatisfied, false);
  assert.equal(blocked.enabled, false);
  assert.deepEqual(blocked.contact, {});
});

test('approved destinations remain available only when config exactly matches the released snapshot', () => {
  const snapshot = makeSnapshot();
  const approvedConfig = resolveContactConfig({
    NEXT_PUBLIC_CONTACT_APPROVED: 'true',
    NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED: 'true',
    NEXT_PUBLIC_TELEGRAM_URL: 'https://t.me/synthetic_test_only',
  });
  const ready = evaluateRuntimeContact(snapshot, approvedConfig);

  assert.equal(ready.releaseGateSatisfied, true);
  assert.equal(ready.configurationGateSatisfied, true);
  assert.equal(ready.enabled, true);
  assert.deepEqual(ready.contact, snapshot.settings.contact);
  assert.notEqual(ready.contact, snapshot.settings.contact);
});

test('runtime contact fails closed when environment adds, removes or changes an approved destination', () => {
  const snapshot = makeSnapshot();
  const mismatches = [
    resolveContactConfig({
      NEXT_PUBLIC_CONTACT_APPROVED: 'true',
      NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED: 'true',
      NEXT_PUBLIC_WHATSAPP_URL: 'https://wa.me/34123456789',
    }),
    resolveContactConfig({
      NEXT_PUBLIC_CONTACT_APPROVED: 'true',
      NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED: 'true',
      NEXT_PUBLIC_TELEGRAM_URL: 'https://t.me/different_approved_name',
    }),
    resolveContactConfig({
      NEXT_PUBLIC_CONTACT_APPROVED: 'true',
      NEXT_PUBLIC_PRIVACY_NOTICE_APPROVED: 'true',
      NEXT_PUBLIC_TELEGRAM_URL: 'https://t.me/synthetic_test_only',
      NEXT_PUBLIC_EMAIL_URL: 'mailto:extra@example.org',
    }),
  ];

  for (const config of mismatches) {
    const state = evaluateRuntimeContact(snapshot, config);
    assert.equal(state.releaseGateSatisfied, true);
    assert.equal(state.configurationGateSatisfied, false);
    assert.equal(state.enabled, false);
    assert.deepEqual(state.contact, {});
  }
});

test('blocked release renders only the holding state in production', () => {
  const snapshot = getRuntimeContentSnapshot();
  const state = evaluateRuntimeVisibility(snapshot);

  assert.equal(state.releaseReady, false);
  assert.equal(state.renderPublicExperience, false);
});

test('blocked release cannot be bypassed by process environment flags', () => {
  const previous = process.env.PECADOSVIP_ENABLE_DRAFT_PREVIEW;
  process.env.PECADOSVIP_ENABLE_DRAFT_PREVIEW = 'true';
  try {
    const state = evaluateRuntimeVisibility(getRuntimeContentSnapshot());
    assert.equal(state.releaseReady, false);
    assert.equal(state.renderPublicExperience, false);
  } finally {
    if (previous === undefined) {
      delete process.env.PECADOSVIP_ENABLE_DRAFT_PREVIEW;
    } else {
      process.env.PECADOSVIP_ENABLE_DRAFT_PREVIEW = previous;
    }
  }
});

test('complete release renders the public experience in production', () => {
  const state = evaluateRuntimeVisibility(makeSnapshot());

  assert.equal(state.releaseReady, true);
  assert.equal(state.renderPublicExperience, true);
});

test('approved-content routes retain runtime visibility gates while synthetic beta routes use an isolated noindex boundary', () => {
  const gatedRoutes = [
    '../app/(legacy)/madrid/page.tsx',
    '../app/(legacy)/barcelona/page.tsx',
    '../app/(legacy)/perfiles/page.tsx',
    '../app/(legacy)/perfiles/[slug]/page.tsx',
    '../app/(legacy)/servicios/page.tsx',
    '../app/(legacy)/servicios/[slug]/page.tsx',
    '../app/(legacy)/contacto/page.tsx',
    '../app/[locale]/madrid/page.tsx',
    '../app/[locale]/barcelona/page.tsx',
    '../app/[locale]/girona/page.tsx',
    '../app/[locale]/tarragona/page.tsx',
    '../app/[locale]/toledo/page.tsx',
    '../app/[locale]/guadalajara/page.tsx',
    '../app/[locale]/segovia/page.tsx',
    '../app/[locale]/contacto/page.tsx',
    '../app/[locale]/legal/[document]/page.tsx',
  ];

  for (const route of gatedRoutes) {
    const source = readFileSync(new URL(route, import.meta.url), 'utf8');
    if (
      route.endsWith('/madrid/page.tsx') ||
      route.endsWith('/barcelona/page.tsx')
    ) {
      assert.match(source, /<CityLanding/);
    } else if (
      /\/(girona|tarragona|toledo|guadalajara|segovia)\/page\.tsx$/u.test(
        route,
      )
    ) {
      assert.match(source, /renderSupplementalCityRoute/);
    } else {
      assert.match(source, /getRuntimeVisibilityState/);
      assert.match(source, /<ReleaseHoldingPage/);
    }
  }

  const sharedCitySource = readFileSync(
    new URL('../app/components/CityLanding.tsx', import.meta.url),
    'utf8',
  );
  assert.match(sharedCitySource, /getRuntimeVisibilityState/);
  assert.match(sharedCitySource, /<ReleaseHoldingPage/);

  const supplementalCitySource = readFileSync(
    new URL('../app/supplemental-city-route.tsx', import.meta.url),
    'utf8',
  );
  assert.match(supplementalCitySource, /<CityLanding/);
  assert.match(supplementalCitySource, /getRuntimeCityPresentation/);
  assert.match(supplementalCitySource, /presentation\.routeIndexable/);

  const legacyLegal = readFileSync(
    new URL('../app/(legacy)/legal/[document]/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(legacyLegal, /getPublicLegalDocument\([\s\S]*?getRuntimeContentSnapshot\(\)/);
  assert.match(legacyLegal, /if \(!publicDocument\) \{[\s\S]*?notFound\(\)/);

  const legacyRoot = readFileSync(
    new URL('../app/(legacy)/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(legacyRoot, /redirect\('\/es'\)/);
  assert.doesNotMatch(legacyRoot, /getRuntimeVisibilityState|ReleaseHoldingPage/);

  for (const route of [
    '../app/[locale]/page.tsx',
    '../app/[locale]/perfiles/page.tsx',
    '../app/[locale]/perfiles/[slug]/page.tsx',
    '../app/[locale]/servicios/page.tsx',
    '../app/[locale]/servicios/[slug]/page.tsx',
  ]) {
    const source = readFileSync(new URL(route, import.meta.url), 'utf8');
    assert.match(source, /buildSyntheticBetaMetadata/);
    assert.match(source, /mode: 'public-beta'/);
    assert.doesNotMatch(source, /getRuntimeVisibilityState|ReleaseHoldingPage/);
  }

  const betaMetadata = readFileSync(
    new URL('../lib/preview/synthetic-beta-metadata.ts', import.meta.url),
    'utf8',
  );
  assert.match(betaMetadata, /robots:\s*\{[\s\S]*?index:\s*false[\s\S]*?follow:\s*false/);
  assert.doesNotMatch(betaMetadata, /alternates:|canonical:/);
});

test('callers receive isolated runtime snapshots', () => {
  const first = getRuntimeContentSnapshot();
  first.cities[0].headline = 'outside mutation';
  first.settings.legal.privacy.body = 'outside mutation';

  const second = getRuntimeContentSnapshot();
  assert.notEqual(second.cities[0].headline, 'outside mutation');
  assert.equal(second.settings.legal.privacy.body, '');
});
