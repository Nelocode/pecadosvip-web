import { isCanonicalRfc3339Timestamp } from '../rfc3339.ts';
import { normalizeProductionOrigin } from '../site-config.ts';
import { evaluateRelease } from './release-gates.ts';
import { citySlugs } from './types.ts';
import type {
  ApprovalRecord,
  CityPage,
  ContentSnapshot,
  ContactSettings,
  LegalDocument,
  MediaAsset,
  Profile,
  Service,
} from './types.ts';
import { isSafePublicMediaUrl, validateContentSnapshot } from './validation.ts';

export const RUNTIME_SNAPSHOT_SCHEMA =
  'pecadosvip.runtime-content-snapshot' as const;
export const RUNTIME_SNAPSHOT_VERSION = 1 as const;
export const PUBLICATION_CANDIDATE_SCHEMA =
  'pecadosvip.publication-candidate' as const;
export const PUBLICATION_CANDIDATE_MANIFEST_SCHEMA =
  'pecadosvip.publication-candidate-manifest' as const;

export type RuntimeSnapshotActivationEvidence = {
  releaseId: string;
  approvedBy: string;
  approvedAt: string;
  sourceReference: string;
};

export type RuntimeSnapshotEnvelope = {
  schema: typeof RUNTIME_SNAPSHOT_SCHEMA;
  version: typeof RUNTIME_SNAPSHOT_VERSION;
  purpose: 'runtime-activation';
  productionActivation: boolean;
  evidence: RuntimeSnapshotActivationEvidence;
  snapshot: ContentSnapshot;
};

export type RuntimeContentSource =
  | {
      kind: 'snapshot';
      schema: typeof RUNTIME_SNAPSHOT_SCHEMA;
      sourceSha256: string;
      envelope: RuntimeSnapshotEnvelope;
    }
  | {
      kind: 'publication-candidate';
      schema: typeof PUBLICATION_CANDIDATE_SCHEMA;
      sourceSha256: string;
    };

export type RuntimeContentActivationReason =
  | 'DEFAULT_DRAFT'
  | 'ACTIVATED'
  | 'INVALID_CONFIGURATION'
  | 'UNSAFE_SOURCE_PATH'
  | 'SOURCE_MISSING'
  | 'SOURCE_UNREADABLE'
  | 'SOURCE_CHANGED'
  | 'SOURCE_TOO_LARGE'
  | 'SOURCE_INVALID'
  | 'RUNTIME_IO_UNAVAILABLE'
  | 'EXPLICIT_ACTIVATION_REQUIRED'
  | 'SOURCE_NOT_APPROVED_FOR_ACTIVATION'
  | 'CONTENT_INVALID'
  | 'RELEASE_BLOCKED'
  | 'CANDIDATE_LOCAL_REVIEW_ONLY';

export type RuntimeContentSourceReadResult =
  | {
      ok: true;
      sourcePath: string;
      source: RuntimeContentSource;
    }
  | {
      ok: false;
      sourcePath?: string;
      sourceKind: RuntimeContentSource['kind'] | 'unknown';
      reasonCode: Exclude<
        RuntimeContentActivationReason,
        | 'DEFAULT_DRAFT'
        | 'ACTIVATED'
        | 'EXPLICIT_ACTIVATION_REQUIRED'
        | 'SOURCE_NOT_APPROVED_FOR_ACTIVATION'
        | 'RELEASE_BLOCKED'
        | 'CANDIDATE_LOCAL_REVIEW_ONLY'
      >;
      validationIssueCodes?: string[];
    };

export type RuntimeContentActivationState = {
  status: 'default-draft' | 'blocked' | 'activated';
  reasonCode: RuntimeContentActivationReason;
  configured: boolean;
  activationRequested: boolean;
  sourceKind: RuntimeContentSource['kind'] | 'none' | 'unknown';
  sourcePath?: string;
  sourceSchema?: string;
  sourceSha256?: string;
  evidence?: RuntimeSnapshotActivationEvidence;
  validationIssueCodes: string[];
  releaseBlockerCodes: string[];
};

export type RuntimeContentResolution = {
  snapshot: ContentSnapshot;
  activation: RuntimeContentActivationState;
};

