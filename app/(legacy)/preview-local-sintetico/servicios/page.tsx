import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import type { Locale } from '../../../../lib/i18n/locales';
import { getSyntheticBetaCopy } from '../../../../lib/preview/synthetic-beta-copy';
import {
  syntheticExperienceHome,
  syntheticExperienceProfiles,
  syntheticExperienceService,
  syntheticExperienceServices,
  type SyntheticExperienceMode,
} from '../../../../lib/preview/synthetic-experience';
import {
  getSyntheticCityMedia,
  syntheticCityMediaSlugs,
} from '../../../../lib/preview/synthetic-city-media';
import {
  getSyntheticServiceCatalog,
  getSyntheticServiceMessages,
  isSyntheticServiceGroup,
  isSyntheticServiceLocale,
} from '../../../../lib/preview/synthetic-services';
import { getSyntheticServiceMedia } from '../../../../lib/preview/synthetic-service-media';
import {
  isSyntheticPreviewRequestAllowed,
  getSyntheticPreviewBuildEnvironment,
} from '../../../../lib/preview/synthetic-preview';
import PublicProfileMedia from '../../../components/PublicProfileMedia';
import SyntheticFiligree from '../../../components/SyntheticFiligree';
import SyntheticPreviewNotice from '../../../components/SyntheticPreviewNotice';
import SyntheticServiceExplorer from '../../../components/SyntheticServiceExplorer';
import SyntheticServicesHeader from '../../../components/SyntheticServicesHeader';

const cityLabels = {
  madrid: 'Madrid',
  barcelona: 'Barcelona',
  girona: 'Girona',
  tarragona: 'Tarragona',
  toledo: 'Toledo',
  guadalajara: 'Guadalajara',
  segovia: 'Segovia',
  sitges: 'Sitges',
} as const;

