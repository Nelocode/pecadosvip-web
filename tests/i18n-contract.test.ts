import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  formatPluralMessage,
  getCatalog,
  getCatalogForParam,
  interpolate,
  validateCatalogs,
} from '../lib/i18n/catalog.ts';
import {
  isSupportedLocale,
  localizedAlternates,
  localizedPath,
  requireLocale,
  splitLocalizedPath,
  SUPPORTED_LOCALES,
  switchLocalePath,
} from '../lib/i18n/locales.ts';
import { NOT_FOUND_MESSAGES } from '../lib/i18n/not-found-messages.ts';
import {
  buildLocalizedRouteManifest,
  hasProfileCandidateRoute,
} from '../lib/content/route-manifest.ts';
import {
  cities,
  CITY_SLUGS,
  getSupplementalCityContent,
  getSupplementalCityMetadata,
  isCitySlug,
  isSupplementalCitySlug,
  SUPPLEMENTAL_CITY_SLUGS,
} from '../app/city-data.ts';
import { buildLocalizedPublicMetadata } from '../lib/seo.ts';
import { getRuntimeContentSnapshot } from '../lib/content/runtime-snapshot.ts';
import { makeSnapshot } from './helpers.ts';

test('locale contract uses only the four requested base locales and rejects all others', () => {
  assert.deepEqual(SUPPORTED_LOCALES, ['es', 'en', 'fr', 'it']);
  assert.equal(isSupportedLocale('es'), true);
  assert.equal(isSupportedLocale('es-ES'), false);
  assert.equal(isSupportedLocale('de'), false);
  assert.throws(() => requireLocale('ES'), /Unsupported locale/);
  assert.throws(() => getCatalogForParam('pt'), /Unsupported locale/);
});

test('locale paths are uniform, equivalent and never fall back silently', () => {
  assert.equal(localizedPath('es'), '/es');
  assert.equal(localizedPath('fr', '/perfiles/demo'), '/fr/perfiles/demo');
  assert.deepEqual(splitLocalizedPath('/it/contacto'), {
    locale: 'it',
    semanticPath: '/contacto',
  });
  assert.equal(switchLocalePath('/it/contacto', 'en'), '/en/contacto');
  assert.equal(splitLocalizedPath('/contacto'), null);
  assert.throws(() => localizedPath('es', '//evil.example' as '/'), /Unsafe semantic path/);
  assert.deepEqual(localizedAlternates('/madrid'), {
    es: '/es/madrid',
    en: '/en/madrid',
    fr: '/fr/madrid',
    it: '/it/madrid',
  });
});

test('all catalog leaves, placeholders and encodings match the source shape', () => {
  assert.deepEqual(validateCatalogs(), []);
  for (const locale of SUPPORTED_LOCALES) {
    const catalog = getCatalog(locale);
    assert.ok(catalog.layout.skipLink.trim());
    assert.equal(catalog.languageSelector.options.es, 'Español');
    assert.equal(catalog.languageSelector.options.en, 'English');
    assert.equal(catalog.languageSelector.options.fr, 'Français');
    assert.equal(catalog.languageSelector.options.it, 'Italiano');
  }
});

test('interpolation and CLDR plural selection are deterministic for every locale', () => {
  assert.equal(interpolate('Hello {name}', { name: 'Ada' }), 'Hello Ada');
  assert.throws(() => interpolate('Hello {name}', {}), /Missing interpolation value/);
  for (const locale of SUPPORTED_LOCALES) {
    const template = getCatalog(locale).profiles.results.count;
    const one = formatPluralMessage(template, 'count', 1, locale);
    const many = formatPluralMessage(template, 'count', 2, locale);
    assert.match(one, /1/u);
    assert.match(many, /2/u);
    assert.notEqual(one, many);
  }
});

test('runtime manifest expands every fail-closed semantic route into four locales', () => {
  const manifest = buildLocalizedRouteManifest(getRuntimeContentSnapshot());
  assert.equal(manifest.length, 16);
  assert.equal(manifest.every((route) => route.indexable === false), true);
  assert.deepEqual(
    manifest.filter((route) => route.semanticPath === '/').map((route) => route.path),
    ['/es', '/en', '/fr', '/it'],
  );
});

test('localized manifest never indexes untranslated dynamic profile or legal bodies', () => {
  const manifest = buildLocalizedRouteManifest(makeSnapshot());
  const dynamicRoutes = manifest.filter(
    (route) =>
      route.kind === 'profiles' ||
      route.kind === 'profile' ||
      route.kind === 'services' ||
      route.kind === 'service' ||
      route.kind === 'legal',
  );
  assert.ok(dynamicRoutes.length > 0);
  assert.equal(
    dynamicRoutes.every((route) =>
      route.locale === 'es' ? route.indexable : !route.indexable,
    ),
    true,
  );
});