type ParsedSourceResult =
  | { ok: true; source: RuntimeContentSource }
  | {
      ok: false;
      reasonCode: 'SOURCE_INVALID' | 'CONTENT_INVALID';
      validationIssueCodes: string[];
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowed: readonly string[],
): boolean {
  const allowedKeys = new Set(allowed);
  return Object.keys(value).every((key) => allowedKeys.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value: unknown, allowEmpty = true): value is string[] {
  return (
    Array.isArray(value) &&
    (allowEmpty || value.length > 0) &&
    value.every((entry) => typeof entry === 'string')
  );
}

function isApprovalRecord(value: unknown): value is ApprovalRecord {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'state',
      'sourceReference',
      'approvedBy',
      'approvedAt',
    ]) ||
    !['pending', 'approved', 'rejected'].includes(String(value.state))
  ) {
    return false;
  }
  return ['sourceReference', 'approvedBy', 'approvedAt'].every(
    (key) => value[key] === undefined || typeof value[key] === 'string',
  );
}

function isMediaAsset(value: unknown): value is MediaAsset {
  return Boolean(
    isRecord(value) &&
      hasOnlyKeys(value, [
        'id',
        'kind',
        'desktopUrl',
        'mobileUrl',
        'alt',
        'order',
        'rightsConfirmed',
        'rightsEvidence',
      ]) &&
      typeof value.id === 'string' &&
      (value.kind === 'image' || value.kind === 'video') &&
      typeof value.desktopUrl === 'string' &&
      (value.mobileUrl === undefined || typeof value.mobileUrl === 'string') &&
      typeof value.alt === 'string' &&
      typeof value.order === 'number' &&
      typeof value.rightsConfirmed === 'boolean' &&
      (value.rightsEvidence === undefined ||
        typeof value.rightsEvidence === 'string')
  );
}

function isProfile(value: unknown): value is Profile {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'id',
      'slug',
      'displayName',
      'age',
      'biography',
      'measurements',
      'languages',
      'serviceIds',
      'media',
      'availability',
      'citySlugs',
      'status',
      'approval',
      'verificationEvidenceReference',
      'adultAgeConfirmed',
      'publicationConsentConfirmed',
      'rightsConfirmed',
      'createdAt',
      'updatedAt',
      'revision',
    ]) ||
    !isRecord(value.measurements) ||
    !hasOnlyKeys(value.measurements, [
      'heightCm',
      'weightKg',
      'bustCm',
      'waistCm',
      'hipsCm',
    ])
  ) {
    return false;
  }
  const measurementsValid = Object.values(value.measurements).every(
    (measurement) => measurement === undefined || typeof measurement === 'number',
  );
  return Boolean(
    typeof value.id === 'string' &&
      typeof value.slug === 'string' &&
      typeof value.displayName === 'string' &&
      (value.age === null || typeof value.age === 'number') &&
      typeof value.biography === 'string' &&
      measurementsValid &&
      isStringArray(value.languages) &&
      isStringArray(value.serviceIds) &&
      Array.isArray(value.media) &&
      value.media.every(isMediaAsset) &&
      ['available', 'limited', 'unavailable', 'on-request'].includes(
        String(value.availability),
      ) &&
      Array.isArray(value.citySlugs) &&
      value.citySlugs.every(
        (slug) => typeof slug === 'string' && citySlugs.includes(slug as never),
      ) &&
      ['draft', 'hidden', 'published', 'archived'].includes(
        String(value.status),
      ) &&
      isApprovalRecord(value.approval) &&
      (value.verificationEvidenceReference === undefined ||
        typeof value.verificationEvidenceReference === 'string') &&
      typeof value.adultAgeConfirmed === 'boolean' &&
      typeof value.publicationConsentConfirmed === 'boolean' &&
      typeof value.rightsConfirmed === 'boolean' &&
      typeof value.createdAt === 'string' &&
      typeof value.updatedAt === 'string' &&
      typeof value.revision === 'number'
  );
}

