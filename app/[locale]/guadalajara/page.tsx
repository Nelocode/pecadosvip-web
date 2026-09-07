import {
  buildSupplementalCityRouteMetadata,
  renderSupplementalCityRoute,
  type SupplementalCityRouteProps,
} from '../../supplemental-city-route';

const citySlug = 'guadalajara' as const;

export function generateMetadata(props: SupplementalCityRouteProps) {
  return buildSupplementalCityRouteMetadata(citySlug, props);
}

export default function GuadalajaraPage(props: SupplementalCityRouteProps) {
  return renderSupplementalCityRoute(citySlug, props);
}
