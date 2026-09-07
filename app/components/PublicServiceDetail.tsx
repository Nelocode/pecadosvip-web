import type { PublicProfileCard } from '../../lib/content/public-profiles';
import type { PublicService } from '../../lib/content/public-services';
import { getCatalog } from '../../lib/i18n/catalog';
import { localizedPath, type Locale } from '../../lib/i18n/locales';
import ContactOptions from './ContactOptions';
import ProfileCard from './ProfileCard';
import ProvisionalNotice from './ProvisionalNotice';
import PublicFooter from './PublicFooter';
import PublicHeader from './PublicHeader';

export default function PublicServiceDetail({
  locale,
  service,
  profiles,
}: {
  locale?: Locale;
  service: PublicService;
  profiles: PublicProfileCard[];
}) {
  const effectiveLocale = locale ?? 'es';
  const messages = getCatalog(effectiveLocale).serviceDetail;
  const hrefFor = (path: `/${string}` | '/') =>
    locale ? localizedPath(locale, path) : path;

  return (
    <div className="public-page public-service-detail-page">
      <PublicHeader currentPath={`/servicios/${service.slug}`} locale={locale} />
      <main id="main-content" tabIndex={-1}>
        <ProvisionalNotice locale={locale} />
        <nav className="synthetic-service-breadcrumb" aria-label={messages.breadcrumbAria}>
          <a href={hrefFor('/servicios')}>{messages.services}</a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{service.name}</span>
        </nav>
        <article className="public-service-detail" aria-labelledby="public-service-title">
          <header>
            <p className="public-eyebrow">{messages.eyebrow}</p>
            <h1 id="public-service-title">{service.name}</h1>
            <p>{service.description}</p>
          </header>
          <section aria-labelledby="public-service-profiles-title">
            <div className="public-section-heading">
              <h2 id="public-service-profiles-title">{messages.profilesTitle}</h2>
              <p>{messages.profilesBody}</p>
            </div>
            <div className="profile-grid">
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.slug}
                  profile={profile}
                  profileHref={hrefFor(`/perfiles/${profile.slug}`)}
                />
              ))}
            </div>
          </section>
          <section className="public-service-contact" aria-labelledby="public-service-contact-title">
            <div>
              <h2 id="public-service-contact-title">{messages.contactTitle}</h2>
              <p>{messages.contactBody}</p>
            </div>
            <ContactOptions locale={locale} />
          </section>
          <a className="synthetic-service-back" href={hrefFor('/servicios')}>
            <span aria-hidden="true">←</span> {messages.back}
          </a>
        </article>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
