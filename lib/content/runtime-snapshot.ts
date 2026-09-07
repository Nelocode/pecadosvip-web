import { cities } from '../../app/city-data.ts';
import { contactConfig } from '../contact-config.ts';
import type {
  ApprovalRecord,
  CityPage,
  CitySlug,
  ContentSnapshot,
  LegalDocument,
} from './types.ts';
import { resolveRuntimeContentFromEnvironment } from './runtime-content-source.ts';
import type {
  RuntimeContentActivationState,
  RuntimeContentResolution,
} from './runtime-content-activation.ts';

const runtimeTimestamp = '2026-08-27T00:00:00-05:00';

const pendingApproval: ApprovalRecord = { state: 'pending' };

const barcelonaClusterSlugs: ReadonlySet<CitySlug> = new Set([
  'barcelona',
  'girona',
  'tarragona',
]);

function operationalClusterFor(slug: CitySlug): 'madrid' | 'barcelona' {
  return barcelonaClusterSlugs.has(slug) ? 'barcelona' : 'madrid';
}

function nearbyCitySlugsFor(slug: CitySlug): CitySlug[] {
  if (slug === 'madrid') return ['toledo', 'guadalajara', 'segovia'];
  if (slug === 'barcelona') return ['girona', 'tarragona'];
  return [operationalClusterFor(slug)];
}

function emptyLegalDocument(title: string): LegalDocument {
  return {
    title,
    body: '',
    approval: pendingApproval,
    updatedAt: runtimeTimestamp,
  };
}

const draftCities: CityPage[] = Object.values(cities).map(
  (city): CityPage => ({
    id: `city-${city.slug}`,
    slug: city.slug,
    name: city.city,
    cluster: operationalClusterFor(city.slug),
    status: 'draft',
    serviceConfirmed: false,
    approval: pendingApproval,
    headline: `${city.headline} ${city.headlineAccent}`,
    introduction: city.introBody.join('\n\n'),
    differentiators: [
      'Desplazamiento a hoteles y domicilios',
      'Cobertura bajo confirmación',
      'Coordinación privada',
    ],
    coverageAreas: [
      ...city.highlights.map((area) => ({
        name: area.name,
        confirmed: false,
      })),
      ...city.locations.map((name) => ({ name, confirmed: false })),
    ],
    profileSlugs: [],
    faqs: structuredClone(city.faqs),
    nearbyCitySlugs: nearbyCitySlugsFor(city.slug),
    seo: {
      title: `Compañía privada en ${city.city}`,
      description: city.lead,
      canonicalPath: `/${city.slug}`,
      indexable: false,
      lastModified: runtimeTimestamp,
    },
    updatedAt: runtimeTimestamp,
  }),
);

const runtimeDraftSnapshot: ContentSnapshot = {
  cities: draftCities,
  profiles: [],
  services: [],
  settings: {
    brandName: 'PecadosVip',
    publicationEnabled: false,
    analyticsConsentConfigured: false,
    contact: contactConfig.contact,
    legal: {
      legalNotice: emptyLegalDocument('Aviso legal'),
      privacy: emptyLegalDocument('Privacidad'),
      cookies: emptyLegalDocument('Cookies'),
      serviceTerms: emptyLegalDocument('Términos del servicio'),
    },
  },
};

export function getRuntimeContentResolution(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): RuntimeContentResolution {
  const resolution = resolveRuntimeContentFromEnvironment(
    runtimeDraftSnapshot,
    environment,
  );
  return structuredClone(resolution);
}

export function getRuntimeContentSnapshot(): ContentSnapshot {
  return getRuntimeContentResolution().snapshot;
}

export function getRuntimeContentActivationState(): RuntimeContentActivationState {
  return getRuntimeContentResolution().activation;
}
