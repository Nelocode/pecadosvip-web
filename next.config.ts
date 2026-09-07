import type { NextConfig } from 'next';

import { contactConfig } from './lib/contact-config.ts';
import { getRuntimeVisibilityState } from './lib/content/runtime-publication.ts';
import { siteConfig } from './lib/site-config.ts';

type SecurityHeader = {
  key: string;
  value: string;
};

export function buildSecurityHeaders(
  allowIndexing: boolean,
  formActionUrl?: string,
): SecurityHeader[] {
  const formActionSources = ["'self'"];
  if (formActionUrl) {
    try {
      const candidate = new URL(formActionUrl);
      if (
        candidate.protocol === 'https:' &&
        candidate.username === '' &&
        candidate.password === ''
      ) {
        formActionSources.push(candidate.origin);
      }
    } catch {
      // Invalid values remain blocked by the self-only policy.
    }
  }
  const headers: SecurityHeader[] = [
  {
    key: 'Content-Security-Policy',
    value:
      `default-src 'self'; base-uri 'self'; connect-src 'self'; form-action ${formActionSources.join(' ')}; frame-ancestors 'none'; img-src 'self' data:; media-src 'self'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'`,
  },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), geolocation=(), microphone=(), payment=(), usb=(), browsing-topics=()',
  },
  { key: 'Referrer-Policy', value: 'no-referrer' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  ];

  if (!allowIndexing) {
    headers.push({
      key: 'X-Robots-Tag',
      value: 'noindex, nofollow, noarchive',
    });
  }

  return headers;
}

const runtimeVisibility = getRuntimeVisibilityState();
const securityHeaders = buildSecurityHeaders(
  Boolean(
    siteConfig.indexingEnabled &&
      runtimeVisibility.releaseReady &&
      siteConfig.origin,
  ),
  runtimeVisibility.releaseReady && contactConfig.enabled
    ? contactConfig.contact.formActionUrl
    : undefined,
);

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: '/',
        headers: [...securityHeaders],
      },
      {
        source: '/:path*',
        headers: [...securityHeaders],
      },
    ];
  },
};

export default nextConfig;