function isCityPage(value: unknown): value is CityPage {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'id',
      'slug',
      'name',
      'cluster',
      'status',
      'serviceConfirmed',
      'approval',
      'headline',
      'introduction',
      'differentiators',
      'coverageAreas',
      'profileSlugs',
      'faqs',
      'nearbyCitySlugs',
      'seo',
      'updatedAt',
    ]) ||
    !isRecord(value.seo) ||
    !hasOnlyKeys(value.seo, [
      'title',
      'description',
      'canonicalPath',
      'indexable',
      'lastModified',
    ])
  ) {
    return false;
  }
  return Boolean(
    typeof value.id === 'string' &&
      typeof value.slug === 'string' &&
      citySlugs.includes(value.slug as never) &&
      typeof value.name === 'string' &&
      (value.cluster === 'madrid' || value.cluster === 'barcelona') &&
      ['draft', 'hidden', 'published', 'archived'].includes(
        String(value.status),
      ) &&
      typeof value.serviceConfirmed === 'boolean' &&
      isApprovalRecord(value.approval) &&
      typeof value.headline === 'string' &&
      typeof value.introduction === 'string' &&
      isStringArray(value.differentiators) &&
      Array.isArray(value.coverageAreas) &&
      value.coverageAreas.every(
        (area) =>
          isRecord(area) &&
          hasOnlyKeys(area, ['name', 'confirmed']) &&
          typeof area.name === 'string' &&
          typeof area.confirmed === 'boolean',
      ) &&
      isStringArray(value.profileSlugs) &&
      Array.isArray(value.faqs) &&
      value.faqs.every(
        (faq) =>
          isRecord(faq) &&
          hasOnlyKeys(faq, ['question', 'answer']) &&
          typeof faq.question === 'string' &&
          typeof faq.answer === 'string',
      ) &&
      Array.isArray(value.nearbyCitySlugs) &&
      value.nearbyCitySlugs.every(
        (slug) => typeof slug === 'string' && citySlugs.includes(slug as never),
      ) &&
      typeof value.seo.title === 'string' &&
      typeof value.seo.description === 'string' &&
      typeof value.seo.canonicalPath === 'string' &&
      typeof value.seo.indexable === 'boolean' &&
      typeof value.seo.lastModified === 'string' &&
      typeof value.updatedAt === 'string'
  );
}

function isService(value: unknown): value is Service {
  return Boolean(
    isRecord(value) &&
      hasOnlyKeys(value, [
        'id',
        'slug',
        'name',
        'description',
        'status',
        'approval',
      ]) &&
      typeof value.id === 'string' &&
      typeof value.slug === 'string' &&
      typeof value.name === 'string' &&
      typeof value.description === 'string' &&
      ['draft', 'hidden', 'published', 'archived'].includes(
        String(value.status),
      ) &&
      isApprovalRecord(value.approval)
  );
}

function isContactSettings(value: unknown): value is ContactSettings {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'telegramUrl',
      'whatsappUrl',
      'phoneUrl',
      'emailUrl',
      'formActionUrl',
    ])
  ) {
    return false;
  }
  return Object.values(value).every(
    (destination) => destination === undefined || typeof destination === 'string',
  );
}

function isLegalDocument(value: unknown): value is LegalDocument {
  return Boolean(
    isRecord(value) &&
      hasOnlyKeys(value, ['title', 'body', 'approval', 'updatedAt']) &&
      typeof value.title === 'string' &&
      typeof value.body === 'string' &&
      isApprovalRecord(value.approval) &&
      typeof value.updatedAt === 'string'
  );
}

function isContentSnapshot(value: unknown): value is ContentSnapshot {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, ['cities', 'profiles', 'services', 'settings']) ||
    !Array.isArray(value.cities) ||
    !value.cities.every(isCityPage) ||
    !Array.isArray(value.profiles) ||
    !value.profiles.every(isProfile) ||
    !Array.isArray(value.services) ||
    !value.services.every(isService) ||
    !isRecord(value.settings) ||
    !hasOnlyKeys(value.settings, [
      'brandName',
      'canonicalOrigin',
      'publicationEnabled',
      'analyticsConsentConfigured',
      'contact',
      'legal',
    ]) ||
    !isRecord(value.settings.legal) ||
    !hasOnlyKeys(value.settings.legal, [
      'legalNotice',
      'privacy',
      'cookies',
      'serviceTerms',
    ])
  ) {
    return false;
  }
  return Boolean(
    typeof value.settings.brandName === 'string' &&
      (value.settings.canonicalOrigin === undefined ||
        typeof value.settings.canonicalOrigin === 'string') &&
      typeof value.settings.publicationEnabled === 'boolean' &&
      typeof value.settings.analyticsConsentConfigured === 'boolean' &&
      isContactSettings(value.settings.contact) &&
      isLegalDocument(value.settings.legal.legalNotice) &&
      isLegalDocument(value.settings.legal.privacy) &&
      isLegalDocument(value.settings.legal.cookies) &&
      isLegalDocument(value.settings.legal.serviceTerms)
  );
}

