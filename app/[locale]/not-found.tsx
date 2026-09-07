'use client';

import { usePathname } from 'next/navigation';

import {
  isSupportedLocale,
  localizedPath,
  SOURCE_LOCALE,
} from '../../lib/i18n/locales';
import { NOT_FOUND_MESSAGES } from '../../lib/i18n/not-found-messages';

export default function LocalizedNotFound() {
  const pathname = usePathname();
  const localeSegment = pathname.split('/')[1] ?? '';
  const locale = isSupportedLocale(localeSegment)
    ? localeSegment
    : SOURCE_LOCALE;
  const messages = NOT_FOUND_MESSAGES[locale];

  return (
    <main className="release-holding" id="main-content" tabIndex={-1}>
      <div className="release-holding-mark" aria-hidden="true">404</div>
      <p className="public-eyebrow">{messages.eyebrow}</p>
      <h1>{messages.title}</h1>
      <p>{messages.body}</p>
      <a className="public-primary-action" href={localizedPath(locale)}>
        {messages.homeLink}
      </a>
    </main>
  );
}
