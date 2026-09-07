import { localizedPath, type Locale } from '../i18n/locales';

export type SyntheticExperienceMode = 'local-preview' | 'public-beta';

export function syntheticExperienceHome(
  locale: Locale,
  mode: SyntheticExperienceMode,
): string {
  return mode === 'public-beta'
    ? localizedPath(locale)
    : `/preview-local-sintetico?lang=${locale}`;
}

export function syntheticExperienceProfiles(
  locale: Locale,
  mode: SyntheticExperienceMode,
): string {
  return mode === 'public-beta'
    ? localizedPath(locale, '/perfiles')
    : `/preview-local-sintetico?lang=${locale}#perfiles`;
}

export function syntheticExperienceProfile(
  locale: Locale,
  slug: string,
  mode: SyntheticExperienceMode,
): string {
  return mode === 'public-beta'
    ? localizedPath(locale, `/perfiles/${slug}`)
    : `/preview-local-sintetico/perfiles/${slug}?lang=${locale}`;
}

export function syntheticExperienceServices(
  locale: Locale,
  mode: SyntheticExperienceMode,
): string {
  return mode === 'public-beta'
    ? localizedPath(locale, '/servicios')
    : `/preview-local-sintetico/servicios?lang=${locale}`;
}

export function syntheticExperienceService(
  locale: Locale,
  slug: string,
  mode: SyntheticExperienceMode,
): string {
  return mode === 'public-beta'
    ? localizedPath(locale, `/servicios/${slug}`)
    : `/preview-local-sintetico/servicios/${slug}?lang=${locale}`;
}

export function withSyntheticQuery(
  path: string,
  values: Readonly<Record<string, string | undefined>>,
): string {
  const [base, fragment] = path.split('#', 2);
  const url = new URL(base, 'https://synthetic.invalid');
  for (const [key, value] of Object.entries(values)) {
    if (value) url.searchParams.set(key, value);
  }
  const query = url.searchParams.toString();
  return `${url.pathname}${query ? `?${query}` : ''}${fragment ? `#${fragment}` : ''}`;
}
