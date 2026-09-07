import type { Metadata } from 'next';
import { buildCityMetadata } from '../../../lib/seo';
import CityLanding from '../../components/CityLanding';
import { cities } from '../../city-data';

export const metadata: Metadata = buildCityMetadata({
  slug: 'madrid',
  city: 'Madrid',
  description:
    'Servicio de compañía privada en Madrid, con desplazamiento a domicilios y hoteles. Atención discreta y cobertura bajo confirmación previa.',
  openGraphDescription:
    'Atención privada en domicilios y hoteles de Madrid, siempre con discreción y confirmación previa.',
  twitterDescription: 'Atención privada y discreta en Madrid.',
});

export default function MadridPage() {
  return <CityLanding content={cities.madrid} />;
}
