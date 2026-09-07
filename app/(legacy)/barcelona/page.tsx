import type { Metadata } from 'next';
import { buildCityMetadata } from '../../../lib/seo';
import CityLanding from '../../components/CityLanding';
import { cities } from '../../city-data';

export const metadata: Metadata = buildCityMetadata({
  slug: 'barcelona',
  city: 'Barcelona',
  description:
    'Servicio de compañía privada en Barcelona, con desplazamiento a domicilios y hoteles. Atención cuidada y disponibilidad bajo confirmación.',
  openGraphDescription:
    'Atención privada en domicilios y hoteles de Barcelona, con presencia discreta en ciudad y municipios seleccionados.',
  twitterDescription: 'Atención privada y discreta en Barcelona.',
});

export default function BarcelonaPage() {
  return <CityLanding content={cities.barcelona} />;
}
