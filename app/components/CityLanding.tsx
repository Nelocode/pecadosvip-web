import Image from 'next/image';
import {
  getRuntimeVisibilityState,
  isRuntimeRouteIndexable,
} from '../../lib/content/runtime-publication';
import { getCatalog, interpolate } from '../../lib/i18n/catalog';
import { localizedPath, type Locale } from '../../lib/i18n/locales';
import { siteConfig } from '../../lib/site-config';
import type { CityContent } from '../city-data';
import type { RuntimeCityPresentation } from '../runtime-city-presentation';
import ContactOptions from './ContactOptions';
import ProvisionalNotice from './ProvisionalNotice';
import PublicFooter from './PublicFooter';
import PublicHeader from './PublicHeader';
import ReleaseHoldingPage from './ReleaseHoldingPage';

type CityLandingProps = {
  content: CityContent;
  locale?: Locale;
  runtimeState?: Pick<
    RuntimeCityPresentation,
    'releaseReady' | 'renderPublicExperience' | 'routeIndexable'
  >;
};

function safeJsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function CityLanding({
  content,
  locale,
  runtimeState,
}: CityLandingProps) {
  const effectiveLocale = locale ?? 'es';
  const messages = getCatalog(effectiveLocale).cityUi;
  const visibility = runtimeState ?? getRuntimeVisibilityState();
  if (!visibility.renderPublicExperience) {
    return (
      <ReleaseHoldingPage
        locale={effectiveLocale}
        semanticPath={`/${content.slug}`}
      />
    );
  }

  const semanticPath = `/${content.slug}` as const;
  const routePath = locale ? localizedPath(locale, semanticPath) : semanticPath;
  const routeIndexable = siteConfig.indexingEnabled && (
    runtimeState?.routeIndexable ?? isRuntimeRouteIndexable(routePath)
  );
  const siteUrl = siteConfig.origin;
  const pageUrl = routeIndexable && siteUrl
    ? new URL(routePath, siteUrl).toString()
    : undefined;

  const structuredData =
    routeIndexable && siteConfig.structuredDataEnabled && siteUrl && pageUrl
      ? [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'PecadosVip',
      url: siteUrl,
      image: `${siteUrl}/og.png`,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Service',
      name: interpolate(messages.structuredData.serviceName, { city: content.city }),
      provider: {
        '@type': 'Organization',
        name: 'PecadosVip',
        url: siteUrl,
      },
      areaServed: {
        '@type': 'AdministrativeArea',
        name: content.city,
      },
      serviceType: messages.structuredData.serviceType,
      url: pageUrl,
      inLanguage: effectiveLocale,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'PecadosVip',
          item: new URL(locale ? localizedPath(locale) : '/', siteUrl).toString(),
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: content.city,
          item: pageUrl,
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: content.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
      inLanguage: effectiveLocale,
    },
        ]
      : null;

  return (
    <div className={`city-page city-${content.slug}`}>
      {structuredData ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }}
        />
      ) : null}

      <PublicHeader currentPath={semanticPath} locale={locale} />
      <main id="main-content" tabIndex={-1}>
        {!visibility.releaseReady ? (
          <ProvisionalNotice locale={effectiveLocale} />
        ) : null}

      <section className="hero" aria-labelledby="page-title">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <p className="eyebrow"><span /> {content.regionLabel}</p>
          <p className="hero-kicker">{content.kicker}</p>
          <h1 id="page-title">
            {content.headline}<br />
            <em>{content.headlineAccent}</em>
          </h1>
          <p className="hero-lead">{content.lead}</p>
          <div className="hero-actions">
            <a className="primary-cta" href="#contacto">
              {messages.hero.availabilityCta} <span aria-hidden="true">→</span>
            </a>
            <a className="text-cta" href="#servicio">{messages.hero.howItWorksCta}</a>
          </div>
          <ul className="trust-row" aria-label={messages.hero.trustAria}>
            {messages.hero.trustItems.map((item) => (
              <li key={item.code}><span>{item.code}</span> {item.text}</li>
            ))}
          </ul>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="city-word">{content.city.toUpperCase()}</div>
          <div className="orb">
            <div className="orb-shine" />
            <div className="orb-cut" />
          </div>
          <p>{content.coordinates[0]}<br />{content.coordinates[1]}</p>
          <span className="vertical-note">
            {content.city.toUpperCase()} · PECADOSVIP
          </span>
        </div>
      </section>

      <aside className="age-ribbon" aria-label={messages.ageRibbon.ariaLabel}>
        <span>{messages.ageRibbon.adultOnly}</span>
        <span>{messages.ageRibbon.deliveryOnly}</span>
      </aside>

      <section
        className="intro-section section-shell"
        id="servicio"
        aria-labelledby="service-title"
      >
        <div className="section-index" aria-hidden="true">01</div>
        <div className="intro-heading">
          <p className="section-label">{content.introEyebrow}</p>
          <h2 id="service-title">{content.introTitle}</h2>
        </div>
        <div className="intro-copy">
          {content.introBody.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
        <div className="service-principles">
          {messages.principles.map((principle) => (
            <article key={principle.code}>
              <span>{principle.code}</span>
              <h3>{principle.title}</h3>
              <p>{principle.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="coverage-section" id="zonas" aria-labelledby="areas-title">
        <div className="section-shell">
          <div className="coverage-heading">
            <div>
              <p className="section-label">{content.areaEyebrow}</p>
              <h2 id="areas-title">{content.areaTitle}</h2>
            </div>
            <p>{content.areaIntro}</p>
          </div>

          <div className="coverage-grid">
            {content.highlights.map((highlight) => (
              <article className="coverage-card" key={highlight.code}>
                <span className="card-code">{highlight.code}</span>
                <h3>{highlight.name}</h3>
                <p>{highlight.note}</p>
                <span className="availability">{messages.priorityAvailability}</span>
              </article>
            ))}
          </div>

          <div className="location-list">
            <div>
              <p className="section-label">{messages.otherAreas.label}</p>
              <p>{messages.otherAreas.body}</p>
            </div>
            <ul>
              {content.locations.map((location) => (
                <li key={location}>{location}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="process-section section-shell" aria-labelledby="process-title">
        <div className="process-heading">
          <p className="section-label">{messages.processLabel}</p>
          <h2 id="process-title">{content.processTitle}</h2>
          <p>{content.processIntro}</p>
        </div>
        <ol className="process-list">
          {content.steps.map((step, index) => (
            <li key={step.title}>
              <span>0{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="discretion-section" aria-labelledby="discretion-title">
        <div className="discretion-orbit" aria-hidden="true">
          <span className="apple-mark large"><span /></span>
        </div>
        <div>
          <p className="section-label">{messages.discretionLabel}</p>
          <h2 id="discretion-title">{content.discretionTitle}</h2>
          <p>{content.discretionText}</p>
        </div>
      </section>

      <figure className="visual-manifesto section-shell">
        <div className="visual-frame">
          <Image
            src="/og.png"
            width={1200}
            height={630}
            sizes="(max-width: 780px) 92vw, 86vw"
            alt={messages.manifesto.imageAlt}
          />
        </div>
        <figcaption>
          <span>{messages.manifesto.label}</span>
          <p>{messages.manifesto.body}</p>
        </figcaption>
      </figure>

      <section className="faq-section section-shell" aria-labelledby="faq-title">
        <div className="faq-heading">
          <p className="section-label">{messages.faq.label}</p>
          <h2 id="faq-title">{interpolate(messages.faq.title, { city: content.city })}</h2>
          <p>{messages.faq.body}</p>
        </div>
        <div className="faq-list">
          {content.faqs.map((faq, index) => (
            <details key={faq.question} open={index === 0}>
              <summary>
                <span>0{index + 1}</span>
                {faq.question}
                <i aria-hidden="true">+</i>
              </summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="contact-section" id="contacto" aria-labelledby="city-contact-title">
        <div className="contact-inner">
          <div className="contact-copy">
            <p className="section-label">
              {interpolate(messages.contactLabel, { city: content.city })}
            </p>
            <h2 id="city-contact-title">{content.closingTitle}</h2>
            <p>{content.closingText}</p>
          </div>
          <ContactOptions locale={effectiveLocale} />
        </div>
      </section>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
