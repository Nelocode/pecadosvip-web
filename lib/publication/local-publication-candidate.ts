import { createHash, randomUUID } from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  rename,
  rm,
} from 'node:fs/promises';
import {
  basename,
  dirname,
  isAbsolute,
  parse,
  relative,
  resolve,
  sep,
} from 'node:path';

import { normalizeProductionOrigin } from '../site-config.ts';
import { PersistentJsonProfileRepository } from '../content/persistent-repository.ts';
import { RepositoryError } from '../content/repository.ts';
import { getPublicProfileDetail } from '../content/public-profiles.ts';
import type {
  PublicMedia,
  PublicProfileDetail,
} from '../content/public-profiles.ts';
import { evaluateRelease } from '../content/release-gates.ts';
import { buildRouteManifest } from '../content/route-manifest.ts';
import { citySlugs } from '../content/types.ts';
import { isSafePublicMediaUrl } from '../content/validation.ts';
import type {
  CityPage,
  CitySlug,
  ContactSettings,
  ContentSnapshot,
  Faq,
  Service,
  SiteSettings,
} from '../content/types.ts';

const REFERENCES_SCHEMA = 'pecadosvip.publication-candidate-references';
const REFERENCES_VERSION = 1;
const CONTENT_SCHEMA = 'pecadosvip.publication-candidate';
const CONTENT_VERSION = 1;
const MANIFEST_SCHEMA = 'pecadosvip.publication-candidate-manifest';
const MANIFEST_VERSION = 1;
const CONTENT_LOGICAL_PATH = 'payload/content.json';
const MAX_SOURCE_BYTES = 16 * 1024 * 1024;
const MAX_CONTENT_BYTES = 32 * 1024 * 1024;

export type LocalPublicationCandidateRuntime = 'development' | 'test';

export type PublicationCandidateReferencesEnvelope = {
  schema: typeof REFERENCES_SCHEMA;
  version: typeof REFERENCES_VERSION;
  cities: CityPage[];
  services: Service[];
  settings: SiteSettings;
};

export type PublicCandidateRoute = {
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
  indexable: true;
  lastModified?: string;
};

export type PublicCandidateCity = {
  slug: CitySlug;
  name: string;
  headline: string;
  introduction: string;
  differentiators: string[];
  coverageAreas: string[];
  faqs: Faq[];
  nearbyCitySlugs: CitySlug[];
  seo: {
    title: string;
    description: string;
    canonicalPath: `/${string}` | '/';
    lastModified: string;
  };
};

export type PublicCandidateService = {
  slug: string;
  name: string;
  description: string;
};

export type PublicCandidateLegalDocument = {
  slug: 'aviso-legal' | 'privacidad' | 'cookies' | 'terminos-del-servicio';
  title: string;
  body: string;
  updatedAt: string;
};

export type PublicationCandidateContent = {
  schema: typeof CONTENT_SCHEMA;
  version: typeof CONTENT_VERSION;
  purpose: 'local-review-only';
  productionActivation: false;
  canonicalOrigin: string;
  brandName: string;
  routes: PublicCandidateRoute[];
  cities: PublicCandidateCity[];
  profiles: PublicProfileDetail[];
  services: PublicCandidateService[];
  contact: ContactSettings;
  legalDocuments: PublicCandidateLegalDocument[];
};

export type PublicationCandidateManifestFile = {
  path: typeof CONTENT_LOGICAL_PATH;
  byteLength: number;
  sha256: string;
};

export type PublicationCandidateManifest = {
  schema: typeof MANIFEST_SCHEMA;
  version: typeof MANIFEST_VERSION;
  purpose: 'local-review-only';
  productionActivation: false;
  fileCount: 1;
  totalBytes: number;
  files: [PublicationCandidateManifestFile];
};

export type ExportLocalPublicationCandidateOptions = {
  runtimeMode: LocalPublicationCandidateRuntime;
  stateFilePath: string;
  referencesFilePath: string;
  outputDirectory: string;
};

export type ExportedLocalPublicationCandidate = {
  outputDirectory: string;
  content: PublicationCandidateContent;
  manifest: PublicationCandidateManifest;
};

export type PublicationCandidateErrorCode =
  | 'INVALID_RUNTIME'
  | 'INVALID_PATH'
  | 'SOURCE_BUSY'
  | 'SOURCE_UNAVAILABLE'
  | 'SOURCE_CHANGED'
  | 'UNSAFE_ENTRY'
  | 'INVALID_REFERENCES'
  | 'RELEASE_BLOCKED'
  | 'LOCAL_MEDIA_REFERENCE'
  | 'DESTINATION_EXISTS'
  | 'CONTENT_TOO_LARGE'
  | 'IO_FAILURE';

