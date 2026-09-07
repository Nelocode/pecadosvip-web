import { evaluateRelease } from './release-gates.ts';
import { buildRouteManifest } from './route-manifest.ts';
import { citySlugs } from './types.ts';
import type {
  Availability,
  CitySlug,
  ContentSnapshot,
  MediaAsset,
  Profile,
  ProfileMeasurements,
} from './types.ts';

export type PublicMedia = Pick<
  MediaAsset,
  'kind' | 'desktopUrl' | 'mobileUrl' | 'alt' | 'order'
>;

export type PublicProfileCard = {
  slug: string;
  displayName: string;
  age: number;
  availability: Availability;
  citySlugs: CitySlug[];
  cover: PublicMedia;
};

export type PublicProfileDetail = PublicProfileCard & {
  biography: string;
  measurements: ProfileMeasurements;
  languages: string[];
  services: Array<{ slug: string; name: string }>;
  media: PublicMedia[];
};

export type PublicProfileQuery = {
  city?: string;
  availability?: string;
  minAge?: number;
  maxAge?: number;
  serviceSlug?: string;
  page?: number;
  pageSize?: number;
};

export type PublicProfileQueryResult =
  | {
      ok: true;
      items: PublicProfileCard[];
      total: number;
      page: number;
      pageSize: number;
    }
  | {
      ok: false;
      reason: 'RELEASE_NOT_READY' | 'INVALID_QUERY';
      items: [];
      total: 0;
      page: number;
      pageSize: number;
    };

const availabilityValues: readonly Availability[] = [
  'available',
  'limited',
  'unavailable',
  'on-request',
];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export function isValidPublicProfileQuery(
  query: PublicProfileQuery,
): boolean {
  if (
    query.city !== undefined &&
    !citySlugs.includes(query.city as CitySlug)
  ) {
    return false;
  }
  if (
    query.availability !== undefined &&
    !availabilityValues.includes(query.availability as Availability)
  ) {
    return false;
  }
  if (
    query.serviceSlug !== undefined &&
    !slugPattern.test(query.serviceSlug)
  ) {
    return false;
  }
  if (
    query.minAge !== undefined &&
    (!Number.isSafeInteger(query.minAge) || query.minAge < 18)
  ) {
    return false;
  }
  if (
    query.maxAge !== undefined &&
    (!Number.isSafeInteger(query.maxAge) || query.maxAge < 18)
  ) {
    return false;
  }
  if (
    query.minAge !== undefined &&
    query.maxAge !== undefined &&
    query.minAge > query.maxAge
  ) {
    return false;
  }
  if (query.page !== undefined && !isPositiveInteger(query.page)) {
    return false;
  }
  if (
    query.pageSize !== undefined &&
    (!isPositiveInteger(query.pageSize) || query.pageSize > 50)
  ) {
    return false;
  }
  return true;
}

function publicProfileSlugs(snapshot: ContentSnapshot): Set<string> | undefined {
  if (!evaluateRelease(snapshot).ok) {
    return undefined;
  }
  return new Set(
    buildRouteManifest(snapshot)
      .filter((route) => route.kind === 'profile' && route.indexable)
      .map((route) => route.path.replace(/^\/perfiles\//, '')),
  );
}

function publicMedia(media: MediaAsset): PublicMedia {
  return {
    kind: media.kind,
    desktopUrl: media.desktopUrl,
    mobileUrl: media.mobileUrl,
    alt: media.alt,
    order: media.order,
  };
}

function toCard(profile: Profile): PublicProfileCard | undefined {
  if (typeof profile.age !== 'number') return undefined;
  const orderedMedia = [...profile.media].sort(
    (left, right) => left.order - right.order,
  );
  const cover = orderedMedia[0];
  if (!cover) return undefined;

  return {
    slug: profile.slug,
    displayName: profile.displayName,
    age: profile.age,
    availability: profile.availability,
    citySlugs: [...profile.citySlugs],
    cover: publicMedia(cover),
  };
}

export function queryPublicProfiles(
  snapshot: ContentSnapshot,
  query: PublicProfileQuery = {},
): PublicProfileQueryResult {
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 24;
  if (!isValidPublicProfileQuery(query)) {
    return {
      ok: false,
      reason: 'INVALID_QUERY',
      items: [],
      total: 0,
      page: isPositiveInteger(page) ? page : 1,
      pageSize:
        isPositiveInteger(pageSize) && pageSize <= 50 ? pageSize : 24,
    };
  }

  const publicSlugs = publicProfileSlugs(snapshot);
  if (!publicSlugs) {
    return {
      ok: false,
      reason: 'RELEASE_NOT_READY',
      items: [],
      total: 0,
      page,
      pageSize,
    };
  }

  const serviceIds = query.serviceSlug
    ? new Set(
        snapshot.services
          .filter((service) => service.slug === query.serviceSlug)
          .map((service) => service.id),
      )
    : undefined;
  const cards = snapshot.profiles
    .filter((profile) => publicSlugs.has(profile.slug))
    .filter(
      (profile) =>
        query.city === undefined ||
        profile.citySlugs.includes(query.city as CitySlug),
    )
    .filter(
      (profile) =>
        query.availability === undefined ||
        profile.availability === query.availability,
    )
    .filter(
      (profile) =>
        query.minAge === undefined ||
        (typeof profile.age === 'number' && profile.age >= query.minAge),
    )
    .filter(
      (profile) =>
        query.maxAge === undefined ||
        (typeof profile.age === 'number' && profile.age <= query.maxAge),
    )
    .filter(
      (profile) =>
        serviceIds === undefined ||
        profile.serviceIds.some((serviceId) => serviceIds.has(serviceId)),
    )
    .map(toCard)
    .filter((profile): profile is PublicProfileCard => profile !== undefined)
    .sort((left, right) => left.slug.localeCompare(right.slug));
  const offset = (page - 1) * pageSize;

  return {
    ok: true,
    items: cards.slice(offset, offset + pageSize),
    total: cards.length,
    page,
    pageSize,
  };
}

export function getPublicProfileDetail(
  snapshot: ContentSnapshot,
  slug: string,
): PublicProfileDetail | undefined {
  if (!slugPattern.test(slug)) return undefined;
  const publicSlugs = publicProfileSlugs(snapshot);
  if (!publicSlugs?.has(slug)) return undefined;

  const profile = snapshot.profiles.find(
    (candidate) => candidate.slug === slug,
  );
  if (!profile) return undefined;
  const card = toCard(profile);
  if (!card) return undefined;
  const servicesById = new Map(
    snapshot.services.map((service) => [service.id, service]),
  );

  return {
    ...card,
    biography: profile.biography,
    measurements: structuredClone(profile.measurements),
    languages: [...profile.languages],
    services: profile.serviceIds.flatMap((serviceId) => {
      const service = servicesById.get(serviceId);
      return service
        ? [{ slug: service.slug, name: service.name }]
        : [];
    }),
    media: [...profile.media]
      .sort((left, right) => left.order - right.order)
      .map(publicMedia),
  };
}
