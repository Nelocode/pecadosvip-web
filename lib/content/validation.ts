import {
  isCanonicalContactDestination,
  type ContactDestinationKey,
} from '../contact-destinations.ts';
import { isCanonicalRfc3339Timestamp } from '../rfc3339.ts';
import { normalizeProductionOrigin } from '../site-config.ts';
import { citySlugs } from './types.ts';
import type {
  ApprovalRecord,
  CityPage,
  ContentSnapshot,
  LegalDocument,
  Profile,
  Service,
} from './types.ts';

export type ValidationIssue = {
  code: string;
  path: string;
  message: string;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function isApproved(approval: ApprovalRecord): boolean {
  return (
    approval.state === 'approved' &&
    hasText(approval.approvedBy ?? '') &&
    hasText(approval.approvedAt ?? '') &&
    isCanonicalRfc3339Timestamp(approval.approvedAt) &&
    hasText(approval.sourceReference ?? '')
  );
}

function isHttpsOrigin(value: string | undefined): boolean {
  return normalizeProductionOrigin(value) !== undefined;
}

export function isSafePublicMediaUrl(value: string): boolean {
  if (!value || value.trim() !== value || value.includes('\\')) return false;

  if (value.startsWith('/')) {
    if (value.startsWith('//')) return false;
    try {
      const localOrigin = 'https://pecadosvip.invalid';
      const rawPath = value.split(/[?#]/, 1)[0] ?? '';
      const decodedRawPath = decodeURIComponent(rawPath);
      const rawSegments = decodedRawPath.split('/');
      if (
        decodedRawPath.includes('\0') ||
        rawSegments.some((segment) => segment === '.' || segment === '..')
      ) {
        return false;
      }
      const parsed = new URL(value, localOrigin);
      const decodedPath = decodeURIComponent(parsed.pathname);
      const segments = decodedPath.split('/');
      return (
        parsed.origin === localOrigin &&
        decodedPath.startsWith('/') &&
        decodedPath.length > 1 &&
        !decodedPath.includes('\0') &&
        segments.every((segment) => segment !== '.' && segment !== '..')
      );
    } catch {
      return false;
    }
  }

  try {
    const parsed = new URL(value);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname.length > 0 &&
      parsed.username === '' &&
      parsed.password === ''
    );
  } catch {
    return false;
  }
}

export function isProfilePublicationReady(profile: Profile): boolean {
  const mediaIds = new Set<string>();
  const mediaOrders = new Set<number>();
  const mediaReady =
    profile.media.length > 0 &&
    profile.media.every((media) => {
      const valid = Boolean(
        hasText(media.id) &&
          isSafePublicMediaUrl(media.desktopUrl) &&
          hasText(media.alt) &&
          media.rightsConfirmed === true &&
          hasText(media.rightsEvidence ?? '') &&
          Number.isInteger(media.order) &&
          media.order >= 0 &&
          !mediaIds.has(media.id) &&
          !mediaOrders.has(media.order),
      );
      mediaIds.add(media.id);
      mediaOrders.add(media.order);
      return valid;
    });
  const mediaOrderReady =
    mediaReady &&
    [...mediaOrders]
      .sort((left, right) => left - right)
      .every((order, index) => order === index);

  return Boolean(
    slugPattern.test(profile.slug) &&
      typeof profile.age === 'number' &&
      Number.isInteger(profile.age) &&
      profile.age >= 18 &&
      isApproved(profile.approval) &&
      hasText(profile.verificationEvidenceReference ?? '') &&
      profile.adultAgeConfirmed === true &&
      profile.publicationConsentConfirmed === true &&
      profile.rightsConfirmed === true &&
      hasText(profile.displayName) &&
      hasText(profile.biography) &&
      profile.languages.length > 0 &&
      profile.serviceIds.length > 0 &&
      profile.citySlugs.length > 0 &&
      profile.citySlugs.every((slug) => citySlugs.includes(slug)) &&
      Object.values(profile.measurements).every(
        (value) =>
          value === undefined || (Number.isFinite(value) && value > 0),
      ) &&
      mediaReady &&
      mediaOrderReady &&
      isCanonicalRfc3339Timestamp(profile.createdAt) &&
      isCanonicalRfc3339Timestamp(profile.updatedAt) &&
      Number.isInteger(profile.revision) &&
      profile.revision >= 1,
  );
}

export function isServicePublicationReady(service: Service): boolean {
  return Boolean(
    hasText(service.id) &&
      slugPattern.test(service.slug) &&
      hasText(service.name) &&
      hasText(service.description) &&
      service.status === 'published' &&
      isApproved(service.approval),
  );
}

function validateService(
  service: Service,
  index: number,
  issues: ValidationIssue[],
): void {
  const path = `services[${index}]`;
  if (!hasText(service.id)) {
    issues.push({
      code: 'SERVICE_ID_INVALID',
      path: `${path}.id`,
      message: 'Service id is required.',
    });
  }
  if (!slugPattern.test(service.slug)) {
    issues.push({
      code: 'SERVICE_SLUG_INVALID',
      path: `${path}.slug`,
      message: 'Service slug must be lowercase and URL-safe.',
    });
  }
  if (!hasText(service.name) || !hasText(service.description)) {
    issues.push({
      code: 'SERVICE_CONTENT_MISSING',
      path,
      message: 'Service name and description are required.',
    });
  }
  if (service.status === 'published' && !isServicePublicationReady(service)) {
    issues.push({
      code: 'SERVICE_PUBLICATION_EVIDENCE_MISSING',
      path,
      message: 'A published service requires complete content and traceable approval evidence.',
    });
  }
}

function validateLegalDocument(
  document: LegalDocument,
  path: string,
  issues: ValidationIssue[],
): void {
  if (!hasText(document.title) || !hasText(document.body)) {
    issues.push({
      code: 'LEGAL_CONTENT_MISSING',
      path,
      message: 'Approved legal title and body are required for release.',
    });
  }

  if (!isApproved(document.approval)) {
    issues.push({
      code: 'LEGAL_APPROVAL_MISSING',
      path: `${path}.approval`,
      message: 'Legal content needs traceable approval evidence.',
    });
  }
}

function validateCity(
  city: CityPage,
  index: number,
  profileSlugs: Set<string>,
  issues: ValidationIssue[],
): void {
  const path = `cities[${index}]`;

  if (!citySlugs.includes(city.slug)) {
    issues.push({
      code: 'CITY_SLUG_UNSUPPORTED',
      path: `${path}.slug`,
      message: `Unsupported city slug: ${city.slug}`,
    });
  }

  if (
    !isCanonicalRfc3339Timestamp(city.updatedAt) ||
    !isCanonicalRfc3339Timestamp(city.seo.lastModified)
  ) {
    issues.push({
      code: 'CITY_DATE_INVALID',
      path,
      message: 'City update dates must be valid ISO timestamps.',
    });
  }

  for (const profileSlug of city.profileSlugs) {
    if (!profileSlugs.has(profileSlug)) {
      issues.push({
        code: 'CITY_PROFILE_REFERENCE_MISSING',
        path: `${path}.profileSlugs`,
        message: `Unknown profile slug: ${profileSlug}`,
      });
    }
  }

  if (city.seo.indexable || city.status === 'published') {
    const missingApprovedContent =
      !isApproved(city.approval) ||
      !city.serviceConfirmed ||
      !hasText(city.headline) ||
      !hasText(city.introduction) ||
      city.differentiators.length === 0 ||
      city.coverageAreas.length === 0 ||
      city.coverageAreas.some((area) => !area.confirmed) ||
      city.faqs.length === 0 ||
      !hasText(city.seo.title) ||
      !hasText(city.seo.description);

    if (missingApprovedContent) {
      issues.push({
        code: 'CITY_PUBLICATION_EVIDENCE_MISSING',
        path,
        message: 'A public city page requires approved, confirmed and complete local content.',
      });
    }
  }

  if (city.seo.indexable && city.status !== 'published') {
    issues.push({
      code: 'CITY_INDEXING_STATE_INVALID',
      path: `${path}.seo.indexable`,
      message: 'Only published cities can be indexable.',
    });
  }
}

function validateProfile(
  profile: Profile,
  index: number,
  servicesById: Map<string, Service>,
  citiesBySlug: Map<string, CityPage>,
  issues: ValidationIssue[],
): void {
  const path = `profiles[${index}]`;

  if (!slugPattern.test(profile.slug)) {
    issues.push({
      code: 'PROFILE_SLUG_INVALID',
      path: `${path}.slug`,
      message: 'Profile slug must be lowercase and URL-safe.',
    });
  }

  if (
    profile.age !== null &&
    (!Number.isInteger(profile.age) || profile.age < 18)
  ) {
    issues.push({
      code: 'PROFILE_AGE_INVALID',
      path: `${path}.age`,
      message: 'Every profile must have a verified adult age.',
    });
  }

  if (
    !isCanonicalRfc3339Timestamp(profile.createdAt) ||
    !isCanonicalRfc3339Timestamp(profile.updatedAt)
  ) {
    issues.push({
      code: 'PROFILE_DATE_INVALID',
      path,
      message: 'Profile dates must be valid ISO timestamps.',
    });
  }

  if (!Number.isInteger(profile.revision) || profile.revision < 1) {
    issues.push({
      code: 'PROFILE_REVISION_INVALID',
      path: `${path}.revision`,
      message: 'Profile revision must be a positive integer.',
    });
  }

  for (const serviceId of profile.serviceIds) {
    const service = servicesById.get(serviceId);
    if (!service) {
      issues.push({
        code: 'PROFILE_SERVICE_REFERENCE_MISSING',
        path: `${path}.serviceIds`,
        message: `Unknown service id: ${serviceId}`,
      });
    } else if (
      profile.status === 'published' &&
      (service.status !== 'published' || !isApproved(service.approval))
    ) {
      issues.push({
        code: 'PROFILE_SERVICE_NOT_PUBLISHABLE',
        path: `${path}.serviceIds`,
        message: `Service is not approved and published: ${serviceId}`,
      });
    }
  }

  for (const citySlug of profile.citySlugs) {
    const city = citiesBySlug.get(citySlug);
    if (!citySlugs.includes(citySlug) || !city) {
      issues.push({
        code: 'PROFILE_CITY_REFERENCE_INVALID',
        path: `${path}.citySlugs`,
        message: `Unsupported profile city slug: ${citySlug}`,
      });
    } else if (
      profile.status === 'published' &&
      (city.status !== 'published' ||
        !city.seo.indexable ||
        !city.serviceConfirmed ||
        !isApproved(city.approval))
    ) {
      issues.push({
        code: 'PROFILE_CITY_NOT_PUBLISHABLE',
        path: `${path}.citySlugs`,
        message: `City is not approved and published: ${citySlug}`,
      });
    }
  }

  for (const [key, value] of Object.entries(profile.measurements)) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      issues.push({
        code: 'PROFILE_MEASUREMENT_INVALID',
        path: `${path}.measurements.${key}`,
        message: 'Profile measurements must be positive finite numbers.',
      });
    }
  }

  const mediaIds = new Set<string>();
  const mediaOrders = new Set<number>();
  for (const [mediaIndex, media] of profile.media.entries()) {
    if (!hasText(media.id) || mediaIds.has(media.id)) {
      issues.push({
        code: 'MEDIA_ID_INVALID',
        path: `${path}.media[${mediaIndex}].id`,
        message: 'Media IDs must be non-empty and unique within a profile.',
      });
    }
    mediaIds.add(media.id);
    if (!isSafePublicMediaUrl(media.desktopUrl)) {
      issues.push({
        code: 'MEDIA_URL_INVALID',
        path: `${path}.media[${mediaIndex}].desktopUrl`,
        message: 'Media needs a root-relative or HTTPS desktop URL.',
      });
    }
    if (!hasText(media.alt)) {
      issues.push({
        code: 'MEDIA_ALT_MISSING',
        path: `${path}.media[${mediaIndex}].alt`,
        message: 'Every media asset needs meaningful alternative text.',
      });
    }
    if (!media.rightsConfirmed || !hasText(media.rightsEvidence ?? '')) {
      issues.push({
        code: 'MEDIA_RIGHTS_MISSING',
        path: `${path}.media[${mediaIndex}]`,
        message: 'Every media asset needs traceable rights evidence.',
      });
    }
    if (mediaOrders.has(media.order)) {
      issues.push({
        code: 'MEDIA_ORDER_DUPLICATE',
        path: `${path}.media[${mediaIndex}].order`,
        message: `Duplicate media order: ${media.order}`,
      });
    }
    if (!Number.isInteger(media.order) || media.order < 0) {
      issues.push({
        code: 'MEDIA_ORDER_INVALID',
        path: `${path}.media[${mediaIndex}].order`,
        message: 'Media order must be a non-negative integer.',
      });
    }
    mediaOrders.add(media.order);
  }

  const sortedOrders = [...mediaOrders].sort((left, right) => left - right);
  if (sortedOrders.some((order, orderIndex) => order !== orderIndex)) {
    issues.push({
      code: 'MEDIA_ORDER_NOT_CONTIGUOUS',
      path: `${path}.media`,
      message: 'Media order must form a contiguous zero-based sequence.',
    });
  }

  if (profile.status === 'published') {
    if (!isProfilePublicationReady(profile)) {
      issues.push({
        code: 'PROFILE_PUBLICATION_EVIDENCE_MISSING',
        path,
        message: 'A published profile requires approved adult, consent, rights and content evidence.',
      });
    }
  }
}

