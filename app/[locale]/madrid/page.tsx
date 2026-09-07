import type { CityContent } from '../../city-data';
import CityLanding from '../../components/CityLanding';
import { getCatalog } from '../../../lib/i18n/catalog';
import { buildLocalizedPublicMetadata } from '../../../lib/seo';
import { siteConfig } from '../../../lib/site-config';
import { localeOrNotFound, type LocaleRouteParams } from '../../locale-routing';
import { getRuntimeCityPresentation } from '../../runtime-city-presentation';

type Props = { params: LocaleRouteParams };

export async function generateMetadata({ params }: Props) {
  const locale = localeOrNotFound((await params).locale);
  const meta = getCatalog(locale).meta.cities.madrid;
  const shell = getCatalog(locale).cities.madrid as CityContent;
  const presentation = getRuntimeCityPresentation(locale, 'madrid', shell);
  const approvedSeo = presentation.approvedCity?.seo;
  return buildLocalizedPublicMetadata(
    {
      locale,
      semanticPath: '/madrid',
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

export default async function MadridPage({ params }: Props) {
  const locale = localeOrNotFound((await params).locale);
  const presentation = getRuntimeCityPresentation(
    locale,
    'madrid',
    getCatalog(locale).cities.madrid as CityContent,
  );
  return (
    <CityLanding
      content={presentation.content}
      locale={locale}
      runtimeState={presentation}
    />
  );
}
