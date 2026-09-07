import ContactOptions from '../../components/ContactOptions';
import ProvisionalNotice from '../../components/ProvisionalNotice';
import PublicFooter from '../../components/PublicFooter';
import PublicHeader from '../../components/PublicHeader';
import ReleaseHoldingPage from '../../components/ReleaseHoldingPage';
import { getRuntimeVisibilityState } from '../../../lib/content/runtime-publication';
import { getCatalog } from '../../../lib/i18n/catalog';
import { buildLocalizedPublicMetadata } from '../../../lib/seo';
import { localeOrNotFound, type LocaleRouteParams } from '../../locale-routing';

type Props = { params: LocaleRouteParams };

export async function generateMetadata({ params }: Props) {
  const locale = localeOrNotFound((await params).locale);
  const meta = getCatalog(locale).meta.contact;
  return buildLocalizedPublicMetadata({
    locale,
    semanticPath: '/contacto',
    title: meta.title,
    description: meta.description,
  });
}

export default async function ContactPage({ params }: Props) {
  const locale = localeOrNotFound((await params).locale);
  const messages = getCatalog(locale).contact;
  if (!getRuntimeVisibilityState().renderPublicExperience) {
    return <ReleaseHoldingPage locale={locale} semanticPath="/contacto" />;
  }

  return (
    <div className="public-page">
      <PublicHeader currentPath="/contacto" locale={locale} />
      <main id="main-content" tabIndex={-1}>
        <ProvisionalNotice locale={locale} />
        <section className="contact-page" aria-labelledby="contact-page-title">
          <div>
            <p className="public-eyebrow">{messages.eyebrow}</p>
            <h1 id="contact-page-title">{messages.title}</h1>
            <p>{messages.body}</p>
          </div>
          <ContactOptions locale={locale} />
        </section>
        <section className="contact-safety-note" aria-labelledby="contact-safety-title">
          <h2 id="contact-safety-title">{messages.safety.title}</h2>
          <ul>
            {messages.safety.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