test('localized profile routes distinguish approved candidates from unknown slugs', () => {
  const snapshot = makeSnapshot();
  const approvedSlug = snapshot.profiles[0].slug;

  assert.equal(hasProfileCandidateRoute(snapshot, approvedSlug), true);
  assert.equal(hasProfileCandidateRoute(snapshot, 'perfil-inexistente'), false);

  snapshot.profiles[0].status = 'draft';
  assert.equal(hasProfileCandidateRoute(snapshot, approvedSlug), false);
});

test('localized metadata emits reciprocal base-code hreflang only behind release gates', () => {
  const config = {
    origin: 'https://www.pecadosvip.com',
    indexingEnabled: true,
    structuredDataEnabled: true,
  };
  const published = buildLocalizedPublicMetadata(
    {
      locale: 'fr',
      semanticPath: '/madrid',
      title: 'Madrid',
      description: 'Madrid',
    },
    config,
    true,
  );
  assert.deepEqual(published.alternates, {
    canonical: 'https://www.pecadosvip.com/fr/madrid',
    languages: {
      es: 'https://www.pecadosvip.com/es/madrid',
      en: 'https://www.pecadosvip.com/en/madrid',
      fr: 'https://www.pecadosvip.com/fr/madrid',
      it: 'https://www.pecadosvip.com/it/madrid',
      'x-default': 'https://www.pecadosvip.com/es/madrid',
    },
  });
  assert.equal(published.openGraph && 'locale' in published.openGraph
    ? published.openGraph.locale
    : undefined, 'fr');

  const blocked = buildLocalizedPublicMetadata(
    {
      locale: 'it',
      semanticPath: '/madrid',
      title: 'Madrid',
      description: 'Madrid',
    },
    config,
    false,
  );
  assert.equal(blocked.alternates, undefined);
  assert.deepEqual(blocked.robots, { index: false, follow: false });
  assert.equal(blocked.title, 'Sito in preparazione');

  const sourceOnly = buildLocalizedPublicMetadata(
    {
      locale: 'es',
      semanticPath: '/perfiles/demo',
      title: 'Demo',
      description: 'Demo',
      languageAlternates: false,
    },
    config,
    true,
  );
  assert.deepEqual(sourceOnly.alternates, {
    canonical: 'https://www.pecadosvip.com/es/perfiles/demo',
  });
});

test('localized root controls html lang and selector endonyms while legacy stays noindex', () => {
  const layout = readFileSync(new URL('../app/[locale]/layout.tsx', import.meta.url), 'utf8');
  const selector = readFileSync(new URL('../app/components/LanguageSelector.tsx', import.meta.url), 'utf8');
  const legacy = readFileSync(new URL('../app/(legacy)/layout.tsx', import.meta.url), 'utf8');
  assert.match(layout, /<html lang=\{locale\}>/);
  assert.match(layout, /localeOrNotFound/);
  assert.match(layout, /isSupportedLocale\(value\)/);
  assert.match(layout, /: SOURCE_LOCALE/);
  assert.match(selector, /LOCALE_ENDONYMS/);
  assert.match(selector, /hrefLang=\{optionLocale\}/);
  assert.match(selector, /aria-current=\{optionLocale === locale \? 'page' : undefined\}/);
  assert.match(legacy, /robots: \{ index: false, follow: false \}/);
  assert.doesNotMatch(layout, /es_ES|en_US|fr_FR|it_IT/);
});

