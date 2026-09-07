import { getCatalog } from '../../lib/i18n/catalog';
import { localizedPath, type Locale } from '../../lib/i18n/locales';
import LanguageSelector from './LanguageSelector';

type PublicHeaderProps = {
  currentPath: string;
  locale?: Locale;
};

function isCurrentPath(currentPath: string, href: string): boolean {
  if (href === '/') return currentPath === '/';
  return currentPath === href || currentPath.startsWith(`${href}/`);
}

export default function PublicHeader({ currentPath, locale }: PublicHeaderProps) {
  const messages = getCatalog(locale ?? 'es').navigation;
  const navigation = [
    { href: '/' as const, label: messages.home },
    { href: '/madrid' as const, label: messages.madrid },
    { href: '/barcelona' as const, label: messages.barcelona },
    { href: '/perfiles' as const, label: messages.profiles },
    { href: '/servicios' as const, label: messages.services },
  ];
  const hrefFor = (path: `/${string}` | '/') =>
    locale ? localizedPath(locale, path) : path;

  return (
    <>
      <header className="public-header">
        <a className="public-brand" href={hrefFor('/')} aria-label={messages.brandHomeAria}>
          <span className="public-apple" aria-hidden="true"><span /></span>
          <span>Pecados<span>Vip</span></span>
        </a>

        <nav className="public-nav" aria-label={messages.primaryAria}>
          {navigation.map((item) => {
            const current = isCurrentPath(currentPath, item.href);
            return (
              <a
                href={hrefFor(item.href)}
                key={item.href}
                aria-current={current ? 'page' : undefined}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        <a
          className="public-header-cta"
          href={hrefFor('/contacto')}
          aria-current={currentPath === '/contacto' ? 'page' : undefined}
        >
          {messages.privateContact}
        </a>
        {locale ? (
          <LanguageSelector locale={locale} semanticPath={currentPath as `/${string}` | '/'} />
        ) : null}
      </header>

      <nav className="public-mobile-nav" aria-label={messages.mobileAria}>
        {[...navigation, { href: '/contacto' as const, label: messages.contact }].map((item) => {
          const current = isCurrentPath(currentPath, item.href);
          return (
            <a
              href={hrefFor(item.href)}
              key={item.href}
              aria-current={current ? 'page' : undefined}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </>
  );
}
