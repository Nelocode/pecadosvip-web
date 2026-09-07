import { citySlugs } from '../lib/content/types.ts';
import type {
  ApprovalRecord,
  CityPage,
  ContentSnapshot,
  LegalDocument,
  Profile,
} from '../lib/content/types.ts';

const timestamp = '2026-08-26T21:00:00-05:00';

const approved: ApprovalRecord = {
  state: 'approved',
  approvedBy: 'test-approver',
  approvedAt: timestamp,
  sourceReference: 'synthetic-test-only',
};

function legalDocument(title: string): LegalDocument {
  return {
    title,
    body: `${title} synthetic test content`,
    approval: approved,
    updatedAt: timestamp,
  };
}

export function makeProfile(index: number): Profile {
  const citySlug = citySlugs[index % citySlugs.length];

  return {
    id: `profile-${index}`,
    slug: `synthetic-profile-${index}`,
    displayName: `Synthetic ${index}`,
    age: 25,
    biography: 'Synthetic content used only by automated tests.',
    measurements: { heightCm: 170 },
    languages: ['es'],
    serviceIds: ['service-private'],
    media: [
      {
        id: `media-${index}`,
        kind: 'image',
        desktopUrl: `/test-only/profile-${index}.jpg`,
        alt: `Synthetic test profile ${index}`,
        order: 0,
        rightsConfirmed: true,
        rightsEvidence: 'synthetic-test-only',
      },
    ],
    availability: 'on-request',
    citySlugs: [citySlug],
    status: 'published',
    approval: approved,
    verificationEvidenceReference: 'synthetic-test-only',
    adultAgeConfirmed: true,
    publicationConsentConfirmed: true,
    rightsConfirmed: true,
    createdAt: timestamp,
    updatedAt: timestamp,
    revision: 1,
  };
}

function makeCity(slug: (typeof citySlugs)[number], profiles: Profile[]): CityPage {
  return {
    id: `city-${slug}`,
    slug,
    name: slug[0].toUpperCase() + slug.slice(1),
    cluster: ['madrid', 'toledo', 'guadalajara', 'segovia'].includes(slug)
      ? 'madrid'
      : 'barcelona',
    status: 'published',
    serviceConfirmed: true,
    approval: approved,
    headline: `Synthetic heading for ${slug}`,
    introduction: `Synthetic local introduction for ${slug}.`,
    differentiators: ['Synthetic differentiator'],
    coverageAreas: [{ name: `Synthetic area ${slug}`, confirmed: true }],
    profileSlugs: profiles
      .filter((profile) => profile.citySlugs.includes(slug))
      .map((profile) => profile.slug),
    faqs: [{ question: 'Synthetic question?', answer: 'Synthetic answer.' }],
    nearbyCitySlugs: citySlugs
      .filter((candidate) => candidate !== slug)
      .slice(0, 2),
    seo: {
      title: `Synthetic ${slug}`,
      description: `Synthetic metadata for ${slug}.`,
      canonicalPath: `/${slug}`,
      indexable: true,
      lastModified: timestamp,
    },
    updatedAt: timestamp,
  };
}

export function makeSnapshot(profileCount = 8): ContentSnapshot {
  const profiles = Array.from(
    { length: profileCount },
    (_, index) => makeProfile(index + 1),
  );

  return {
    cities: citySlugs.map((slug) => makeCity(slug, profiles)),
    profiles,
    services: [
      {
        id: 'service-private',
        slug: 'private-service',
        name: 'Synthetic private service',
        description: 'Synthetic content used only by automated tests.',
        status: 'published',
        approval: approved,
      },
    ],
    settings: {
      brandName: 'Synthetic test brand',
      canonicalOrigin: 'https://synthetic-test-only.example.org',
      publicationEnabled: true,
      analyticsConsentConfigured: true,
      contact: { telegramUrl: 'https://t.me/synthetic_test_only' },
      legal: {
        legalNotice: legalDocument('Legal notice'),
        privacy: legalDocument('Privacy'),
        cookies: legalDocument('Cookies'),
        serviceTerms: legalDocument('Service terms'),
      },
    },
  };
}
