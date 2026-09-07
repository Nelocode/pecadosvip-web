import type { PublicMedia } from '../content/public-profiles.ts';
import type { Locale } from '../i18n/locales.ts';
import type { SyntheticMediaScope } from './synthetic-preview.ts';

export const syntheticServiceMediaKeys = [
  'company-private-lounge',
  'settings-private-celebration',
  'settings-hotel-arrival',
  'settings-home-arrival',
  'couples-two-settings',
  'couples-private-gathering',
  'wellbeing-spa-ritual',
  'wellbeing-water-ritual',
  'roleplay-theatre-mask',
  'roleplay-consent-accessories',
  'preferences-silk-envelope',
  'preferences-choice-boxes',
  'company-women-companionship',
  'couples-partner-companionship',
  'preferences-agreed-intimacy',
  'roleplay-personal-fantasy',
  'roleplay-agreed-fetish',
  'preferences-oral-complete',
  'preferences-oral-natural',
  'preferences-oral-intense',
  'couples-open-pair',
  'roleplay-adult-games',
  'wellbeing-kamasutra-connection',
  'preferences-water-play',
  'wellbeing-sensual-massage',
  'roleplay-editorial-pse',
  'roleplay-consensual-sm',
  'preferences-oral-intimacy',
  'roleplay-adult-accessories',
  'roleplay-private-striptease',
  'company-gfe-experience',
  'couples-private-trio',
  'couples-women-experience',
  'preferences-control-play',
] as const;

export type SyntheticServiceMediaKey =
  (typeof syntheticServiceMediaKeys)[number];

type LocalizedAlt = Readonly<Record<Locale, string>>;

type SyntheticServiceMediaDefinition = {
  filename: string;
  objectPosition: string;
  alt: LocalizedAlt;
};

export type SyntheticServiceMedia = PublicMedia & {
  key: SyntheticServiceMediaKey;
  sourcePath: string;
  contentType: 'image/webp';
  objectPosition: string;
};

const alt = (es: string, en: string, fr: string, it: string): LocalizedAlt => ({
  es,
  en,
  fr,
  it,
});

const mediaDefinitions: Readonly<
  Record<SyntheticServiceMediaKey, SyntheticServiceMediaDefinition>