function isRuntimePublicMediaUrl(value: string): boolean {
  // Runtime media must be same-origin so the activated snapshot cannot bypass
  // the production CSP or introduce an unapproved third-party asset host.
  if (!value.startsWith('/') || !isSafePublicMediaUrl(value)) return false;
  try {
    const decoded = decodeURIComponent(
      new URL(value, 'https://pecadosvip.invalid').pathname,
    );
    return !/^\/(?:__local-|preview-local-|test-only(?:\/|$))/i.test(decoded);
  } catch {
    return false;
  }
}

function runtimeMediaIssueCodes(snapshot: ContentSnapshot): string[] {
  const invalid = snapshot.profiles.some((profile) =>
    profile.media.some(
      (media) =>
        !isRuntimePublicMediaUrl(media.desktopUrl) ||
        (media.mobileUrl !== undefined &&
          !isRuntimePublicMediaUrl(media.mobileUrl)),
    ),
  );
  return invalid ? ['RUNTIME_MEDIA_URL_NOT_PUBLIC'] : [];
}

function isActivationEvidence(
  value: unknown,
): value is RuntimeSnapshotActivationEvidence {
  return Boolean(
    isRecord(value) &&
      hasOnlyKeys(value, [
        'releaseId',
        'approvedBy',
        'approvedAt',
        'sourceReference',
      ]) &&
      isNonEmptyString(value.releaseId) &&
      isNonEmptyString(value.approvedBy) &&
      isNonEmptyString(value.approvedAt) &&
      isCanonicalRfc3339Timestamp(value.approvedAt) &&
      isNonEmptyString(value.sourceReference)
  );
}

function parseJson(serialized: string): unknown | undefined {
  try {
    return JSON.parse(serialized) as unknown;
  } catch {
    return undefined;
  }
}

export function parseRuntimeSnapshotSource(
  serialized: string,
  sourceSha256: string,
): ParsedSourceResult {
  const parsed = parseJson(serialized);
  if (
    !isRecord(parsed) ||
    !hasOnlyKeys(parsed, [
      'schema',
      'version',
      'purpose',
      'productionActivation',
      'evidence',
      'snapshot',
    ]) ||
    parsed.schema !== RUNTIME_SNAPSHOT_SCHEMA ||
    parsed.version !== RUNTIME_SNAPSHOT_VERSION ||
    parsed.purpose !== 'runtime-activation' ||
    typeof parsed.productionActivation !== 'boolean' ||
    !isActivationEvidence(parsed.evidence) ||
    !isContentSnapshot(parsed.snapshot) ||
    !/^[a-f0-9]{64}$/.test(sourceSha256)
  ) {
    return {
      ok: false,
      reasonCode: 'SOURCE_INVALID',
      validationIssueCodes: ['RUNTIME_SNAPSHOT_SCHEMA_INVALID'],
    };
  }

  const snapshot = structuredClone(parsed.snapshot);
  let validationIssues;
  try {
    validationIssues = validateContentSnapshot(snapshot, 'draft');
  } catch {
    return {
      ok: false,
      reasonCode: 'CONTENT_INVALID',
      validationIssueCodes: ['RUNTIME_SNAPSHOT_VALIDATION_FAILED'],
    };
  }
  const issueCodes = [
    ...new Set([
      ...validationIssues.map((issue) => issue.code),
      ...runtimeMediaIssueCodes(snapshot),
    ]),
  ];
  if (issueCodes.length > 0) {
    return {
      ok: false,
      reasonCode: 'CONTENT_INVALID',
      validationIssueCodes: issueCodes,
    };
  }

  return {
    ok: true,
    source: {
      kind: 'snapshot',
      schema: RUNTIME_SNAPSHOT_SCHEMA,
      sourceSha256,
      envelope: {
        schema: RUNTIME_SNAPSHOT_SCHEMA,
        version: RUNTIME_SNAPSHOT_VERSION,
        purpose: 'runtime-activation',
        productionActivation: parsed.productionActivation,
        evidence: structuredClone(parsed.evidence),
        snapshot,
      },
    },
  };
}