export class PublicationCandidateError extends Error {
  public readonly code: PublicationCandidateErrorCode;
  public readonly blockerCodes: string[];

  constructor(
    code: PublicationCandidateErrorCode,
    message: string,
    blockerCodes: readonly string[] = [],
  ) {
    super(message);
    this.name = 'PublicationCandidateError';
    this.code = code;
    this.blockerCodes = [...blockerCodes];
  }
}

type FileSnapshot = {
  bytes: Buffer;
  sha256: string;
};

function isFileSystemError(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === code
  );
}

function assertLocalRuntime(runtimeMode: LocalPublicationCandidateRuntime): void {
  if (
    (runtimeMode !== 'development' && runtimeMode !== 'test') ||
    process.env.NODE_ENV === 'production'
  ) {
    throw new PublicationCandidateError(
      'INVALID_RUNTIME',
      'Publication candidates are restricted to local development and tests.',
    );
  }
}

function normalizeExplicitPath(value: string, label: string): string {
  if (!value.trim() || !isAbsolute(value)) {
    throw new PublicationCandidateError(
      'INVALID_PATH',
      `${label} requires an explicit absolute path.`,
    );
  }
  const normalized = resolve(value);
  if (normalized === parse(normalized).root) {
    throw new PublicationCandidateError(
      'INVALID_PATH',
      `${label} cannot be a filesystem root.`,
    );
  }
  return normalized;
}

function isWithin(parent: string, candidate: string): boolean {
  const child = relative(parent, candidate);
  return (
    child !== '' &&
    child !== '..' &&
    !child.startsWith(`..${sep}`) &&
    !isAbsolute(child)
  );
}

function pathsOverlap(left: string, right: string): boolean {
  return left === right || isWithin(left, right) || isWithin(right, left);
}

async function optionalLstat(path: string) {
  try {
    return await lstat(path);
  } catch (error) {
    if (isFileSystemError(error, 'ENOENT')) return undefined;
    throw new PublicationCandidateError(
      'IO_FAILURE',
      'A publication-candidate path could not be inspected.',
    );
  }
}

async function assertNoSymlinkInExistingPath(path: string): Promise<void> {
  let current = resolve(path);
  const root = parse(current).root;
  while (current !== root) {
    const entry = await optionalLstat(current);
    if (entry?.isSymbolicLink()) {
      throw new PublicationCandidateError(
        'UNSAFE_ENTRY',
        'Symbolic links are not accepted in publication-candidate paths.',
      );
    }
    current = dirname(current);
  }
}

async function ensureSafeDirectory(path: string): Promise<void> {
  await assertNoSymlinkInExistingPath(path);
  try {
    await mkdir(path, { recursive: true, mode: 0o700 });
  } catch {
    throw new PublicationCandidateError(
      'IO_FAILURE',
      'A publication-candidate directory could not be created.',
    );
  }
  const entry = await optionalLstat(path);
  if (!entry?.isDirectory() || entry.isSymbolicLink()) {
    throw new PublicationCandidateError(
      'UNSAFE_ENTRY',
      'Expected a safe regular directory.',
    );
  }
}

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