test('legal bodies retain the source-locale gate while synthetic beta profiles are explicitly multilingual and noindex', () => {
  const profile = readFileSync(
    new URL('../app/[locale]/perfiles/[slug]/page.tsx', import.meta.url),
    'utf8',
  );
  const legal = readFileSync(
    new URL('../app/[locale]/legal/[document]/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(legal, /SOURCE_LOCALE/);
  assert.match(legal, /<ReleaseHoldingPage[\s\S]*?locale=\{locale\}/);

  assert.doesNotMatch(profile, /SOURCE_LOCALE|getRuntimeVisibilityState|ReleaseHoldingPage/);
  assert.match(profile, /getSyntheticPreviewProfile\(slug, 'public-beta'\)/);
  assert.match(profile, /getSyntheticBetaCopy\(locale\)/);
  assert.match(profile, /buildSyntheticBetaMetadata/);
  assert.match(profile, /mode: 'public-beta'/);
});

test('localized legal routes show the equivalent holding state before locale-specific gates', () => {
  const legal = readFileSync(
    new URL('../app/[locale]/legal/[document]/page.tsx', import.meta.url),
    'utf8',
  );
  const releaseGate = legal.indexOf(
    '!getRuntimeVisibilityState().renderPublicExperience',
  );
  const localeGate = legal.indexOf('locale !== SOURCE_LOCALE');

  assert.ok(releaseGate >= 0, 'The global release gate is missing.');
  assert.ok(localeGate > releaseGate, 'The locale gate must run after the global release gate.');
  assert.match(
    legal.slice(releaseGate, localeGate),
    /<ReleaseHoldingPage[\s\S]*?locale=\{locale\}[\s\S]*?semanticPath=\{`\/legal\/\$\{document\}`\}/,
  );
});

test('localized 404 copy comes from the selected locale and returns home safely', () => {
  const notFound = readFileSync(
    new URL('../app/[locale]/not-found.tsx', import.meta.url),
    'utf8',
  );

  assert.match(notFound, /usePathname\(\)/);
  assert.match(notFound, /isSupportedLocale\(localeSegment\)/);
  assert.match(notFound, /NOT_FOUND_MESSAGES\[locale\]/);
  assert.doesNotMatch(notFound, /getCatalog|i18n\/catalog/);
  assert.match(notFound, /id="main-content" tabIndex=\{-1\}/);
  assert.match(notFound, /href=\{localizedPath\(locale\)\}/);

  for (const locale of SUPPORTED_LOCALES) {
    const messages = getCatalog(locale).notFound;
    assert.ok(messages.eyebrow.trim());
    assert.ok(messages.title.trim());
    assert.ok(messages.body.trim());
    assert.ok(messages.homeLink.trim());
    assert.deepEqual(NOT_FOUND_MESSAGES[locale], messages);
  }
});

test('localized holding routes keep equivalent language navigation while beta routes use their isolated renderer', () => {
  const holding = readFileSync(
    new URL('../app/components/ReleaseHoldingPage.tsx', import.meta.url),
    'utf8',
  );
  assert.match(holding, /<LanguageSelector locale=\{locale\} semanticPath=\{semanticPath\}/);
  const contact = readFileSync(
    new URL('../app/[locale]/contacto/page.tsx', import.meta.url),
    'utf8',
  );
  assert.match(contact, /<ReleaseHoldingPage locale=\{locale\} semanticPath="\/contacto"/);

  for (const path of [
    '../app/[locale]/page.tsx',
    '../app/[locale]/perfiles/page.tsx',
    '../app/[locale]/perfiles/[slug]/page.tsx',
    '../app/[locale]/servicios/page.tsx',
    '../app/[locale]/servicios/[slug]/page.tsx',
  ]) {
    const source = readFileSync(new URL(path, import.meta.url), 'utf8');
    assert.match(source, /buildSyntheticBetaMetadata/);
    assert.match(source, /mode: 'public-beta'/);
    assert.doesNotMatch(source, /ReleaseHoldingPage|getRuntimeVisibilityState/);
  }
});

test('all seven city slugs have concrete localized route components', () => {
  assert.deepEqual(CITY_SLUGS, [
    'madrid',
    'barcelona',
    'girona',
    'tarragona',
    'toledo',
    'guadalajara',
    'segovia',
  ]);

  for (const slug of CITY_SLUGS) {
    const source = readFileSync(
      new URL(`../app/[locale]/${slug}/page.tsx`, import.meta.url),
      'utf8',
    );
    assert.match(source, /generateMetadata/);
    assert.match(source, /export default/);
  }

  assert.equal(isCitySlug('girona'), true);
  assert.equal(isCitySlug('valencia'), false);
  assert.equal(isCitySlug('GIRONA'), false);
  assert.equal(isSupplementalCitySlug('segovia'), true);
  assert.equal(isSupplementalCitySlug('madrid'), false);
});

test('supplemental city drafts stay localized, distinct and under confirmation', () => {
  assert.deepEqual(Object.keys(cities).sort(), [...CITY_SLUGS].sort());
  assert.equal(
    Object.values(cities).every(
      (city) => city.coverageStatus === 'under-confirmation',
    ),
    true,
  );

  for (const locale of SUPPORTED_LOCALES) {
    const localizedDrafts = SUPPLEMENTAL_CITY_SLUGS.map((slug) =>
      getSupplementalCityContent(locale, slug),
    );
    assert.equal(
      localizedDrafts.every(
        (city) =>
          city.coverageStatus === 'under-confirmation' &&
          city.areaEyebrow.trim().length > 0 &&
          city.faqs.length >= 2,
      ),
      true,
    );
    assert.equal(
      new Set(localizedDrafts.map((city) => city.introTitle)).size,
      SUPPLEMENTAL_CITY_SLUGS.length,
      `${locale} must not reuse one generic city introduction`,
    );

    for (const slug of SUPPLEMENTAL_CITY_SLUGS) {
      const metadata = getSupplementalCityMetadata(locale, slug);
      assert.ok(metadata.title.includes(cities[slug].city));
      assert.ok(metadata.description.trim());
      assert.ok(metadata.openGraphDescription.trim());
    }
  }

  const routeHelper = readFileSync(
    new URL('../app/supplemental-city-route.tsx', import.meta.url),
    'utf8',
  );
  assert.match(routeHelper, /getSupplementalCityContent/);
  assert.match(routeHelper, /getRuntimeCityPresentation/);
  assert.match(routeHelper, /presentation\.routeIndexable/);
});
