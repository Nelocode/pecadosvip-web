import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import test from 'node:test';

import sharp from 'sharp';

import {
  buildSyntheticPreviewMediaHeaders,
  filterSyntheticPreviewProfiles,
  getSyntheticPreviewBuildEnvironment,
  getSyntheticPreviewAsset,
  getSyntheticPreviewProfile,
  getSyntheticPreviewProfiles,
  isSyntheticPreviewEnabled,
  isSyntheticPreviewRequestAllowed,
  SYNTHETIC_PREVIEW_PATH,
  syntheticPreviewAssetRoles,
} from '../lib/preview/synthetic-preview.ts';
import {
  getSyntheticServiceCatalog,
  getSyntheticServiceMessages,
  getSyntheticService,
  syntheticServiceGroups,
} from '../lib/preview/synthetic-services.ts';
import {
  getSyntheticServiceMedia,
  syntheticServiceMediaKeys,
} from '../lib/preview/synthetic-service-media.ts';
import {
  getSyntheticCityMedia,
  getSyntheticCityPresentation,
  syntheticCityMediaSlugs,
} from '../lib/preview/synthetic-city-media.ts';
import {
  getSyntheticDecorMedia,
  syntheticDecorMediaKeys,
} from '../lib/preview/synthetic-decor-media.ts';
import {
  getSyntheticHeroMedia,
  syntheticHeroMediaKeys,
} from '../lib/preview/synthetic-hero-media.ts';
import { parseLocalRequestPathname } from '../scripts/vite-local-synthetic-media.ts';

function fileSha256(path: string): string {
  return createHash('sha256')
    .update(readFileSync(resolve(path)))
    .digest('hex')
    .toUpperCase();
}

function sourceBetween(
  source: string,
  startMarker: string,
  endMarker: string,
): string {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  assert.ok(start >= 0, `Missing source marker: ${startMarker}`);
  assert.ok(end > start, `Missing source marker after ${startMarker}: ${endMarker}`);
  return source.slice(start, end);
}

type PreviewZoneName = 'madrid' | 'barcelona';

function parseZoneAssignments(
  source: string,
): Record<string, PreviewZoneName> {
  return Object.fromEntries(
    [...source.matchAll(/^\s+([a-z0-9-]+):\s*'(madrid|barcelona)',?$/gmu)]
      .map((match) => [match[1]!, match[2]!]),
  ) as Record<string, PreviewZoneName>;
}

test('the local preview middleware fails closed on malformed request URLs', () => {
  assert.equal(parseLocalRequestPathname('/preview-local-sintetico'), '/preview-local-sintetico');
  assert.equal(parseLocalRequestPathname(undefined), '/');
  assert.equal(parseLocalRequestPathname('//'), null);
});

test('preview requires the explicit flag and a development loopback request', () => {
  const enabled = {
    NODE_ENV: 'development',
    PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW: '1',
  };
  assert.equal(isSyntheticPreviewEnabled(enabled), true);
  assert.equal(isSyntheticPreviewRequestAllowed('127.0.0.1:3000', enabled), true);
  assert.equal(isSyntheticPreviewRequestAllowed('localhost:3000', enabled), true);
  assert.equal(isSyntheticPreviewRequestAllowed('[::1]:3000', enabled), true);
  assert.equal(isSyntheticPreviewRequestAllowed('preview.example.com', enabled), false);
  assert.equal(isSyntheticPreviewRequestAllowed('localhost,example.com', enabled), false);
  assert.equal(
    isSyntheticPreviewRequestAllowed('localhost:3000', {
      ...enabled,
      NODE_ENV: 'production',
    }),
    false,
  );
  assert.deepEqual(
    getSyntheticPreviewBuildEnvironment({
      DEV: true,
      VITE_PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW: '1',
    }),
    enabled,
  );
  assert.deepEqual(
    getSyntheticPreviewBuildEnvironment({
      DEV: false,
      VITE_PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW: '1',
    }),
    {
      NODE_ENV: 'production',
      PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW: '1',
    },
  );
  assert.deepEqual(buildSyntheticPreviewMediaHeaders('image/webp'), {
    'Content-Type': 'image/webp',
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, noimageindex',
  });
  assert.equal(
    isSyntheticPreviewRequestAllowed('localhost:3000', {
      ...enabled,
      NODE_ENV: 'test',
    }),
    false,
  );
  assert.equal(
    isSyntheticPreviewRequestAllowed('localhost:3000', {
      ...enabled,
      PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW: 'true',
    }),
    false,
  );
});

test('preview integrates the six synthetic identities and only reviewed technical derivatives', () => {
  const first = getSyntheticPreviewProfiles();
  const second = getSyntheticPreviewProfiles();
  assert.notEqual(first, second);
  first[0]!.displayName = 'mutated outside';
  assert.notEqual(second[0]!.displayName, first[0]!.displayName);
  assert.deepEqual(
    second.map((profile) => profile.slug),
    ['valeria', 'sofia', 'lucia', 'julia', 'mia', 'alicia'],
  );
  assert.deepEqual(
    second.map((profile) => profile.displayName),
    ['Valeria', 'Sofía', 'Lucía', 'Julia', 'Mia', 'Alicia'],
  );

  const assetRoot = resolve('assets', 'synthetic-profiles');
  for (const profile of second) {
    assert.equal(profile.syntheticNotice, 'Perfil ficticio generado con IA');
    assert.equal(profile.media.length, 4);
    assert.deepEqual(
      profile.media.map((asset) => asset.role),
      syntheticPreviewAssetRoles,
    );
    assert.equal(profile.cover.desktopUrl, profile.media[0]!.desktopUrl);
    for (const asset of profile.media) {
      assert.match(
        asset.desktopUrl,
        new RegExp(`^${SYNTHETIC_PREVIEW_PATH}/media/${profile.slug}/`),
      );
      assert.doesNotMatch(asset.desktopUrl, /https?:|data:/i);
      assert.match(asset.alt.toLowerCase(), /ficticia generada con ia/);
      const source = resolve(asset.sourcePath);
      assert.ok(source.startsWith(`${assetRoot}${sep}`));
      assert.equal(existsSync(source), true, `${asset.sourcePath} must exist`);
      assert.doesNotMatch(asset.sourcePath, /public[\\/]/i);
      assert.doesNotMatch(asset.sourcePath, /alicia-gallery-02-v01\.png$/);
    }
  }
});

