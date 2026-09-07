import { getPublicServices } from '../../../lib/content/public-services';
import { getRuntimeVisibilityState } from '../../../lib/content/runtime-publication';
import { getRuntimeContentSnapshot } from '../../../lib/content/runtime-snapshot';
import { getCatalog } from '../../../lib/i18n/catalog';
import { buildPublicMetadata } from '../../../lib/seo';
import PublicServiceHub from '../../components/PublicServiceHub';
import ReleaseHoldingPage from '../../components/ReleaseHoldingPage';

export function generateMetadata() {
  const meta = getCatalog('es').meta.services;
  return buildPublicMetadata({
    path: '/servicios',
    title: meta.title,
    description: meta.description,
  });
}

export default function LegacyServicesPage() {
  if (!getRuntimeVisibilityState().renderPublicExperience) {
    return <ReleaseHoldingPage semanticPath="/servicios" />;
  }
  const snapshot = getRuntimeContentSnapshot();
  return <PublicServiceHub services={getPublicServices(snapshot)} />;
}
