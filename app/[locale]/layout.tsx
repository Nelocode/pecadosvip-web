import type { Metadata } from 'next';

import { getRuntimePublicationState } from '../../lib/content/runtime-publication';
import { getCatalog } from '../../lib/i18n/catalog';
import {
  isSupportedLocale,
  SOURCE_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from '../../lib/i18n/locales';
import { siteConfig } from '../../lib/site-config';
import { localeOrNotFound, type LocaleRouteParams } from '../locale-routing';
import '../globals.css';
import '../theme.css';
import '../public-site.css';

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

function resolveLayoutLocale(value: string): Locale {
  return isSupportedLocale(value)
    ? localeOrNotFound(value)
    : SOURCE_LOCALE;
}

export async function generateMetadata({
  params,
}: {
  params: LocaleRouteParams;
}): Promise<Metadata> {
  const locale = resolveLayoutLocale((await params).locale);
  const messages = getCatalog(locale).meta.default;
  const releaseReady = getRuntimePublicationState().release.ok;
  const publicationEnabled = Boolean(
    siteConfig.indexingEnabled && releaseReady && siteConfig.origin,
  );
  const title = releaseReady ? messages.readyTitle : messages.holdingTitle;
  const description = releaseReady
    ? messages.readyDescription
    : messages.holdingDescription;
  const socialImageUrl = publicationEnabled && siteConfig.origin
    ? new URL('/og.png', siteConfig.origin).toString()
    : undefined;

  return {
    ...(publicationEnabled && siteConfig.origin
      ? { metadataBase: new URL(siteConfig.origin) }
      : {}),
    title: {
      default: title,
      template: '%s | PecadosVip',
    },
    description,
    ...(releaseReady ? { keywords: messages.keywords } : {}),
    openGraph: {
      title,
      description,
      siteName: 'PecadosVip',
      locale,
      type: 'website',
      ...(socialImageUrl
        ? {
            images: [
              {
                url: socialImageUrl,
                width: 1200,
                height: 630,
                alt: messages.socialImageAlt,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      ...(socialImageUrl ? { images: [socialImageUrl] } : {}),
    },
    robots: publicationEnabled
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: LocaleRouteParams;
}>) {
  const locale = resolveLayoutLocale((await params).locale);
  const messages = getCatalog(locale);

  return (
    <html lang={locale}>
      <body>
        <a className="skip-link" href="#main-content">
          {messages.layout.skipLink}
        </a>
        {children}
      </body>
    </html>
  );
}
