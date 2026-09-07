import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import {
  getSyntheticPreviewProfile,
  getSyntheticPreviewBuildEnvironment,
  isSyntheticPreviewRequestAllowed,
  syntheticPreviewAssetRoles,
  type SyntheticPreviewAssetRole,
} from '../../../../../lib/preview/synthetic-preview';
import {
  LOCALE_ENDONYMS,
  SUPPORTED_LOCALES,
  type Locale,
} from '../../../../../lib/i18n/locales';
import { interpolate } from '../../../../../lib/i18n/catalog';
import { isSyntheticServiceLocale } from '../../../../../lib/preview/synthetic-services';
import {
  getSyntheticBetaCopy,
  type SyntheticBetaProfileSlug,
} from '../../../../../lib/preview/synthetic-beta-copy';
import {
  syntheticExperienceHome,
  syntheticExperienceProfile,
  syntheticExperienceProfiles,
  type SyntheticExperienceMode,
  withSyntheticQuery,
} from '../../../../../lib/preview/synthetic-experience';
import PublicProfileMedia from '../../../../components/PublicProfileMedia';
import SyntheticFiligree from '../../../../components/SyntheticFiligree';

export const metadata: Metadata = {
  title: 'Ficha sintética · Previsualización local',
  description: 'Ficha local de una identidad adulta ficticia generada con IA.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const dynamic = 'force-dynamic';

export type SyntheticProfilePageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  localeOverride?: Locale;
  mode?: SyntheticExperienceMode;
};

function selectedRole(
  raw: string | string[] | undefined,
): SyntheticPreviewAssetRole {
  return typeof raw === 'string' &&
    syntheticPreviewAssetRoles.includes(raw as SyntheticPreviewAssetRole)
    ? (raw as SyntheticPreviewAssetRole)
    : 'cover';
}

