import type { PublicService } from '../../lib/content/public-services';
import { getCatalog, interpolate } from '../../lib/i18n/catalog';
import { localizedPath, type Locale } from '../../lib/i18n/locales';
import ProvisionalNotice from './ProvisionalNotice';
import PublicFooter from './PublicFooter';
import PublicHeader from './PublicHeader';

export default function PublicServiceHub({
  locale,
  services,
}: {
  locale?: Locale;
  services: PublicService[];
}) {
  const effectiveLocale = locale ?? 'es';
  const messages = getCatalog(effectiveLocale).servicesHub;
  const hrefFor = (path: `/${string}` | '/') =>
    locale ? localizedPath(locale, path) : path;

  return (
    <div className="public-page public-services-page">
      <PublicHeader currentPath="/servicios" locale={locale} />
      <main id="main-content" tabIndex={-1}>
        <ProvisionalNotice locale={locale} />
        <section className="public-services-hero" aria-labelledby="public-services-title">
          <p className="public-eyebrow">{messages.eyebrow}</p>
          <h1 id="public-services-title">{messages.title}</h1>
          <p>{messages.body}</p>
        </section>
        <section className="public-section public-services-catalog" aria-labelledby="public-services-catalog-title">
          <div className="public-section-heading">
            <h2 id="public-services-catalog-title">{messages.catalogTitle}</h2>
          </div>
          <div className="public-service-grid">
            {services.map((service, index) => (
              <article key={service.slug}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <h3>{service.name}</h3>
                <p>{service.description}</p>
                <small>
                  {interpolate(messages.profileCount, { count: service.profileCount })}
                </small>
                <a href={hrefFor(`/servicios/${service.slug}`)}>{messages.cardAction}</a>
              </article>
            ))}
          </div>
        </section>
        <section className="public-section synthetic-services-faq" aria-labelledby="public-services-faq-title">
          <div className="public-section-heading">
            <h2 id="public-services-faq-title">{messages.faqTitle}</h2>
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
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
