import type {
  PublicMedia,
  PublicProfileCard,
} from '../content/public-profiles.ts';
import type { Availability, CitySlug } from '../content/types.ts';

export const SYNTHETIC_PREVIEW_PATH = '/preview-local-sintetico';
export const SYNTHETIC_PREVIEW_FLAG = 'PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW';

export type SyntheticMediaScope = 'local-preview' | 'public-beta';

export type SyntheticPreviewEnvironment = {
  NODE_ENV?: string;
  PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW?: string;
};

export type SyntheticPreviewBuildEnvironment = {
  DEV?: boolean;
  VITE_PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW?: string;
};

export const syntheticPreviewAssetRoles = [
  'cover',
  'gallery-01',
  'gallery-02',
  'gallery-03',
] as const;

export type SyntheticPreviewAssetRole =
  (typeof syntheticPreviewAssetRoles)[number];

export type SyntheticPreviewMedia = PublicMedia & {
  role: SyntheticPreviewAssetRole;
  label: string;
  sourcePath: string;
  contentType: 'image/png';
};

export type SyntheticPreviewProfile = PublicProfileCard & {
  syntheticNotice: 'Perfil ficticio generado con IA';
  biography: string;
  conceptTags: string[];
  media: SyntheticPreviewMedia[];
};

export type SyntheticPreviewFilters = {
  city?: CitySlug;
  availability?: Availability;
};

function media(
  slug: string,
  displayName: string,
  role: SyntheticPreviewAssetRole,
  filename: string,
  label: string,
): SyntheticPreviewMedia {
  return {
    kind: 'image',
    role,
    label,
    sourcePath: `assets/synthetic-profiles/${slug}/${
      role === 'cover' ? 'cover' : 'gallery'
    }/${filename}`,
    desktopUrl: `${SYNTHETIC_PREVIEW_PATH}/media/${slug}/${role}`,
    alt: `${label} de ${displayName}, identidad adulta ficticia generada con IA`,
    order: syntheticPreviewAssetRoles.indexOf(role),
    contentType: 'image/png',
  };
}

function profile(
  card: Omit<PublicProfileCard, 'cover'>,
  biography: string,
  conceptTags: string[],
  filenames: Record<SyntheticPreviewAssetRole, string>,
): SyntheticPreviewProfile {
  const gallery = syntheticPreviewAssetRoles.map((role) =>
    media(
      card.slug,
      card.displayName,
      role,
      filenames[role],
      role === 'cover' ? 'Retrato de portada' : `Escena editorial ${role.slice(-2)}`,
    ),
  );
  return {
    ...card,
    cover: gallery[0]!,
    syntheticNotice: 'Perfil ficticio generado con IA',
    biography,
    conceptTags,
    media: gallery,
  };
}

const previewProfiles: readonly SyntheticPreviewProfile[] = [
  profile(
    {
      slug: 'valeria',
      displayName: 'Valeria',
      age: 27,
      availability: 'available',
      citySlugs: ['madrid'],
    },
    'Concepto editorial ficticio de elegancia mediterránea, creado para validar la presentación visual del perfil en Madrid.',
    ['Elegancia mediterránea', 'Ambiente boutique', 'Estilo sereno'],
    {
      cover: 'valeria-cover-v01.png',
      'gallery-01': 'valeria-gallery-01-v01.png',
      'gallery-02': 'valeria-gallery-02-v01.png',
      'gallery-03': 'valeria-gallery-03-v01.png',
    },
  ),
  profile(
    {
      slug: 'sofia',
      displayName: 'Sofía',
      age: 31,
      availability: 'available',
      citySlugs: ['barcelona'],
    },
    'Concepto editorial ficticio de presencia sofisticada y tranquila, creado para comprobar el perfil visual de Barcelona.',
    ['Presencia sofisticada', 'Estética contemporánea', 'Estilo sereno'],
    {
      cover: 'sofia-cover-v01.png',
      'gallery-01': 'sofia-gallery-01-v01.png',
      'gallery-02': 'sofia-gallery-02-v01.png',
      'gallery-03': 'sofia-gallery-03-v01.png',
    },
  ),
  profile(
    {
      slug: 'lucia',
      displayName: 'Lucía',
      age: 29,
      availability: 'limited',
      citySlugs: ['madrid', 'barcelona'],
    },
    'Concepto editorial ficticio de carácter independiente y natural, preparado para probar una ficha con presencia en dos ciudades.',
    ['Carácter independiente', 'Estética nocturna', 'Cobertura dual simulada'],
    {
      cover: 'lucia-cover-v01.png',
      'gallery-01': 'lucia-gallery-01-v01.png',
      'gallery-02': 'lucia-gallery-02-v01.png',
      'gallery-03': 'lucia-gallery-03-v01.png',
    },
  ),
  profile(
    {
      slug: 'julia',
      displayName: 'Julia',
      age: 34,
      availability: 'on-request',
      citySlugs: ['girona'],
    },
    'Concepto editorial ficticio de imagen refinada y madura, utilizado para revisar el estado de consulta previa en Girona.',
    ['Imagen refinada', 'Inspiración Girona', 'Consulta simulada'],
    {
      cover: 'julia-cover-v01.png',
      'gallery-01': 'julia-gallery-01-v01.png',
      'gallery-02': 'julia-gallery-02-v01.png',
      'gallery-03': 'julia-gallery-03-v01.png',
    },
  ),
  profile(
    {
      slug: 'mia',
      displayName: 'Mia',
      age: 26,
      availability: 'available',
      citySlugs: ['barcelona'],
    },
    'Concepto editorial ficticio de estética minimalista y cálida, creado para validar una segunda identidad visual en Barcelona.',
    ['Estética minimalista', 'Ambiente cálido', 'Estilo contemporáneo'],
    {
      cover: 'mia-cover-v01.png',
      'gallery-01': 'mia-gallery-01-v01.png',
      'gallery-02': 'mia-gallery-02-v01.png',
      'gallery-03': 'mia-gallery-03-v01.png',
    },
  ),
  profile(
    {
      slug: 'alicia',
      displayName: 'Alicia',
      age: 32,
      availability: 'limited',
      citySlugs: ['madrid'],
    },
    'Concepto editorial ficticio de estilo elegante y contemporáneo, incorporado para comprobar la variedad visual del catálogo de Madrid.',
    ['Estilo elegante', 'Retrato contemporáneo', 'Disponibilidad simulada'],
    {
      cover: 'alicia-cover-v01.png',
      'gallery-01': 'alicia-gallery-01-v01.png',
      'gallery-02': 'alicia-gallery-02-v02.png',
      'gallery-03': 'alicia-gallery-03-v01.png',
    },
  ),
];