function isCandidateContent(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'schema',
      'version',
      'purpose',
      'productionActivation',
      'canonicalOrigin',
      'brandName',
      'routes',
      'cities',
      'profiles',
      'services',
      'contact',
      'legalDocuments',
    ]) ||
    value.schema !== PUBLICATION_CANDIDATE_SCHEMA ||
    value.version !== 1 ||
    value.purpose !== 'local-review-only' ||
    value.productionActivation !== false ||
    !isNonEmptyString(value.canonicalOrigin) ||
    !normalizeProductionOrigin(value.canonicalOrigin) ||
    !isNonEmptyString(value.brandName) ||
    !Array.isArray(value.routes) ||
    value.routes.length < 3 ||
    !Array.isArray(value.cities) ||
    value.cities.length !== citySlugs.length ||
    !Array.isArray(value.profiles) ||
    value.profiles.length < 8 ||
    !Array.isArray(value.services) ||
    value.services.length < 1 ||
    !isContactSettings(value.contact) ||
    Object.values(value.contact).filter(isNonEmptyString).length < 1 ||
    !Array.isArray(value.legalDocuments)
  ) {
    return false;
  }
  const routesValid = value.routes.every(
    (route) =>
      isRecord(route) &&
      hasOnlyKeys(route, ['path', 'kind', 'indexable', 'lastModified']) &&
      isNonEmptyString(route.path) &&
      [
        'home',
        'city',
        'profiles',
        'profile',
        'services',
        'service',
        'contact',
        'legal',
      ].includes(
        String(route.kind),
      ) &&
      route.indexable === true &&
      (route.lastModified === undefined ||
        typeof route.lastModified === 'string'),
  );
  const routePaths = value.routes.flatMap((route) =>
    isRecord(route) && typeof route.path === 'string' ? [route.path] : [],
  );
  const citiesValid = value.cities.every(
    (city) =>
      isRecord(city) &&
      hasOnlyKeys(city, [
        'slug',
        'name',
        'headline',
        'introduction',
        'differentiators',
        'coverageAreas',
        'faqs',
        'nearbyCitySlugs',
        'seo',
      ]) &&
      typeof city.slug === 'string' &&
      citySlugs.includes(city.slug as never) &&
      isNonEmptyString(city.name) &&
      isNonEmptyString(city.headline) &&
      isNonEmptyString(city.introduction) &&
      isStringArray(city.differentiators, false) &&
      isStringArray(city.coverageAreas, false) &&
      Array.isArray(city.faqs) &&
      city.faqs.length > 0 &&
      city.faqs.every(
        (faq) =>
          isRecord(faq) &&
          hasOnlyKeys(faq, ['question', 'answer']) &&
          isNonEmptyString(faq.question) &&
          isNonEmptyString(faq.answer),
      ) &&
      Array.isArray(city.nearbyCitySlugs) &&
      city.nearbyCitySlugs.every(
        (slug) => typeof slug === 'string' && citySlugs.includes(slug as never),
      ) &&
      isRecord(city.seo) &&
      hasOnlyKeys(city.seo, [
        'title',
        'description',
        'canonicalPath',
        'lastModified',
      ]) &&
      isNonEmptyString(city.seo.title) &&
      isNonEmptyString(city.seo.description) &&
      city.seo.canonicalPath === `/${city.slug}` &&
      isNonEmptyString(city.seo.lastModified) &&
      Number.isFinite(Date.parse(city.seo.lastModified)),
  );
  const servicesValid = value.services.every(
    (service) =>
      isRecord(service) &&
      hasOnlyKeys(service, ['slug', 'name', 'description']) &&
      isNonEmptyString(service.slug) &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(service.slug) &&
      isNonEmptyString(service.name) &&
      isNonEmptyString(service.description),
  );
  const profilesValid = value.profiles.every(
    (profile) =>
      isRecord(profile) &&
      hasOnlyKeys(profile, [
        'slug',
        'displayName',
        'age',
        'availability',
        'citySlugs',
        'cover',
        'biography',
        'measurements',
        'languages',
        'services',
        'media',
      ]) &&
      isNonEmptyString(profile.slug) &&
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(profile.slug) &&
      isNonEmptyString(profile.displayName) &&
      Number.isInteger(profile.age) &&
      Number(profile.age) >= 18 &&
      ['available', 'limited', 'unavailable', 'on-request'].includes(
        String(profile.availability),
      ) &&
      Array.isArray(profile.citySlugs) &&
      profile.citySlugs.length > 0 &&
      profile.citySlugs.every(
        (slug) => typeof slug === 'string' && citySlugs.includes(slug as never),
      ) &&
      isPublicCandidateMedia(profile.cover) &&
      isNonEmptyString(profile.biography) &&
      isRecord(profile.measurements) &&
      hasOnlyKeys(profile.measurements, [
        'heightCm',
        'weightKg',
        'bustCm',
        'waistCm',
        'hipsCm',
      ]) &&
      Object.values(profile.measurements).every(
        (measurement) =>
          measurement === undefined ||
          (typeof measurement === 'number' &&
            Number.isFinite(measurement) &&
            measurement > 0),
      ) &&
      isStringArray(profile.languages, false) &&
      Array.isArray(profile.services) &&
      profile.services.length > 0 &&
      profile.services.every(
        (service) =>
          isRecord(service) &&
          hasOnlyKeys(service, ['slug', 'name']) &&
          isNonEmptyString(service.slug) &&
          isNonEmptyString(service.name),
      ) &&
      Array.isArray(profile.media) &&
      profile.media.length > 0 &&
      profile.media.every(isPublicCandidateMedia),
  );
  const legalValid =
    value.legalDocuments.length === 4 &&
    value.legalDocuments.every(
      (document) =>
        isRecord(document) &&
        hasOnlyKeys(document, ['slug', 'title', 'body', 'updatedAt']) &&
        [
          'aviso-legal',
          'privacidad',
          'cookies',
          'terminos-del-servicio',
        ].includes(String(document.slug)) &&
        isNonEmptyString(document.title) &&
        isNonEmptyString(document.body) &&
        isNonEmptyString(document.updatedAt) &&
        Number.isFinite(Date.parse(document.updatedAt)),
    );
  return (
    routesValid &&
    new Set(routePaths).size === routePaths.length &&
    citiesValid &&
    servicesValid &&
    profilesValid &&
    legalValid
  );
}