async function readStableRegularFile(
  path: string,
  maxBytes: number,
): Promise<FileSnapshot> {
  await assertNoSymlinkInExistingPath(path);
  const before = await optionalLstat(path);
  if (
    !before?.isFile() ||
    before.isSymbolicLink() ||
    before.size < 1 ||
    before.size > maxBytes
  ) {
    throw new PublicationCandidateError(
      'SOURCE_UNAVAILABLE',
      'A bounded regular publication-candidate source file is required.',
    );
  }
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(path, 'r');
  } catch {
    throw new PublicationCandidateError(
      'SOURCE_UNAVAILABLE',
      'A publication-candidate source file could not be read.',
    );
  }
  let bytes: Buffer;
  try {
    const openedBefore = await handle.stat();
    if (
      !openedBefore.isFile() ||
      openedBefore.size !== before.size ||
      openedBefore.dev !== before.dev ||
      openedBefore.ino !== before.ino
    ) {
      throw new PublicationCandidateError(
        'SOURCE_CHANGED',
        'A publication-candidate source changed before it was opened.',
      );
    }
    bytes = await handle.readFile();
    const openedAfter = await handle.stat();
    if (
      openedBefore.size !== openedAfter.size ||
      openedBefore.mtimeMs !== openedAfter.mtimeMs ||
      bytes.byteLength !== openedAfter.size
    ) {
      throw new PublicationCandidateError(
        'SOURCE_CHANGED',
        'A publication-candidate source changed while it was being read.',
      );
    }
  } catch (error) {
    if (error instanceof PublicationCandidateError) throw error;
    throw new PublicationCandidateError(
      'SOURCE_UNAVAILABLE',
      'A publication-candidate source file could not be read.',
    );
  } finally {
    await handle.close().catch(() => undefined);
  }
  await assertNoSymlinkInExistingPath(path);
  const after = await optionalLstat(path);
  if (
    !after?.isFile() ||
    after.isSymbolicLink() ||
    before.dev !== after.dev ||
    before.ino !== after.ino ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs ||
    bytes.byteLength !== after.size
  ) {
    throw new PublicationCandidateError(
      'SOURCE_CHANGED',
      'A publication-candidate source changed while it was being read.',
    );
  }
  return { bytes, sha256: sha256(bytes) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseReferences(bytes: Buffer): PublicationCandidateReferencesEnvelope {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes.toString('utf8'));
  } catch {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'Publication-candidate references are not valid JSON.',
    );
  }
  if (
    !isRecord(parsed) ||
    Object.keys(parsed).sort().join(',') !==
      'cities,schema,services,settings,version' ||
    parsed.schema !== REFERENCES_SCHEMA ||
    parsed.version !== REFERENCES_VERSION ||
    !Array.isArray(parsed.cities) ||
    !Array.isArray(parsed.services) ||
    !isRecord(parsed.settings)
  ) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'Publication-candidate references have an unsupported envelope.',
    );
  }
  return {
    schema: REFERENCES_SCHEMA,
    version: REFERENCES_VERSION,
    cities: structuredClone(parsed.cities) as CityPage[],
    services: structuredClone(parsed.services) as Service[],
    settings: structuredClone(parsed.settings) as SiteSettings,
  };
}

function requireText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      `A complete public value is required for ${field}.`,
    );
  }
  return value;
}

function requireIsoDate(value: unknown, field: string): string {
  const text = requireText(value, field);
  if (!Number.isFinite(Date.parse(text))) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      `A valid public timestamp is required for ${field}.`,
    );
  }
  return text;
}

function requireTextArray(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      `A non-empty public list is required for ${field}.`,
    );
  }
  return value.map((entry, index) =>
    requireText(entry, `${field}[${index}]`),
  );
}

function compareText(left: string, right: string): number {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function assertPublicMediaUrl(value: string): void {
  let localOnly = false;
  if (value.startsWith('/')) {
    try {
      const decodedPath = decodeURIComponent(
        new URL(value, 'https://pecadosvip.invalid').pathname,
      );
      localOnly = /^\/(?:__local-|preview-local-|test-only(?:\/|$))/i.test(
        decodedPath,
      );
    } catch {
      localOnly = true;
    }
  }
  if (!isSafePublicMediaUrl(value) || localOnly) {
    throw new PublicationCandidateError(
      'LOCAL_MEDIA_REFERENCE',
      'A publication candidate contains a local-only or unsafe media URL.',
    );
  }
}

function assertPublicMedia(media: PublicMedia): void {
  requireText(media.alt, 'profiles.media.alt');
  assertPublicMediaUrl(requireText(media.desktopUrl, 'profiles.media.desktopUrl'));
  if (media.mobileUrl !== undefined) {
    assertPublicMediaUrl(requireText(media.mobileUrl, 'profiles.media.mobileUrl'));
  }
  if (!Number.isInteger(media.order) || media.order < 0) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'Public media order must be a non-negative integer.',
    );
  }
}

