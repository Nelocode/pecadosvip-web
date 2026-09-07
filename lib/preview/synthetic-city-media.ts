import type { PublicMedia } from '../content/public-profiles.ts';
import { citySlugs } from '../content/types.ts';
import type { CitySlug } from '../content/types.ts';
import type { Locale } from '../i18n/locales.ts';
import type { SyntheticMediaScope } from './synthetic-preview.ts';

export type SyntheticCityMediaSlug = CitySlug | 'sitges';

export const syntheticCityMediaSlugs = [
  ...citySlugs,
  'sitges',
] as const satisfies readonly SyntheticCityMediaSlug[];

type LocalizedText = Readonly<Record<Locale, string>>;

type SyntheticCityMediaDefinition = {
  filename: string;
  objectPosition: string;
  alt: LocalizedText;
};

export type SyntheticCityMedia = PublicMedia & {
  citySlug: SyntheticCityMediaSlug;
  sourcePath: string;
  contentType: 'image/webp';
  objectPosition: string;
  disclosure: string;
  shortDisclosure: string;
};

export type SyntheticCityPresentation = {
  coverageEyebrow: string;
  coverageTitle: string;
  coverageBody: string;
  pendingStatus: string;
  groups: Readonly<Record<'madrid' | 'barcelona', string>>;
};

const localized = (es: string, en: string, fr: string, it: string): LocalizedText => ({
  es,
  en,
  fr,
  it,
});

const disclosures: LocalizedText = localized(
  'Imagen de referencia generada con IA · cobertura no confirmada',
  'AI-generated reference image · coverage not confirmed',
  'Image de référence générée par IA · couverture non confirmée',
  'Immagine di riferimento generata con IA · copertura non confermata',
);

const shortDisclosures: LocalizedText = localized(
  'Generada con IA',
  'AI-generated',
  'Générée par IA',
  'Generata con IA',
);

const mediaDefinitions: Readonly<Record<SyntheticCityMediaSlug, SyntheticCityMediaDefinition>> = {
  madrid: {
    filename: 'madrid-reference-v01.webp',
    objectPosition: '50% 48%',
    alt: localized(
      'Composición editorial generada con IA inspirada en la Gran Vía y el perfil urbano de Madrid al anochecer.',
      'AI-generated editorial composition inspired by Gran Vía and the Madrid skyline at dusk.',
      'Composition éditoriale générée par IA, inspirée de la Gran Vía et de l’horizon de Madrid au crépuscule.',
      'Composizione editoriale generata con IA ispirata alla Gran Vía e al profilo urbano di Madrid al tramonto.',
    ),
  },
  barcelona: {
    filename: 'barcelona-reference-v01.webp',
    objectPosition: '50% 48%',
    alt: localized(
      'Composición editorial generada con IA inspirada en el Eixample y la silueta de la Sagrada Família al anochecer.',
      'AI-generated editorial composition inspired by the Eixample and the Sagrada Família silhouette at dusk.',
      'Composition éditoriale générée par IA, inspirée de l’Eixample et de la silhouette de la Sagrada Família au crépuscule.',
      'Composizione editoriale generata con IA ispirata all’Eixample e alla silhouette della Sagrada Família al tramonto.',
    ),
  },
  girona: {
    filename: 'girona-reference-v01.webp',
    objectPosition: '50% 50%',
    alt: localized(
      'Composición editorial generada con IA inspirada en el río Onyar, sus puentes y el casco antiguo de Girona.',
      'AI-generated editorial composition inspired by the Onyar river, its bridges and Girona’s old town.',
      'Composition éditoriale générée par IA, inspirée de l’Onyar, de ses ponts et de la vieille ville de Gérone.',
      'Composizione editoriale generata con IA ispirata al fiume Onyar, ai suoi ponti e al centro storico di Girona.',
    ),
  },
  tarragona: {
    filename: 'tarragona-reference-v01.webp',
    objectPosition: '50% 52%',
    alt: localized(
      'Composición editorial generada con IA inspirada en el anfiteatro romano de Tarragona y el Mediterráneo.',
      'AI-generated editorial composition inspired by Tarragona’s Roman amphitheatre and the Mediterranean.',
      'Composition éditoriale générée par IA, inspirée de l’amphithéâtre romain de Tarragone et de la Méditerranée.',
      'Composizione editoriale generata con IA ispirata all’anfiteatro romano di Tarragona e al Mediterraneo.',
    ),
  },
  sitges: {
    filename: 'sitges-reference-v01.webp',
    objectPosition: '50% 50%',
    alt: localized(
      'Composición editorial generada con IA inspirada en la iglesia de Sant Bartomeu i Santa Tecla y el litoral de Sitges al anochecer.',
      'AI-generated editorial composition inspired by the Church of Sant Bartomeu i Santa Tecla and the Sitges coastline at dusk.',
      'Composition éditoriale générée par IA, inspirée de l’église Sant Bartomeu i Santa Tecla et du littoral de Sitges au crépuscule.',
      'Composizione editoriale generata con IA ispirata alla chiesa di Sant Bartomeu i Santa Tecla e al litorale di Sitges al tramonto.',
    ),
  },
  toledo: {
    filename: 'toledo-reference-v01.webp',
    objectPosition: '50% 46%',
    alt: localized(
      'Composición editorial generada con IA inspirada en el perfil histórico de Toledo sobre el río Tajo.',
      'AI-generated editorial composition inspired by Toledo’s historic skyline above the Tagus river.',
      'Composition éditoriale générée par IA, inspirée de la silhouette historique de Tolède au-dessus du Tage.',
      'Composizione editoriale generata con IA ispirata al profilo storico di Toledo affacciato sul fiume Tago.',
    ),
  },
  guadalajara: {
    filename: 'guadalajara-reference-v01.webp',
    objectPosition: '50% 50%',
    alt: localized(
      'Composición editorial generada con IA inspirada en la fachada geométrica del Palacio del Infantado de Guadalajara.',
      'AI-generated editorial composition inspired by the geometric façade of the Palacio del Infantado in Guadalajara.',
      'Composition éditoriale générée par IA, inspirée de la façade géométrique du palais de l’Infantado à Guadalajara.',
      'Composizione editoriale generata con IA ispirata alla facciata geometrica del Palacio del Infantado di Guadalajara.',
    ),
  },
  segovia: {
    filename: 'segovia-reference-v01.webp',
    objectPosition: '50% 52%',
    alt: localized(
      'Composición editorial generada con IA inspirada en el acueducto y la ciudad antigua de Segovia al anochecer.',
      'AI-generated editorial composition inspired by Segovia’s aqueduct and old town at dusk.',
      'Composition éditoriale générée par IA, inspirée de l’aqueduc et de la vieille ville de Ségovie au crépuscule.',
      'Composizione editoriale generata con IA ispirata all’acquedotto e alla città antica di Segovia al tramonto.',
    ),
  },
};

