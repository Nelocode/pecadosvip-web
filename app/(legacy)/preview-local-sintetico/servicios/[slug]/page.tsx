import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import type { Locale } from '../../../../../lib/i18n/locales';
import { getSyntheticBetaCopy } from '../../../../../lib/preview/synthetic-beta-copy';
import {
  syntheticExperienceHome,
  syntheticExperienceProfile,
  syntheticExperienceProfiles,
  syntheticExperienceService,
  syntheticExperienceServices,
  type SyntheticExperienceMode,
} from '../../../../../lib/preview/synthetic-experience';
import {
  getRelatedSyntheticServices,
  getSyntheticService,
  getSyntheticServiceCatalog,
  getSyntheticServiceMessages,
  isSyntheticServiceLocale,
} from '../../../../../lib/preview/synthetic-services';
import { getSyntheticServiceMedia } from '../../../../../lib/preview/synthetic-service-media';
import {
  getSyntheticPreviewProfile,
  getSyntheticPreviewProfiles,
  isSyntheticPreviewRequestAllowed,
  getSyntheticPreviewBuildEnvironment,
} from '../../../../../lib/preview/synthetic-preview';
import ProfileCard from '../../../../components/ProfileCard';
import PublicProfileMedia from '../../../../components/PublicProfileMedia';
import SyntheticFiligree from '../../../../components/SyntheticFiligree';
import SyntheticPreviewNotice from '../../../../components/SyntheticPreviewNotice';
import SyntheticServiceCard from '../../../../components/SyntheticServiceCard';
import SyntheticServicesHeader from '../../../../components/SyntheticServicesHeader';

export const metadata: Metadata = {
  title: 'Detalle de servicio sintético · Previsualización local',
  description: 'Ruta local ficticia para validar detalle, navegación relacionada y controles de publicación.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const dynamic = 'force-dynamic';

type RawSearchParams = Record<string, string | string[] | undefined>;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function generateStaticParams() {
  return getSyntheticServiceCatalog('es').map((service) => ({ slug: service.slug }));
}

export type SyntheticServiceDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<RawSearchParams>;
  localeOverride?: Locale;
  mode?: SyntheticExperienceMode;
};