function projectCity(city: CityPage): PublicCandidateCity {
  if (!citySlugs.includes(city.slug)) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'A publication candidate contains an unsupported city.',
    );
  }
  if (!Array.isArray(city.coverageAreas) || city.coverageAreas.length === 0) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'A publication candidate requires confirmed coverage areas.',
    );
  }
  const coverageAreas = city.coverageAreas.map((area, index) => {
    if (!area || area.confirmed !== true) {
      throw new PublicationCandidateError(
        'INVALID_REFERENCES',
        'A publication candidate requires confirmed coverage areas.',
      );
    }
    return requireText(area.name, `cities.coverageAreas[${index}].name`);
  });
  if (!Array.isArray(city.faqs) || city.faqs.length === 0) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'A publication candidate requires public FAQ content.',
    );
  }
  const faqs = city.faqs.map((faq, index) => ({
    question: requireText(faq?.question, `cities.faqs[${index}].question`),
    answer: requireText(faq?.answer, `cities.faqs[${index}].answer`),
  }));
  if (
    !Array.isArray(city.nearbyCitySlugs) ||
    city.nearbyCitySlugs.some((slug) => !citySlugs.includes(slug))
  ) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'A publication candidate contains invalid nearby-city references.',
    );
  }
  const canonicalPath = requireText(
    city.seo?.canonicalPath,
    'cities.seo.canonicalPath',
  );
  const expectedCanonicalPath: `/${string}` = `/${city.slug}`;
  if (canonicalPath !== expectedCanonicalPath) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'A publication-candidate city canonical path must match its public route.',
    );
  }
  return {
    slug: city.slug,
    name: requireText(city.name, 'cities.name'),
    headline: requireText(city.headline, 'cities.headline'),
    introduction: requireText(city.introduction, 'cities.introduction'),
    differentiators: requireTextArray(
      city.differentiators,
      'cities.differentiators',
    ),
    coverageAreas,
    faqs,
    nearbyCitySlugs: [...city.nearbyCitySlugs],
    seo: {
      title: requireText(city.seo?.title, 'cities.seo.title'),
      description: requireText(city.seo?.description, 'cities.seo.description'),
      canonicalPath: expectedCanonicalPath,
      lastModified: requireIsoDate(
        city.seo?.lastModified,
        'cities.seo.lastModified',
      ),
    },
  };
}

function projectContact(contact: ContactSettings): ContactSettings {
  const projected: ContactSettings = {};
  const keys = [
    'telegramUrl',
    'whatsappUrl',
    'phoneUrl',
    'emailUrl',
    'formActionUrl',
  ] as const;
  for (const key of keys) {
    const value = contact[key];
    if (value !== undefined) projected[key] = requireText(value, `contact.${key}`);
  }
  return projected;
}

function projectContent(snapshot: ContentSnapshot): PublicationCandidateContent {
  let release;
  try {
    release = evaluateRelease(snapshot);
  } catch {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'Publication-candidate inputs could not be validated.',
    );
  }
  if (!release.ok) {
    throw new PublicationCandidateError(
      'RELEASE_BLOCKED',
      `Publication candidate blocked: ${release.blockerCodes.join(', ')}`,
      release.blockerCodes,
    );
  }
  const canonicalOrigin = normalizeProductionOrigin(
    snapshot.settings.canonicalOrigin,
  );
  if (!canonicalOrigin) {
    throw new PublicationCandidateError(
      'RELEASE_BLOCKED',
      'Publication candidate blocked: CANONICAL_ORIGIN_INVALID',
      ['CANONICAL_ORIGIN_INVALID'],
    );
  }

  let routeManifest;
  try {
    routeManifest = buildRouteManifest(snapshot);
  } catch {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'Publication-candidate routes could not be projected.',
    );
  }
  const routes = routeManifest
    .filter((route) => route.indexable)
    .map((route): PublicCandidateRoute => ({
      path: route.path,
      kind: route.kind,
      indexable: true,
      ...(route.lastModified ? { lastModified: route.lastModified } : {}),
    }))
    .sort((left, right) => compareText(left.path, right.path));

  const profileSlugs = routes
    .filter((route) => route.kind === 'profile')
    .map((route) => route.path.replace(/^\/perfiles\//, ''));
  const profiles = profileSlugs.map((slug) => {
    const profile = getPublicProfileDetail(snapshot, slug);
    if (!profile) {
      throw new PublicationCandidateError(
        'INVALID_REFERENCES',
        'A public profile route could not be projected.',
      );
    }
    assertPublicMedia(profile.cover);
    profile.media.forEach(assertPublicMedia);
    return profile;
  });

  const cityRouteSlugs = new Set(
    routes
      .filter((route) => route.kind === 'city')
      .map((route) => route.path.slice(1)),
  );
  const cities = snapshot.cities
    .filter((city) => cityRouteSlugs.has(city.slug))
    .map(projectCity)
    .sort((left, right) => compareText(left.slug, right.slug));

  const usedServiceSlugs = new Set(
    profiles.flatMap((profile) => profile.services.map((service) => service.slug)),
  );
  const seenServiceSlugs = new Set<string>();
  const services = snapshot.services
    .filter((service) => usedServiceSlugs.has(service.slug))
    .map((service): PublicCandidateService => {
      const slug = requireText(service.slug, 'services.slug');
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || seenServiceSlugs.has(slug)) {
        throw new PublicationCandidateError(
          'INVALID_REFERENCES',
          'Publication-candidate service slugs must be unique and URL-safe.',
        );
      }
      seenServiceSlugs.add(slug);
      return {
        slug,
        name: requireText(service.name, 'services.name'),
        description: requireText(service.description, 'services.description'),
      };
    })
    .sort((left, right) => compareText(left.slug, right.slug));
  if (services.length !== usedServiceSlugs.size) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'Publication-candidate service references are incomplete.',
    );
  }

  const legalSources = [
    ['aviso-legal', snapshot.settings.legal.legalNotice],
    ['privacidad', snapshot.settings.legal.privacy],
    ['cookies', snapshot.settings.legal.cookies],
    ['terminos-del-servicio', snapshot.settings.legal.serviceTerms],
  ] as const;
  const legalDocuments = legalSources.map(
    ([slug, document]): PublicCandidateLegalDocument => ({
      slug,
      title: requireText(document.title, `legal.${slug}.title`),
      body: requireText(document.body, `legal.${slug}.body`),
      updatedAt: requireIsoDate(document.updatedAt, `legal.${slug}.updatedAt`),
    }),
  );

  return {
    schema: CONTENT_SCHEMA,
    version: CONTENT_VERSION,
    purpose: 'local-review-only',
    productionActivation: false,
    canonicalOrigin,
    brandName: requireText(snapshot.settings.brandName, 'settings.brandName'),
    routes,
    cities,
    profiles,
    services,
    contact: projectContact(snapshot.settings.contact),
    legalDocuments,
  };
}

