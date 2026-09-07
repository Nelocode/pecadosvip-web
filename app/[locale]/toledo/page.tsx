import {
  buildSupplementalCityRouteMetadata,
  renderSupplementalCityRoute,
  type SupplementalCityRouteProps,
} from '../../supplemental-city-route';

const citySlug = 'toledo' as const;

export function generateMetadata(props: SupplementalCityRouteProps) {
  return buildSupplementalCityRouteMetadata(citySlug, props);
}

export default function ToledoPage(props: SupplementalCityRouteProps) {
  return renderSupplementalCityRoute(citySlug, props);
}
