import type { Metadata } from 'next';
import Image from 'next/image';
// This route is runtime-guarded and must return 404 outside local development.
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';

import type { Availability, CitySlug } from '../../../lib/content/types';
import { interpolate } from '../../../lib/i18n/catalog';
import {
  LOCALE_ENDONYMS,
  SUPPORTED_LOCALES,
  localizedPath,
  type Locale,
} from '../../../lib/i18n/locales';
import {
  getSyntheticCityMedia,
} from '../../../lib/preview/synthetic-city-media';
import type { SyntheticCityMediaSlug } from '../../../lib/preview/synthetic-city-media';
import { isSyntheticServiceLocale } from '../../../lib/preview/synthetic-services';
import { getSyntheticBetaCopy } from '../../../lib/preview/synthetic-beta-copy';
import { getSyntheticHeroMedia } from '../../../lib/preview/synthetic-hero-media';
import {
  filterSyntheticPreviewProfiles,
  getSyntheticPreviewProfiles,
  getSyntheticPreviewBuildEnvironment,
  isSyntheticPreviewRequestAllowed,
} from '../../../lib/preview/synthetic-preview';
import type { SyntheticPreviewProfile } from '../../../lib/preview/synthetic-preview';
import {
  syntheticExperienceProfile,
  syntheticExperienceServices,
  type SyntheticExperienceMode,
  withSyntheticQuery,
} from '../../../lib/preview/synthetic-experience';
import ProfileCard from '../../components/ProfileCard';
import PublicProfileMedia from '../../components/PublicProfileMedia';
import SyntheticFiligree from '../../components/SyntheticFiligree';

export const metadata: Metadata = {
  title: 'PecadosVip · Previsualización local sintética',
  description:
    'Home local no publicable con identidades adultas ficticias generadas con IA para validar la experiencia visual.',
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
};

export const dynamic = 'force-dynamic';

type RawSearchParams = Record<string, string | string[] | undefined>;
export type SyntheticPreviewPageProps = {
  searchParams: Promise<RawSearchParams>;
  localeOverride?: Locale;
  mode?: SyntheticExperienceMode;
};

const previewCities = [
  'madrid',
  'barcelona',
  'girona',
  'tarragona',
  'toledo',
  'guadalajara',
  'segovia',
] as const satisfies readonly CitySlug[];

const coverageGroups: ReadonlyArray<{
  base: 'madrid' | 'barcelona';
  cities: readonly SyntheticCityMediaSlug[];
}> = [
  {
    base: 'madrid',
    cities: ['madrid', 'toledo', 'segovia', 'guadalajara'],
  },
  {
    base: 'barcelona',
    cities: ['barcelona', 'tarragona', 'girona', 'sitges'],
  },
];

type PreviewZone = (typeof coverageGroups)[number]['base'];

const profileHomeZones: Readonly<Record<string, PreviewZone>> = {
  valeria: 'madrid',
  lucia: 'madrid',
  alicia: 'madrid',
  sofia: 'barcelona',
  mia: 'barcelona',
  julia: 'barcelona',
};

const filterCityZones = {
  madrid: 'madrid',
  toledo: 'madrid',
  segovia: 'madrid',
  guadalajara: 'madrid',
  barcelona: 'barcelona',
  tarragona: 'barcelona',
  girona: 'barcelona',
} as const satisfies Readonly<Record<(typeof previewCities)[number], PreviewZone>>;

function getProfileCoverageZones(profile: SyntheticPreviewProfile): PreviewZone[] {
  const zones = new Set<PreviewZone>();
  for (const citySlug of profile.citySlugs) {
    const zone = filterCityZones[citySlug as keyof typeof filterCityZones];
    if (zone) {
      zones.add(zone);
    }
  }
  return [...zones];
}

const previewAvailabilities = [
  'available',
  'limited',
  'on-request',
  'unavailable',
] as const;

function isSingleAllowed<T extends string>(
  value: string | string[] | undefined,
  allowed: readonly T[],
): value is T | undefined {
  return value === undefined || (typeof value === 'string' && allowed.includes(value as T));
}

