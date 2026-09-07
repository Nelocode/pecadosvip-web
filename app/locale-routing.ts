import { notFound } from 'next/navigation';

import {
  isSupportedLocale,
  type Locale,
} from '../lib/i18n/locales';

export type LocaleRouteParams = Promise<{ locale: string }>;

export function localeOrNotFound(value: string): Locale {
  if (!isSupportedLocale(value)) notFound();
  return value;
}
