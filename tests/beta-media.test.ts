import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

import { GET as cityMediaGET } from '../app/(legacy)/beta-media/cities/[citySlug]/route.ts';
import { GET as decorMediaGET } from '../app/(legacy)/beta-media/decor/[key]/route.ts';
import { GET as heroMediaGET } from '../app/(legacy)/beta-media/hero/[key]/route.ts';
import { GET as profileMediaGET } from '../app/(legacy)/beta-media/profiles/[profileSlug]/[role]/route.ts';
import { GET as serviceMediaGET } from '../app/(legacy)/beta-media/services/[service]/route.ts';
import {
  betaMediaPublicPaths,
  betaRuntimeAssetPaths,
  getBetaCityMedia,
  getBetaDecorMedia,
  getBetaHeroMedia,
  getBetaProfileMedia,
  getBetaServiceMedia,
  type BetaMediaAsset,
} from '../lib/beta/beta-media-catalog.ts';
import {
  buildBetaMediaHeaders,
  serveBetaMediaAsset,
} from '../lib/beta/beta-media-response.ts';
import { getSyntheticCityMedia } from '../lib/preview/synthetic-city-media.ts';
import { getSyntheticDecorMedia } from '../lib/preview/synthetic-decor-media.ts';
import { getSyntheticHeroMedia } from '../lib/preview/synthetic-hero-media.ts';
import {
  getSyntheticPreviewAsset,
  getSyntheticPreviewProfiles,
} from '../lib/preview/synthetic-preview.ts';
import { getSyntheticServiceMedia } from '../lib/preview/synthetic-service-media.ts';

test('public beta scope changes media URLs without changing local preview defaults', () => {
  assert.equal(
    getSyntheticPreviewAsset('sofia', 'cover')?.desktopUrl,
    '/preview-local-sintetico/media/sofia/cover',
  );
  assert.equal(
    getSyntheticPreviewAsset('sofia', 'cover', 'public-beta')?.desktopUrl,
    '/beta-media/profiles/sofia/cover',
  );
  assert.equal(
    getSyntheticPreviewProfiles('public-beta')[0]?.cover.desktopUrl.startsWith(
      '/beta-media/profiles/',
    ),
    true,
  );
  assert.equal(
    getSyntheticCityMedia('madrid', 'es').desktopUrl,
    '/preview-local-sintetico/city-media/madrid',
  );
  assert.equal(
    getSyntheticCityMedia('madrid', 'es', 'public-beta').desktopUrl,
    '/beta-media/cities/madrid',
  );
  assert.equal(
    getSyntheticServiceMedia('settings-home-arrival', 'es').desktopUrl,
    '/preview-local-sintetico/service-media/settings-home-arrival',
  );
  assert.equal(
    getSyntheticServiceMedia(
      'settings-home-arrival',
      'es',
      'public-beta',
    ).desktopUrl,
    '/beta-media/services/settings-home-arrival',
  );
  assert.equal(
    getSyntheticHeroMedia('home-editorial').desktopUrl,
    '/preview-local-sintetico/hero-media/home-editorial',
  );
  assert.equal(
    getSyntheticHeroMedia('home-editorial', 'public-beta').desktopUrl,
    '/beta-media/hero/home-editorial',
  );
  assert.equal(
    getSyntheticDecorMedia('border-filigree').desktopUrl,
    '/preview-local-sintetico/decor-media/border-filigree',
  );
  assert.equal(
    getSyntheticDecorMedia('border-filigree', 'public-beta').desktopUrl,
    '/beta-media/decor/border-filigree',
  );
});

test('beta media catalog contains only unique selected derivatives that exist', () => {
  assert.equal(betaRuntimeAssetPaths.length, 70);
  assert.equal(new Set(betaRuntimeAssetPaths).size, betaRuntimeAssetPaths.length);
  assert.equal(new Set(betaMediaPublicPaths).size, betaMediaPublicPaths.length);
  assert.equal(betaMediaPublicPaths.length, betaRuntimeAssetPaths.length);
  assert.equal(
    betaRuntimeAssetPaths.includes(
      'assets/synthetic-profiles/alicia/gallery/alicia-gallery-02-v01.png',
    ),
    false,
  );

  for (const sourcePath of betaRuntimeAssetPaths) {
    assert.equal(existsSync(sourcePath), true, sourcePath);
    assert.match(
      sourcePath,
      /^assets\/synthetic-(?:cities|decor|hero|profiles|services)\//u,
    );
    assert.doesNotMatch(sourcePath, /\/(?:master|ASSET_MANIFEST\.csv)(?:\/|$)/u);
  }
  for (const publicPath of betaMediaPublicPaths) {
    assert.match(
      publicPath,
      /^\/beta-media\/(?:cities|decor|hero|profiles|services)\//u,
    );
    assert.doesNotMatch(publicPath, /preview-local-sintetico/u);
  }
});