export default async function SyntheticProfilePage({
  params,
  searchParams,
  localeOverride,
  mode = 'local-preview',
}: SyntheticProfilePageProps) {
  if (mode === 'local-preview') {
    const requestHeaders = await headers();
    const previewEnvironment = getSyntheticPreviewBuildEnvironment(import.meta.env);
    if (
      !isSyntheticPreviewRequestAllowed(
        requestHeaders.get('host'),
        previewEnvironment,
      )
    ) {
      notFound();
    }
  }

  const { slug } = await params;
  const profile = getSyntheticPreviewProfile(slug, mode);
  if (!profile) notFound();

  const query = await searchParams;
  const rawLocale = typeof query.lang === 'string' ? query.lang : undefined;
  const locale: Locale = localeOverride ?? (
    isSyntheticServiceLocale(rawLocale) ? rawLocale : 'es'
  );
  const messages = getSyntheticBetaCopy(locale);
  const editorial = messages.profiles[profile.slug as SyntheticBetaProfileSlug];
  const activeRole = selectedRole(query.foto);
  const activeMedia =
    profile.media.find((candidate) => candidate.role === activeRole) ??
    profile.cover;

  return (
    <div className="public-page synthetic-preview-page synthetic-profile-page">
      <SyntheticFiligree mode={mode} />
      <header className="public-header synthetic-preview-header">
        <a className="public-brand" href={`${syntheticExperienceHome(locale, mode)}#inicio`}>
          PecadosVip
        </a>
        <nav className="synthetic-service-language" aria-label={messages.navigation.languageAria}>
          {SUPPORTED_LOCALES.map((candidate) => (
            <a
              aria-current={candidate === locale ? 'page' : undefined}
              href={syntheticExperienceProfile(candidate, profile.slug, mode)}
              hrefLang={candidate}
              key={candidate}
              lang={candidate}
            >
              {LOCALE_ENDONYMS[candidate]}
            </a>
          ))}
        </nav>
        <strong className="synthetic-preview-local-status">{mode === 'public-beta' ? messages.profile.statusBanner : 'PREVIEW LOCAL · NO PUBLICAR'}</strong>
      </header>
      <main id="main-content" tabIndex={-1}>
        <nav className="synthetic-profile-breadcrumb" aria-label={messages.profile.breadcrumbAria}>
          <a href={syntheticExperienceProfiles(locale, mode)}>{messages.profile.breadcrumbProfiles}</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{profile.displayName}</span>
        </nav>

        <article className="profile-detail synthetic-profile-detail" aria-labelledby="profile-detail-title">
          <section
            className="profile-detail-media synthetic-profile-media"
            aria-label={interpolate(messages.profile.galleryAria, { name: editorial.displayName })}
          >
            <div className="profile-detail-image synthetic-profile-active-image">
              <PublicProfileMedia
                media={{
                  ...activeMedia,
                  alt: interpolate(messages.profile.galleryAria, { name: editorial.displayName }),
                }}
                priority
                sizes="(max-width: 780px) 90vw, 52vw"
              />
              <span>{messages.profile.imageGenerated}</span>
            </div>
            <nav className="synthetic-profile-thumbnails" aria-label={messages.profile.selectPhotoAria}>
              {profile.media.map((candidate, index) => {
                const label = candidate.role === 'cover'
                  ? messages.profile.coverLabel
                  : interpolate(messages.profile.sceneLabel, { number: String(index) });
                return (
                <a
                  aria-current={candidate.role === activeRole ? 'true' : undefined}
                  aria-label={interpolate(messages.profile.showPhotoAria, {
                    label: label.toLocaleLowerCase(locale),
                    name: editorial.displayName,
                  })}
                  href={withSyntheticQuery(
                    syntheticExperienceProfile(locale, profile.slug, mode),
                    { foto: candidate.role },
                  )}
                  key={candidate.role}
                >
                  <PublicProfileMedia
                    media={{ ...candidate, alt: '' }}
                    sizes="(max-width: 780px) 22vw, 120px"
                    preserveFullImage={false}
                  />
                  <span>{candidate.role === 'cover' ? messages.profile.coverLabel : candidate.role.slice(-2)}</span>
                </a>
                );
              })}
            </nav>
          </section>

          <div className="profile-detail-copy synthetic-profile-copy">
            <p className="public-eyebrow">{messages.profile.syntheticNotice}</p>
            <h1 id="profile-detail-title">{editorial.displayName}</h1>
            <p className="synthetic-profile-summary">
              {interpolate(messages.profile.ageYears, { age: profile.age })} · {profile.citySlugs.map((city) => messages.cities[city as keyof typeof messages.cities] ?? city).join(' · ')}
            </p>
            <p>{editorial.biography}</p>

            <dl>
              <div>
                <dt>{messages.profile.identityLabel}</dt>
                <dd>{messages.profile.identityValue}</dd>
              </div>
              <div>
                <dt>{messages.profile.visualStatusLabel}</dt>
                <dd>{messages.profile.availability[profile.availability]}</dd>
              </div>
              <div>
                <dt>{messages.profile.visualOriginLabel}</dt>
                <dd>{messages.profile.visualOriginValue}</dd>
              </div>
              <div>
                <dt>{messages.profile.publicationLabel}</dt>
                <dd>{messages.profile.publicationValue}</dd>
              </div>
            </dl>

            <section className="synthetic-profile-concept" aria-labelledby="profile-concept-title">
              <h2 id="profile-concept-title">{messages.profile.conceptTitle}</h2>
              <ul>
                {editorial.conceptTags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
            </section>

            <div className="synthetic-profile-disabled-contact" role="note">
              <strong>{messages.profile.contactDisabledTitle}</strong>
              <p>{messages.profile.contactDisabledBody}</p>
              <button type="button" disabled>
                {messages.profile.contactDisabledButton}
              </button>
            </div>
            <a className="synthetic-profile-back" href={syntheticExperienceProfiles(locale, mode)}>
              ← {messages.profile.backToProfiles}
            </a>
          </div>
        </article>
      </main>
      <footer className="public-footer synthetic-preview-footer">
        <p>{messages.profile.footerTagline}</p>
        <a href={syntheticExperienceProfiles(locale, mode)}>{messages.profile.footerCatalog}</a>
        <span>{messages.profile.footerStatus}</span>
      </footer>
    </div>
  );
}
