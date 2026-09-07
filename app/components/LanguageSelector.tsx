import { getCatalog } from '../../lib/i18n/catalog';
import {
  LOCALE_ENDONYMS,
  localizedPath,
  SUPPORTED_LOCALES,
  type Locale,
} from '../../lib/i18n/locales';

export default function LanguageSelector({
  locale,
  semanticPath,
}: {
  locale: Locale;
  semanticPath: `/${string}` | '/';
}) {
  const messages = getCatalog(locale).languageSelector;

  return (
    <nav className="language-selector" aria-label={messages.ariaLabel}>
      <span className="visually-hidden">
        {messages.currentLanguage.replace('{language}', LOCALE_ENDONYMS[locale])}
      </span>
      <span aria-hidden="true">{messages.label}</span>
      <ul>
        {SUPPORTED_LOCALES.map((optionLocale) => (
          <li key={optionLocale}>
            <a
              href={localizedPath(optionLocale, semanticPath)}
              hrefLang={optionLocale}
              lang={optionLocale}
              aria-current={optionLocale === locale ? 'page' : undefined}
            >
              {messages.options[optionLocale]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