function validateUnique(
  values: string[],
  path: string,
  code: string,
  issues: ValidationIssue[],
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      issues.push({ code, path, message: `Duplicate value: ${value}` });
    }
    seen.add(value);
  }
}

export type ProfilePublicationReferences = {
  cities: readonly CityPage[];
  services: readonly Service[];
};

export function validateProfileForPublication(
  profile: Profile,
  references: ProfilePublicationReferences,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const servicesById = new Map(
    references.services.map((service) => [service.id, service]),
  );
  const citiesBySlug = new Map(
    references.cities.map((city) => [city.slug, city]),
  );
  validateProfile(
    { ...structuredClone(profile), status: 'published' },
    0,
    servicesById,
    citiesBySlug,
    issues,
  );
  return issues;
}

export function validateContentSnapshot(
  snapshot: ContentSnapshot,
  mode: 'draft' | 'release' = 'draft',
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  validateUnique(snapshot.cities.map((city) => city.id), 'cities', 'CITY_ID_DUPLICATE', issues);
  validateUnique(snapshot.cities.map((city) => city.slug), 'cities', 'CITY_SLUG_DUPLICATE', issues);
  validateUnique(snapshot.profiles.map((profile) => profile.id), 'profiles', 'PROFILE_ID_DUPLICATE', issues);
  validateUnique(snapshot.profiles.map((profile) => profile.slug), 'profiles', 'PROFILE_SLUG_DUPLICATE', issues);
  validateUnique(snapshot.services.map((service) => service.id), 'services', 'SERVICE_ID_DUPLICATE', issues);
  validateUnique(snapshot.services.map((service) => service.slug), 'services', 'SERVICE_SLUG_DUPLICATE', issues);

  const profileSlugs = new Set(snapshot.profiles.map((profile) => profile.slug));
  const servicesById = new Map(
    snapshot.services.map((service) => [service.id, service]),
  );
  const citiesBySlug = new Map(
    snapshot.cities.map((city) => [city.slug, city]),
  );

  snapshot.cities.forEach((city, index) => validateCity(city, index, profileSlugs, issues));
  snapshot.profiles.forEach((profile, index) =>
    validateProfile(profile, index, servicesById, citiesBySlug, issues),
  );
  snapshot.services.forEach((service, index) =>
    validateService(service, index, issues),
  );

  if (mode === 'release') {
    if (!snapshot.settings.publicationEnabled) {
      issues.push({
        code: 'PUBLICATION_DISABLED',
        path: 'settings.publicationEnabled',
        message: 'Publication must be explicitly enabled for a release.',
      });
    }

    if (!isHttpsOrigin(snapshot.settings.canonicalOrigin)) {
      issues.push({
        code: 'CANONICAL_ORIGIN_INVALID',
        path: 'settings.canonicalOrigin',
        message: 'A confirmed HTTPS canonical origin is required for release.',
      });
    }

    const contacts = snapshot.settings.contact;
    const contactEntries = Object.entries(contacts).filter(([, value]) =>
      hasText(value ?? ''),
    );
    if (contactEntries.length === 0) {
      issues.push({
        code: 'CONTACT_CHANNEL_MISSING',
        path: 'settings.contact',
        message: 'At least one approved contact destination is required for release.',
      });
    }
    for (const [key, value] of contactEntries) {
      if (
        !isCanonicalContactDestination(
          key as ContactDestinationKey,
          value,
        )
      ) {
        issues.push({
          code: 'CONTACT_CHANNEL_INVALID',
          path: `settings.contact.${key}`,
          message:
            'Contact destinations must be canonical and use the approved channel host or scheme.',
        });
      }
    }

    if (!snapshot.settings.analyticsConsentConfigured) {
      issues.push({
        code: 'ANALYTICS_CONSENT_NOT_CONFIGURED',
        path: 'settings.analyticsConsentConfigured',
        message: 'Release requires an explicit analytics consent configuration.',
      });
    }

    validateLegalDocument(snapshot.settings.legal.legalNotice, 'settings.legal.legalNotice', issues);
    validateLegalDocument(snapshot.settings.legal.privacy, 'settings.legal.privacy', issues);
    validateLegalDocument(snapshot.settings.legal.cookies, 'settings.legal.cookies', issues);
    validateLegalDocument(snapshot.settings.legal.serviceTerms, 'settings.legal.serviceTerms', issues);

    const publishedCitySlugs = new Set(
      snapshot.cities
        .filter((city) => city.status === 'published' && city.seo.indexable)
        .map((city) => city.slug),
    );
    for (const citySlug of citySlugs) {
      if (!publishedCitySlugs.has(citySlug)) {
        issues.push({
          code: 'REQUIRED_CITY_NOT_PUBLISHED',
          path: 'cities',
          message: `Required city route is not release-ready: ${citySlug}`,
        });
      }
    }

    const publishedProfiles = snapshot.profiles.filter(
      (profile) => profile.status === 'published',
    );
    if (publishedProfiles.length < 8) {
      issues.push({
        code: 'INITIAL_PROFILE_LOAD_INCOMPLETE',
        path: 'profiles',
        message: 'The confirmed initial load requires at least eight publishable profiles.',
      });
    }
  }

  return issues;
}