export default async function SyntheticPreviewPage({
  searchParams,
  localeOverride,
  mode = 'local-preview',
}: SyntheticPreviewPageProps) {
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

  const raw = await searchParams;
  const rawLocale = typeof raw.lang === 'string' ? raw.lang : undefined;
  const locale: Locale = localeOverride ?? (
    isSyntheticServiceLocale(rawLocale) ? rawLocale : 'es'
  );
  const messages = getSyntheticBetaCopy(locale);
  const requestedCity = raw.city === '' ? undefined : raw.city;
  const requestedAvailability =
    raw.availability === '' ? undefined : raw.availability;
  const validFilters =
    isSingleAllowed(requestedCity, previewCities) &&
    isSingleAllowed(requestedAvailability, previewAvailabilities);
  const city = validFilters
    ? (requestedCity as CitySlug | undefined)
    : undefined;
  const availability = validFilters
    ? (requestedAvailability as Availability | undefined)
    : undefined;
  const hasFilters = city !== undefined || availability !== undefined;
  const profiles = validFilters
    ? hasFilters
      ? filterSyntheticPreviewProfiles({ city, availability }, mode)
      : getSyntheticPreviewProfiles(mode)
    : [];
  const selectedZone = city
    ? filterCityZones[city as keyof typeof filterCityZones]
    : undefined;
  const profilesByZone: Record<PreviewZone, SyntheticPreviewProfile[]> = {
    madrid: [],
    barcelona: [],
  };
  for (const candidate of profiles) {
    const zones = selectedZone
      ? [selectedZone]
      : availability
        ? getProfileCoverageZones(candidate)
        : [profileHomeZones[candidate.slug]];
    for (const zone of zones) {
      if (zone) {
        profilesByZone[zone].push(candidate);
      }
    }
  }
  const heroMedia = getSyntheticHeroMedia('home-editorial', mode);
  const homePath = mode === 'public-beta'
    ? localizedPath(locale)
    : `/preview-local-sintetico?lang=${locale}`;
  const zoneHref = (zone: PreviewZone) => withSyntheticQuery(
    homePath,
    { city: zone, availability },
  ) + `#zona-${zone}`;
  const resetHref = `${homePath}#perfiles`;
  const servicesHref = syntheticExperienceServices(locale, mode);

  return (
    <div className="public-page synthetic-preview-page">
      <SyntheticFiligree mode={mode} />
      <header className="public-header synthetic-preview-header synthetic-beta-home-header" id="inicio">
        <a className="public-brand synthetic-preview-brand" href="#inicio">
          <Image
            alt=""
            aria-hidden="true"
            className="synthetic-preview-brand-mark"
            height={96}
            priority
            src="/icon.png"
            unoptimized
            width={96}
          />
          <span className="synthetic-preview-brand-copy">
            <span>PecadosVip</span>
            <small>{messages.brand.tagline}</small>
          </span>
        </a>
        <nav className="public-nav synthetic-preview-nav" aria-label={messages.navigation.primaryAria}>
          <a href="#inicio" aria-current="page">{messages.navigation.home}</a>
          <a href={zoneHref('madrid')}>Madrid</a>
          <a href={zoneHref('barcelona')}>Barcelona</a>
          <a href="#perfiles">{messages.navigation.profiles}</a>
          <a href="#servicios">{messages.navigation.outings}</a>
          <a href="#seguridad">{messages.navigation.about}</a>
          <a href="#seguridad">{messages.navigation.contact}</a>
        </nav>
        {mode === 'public-beta' ? (
          <nav className="synthetic-service-language" aria-label={messages.navigation.languageAria}>
            {SUPPORTED_LOCALES.map((candidate) => (
              <a
                aria-current={candidate === locale ? 'page' : undefined}
                href={localizedPath(candidate)}
                hrefLang={candidate}
                key={candidate}
                lang={candidate}
              >
                {LOCALE_ENDONYMS[candidate]}
              </a>
            ))}
          </nav>
        ) : null}
        <button
          className="synthetic-preview-reservation"
          type="button"
          disabled
          aria-label={messages.navigation.privateBookingAria}
          title={messages.navigation.privateBookingTitle}
        >
          {messages.navigation.privateBooking}
        </button>
        <a
          className="synthetic-preview-menu-link"
          href="#perfiles"
          aria-label={messages.navigation.zones}
        >
          {messages.navigation.zones}
        </a>
        {mode === 'local-preview' ? (
          <strong className="synthetic-preview-local-status">
            <span className="visually-hidden">NO PUBLICAR · </span>Local
          </strong>
        ) : null}
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="synthetic-preview-hero" aria-labelledby="preview-title">
          <div className="synthetic-preview-hero-copy">
            <p className="public-eyebrow">{messages.hero.eyebrow}</p>
            <h1 id="preview-title">
              <span className="synthetic-preview-hero-title-primary">
                {messages.hero.titlePrimary}
              </span>{' '}
              <span className="synthetic-preview-hero-title-secondary">
                {messages.hero.titleSecondary}
              </span>
            </h1>
            <p className="synthetic-preview-hero-location">{messages.hero.location}</p>
            <p className="synthetic-preview-hero-kicker">{messages.hero.kicker}</p>
            <p className="synthetic-preview-hero-note">
              {messages.hero.note}
            </p>
            <div className="public-actions">
              <a
                className="public-primary-action"
                href={zoneHref('madrid')}
              >
                {messages.hero.madridCta}
              </a>
              <a
                className="public-secondary-action"
                href={zoneHref('barcelona')}
              >
                {messages.hero.barcelonaCta}
              </a>
            </div>
          </div>
          <div className="synthetic-preview-hero-media">
            <PublicProfileMedia
              media={{ ...heroMedia, alt: messages.hero.generatedImageDisclosure }}
              priority
              objectPosition="center center"
              preserveFullImage={false}
              sizes="94vw"
            />
            <span>{messages.hero.generatedImageDisclosure}</span>
          </div>
        </section>

        <section className="public-trust-strip synthetic-preview-trust" aria-label={messages.security.eyebrow}>
          {messages.trustSignals.map((signal) => (
            <article key={signal.code}>
              <span aria-hidden="true">{signal.code}</span>
              <div>
                <strong>{signal.title}</strong>
                <small>{signal.detail}</small>
              </div>
            </article>
          ))}
        </section>

        <section className="public-section synthetic-preview-city-experience" id="cobertura" aria-labelledby="coverage-title">
          <div className="public-section-heading synthetic-preview-section-heading synthetic-preview-city-experience-heading">
            <p className="public-eyebrow">{messages.coverage.eyebrow}</p>
            <h2 id="coverage-title">{messages.coverage.title}</h2>
            <p>{messages.coverage.body}</p>
            <p className="synthetic-city-disclosure">
              {getSyntheticCityMedia('madrid', locale, mode).disclosure}
            </p>
          </div>

          <nav className="synthetic-preview-zone-switcher" aria-label={messages.coverage.zoneSelectorAria}>
            {coverageGroups.map((group) => (
              <a
                aria-current={selectedZone === group.base ? 'location' : undefined}
                href={zoneHref(group.base)}
                key={group.base}
              >
                <span>{interpolate(messages.coverage.zoneLabel, { number: group.base === 'madrid' ? '01' : '02' })}</span>
                <strong>{messages.cities[group.base]}</strong>
              </a>
            ))}
          </nav>

          <section
            className="synthetic-preview-catalog-zone-section"
            id="perfiles"
            aria-labelledby="preview-results-title"
          >
          <div className="synthetic-preview-catalog-intro">
            <div>
              <p className="public-eyebrow">{messages.profilesSection.eyebrow}</p>
              <h2 id="preview-results-title">{messages.profilesSection.title}</h2>
              <p id="synthetic-preview-note">
                {messages.profilesSection.note}
              </p>
            </div>
            {validFilters ? (
              <span className="synthetic-preview-result-count" role="status">
                {interpolate(
                  profiles.length === 1
                    ? messages.profilesSection.countOne
                    : messages.profilesSection.countOther,
                  { count: profiles.length },
                )}
              </span>
            ) : null}
          </div>

          <details
            className="synthetic-preview-filter-panel"
            open={hasFilters || !validFilters}
          >
            <summary>
              <span>{messages.filters.toggleTitle}</span>
              <small>{messages.filters.toggleHint}</small>
            </summary>
            <form
              className="profile-filters synthetic-preview-filters"
              action={`${homePath}#perfiles`}
              method="get"
            >
              <fieldset>
                <legend className="visually-hidden">{messages.filters.legend}</legend>
                {mode === 'local-preview' ? (
                  <input name="lang" type="hidden" value={locale} />
                ) : null}
                <p className="profile-filter-help visually-hidden">
                  {messages.filters.help}
                </p>
                <label htmlFor="preview-city">
                  {messages.filters.cityLabel}
                  <select id="preview-city" name="city" defaultValue={city ?? ''}>
                    <option value="">{messages.filters.allCities}</option>
                    {previewCities.map((citySlug) => (
                      <option key={citySlug} value={citySlug}>{messages.cities[citySlug]}</option>
                    ))}
                  </select>
                </label>
                <label htmlFor="preview-availability">
                  {messages.filters.availabilityLabel}
                  <select
                    id="preview-availability"
                    name="availability"
                    defaultValue={availability ?? ''}
                  >
                    <option value="">{messages.filters.allAvailabilities}</option>
                    <option value="available">{messages.filters.availability.available}</option>
                    <option value="limited">{messages.filters.availability.limited}</option>
                    <option value="on-request">{messages.filters.availability['on-request']}</option>
                    <option value="unavailable">{messages.filters.availability.unavailable}</option>
                  </select>
                </label>
                <div className="synthetic-preview-filter-actions">
                  <button type="submit">{messages.filters.apply}</button>
                  <a href={resetHref}>{messages.filters.reset}</a>
                </div>
              </fieldset>
            </form>
          </details>

          {!validFilters ? (
            <div className="public-empty-state public-empty-state-error" role="alert">
              <strong>{messages.filters.invalidTitle}</strong>
              <p>{messages.filters.invalidBody}</p>
              <a href={resetHref}>{messages.filters.resetAfterError}</a>
            </div>
          ) : null}

          <div className="synthetic-preview-city-zones">
            {coverageGroups.map((group, groupIndex) => {
              const zoneProfiles = profilesByZone[group.base];
              const zoneCityNames = group.cities.map((citySlug) => messages.cities[citySlug]);
              return (
                <article
                  className={`synthetic-preview-city-zone synthetic-preview-city-zone--${group.base}`}
                  id={`zona-${group.base}`}
                  key={group.base}
                  aria-labelledby={`zone-title-${group.base}`}
                >
                  <header className="synthetic-preview-city-zone-header">
                    <div>
                      <p className="public-eyebrow">{interpolate(messages.coverage.zoneLabel, { number: String(groupIndex + 1).padStart(2, '0') })}</p>
                      <h3 id={`zone-title-${group.base}`}>{messages.cities[group.base]}</h3>
                      <p>{zoneCityNames.join(' · ')}</p>
                    </div>
                    <a href={zoneHref(group.base)}>
                      {interpolate(messages.coverage.zoneOnly, { city: messages.cities[group.base] })}
                    </a>
                  </header>

                  <section className="synthetic-preview-zone-coverage" aria-labelledby={`zone-destinations-${group.base}`}>
                    <h4 id={`zone-destinations-${group.base}`}>{messages.coverage.destinationsTitle}</h4>
                    <ul>
                      {group.cities.map((citySlug) => {
                        const cityMedia = getSyntheticCityMedia(citySlug, locale, mode);
                        return (
                          <li id={`city-${citySlug}`} key={citySlug}>
                            <figure className="synthetic-preview-city-media">
                              <PublicProfileMedia
                                media={cityMedia}
                                objectPosition={cityMedia.objectPosition}
                                preserveFullImage={false}
                                sizes="(max-width: 780px) 22vw, 11vw"
                              />
                              <figcaption>{cityMedia.shortDisclosure}</figcaption>
                            </figure>
                            <div className="synthetic-preview-city-copy">
                              <strong>{messages.cities[citySlug]}</strong>
                              <span>{messages.coverage.pendingStatus}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </section>

                  <section className="synthetic-preview-zone-profiles" aria-labelledby={`zone-profiles-${group.base}`}>
                    <div className="synthetic-preview-zone-profiles-heading">
                      <div>
                        <span>{messages.profilesSection.selectionEyebrow}</span>
                        <h4 id={`zone-profiles-${group.base}`}>{interpolate(messages.profilesSection.zoneTitle, { city: messages.cities[group.base] })}</h4>
                      </div>
                      <strong>{zoneProfiles.length.toString().padStart(2, '0')}</strong>
                    </div>
                    {zoneProfiles.length > 0 ? (
                      <div className="profile-grid synthetic-profile-grid synthetic-preview-zone-profile-grid">
                        {zoneProfiles.map((candidate) => (
                          <ProfileCard
                            compactDisclosure={messages.profilesSection.cardDisclosureShort}
                            disclosure={messages.profilesSection.cardDisclosure}
                            headingLevel={5}
                            key={candidate.slug}
                            preserveFullImage={false}
                            profile={{
                              ...candidate,
                              cover: {
                                ...candidate.cover,
                                alt: interpolate(messages.profile.galleryAria, {
                                  name: candidate.displayName,
                                }),
                              },
                            }}
                            profileHref={syntheticExperienceProfile(locale, candidate.slug, mode)}
                            locale={locale}
                            variant="featured-compact"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="synthetic-preview-zone-empty" role="status">
                        <strong>{messages.profilesSection.emptyTitle}</strong>
                        <a href={zoneHref(group.base)}>
                          {interpolate(messages.profilesSection.exploreZone, { city: messages.cities[group.base] })}
                        </a>
                      </div>
                    )}
                  </section>
                </article>
              );
            })}
          </div>
          </section>
        </section>

        <section className="public-section synthetic-preview-services" id="servicios" aria-labelledby="services-title">
          <div className="public-section-heading synthetic-preview-section-heading">
            <p className="public-eyebrow">{messages.servicesSection.eyebrow}</p>
            <h2 id="services-title">{messages.servicesSection.title}</h2>
            <p>{messages.servicesSection.body}</p>
          </div>
          <div className="synthetic-preview-service-grid">
            {messages.homeServices.map((service) => (
              <article key={service.number}>
                <a href={`${withSyntheticQuery(servicesHref, { category: service.category })}#service-catalog`}>
                  <span aria-hidden="true">{service.number}</span>
                  <h3>{service.title}</h3>
                  <p>{service.detail}</p>
                  <strong>{messages.servicesSection.exploreRoutes} <span aria-hidden="true">→</span></strong>
                </a>
              </article>
            ))}
          </div>
          <div className="synthetic-preview-disabled-conversion" role="note">
            <div>
              <p className="public-eyebrow">{messages.servicesSection.conversionEyebrow}</p>
              <h3>{messages.servicesSection.conversionTitle}</h3>
              <p>{messages.servicesSection.conversionBody}</p>
            </div>
            <button type="button" disabled>{messages.servicesSection.contactDisabled}</button>
          </div>
        </section>

        <section className="synthetic-preview-safety" id="seguridad" aria-labelledby="preview-safety-title">
          <p className="public-eyebrow">{messages.security.eyebrow}</p>
          <h2 id="preview-safety-title">{messages.security.title}</h2>
          <ul>
            {messages.security.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </main>

      <nav
        className="public-mobile-nav synthetic-preview-mobile-nav"
        id="mobile-navigation"
        aria-label={messages.navigation.mobileAria}
      >
        <a href="#inicio" aria-current="page">{messages.navigation.home}</a>
        <a href="#cobertura">{messages.navigation.zones}</a>
        <a href="#perfiles">{messages.navigation.profiles}</a>
        <a href={servicesHref}>{messages.navigation.services}</a>
        <a href="#seguridad">{messages.navigation.controls}</a>
      </nav>

      <footer className="public-footer synthetic-preview-footer">
        <div>
          <p className="synthetic-preview-footer-brand">PecadosVip</p>
          <p>{messages.footer.tagline}</p>
        </div>
        <nav aria-label={messages.navigation.footerAria}>
          <a href="#inicio">{messages.footer.home}</a>
          <a href="#perfiles">{messages.footer.profiles}</a>
          <a href={servicesHref}>{messages.footer.services}</a>
          <a href="#main-content">{messages.footer.backToTop}</a>
        </nav>
        {mode === 'public-beta' ? (
          <nav className="synthetic-service-language" aria-label={messages.navigation.languageAria}>
            {SUPPORTED_LOCALES.map((candidate) => (
              <a
                aria-current={candidate === locale ? 'page' : undefined}
                href={localizedPath(candidate)}
                hrefLang={candidate}
                key={candidate}
                lang={candidate}
              >
                {LOCALE_ENDONYMS[candidate]}
              </a>
            ))}
          </nav>
        ) : null}
        <span>{messages.footer.reviewStatus}</span>
      </footer>
    </div>
  );
}
