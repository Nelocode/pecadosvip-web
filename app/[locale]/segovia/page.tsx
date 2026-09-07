import {
  buildSupplementalCityRouteMetadata,
  renderSupplementalCityRoute,
  type SupplementalCityRouteProps,
} from '../../supplemental-city-route';

const citySlug = 'segovia' as const;

export function generateMetadata(props: SupplementalCityRouteProps) {
  return buildSupplementalCityRouteMetadata(citySlug, props);
}

export default function SegoviaPage(props: SupplementalCityRouteProps) {
  return renderSupplementalCityRoute(citySlug, props);
}