function sortJson(value: unknown): unknown {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  ) {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new PublicationCandidateError(
        'INVALID_REFERENCES',
        'Publication-candidate content contains a non-finite number.',
      );
    }
    return value;
  }
  if (Array.isArray(value)) return value.map(sortJson);
  if (!isRecord(value)) {
    throw new PublicationCandidateError(
      'INVALID_REFERENCES',
      'Publication-candidate content is not JSON-safe.',
    );
  }
  const result: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const entry = value[key];
    if (entry === undefined) continue;
    result[key] = sortJson(entry);
  }
  return result;
}

function canonicalJson(value: unknown): string {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

async function writeExclusive(
  path: string,
  bytes: Uint8Array | string,
): Promise<void> {
  const handle = await open(path, 'wx', 0o600);
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function cleanupStaging(path: string, parent: string): Promise<void> {
  if (!isWithin(parent, path) || !basename(path).startsWith('.pecadosvip-candidate-')) {
    return;
  }
  await rm(path, { recursive: true, force: true }).catch(() => undefined);
}

export async function exportLocalPublicationCandidate(
  options: ExportLocalPublicationCandidateOptions,
): Promise<ExportedLocalPublicationCandidate> {
  assertLocalRuntime(options.runtimeMode);
  const stateFilePath = normalizeExplicitPath(
    options.stateFilePath,
    'CMS state source',
  );
  const referencesFilePath = normalizeExplicitPath(
    options.referencesFilePath,
    'Publication references source',
  );
  const outputDirectory = normalizeExplicitPath(
    options.outputDirectory,
    'Publication-candidate destination',
  );
  if (
    pathsOverlap(stateFilePath, referencesFilePath) ||
    pathsOverlap(outputDirectory, stateFilePath) ||
    pathsOverlap(outputDirectory, referencesFilePath)
  ) {
    throw new PublicationCandidateError(
      'INVALID_PATH',
      'Publication-candidate sources and destination must be disjoint.',
    );
  }
  if (await optionalLstat(outputDirectory)) {
    throw new PublicationCandidateError(
      'DESTINATION_EXISTS',
      'The publication-candidate destination already exists.',
    );
  }

  const stateBefore = await readStableRegularFile(
    stateFilePath,
    MAX_SOURCE_BYTES,
  );
  const referencesBefore = await readStableRegularFile(
    referencesFilePath,
    MAX_SOURCE_BYTES,
  );
  const references = parseReferences(referencesBefore.bytes);
  let profiles: ContentSnapshot['profiles'];
  try {
    const repository = new PersistentJsonProfileRepository({
      filePath: stateFilePath,
      runtimeMode: options.runtimeMode,
      publicationReferences: {
        cities: references.cities,
        services: references.services,
      },
    });
    profiles = repository.listProfiles(
      { id: 'publication-candidate-export', role: 'admin' },
      true,
    );
  } catch (error) {
    if (
      error instanceof RepositoryError &&
      error.code === 'PERSISTENCE_BUSY'
    ) {
      throw new PublicationCandidateError(
        'SOURCE_BUSY',
        'The persistent CMS state is already in use by another operation.',
      );
    }
    throw new PublicationCandidateError(
      'SOURCE_UNAVAILABLE',
      'The persistent CMS state could not be validated for export.',
    );
  }
  const stateAfter = await readStableRegularFile(
    stateFilePath,
    MAX_SOURCE_BYTES,
  );
  const referencesAfter = await readStableRegularFile(
    referencesFilePath,
    MAX_SOURCE_BYTES,
  );
  if (
    stateBefore.sha256 !== stateAfter.sha256 ||
    referencesBefore.sha256 !== referencesAfter.sha256
  ) {
    throw new PublicationCandidateError(
      'SOURCE_CHANGED',
      'Publication-candidate inputs changed during export.',
    );
  }

  const snapshot: ContentSnapshot = {
    cities: structuredClone(references.cities),
    profiles,
    services: structuredClone(references.services),
    settings: structuredClone(references.settings),
  };
  const content = projectContent(snapshot);
  const contentBytes = Buffer.from(canonicalJson(content), 'utf8');
  if (contentBytes.byteLength > MAX_CONTENT_BYTES) {
    throw new PublicationCandidateError(
      'CONTENT_TOO_LARGE',
      'Publication-candidate content exceeds the supported size.',
    );
  }
  const manifest: PublicationCandidateManifest = {
    schema: MANIFEST_SCHEMA,
    version: MANIFEST_VERSION,
    purpose: 'local-review-only',
    productionActivation: false,
    fileCount: 1,
    totalBytes: contentBytes.byteLength,
    files: [
      {
        path: CONTENT_LOGICAL_PATH,
        byteLength: contentBytes.byteLength,
        sha256: sha256(contentBytes),
      },
    ],
  };
  const manifestBytes = Buffer.from(canonicalJson(manifest), 'utf8');

  const parent = dirname(outputDirectory);
  await ensureSafeDirectory(parent);
  await assertNoSymlinkInExistingPath(outputDirectory);
  const staging = resolve(parent, `.pecadosvip-candidate-${randomUUID()}`);
  if (!isWithin(parent, staging)) {
    throw new PublicationCandidateError(
      'INVALID_PATH',
      'Unsafe publication-candidate staging path.',
    );
  }
  try {
    await mkdir(resolve(staging, 'payload'), { recursive: true, mode: 0o700 });
    await writeExclusive(resolve(staging, CONTENT_LOGICAL_PATH), contentBytes);
    await writeExclusive(resolve(staging, 'manifest.json'), manifestBytes);
    const stagedContent = await readStableRegularFile(
      resolve(staging, CONTENT_LOGICAL_PATH),
      MAX_CONTENT_BYTES,
    );
    const stagedManifest = await readStableRegularFile(
      resolve(staging, 'manifest.json'),
      MAX_SOURCE_BYTES,
    );
    if (
      stagedContent.bytes.byteLength !== contentBytes.byteLength ||
      stagedContent.sha256 !== manifest.files[0].sha256 ||
      !stagedManifest.bytes.equals(manifestBytes)
    ) {
      throw new PublicationCandidateError(
        'IO_FAILURE',
        'The staged publication candidate failed integrity validation.',
      );
    }
    if (await optionalLstat(outputDirectory)) {
      throw new PublicationCandidateError(
        'DESTINATION_EXISTS',
        'The publication-candidate destination already exists.',
      );
    }
    await rename(staging, outputDirectory);
  } catch (error) {
    await cleanupStaging(staging, parent);
    if (error instanceof PublicationCandidateError) throw error;
    throw new PublicationCandidateError(
      'IO_FAILURE',
      'The publication candidate could not be committed atomically.',
    );
  }

  return {
    outputDirectory,
    content: structuredClone(content),
    manifest: structuredClone(manifest),
  };
}
