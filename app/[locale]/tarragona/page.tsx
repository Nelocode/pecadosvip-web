import {
  buildSupplementalCityRouteMetadata,
  renderSupplementalCityRoute,
  type SupplementalCityRouteProps,
} from '../../supplemental-city-route';

const citySlug = 'tarragona' as const;

export function generateMetadata(props: SupplementalCityRouteProps) {
  return buildSupplementalCityRouteMetadata(citySlug, props);
}

export default function TarragonaPage(props: SupplementalCityRouteProps) {
  return renderSupplementalCityRoute(citySlug, props);
}
