import type { PublicMedia } from '../content/public-profiles.ts';
import type { SyntheticMediaScope } from './synthetic-preview.ts';

export const syntheticHeroMediaKeys = ['home-editorial'] as const;

export type SyntheticHeroMediaKey = (typeof syntheticHeroMediaKeys)[number];

export type SyntheticHeroMedia = PublicMedia & {
  key: SyntheticHeroMediaKey;
  sourcePath: string;
  contentType: 'image/webp';
  width: number;
  height: number;
};

const mediaDefinitions: Readonly<
  Record<
    SyntheticHeroMediaKey,
    {
      filename: string;
      alt: string;
      width: number;
      height: number;
    }
  >
> = {
  'home-editorial': {
    filename: 'home-hero-editorial-v01.webp',
    alt: 'Mujer adulta sintética con vestido negro y copa en un salón de hotel cálido',
    width: 1536,
    height: 1024,
  },
};

export function isSyntheticHeroMediaKey(
  value: unknown,
): value is SyntheticHeroMediaKey {
  return syntheticHeroMediaKeys.includes(value as SyntheticHeroMediaKey);
}

export function getSyntheticHeroMedia(
  key: SyntheticHeroMediaKey,
  scope: SyntheticMediaScope = 'local-preview',
): SyntheticHeroMedia {
  const definition = mediaDefinitions[key];
  return {
    key,
    kind: 'image',
    order: 1,
    desktopUrl:
      scope === 'public-beta'
        ? `/beta-media/hero/${key}`
        : `/preview-local-sintetico/hero-media/${key}`,
    alt: definition.alt,
    sourcePath: `assets/synthetic-hero/selected/${definition.filename}`,
    contentType: 'image/webp',
    width: definition.width,
    height: definition.height,
  };
}
