import { evaluateRelease } from './release-gates.ts';
import {
  isProfilePublicationReady,
  isServicePublicationReady,
} from './validation.ts';
import {
  localizedPath,
  SOURCE_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from '../i18n/locales.ts';
import type {
  ApprovalRecord,
  CityPage,
  ContentSnapshot,
  Profile,
} from './types.ts';

export type RouteEntry = {
  path: string;
  kind:
    | 'home'
    | 'city'
    | 'profiles'
    | 'profile'
    | 'services'
    | 'service'
    | 'contact'
    | 'legal';
  indexable: boolean;
  lastModified?: string;
};

export type LocalizedRouteEntry = RouteEntry & {
  locale: Locale;
  semanticPath: string;
};

function hasApprovalEvidence(approval: ApprovalRecord): boolean {
  return Boolean(
    approval.state === 'approved' &&
      approval.approvedBy?.trim() &&
      approval.approvedAt?.trim() &&
      approval.sourceReference?.trim(),
  );
}

function isCityPublishable(city: CityPage): boolean {
  return Boolean(
    city.status === 'published' &&
      city.seo.indexable &&
      city.serviceConfirmed &&
      hasApprovalEvidence(city.approval) &&
      city.headline.trim() &&
      city.introduction.trim() &&
      city.differentiators.length > 0 &&
      city.coverageAreas.length > 0 &&
      city.coverageAreas.every((area) => area.confirmed) &&
      city.faqs.length > 0,
  );
}

function isProfilePublishable(profile: Profile): boolean {
  return profile.status === 'published' && isProfilePublicationReady(profile);
}

export function buildRouteManifest(snapshot: ContentSnapshot): RouteEntry[] {
  const releaseReady = evaluateRelease(snapshot).ok;
  const publishableCities = new Set(
    snapshot.cities.filter(isCityPublishable).map((city) => city.slug),
  );
  const publishableServices = new Set(
    snapshot.services
      .filter(isServicePublicationReady)
      .map((service) => service.id),
  );
  const routedServiceIds = new Set<string>();
  const routes: RouteEntry[] = [
    { path: '/', kind: 'home', indexable: releaseReady },
    { path: '/perfiles', kind: 'profiles', indexable: releaseReady },
    { path: '/servicios', kind: 'services', indexable: releaseReady },
    { path: '/contacto', kind: 'contact', indexable: releaseReady },
  ];

  for (const city of snapshot.cities) {
    if (isCityPublishable(city)) {
      routes.push({
        path: `/${city.slug}`,
        kind: 'city',
        indexable: releaseReady && city.seo.indexable,
        lastModified: city.seo.lastModified,
      });
    }
  }

  for (const profile of snapshot.profiles) {
    if (
      isProfilePublishable(profile) &&
      profile.citySlugs.every((slug) => publishableCities.has(slug)) &&
      profile.serviceIds.every((id) => publishableServices.has(id))
    ) {
      routes.push({
        path: `/perfiles/${profile.slug}`,
        kind: 'profile',
        indexable: releaseReady,
        lastModified: profile.updatedAt,
      });
      profile.serviceIds.forEach((serviceId) => routedServiceIds.add(serviceId));
    }
  }

  for (const service of snapshot.services) {
    if (routedServiceIds.has(service.id) && isServicePublicationReady(service)) {
      routes.push({
        path: `/servicios/${service.slug}`,
        kind: 'service',
        indexable: releaseReady,
      });
    }
  }

  const legalRoutes: Array<[string, keyof ContentSnapshot['settings']['legal']]> = [
    ['/legal/aviso-legal', 'legalNotice'],
    ['/legal/privacidad', 'privacy'],
    ['/legal/cookies', 'cookies'],
    ['/legal/terminos-del-servicio', 'serviceTerms'],
  ];

  for (const [path, key] of legalRoutes) {
    const document = snapshot.settings.legal[key];
    if (hasApprovalEvidence(document.approval) && document.body.trim()) {
      routes.push({
        path,
        kind: 'legal',
        indexable: releaseReady,
        lastModified: document.updatedAt,
      });
    }
  }

  return routes;
}

export function sitemapRoutes(snapshot: ContentSnapshot): RouteEntry[] {
  if (!evaluateRelease(snapshot).ok) {
    return [];
  }

  return buildRouteManifest(snapshot).filter((route) => route.indexable);
}

export function buildLocalizedRouteManifest(
  snapshot: ContentSnapshot,
): LocalizedRouteEntry[] {
  return buildRouteManifest(snapshot).flatMap((route) =>
    SUPPORTED_LOCALES.map((locale) => {
      const localizedDynamicContentReady =
        (route.kind !== 'profiles' &&
          route.kind !== 'profile' &&
          route.kind !== 'services' &&
          route.kind !== 'service' &&
          route.kind !== 'legal') ||
        locale === SOURCE_LOCALE;

      return {
        ...route,
        indexable: route.indexable && localizedDynamicContentReady,
        locale,
        semanticPath: route.path,
        path: localizedPath(
          locale,
          route.path as `/${string}` | '/',
        ),
      };
    }),
  );
}

export function hasProfileCandidateRoute(
  snapshot: ContentSnapshot,
  slug: string,
): boolean {
  return buildRouteManifest(snapshot).some(
    (route) => route.kind === 'profile' && route.path === `/perfiles/${slug}`,
  );
}

export function hasServiceCandidateRoute(
  snapshot: ContentSnapshot,
  slug: string,
): boolean {
  return buildRouteManifest(snapshot).some(
    (route) => route.kind === 'service' && route.path === `/servicios/${slug}`,
  );
}

export function localizedSitemapRoutes(
  snapshot: ContentSnapshot,
): LocalizedRouteEntry[] {
  if (!evaluateRelease(snapshot).ok) {
    return [];
  }

  return buildLocalizedRouteManifest(snapshot).filter((route) => route.indexable);
}