test('preview filtering, detail lookup and media allowlist are deterministic', () => {
  assert.deepEqual(
    filterSyntheticPreviewProfiles({ city: 'madrid' }).map((profile) => profile.slug),
    ['valeria', 'lucia', 'alicia'],
  );
  assert.deepEqual(
    filterSyntheticPreviewProfiles({ city: 'barcelona' }).map((profile) => profile.slug),
    ['sofia', 'lucia', 'mia'],
  );
  assert.deepEqual(
    filterSyntheticPreviewProfiles({ availability: 'available' }).map(
      (profile) => profile.slug,
    ),
    ['valeria', 'sofia', 'mia'],
  );
  assert.deepEqual(
    filterSyntheticPreviewProfiles({
      city: 'barcelona',
      availability: 'limited',
    }).map((profile) => profile.slug),
    ['lucia'],
  );
  assert.equal(getSyntheticPreviewProfile('sofia')?.displayName, 'Sofía');
  assert.equal(getSyntheticPreviewProfile('missing'), undefined);
  assert.match(
    getSyntheticPreviewAsset('alicia', 'gallery-02')?.sourcePath ?? '',
    /alicia-gallery-02-v02\.png$/,
  );
  assert.equal(getSyntheticPreviewAsset('alicia', '../../secret'), undefined);
  assert.equal(getSyntheticPreviewAsset('../alicia', 'cover'), undefined);
});

