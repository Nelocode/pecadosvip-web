import { getCatalog } from '../../lib/i18n/catalog';
import type { Locale } from '../../lib/i18n/locales';
import LanguageSelector from './LanguageSelector';

export default function ReleaseHoldingPage({
  locale,
  semanticPath = '/',
}: {
  locale?: Locale;
  semanticPath?: `/${string}` | '/';
}) {
  const effectiveLocale = locale ?? 'es';
  const messages = getCatalog(effectiveLocale).holding;

  return (
    <main className="release-holding" id="main-content" tabIndex={-1}>
      <div className="release-holding-mark" aria-hidden="true">PV</div>
      <p className="public-eyebrow">{messages.eyebrow}</p>
      <h1>{messages.title}</h1>
      <p>{messages.body}</p>
      {locale ? (
        <LanguageSelector locale={locale} semanticPath={semanticPath} />
      ) : null}
    </main>
  );
}
