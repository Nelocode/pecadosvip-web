export const SUPPORTED_LOCALES = ['es', 'en', 'fr', 'it'] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const SOURCE_LOCALE: Locale = 'es';

export const LOCALE_ENDONYMS: Readonly<Record<Locale, string>> = {
  es: 'Español',
  en: 'English',
  fr: 'Français',
  it: 'Italiano',
};

export class UnsupportedLocaleError extends Error {
  constructor(locale: string) {
    super(`Unsupported locale: ${locale}`);
    this.name = 'UnsupportedLocaleError';
  }
}

export function isSupportedLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

export function requireLocale(value: string): Locale {
  if (!isSupportedLocale(value)) {
    throw new UnsupportedLocaleError(value);
  }

  return value;
}

export function normalizeSemanticPath(value: string): `/${string}` | '/' {
  const candidate = value.trim();
  if (
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    candidate.includes('?') ||
    candidate.includes('#') ||
    candidate.includes('\\') ||
    candidate.split('/').includes('..')
  ) {
    throw new Error(`Unsafe semantic path: ${value}`);
  }

  if (candidate === '/') return '/';

  const normalized = candidate.replace(/\/+$/u, '');
  return normalized as `/${string}`;
}

export function localizedPath(
  locale: Locale,
  semanticPath: `/${string}` | '/' = '/',
): `/${Locale}` | `/${Locale}/${string}` {
  const normalized = normalizeSemanticPath(semanticPath);
  return normalized === '/'
    ? `/${locale}`
    : `/${locale}${normalized}` as `/${Locale}/${string}`;
}

export function splitLocalizedPath(path: string): {
  locale: Locale;
  semanticPath: `/${string}` | '/';
} | null {
  const normalized = normalizeSemanticPath(path);
  const [firstSegment, ...rest] = normalized.slice(1).split('/');
  if (!firstSegment || !isSupportedLocale(firstSegment)) return null;

  return {
    locale: firstSegment,
    semanticPath: rest.length > 0 ? `/${rest.join('/')}` : '/',
  };
}

export function switchLocalePath(path: string, locale: Locale): string {
  const current = splitLocalizedPath(path);
  if (!current) {
    throw new Error(`Path is not locale-prefixed: ${path}`);
  }

  return localizedPath(locale, current.semanticPath);
}

export function localizedAlternates(
  semanticPath: `/${string}` | '/' = '/',
): Record<Locale, string> {
  return Object.fromEntries(
    SUPPORTED_LOCALES.map((locale) => [locale, localizedPath(locale, semanticPath)]),
  ) as Record<Locale, string>;
}