test('beta media response is same-origin, no-sniff and non-indexable', async () => {
  assert.deepEqual(buildBetaMediaHeaders('image/webp', 12), {
    'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    'Content-Type': 'image/webp',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, noimageindex',
    'Content-Length': '12',
  });

  const response = await serveBetaMediaAsset(
    getBetaHeroMedia('home-editorial'),
  );
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.equal(response.headers.get('cross-origin-resource-policy'), 'same-origin');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('x-robots-tag') ?? '', /noimageindex/u);
  assert.equal(
    Number(response.headers.get('content-length')),
    (await response.arrayBuffer()).byteLength,
  );

  const unsafe: BetaMediaAsset = {
    sourcePath: 'package.json',
    publicPath: '/beta-media/hero/unsafe',
    contentType: 'image/webp',
  };
  const rejected = await serveBetaMediaAsset(unsafe);
  assert.equal(rejected.status, 404);
  assert.equal(rejected.headers.get('cache-control'), 'no-store');
});

test('all beta route families serve catalog assets and reject unknown keys', async () => {
  const request = new Request('https://beta.invalid/beta-media');
  const responses = await Promise.all([
    profileMediaGET(request, {
      params: Promise.resolve({ profileSlug: 'sofia', role: 'cover' }),
    }),
    heroMediaGET(request, {
      params: Promise.resolve({ key: 'home-editorial' }),
    }),
    cityMediaGET(request, {
      params: Promise.resolve({ citySlug: 'madrid' }),
    }),
    serviceMediaGET(request, {
      params: Promise.resolve({ service: 'settings-home-arrival' }),
    }),
    decorMediaGET(request, {
      params: Promise.resolve({ key: 'border-filigree' }),
    }),
  ]);
  assert.equal(responses.every((response) => response.status === 200), true);

  const rejected = await Promise.all([
    profileMediaGET(request, {
      params: Promise.resolve({ profileSlug: '../sofia', role: 'cover' }),
    }),
    heroMediaGET(request, { params: Promise.resolve({ key: '../hero' }) }),
    cityMediaGET(request, { params: Promise.resolve({ citySlug: '../madrid' }) }),
    serviceMediaGET(request, { params: Promise.resolve({ service: '../service' }) }),
    decorMediaGET(request, { params: Promise.resolve({ key: '../decor' }) }),
  ]);
  assert.equal(rejected.every((response) => response.status === 404), true);
});

test('preview route family remains guarded and separate from public beta media', () => {
  const previewRoutes = [
    'app/(legacy)/preview-local-sintetico/media/[profileSlug]/[role]/route.ts',
    'app/(legacy)/preview-local-sintetico/hero-media/[key]/route.ts',
    'app/(legacy)/preview-local-sintetico/city-media/[citySlug]/route.ts',
    'app/(legacy)/preview-local-sintetico/service-media/[service]/route.ts',
    'app/(legacy)/preview-local-sintetico/decor-media/[key]/route.ts',
  ];
  for (const routePath of previewRoutes) {
    const source = readFileSync(routePath, 'utf8');
    assert.match(source, /isSyntheticPreviewRequestAllowed/u);
    assert.match(source, /status:\s*404/u);
    assert.doesNotMatch(source, /beta-media-response/u);
  }
});

test('beta catalog getters reject unknown keys before any filesystem read', () => {
  assert.equal(getBetaProfileMedia('../sofia', 'cover'), undefined);
  assert.equal(getBetaProfileMedia('sofia', '../cover'), undefined);
  assert.equal(getBetaHeroMedia('../home-editorial'), undefined);
  assert.equal(getBetaCityMedia('../madrid'), undefined);
  assert.equal(getBetaServiceMedia('../settings-home-arrival'), undefined);
  assert.equal(getBetaDecorMedia('../border-filigree'), undefined);
});
