import type { Metadata } from 'next';

import { buildLocalizedPublicMetadata } from '../lib/seo';
import {
  getSupplementalCityContent,
  getSupplementalCityMetadata,
  type SupplementalCitySlug,
} from './city-data';
import CityLanding from './components/CityLanding';
import { localeOrNotFound, type LocaleRouteParams } from './locale-routing';
import { getRuntimeCityPresentation } from './runtime-city-presentation';
import { siteConfig } from '../lib/site-config';

export type SupplementalCityRouteProps = { params: LocaleRouteParams };

export async function buildSupplementalCityRouteMetadata(
  slug: SupplementalCitySlug,
  { params }: SupplementalCityRouteProps,
): Promise<Metadata> {
  const locale = localeOrNotFound((await params).locale);
  const meta = getSupplementalCityMetadata(locale, slug);
  const presentation = getRuntimeCityPresentation(
    locale,
    slug,
    getSupplementalCityContent(locale, slug),
  );
  const approvedSeo = presentation.approvedCity?.seo;

  return buildLocalizedPublicMetadata(
    {
      locale,
      semanticPath: `/${slug}`,
      title: approvedSeo?.title ?? meta.title,
      description: approvedSeo?.description ?? meta.description,
      openGraphDescription:
        approvedSeo?.description ?? meta.openGraphDescription,
      twitterDescription:
        approvedSeo?.description ?? meta.twitterDescription,
      imageAlt: meta.imageAlt,
    },
    siteConfig,
    presentation.routeIndexable,
  );
}

export async function renderSupplementalCityRoute(
  slug: SupplementalCitySlug,
  { params }: SupplementalCityRouteProps,
) {
  const locale = localeOrNotFound((await params).locale);
  const presentation = getRuntimeCityPresentation(
    locale,
    slug,
    getSupplementalCityContent(locale, slug),
  );

  return (
    <CityLanding
      content={presentation.content}
      locale={locale}
      runtimeState={presentation}
    />
  );
}
