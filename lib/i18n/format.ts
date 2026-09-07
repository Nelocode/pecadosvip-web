import type { Locale } from './locales.ts';

const localeTags: Readonly<Record<Locale, string>> = {
  es: 'es',
  en: 'en',
  fr: 'fr',
  it: 'it',
};

export function formatInteger(value: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTags[locale], {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDecimal(
  value: number,
  locale: Locale,
  maximumFractionDigits = 2,
): string {
  return new Intl.NumberFormat(localeTags[locale], {
    maximumFractionDigits,
  }).format(value);
}

export function selectPlural(
  value: number,
  locale: Locale,
  forms: Readonly<Partial<Record<Intl.LDMLPluralRule, string>>> & {
    other: string;
  },
): string {
  const category = new Intl.PluralRules(localeTags[locale]).select(value);
  return forms[category] ?? forms.other;
}
