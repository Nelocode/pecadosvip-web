import { notFound } from 'next/navigation';

import { getCatalog } from '../../../../lib/i18n/catalog';
import { getSyntheticService } from '../../../../lib/preview/synthetic-services';
import { buildSyntheticBetaMetadata } from '../../../../lib/preview/synthetic-beta-metadata';
import SyntheticServiceDetailPage from '../../../(legacy)/preview-local-sintetico/servicios/[slug]/page';
import { localeOrNotFound } from '../../../locale-routing';

type RawSearchParams = Record<string, string | string[] | undefined>;
type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<RawSearchParams>;
};
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = localeOrNotFound(rawLocale);
  if (!slugPattern.test(slug)) notFound();
  const service = getSyntheticService(slug, locale);
  if (!service) notFound();
  const fallback = getCatalog(locale).meta.service;
  return buildSyntheticBetaMetadata({
    locale,
    title: service.name,
    description: service.teaser || fallback.unavailableDescription,
  });
}

export default async function ServiceDetailPage({ params, searchParams }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = localeOrNotFound(rawLocale);
  if (!slugPattern.test(slug)) notFound();
  return SyntheticServiceDetailPage({
    localeOverride: locale,
    mode: 'public-beta',
    params: Promise.resolve({ slug }),
    searchParams,
  });
}