test('local preview routes stay guarded while shared renderers select media and links by explicit mode', () => {
  const pageSource = readFileSync(
    'app/(legacy)/preview-local-sintetico/page.tsx',
    'utf8',
  );
  const detailSource = readFileSync(
    'app/(legacy)/preview-local-sintetico/perfiles/[slug]/page.tsx',
    'utf8',
  );
  const mediaMiddlewareSource = readFileSync(
    'scripts/vite-local-synthetic-media.ts',
    'utf8',
  );
  const mediaRouteSources = [
    'app/(legacy)/preview-local-sintetico/city-media/[citySlug]/route.ts',
    'app/(legacy)/preview-local-sintetico/decor-media/[key]/route.ts',
    'app/(legacy)/preview-local-sintetico/hero-media/[key]/route.ts',
    'app/(legacy)/preview-local-sintetico/media/[profileSlug]/[role]/route.ts',
    'app/(legacy)/preview-local-sintetico/service-media/[service]/route.ts',
  ].map((path) => readFileSync(path, 'utf8'));
  const publicCssSource = readFileSync('app/public-site.css', 'utf8');
  const viteConfigSource = readFileSync('vite.config.ts', 'utf8');
  const profileCardSource = readFileSync('app/components/ProfileCard.tsx', 'utf8');
  const profileMediaSource = readFileSync(
    'app/components/PublicProfileMedia.tsx',
    'utf8',
  );
  assert.equal(SYNTHETIC_PREVIEW_PATH, '/preview-local-sintetico');
  for (const source of [pageSource, detailSource]) {
    assert.match(source, /robots:\s*\{[\s\S]*index:\s*false/);
    assert.match(source, /mode = 'local-preview'/);
    assert.match(source, /if \(mode === 'local-preview'\)/);
    assert.match(source, /isSyntheticPreviewRequestAllowed/);
    assert.match(source, /getSyntheticPreviewBuildEnvironment\(import\.meta\.env\)/);
    assert.doesNotMatch(source, /ContactOptions|https?:\/\//);
  }
  assert.match(pageSource, /<ProfileCard/);
  assert.match(pageSource, /disclosure=\{messages\.profilesSection\.cardDisclosure\}/);
  assert.match(pageSource, /preserveFullImage/);
  assert.match(
    pageSource,
    /profileHref=\{syntheticExperienceProfile\(locale, candidate\.slug, mode\)\}/,
  );
  assert.match(
    pageSource,
    /mode === 'local-preview'[\s\S]*?<input name="lang" type="hidden" value=\{locale\} \/>/,
  );
  assert.match(pageSource, /const servicesHref = syntheticExperienceServices\(locale, mode\)/);
  assert.match(
    detailSource,
    /withSyntheticQuery\([\s\S]*?syntheticExperienceProfile\(locale, profile\.slug, mode\)[\s\S]*?foto: candidate\.role/,
  );
  assert.match(detailSource, /messages\.profile\.contactDisabledTitle/);
  assert.match(detailSource, /messages\.profile\.contactDisabledButton/);
  assert.match(detailSource, /button type="button" disabled/);
  assert.match(detailSource, /<PublicProfileMedia/);
  assert.match(mediaMiddlewareSource, /apply: 'serve'/);
  assert.match(mediaMiddlewareSource, /isSyntheticPreviewRequestAllowed/);
  assert.match(mediaMiddlewareSource, /syntheticCityMediaPattern/);
  assert.match(mediaMiddlewareSource, /isSyntheticCityMediaSlug/);
  assert.match(mediaMiddlewareSource, /'synthetic-cities'/);
  assert.match(mediaMiddlewareSource, /syntheticDecorMediaPattern/);
  assert.match(mediaMiddlewareSource, /isSyntheticDecorMediaKey/);
  assert.match(mediaMiddlewareSource, /'synthetic-decor'/);
  assert.match(mediaMiddlewareSource, /syntheticHeroMediaPattern/);
  assert.match(mediaMiddlewareSource, /isSyntheticHeroMediaKey/);
  assert.match(mediaMiddlewareSource, /'synthetic-hero'/);
  assert.match(mediaMiddlewareSource, /assetRoot/);
  assert.match(mediaMiddlewareSource, /private, no-store/);
  assert.match(mediaMiddlewareSource, /noimageindex/);
  for (const source of mediaRouteSources) {
    assert.match(source, /isSyntheticPreviewRequestAllowed/);
    assert.match(source, /request\.headers\.get\('host'\)/);
    assert.match(source, /getSyntheticPreviewBuildEnvironment\(import\.meta\.env\)/);
    assert.match(source, /buildSyntheticPreviewMediaHeaders/);
    assert.match(source, /status:\s*404/);
  }
  assert.match(viteConfigSource, /localSyntheticMediaPlugin\(\)/);
  assert.match(viteConfigSource, /ignored:\s*\['\*\*\/stage-archives\/\*\*'\]/);
  assert.match(profileCardSource, /disclosure\?: string/);
  assert.match(profileCardSource, /preserveFullImage\?: boolean/);
  assert.match(profileCardSource, /<PublicProfileMedia/);
  assert.match(profileMediaSource, /preserveFullImage \? \('contain' as const\)/);
  assert.match(profileMediaSource, /objectPosition: 'center top'/);
  assert.match(
    publicCssSource,
    /\.synthetic-profile-grid \.profile-card-media\s*\{[\s\S]*?aspect-ratio:\s*3 \/ 4/,
  );
  assert.match(
    publicCssSource,
    /\.synthetic-profile-active-image\s*\{[\s\S]*?aspect-ratio:\s*3 \/ 4/,
  );
});

test('shared synthetic home keeps the guarded local default and an explicit public-beta scope without enabling conversion', () => {
  const pageSource = readFileSync(
    'app/(legacy)/preview-local-sintetico/page.tsx',
    'utf8',
  );
  const publicCssSource = readFileSync('app/public-site.css', 'utf8');

  const referenceCssStart = publicCssSource.indexOf(
    '/* Reference-aligned home composition. Scoped to the guarded synthetic preview. */',
  );
  assert.ok(referenceCssStart >= 0, 'Missing the scoped reference-aligned CSS layer.');
  const effectivePreviewCss = publicCssSource.slice(referenceCssStart);
  const stackedZonesCss = sourceBetween(
    effectivePreviewCss,
    '@media (max-width: 900px)',
    '@media (max-width: 1100px)',
  );
  const mobileCss = sourceBetween(
    effectivePreviewCss,
    '@media (max-width: 780px)',
    '@media (max-width: 420px)',
  );
  const narrowMobileCss = effectivePreviewCss.slice(
    effectivePreviewCss.indexOf('@media (max-width: 420px)'),
  );
  const extraNarrowMobileCss = effectivePreviewCss.slice(
    effectivePreviewCss.indexOf('@media (max-width: 360px)'),
  );

  for (const anchor of ['inicio', 'cobertura', 'perfiles', 'seguridad']) {
    assert.match(pageSource, new RegExp(`href="#${anchor}"`));
  }

  assert.equal((pageSource.match(/<main(?:\s|>)/gu) ?? []).length, 1);
  assert.equal((pageSource.match(/<h1(?:\s|>)/gu) ?? []).length, 1);
  assert.equal((pageSource.match(/id="main-content"/gu) ?? []).length, 1);
  assert.equal((pageSource.match(/id="preview-title"/gu) ?? []).length, 1);
  assert.match(pageSource, /<main id="main-content" tabIndex=\{-1\}>/);
  assert.match(
    pageSource,
    /<section className="synthetic-preview-hero" aria-labelledby="preview-title">/,
  );

  const coverageGroupsSource = sourceBetween(
    pageSource,
    'const coverageGroups:',
    'type PreviewZone',
  );
  const zoneBases = [...coverageGroupsSource.matchAll(/^\s+base: '(madrid|barcelona)',$/gmu)]
    .map((match) => match[1]!);
  assert.deepEqual(zoneBases, ['madrid', 'barcelona']);
  assert.equal(new Set(zoneBases).size, 2);
  assert.match(
    pageSource,
    /className=\{`synthetic-preview-city-zone synthetic-preview-city-zone--\$\{group\.base\}`\}/,
  );
  assert.match(pageSource, /id=\{`zona-\$\{group\.base\}`\}/);
  assert.match(pageSource, /aria-labelledby=\{`zone-title-\$\{group\.base\}`\}/);
  assert.match(pageSource, /<h3 id=\{`zone-title-\$\{group\.base\}`\}>/);

  const profileHomeZones = parseZoneAssignments(
    sourceBetween(pageSource, 'const profileHomeZones:', 'const filterCityZones'),
  );
  assert.deepEqual(profileHomeZones, {
    valeria: 'madrid',
    lucia: 'madrid',
    alicia: 'madrid',
    sofia: 'barcelona',
    mia: 'barcelona',
    julia: 'barcelona',
  });
  assert.deepEqual(
    Object.keys(profileHomeZones).sort(),
    getSyntheticPreviewProfiles().map((candidate) => candidate.slug).sort(),
  );
  assert.deepEqual(
    (Object.values(profileHomeZones) as PreviewZoneName[]).reduce<Record<PreviewZoneName, number>>(
      (counts, zone) => ({ ...counts, [zone]: counts[zone] + 1 }),
      { madrid: 0, barcelona: 0 },
    ),
    { madrid: 3, barcelona: 3 },
  );

  const filterCityZones = parseZoneAssignments(
    sourceBetween(pageSource, 'const filterCityZones =', 'const previewAvailabilities'),
  );
  assert.deepEqual(filterCityZones, {
    madrid: 'madrid',
    toledo: 'madrid',
    segovia: 'madrid',
    guadalajara: 'madrid',
    barcelona: 'barcelona',
    tarragona: 'barcelona',
    girona: 'barcelona',
  });
  assert.match(
    pageSource,
    /const profiles = validFilters[\s\S]*?\? hasFilters[\s\S]*?\? filterSyntheticPreviewProfiles\(\{ city, availability \}, mode\)[\s\S]*?: getSyntheticPreviewProfiles\(mode\)[\s\S]*?: \[\];/,
  );
  assert.match(
    pageSource,
    /const selectedZone = city[\s\S]*?\? filterCityZones\[city as keyof typeof filterCityZones\][\s\S]*?: undefined;/,
  );
  assert.match(
    pageSource,
    /function getProfileCoverageZones\(profile: SyntheticPreviewProfile\): PreviewZone\[\]/,
  );
  assert.match(
    pageSource,
    /const zones = selectedZone[\s\S]*?\? \[selectedZone\][\s\S]*?: availability[\s\S]*?\? getProfileCoverageZones\(candidate\)[\s\S]*?: \[profileHomeZones\[candidate\.slug\]\];/,
  );
  assert.match(pageSource, /for \(const zone of zones\)/);

  assert.match(pageSource, /id="servicios"/);
  assert.match(
    pageSource,
    /const servicesHref = syntheticExperienceServices\(locale, mode\);/,
  );
  assert.match(pageSource, /<a href=\{servicesHref\}>/);
  assert.match(
    pageSource,
    /const zoneHref = \(zone: PreviewZone\) => withSyntheticQuery\([\s\S]*?homePath,[\s\S]*?\{ city: zone, availability \},[\s\S]*?\) \+ `#zona-\$\{zone\}`;/,
  );
  assert.match(pageSource, /href=\{zoneHref\('madrid'\)\}/);
  assert.match(pageSource, /href=\{zoneHref\('barcelona'\)\}/);
  assert.match(
    pageSource,
    /href=\{zoneHref\(group\.base\)\}/,
  );
  assert.match(
    pageSource,
    /<section[\s\S]*?className="synthetic-preview-catalog-zone-section"[\s\S]*?id="perfiles"[\s\S]*?aria-labelledby="preview-results-title"/,
  );
  assert.match(pageSource, /<h2 id="preview-results-title">\{messages\.profilesSection\.title\}<\/h2>/);
  assert.match(pageSource, /href="#perfiles"[\s\S]*?aria-label=\{messages\.navigation\.zones\}/);
  assert.match(pageSource, /headingLevel=\{5\}/);
  assert.match(pageSource, /messages\.cities\[citySlug\]/);
  assert.match(pageSource, /messages\.cities\[group\.base\]/);
  assert.match(pageSource, /getSyntheticPreviewProfiles/);
  assert.match(pageSource, /<PublicProfileMedia/);
  assert.match(pageSource, /messages\.hero\.generatedImageDisclosure/);
  assert.match(pageSource, /<h2 id="coverage-title">\{messages\.coverage\.title\}<\/h2>/);
  assert.match(pageSource, /\{messages\.coverage\.body\}/);
  assert.match(pageSource, /getSyntheticCityMedia/);
  assert.match(pageSource, /cityMedia\.shortDisclosure/);
  assert.match(pageSource, /id=\{`city-\$\{citySlug\}`\}/);
  assert.match(pageSource, /messages\.servicesSection\.title/);
  assert.match(pageSource, /synthetic-preview-hero-title-primary/);
  assert.match(pageSource, /synthetic-preview-hero-title-secondary/);
  assert.match(pageSource, /messages\.navigation\.privateBooking/);
  assert.match(pageSource, /messages\.servicesSection\.contactDisabled/);
  assert.match(pageSource, /type="button"\s+disabled/);
  assert.doesNotMatch(
    pageSource,
    /ContactOptions|formActionUrl|mailto:|tel:|https?:\/\/(?:t\.me|wa\.me)/,
  );

  assert.match(
    pageSource,
    /<Image[\s\S]*?alt=""[\s\S]*?aria-hidden="true"[\s\S]*?className="synthetic-preview-brand-mark"[\s\S]*?height=\{96\}[\s\S]*?src="\/icon\.png"[\s\S]*?width=\{96\}/,
  );
  assert.match(
    effectivePreviewCss,
    /\.synthetic-preview-brand-mark\s*\{[^}]*width:\s*80px;[^}]*height:\s*80px;/,
  );
  assert.match(
    mobileCss,
    /\.synthetic-preview-page \.synthetic-preview-brand-mark\s*\{[^}]*width:\s*56px;[^}]*height:\s*56px;/,
  );
  assert.match(
    narrowMobileCss,
    /\.synthetic-preview-page \.synthetic-preview-brand-mark\s*\{[^}]*width:\s*56px;[^}]*height:\s*56px;/,
  );
  assert.match(
    extraNarrowMobileCss,
    /\.synthetic-preview-page \.synthetic-preview-brand-mark\s*\{[^}]*width:\s*48px;[^}]*height:\s*48px;/,
  );
  assert.match(
    effectivePreviewCss,
    /\.synthetic-preview-brand-copy > span\s*\{[^}]*font-size:\s*3\.8rem;/,
  );
  assert.match(
    effectivePreviewCss,
    /@media \(min-width:\s*1101px\) and \(max-width:\s*1179px\)[\s\S]*?\.synthetic-preview-page \.synthetic-preview-brand-copy > span\s*\{[^}]*font-size:\s*3\.5rem;/,
  );
  assert.match(
    effectivePreviewCss,
    /\.synthetic-preview-page \.synthetic-preview-header\s*\{[^}]*grid-template-columns:\s*minmax\(286px, 1fr\) auto auto auto;[^}]*min-height:\s*82px;/,
  );
  assert.match(
    mobileCss,
    /\.synthetic-preview-page \.synthetic-preview-header\s*\{[^}]*grid-template-columns:\s*minmax\(156px, 1fr\) auto auto;[^}]*min-height:\s*70px;/,
  );

  assert.match(effectivePreviewCss, /\.synthetic-preview-page \.synthetic-preview-hero\s*\{/);
  assert.match(
    effectivePreviewCss,
    /\.synthetic-preview-page \.synthetic-preview-hero-title-primary\s*\{[^}]*line-height:\s*1;/,
  );
  assert.match(
    effectivePreviewCss,
    /\.synthetic-preview-page \.synthetic-preview-hero-title-secondary\s*\{[^}]*line-height:\s*1\.04;/,
  );
  assert.match(
    effectivePreviewCss,
    /\.synthetic-preview-page \.synthetic-preview-city-zones\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    effectivePreviewCss,
    /\.synthetic-preview-page \.synthetic-preview-zone-profile-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/,
  );
  assert.match(
    stackedZonesCss,
    /\.synthetic-preview-page \.synthetic-preview-city-zones\s*\{[^}]*grid-template-columns:\s*1fr;/,
  );
  assert.match(
    mobileCss,
    /\.synthetic-preview-page \.synthetic-preview-zone-profile-grid\s*\{[^}]*display:\s*flex;[^}]*overflow-x:\s*auto;[^}]*scroll-snap-type:\s*x mandatory;/,
  );
  assert.match(publicCssSource, /\.synthetic-preview-service-grid\s*\{/);
  assert.match(publicCssSource, /@media \(max-width: 480px\)/);
  assert.match(publicCssSource, /@media \(prefers-reduced-motion: reduce\)/);
});

