export type SiteEnvironment = {
  NEXT_PUBLIC_SITE_URL?: string;
  NEXT_PUBLIC_ALLOW_INDEXING?: string;
  NEXT_PUBLIC_CONTENT_APPROVED?: string;
};

export type SiteConfig = {
  origin?: string;
  indexingEnabled: boolean;
  structuredDataEnabled: boolean;
};

export function normalizeProductionOrigin(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    const reservedHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.invalid') ||
      hostname.endsWith('.test') ||
      hostname.endsWith('.example');

    if (
      url.protocol !== 'https:' ||
      reservedHost ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return undefined;
    }

    return url.origin;
  } catch {
    return undefined;
  }
}

export function resolveSiteConfig(environment: SiteEnvironment): SiteConfig {
  const origin = normalizeProductionOrigin(environment.NEXT_PUBLIC_SITE_URL);
  const indexingEnabled = Boolean(
    origin &&
      environment.NEXT_PUBLIC_ALLOW_INDEXING === 'true' &&
      environment.NEXT_PUBLIC_CONTENT_APPROVED === 'true',
  );

  return {
    origin,
    indexingEnabled,
    structuredDataEnabled: indexingEnabled,
  };
}

export const siteConfig = resolveSiteConfig({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_ALLOW_INDEXING: process.env.NEXT_PUBLIC_ALLOW_INDEXING,
  NEXT_PUBLIC_CONTENT_APPROVED: process.env.NEXT_PUBLIC_CONTENT_APPROVED,
});
