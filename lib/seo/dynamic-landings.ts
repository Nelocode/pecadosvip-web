import type { CitySlug } from '../content/types.ts';

export type DynamicLandingData = {
  canonicalPath: string;
  seoTitle: string;
  metaDescription: string;
  schemaOrgJsonLd: Record<string, unknown>;
};

export function generateDynamicLandingData(
  country: string = 'espana',
  citySlug: CitySlug,
  categorySlug: string = 'acompanantes-vip',
  modelName: string
): DynamicLandingData {
  const cleanModel = modelName.trim().toLowerCase().replace(/\s+/g, '-');
  const canonicalPath = `/${country}/${citySlug}/${categorySlug}/${cleanModel}`;
  const displayCity = citySlug.charAt(0).toUpperCase() + citySlug.slice(1);

  const seoTitle = `${modelName} | Acompañante VIP en ${displayCity} - PecadosVip`;
  const metaDescription = `Perfil verificado de ${modelName} en ${displayCity}. Consulta fotos de la galería, modalidades y contacto directo para eventos de lujo.`;

  const schemaOrgJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: `PecadosVIP ${displayCity} - ${modelName}`,
    description: metaDescription,
    url: canonicalPath,
    address: {
      '@type': 'PostalAddress',
      addressLocality: displayCity,
      addressCountry: 'ES',
    },
    priceRange: '€€€',
  };

  return {
    canonicalPath,
    seoTitle,
    metaDescription,
    schemaOrgJsonLd,
  };
}