function isPublicCandidateMedia(value: unknown): boolean {
  return Boolean(
    isRecord(value) &&
      hasOnlyKeys(value, [
        'kind',
        'desktopUrl',
        'mobileUrl',
        'alt',
        'order',
      ]) &&
      (value.kind === 'image' || value.kind === 'video') &&
      isNonEmptyString(value.desktopUrl) &&
      isRuntimePublicMediaUrl(value.desktopUrl) &&
      (value.mobileUrl === undefined ||
        (isNonEmptyString(value.mobileUrl) &&
          isRuntimePublicMediaUrl(value.mobileUrl))) &&
      isNonEmptyString(value.alt) &&
      Number.isInteger(value.order) &&
      Number(value.order) >= 0
  );
}

export function parsePublicationCandidateSource(
  manifestSerialized: string,
  contentSerialized: string,
  contentByteLength: number,
  contentSha256: string,
): ParsedSourceResult {
  const manifest = parseJson(manifestSerialized);
  const content = parseJson(contentSerialized);
  if (
    !isRecord(manifest) ||
    !hasOnlyKeys(manifest, [
      'schema',
      'version',
      'purpose',
      'productionActivation',
      'fileCount',
      'totalBytes',
      'files',
    ]) ||
    manifest.schema !== PUBLICATION_CANDIDATE_MANIFEST_SCHEMA ||
    manifest.version !== 1 ||
    manifest.purpose !== 'local-review-only' ||
    manifest.productionActivation !== false ||
    manifest.fileCount !== 1 ||
    manifest.totalBytes !== contentByteLength ||
    !Array.isArray(manifest.files) ||
    manifest.files.length !== 1 ||
    !isRecord(manifest.files[0]) ||
    !hasOnlyKeys(manifest.files[0], ['path', 'byteLength', 'sha256']) ||
    manifest.files[0].path !== 'payload/content.json' ||
    manifest.files[0].byteLength !== contentByteLength ||
    manifest.files[0].sha256 !== contentSha256 ||
    !/^[a-f0-9]{64}$/.test(contentSha256) ||
    !isCandidateContent(content)
  ) {
    return {
      ok: false,
      reasonCode: 'SOURCE_INVALID',
      validationIssueCodes: ['PUBLICATION_CANDIDATE_INVALID'],
    };
  }
  return {
    ok: true,
    source: {
      kind: 'publication-candidate',
      schema: PUBLICATION_CANDIDATE_SCHEMA,
      sourceSha256: contentSha256,
    },
  };
}