test('the reference-aligned hero keeps its guarded preview URL and exposes only the explicit public-beta route', async () => {
  assert.deepEqual([...syntheticHeroMediaKeys], ['home-editorial']);
  const media = getSyntheticHeroMedia('home-editorial');
  assert.equal(media.kind, 'image');
  assert.equal(media.contentType, 'image/webp');
  assert.equal(media.width, 1536);
  assert.equal(media.height, 1024);
  assert.equal(
    media.desktopUrl,
    '/preview-local-sintetico/hero-media/home-editorial',
  );
  const betaMedia = getSyntheticHeroMedia('home-editorial', 'public-beta');
  assert.equal(betaMedia.desktopUrl, '/beta-media/hero/home-editorial');
  assert.equal(betaMedia.sourcePath, media.sourcePath);
  assert.doesNotMatch(media.desktopUrl, /https?:|data:/i);
  assert.equal(
    media.sourcePath,
    'assets/synthetic-hero/selected/home-hero-editorial-v01.webp',
  );
  assert.equal(existsSync(resolve(media.sourcePath)), true);
  assert.equal(
    fileSha256(media.sourcePath),
    '22859FB751202D9B5645BE116C09CD64BEE9D0963170D52E18C68FFCB9D64C35',
  );
  const metadata = await sharp(media.sourcePath).metadata();
  assert.equal(metadata.format, 'webp');
  assert.equal(metadata.width, 1536);
  assert.equal(metadata.height, 1024);
  assert.equal(metadata.exif, undefined);
  assert.equal(metadata.icc, undefined);
  assert.equal(metadata.xmp, undefined);
  assert.ok(statSync(media.sourcePath).size < 500_000);

  const manifest = readFileSync(
    'assets/synthetic-hero/ASSET_MANIFEST.csv',
    'utf8',
  );
  assert.match(manifest, /openai_image_generation,PASS,PENDING,PENDING,local_preview_only_no_publication/);
});