> = {
  'company-private-lounge': {
    filename: 'company-private-lounge-v01.webp',
    objectPosition: '50% 48%',
    alt: alt(
      'Salón nocturno con dos butacas y dos copas sobre una mesa de mármol oscuro.',
      'Night lounge with two armchairs and two glasses on a dark marble table.',
      'Salon nocturne avec deux fauteuils et deux coupes sur une table en marbre sombre.',
      'Salotto notturno con due poltrone e due coppe su un tavolo di marmo scuro.',
    ),
  },
  'settings-private-celebration': {
    filename: 'settings-private-celebration-v01.webp',
    objectPosition: '50% 50%',
    alt: alt(
      'Bodegón de celebración privada con cubitera, sobres negros y cinta dorada.',
      'Private celebration still life with an ice bucket, black envelopes and gold ribbon.',
      'Nature morte de célébration privée avec seau, enveloppes noires et ruban doré.',
      'Natura morta per una celebrazione privata con secchiello, buste nere e nastro dorato.',
    ),
  },
  'settings-hotel-arrival': {
    filename: 'settings-hotel-arrival-v02.webp',
    objectPosition: '50% 45%',
    alt: alt(
      'Maletín de noche y tarjeta sin marca frente a un pasillo de hotel iluminado.',
      'Overnight case and unbranded card before a softly lit hotel corridor.',
      'Sac de voyage et carte sans marque devant un couloir d’hôtel éclairé.',
      'Borsa da viaggio e tessera senza marchio davanti a un corridoio d’hotel illuminato.',
    ),
  },
  'settings-home-arrival': {
    filename: 'settings-home-arrival-v01.webp',
    objectPosition: '50% 48%',
    alt: alt(
      'Llave de latón y manta oscura en la entrada de un apartamento cálido.',
      'Brass key and dark throw at the entrance to a warmly lit apartment.',
      'Clé en laiton et plaid sombre à l’entrée d’un appartement chaleureux.',
      'Chiave in ottone e coperta scura all’ingresso di un appartamento illuminato da una luce calda.',
    ),
  },
  'couples-two-settings': {
    filename: 'couples-two-settings-v01.webp',
    objectPosition: '50% 48%',
    alt: alt(
      'Dos butacas y dos copas frente a una ventana con luces nocturnas.',
      'Two armchairs and two glasses before a window with night lights.',
      'Deux fauteuils et deux coupes devant une fenêtre éclairée la nuit.',
      'Due poltrone e due coppe davanti a una finestra con luci notturne.',
    ),
  },
  'couples-private-gathering': {
    filename: 'couples-private-gathering-v01.webp',
    objectPosition: '50% 46%',
    alt: alt(
      'Tres copas dispuestas ante tres asientos en un salón privado.',
      'Three glasses arranged before three seats in a private lounge.',
      'Trois coupes disposées devant trois sièges dans un salon privé.',
      'Tre coppe disposte davanti a tre sedute in un salotto privato.',
    ),
  },
  'wellbeing-spa-ritual': {
    filename: 'wellbeing-spa-ritual-v01.webp',
    objectPosition: '52% 46%',
    alt: alt(
      'Toallas color carbón, frascos de aceite ámbar y cuenco de piedra con vapor.',
      'Charcoal towels, amber oil bottles and a steaming stone bowl.',
      'Serviettes anthracite, flacons d’huile ambrée et bol en pierre fumant.',
      'Asciugamani antracite, flaconi d’olio ambrato e ciotola in pietra con vapore.',
    ),
  },
  'wellbeing-water-ritual': {
    filename: 'wellbeing-water-ritual-v01.webp',
    objectPosition: '50% 44%',
    alt: alt(
      'Ducha de lluvia con vapor, toallas oscuras y frasco ámbar sin etiqueta.',
      'Steaming rainfall shower with dark towels and an unlabelled amber bottle.',
      'Douche pluie avec vapeur, serviettes sombres et flacon ambré sans étiquette.',
      'Doccia a pioggia con vapore, asciugamani scuri e flacone ambrato senza etichetta.',
    ),
  },
  'roleplay-theatre-mask': {
    filename: 'roleplay-theatre-mask-v01.webp',
    objectPosition: '50% 42%',
    alt: alt(
      'Antifaz de terciopelo, guantes de satén y estuche cerrado sobre un tocador.',
      'Velvet mask, satin gloves and a closed case on a dressing table.',
      'Masque en velours, gants en satin et coffret fermé sur une coiffeuse.',
      'Maschera di velluto, guanti di raso e custodia chiusa su un tavolo da trucco.',
    ),
  },
  'roleplay-consent-accessories': {
    filename: 'roleplay-consent-accessories-v01.webp',
    objectPosition: '50% 45%',
    alt: alt(
      'Abanicos negro y dorado, reloj de arena, tarjetas en blanco y bolsa de satén.',
      'Black and gold fans, an hourglass, blank cards and a satin pouch.',
      'Éventails noir et doré, sablier, cartes vierges et pochette en satin.',
      'Ventagli nero e dorato, clessidra, carte bianche e sacchetto di raso.',
    ),
  },
  'preferences-silk-envelope': {
    filename: 'preferences-silk-envelope-v01.webp',
    objectPosition: '50% 44%',
    alt: alt(
      'Sobre negro cerrado sobre seda dorada y piedras oscuras pulidas.',
      'Sealed black envelope on gold silk with smooth dark stones.',
      'Enveloppe noire fermée sur soie dorée et pierres sombres polies.',
      'Busta nera chiusa su seta dorata e pietre scure levigate.',
    ),
  },
  'preferences-choice-boxes': {
    filename: 'preferences-choice-boxes-v01.webp',
    objectPosition: '50% 46%',
    alt: alt(
      'Cajas negras de elección, una abierta con seda dorada, tarjeta en blanco y lápiz.',
      'Black choice boxes, one open with gold silk, a blank card and pencil.',
      'Boîtes de choix noires, dont une ouverte sur de la soie dorée, carte vierge et crayon.',
      'Scatole nere di scelta, una aperta con seta dorata, biglietto bianco e matita.',
    ),
  },
  'company-women-companionship': {
    filename: 'company-women-companionship-v01.webp',
    objectPosition: '50% 44%',
    alt: alt(
      'Dos recipientes de porcelana negra para bebida, un libro cerrado, una pluma dorada y una peonía borgoña.',
      'Two black porcelain drinking vessels, a closed book, a gold pen and a burgundy peony.',
      'Deux récipients à boire en porcelaine noire, un livre fermé, un stylo doré et une pivoine bordeaux.',
      'Due recipienti da bevanda in porcellana nera, un libro chiuso, una penna dorata e una peonia bordeaux.',
    ),
  },
  'couples-partner-companionship': {
    filename: 'couples-partner-companionship-v01.webp',
    objectPosition: '50% 46%',
    alt: alt(
      'Dos servicios de mesa separados con aros dorados unidos por una cinta de seda.',
      'Two separate place settings with gold napkin rings joined by a silk ribbon.',
      'Deux couverts séparés avec des ronds de serviette dorés reliés par un ruban de soie.',
      'Due coperti separati con fermatovaglioli dorati uniti da un nastro di seta.',
    ),
  },
  'preferences-agreed-intimacy': {
    filename: 'preferences-agreed-intimacy-v01.webp',
    objectPosition: '50% 44%',
    alt: alt(
      'Balanza de latón equilibrada con dos tarjetas crema en blanco y cierres dorados.',
      'Balanced brass scale with two blank cream cards and matching gold clasps.',
      'Balance en laiton avec deux cartes crème vierges et des fermoirs dorés assortis.',
      'Bilancia in ottone con due cartoncini crema vuoti e chiusure dorate abbinate.',
    ),
  },
  'roleplay-personal-fantasy': {
    filename: 'roleplay-personal-fantasy-v01.webp',
    objectPosition: '50% 42%',
    alt: alt(
      'Pequeño escenario teatral vacío con tres cajas negras cerradas bajo una luz dorada.',
      'Small empty theatre stage with three closed black prop boxes under a gold light.',
      'Petite scène de théâtre vide avec trois coffrets noirs fermés sous une lumière dorée.',
      'Piccolo palco teatrale vuoto con tre scatole nere chiuse sotto una luce dorata.',
    ),
  },
  'roleplay-agreed-fetish': {
    filename: 'roleplay-agreed-fetish-v01.webp',
    objectPosition: '50% 45%',
    alt: alt(
      'Cajón de terciopelo con una pluma, una cinta de satén y una piedra lisa separadas.',
      'Velvet specimen drawer with a feather, satin ribbon and smooth stone kept separate.',
      'Tiroir en velours avec une plume, un ruban de satin et une pierre lisse séparés.',
      'Cassetto in velluto con una piuma, un nastro di raso e una pietra liscia separati.',
    ),
  },
  'preferences-oral-complete': {
    filename: 'preferences-oral-complete-v01.webp',
    objectPosition: '50% 46%',
    alt: alt(
      'Cuatro cuencos ovalados de laca negra forman un círculo completo alrededor de una perla.',
      'Four black lacquer oval bowls form a complete circle around a single pearl.',
      'Quatre bols ovales en laque noire forment un cercle complet autour d’une perle.',
      'Quattro ciotole ovali in lacca nera formano un cerchio completo attorno a una perla.',
    ),
  },
  'preferences-oral-natural': {
    filename: 'preferences-oral-natural-v01.webp',
    objectPosition: '50% 45%',
    alt: alt(
      'Cuenco de travertino natural con una camelia blanca y gotas de agua transparente.',
      'Natural travertine bowl with a white camellia and clear water droplets.',
      'Bol en travertin naturel avec un camélia blanc et des gouttes d’eau claire.',
      'Ciotola in travertino naturale con una camelia bianca e gocce d’acqua limpida.',
    ),
  },
  'preferences-oral-intense': {
    filename: 'preferences-oral-intense-v01.webp',
    objectPosition: '50% 42%',
    alt: alt(
      'Escultura abstracta en espiral de obsidiana iluminada por un haz ámbar.',
      'Abstract obsidian spiral sculpture illuminated by a concentrated amber beam.',
      'Sculpture abstraite en spirale d’obsidienne éclairée par un faisceau ambré.',
      'Scultura astratta a spirale in ossidiana illuminata da un fascio ambrato.',
    ),
  },
  'couples-open-pair': {
    filename: 'couples-open-pair-v01.webp',
    objectPosition: '50% 46%',
    alt: alt(
      'Dos arcos abiertos de latón sobre mármol negro con un espacio central iluminado.',
      'Two open brass arcs on black marble with an illuminated space between them.',
      'Deux arcs ouverts en laiton sur marbre noir avec un espace éclairé entre eux.',
      'Due archi aperti in ottone su marmo nero con uno spazio illuminato al centro.',
    ),
  },
  'roleplay-adult-games': {
    filename: 'roleplay-adult-games-v01.webp',
    objectPosition: '50% 46%',
    alt: alt(
      'Mesa de juego elegante con cartas negras en blanco, fichas doradas y reloj de arena.',
      'Elegant game table with blank black cards, gold tokens and an hourglass.',
      'Table de jeu élégante avec cartes noires vierges, jetons dorés et sablier.',
      'Elegante tavolo da gioco con carte nere vuote, gettoni dorati e clessidra.',
    ),
  },
  'wellbeing-kamasutra-connection': {
    filename: 'wellbeing-kamasutra-connection-v01.webp',
    objectPosition: '50% 44%',
    alt: alt(
      'Dos formas abstractas de piedra entrelazadas sobre lino oscuro junto a una vela.',
      'Two interlocking abstract stone forms on dark linen beside a candle.',
      'Deux formes abstraites en pierre entrelacées sur du lin sombre près d’une bougie.',
      'Due forme astratte in pietra intrecciate su lino scuro accanto a una candela.',
    ),
  },
  'preferences-water-play': {
    filename: 'preferences-water-play-v01.webp',
    objectPosition: '50% 43%',
    alt: alt(
      'Lavabo de piedra negra con ondas de agua, dos gotas de vidrio y detalle de latón.',
      'Black stone basin with water ripples, two glass droplets and a brass detail.',
      'Bassin en pierre noire avec ondulations, deux gouttes en verre et détail en laiton.',
      'Vasca in pietra nera con onde, due gocce di vetro e un dettaglio in ottone.',
    ),
  },
  'wellbeing-sensual-massage': {
    filename: 'wellbeing-sensual-massage-v01.webp',
    objectPosition: '50% 45%',
    alt: alt(
      'Piedras de masaje, toalla de carbón, rodillo de madera y frasco de aceite ámbar.',
      'Massage stones, charcoal towel, wooden roller and an amber oil bottle.',
      'Pierres de massage, serviette anthracite, rouleau en bois et flacon d’huile ambrée.',
      'Pietre da massaggio, asciugamano antracite, rullo in legno e flacone d’olio ambrato.',
    ),
  },
  'roleplay-editorial-pse': {
    filename: 'roleplay-editorial-pse-v01.webp',
    objectPosition: '50% 42%',
    alt: alt(
      'Estudio editorial vacío con silla de dirección negra, foco y hojas de contacto en blanco.',
      'Empty editorial studio with a black director chair, spotlight and blank contact sheets.',
      'Studio éditorial vide avec fauteuil noir, projecteur et planches-contact vierges.',
      'Studio editoriale vuoto con sedia da regista nera, faro e provini a contatto vuoti.',
    ),
  },
  'roleplay-consensual-sm': {
    filename: 'roleplay-consensual-sm-v02.webp',
    objectPosition: '50% 45%',
    alt: alt(
      'Dos arcos abstractos de obsidiana separados junto a fichas de vidrio verde y roja.',
      'Two separated abstract obsidian arcs beside green and red glass tokens.',
      "Deux arcs abstraits en obsidienne séparés près de jetons en verre vert et rouge.",
      'Due archi astratti di ossidiana separati accanto a gettoni di vetro verde e rosso.',
    ),
  },
  'preferences-oral-intimacy': {
    filename: 'preferences-oral-intimacy-v01.webp',
    objectPosition: '50% 44%',
    alt: alt(
      'Dos recipientes curvos de vidrio orientados entre sí con una perla en el centro.',
      'Two curved glass vessels facing each other with a pearl between them.',
      'Deux récipients courbes en verre se font face avec une perle au centre.',
      'Due recipienti curvi in vetro si fronteggiano con una perla al centro.',
    ),
  },
  'roleplay-adult-accessories': {
    filename: 'roleplay-adult-accessories-v01.webp',
    objectPosition: '50% 45%',
    alt: alt(
      'Vitrina cerrada con accesorios escultóricos abstractos y pequeñas cajas negras.',
      'Closed display cabinet with abstract sculptural accessories and small black boxes.',
      'Vitrine fermée avec accessoires sculpturaux abstraits et petits coffrets noirs.',
      'Vetrina chiusa con accessori scultorei astratti e piccole scatole nere.',
    ),
  },
  'roleplay-private-striptease': {
    filename: 'roleplay-private-striptease-v01.webp',
    objectPosition: '50% 42%',
    alt: alt(
      'Escenario de cabaré vacío con cortina borgoña, zapatos dorados y abanico de plumas.',
      'Empty cabaret stage with a burgundy curtain, gold shoes and a feather fan.',
      'Scène de cabaret vide avec rideau bordeaux, chaussures dorées et éventail de plumes.',
      'Palco da cabaret vuoto con sipario bordeaux, scarpe dorate e ventaglio di piume.',
    ),
  },
  'company-gfe-experience': {
    filename: 'company-gfe-experience-v01.webp',
    objectPosition: '50% 46%',
    alt: alt(
      'Bandeja de desayuno para dos con café, bollería, flores y una tarjeta en blanco.',
      'Breakfast tray for two with coffee, pastries, flowers and a blank card.',
      'Plateau de petit-déjeuner pour deux avec café, viennoiseries, fleurs et carte vierge.',
      'Vassoio da colazione per due con caffè, dolci, fiori e un biglietto vuoto.',
    ),
  },
  'couples-private-trio': {
    filename: 'couples-private-trio-v01.webp',
    objectPosition: '50% 46%',
    alt: alt(
      'Tres vasos distintos dispuestos en triángulo sobre una mesa de mármol oscuro.',
      'Three distinct glasses arranged in a triangle on a dark marble table.',
      'Trois verres distincts disposés en triangle sur une table en marbre sombre.',
      'Tre bicchieri distinti disposti a triangolo su un tavolo di marmo scuro.',
    ),
  },
  'couples-women-experience': {
    filename: 'couples-women-experience-v01.webp',
    objectPosition: '50% 45%',
    alt: alt(
      'Dos jarrones escultóricos distintos con flores complementarias bajo luz ámbar.',
      'Two distinct sculptural vases with complementary flowers under amber light.',
      'Deux vases sculpturaux distincts avec des fleurs complémentaires sous lumière ambrée.',
      'Due vasi scultorei distinti con fiori complementari sotto una luce ambrata.',
    ),
  },
  'preferences-control-play': {
    filename: 'preferences-control-play-v01.webp',
    objectPosition: '50% 44%',
    alt: alt(
      'Metrónomo de latón, dos cajas abiertas y una ficha verde sobre mármol negro.',
      'Brass metronome, two open boxes and a green token on black marble.',
      'Métronome en laiton, deux coffrets ouverts et jeton vert sur marbre noir.',
      'Metronomo in ottone, due scatole aperte e un gettone verde su marmo nero.',
    ),
  },
};

export function isSyntheticServiceMediaKey(
  value: unknown,
): value is SyntheticServiceMediaKey {
  return syntheticServiceMediaKeys.includes(value as SyntheticServiceMediaKey);
}
export function getSyntheticServiceMedia(
  key: SyntheticServiceMediaKey,
  locale: Locale,
  scope: SyntheticMediaScope = 'local-preview',
): SyntheticServiceMedia {
  const definition = mediaDefinitions[key];
  return {
    key,
    kind: 'image',
    desktopUrl:
      scope === 'public-beta'
        ? `/beta-media/services/${key}`
        : `/preview-local-sintetico/service-media/${key}`,
    alt: definition.alt[locale],
    order: syntheticServiceMediaKeys.indexOf(key),
    sourcePath: `assets/synthetic-services/selected/${definition.filename}`,
    contentType: 'image/webp',
    objectPosition: definition.objectPosition,
  };
}