export function isSyntheticPreviewEnabled(
  environment: SyntheticPreviewEnvironment = process.env,
): boolean {
  return (
    environment.NODE_ENV !== 'production' &&
    (environment.NODE_ENV === 'development' || environment.NODE_ENV === 'test') &&
    environment.PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW === '1'
  );
}

export function isSyntheticPreviewRequestAllowed(
  hostHeader: string | null | undefined,
  environment: SyntheticPreviewEnvironment = process.env,
): boolean {
  if (
    environment.NODE_ENV !== 'development' ||
    !isSyntheticPreviewEnabled(environment) ||
    !hostHeader
  ) {
    return false;
  }
  if (hostHeader.includes(',') || /[\x00-\x20]/.test(hostHeader)) return false;
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.toLowerCase();
    return (
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname === '::1' ||
      hostname === 'localhost'
    );
  } catch {
    return false;
  }
}

export function getSyntheticPreviewBuildEnvironment(
  environment: SyntheticPreviewBuildEnvironment,
): SyntheticPreviewEnvironment {
  return {
    NODE_ENV: environment.DEV ? 'development' : 'production',
    PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW:
      environment.VITE_PECADOSVIP_LOCAL_SYNTHETIC_PREVIEW,
  };
}

export function buildSyntheticPreviewMediaHeaders(
  contentType: string,
): Record<string, string> {
  return {
    'Content-Type': contentType,
    'Cache-Control': 'private, no-store',
    'X-Robots-Tag': 'noindex, nofollow, noarchive, noimageindex',
  };
}

export function getSyntheticPreviewProfiles(
  scope: SyntheticMediaScope = 'local-preview',
): SyntheticPreviewProfile[] {
  return previewProfiles.map((candidate) => scopedProfile(candidate, scope));
}

export function getSyntheticPreviewProfile(
  slug: string,
  scope: SyntheticMediaScope = 'local-preview',
): SyntheticPreviewProfile | undefined {
  const candidate = previewProfiles.find((item) => item.slug === slug);
  return candidate ? scopedProfile(candidate, scope) : undefined;
}

export function getSyntheticPreviewAsset(
  profileSlug: string,
  role: string,
  scope: SyntheticMediaScope = 'local-preview',
): SyntheticPreviewMedia | undefined {
  if (!syntheticPreviewAssetRoles.includes(role as SyntheticPreviewAssetRole)) {
    return undefined;
  }
  const candidate = previewProfiles
    .find((item) => item.slug === profileSlug)
    ?.media.find((item) => item.role === role);
  return candidate ? scopedMedia(candidate, scope) : undefined;
}

export function filterSyntheticPreviewProfiles(
  filters: SyntheticPreviewFilters,
  scope: SyntheticMediaScope = 'local-preview',
): SyntheticPreviewProfile[] {
  return getSyntheticPreviewProfiles(scope)
    .filter(
      (candidate) =>
        filters.city === undefined ||
        candidate.citySlugs.includes(filters.city),
    )
    .filter(
      (candidate) =>
        filters.availability === undefined ||
        candidate.availability === filters.availability,
    );
}

function scopedMedia(
  candidate: SyntheticPreviewMedia,
  scope: SyntheticMediaScope,
): SyntheticPreviewMedia {
  const cloned = structuredClone(candidate);
  if (scope === 'public-beta') {
    cloned.desktopUrl = `/beta-media/profiles/${candidate.sourcePath.split('/')[2]}/${candidate.role}`;
  }
  return cloned;
}

function scopedProfile(
  candidate: SyntheticPreviewProfile,
  scope: SyntheticMediaScope,
): SyntheticPreviewProfile {
  const cloned = structuredClone(candidate);
  cloned.media = cloned.media.map((item) => scopedMedia(item, scope));
  cloned.cover = cloned.media[0]!;
  return cloned;
}
