export const citySlugs = [
  'madrid',
  'barcelona',
  'girona',
  'tarragona',
  'toledo',
  'guadalajara',
  'segovia',
] as const;

export type CitySlug = (typeof citySlugs)[number];
export type PublicationStatus = 'draft' | 'hidden' | 'published' | 'archived';
export type Availability = 'available' | 'limited' | 'unavailable' | 'on-request';
export type ApprovalState = 'pending' | 'approved' | 'rejected';
export type CmsRole = 'admin' | 'editor' | 'super_admin' | 'booking_agent' | 'seo_specialist' | 'kyc_officer';

export type ApprovalRecord = {
  state: ApprovalState;
  sourceReference?: string;
  approvedBy?: string;
  approvedAt?: string;
};

export type SeoFields = {
  title: string;
  description: string;
  canonicalPath: `/${string}` | '/';
  indexable: boolean;
  lastModified: string;
};

export type MediaAsset = {
  id: string;
  kind: 'image' | 'video';
  desktopUrl: string;
  mobileUrl?: string;
  alt: string;
  order: number;
  rightsConfirmed: boolean;
  rightsEvidence?: string;
};

export type ProfileMeasurements = {
  heightCm?: number;
  weightKg?: number;
  bustCm?: number;
  waistCm?: number;
  hipsCm?: number;
};

export type TourLocation = {
  citySlug: CitySlug;
  startDate: string;
  endDate: string;
  active: boolean;
};

export type TourItinerary = TourLocation;

export type ProfileRateItem = {
  durationMinutes: number;
  price: number;
  currency: string;
};

export type ProfileRates = {
  rates: ProfileRateItem[];
};

export type ProfilePhysicalTraits = {
  hairColor?: string;
  eyeColor?: string;
};

export type Profile = {
  id: string;
  slug: string;
  displayName: string;
  age: number | null;
  biography: string;
  measurements: ProfileMeasurements;
  languages: string[];
  serviceIds: string[];
  media: MediaAsset[];
  availability: Availability;
  citySlugs: CitySlug[];
  status: PublicationStatus;
  approval: ApprovalRecord;
  verificationEvidenceReference?: string;
  adultAgeConfirmed: boolean;
  publicationConsentConfirmed: boolean;
  rightsConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
  revision: number;
  tours?: TourLocation[];
  incall?: boolean;
  outcall?: boolean;
  verifiedBadge?: boolean;
  rates?: ProfileRates;
  physicalTraits?: ProfilePhysicalTraits;
};

export type CoverageArea = {
  name: string;
  confirmed: boolean;
};

export type Faq = {
  question: string;
  answer: string;
};

export type CityPage = {
  id: string;
  slug: CitySlug;
  name: string;
  cluster: 'madrid' | 'barcelona';
  status: PublicationStatus;
  serviceConfirmed: boolean;
  approval: ApprovalRecord;
  headline: string;
  introduction: string;
  differentiators: string[];
  coverageAreas: CoverageArea[];
  profileSlugs: string[];
  faqs: Faq[];
  nearbyCitySlugs: CitySlug[];
  seo: SeoFields;
  updatedAt: string;
};

export type Service = {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: PublicationStatus;
  approval: ApprovalRecord;
};

export type ContactSettings = {
  telegramUrl?: string;
  whatsappUrl?: string;
  phoneUrl?: string;
  emailUrl?: string;
  formActionUrl?: string;
};

export type LegalDocument = {
  title: string;
  body: string;
  approval: ApprovalRecord;
  updatedAt: string;
};

export type SiteSettings = {
  brandName: string;
  canonicalOrigin?: string;
  publicationEnabled: boolean;
  analyticsConsentConfigured: boolean;
  contact: ContactSettings;
  legal: {
    legalNotice: LegalDocument;
    privacy: LegalDocument;
    cookies: LegalDocument;
    serviceTerms: LegalDocument;
  };
};

export type ContentSnapshot = {
  cities: CityPage[];
  profiles: Profile[];
  services: Service[];
  settings: SiteSettings;
};

export type AuditEvent = {
  id: string;
  actorId: string;
  actorRole: CmsRole;
  requestId: string;
  action:
    | 'create'
    | 'edit'
    | 'duplicate'
    | 'publish'
    | 'hide'
    | 'archive'
    | 'restore'
    | 'availability-change'
    | 'reorder-media'
    | 'record-evidence'
    | 'approve'
    | 'return-to-draft';
  entityType: 'profile' | 'city' | 'service' | 'settings';
  entityId: string;
  sourceEntityId?: string;
  occurredAt: string;
  fromRevision?: number;
  toRevision?: number;
  fromStatus?: PublicationStatus;
  toStatus?: PublicationStatus;
  changedFields: string[];
};
