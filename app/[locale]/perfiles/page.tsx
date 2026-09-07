import { getCatalog } from '../../../lib/i18n/catalog';
import { buildSyntheticBetaMetadata } from '../../../lib/preview/synthetic-beta-metadata';
import SyntheticPreviewPage from '../../(legacy)/preview-local-sintetico/page';
import { localeOrNotFound, type LocaleRouteParams } from '../../locale-routing';

type RawSearchParams = Record<string, string | string[] | undefined>;
type Props = {
  params: LocaleRouteParams;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params }: Props) {
  const locale = localeOrNotFound((await params).locale);
  const meta = getCatalog(locale).meta.profiles;
  return buildSyntheticBetaMetadata({
    locale,
    title: meta.title,
    description: meta.description,
  });
}

export default async function ProfilesPage({ params, searchParams }: Props) {
  const locale = localeOrNotFound((await params).locale);
  return SyntheticPreviewPage({
    localeOverride: locale,
    mode: 'public-beta',
    searchParams,
  });
}
