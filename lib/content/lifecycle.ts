import type { CmsRole, Profile, PublicationStatus } from './types.ts';
import { isProfilePublicationReady } from './validation.ts';

const transitions: Record<PublicationStatus, readonly PublicationStatus[]> = {
  draft: ['hidden', 'published', 'archived'],
  hidden: ['draft', 'published', 'archived'],
  published: ['hidden', 'archived'],
  archived: ['draft'],
};

export function canTransition(
  role: CmsRole,
  from: PublicationStatus,
  to: PublicationStatus,
): boolean {
  if (role !== 'admin' && role !== 'editor') {
    return false;
  }

  if (!transitions[from].includes(to)) {
    return false;
  }

  if (
    role === 'editor' &&
    (to === 'published' || to === 'archived' || from === 'archived')
  ) {
    return false;
  }

  return true;
}

export function transitionProfile(
  profile: Profile,
  role: CmsRole,
  to: PublicationStatus,
  occurredAt: string,
): Profile {
  if (!canTransition(role, profile.status, to)) {
    throw new Error(`Transition ${profile.status} -> ${to} is not allowed for ${role}`);
  }

  if (to === 'published' && !isProfilePublicationReady(profile)) {
    throw new Error('PROFILE_PUBLICATION_EVIDENCE_MISSING');
  }

  return {
    ...profile,
    status: to,
    updatedAt: occurredAt,
    revision: profile.revision + 1,
  };
}

export function archiveProfile(
  profile: Profile,
  role: CmsRole,
  occurredAt: string,
): Profile {
  return transitionProfile(profile, role, 'archived', occurredAt);
}

export function restoreProfile(
  profile: Profile,
  role: CmsRole,
  occurredAt: string,
): Profile {
  const restored = transitionProfile(profile, role, 'draft', occurredAt);

  return {
    ...restored,
    availability: 'unavailable',
    approval: { state: 'pending' },
    verificationEvidenceReference: undefined,
    adultAgeConfirmed: false,
    publicationConsentConfirmed: false,
    rightsConfirmed: false,
  };
}

export function duplicateProfile(
  profile: Profile,
  role: CmsRole,
  id: string,
  slug: string,
  occurredAt: string,
): Profile {
  if (role !== 'admin' && role !== 'editor') {
    throw new Error('Unknown CMS role');
  }

  return {
    ...structuredClone(profile),
    id,
    slug,
    displayName: '',
    age: null,
    biography: '',
    measurements: {},
    languages: [],
    media: [],
    availability: 'unavailable',
    status: 'draft',
    approval: { state: 'pending' },
    verificationEvidenceReference: undefined,
    adultAgeConfirmed: false,
    publicationConsentConfirmed: false,
    rightsConfirmed: false,
    createdAt: occurredAt,
    updatedAt: occurredAt,
    revision: 1,
  };
}