test('decorative full-background mosaic is inert, responsive and routed through the selected experience scope', async () => {
  const css = readFileSync('app/public-site.css', 'utf8');
  const masterPath = 'assets/brand/filigree-mosaic-source-v04.png';
  const masterSha256 =
    'B169F9E48C3B5000DAC445BF42F6AE2225E9F7B2B6AB3A550BA21DCB0269BD11';
  assert.equal(fileSha256(masterPath), masterSha256);
  const masterMetadata = await sharp(masterPath).metadata();
  assert.equal(masterMetadata.format, 'png');
  assert.equal(masterMetadata.width, 1254);
  assert.equal(masterMetadata.height, 1254);
  assert.equal(masterMetadata.hasAlpha, false);

  const expectations = {
    'border-filigree': {
      width: 768,
      height: 768,
      sha256: '3D1D8836953C5D63A36AC370DE9968E735BA3F196294D6868A2EC2D9E2BDF903',
    },
    'border-filigree-left': {
      width: 320,
      height: 1056,
      sha256: '1397B7F72D6BA24AE876FF0C3367B0BADF60BBFD8812FB823352B1683AE5EAA4',
    },
    'border-filigree-right': {
      width: 320,
      height: 1056,
      sha256: 'F9BB97B7EF083CCBC828D647BFDDD08715EB34A59A3CE6807485E8A223D3EEF3',
    },
  } as const;

  assert.deepEqual([...syntheticDecorMediaKeys], Object.keys(expectations));
  for (const key of syntheticDecorMediaKeys) {
    const media = getSyntheticDecorMedia(key);
    const expected = expectations[key];
    assert.equal(media.contentType, 'image/webp');
    assert.equal(media.width, expected.width);
    assert.equal(media.height, expected.height);
    assert.equal(
      media.desktopUrl,
      `/preview-local-sintetico/decor-media/${key}`,
    );
    const betaMedia = getSyntheticDecorMedia(key, 'public-beta');
    assert.equal(betaMedia.desktopUrl, `/beta-media/decor/${key}`);
    assert.equal(betaMedia.sourcePath, media.sourcePath);
    assert.doesNotMatch(media.desktopUrl, /https?:|data:/i);
    const source = resolve(media.sourcePath);
    assert.ok(source.startsWith(`${resolve('assets', 'synthetic-decor')}${sep}`));
    assert.equal(existsSync(source), true, media.sourcePath);
    assert.doesNotMatch(media.sourcePath, /public[\\/]/i);
    assert.equal(fileSha256(media.sourcePath), expected.sha256);

    const metadata = await sharp(source).metadata();
    assert.equal(metadata.format, 'webp');
    assert.equal(metadata.width, media.width);
    assert.equal(metadata.height, media.height);
    assert.equal(metadata.hasAlpha, true);
    assert.equal(metadata.exif, undefined);
    assert.equal(metadata.icc, undefined);
    assert.equal(metadata.xmp, undefined);
    assert.ok(
      statSync(source).size < (key === 'border-filigree' ? 750_000 : 450_000),
      `${key} exceeds its reviewed local-preview weight budget.`,
    );

    const raw = await sharp(source).ensureAlpha().raw().toBuffer({
      resolveWithObject: true,
    });
    let transparentPixels = 0;
    let subtlePixels = 0;
    let visiblePixels = 0;
    for (let index = 3; index < raw.data.length; index += 4) {
      const alpha = raw.data[index]!;
      if (alpha === 0) transparentPixels += 1;
      if (alpha > 0 && alpha < 24) subtlePixels += 1;
      if (alpha >= 96) visiblePixels += 1;
    }
    const totalPixels = raw.info.width * raw.info.height;
    assert.ok(transparentPixels > totalPixels * 0.08);
    assert.ok(subtlePixels > totalPixels * 0.5);
    assert.ok(visiblePixels > totalPixels * 0.2);
  }

  const manifestRows = readFileSync(
    'assets/synthetic-decor/ASSET_MANIFEST.csv',
    'utf8',
  )
    .trim()
    .split(/\r?\n/u);
  assert.equal(manifestRows.length, 4);
  const rowsByKey = new Map(
    manifestRows.slice(1).map((row) => {
      const columns = row.split(',');
      return [columns[0], columns] as const;
    }),
  );
  for (const key of syntheticDecorMediaKeys) {
    const media = getSyntheticDecorMedia(key);
    const columns = rowsByKey.get(key);
    assert.ok(columns, `Missing manifest row for ${key}`);
    assert.equal(columns[2], media.sourcePath);
    assert.equal(columns[3], '', 'public_path must remain empty before approval');
    assert.equal(
      columns[4],
      masterSha256,
    );
    assert.equal(columns[5], fileSha256(media.sourcePath));
    assert.equal(columns[12], 'PASS_HASH_DIMENSION_FORMAT_ALPHA');
    assert.equal(columns[13], 'PENDING');
    assert.equal(columns[14], 'PENDING');
    assert.equal(columns[15], 'PENDING');
    assert.equal(columns[10], 'user_supplied_chatgpt_gold_mosaic');
    assert.equal(columns[16], 'local_preview_only_no_publication');
  }

  const interaction = readFileSync(
    'app/components/SyntheticFiligree.tsx',
    'utf8',
  );
  assert.match(interaction, /^'use client';/);
  assert.match(interaction, /aria-hidden="true"/);
  assert.match(interaction, /data-active="false"/);
  assert.match(
    interaction,
    /getSyntheticDecorMedia\('border-filigree', mode\)\.desktopUrl/,
  );
  assert.match(
    interaction,
    /\(min-width: 1100px\) and \(hover: hover\) and \(pointer: fine\)/,
  );
  assert.match(interaction, /\(prefers-reduced-motion: reduce\)/);
  assert.match(interaction, /pointerQuery\.matches && !motionQuery\.matches/);
  assert.match(interaction, /addEventListener\('pointermove', handlePointerMove, \{ passive: true \}\)/);
  assert.match(interaction, /addEventListener\('scroll', handleScroll, \{ passive: true \}\)/);
  assert.match(interaction, /requestAnimationFrame\(renderPointer\)/);
  assert.match(interaction, /cancelAnimationFrame\(animationFrame\)/);
  assert.match(interaction, /event\.pointerType === 'touch'/);
  assert.match(interaction, /decoration\.getBoundingClientRect\(\)/);
  assert.match(
    interaction,
    /decoration\.style\.setProperty\(\s*'--filigree-pointer-x'/,
  );
  assert.match(
    interaction,
    /decoration\.style\.setProperty\(\s*'--filigree-pointer-y'/,
  );
  assert.match(interaction, /removeEventListener\('pointermove', handlePointerMove\)/);
  assert.match(interaction, /removeEventListener\('scroll', handleScroll\)/);
  assert.doesNotMatch(interaction, /synthetic-preview-filigree-rail/);
  assert.doesNotMatch(interaction, /tabIndex=|role=|onClick=|onKeyDown=/);

  for (const pagePath of [
    'app/(legacy)/preview-local-sintetico/page.tsx',
    'app/(legacy)/preview-local-sintetico/perfiles/[slug]/page.tsx',
    'app/(legacy)/preview-local-sintetico/servicios/page.tsx',
    'app/(legacy)/preview-local-sintetico/servicios/[slug]/page.tsx',
  ]) {
    const page = readFileSync(pagePath, 'utf8');
    assert.match(page, /import SyntheticFiligree from/);
    assert.equal(
      page.match(/<SyntheticFiligree mode=\{mode\} \/>/g)?.length,
      1,
      `${pagePath} must mount exactly one mode-scoped inert filigree layer.`,
    );
  }

  assert.match(
    css,
    /\.synthetic-preview-filigree\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?inset:\s*0;[\s\S]*?z-index:\s*24;[\s\S]*?display:\s*block;[\s\S]*?overflow:\s*hidden;[\s\S]*?pointer-events:\s*none;[\s\S]*?user-select:\s*none;/,
  );
  assert.match(
    css,
    /@media \(max-width: 1099px\)[\s\S]*?\.synthetic-preview-page\s*\{[\s\S]*?--filigree-rest-opacity:\s*0\.045;[\s\S]*?--filigree-tile-size:\s*clamp\(14rem, 58vw, 16\.25rem\);[\s\S]*?\.synthetic-services-page\s*\{[\s\S]*?--filigree-rest-opacity:\s*0\.02;/,
  );
  assert.match(
    css,
    /@media \(min-width: 1100px\) and \(max-width: 1279px\)[\s\S]*?\.synthetic-preview-page\s*\{[\s\S]*?--filigree-tile-size:\s*clamp\(18rem, 25vw, 20rem\);/,
  );
  const filigreeStart = css.indexOf('.synthetic-preview-filigree {');
  const filigreeEnd = css.indexOf('.synthetic-preview-header > strong', filigreeStart);
  assert.ok(filigreeStart >= 0 && filigreeEnd > filigreeStart);
  const filigreeCss = css.slice(filigreeStart, filigreeEnd);
  assert.deepEqual(
    [...filigreeCss.matchAll(/url\('([^']+)'\)/g)].map((match) => match[1]),
    ['/preview-local-sintetico/decor-media/border-filigree'],
  );
  assert.match(filigreeCss, /background-repeat:\s*repeat;/);
  assert.match(
    filigreeCss,
    /background-size:\s*var\(--filigree-tile-size\) auto;/,
  );
  assert.doesNotMatch(
    filigreeCss,
    /repeat-y|position:\s*fixed|translate(?:X|Y)?\(/,
  );
  assert.match(
    css,
    /\.synthetic-preview-filigree::before\s*\{[\s\S]*?opacity:\s*var\(--filigree-rest-opacity\);[\s\S]*?brightness\(0\.54\)[\s\S]*?saturate\(0\.48\)[\s\S]*?contrast\(0\.96\)[\s\S]*?sepia\(0\.08\)/,
  );
  assert.match(
    css,
    /\.synthetic-preview-filigree::after\s*\{[\s\S]*?opacity:\s*0;[\s\S]*?brightness\(0\.68\)[\s\S]*?saturate\(0\.56\)[\s\S]*?contrast\(0\.98\)[\s\S]*?drop-shadow\(0 0 5px rgb\(216 173 98 \/ 8%\)\)[\s\S]*?rgb\(0 0 0 \/ 72%\) 0 14%[\s\S]*?rgb\(0 0 0 \/ 18%\) 76%[\s\S]*?var\(--filigree-pointer-x\) var\(--filigree-pointer-y\)[\s\S]*?transition:\s*opacity 620ms cubic-bezier\(0\.22, 0\.61, 0\.36, 1\);/,
  );
  assert.match(
    css,
    /\.synthetic-preview-filigree\[data-active='true'\]::after\s*\{[\s\S]*?opacity:\s*var\(--filigree-active-opacity\);[\s\S]*?transition-duration:\s*460ms;/,
  );
  assert.match(
    css,
    /\.synthetic-preview-page\s*\{[\s\S]*?--filigree-active-opacity:\s*0\.105;[\s\S]*?--filigree-rest-opacity:\s*0\.06;[\s\S]*?--filigree-tile-size:\s*clamp\(22\.5rem, 30vw, 26rem\);/,
  );
  assert.match(
    css,
    /\.synthetic-services-page\s*\{[\s\S]*?--filigree-active-opacity:\s*0\.042;[\s\S]*?--filigree-rest-opacity:\s*0\.025;/,
  );
  assert.match(
    css,
    /@media print[\s\S]*?\.synthetic-preview-filigree\s*\{[\s\S]*?display:\s*none;/,
  );
  assert.match(
    css,
    /@media \(forced-colors: active\)[\s\S]*?\.synthetic-preview-filigree\s*\{[\s\S]*?display:\s*none;/,
  );
  assert.match(
    css,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.synthetic-preview-filigree::after\s*\{[\s\S]*?display:\s*none;/,
  );
});

test('service preview exposes 34 PecadosVip routes in four complete locale projections', () => {
  const slugs = getSyntheticServiceCatalog('es').map((service) => service.slug);
  const referenceInventory = JSON.parse(
    readFileSync('docs/reference/felina-route-inventory.json', 'utf8'),
  ) as { routes: Array<{ family: string; locale: string; path: string; routeType: string }> };
  const referenceServiceSlugs = new Set(
    referenceInventory.routes
      .filter(
        (route) =>
          route.family === 'services' &&
          route.locale === 'es' &&
          route.routeType === 'detail',
      )
      .map((route) => route.path.split('/').at(-1)),
  );
  assert.equal(slugs.length, 34);
  assert.equal(new Set(slugs).size, slugs.length);
  assert.deepEqual(
    slugs.filter((slug) => referenceServiceSlugs.has(slug)),
    [],
    'PecadosVip route slugs must remain distinct from the reference inventory',
  );
  assert.equal(syntheticServiceGroups.length, 6);

  for (const locale of ['es', 'en', 'fr', 'it'] as const) {
    const catalog = getSyntheticServiceCatalog(locale);
    const messages = getSyntheticServiceMessages(locale);
    assert.equal(catalog.length, 34);
    assert.equal(catalog.every((service) => service.name.trim() && service.teaser.trim()), true);
    assert.equal(messages.faqs.length, 4);
    const knownService = getSyntheticService('compania-privada', locale);
    assert.ok(knownService);
    assert.equal(knownService.name.trim().length > 0, true);
  }
  assert.equal(getSyntheticService('../secret', 'es'), undefined);
});

test('service catalogue maps every route to selected media with guarded-preview and public-beta URLs', () => {
  const catalog = getSyntheticServiceCatalog('es');
  const assignedMediaKeys = catalog.map((service) => service.mediaKey);
  assert.equal(syntheticServiceMediaKeys.length, 34);
  assert.equal(new Set(syntheticServiceMediaKeys).size, 34);
  assert.equal(
    new Set(assignedMediaKeys).size,
    catalog.length,
    'every service route must use its own symbolic image',
  );
  assert.equal(catalog.every((service) => syntheticServiceMediaKeys.includes(service.mediaKey)), true);

  for (const key of syntheticServiceMediaKeys) {
    const media = getSyntheticServiceMedia(key, 'es');
    const betaMedia = getSyntheticServiceMedia(key, 'es', 'public-beta');
    assert.match(media.desktopUrl, /^\/preview-local-sintetico\/service-media\//);
    assert.equal(betaMedia.desktopUrl, `/beta-media/services/${key}`);
    assert.equal(betaMedia.sourcePath, media.sourcePath);
    assert.equal(media.contentType, 'image/webp');
    assert.match(media.alt, /\S/);
    assert.equal(existsSync(resolve(media.sourcePath)), true, media.sourcePath);
    assert.doesNotMatch(media.sourcePath, /public[\\/]/i);
  }
});

test('eight unique city references are localized with guarded-preview defaults and explicit beta URLs', () => {
  assert.deepEqual(
    [...syntheticCityMediaSlugs],
    ['madrid', 'barcelona', 'girona', 'tarragona', 'toledo', 'guadalajara', 'segovia', 'sitges'],
  );
  assert.equal(new Set(syntheticCityMediaSlugs).size, 8);

  const expectedDisclosure = {
    es: 'Imagen de referencia generada con IA · cobertura no confirmada',
    en: 'AI-generated reference image · coverage not confirmed',
    fr: 'Image de référence générée par IA · couverture non confirmée',
    it: 'Immagine di riferimento generata con IA · copertura non confermata',
  } as const;
  const expectedShortDisclosure = {
    es: 'Generada con IA',
    en: 'AI-generated',
    fr: 'Générée par IA',
    it: 'Generata con IA',
  } as const;

  for (const locale of ['es', 'en', 'fr', 'it'] as const) {
    const presentation = getSyntheticCityPresentation(locale);
    assert.match(presentation.coverageTitle, /\S/);
    assert.match(presentation.pendingStatus, /\S/);
    for (const citySlug of syntheticCityMediaSlugs) {
      const media = getSyntheticCityMedia(citySlug, locale);
      const betaMedia = getSyntheticCityMedia(citySlug, locale, 'public-beta');
      assert.equal(media.citySlug, citySlug);
      assert.equal(media.contentType, 'image/webp');
      assert.equal(media.disclosure, expectedDisclosure[locale]);
      assert.equal(media.shortDisclosure, expectedShortDisclosure[locale]);
      assert.match(media.alt, /\S/);
      assert.match(
        media.desktopUrl,
        new RegExp(`^/preview-local-sintetico/city-media/${citySlug}$`, 'u'),
      );
      assert.equal(betaMedia.desktopUrl, `/beta-media/cities/${citySlug}`);
      assert.equal(betaMedia.sourcePath, media.sourcePath);
      assert.equal(existsSync(resolve(media.sourcePath)), true, media.sourcePath);
      assert.doesNotMatch(media.sourcePath, /public[\\/]/i);
    }
  }
});

test('shared service hub and detail keep local guards, explicit beta scope, noindex metadata and disabled contact', () => {
  const hub = readFileSync(
    'app/(legacy)/preview-local-sintetico/servicios/page.tsx',
    'utf8',
  );
  const detail = readFileSync(
    'app/(legacy)/preview-local-sintetico/servicios/[slug]/page.tsx',
    'utf8',
  );
  const notice = readFileSync(
    'app/components/SyntheticPreviewNotice.tsx',
    'utf8',
  );
  const explorer = readFileSync(
    'app/components/SyntheticServiceExplorer.tsx',
    'utf8',
  );
  const card = readFileSync(
    'app/components/SyntheticServiceCard.tsx',
    'utf8',
  );
  const css = readFileSync('app/service-pages.css', 'utf8');

  for (const source of [hub, detail]) {
    assert.match(source, /robots:\s*\{[\s\S]*index:\s*false/);
    assert.match(source, /mode = 'local-preview'/);
    assert.match(source, /if \(mode === 'local-preview'\)/);
    assert.match(source, /isSyntheticPreviewRequestAllowed/);
    assert.match(source, /getSyntheticPreviewBuildEnvironment\(import\.meta\.env\)/);
    assert.doesNotMatch(
      source,
      /ContactOptions|formActionUrl|mailto:|tel:|https?:\/\/(?:wa\.me|t\.me)/,
    );
  }
  assert.match(explorer, /name="category"/);
  assert.match(explorer, /role="search"/);
  assert.match(explorer, /type="search"/);
  assert.match(explorer, /aria-live="polite"/);
  assert.match(explorer, /aria-pressed=/);
  assert.match(explorer, /current\.length >= 3/);
  assert.doesNotMatch(explorer, /localStorage|sessionStorage|navigator\.share/);
  assert.match(card, /className="synthetic-service-card-select"/);
  assert.match(card, /aria-pressed=\{selection\.selected\}/);
  assert.match(hub, /<details/);
  assert.match(hub, /SyntheticPreviewNotice/);
  assert.match(hub, /#city-\$\{citySlug\}/);
  assert.match(hub, /cityMedia\.shortDisclosure/);
  assert.match(hub, /syntheticCityMediaSlugs\.map/);
  assert.match(hub, /<PublicProfileMedia/);
  assert.match(hub, /media=\{cityMedia\}/);
  assert.match(hub, /preserveFullImage=\{false\}/);
  assert.match(detail, /generateStaticParams/);
  assert.match(detail, /getRelatedSyntheticServices/);
  assert.match(notice, /window\.localStorage/);
  assert.match(css, /\.synthetic-services-grid\s*\{/);
  assert.match(
    css,
    /\.synthetic-services-hero h1\s*\{[\s\S]*?line-height:\s*1\.15/,
  );
  assert.match(
    css,
    /\.synthetic-service-detail-copy h1\s*\{[\s\S]*?line-height:\s*1\.15/,
  );
  assert.match(css, /grid-template-columns:\s*repeat\(4/);
  assert.match(css, /@media \(max-width: 780px\)/);
  assert.match(
    css,
    /\.synthetic-services-page \.synthetic-services-catalog\s*\{\s*width:\s*100%;\s*max-width:\s*none;\s*margin:\s*0;/,
  );
  assert.match(
    css,
    /\.synthetic-services-catalog \.synthetic-services-grid\s*\{\s*grid-template-columns:\s*repeat\(12/,
  );
  assert.match(css, /last-child:nth-child\(4n \+ 2\)/);
  assert.match(css, /last-child:nth-child\(3n \+ 2\)/);
  assert.match(css, /last-child:nth-child\(2n \+ 1\)/);
  assert.match(css, /aspect-ratio:\s*8 \/ 5/);
  assert.match(css, /\.synthetic-services-city-directory\s*\{[\s\S]*?repeat\(8/);
  assert.match(css, /@media \(min-width: 781px\) and \(max-width: 1180px\)/);
  assert.match(
    css,
    /@media \(min-width: 781px\) and \(max-width: 1180px\)[\s\S]*?\.synthetic-services-city-directory\s*\{\s*grid-template-columns:\s*repeat\(4/,
  );
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test('profile source manifest remains pending and unpromoted while selected derivatives use noindex beta delivery', () => {
  const manifest = readFileSync(
    'assets/synthetic-profiles/ASSET_MANIFEST.csv',
    'utf8',
  );
  const rows = manifest.trim().split(/\r?\n/).slice(1);
  assert.ok(rows.length >= 30);
  for (const row of rows) {
    const columns = row.split(',');
    assert.equal(columns[3], '', 'public_path must remain empty before approval');
  }
});

test('service source manifest remains pending and unpromoted while selected derivatives use noindex beta delivery', async () => {
  const manifest = readFileSync(
    'assets/synthetic-services/ASSET_MANIFEST.csv',
    'utf8',
  );
  const rows = manifest.trim().split(/\r?\n/).slice(1);
  const columns = rows.map((row) => row.split(','));
  assert.equal(rows.length, 34);
  assert.deepEqual(
    columns.map((row) => row[0]),
    [...syntheticServiceMediaKeys],
  );
  assert.equal(
    new Set(columns.map((row) => row[7])).size,
    34,
    'master files must not repeat the same image bytes',
  );
  assert.equal(
    new Set(columns.map((row) => row[8])).size,
    34,
    'selected files must not repeat the same image bytes',
  );
  for (const row of columns) {
    assert.match(
      row[3]!,
      new RegExp(`^assets/synthetic-services/selected/${row[0]}-v\\d{2}\\.webp$`, 'u'),
    );
    assert.equal(
      row[2],
      row[3]!.replace('/selected/', '/master/').replace(/\.webp$/u, '.png'),
    );
    assert.equal(existsSync(resolve(row[2]!)), true, row[2]);
    assert.equal(existsSync(resolve(row[3]!)), true, row[3]);
    assert.equal(fileSha256(row[2]!), row[7], `${row[0]} master hash`);
    assert.equal(fileSha256(row[3]!), row[8], `${row[0]} selected hash`);
    const [masterMetadata, selectedMetadata] = await Promise.all([
      sharp(resolve(row[2]!)).metadata(),
      sharp(resolve(row[3]!)).metadata(),
    ]);
    assert.equal(masterMetadata.format, 'png', `${row[0]} master format`);
    assert.equal(selectedMetadata.format, 'webp', `${row[0]} selected format`);
    assert.equal(selectedMetadata.width, 960, `${row[0]} selected width`);
    assert.equal(selectedMetadata.height, 1200, `${row[0]} selected height`);
    assert.equal(
      `${masterMetadata.width}x${masterMetadata.height}`,
      row[9],
      `${row[0]} master dimensions`,
    );
    assert.equal(`${selectedMetadata.width}x${selectedMetadata.height}`, row[10]);
    assert.equal(row[4], '', 'public_path must remain empty before approval');
    assert.equal(row[12], 'PASS_HASH_DIMENSION_FORMAT_UNIQUE');
    assert.equal(row[13], 'PENDING');
    assert.equal(row[14], 'PENDING');
  }
});

test('city image manifest validates eight unique 4:3 WebP derivatives', async () => {
  const manifest = readFileSync(
    'assets/synthetic-cities/ASSET_MANIFEST.csv',
    'utf8',
  );
  const rows = manifest.trim().split(/\r?\n/).slice(1);
  const columns = rows.map((row) => row.split(','));
  assert.equal(rows.length, 8);
  assert.deepEqual(columns.map((row) => row[0]), [...syntheticCityMediaSlugs]);
  assert.equal(new Set(columns.map((row) => row[9])).size, 8);
  assert.equal(new Set(columns.map((row) => row[10])).size, 8);

  for (const row of columns) {
    assert.equal(row[1], 'reference');
    assert.equal(row[4], '', 'public_path must remain empty before approval');
    assert.equal(row[5], 'v1');
    assert.equal(row[8], 'UNKNOWN');
    assert.equal(row[13], 'image/png');
    assert.equal(row[14], 'image/webp');
    assert.equal(row[15], 'true');
    assert.equal(row[16], 'PASS_HASH_DIMENSION_FORMAT_UNIQUE');
    assert.equal(row[17], 'PENDING');
    assert.equal(row[18], 'PENDING');
    assert.equal(row[19], 'PENDING');
    assert.equal(row[20], 'PENDING');
    assert.equal(existsSync(resolve(row[2]!)), true, row[2]);
    assert.equal(existsSync(resolve(row[3]!)), true, row[3]);
    assert.equal(fileSha256(row[2]!), row[9], `${row[0]} master hash`);
    assert.equal(fileSha256(row[3]!), row[10], `${row[0]} selected hash`);

    const [masterMetadata, selectedMetadata] = await Promise.all([
      sharp(resolve(row[2]!)).metadata(),
      sharp(resolve(row[3]!)).metadata(),
    ]);
    assert.equal(masterMetadata.format, 'png');
    assert.equal(selectedMetadata.format, 'webp');
    assert.equal(selectedMetadata.width, 1200);
    assert.equal(selectedMetadata.height, 900);
    assert.equal(`${masterMetadata.width}x${masterMetadata.height}`, row[11]);
    assert.equal(`${selectedMetadata.width}x${selectedMetadata.height}`, row[12]);
  }
});
