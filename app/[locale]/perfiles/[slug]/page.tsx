import { notFound } from 'next/navigation';

import { interpolate } from '../../../../lib/i18n/catalog';
import { getSyntheticBetaCopy } from '../../../../lib/preview/synthetic-beta-copy';
import { getSyntheticPreviewProfile } from '../../../../lib/preview/synthetic-preview';
import { buildSyntheticBetaMetadata } from '../../../../lib/preview/synthetic-beta-metadata';
import SyntheticProfilePage from '../../../(legacy)/preview-local-sintetico/perfiles/[slug]/page';
import { localeOrNotFound } from '../../../locale-routing';

type RawSearchParams = Record<string, string | string[] | undefined>;
type Props = {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<RawSearchParams>;
};
const profileSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = localeOrNotFound(rawLocale);
  if (!profileSlugPattern.test(slug)) notFound();
  const profile = getSyntheticPreviewProfile(slug, 'public-beta');
  if (!profile) notFound();
  const messages = getSyntheticBetaCopy(locale).metadata;
  return buildSyntheticBetaMetadata({
    locale,
    title: interpolate(messages.profileTitle, { name: profile.displayName }),
    description: interpolate(messages.profileDescription, { name: profile.displayName }),
  });
}

export default async function ProfileDetailPage({ params, searchParams }: Props) {
  const { locale: rawLocale, slug } = await params;
  const locale = localeOrNotFound(rawLocale);
  if (!profileSlugPattern.test(slug)) notFound();
  return SyntheticProfilePage({
    localeOverride: locale,
    mode: 'public-beta',
    params: Promise.resolve({ slug }),
    searchParams,
  });
}
