import { getPublicLegalLinks } from '../../lib/content/public-legal';
import { getRuntimeContentSnapshot } from '../../lib/content/runtime-snapshot';
import { getCatalog } from '../../lib/i18n/catalog';
import {
  localizedPath,
  SOURCE_LOCALE,
  type Locale,
} from '../../lib/i18n/locales';

export default function PublicFooter({ locale }: { locale?: Locale } = {}) {
  const legalLinks = locale && locale !== SOURCE_LOCALE
    ? []
    : getPublicLegalLinks(getRuntimeContentSnapshot());
  const messages = getCatalog(locale ?? 'es');
  const hrefFor = (path: `/${string}` | '/') =>
    locale ? localizedPath(locale, path) : path;
  const legalTitleByPath: Record<string, string> = {
    '/legal/aviso-legal': messages.legal.documents.legalNotice,
    '/legal/privacidad': messages.legal.documents.privacy,
    '/legal/cookies': messages.legal.documents.cookies,
    '/legal/terminos-del-servicio': messages.legal.documents.serviceTerms,
  };

  return (
    <footer className="public-footer">
      <div>
        <a className="public-brand" href={hrefFor('/')} aria-label={messages.footer.brandHomeAria}>
          <span className="public-apple" aria-hidden="true"><span /></span>
          <span>Pecados<span>Vip</span></span>
        </a>
        <p>{messages.footer.tagline}</p>
      </div>
      <nav aria-label={messages.footer.linksAria}>
        <a href={hrefFor('/madrid')}>Madrid</a>
        <a href={hrefFor('/barcelona')}>Barcelona</a>
        <a href={hrefFor('/perfiles')}>{messages.navigation.profiles}</a>
        <a href={hrefFor('/servicios')}>{messages.navigation.services}</a>
        <a href={hrefFor('/contacto')}>{messages.navigation.contact}</a>
        {legalLinks.map((link) => (
          <a href={hrefFor(link.href as `/${string}`)} key={link.href}>
            {legalTitleByPath[link.href] ?? link.title}
          </a>
        ))}
      </nav>
      <div className="public-footer-status" aria-label={messages.footer.publicationStatusAria}>
        <span>{messages.footer.adultOnly}</span>
        <span>
          {legalLinks.length > 0
            ? messages.footer.legalApproved
            : messages.footer.legalPending}
        </span>
      </div>
    </footer>
  );
}