const presentations: Readonly<Record<Locale, SyntheticCityPresentation>> = {
  es: {
    coverageEyebrow: 'Cobertura visual · simulada',
    coverageTitle: 'Ocho destinos en la experiencia propuesta',
    coverageBody: 'Estas referencias permiten validar arquitectura y diseño. Ninguna ciudad se presenta como cobertura comercial confirmada.',
    pendingStatus: 'En confirmación',
    groups: { madrid: 'Zona Madrid', barcelona: 'Zona Barcelona' },
  },
  en: {
    coverageEyebrow: 'Visual coverage · simulated',
    coverageTitle: 'Eight destinations in the proposed experience',
    coverageBody: 'These references support architecture and design review. No city is presented as confirmed commercial coverage.',
    pendingStatus: 'Pending confirmation',
    groups: { madrid: 'Madrid area', barcelona: 'Barcelona area' },
  },
  fr: {
    coverageEyebrow: 'Couverture visuelle · simulée',
    coverageTitle: 'Huit destinations dans l’expérience proposée',
    coverageBody: 'Ces références permettent de valider l’architecture et le design. Aucune ville n’est présentée comme une couverture commerciale confirmée.',
    pendingStatus: 'À confirmer',
    groups: { madrid: 'Zone de Madrid', barcelona: 'Zone de Barcelone' },
  },
  it: {
    coverageEyebrow: 'Copertura visiva · simulata',
    coverageTitle: 'Otto destinazioni nell’esperienza proposta',
    coverageBody: 'Questi riferimenti consentono di validare architettura e design. Nessuna città è presentata come copertura commerciale confermata.',
    pendingStatus: 'Da confermare',
    groups: { madrid: 'Area di Madrid', barcelona: 'Area di Barcellona' },
  },
};

export function isSyntheticCityMediaSlug(value: unknown): value is SyntheticCityMediaSlug {
  return syntheticCityMediaSlugs.includes(value as SyntheticCityMediaSlug);
}

export function getSyntheticCityMedia(
  citySlug: SyntheticCityMediaSlug,
  locale: Locale,
  scope: SyntheticMediaScope = 'local-preview',
): SyntheticCityMedia {
  const definition = mediaDefinitions[citySlug];
  return {
    citySlug,
    kind: 'image',
    desktopUrl:
      scope === 'public-beta'
        ? `/beta-media/cities/${citySlug}`
        : `/preview-local-sintetico/city-media/${citySlug}`,
    alt: definition.alt[locale],
    order: syntheticCityMediaSlugs.indexOf(citySlug),
    sourcePath: `assets/synthetic-cities/selected/${definition.filename}`,
    contentType: 'image/webp',
    objectPosition: definition.objectPosition,
    disclosure: disclosures[locale],
    shortDisclosure: shortDisclosures[locale],
  };
}

export function getSyntheticCityPresentation(locale: Locale): SyntheticCityPresentation {
  return presentations[locale];
}