export default async function SyntheticServiceDetailPage({
  params,
  searchParams,
  localeOverride,
  mode = 'local-preview',
}: SyntheticServiceDetailPageProps) {
  if (mode === 'local-preview') {
    const requestHeaders = await headers();
    const environment = getSyntheticPreviewBuildEnvironment(import.meta.env);
    if (!isSyntheticPreviewRequestAllowed(requestHeaders.get('host'), environment)) {
      notFound();
    }
  }

  const { slug } = await params;
  if (!slugPattern.test(slug)) notFound();
  const raw = await searchParams;
  const rawLocale = single(raw.lang);
  const locale: Locale = localeOverride ?? (
    isSyntheticServiceLocale(rawLocale) ? rawLocale : 'es'
  );
  const service = getSyntheticService(slug, locale);
  if (!service) notFound();

  const messages = getSyntheticServiceMessages(locale);
  const betaMessages = getSyntheticBetaCopy(locale);
  const group = messages.groups[service.group];
  const related = getRelatedSyntheticServices(service, locale, 4);
  const primaryProfile = getSyntheticPreviewProfile(service.profileSlug, mode)!;
  const primaryMedia = getSyntheticServiceMedia(service.mediaKey, locale, mode);
  const relatedProfiles = getSyntheticPreviewProfiles(mode)
    .filter((profile) => profile.slug !== primaryProfile.slug)
    .slice(0, 2);
  const profiles = [primaryProfile, ...relatedProfiles];
  const homePath = syntheticExperienceHome(locale, mode);
  const profilesPath = syntheticExperienceProfiles(locale, mode);
  const servicesPath = syntheticExperienceServices(locale, mode);
  const servicePath = syntheticExperienceService(locale, service.slug, mode);

  return (
    <div className="public-page synthetic-preview-page synthetic-services-page synthetic-service-detail-page" id="service-top" lang={locale}>
      <SyntheticFiligree mode={mode} />
      <SyntheticServicesHeader
        current="detail"
        documentDescription={service.teaser}
        documentTitle={`${service.name} | PecadosVip`}
        languagePath={servicePath}
        locale={locale}
        mode={mode}
      />

      <main id="main-content" tabIndex={-1}>
        <nav className="synthetic-service-breadcrumb" aria-label={messages.navigation.breadcrumbAria}>
          <a href={`${homePath}#inicio`}>{messages.navigation.home}</a>
          <span aria-hidden="true">/</span>
          <a href={servicesPath}>{messages.detail.breadcrumb}</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{service.name}</span>
        </nav>

        <article>
          <section className="synthetic-service-detail-hero" aria-labelledby="service-detail-title">
            <div className="synthetic-service-detail-media">
              <PublicProfileMedia
                media={primaryMedia}
                objectPosition={primaryMedia.objectPosition}
                preserveFullImage={false}
                priority
                sizes="(max-width: 780px) 100vw, 50vw"
              />
              <span>{messages.media.generatedBadge}</span>
            </div>
            <div className="synthetic-service-detail-copy">
              <p className="public-eyebrow">{messages.detail.previewEyebrow}</p>
              <p className="synthetic-service-detail-group">{service.groupLabel}</p>
              <h1 id="service-detail-title">{service.name}</h1>
              <p>{group.overview}</p>
              <a className="public-primary-action" href="#service-process">
                {messages.detail.processTitle}
              </a>
            </div>
          </section>

          <nav
            aria-label={messages.detail.previewEyebrow}
            className="synthetic-service-detail-index"
          >
            <a href="#service-overview">{messages.detail.overviewTitle}</a>
            <a href="#service-process">{messages.detail.processTitle}</a>
            <a href="#service-safeguards">{messages.detail.safeguardsTitle}</a>
            <a href="#service-related">{messages.detail.relatedTitle}</a>
            <a href="#service-profiles">{messages.detail.profilesTitle}</a>
          </nav>

          <section className="synthetic-service-detail-overview" id="service-overview" aria-labelledby="service-overview-title">
            <div>
              <p className="public-eyebrow">01</p>
              <h2 id="service-overview-title">{messages.detail.overviewTitle}</h2>
            </div>
            <p>{service.teaser} {group.overview}</p>
          </section>

          <section className="synthetic-service-process" id="service-process" aria-labelledby="service-process-title">
            <div className="public-section-heading synthetic-preview-section-heading">
              <p className="public-eyebrow">02</p>
              <h2 id="service-process-title">{messages.detail.processTitle}</h2>
            </div>
            <ol>
              {messages.detail.processSteps.map((step, index) => (
                <li key={step}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="synthetic-service-safeguards" id="service-safeguards" aria-labelledby="service-safeguards-title">
            <div>
              <p className="public-eyebrow">03</p>
              <h2 id="service-safeguards-title">{messages.detail.safeguardsTitle}</h2>
            </div>
            <ul>
              {group.safeguards.map((safeguard) => <li key={safeguard}>{safeguard}</li>)}
            </ul>
          </section>

          <section className="public-section synthetic-service-related" id="service-related" aria-labelledby="service-related-title">
            <div className="public-section-heading synthetic-preview-section-heading">
              <p className="public-eyebrow">04</p>
              <h2 id="service-related-title">{messages.detail.relatedTitle}</h2>
            </div>
            <div className="synthetic-services-grid synthetic-services-grid-related">
              {related.map((candidate) => (
                <SyntheticServiceCard
                  action={messages.hub.openService}
                  badge={messages.media.aiShort}
                  badgeLabel={messages.media.generatedBadge}
                  key={candidate.slug}
                  locale={locale}
                  mode={mode}
                  service={candidate}
                />
              ))}
            </div>
          </section>

          <section className="public-section synthetic-service-profiles" id="service-profiles" aria-labelledby="service-profiles-title">
            <div className="public-section-heading synthetic-preview-section-heading">
              <p className="public-eyebrow">05</p>
              <h2 id="service-profiles-title">{messages.detail.profilesTitle}</h2>
              <p>{messages.detail.profilesBody}</p>
            </div>
            <div className="profile-grid synthetic-profile-grid synthetic-service-profile-grid">
              {profiles.map((profile) => (
                <ProfileCard
                  disclosure={messages.media.fictionalBadge}
                  key={profile.slug}
                  preserveFullImage
                  profile={{ ...profile, cover: { ...profile.cover, alt: messages.media.generatedAlt } }}
                  profileHref={syntheticExperienceProfile(locale, profile.slug, mode)}
                  locale={locale}
                />
              ))}
            </div>
          </section>

          <section className="synthetic-preview-disabled-conversion synthetic-service-disabled" role="note">
            <div>
              <p className="public-eyebrow">{messages.detail.disabledTitle}</p>
              <h2>{messages.detail.disabledTitle}</h2>
              <p>{messages.detail.disabledBody}</p>
            </div>
            <button disabled type="button">{messages.detail.disabledButton}</button>
          </section>

          <a className="synthetic-service-back" href={servicesPath}>
            <span aria-hidden="true">←</span> {messages.detail.backToServices}
          </a>
        </article>
      </main>

      <footer className="public-footer synthetic-preview-footer synthetic-services-footer">
        <div>
          <p className="synthetic-preview-footer-brand">PecadosVip</p>
          <p>{messages.footer.tagline}</p>
        </div>
        <nav aria-label={messages.navigation.footerAria}>
          <a href={servicesPath}>{messages.navigation.services}</a>
          <a href={profilesPath}>{messages.navigation.profiles}</a>
          <a href="#service-top">{messages.footer.top}</a>
        </nav>
        <span>{messages.footer.status}</span>
      </footer>

      <SyntheticPreviewNotice
        {...(mode === 'public-beta'
          ? {
              label: `${betaMessages.navigation.betaStatus} · 18+`,
              body: betaMessages.servicesSection.conversionBody,
              accept: messages.notice.accept,
              restore: messages.notice.restore,
            }
          : messages.notice)}
      />
    </div>
  );
}