function blockedResolution(
  draftSnapshot: ContentSnapshot,
  state: Omit<RuntimeContentActivationState, 'status'>,
): RuntimeContentResolution {
  return {
    snapshot: structuredClone(draftSnapshot),
    activation: { status: 'blocked', ...state },
  };
}

export function defaultRuntimeContentResolution(
  draftSnapshot: ContentSnapshot,
): RuntimeContentResolution {
  return {
    snapshot: structuredClone(draftSnapshot),
    activation: {
      status: 'default-draft',
      reasonCode: 'DEFAULT_DRAFT',
      configured: false,
      activationRequested: false,
      sourceKind: 'none',
      validationIssueCodes: [],
      releaseBlockerCodes: [],
    },
  };
}

export function resolveRuntimeContentActivation(
  draftSnapshot: ContentSnapshot,
  activationRequested: boolean,
  readResult: RuntimeContentSourceReadResult,
): RuntimeContentResolution {
  if (!readResult.ok) {
    return blockedResolution(draftSnapshot, {
      reasonCode: readResult.reasonCode,
      configured: true,
      activationRequested,
      sourceKind: readResult.sourceKind,
      ...(readResult.sourcePath ? { sourcePath: readResult.sourcePath } : {}),
      validationIssueCodes: [...(readResult.validationIssueCodes ?? [])],
      releaseBlockerCodes: [],
    });
  }

  const { source, sourcePath } = readResult;
  const sourceState = {
    configured: true,
    activationRequested,
    sourceKind: source.kind,
    sourcePath,
    sourceSchema: source.schema,
    sourceSha256: source.sourceSha256,
    validationIssueCodes: [] as string[],
    releaseBlockerCodes: [] as string[],
  };
  if (source.kind === 'publication-candidate') {
    return blockedResolution(draftSnapshot, {
      ...sourceState,
      reasonCode: 'CANDIDATE_LOCAL_REVIEW_ONLY',
    });
  }

  const evidence = structuredClone(source.envelope.evidence);
  if (!source.envelope.productionActivation) {
    return blockedResolution(draftSnapshot, {
      ...sourceState,
      reasonCode: 'SOURCE_NOT_APPROVED_FOR_ACTIVATION',
      evidence,
    });
  }

  let release;
  try {
    release = evaluateRelease(source.envelope.snapshot);
  } catch {
    return blockedResolution(draftSnapshot, {
      ...sourceState,
      reasonCode: 'CONTENT_INVALID',
      evidence,
      validationIssueCodes: ['RUNTIME_SNAPSHOT_VALIDATION_FAILED'],
    });
  }
  if (!release.ok) {
    return blockedResolution(draftSnapshot, {
      ...sourceState,
      reasonCode: 'RELEASE_BLOCKED',
      evidence,
      releaseBlockerCodes: [...release.blockerCodes],
    });
  }
  if (!activationRequested) {
    return blockedResolution(draftSnapshot, {
      ...sourceState,
      reasonCode: 'EXPLICIT_ACTIVATION_REQUIRED',
      evidence,
    });
  }

  return {
    snapshot: structuredClone(source.envelope.snapshot),
    activation: {
      status: 'activated',
      reasonCode: 'ACTIVATED',
      ...sourceState,
      evidence,
    },
  };
}
