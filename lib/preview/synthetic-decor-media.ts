import type { SyntheticMediaScope } from './synthetic-preview.ts';

export const syntheticDecorMediaKeys = [
  'border-filigree',
  'border-filigree-left',
  'border-filigree-right',
] as const;

export type SyntheticDecorMediaKey =
  (typeof syntheticDecorMediaKeys)[number];

export type SyntheticDecorMedia = {
  key: SyntheticDecorMediaKey;
  desktopUrl: string;
  sourcePath: string;
  contentType: 'image/webp';
  width: number;
  height: number;
};

const mediaDefinitions: Readonly<
  Record<
    SyntheticDecorMediaKey,
    { filename: string; width: number; height: number }
  >
> = {
  'border-filigree': {
    filename: 'border-filigree-mosaic-v04.webp',
    width: 768,
    height: 768,
  },
  'border-filigree-left': {
    filename: 'border-filigree-left-v05.webp',
    width: 320,
    height: 1056,
  },
  'border-filigree-right': {
    filename: 'border-filigree-right-v05.webp',
    width: 320,
    height: 1056,
  },
};

export function isSyntheticDecorMediaKey(
  value: unknown,
): value is SyntheticDecorMediaKey {
  return syntheticDecorMediaKeys.includes(value as SyntheticDecorMediaKey);
}

export function getSyntheticDecorMedia(
  key: SyntheticDecorMediaKey,
  scope: SyntheticMediaScope = 'local-preview',
): SyntheticDecorMedia {
  const definition = mediaDefinitions[key];
  return {
    key,
    desktopUrl:
      scope === 'public-beta'
        ? `/beta-media/decor/${key}`
        : `/preview-local-sintetico/decor-media/${key}`,
    sourcePath: `assets/synthetic-decor/selected/${definition.filename}`,
    contentType: 'image/webp',
    width: definition.width,
    height: definition.height,
  };
}