export const metadata: Metadata = {
  title: 'Servicios sintéticos · Previsualización local',
  description: 'Arquitectura local de servicios ficticios para validar diseño, rutas y estados sin habilitar conversión.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const dynamic = 'force-dynamic';

type RawSearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function previewEnvironment() {
  return getSyntheticPreviewBuildEnvironment(import.meta.env);
}

export type SyntheticServicesPageProps = {
  searchParams: Promise<RawSearchParams>;
  localeOverride?: Locale;
  mode?: SyntheticExperienceMode;
};

export default async function SyntheticServicesPage({
  searchParams,
  localeOverride,
  mode = 'local-preview',
}: SyntheticServicesPageProps) {
  if (mode === 'local-preview') {
    const requestHeaders = await headers();
    if (
      !isSyntheticPreviewRequestAllowed(
        requestHeaders.get('host'),
        previewEnvironment(),
      )
    ) {
      notFound();
    }
  }

  const raw = await searchParams;
  const rawLocale = single(raw.lang);
  const locale: Locale = localeOverride ?? (
    isSyntheticServiceLocale(rawLocale) ? rawLocale : 'es'
  );
  const rawGroup = single(raw.category);
  const validGroup =
    rawGroup === undefined || rawGroup === 'all' || isSyntheticServiceGroup(rawGroup);
  const selectedGroup = isSyntheticServiceGroup(rawGroup) ? rawGroup : undefined;
  const messages = getSyntheticServiceMessages(locale);
  const betaMessages = getSyntheticBetaCopy(locale);
  const fullCatalog = getSyntheticServiceCatalog(locale);
  const heroMedia = getSyntheticServiceMedia('company-private-lounge', locale, mode);
  const editorialMedia = getSyntheticServiceMedia(
    'preferences-silk-envelope',
    locale,
    mode,
  );
  const homePath = syntheticExperienceHome(locale, mode);
  const profilesPath = syntheticExperienceProfiles(locale, mode);
  const servicesPath = syntheticExperienceServices(locale, mode);

  return (
    <div className="public-page synthetic-preview-page synthetic-services-page" id="service-top" lang={locale}>
      <SyntheticFiligree mode={mode} />
      <SyntheticServicesHeader
        current="services"
        documentDescription={messages.hub.lead}
        documentTitle={`${messages.hub.title} | PecadosVip`}
        languagePath={servicesPath}
        locale={locale}
        mode={mode}
      />

      <main id="main-content" tabIndex={-1}>
        <nav className="synthetic-service-breadcrumb" aria-label={messages.navigation.breadcrumbAria}>
          <a href={`${homePath}#inicio`}>{messages.navigation.home}</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{messages.navigation.services}</span>
        </nav>

        <section className="synthetic-services-hero" aria-labelledby="services-preview-title">
          <div>
            <p className="public-eyebrow">{messages.hub.eyebrow}</p>
            <h1 id="services-preview-title">{messages.hub.title}</h1>
            <p>{messages.hub.lead}</p>
            <div className="public-actions">
              <a className="public-primary-action" href="#service-catalog">
                {messages.hub.catalogTitle}
              </a>
              <a className="public-secondary-action" href="#service-faq">
                {messages.hub.faqTitle}
              </a>
            </div>
          </div>
          <div className="synthetic-services-hero-media">
            <PublicProfileMedia
              media={heroMedia}
              objectPosition={heroMedia.objectPosition}
              preserveFullImage={false}
              priority
              sizes="(max-width: 780px) 100vw, 48vw"
            />
            <span>{messages.media.generatedBadge}</span>
          </div>
        </section>

        <section className="synthetic-services-intro" aria-label={messages.hub.introExperienceTitle}>
          <article>
            <span aria-hidden="true">01</span>
            <h2>{messages.hub.introExperienceTitle}</h2>
            <p>{messages.hub.introExperienceBody}</p>
          </article>
          <article>
            <span aria-hidden="true">02</span>
            <h2>{messages.hub.introSafetyTitle}</h2>
            <p>{messages.hub.introSafetyBody}</p>
          </article>
        </section>

        <section className="public-section synthetic-services-catalog" id="service-catalog" aria-labelledby="service-catalog-title">
          <div className="public-section-heading public-section-heading-inline synthetic-preview-section-heading">
            <div>
              <p className="public-eyebrow">{messages.hub.catalogEyebrow}</p>
              <h2 id="service-catalog-title">{messages.hub.catalogTitle}</h2>
              <p>{messages.hub.catalogLead}</p>
            </div>
          </div>

          {!validGroup ? (
            <div className="public-empty-state public-empty-state-error" role="alert">
              <strong>{messages.hub.filterLegend}</strong>
              <p>{messages.hub.catalogLead}</p>
              <a href={`${servicesPath}#service-catalog`}>
                {messages.hub.resetFilter}
              </a>
            </div>
          ) : (
            <SyntheticServiceExplorer
              catalog={fullCatalog}
              initialGroup={selectedGroup}
              locale={locale}
              mode={mode}
            />
          )}
        </section>

        <section className="synthetic-services-editorial" aria-labelledby="services-editorial-title">
          <div className="synthetic-services-editorial-media">
            <PublicProfileMedia
              media={editorialMedia}
              objectPosition={editorialMedia.objectPosition}
              preserveFullImage={false}
              sizes="(max-width: 780px) 100vw, 50vw"
            />
            <span>{messages.media.generatedBadge}</span>
          </div>
          <div>
            <p className="public-eyebrow">{messages.hub.editorialEyebrow}</p>
            <h2 id="services-editorial-title">{messages.hub.editorialTitle}</h2>
            <p>{messages.hub.editorialBody}</p>
            <a className="public-secondary-action" href={profilesPath}>
              {messages.navigation.profiles}
            </a>
          </div>
        </section>

        <section className="synthetic-services-rates" aria-labelledby="services-rates-title">
          <div>
            <p className="public-eyebrow">{messages.hub.ratesEyebrow}</p>
            <h2 id="services-rates-title">{messages.hub.ratesTitle}</h2>
            <p>{messages.hub.ratesBody}</p>
          </div>
          <button disabled type="button">{messages.hub.ratesCta}</button>
        </section>

        <section className="synthetic-services-independent" aria-labelledby="services-independent-title">
          <span aria-hidden="true">18+</span>
          <div>
            <h2 id="services-independent-title">{messages.hub.independenceTitle}</h2>
            <p>{messages.hub.independenceBody}</p>
          </div>
        </section>

        <section className="public-section synthetic-services-coverage" id="service-coverage" aria-labelledby="services-coverage-title">
          <div className="public-section-heading synthetic-preview-section-heading">
            <p className="public-eyebrow">{messages.hub.coverageEyebrow}</p>
            <h2 id="services-coverage-title">{messages.hub.coverageTitle}</h2>
            <p>{messages.hub.coverageBody}</p>
            <p className="synthetic-city-disclosure">
              {getSyntheticCityMedia('madrid', locale, mode).disclosure}
            </p>
          </div>
          <div className="synthetic-services-city-directory">
            {syntheticCityMediaSlugs.map((citySlug, index) => {
              const cityMedia = getSyntheticCityMedia(citySlug, locale, mode);
              return (
                <a href={`${homePath}#city-${citySlug}`} key={citySlug}>
                  <figure className="synthetic-services-city-media">
                    <PublicProfileMedia
                      media={cityMedia}
                      objectPosition={cityMedia.objectPosition}
                      preserveFullImage={false}
                      sizes="(max-width: 480px) 90vw, (max-width: 780px) 45vw, 15vw"
                    />
                    <figcaption>{cityMedia.shortDisclosure}</figcaption>
                  </figure>
                  <div className="synthetic-services-city-copy">
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{cityLabels[citySlug]}</strong>
                    <small>{messages.hub.pendingStatus}</small>
                  </div>
                </a>
              );
            })}
          </div>
        </section>

        <section className="public-section synthetic-services-faq" id="service-faq" aria-labelledby="services-faq-title">
          <div className="public-section-heading synthetic-preview-section-heading">
            <p className="public-eyebrow">{messages.hub.faqEyebrow}</p>
            <h2 id="services-faq-title">{messages.hub.faqTitle}</h2>
          </div>
          <div className="synthetic-services-faq-list">
            {messages.faqs.map((faq, index) => (
              <details key={faq.question} open={index === 0}>
                <summary>{faq.question}</summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="synthetic-services-directory" aria-labelledby="services-directory-title">
          <h2 id="services-directory-title">{messages.hub.directoryTitle}</h2>
          <div>
            {fullCatalog.map((service) => (
              <a href={syntheticExperienceService(locale, service.slug, mode)} key={service.slug}>
                {service.name}
              </a>
            ))}
          </div>
        </section>
      </main>

      <footer className="public-footer synthetic-preview-footer synthetic-services-footer">
        <div>
          <p className="synthetic-preview-footer-brand">PecadosVip</p>
          <p>{messages.footer.tagline}</p>
        </div>
        <nav aria-label={messages.navigation.footerAria}>
          <a href={`${homePath}#inicio`}>{messages.navigation.home}</a>
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
