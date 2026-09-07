import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { SUPPORTED_LOCALES } from '../lib/i18n/locales.ts';
import { buildSyntheticBetaMetadata } from '../lib/preview/synthetic-beta-metadata.ts';
import { getSyntheticPreviewProfiles } from '../lib/preview/synthetic-preview.ts';

test('public synthetic beta owns clean localized routes while local preview keeps its guarded namespace', () => {
  assert.deepEqual(SUPPORTED_LOCALES, ['es', 'en', 'fr', 'it']);
  const source = readFileSync('lib/preview/synthetic-experience.ts', 'utf8');

  for (const helper of [
    'syntheticExperienceHome',
    'syntheticExperienceProfiles',
    'syntheticExperienceProfile',
    'syntheticExperienceServices',
    'syntheticExperienceService',
  ]) {
    assert.match(source, new RegExp(`export function ${helper}\\(`, 'u'));
  }
  assert.equal((source.match(/mode === 'public-beta'/gu) ?? []).length, 5);
  assert.match(source, /localizedPath\(locale\)/u);
  assert.match(source, /localizedPath\(locale, '\/perfiles'\)/u);
  assert.match(source, /localizedPath\(locale, `\/perfiles\/\$\{slug\}`\)/u);
  assert.match(source, /localizedPath\(locale, '\/servicios'\)/u);
  assert.match(source, /localizedPath\(locale, `\/servicios\/\$\{slug\}`\)/u);
  assert.match(source, /`\/preview-local-sintetico\?lang=\$\{locale\}`/u);
  assert.match(source, /`\/preview-local-sintetico\/perfiles\/\$\{slug\}\?lang=\$\{locale\}`/u);
  assert.match(source, /`\/preview-local-sintetico\/servicios\/\$\{slug\}\?lang=\$\{locale\}`/u);
});

test('public beta profiles change only delivery URLs, not selected source assets', () => {
  const localProfiles = getSyntheticPreviewProfiles('local-preview');
  const betaProfiles = getSyntheticPreviewProfiles('public-beta');

  assert.equal(betaProfiles.length, 6);
  assert.deepEqual(
    betaProfiles.map((profile) => profile.slug),
    localProfiles.map((profile) => profile.slug),
  );

  for (let profileIndex = 0; profileIndex < betaProfiles.length; profileIndex += 1) {
    const localProfile = localProfiles[profileIndex]!;
    const betaProfile = betaProfiles[profileIndex]!;
    assert.equal(betaProfile.media.length, localProfile.media.length);
    for (let mediaIndex = 0; mediaIndex < betaProfile.media.length; mediaIndex += 1) {
      const localMedia = localProfile.media[mediaIndex]!;
      const betaMedia = betaProfile.media[mediaIndex]!;
      assert.equal(betaMedia.sourcePath, localMedia.sourcePath);
      assert.match(localMedia.desktopUrl, /^\/preview-local-sintetico\/media\//u);
      assert.match(betaMedia.desktopUrl, /^\/beta-media\/profiles\//u);
    }
  }
});

test('public beta metadata is explicitly non-indexable and has no canonical promotion', () => {
  const metadata = buildSyntheticBetaMetadata({
    locale: 'es',
    title: 'Beta',
    description: 'Experiencia sintética',
  });

  assert.deepEqual(metadata.robots, {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  });
  assert.equal(metadata.alternates, undefined);
});

test('public wrappers opt in explicitly and shared preview renderers remain guarded by default', () => {
  const publicWrappers = [
    'app/[locale]/page.tsx',
    'app/[locale]/perfiles/page.tsx',
    'app/[locale]/perfiles/[slug]/page.tsx',
    'app/[locale]/servicios/page.tsx',
    'app/[locale]/servicios/[slug]/page.tsx',
  ];
  for (const path of publicWrappers) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /buildSyntheticBetaMetadata/u);
    assert.match(source, /mode: 'public-beta'/u);
    assert.doesNotMatch(
      source,
      /getRuntimeVisibilityState|ReleaseHoldingPage|ContactOptions|mailto:|tel:|wa\.me|t\.me/u,
    );
  }

  const sharedRenderers = [
    'app/(legacy)/preview-local-sintetico/page.tsx',
    'app/(legacy)/preview-local-sintetico/perfiles/[slug]/page.tsx',
    'app/(legacy)/preview-local-sintetico/servicios/page.tsx',
    'app/(legacy)/preview-local-sintetico/servicios/[slug]/page.tsx',
  ];
  for (const path of sharedRenderers) {
    const source = readFileSync(path, 'utf8');
    assert.match(source, /mode = 'local-preview'/u);
    assert.match(source, /if \(mode === 'local-preview'\)/u);
    assert.match(source, /isSyntheticPreviewRequestAllowed/u);
    assert.match(source, /notFound\(\)/u);
  }
});
