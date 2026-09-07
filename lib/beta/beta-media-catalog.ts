import {
  getSyntheticCityMedia,
  isSyntheticCityMediaSlug,
  syntheticCityMediaSlugs,
} from '../preview/synthetic-city-media.ts';
import {
  getSyntheticDecorMedia,
  isSyntheticDecorMediaKey,
  syntheticDecorMediaKeys,
} from '../preview/synthetic-decor-media.ts';
import {
  getSyntheticHeroMedia,
  isSyntheticHeroMediaKey,
  syntheticHeroMediaKeys,
} from '../preview/synthetic-hero-media.ts';
import {
  getSyntheticPreviewAsset,
  getSyntheticPreviewProfiles,
  syntheticPreviewAssetRoles,
} from '../preview/synthetic-preview.ts';
import {
  getSyntheticServiceMedia,
  isSyntheticServiceMediaKey,
  syntheticServiceMediaKeys,
} from '../preview/synthetic-service-media.ts';

export const BETA_MEDIA_BASE_PATH = '/beta-media' as const;

export type BetaMediaAsset = Readonly<{
  sourcePath: string;
  publicPath: string;
  contentType: 'image/png' | 'image/webp';
}>;

function betaAsset(
  sourcePath: string,
  publicPath: string,
  contentType: BetaMediaAsset['contentType'],
): BetaMediaAsset {
  return Object.freeze({ sourcePath, publicPath, contentType });
}

export function getBetaProfileMedia(
  profileSlug: string,
  role: string,
): BetaMediaAsset | undefined {
  const media = getSyntheticPreviewAsset(profileSlug, role, 'public-beta');
  return media
    ? betaAsset(
        media.sourcePath,
        media.desktopUrl,
        media.contentType,
      )
    : undefined;
}

export function getBetaHeroMedia(key: string): BetaMediaAsset | undefined {
  if (!isSyntheticHeroMediaKey(key)) return undefined;
  const media = getSyntheticHeroMedia(key, 'public-beta');
  return betaAsset(
    media.sourcePath,
    media.desktopUrl,
    media.contentType,
  );
}

export function getBetaCityMedia(citySlug: string): BetaMediaAsset | undefined {
  if (!isSyntheticCityMediaSlug(citySlug)) return undefined;
  const media = getSyntheticCityMedia(citySlug, 'es', 'public-beta');
  return betaAsset(
    media.sourcePath,
    media.desktopUrl,
    media.contentType,
  );
}

export function getBetaServiceMedia(key: string): BetaMediaAsset | undefined {
  if (!isSyntheticServiceMediaKey(key)) return undefined;
  const media = getSyntheticServiceMedia(key, 'es', 'public-beta');
  return betaAsset(
    media.sourcePath,
    media.desktopUrl,
    media.contentType,
  );
}

export function getBetaDecorMedia(key: string): BetaMediaAsset | undefined {
  if (!isSyntheticDecorMediaKey(key)) return undefined;
  const media = getSyntheticDecorMedia(key, 'public-beta');
  return betaAsset(
    media.sourcePath,
    media.desktopUrl,
    media.contentType,
  );
}

const catalogAssets = [
  ...getSyntheticPreviewProfiles().flatMap((profile) =>
    syntheticPreviewAssetRoles.flatMap((role) => {
      const asset = getBetaProfileMedia(profile.slug, role);
      return asset ? [asset] : [];
    }),
  ),
  ...syntheticHeroMediaKeys.flatMap((key) => {
    const asset = getBetaHeroMedia(key);
    return asset ? [asset] : [];
  }),
  ...syntheticCityMediaSlugs.flatMap((citySlug) => {
    const asset = getBetaCityMedia(citySlug);
    return asset ? [asset] : [];
  }),
  ...syntheticServiceMediaKeys.flatMap((key) => {
    const asset = getBetaServiceMedia(key);
    return asset ? [asset] : [];
  }),
  ...syntheticDecorMediaKeys.flatMap((key) => {
    const asset = getBetaDecorMedia(key);
    return asset ? [asset] : [];
  }),
];

export const betaRuntimeAssetPaths = Object.freeze(
  [...new Set(catalogAssets.map((asset) => asset.sourcePath))].sort(),
);

export const betaMediaPublicPaths = Object.freeze(
  [...new Set(catalogAssets.map((asset) => asset.publicPath))].sort(),
);
