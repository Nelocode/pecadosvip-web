import type { Metadata } from 'next';

import { isRuntimeRouteIndexable } from './content/runtime-publication.ts';
import {
  localizedPath,
  SOURCE_LOCALE,
  SUPPORTED_LOCALES,
  type Locale,
} from './i18n/locales.ts';
import { siteConfig, type SiteConfig } from './site-config.ts';

type PublicMetadataInput = {
  path: `/${string}` | '/';
  title: string;
  description: string;
  openGraphDescription?: string;
  twitterDescription?: string;
  imageAlt?: string;
  forceNoIndex?: boolean;
};

type CityMetadataInput = {
  slug: 'madrid' | 'barcelona';
  city: string;
  description: string;
  openGraphDescription: string;
  twitterDescription: string;
};

export type LocalizedPublicMetadataInput = Omit<
  PublicMetadataInput,
  'path'
> & {
  locale: Locale;
  semanticPath: `/${string}` | '/';
  languageAlternates?: readonly Locale[] | false;
};

type LocalizedCityMetadataInput = Omit<CityMetadataInput, 'slug'> & {
  locale: Locale;
  slug: 'madrid' | 'barcelona';
};

const holdingMetadata: Readonly<
  Record<Locale, { title: string; description: string }>
> = {
  es: {
    title: 'Sitio en preparación',
    description:
      'Versión no publicada. El contenido permanece cerrado hasta completar las aprobaciones del release.',
  },
  en: {
    title: 'Site in preparation',
    description:
      'Unpublished version. Content remains closed until release approvals are complete.',
  },
  fr: {
    title: 'Site en préparation',
    description:
      'Version non publiée. Le contenu reste fermé jusqu’à la fin des validations de publication.',
  },
  it: {
    title: 'Sito in preparazione',
    description:
      'Versione non pubblicata. I contenuti restano chiusi fino al completamento delle approvazioni di pubblicazione.',
  },
};

export function buildPublicMetadata(
  input: PublicMetadataInput,
  config: SiteConfig = siteConfig,
  routeIndexable: boolean = isRuntimeRouteIndexable(input.path),
): Metadata {
  const canPublish = Boolean(
    !input.forceNoIndex &&
      routeIndexable &&
      config.indexingEnabled &&
      config.origin,
  );
  const publishableOrigin = canPublish ? config.origin : undefined;
  const canonicalUrl = publishableOrigin
    ? new URL(input.path, publishableOrigin).toString()
    : undefined;
  const imageUrl = publishableOrigin
    ? new URL('/og.png', publishableOrigin).toString()
    : undefined;
  const publicTitle = canPublish ? input.title : 'Sitio en preparación';
  const publicDescription = canPublish
    ? input.description
    : 'Versión no publicada. El contenido permanece cerrado hasta completar las aprobaciones del release.';
  const socialTitle = `${publicTitle} | PecadosVip`;

  return {
    title: publicTitle,
    description: publicDescription,
    ...(canonicalUrl ? { alternates: { canonical: canonicalUrl } } : {}),
    openGraph: {
      title: socialTitle,
      description: canPublish
        ? input.openGraphDescription ?? input.description
        : publicDescription,
      locale: 'es',
      type: 'website',
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt: input.imageAlt ?? 'PecadosVip Madrid y Barcelona',
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description: canPublish
        ? input.twitterDescription ?? input.description
        : publicDescription,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    robots: canPublish
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export function buildLocalizedPublicMetadata(
  input: LocalizedPublicMetadataInput,
  config: SiteConfig = siteConfig,
  routeIndexable: boolean = isRuntimeRouteIndexable(
    localizedPath(input.locale, input.semanticPath),
  ),
): Metadata {
  const path = localizedPath(input.locale, input.semanticPath);
  const canPublish = Boolean(
    !input.forceNoIndex &&
      routeIndexable &&
      config.indexingEnabled &&
      config.origin,
  );
  const publishableOrigin = canPublish ? config.origin : undefined;
  const canonicalUrl = publishableOrigin
    ? new URL(path, publishableOrigin).toString()
    : undefined;
  const alternateLocales = input.languageAlternates === false
    ? []
    : input.languageAlternates ?? SUPPORTED_LOCALES;
  const languageUrls = publishableOrigin && alternateLocales.length > 0
    ? {
        ...Object.fromEntries(
          alternateLocales.map(
            (locale) => [
              locale,
              new URL(localizedPath(locale, input.semanticPath), publishableOrigin).toString(),
            ],
          ),
        ),
        'x-default': new URL(
          localizedPath(SOURCE_LOCALE, input.semanticPath),
          publishableOrigin,
        ).toString(),
      }
    : undefined;
  const imageUrl = publishableOrigin
    ? new URL('/og.png', publishableOrigin).toString()
    : undefined;
  const publicTitle = canPublish
    ? input.title
    : holdingMetadata[input.locale].title;
  const publicDescription = canPublish
    ? input.description
    : holdingMetadata[input.locale].description;
  const socialTitle = `${publicTitle} | PecadosVip`;

  return {
    title: publicTitle,
    description: publicDescription,
    ...(canonicalUrl
      ? {
          alternates: {
            canonical: canonicalUrl,
            ...(languageUrls ? { languages: languageUrls } : {}),
          },
        }
      : {}),
    openGraph: {
      title: socialTitle,
      description: canPublish
        ? input.openGraphDescription ?? input.description
        : publicDescription,
      locale: input.locale,
      type: 'website',
      ...(canonicalUrl ? { url: canonicalUrl } : {}),
      ...(imageUrl
        ? {
            images: [
              {
                url: imageUrl,
                width: 1200,
                height: 630,
                alt: input.imageAlt ?? 'PecadosVip Madrid and Barcelona',
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: socialTitle,
      description: canPublish
        ? input.twitterDescription ?? input.description
        : publicDescription,
      ...(imageUrl ? { images: [imageUrl] } : {}),
    },
    robots: canPublish
      ? { index: true, follow: true }
      : { index: false, follow: false },
  };
}

export function buildCityMetadata(input: CityMetadataInput): Metadata {
  return buildPublicMetadata({
    path: `/${input.slug}`,
    title: `Compañía privada en ${input.city}`,
    description: input.description,
    openGraphDescription: input.openGraphDescription,
    twitterDescription: input.twitterDescription,
    imageAlt: `PecadosVip ${input.city}`,
  });
}

export function buildLocalizedCityMetadata(
  input: LocalizedCityMetadataInput,
): Metadata {
  return buildLocalizedPublicMetadata({
    locale: input.locale,
    semanticPath: `/${input.slug}`,
    title: input.city,
    description: input.description,
    openGraphDescription: input.openGraphDescription,
    twitterDescription: input.twitterDescription,
    imageAlt: `PecadosVip ${input.city}`,
  });
}
