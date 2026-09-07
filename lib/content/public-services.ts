import { evaluateRelease } from './release-gates.ts';
import {
  queryPublicProfiles,
  type PublicProfileCard,
} from './public-profiles.ts';
import { buildRouteManifest } from './route-manifest.ts';
import type { ContentSnapshot } from './types.ts';

export type PublicService = {
  slug: string;
  name: string;
  description: string;
  profileCount: number;
};

export function getPublicServices(snapshot: ContentSnapshot): PublicService[] {
  if (!evaluateRelease(snapshot).ok) return [];

  const routedSlugs = new Set(
    buildRouteManifest(snapshot)
      .filter((route) => route.kind === 'service' && route.indexable)
      .map((route) => route.path.replace(/^\/servicios\//u, '')),
  );
  const serviceById = new Map(snapshot.services.map((service) => [service.id, service]));
  const profileCountByServiceId = new Map<string, number>();
  const publicProfileSlugs = new Set(
    buildRouteManifest(snapshot)
      .filter((route) => route.kind === 'profile' && route.indexable)
      .map((route) => route.path.replace(/^\/perfiles\//u, '')),
  );

  for (const profile of snapshot.profiles) {
    if (!publicProfileSlugs.has(profile.slug)) continue;
    for (const serviceId of profile.serviceIds) {
      profileCountByServiceId.set(
        serviceId,
        (profileCountByServiceId.get(serviceId) ?? 0) + 1,
      );
    }
  }

  return [...serviceById.values()]
    .filter((service) => routedSlugs.has(service.slug))
    .map((service) => ({
      slug: service.slug,
      name: service.name,
      description: service.description,
      profileCount: profileCountByServiceId.get(service.id) ?? 0,
    }))
    .sort((left, right) => left.name.localeCompare(right.name, 'es'));
}

export function getPublicService(
  snapshot: ContentSnapshot,
  slug: string,
): PublicService | undefined {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(slug)) return undefined;
  return getPublicServices(snapshot).find((service) => service.slug === slug);
}

export function getPublicProfilesForService(
  snapshot: ContentSnapshot,
  slug: string,
): PublicProfileCard[] | undefined {
  if (!getPublicService(snapshot, slug)) return undefined;

  const pageSize = 50;
  const first = queryPublicProfiles(snapshot, {
    serviceSlug: slug,
    page: 1,
    pageSize,
  });
  if (!first.ok) return undefined;

  const items = [...first.items];
  const pageCount = Math.ceil(first.total / pageSize);
  for (let page = 2; page <= pageCount; page += 1) {
    const result = queryPublicProfiles(snapshot, {
      serviceSlug: slug,
      page,
      pageSize,
    });
    if (!result.ok || result.total !== first.total) return undefined;
    items.push(...result.items);
  }

  return items.length === first.total ? items : undefined;
}
