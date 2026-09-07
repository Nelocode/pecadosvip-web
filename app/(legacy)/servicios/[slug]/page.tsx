import { notFound } from 'next/navigation';

import {
  getPublicProfilesForService,
  getPublicService,
} from '../../../../lib/content/public-services';
import { hasServiceCandidateRoute } from '../../../../lib/content/route-manifest';
import { getRuntimeVisibilityState } from '../../../../lib/content/runtime-publication';
import { getRuntimeContentSnapshot } from '../../../../lib/content/runtime-snapshot';
import { getCatalog } from '../../../../lib/i18n/catalog';
import { buildPublicMetadata } from '../../../../lib/seo';
import PublicServiceDetail from '../../../components/PublicServiceDetail';
import ReleaseHoldingPage from '../../../components/ReleaseHoldingPage';

type Props = { params: Promise<{ slug: string }> };
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  if (!slugPattern.test(slug)) notFound();
  const snapshot = getRuntimeContentSnapshot();
  if (!hasServiceCandidateRoute(snapshot, slug)) notFound();
  const meta = getCatalog('es').meta.service;
  const service = getPublicService(snapshot, slug);
  return buildPublicMetadata({
    path: `/servicios/${slug}`,
    title: service?.name ?? meta.unavailableTitle,
    description: service?.description ?? meta.unavailableDescription,
    forceNoIndex: !service,
  });
}

export default async function LegacyServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  if (!slugPattern.test(slug)) notFound();
  const snapshot = getRuntimeContentSnapshot();
  if (!hasServiceCandidateRoute(snapshot, slug)) notFound();
  if (!getRuntimeVisibilityState().renderPublicExperience) {
    return <ReleaseHoldingPage semanticPath={`/servicios/${slug}`} />;
  }

  const service = getPublicService(snapshot, slug);
  if (!service) notFound();
  const profiles = getPublicProfilesForService(snapshot, service.slug);
  if (!profiles) notFound();
  return <PublicServiceDetail profiles={profiles} service={service} />;
}
