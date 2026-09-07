import { getSyntheticBetaCopy } from '../../lib/preview/synthetic-beta-copy';
import { buildSyntheticBetaMetadata } from '../../lib/preview/synthetic-beta-metadata';
import SyntheticPreviewPage from '../(legacy)/preview-local-sintetico/page';
import { localeOrNotFound, type LocaleRouteParams } from '../locale-routing';

type RawSearchParams = Record<string, string | string[] | undefined>;
type LocalePageProps = {
  params: LocaleRouteParams;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: LocalePageProps) {
  const locale = localeOrNotFound((await params).locale);
  const messages = getSyntheticBetaCopy(locale).metadata;
  return buildSyntheticBetaMetadata({
    locale,
    title: messages.homeTitle,
    description: messages.homeDescription,
  });
}

export default async function LocalizedHome({
  params,
  searchParams,
}: LocalePageProps) {
  const locale = localeOrNotFound((await params).locale);
  return SyntheticPreviewPage({
    localeOverride: locale,
    mode: 'public-beta',
    searchParams,
  });
}
