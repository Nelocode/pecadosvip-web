import {
  buildSupplementalCityRouteMetadata,
  renderSupplementalCityRoute,
  type SupplementalCityRouteProps,
} from '../../supplemental-city-route';

const citySlug = 'girona' as const;

export function generateMetadata(props: SupplementalCityRouteProps) {
  return buildSupplementalCityRouteMetadata(citySlug, props);
}

export default function GironaPage(props: SupplementalCityRouteProps) {
  return renderSupplementalCityRoute(citySlug, props);
}
