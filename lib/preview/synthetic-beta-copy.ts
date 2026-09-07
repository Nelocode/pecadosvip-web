import type { Locale } from '../i18n/locales.ts';

export const SYNTHETIC_BETA_PROFILE_SLUGS = [
  'valeria',
  'sofia',
  'lucia',
  'julia',
  'mia',
  'alicia',
] as const;

export type SyntheticBetaProfileSlug =
  (typeof SYNTHETIC_BETA_PROFILE_SLUGS)[number];

export type SyntheticBetaAvailability =
  | 'available'
  | 'limited'
  | 'on-request'
  | 'unavailable';

export type SyntheticBetaServiceCategory =
  | 'company'
  | 'settings'
  | 'couples'
  | 'wellbeing'
  | 'roleplay';

type TrustSignal = Readonly<{
  code: string;
  title: string;
  detail: string;
}>;

type HomeService = Readonly<{
  number: string;
  category: SyntheticBetaServiceCategory;
  title: string;
  detail: string;
}>;

type ProfileEditorialCopy = Readonly<{
  displayName: string;
  biography: string;
  conceptTags: readonly string[];
}>;

export type SyntheticBetaCopy = Readonly<{
  locale: Locale;
  languageName: string;
  metadata: Readonly<{
    homeTitle: string;
    homeDescription: string;
    profileTitle: string;
    profileDescription: string;
  }>;
  brand: Readonly<{
    name: 'PecadosVip';
    tagline: string;
  }>;
  navigation: Readonly<{
    primaryAria: string;
    mobileAria: string;
    footerAria: string;
    languageAria: string;
    skipLink: string;
    home: string;
    madrid: string;
    barcelona: string;
    profiles: string;
    services: string;
    outings: string;
    about: string;
    contact: string;
    controls: string;
    zones: string;
    privateBooking: string;
    privateBookingAria: string;
    privateBookingTitle: string;
    betaStatus: string;
  }>;
  hero: Readonly<{
    eyebrow: string;
    titlePrimary: string;
    titleSecondary: string;
    location: string;
    kicker: string;
    note: string;
    madridCta: string;
    barcelonaCta: string;
    generatedImageDisclosure: string;
  }>;
  trustSignals: readonly TrustSignal[];
  coverage: Readonly<{
    eyebrow: string;
    title: string;
    body: string;
    mediaDisclosure: string;
    zoneSelectorAria: string;
    zoneLabel: string;
    zoneOnly: string;
    destinationsTitle: string;
    pendingStatus: string;
  }>;
  cities: Readonly<Record<
    'madrid' | 'barcelona' | 'girona' | 'tarragona' | 'toledo' |
      'guadalajara' | 'segovia' | 'sitges',
    string
  >>;
  filters: Readonly<{
    toggleTitle: string;
    toggleHint: string;
    legend: string;
    help: string;
    cityLabel: string;
    allCities: string;
    availabilityLabel: string;
    allAvailabilities: string;
    availability: Readonly<Record<SyntheticBetaAvailability, string>>;
    apply: string;
    reset: string;
    invalidTitle: string;
    invalidBody: string;
    resetAfterError: string;
  }>;
  profilesSection: Readonly<{
    eyebrow: string;
    title: string;
    note: string;
    countOne: string;
    countOther: string;
    selectionEyebrow: string;
    zoneTitle: string;
    emptyTitle: string;
    exploreZone: string;
    cardDisclosure: string;
    cardDisclosureShort: string;
    ageYears: string;
    statusPrefix: string;
    viewProfile: string;
    viewProfileAria: string;
  }>;
  homeServices: readonly HomeService[];
  servicesSection: Readonly<{
    eyebrow: string;
    title: string;
    body: string;
    exploreRoutes: string;
    conversionEyebrow: string;
    conversionTitle: string;
    conversionBody: string;
    contactDisabled: string;
  }>;
  security: Readonly<{
    eyebrow: string;
    title: string;
    items: readonly string[];
  }>;
  footer: Readonly<{
    tagline: string;
    home: string;
    profiles: string;
    services: string;
    backToTop: string;
    reviewStatus: string;
  }>;
  profile: Readonly<{
    statusBanner: string;
    breadcrumbAria: string;
    breadcrumbProfiles: string;
    galleryAria: string;
    selectPhotoAria: string;
    showPhotoAria: string;
    coverLabel: string;
    sceneLabel: string;
    imageGenerated: string;
    ageYears: string;
    syntheticNotice: string;
    identityLabel: string;
    identityValue: string;
    visualStatusLabel: string;
    visualOriginLabel: string;
    visualOriginValue: string;
    publicationLabel: string;
    publicationValue: string;
    conceptTitle: string;
    contactDisabledTitle: string;
    contactDisabledBody: string;
    contactDisabledButton: string;
    backToProfiles: string;
    footerTagline: string;
    footerCatalog: string;
    footerStatus: string;
    availability: Readonly<Record<SyntheticBetaAvailability, string>>;
  }>;
  profiles: Readonly<Record<SyntheticBetaProfileSlug, ProfileEditorialCopy>>;
}>;

const copy = {
  es: {
    locale: 'es',
    languageName: 'Español',
    metadata: {
      homeTitle: 'Beta visual sintética',
      homeDescription:
        'Beta visual no indexable con identidades adultas ficticias generadas con IA para validar diseño, navegación y contenido.',
      profileTitle: '{name} · Perfil sintético',
      profileDescription:
        'Ficha beta de {name}, una identidad adulta completamente ficticia generada con IA.',
    },
    brand: {
      name: 'PecadosVip',
      tagline: 'Discreción · Exclusividad · Placer',
    },
    navigation: {
      primaryAria: 'Navegación principal de la beta',
      mobileAria: 'Navegación móvil de la beta',
      footerAria: 'Enlaces internos del pie',
      languageAria: 'Seleccionar idioma',
      skipLink: 'Saltar al contenido principal',
      home: 'Inicio',
      madrid: 'Madrid',
      barcelona: 'Barcelona',
      profiles: 'Modelos VIP',
      services: 'Servicios',
      outings: 'Salidas',
      about: 'Nosotros',
      contact: 'Contacto',
      controls: 'Control',
      zones: 'Zonas',
      privateBooking: 'Reserva privada',
      privateBookingAria: 'Reserva desactivada en esta beta visual',
      privateBookingTitle: 'La reserva todavía no está disponible',
      betaStatus: 'Beta',
    },
    hero: {
      eyebrow: 'Discreción · Exclusividad · Placer',
      titlePrimary: 'El lujo de elegir',
      titleSecondary: 'en tu casa o en hotel',
      location: 'Madrid y Barcelona',
      kicker: 'Nuestros servicios premium',
      note: 'Beta visual no indexable; servicios y disponibilidad por confirmar.',
      madridCta: 'Ver modelos Madrid',
      barcelonaCta: 'Ver modelos Barcelona',
      generatedImageDisclosure:
        'Imagen generada con IA · identidad adulta ficticia',
    },
    trustSignals: [
      {
        code: '01',
        title: 'Discreción controlada',
        detail: 'Beta no indexable, sin canales externos activos.',
      },
      {
        code: '02',
        title: 'Modelos sintéticas seleccionadas',
        detail: 'Seis identidades adultas ficticias, señalizadas como IA.',
      },
      {
        code: '03',
        title: 'Salidas y hoteles · propuesta',
        detail: 'Madrid, Barcelona y cobertura ilustrativa por confirmar.',
      },
      {
        code: '04',
        title: 'Atención desactivada',
        detail: 'No se envían mensajes, reservas ni pagos.',
      },
    ],
    coverage: {
      eyebrow: 'Madrid · Barcelona',
      title: 'Dos zonas para elegir con claridad',
      body:
        'Estas referencias permiten validar la arquitectura y el diseño. Ninguna ciudad se presenta como cobertura comercial confirmada.',
      mediaDisclosure:
        'Imágenes de referencia generadas con IA · cobertura no confirmada',
      zoneSelectorAria: 'Elegir zona de la beta',
      zoneLabel: 'Zona {number}',
      zoneOnly: 'Ver solo {city}',
      destinationsTitle: 'Destinos de la zona',
      pendingStatus: 'Estado · pendiente',
    },
    cities: {
      madrid: 'Madrid',
      barcelona: 'Barcelona',
      girona: 'Girona',
      tarragona: 'Tarragona',
      toledo: 'Toledo',
      guadalajara: 'Guadalajara',
      segovia: 'Segovia',
      sitges: 'Sitges',
    },
    filters: {
      toggleTitle: 'Filtrar modelos',
      toggleHint: 'Ciudad y estado simulado',
      legend: 'Filtrar el catálogo sintético',
      help: 'Los filtros solo reorganizan las seis identidades ficticias de la beta.',
      cityLabel: 'Ciudad simulada',
      allCities: 'Todas',
      availabilityLabel: 'Estado simulado',
      allAvailabilities: 'Todos',
      availability: {
        available: 'Disponible',
        limited: 'Limitada',
        'on-request': 'Bajo consulta',
        unavailable: 'No disponible',
      },
      apply: 'Aplicar filtros',
      reset: 'Restablecer',
      invalidTitle: 'Los filtros de la beta no son válidos.',
      invalidBody:
        'No se cargó ningún archivo. Restablece la selección para continuar.',
      resetAfterError: 'Restablecer filtros',
    },
    profilesSection: {
      eyebrow: 'Seis identidades adultas ficticias',
      title: 'Modelos sintéticas por zona',
      note:
        'Todas las imágenes fueron generadas con IA para esta beta. No representan personas reales ni disponibilidad comercial.',
      countOne: '{count} perfil ficticio',
      countOther: '{count} perfiles ficticios',
      selectionEyebrow: 'Selección ficticia',
      zoneTitle: 'Modelos {city}',
      emptyTitle: 'Sin perfiles para esta selección.',
      exploreZone: 'Explorar {city}',
      cardDisclosure: 'Perfil ficticio generado con IA',
      cardDisclosureShort: 'Imagen IA',
      ageYears: '{age} años',
      statusPrefix: 'Estado:',
      viewProfile: 'Ver perfil',
      viewProfileAria: 'Ver el perfil sintético de {name}',
    },
    homeServices: [
      {
        number: '01',
        category: 'company',
        title: 'Acompañamiento premium',
        detail: 'Propuesta pendiente de validación comercial y legal.',
      },
      {
        number: '02',
        category: 'settings',
        title: 'Salidas a domicilios',
        detail: 'Categoría visual simulada; cobertura y condiciones no confirmadas.',
      },
      {
        number: '03',
        category: 'settings',
        title: 'Hoteles',
        detail: 'Categoría visual simulada; disponibilidad real aún no publicada.',
      },
      {
        number: '04',
        category: 'couples',
        title: 'Eventos y ocasiones especiales',
        detail: 'Concepto sujeto a definición y aprobación del cliente.',
      },
      {
        number: '05',
        category: 'wellbeing',
        title: 'Viajes y desplazamientos',
        detail: 'Alcance ilustrativo sin promesa operativa ni territorial.',
      },
      {
        number: '06',
        category: 'roleplay',
        title: 'Atención personalizada',
        detail: 'Experiencia propuesta; los canales permanecen desactivados.',
      },
    ],
    servicesSection: {
      eyebrow: 'Servicios exclusivos · propuesta',
      title: 'Una arquitectura preparada para crecer',
      body:
        'Estas categorías forman parte del diseño solicitado. Sus condiciones, alcance y disponibilidad requieren aprobación antes de activarse.',
      exploreRoutes: 'Explorar rutas',
      conversionEyebrow: 'Conversión protegida',
      conversionTitle: 'Contacto y reserva permanecen desactivados',
      conversionBody:
        'No hay destino externo, formulario, pago ni mensajería en esta beta.',
      contactDisabled: 'Contactar · no disponible',
    },
    security: {
      eyebrow: 'Controles activos',
      title: 'Beta visual no indexable',
      items: [
        'Las seis identidades son ficticias y están señalizadas como IA.',
        'Los recursos originales permanecen fuera de rutas públicas directas.',
        'No hay enlaces de contacto, reservas, pagos ni indexación.',
        'La cobertura, los servicios y los textos continúan sujetos a confirmación.',
      ],
    },
    footer: {
      tagline: 'Beta sintética no indexable · sin canales externos',
      home: 'Inicio',
      profiles: 'Perfiles',
      services: 'Servicios',
      backToTop: 'Volver arriba',
      reviewStatus: 'Revisión humana, comercial y legal pendiente',
    },
    profile: {
      statusBanner: 'BETA SINTÉTICA · IDENTIDAD FICTICIA',
      breadcrumbAria: 'Migas de pan',
      breadcrumbProfiles: 'Perfiles sintéticos',
      galleryAria: 'Galería sintética de {name}',
      selectPhotoAria: 'Seleccionar fotografía',
      showPhotoAria: 'Mostrar {label} de {name}',
      coverLabel: 'Retrato de portada',
      sceneLabel: 'Escena editorial {number}',
      imageGenerated: 'IMAGEN GENERADA CON IA',
      ageYears: '{age} años',
      syntheticNotice: 'Perfil ficticio generado con IA',
      identityLabel: 'Identidad',
      identityValue: 'Completamente ficticia',
      visualStatusLabel: 'Estado visual',
      visualOriginLabel: 'Origen visual',
      visualOriginValue: 'Generación sintética con IA',
      publicationLabel: 'Publicación',
      publicationValue: 'Beta no indexable',
      conceptTitle: 'Concepto de la maqueta',
      contactDisabledTitle: 'Contacto y reserva desactivados',
      contactDisabledBody:
        'Esta ficha solo demuestra navegación y presentación. No envía datos ni abre canales externos.',
      contactDisabledButton: 'Contactar · no disponible en la beta',
      backToProfiles: 'Volver a todos los perfiles',
      footerTagline: 'Beta sintética no indexable · sin canales externos',
      footerCatalog: 'Ver catálogo',
      footerStatus: 'Revisión humana y legal pendiente',
      availability: {
        available: 'Disponible · simulación',
        limited: 'Disponibilidad limitada · simulación',
        'on-request': 'Bajo consulta · simulación',
        unavailable: 'No disponible · simulación',
      },
    },
    profiles: {
      valeria: {
        displayName: 'Valeria',
        biography:
          'Concepto editorial ficticio de elegancia mediterránea, creado para validar la presentación visual del perfil en Madrid.',
        conceptTags: ['Elegancia mediterránea', 'Ambiente boutique', 'Estilo sereno'],
      },
      sofia: {
        displayName: 'Sofía',
        biography:
          'Concepto editorial ficticio de presencia sofisticada y tranquila, creado para comprobar el perfil visual de Barcelona.',
        conceptTags: ['Presencia sofisticada', 'Estética contemporánea', 'Estilo sereno'],
      },
      lucia: {
        displayName: 'Lucía',
        biography:
          'Concepto editorial ficticio de carácter independiente y natural, preparado para probar una ficha con presencia en dos ciudades.',
        conceptTags: ['Carácter independiente', 'Estética nocturna', 'Cobertura dual simulada'],
      },
      julia: {
        displayName: 'Julia',
        biography:
          'Concepto editorial ficticio de imagen refinada y madura, utilizado para revisar el estado de consulta previa en Girona.',
        conceptTags: ['Imagen refinada', 'Inspiración Girona', 'Consulta simulada'],
      },
      mia: {
        displayName: 'Mia',
        biography:
          'Concepto editorial ficticio de estética minimalista y cálida, creado para validar una segunda identidad visual en Barcelona.',
        conceptTags: ['Estética minimalista', 'Ambiente cálido', 'Estilo contemporáneo'],
      },
      alicia: {
        displayName: 'Alicia',
        biography:
          'Concepto editorial ficticio de estilo elegante y contemporáneo, incorporado para comprobar la variedad visual del catálogo de Madrid.',
        conceptTags: ['Estilo elegante', 'Retrato contemporáneo', 'Disponibilidad simulada'],
      },
    },
  },
  en: {
    locale: 'en',
    languageName: 'English',
    metadata: {
      homeTitle: 'Synthetic visual beta',
      homeDescription:
        'Non-indexable visual beta with fictional adult identities generated with AI to validate design, navigation and content.',
      profileTitle: '{name} · Synthetic profile',
      profileDescription:
        'Beta profile for {name}, a completely fictional adult identity generated with AI.',
    },
    brand: {
      name: 'PecadosVip',
      tagline: 'Discretion · Exclusivity · Pleasure',
    },
    navigation: {
      primaryAria: 'Main beta navigation',
      mobileAria: 'Mobile beta navigation',
      footerAria: 'Internal footer links',
      languageAria: 'Select language',
      skipLink: 'Skip to main content',
      home: 'Home',
      madrid: 'Madrid',
      barcelona: 'Barcelona',
      profiles: 'VIP models',
      services: 'Services',
      outings: 'Outings',
      about: 'About us',
      contact: 'Contact',
      controls: 'Controls',
      zones: 'Areas',
      privateBooking: 'Private booking',
      privateBookingAria: 'Booking is disabled in this visual beta',
      privateBookingTitle: 'Booking is not available yet',
      betaStatus: 'Beta',
    },
    hero: {
      eyebrow: 'Discretion · Exclusivity · Pleasure',
      titlePrimary: 'The luxury of choosing',
      titleSecondary: 'at home or in a hotel',
      location: 'Madrid and Barcelona',
      kicker: 'Our premium services',
      note: 'Non-indexable visual beta; services and availability remain unconfirmed.',
      madridCta: 'View Madrid models',
      barcelonaCta: 'View Barcelona models',
      generatedImageDisclosure:
        'AI-generated image · fictional adult identity',
    },
    trustSignals: [
      {
        code: '01',
        title: 'Controlled discretion',
        detail: 'Non-indexable beta with no active external channels.',
      },
      {
        code: '02',
        title: 'Selected synthetic models',
        detail: 'Six fictional adult identities, clearly labelled as AI-generated.',
      },
      {
        code: '03',
        title: 'Outings and hotels · proposal',
        detail: 'Madrid, Barcelona and illustrative coverage pending confirmation.',
      },
      {
        code: '04',
        title: 'Contact disabled',
        detail: 'No messages, bookings or payments are sent.',
      },
    ],
    coverage: {
      eyebrow: 'Madrid · Barcelona',
      title: 'Two clear areas to choose from',
      body:
        'These references help validate the architecture and design. No city is presented as confirmed commercial coverage.',
      mediaDisclosure:
        'AI-generated reference images · coverage not confirmed',
      zoneSelectorAria: 'Choose a beta area',
      zoneLabel: 'Area {number}',
      zoneOnly: 'Show {city} only',
      destinationsTitle: 'Destinations in this area',
      pendingStatus: 'Status · pending',
    },
    cities: {
      madrid: 'Madrid',
      barcelona: 'Barcelona',
      girona: 'Girona',
      tarragona: 'Tarragona',
      toledo: 'Toledo',
      guadalajara: 'Guadalajara',
      segovia: 'Segovia',
      sitges: 'Sitges',
    },
    filters: {
      toggleTitle: 'Filter models',
      toggleHint: 'Simulated city and status',
      legend: 'Filter the synthetic catalogue',
      help: 'The filters only reorganise the six fictional identities in the beta.',
      cityLabel: 'Simulated city',
      allCities: 'All',
      availabilityLabel: 'Simulated status',
      allAvailabilities: 'All',
      availability: {
        available: 'Available',
        limited: 'Limited',
        'on-request': 'On request',
        unavailable: 'Unavailable',
      },
      apply: 'Apply filters',
      reset: 'Reset',
      invalidTitle: 'The beta filters are invalid.',
      invalidBody: 'No files were loaded. Reset the selection to continue.',
      resetAfterError: 'Reset filters',
    },
    profilesSection: {
      eyebrow: 'Six fictional adult identities',
      title: 'Synthetic models by area',
      note:
        'All images were generated with AI for this beta. They do not represent real people or commercial availability.',
      countOne: '{count} fictional profile',
      countOther: '{count} fictional profiles',
      selectionEyebrow: 'Fictional selection',
      zoneTitle: '{city} models',
      emptyTitle: 'No profiles match this selection.',
      exploreZone: 'Explore {city}',
      cardDisclosure: 'Fictional profile generated with AI',
      cardDisclosureShort: 'AI image',
      ageYears: '{age} years old',
      statusPrefix: 'Status:',
      viewProfile: 'View profile',
      viewProfileAria: 'View the synthetic profile for {name}',
    },
    homeServices: [
      {
        number: '01',
        category: 'company',
        title: 'Premium companionship',
        detail: 'Proposal pending commercial and legal validation.',
      },
      {
        number: '02',
        category: 'settings',
        title: 'Home visits',
        detail: 'Simulated visual category; coverage and conditions are unconfirmed.',
      },
      {
        number: '03',
        category: 'settings',
        title: 'Hotels',
        detail: 'Simulated visual category; real availability has not been published.',
      },
      {
        number: '04',
        category: 'couples',
        title: 'Events and special occasions',
        detail: 'Concept subject to definition and client approval.',
      },
      {
        number: '05',
        category: 'wellbeing',
        title: 'Travel and transfers',
        detail: 'Illustrative scope with no operational or territorial promise.',
      },
      {
        number: '06',
        category: 'roleplay',
        title: 'Personalised attention',
        detail: 'Proposed experience; all channels remain disabled.',
      },
    ],
    servicesSection: {
      eyebrow: 'Exclusive services · proposal',
      title: 'An architecture designed to grow',
      body:
        'These categories are part of the requested design. Their conditions, scope and availability require approval before activation.',
      exploreRoutes: 'Explore routes',
      conversionEyebrow: 'Protected conversion',
      conversionTitle: 'Contact and booking remain disabled',
      conversionBody:
        'This beta has no external destination, form, payment or messaging.',
      contactDisabled: 'Contact · unavailable',
    },
    security: {
      eyebrow: 'Active controls',
      title: 'Non-indexable visual beta',
      items: [
        'All six identities are fictional and clearly labelled as AI-generated.',
        'Original assets remain outside directly accessible public routes.',
        'There are no contact links, bookings, payments or indexing.',
        'Coverage, services and copy remain subject to confirmation.',
      ],
    },
    footer: {
      tagline: 'Non-indexable synthetic beta · no external channels',
      home: 'Home',
      profiles: 'Profiles',
      services: 'Services',
      backToTop: 'Back to top',
      reviewStatus: 'Human, commercial and legal review pending',
    },
    profile: {
      statusBanner: 'SYNTHETIC BETA · FICTIONAL IDENTITY',
      breadcrumbAria: 'Breadcrumb',
      breadcrumbProfiles: 'Synthetic profiles',
      galleryAria: 'Synthetic gallery for {name}',
      selectPhotoAria: 'Select photograph',
      showPhotoAria: 'Show {label} for {name}',
      coverLabel: 'Cover portrait',
      sceneLabel: 'Editorial scene {number}',
      imageGenerated: 'AI-GENERATED IMAGE',
      ageYears: '{age} years old',
      syntheticNotice: 'Fictional profile generated with AI',
      identityLabel: 'Identity',
      identityValue: 'Completely fictional',
      visualStatusLabel: 'Visual status',
      visualOriginLabel: 'Visual origin',
      visualOriginValue: 'Synthetic generation with AI',
      publicationLabel: 'Publication',
      publicationValue: 'Non-indexable beta',
      conceptTitle: 'Prototype concept',
      contactDisabledTitle: 'Contact and booking are disabled',
      contactDisabledBody:
        'This profile only demonstrates navigation and presentation. It does not send data or open external channels.',
      contactDisabledButton: 'Contact · unavailable in the beta',
      backToProfiles: 'Back to all profiles',
      footerTagline: 'Non-indexable synthetic beta · no external channels',
      footerCatalog: 'View catalogue',
      footerStatus: 'Human and legal review pending',
      availability: {
        available: 'Available · simulation',
        limited: 'Limited availability · simulation',
        'on-request': 'On request · simulation',
        unavailable: 'Unavailable · simulation',
      },
    },
    profiles: {
      valeria: {
        displayName: 'Valeria',
        biography:
          'A fictional editorial concept inspired by Mediterranean elegance, created to validate the visual presentation of a Madrid profile.',
        conceptTags: ['Mediterranean elegance', 'Boutique setting', 'Serene style'],
      },
      sofia: {
        displayName: 'Sofía',
        biography:
          'A fictional editorial concept with a sophisticated, calm presence, created to test the visual profile for Barcelona.',
        conceptTags: ['Sophisticated presence', 'Contemporary aesthetic', 'Serene style'],
      },
      lucia: {
        displayName: 'Lucía',
        biography:
          'A fictional editorial concept with an independent, natural character, prepared to test a profile appearing in two cities.',
        conceptTags: ['Independent character', 'Night-time aesthetic', 'Simulated dual coverage'],
      },
      julia: {
        displayName: 'Julia',
        biography:
          'A fictional editorial concept with a refined, mature image, used to review the prior-enquiry status for Girona.',
        conceptTags: ['Refined image', 'Girona inspiration', 'Simulated enquiry'],
      },
      mia: {
        displayName: 'Mia',
        biography:
          'A fictional editorial concept with a warm, minimalist aesthetic, created to validate a second visual identity for Barcelona.',
        conceptTags: ['Minimalist aesthetic', 'Warm setting', 'Contemporary style'],
      },
      alicia: {
        displayName: 'Alicia',
        biography:
          'A fictional editorial concept with an elegant, contemporary style, added to test the visual variety of the Madrid catalogue.',
        conceptTags: ['Elegant style', 'Contemporary portrait', 'Simulated availability'],
      },
    },
  },
  fr: {
    locale: 'fr',
    languageName: 'Français',
    metadata: {
      homeTitle: 'Bêta visuelle synthétique',
      homeDescription:
        'Bêta visuelle non indexable avec des identités adultes fictives générées par IA pour valider le design, la navigation et le contenu.',
      profileTitle: '{name} · Profil synthétique',
      profileDescription:
        'Fiche bêta de {name}, une identité adulte entièrement fictive générée par IA.',
    },
    brand: {
      name: 'PecadosVip',
      tagline: 'Discrétion · Exclusivité · Plaisir',
    },
    navigation: {
      primaryAria: 'Navigation principale de la bêta',
      mobileAria: 'Navigation mobile de la bêta',
      footerAria: 'Liens internes du pied de page',
      languageAria: 'Sélectionner la langue',
      skipLink: 'Aller au contenu principal',
      home: 'Accueil',
      madrid: 'Madrid',
      barcelona: 'Barcelona',
      profiles: 'Modèles VIP',
      services: 'Services',
      outings: 'Sorties',
      about: 'À propos',
      contact: 'Contact',
      controls: 'Contrôles',
      zones: 'Zones',
      privateBooking: 'Réservation privée',
      privateBookingAria: 'La réservation est désactivée dans cette bêta visuelle',
      privateBookingTitle: 'La réservation n’est pas encore disponible',
      betaStatus: 'Bêta',
    },
    hero: {
      eyebrow: 'Discrétion · Exclusivité · Plaisir',
      titlePrimary: 'Le luxe de choisir',
      titleSecondary: 'chez vous ou à l’hôtel',
      location: 'Madrid et Barcelona',
      kicker: 'Nos services premium',
      note: 'Bêta visuelle non indexable ; services et disponibilité à confirmer.',
      madridCta: 'Voir les modèles de Madrid',
      barcelonaCta: 'Voir les modèles de Barcelona',
      generatedImageDisclosure:
        'Image générée par IA · identité adulte fictive',
    },
    trustSignals: [
      {
        code: '01',
        title: 'Discrétion maîtrisée',
        detail: 'Bêta non indexable, sans canaux externes actifs.',
      },
      {
        code: '02',
        title: 'Modèles synthétiques sélectionnés',
        detail: 'Six identités adultes fictives, clairement signalées comme générées par IA.',
      },
      {
        code: '03',
        title: 'Sorties et hôtels · proposition',
        detail: 'Madrid, Barcelona et couverture illustrative à confirmer.',
      },
      {
        code: '04',
        title: 'Contact désactivé',
        detail: 'Aucun message, aucune réservation et aucun paiement ne sont envoyés.',
      },
    ],
    coverage: {
      eyebrow: 'Madrid · Barcelona',
      title: 'Deux zones pour choisir en toute clarté',
      body:
        'Ces références permettent de valider l’architecture et le design. Aucune ville n’est présentée comme une couverture commerciale confirmée.',
      mediaDisclosure:
        'Images de référence générées par IA · couverture non confirmée',
      zoneSelectorAria: 'Choisir une zone de la bêta',
      zoneLabel: 'Zone {number}',
      zoneOnly: 'Voir uniquement {city}',
      destinationsTitle: 'Destinations de la zone',
      pendingStatus: 'Statut · en attente',
    },
    cities: {
      madrid: 'Madrid',
      barcelona: 'Barcelona',
      girona: 'Girona',
      tarragona: 'Tarragona',
      toledo: 'Toledo',
      guadalajara: 'Guadalajara',
      segovia: 'Segovia',
      sitges: 'Sitges',
    },
    filters: {
      toggleTitle: 'Filtrer les modèles',
      toggleHint: 'Ville et statut simulés',
      legend: 'Filtrer le catalogue synthétique',
      help: 'Les filtres réorganisent uniquement les six identités fictives de la bêta.',
      cityLabel: 'Ville simulée',
      allCities: 'Toutes',
      availabilityLabel: 'Statut simulé',
      allAvailabilities: 'Tous',
      availability: {
        available: 'Disponible',
        limited: 'Limitée',
        'on-request': 'Sur demande',
        unavailable: 'Indisponible',
      },
      apply: 'Appliquer les filtres',
      reset: 'Réinitialiser',
      invalidTitle: 'Les filtres de la bêta ne sont pas valides.',
      invalidBody:
        'Aucun fichier n’a été chargé. Réinitialisez la sélection pour continuer.',
      resetAfterError: 'Réinitialiser les filtres',
    },
    profilesSection: {
      eyebrow: 'Six identités adultes fictives',
      title: 'Modèles synthétiques par zone',
      note:
        'Toutes les images ont été générées par IA pour cette bêta. Elles ne représentent ni des personnes réelles ni une disponibilité commerciale.',
      countOne: '{count} profil fictif',
      countOther: '{count} profils fictifs',
      selectionEyebrow: 'Sélection fictive',
      zoneTitle: 'Modèles de {city}',
      emptyTitle: 'Aucun profil ne correspond à cette sélection.',
      exploreZone: 'Explorer {city}',
      cardDisclosure: 'Profil fictif généré par IA',
      cardDisclosureShort: 'Image IA',
      ageYears: '{age} ans',
      statusPrefix: 'Statut :',
      viewProfile: 'Voir le profil',
      viewProfileAria: 'Voir le profil synthétique de {name}',
    },
    homeServices: [
      {
        number: '01',
        category: 'company',
        title: 'Accompagnement premium',
        detail: 'Proposition en attente de validation commerciale et juridique.',
      },
      {
        number: '02',
        category: 'settings',
        title: 'Déplacements à domicile',
        detail: 'Catégorie visuelle simulée ; couverture et conditions non confirmées.',
      },
      {
        number: '03',
        category: 'settings',
        title: 'Hôtels',
        detail: 'Catégorie visuelle simulée ; disponibilité réelle non publiée.',
      },
      {
        number: '04',
        category: 'couples',
        title: 'Événements et occasions spéciales',
        detail: 'Concept soumis à définition et à l’approbation du client.',
      },
      {
        number: '05',
        category: 'wellbeing',
        title: 'Voyages et déplacements',
        detail: 'Périmètre illustratif sans promesse opérationnelle ni territoriale.',
      },
      {
        number: '06',
        category: 'roleplay',
        title: 'Attention personnalisée',
        detail: 'Expérience proposée ; tous les canaux restent désactivés.',
      },
    ],
    servicesSection: {
      eyebrow: 'Services exclusifs · proposition',
      title: 'Une architecture conçue pour évoluer',
      body:
        'Ces catégories font partie du design demandé. Leurs conditions, leur périmètre et leur disponibilité doivent être approuvés avant toute activation.',
      exploreRoutes: 'Explorer les parcours',
      conversionEyebrow: 'Conversion protégée',
      conversionTitle: 'Le contact et la réservation restent désactivés',
      conversionBody:
        'Cette bêta ne comporte aucune destination externe, aucun formulaire, aucun paiement et aucune messagerie.',
      contactDisabled: 'Contacter · indisponible',
    },
    security: {
      eyebrow: 'Contrôles actifs',
      title: 'Bêta visuelle non indexable',
      items: [
        'Les six identités sont fictives et clairement signalées comme générées par IA.',
        'Les ressources originales restent hors des routes publiques directement accessibles.',
        'Il n’existe aucun lien de contact, réservation, paiement ou indexation.',
        'La couverture, les services et les textes restent soumis à confirmation.',
      ],
    },
    footer: {
      tagline: 'Bêta synthétique non indexable · sans canaux externes',
      home: 'Accueil',
      profiles: 'Profils',
      services: 'Services',
      backToTop: 'Retour en haut',
      reviewStatus: 'Révision humaine, commerciale et juridique en attente',
    },
    profile: {
      statusBanner: 'BÊTA SYNTHÉTIQUE · IDENTITÉ FICTIVE',
      breadcrumbAria: 'Fil d’Ariane',
      breadcrumbProfiles: 'Profils synthétiques',
      galleryAria: 'Galerie synthétique de {name}',
      selectPhotoAria: 'Sélectionner une photographie',
      showPhotoAria: 'Afficher {label} de {name}',
      coverLabel: 'Portrait de couverture',
      sceneLabel: 'Scène éditoriale {number}',
      imageGenerated: 'IMAGE GÉNÉRÉE PAR IA',
      ageYears: '{age} ans',
      syntheticNotice: 'Profil fictif généré par IA',
      identityLabel: 'Identité',
      identityValue: 'Entièrement fictive',
      visualStatusLabel: 'Statut visuel',
      visualOriginLabel: 'Origine visuelle',
      visualOriginValue: 'Génération synthétique par IA',
      publicationLabel: 'Publication',
      publicationValue: 'Bêta non indexable',
      conceptTitle: 'Concept de la maquette',
      contactDisabledTitle: 'Le contact et la réservation sont désactivés',
      contactDisabledBody:
        'Cette fiche sert uniquement à démontrer la navigation et la présentation. Elle n’envoie aucune donnée et n’ouvre aucun canal externe.',
      contactDisabledButton: 'Contacter · indisponible dans la bêta',
      backToProfiles: 'Retour à tous les profils',
      footerTagline: 'Bêta synthétique non indexable · sans canaux externes',
      footerCatalog: 'Voir le catalogue',
      footerStatus: 'Révision humaine et juridique en attente',
      availability: {
        available: 'Disponible · simulation',
        limited: 'Disponibilité limitée · simulation',
        'on-request': 'Sur demande · simulation',
        unavailable: 'Indisponible · simulation',
      },
    },
    profiles: {
      valeria: {
        displayName: 'Valeria',
        biography:
          'Concept éditorial fictif inspiré par l’élégance méditerranéenne, créé pour valider la présentation visuelle d’un profil à Madrid.',
        conceptTags: ['Élégance méditerranéenne', 'Ambiance boutique', 'Style serein'],
      },
      sofia: {
        displayName: 'Sofía',
        biography:
          'Concept éditorial fictif à la présence sophistiquée et sereine, créé pour tester le profil visuel de Barcelona.',
        conceptTags: ['Présence sophistiquée', 'Esthétique contemporaine', 'Style serein'],
      },
      lucia: {
        displayName: 'Lucía',
        biography:
          'Concept éditorial fictif au caractère indépendant et naturel, préparé pour tester une fiche présente dans deux villes.',
        conceptTags: ['Caractère indépendant', 'Esthétique nocturne', 'Double couverture simulée'],
      },
      julia: {
        displayName: 'Julia',
        biography:
          'Concept éditorial fictif à l’image raffinée et mature, utilisé pour vérifier le statut de demande préalable à Girona.',
        conceptTags: ['Image raffinée', 'Inspiration Girona', 'Demande simulée'],
      },
      mia: {
        displayName: 'Mia',
        biography:
          'Concept éditorial fictif à l’esthétique minimaliste et chaleureuse, créé pour valider une deuxième identité visuelle à Barcelona.',
        conceptTags: ['Esthétique minimaliste', 'Ambiance chaleureuse', 'Style contemporain'],
      },
      alicia: {
        displayName: 'Alicia',
        biography:
          'Concept éditorial fictif au style élégant et contemporain, ajouté pour tester la diversité visuelle du catalogue de Madrid.',
        conceptTags: ['Style élégant', 'Portrait contemporain', 'Disponibilité simulée'],
      },
    },
  },
  it: {
    locale: 'it',
    languageName: 'Italiano',
    metadata: {
      homeTitle: 'Beta visiva sintetica',
      homeDescription:
        'Beta visiva non indicizzabile con identità adulte fittizie generate con IA per convalidare design, navigazione e contenuti.',
      profileTitle: '{name} · Profilo sintetico',
      profileDescription:
        'Scheda beta di {name}, un’identità adulta completamente fittizia generata con IA.',
    },
    brand: {
      name: 'PecadosVip',
      tagline: 'Discrezione · Esclusività · Piacere',
    },
    navigation: {
      primaryAria: 'Navigazione principale della beta',
      mobileAria: 'Navigazione mobile della beta',
      footerAria: 'Link interni del piè di pagina',
      languageAria: 'Seleziona la lingua',
      skipLink: 'Vai al contenuto principale',
      home: 'Home',
      madrid: 'Madrid',
      barcelona: 'Barcelona',
      profiles: 'Modelle VIP',
      services: 'Servizi',
      outings: 'Uscite',
      about: 'Chi siamo',
      contact: 'Contatti',
      controls: 'Controlli',
      zones: 'Zone',
      privateBooking: 'Prenotazione privata',
      privateBookingAria: 'La prenotazione è disattivata in questa beta visiva',
      privateBookingTitle: 'La prenotazione non è ancora disponibile',
      betaStatus: 'Beta',
    },
    hero: {
      eyebrow: 'Discrezione · Esclusività · Piacere',
      titlePrimary: 'Il lusso di scegliere',
      titleSecondary: 'a casa tua o in hotel',
      location: 'Madrid e Barcelona',
      kicker: 'I nostri servizi premium',
      note: 'Beta visiva non indicizzabile; servizi e disponibilità da confermare.',
      madridCta: 'Vedi le modelle di Madrid',
      barcelonaCta: 'Vedi le modelle di Barcelona',
      generatedImageDisclosure:
        'Immagine generata con IA · identità adulta fittizia',
    },
    trustSignals: [
      {
        code: '01',
        title: 'Discrezione controllata',
        detail: 'Beta non indicizzabile, senza canali esterni attivi.',
      },
      {
        code: '02',
        title: 'Modelle sintetiche selezionate',
        detail: 'Sei identità adulte fittizie, chiaramente indicate come generate con IA.',
      },
      {
        code: '03',
        title: 'Uscite e hotel · proposta',
        detail: 'Madrid, Barcelona e copertura illustrativa da confermare.',
      },
      {
        code: '04',
        title: 'Contatto disattivato',
        detail: 'Non vengono inviati messaggi, prenotazioni o pagamenti.',
      },
    ],
    coverage: {
      eyebrow: 'Madrid · Barcelona',
      title: 'Due zone per scegliere con chiarezza',
      body:
        'Questi riferimenti consentono di convalidare l’architettura e il design. Nessuna città viene presentata come copertura commerciale confermata.',
      mediaDisclosure:
        'Immagini di riferimento generate con IA · copertura non confermata',
      zoneSelectorAria: 'Scegli una zona della beta',
      zoneLabel: 'Zona {number}',
      zoneOnly: 'Mostra solo {city}',
      destinationsTitle: 'Destinazioni della zona',
      pendingStatus: 'Stato · in attesa',
    },
    cities: {
      madrid: 'Madrid',
      barcelona: 'Barcelona',
      girona: 'Girona',
      tarragona: 'Tarragona',
      toledo: 'Toledo',
      guadalajara: 'Guadalajara',
      segovia: 'Segovia',
      sitges: 'Sitges',
    },
    filters: {
      toggleTitle: 'Filtra le modelle',
      toggleHint: 'Città e stato simulati',
      legend: 'Filtra il catalogo sintetico',
      help: 'I filtri riorganizzano soltanto le sei identità fittizie della beta.',
      cityLabel: 'Città simulata',
      allCities: 'Tutte',
      availabilityLabel: 'Stato simulato',
      allAvailabilities: 'Tutti',
      availability: {
        available: 'Disponibile',
        limited: 'Limitata',
        'on-request': 'Su richiesta',
        unavailable: 'Non disponibile',
      },
      apply: 'Applica filtri',
      reset: 'Reimposta',
      invalidTitle: 'I filtri della beta non sono validi.',
      invalidBody:
        'Non è stato caricato alcun file. Reimposta la selezione per continuare.',
      resetAfterError: 'Reimposta filtri',
    },
    profilesSection: {
      eyebrow: 'Sei identità adulte fittizie',
      title: 'Modelle sintetiche per zona',
      note:
        'Tutte le immagini sono state generate con IA per questa beta. Non rappresentano persone reali né disponibilità commerciale.',
      countOne: '{count} profilo fittizio',
      countOther: '{count} profili fittizi',
      selectionEyebrow: 'Selezione fittizia',
      zoneTitle: 'Modelle di {city}',
      emptyTitle: 'Nessun profilo corrisponde a questa selezione.',
      exploreZone: 'Esplora {city}',
      cardDisclosure: 'Profilo fittizio generato con IA',
      cardDisclosureShort: 'Immagine IA',
      ageYears: '{age} anni',
      statusPrefix: 'Stato:',
      viewProfile: 'Vedi profilo',
      viewProfileAria: 'Vedi il profilo sintetico di {name}',
    },
    homeServices: [
      {
        number: '01',
        category: 'company',
        title: 'Accompagnamento premium',
        detail: 'Proposta in attesa di convalida commerciale e legale.',
      },
      {
        number: '02',
        category: 'settings',
        title: 'Uscite a domicilio',
        detail: 'Categoria visiva simulata; copertura e condizioni non confermate.',
      },
      {
        number: '03',
        category: 'settings',
        title: 'Hotel',
        detail: 'Categoria visiva simulata; disponibilità reale non ancora pubblicata.',
      },
      {
        number: '04',
        category: 'couples',
        title: 'Eventi e occasioni speciali',
        detail: 'Concetto soggetto a definizione e approvazione del cliente.',
      },
      {
        number: '05',
        category: 'wellbeing',
        title: 'Viaggi e trasferimenti',
        detail: 'Ambito illustrativo senza promesse operative o territoriali.',
      },
      {
        number: '06',
        category: 'roleplay',
        title: 'Attenzione personalizzata',
        detail: 'Esperienza proposta; tutti i canali restano disattivati.',
      },
    ],
    servicesSection: {
      eyebrow: 'Servizi esclusivi · proposta',
      title: 'Un’architettura progettata per crescere',
      body:
        'Queste categorie fanno parte del design richiesto. Condizioni, ambito e disponibilità richiedono approvazione prima dell’attivazione.',
      exploreRoutes: 'Esplora i percorsi',
      conversionEyebrow: 'Conversione protetta',
      conversionTitle: 'Contatto e prenotazione restano disattivati',
      conversionBody:
        'Questa beta non contiene destinazioni esterne, moduli, pagamenti o messaggistica.',
      contactDisabled: 'Contatta · non disponibile',
    },
    security: {
      eyebrow: 'Controlli attivi',
      title: 'Beta visiva non indicizzabile',
      items: [
        'Tutte e sei le identità sono fittizie e chiaramente indicate come generate con IA.',
        'Le risorse originali restano fuori dalle rotte pubbliche direttamente accessibili.',
        'Non sono presenti link di contatto, prenotazioni, pagamenti o indicizzazione.',
        'Copertura, servizi e testi restano soggetti a conferma.',
      ],
    },
    footer: {
      tagline: 'Beta sintetica non indicizzabile · senza canali esterni',
      home: 'Home',
      profiles: 'Profili',
      services: 'Servizi',
      backToTop: 'Torna su',
      reviewStatus: 'Revisione umana, commerciale e legale in attesa',
    },
    profile: {
      statusBanner: 'BETA SINTETICA · IDENTITÀ FITTIZIA',
      breadcrumbAria: 'Percorso di navigazione',
      breadcrumbProfiles: 'Profili sintetici',
      galleryAria: 'Galleria sintetica di {name}',
      selectPhotoAria: 'Seleziona fotografia',
      showPhotoAria: 'Mostra {label} di {name}',
      coverLabel: 'Ritratto di copertina',
      sceneLabel: 'Scena editoriale {number}',
      imageGenerated: 'IMMAGINE GENERATA CON IA',
      ageYears: '{age} anni',
      syntheticNotice: 'Profilo fittizio generato con IA',
      identityLabel: 'Identità',
      identityValue: 'Completamente fittizia',
      visualStatusLabel: 'Stato visivo',
      visualOriginLabel: 'Origine visiva',
      visualOriginValue: 'Generazione sintetica con IA',
      publicationLabel: 'Pubblicazione',
      publicationValue: 'Beta non indicizzabile',
      conceptTitle: 'Concetto della maquette',
      contactDisabledTitle: 'Contatto e prenotazione sono disattivati',
      contactDisabledBody:
        'Questa scheda dimostra soltanto navigazione e presentazione. Non invia dati né apre canali esterni.',
      contactDisabledButton: 'Contatta · non disponibile nella beta',
      backToProfiles: 'Torna a tutti i profili',
      footerTagline: 'Beta sintetica non indicizzabile · senza canali esterni',
      footerCatalog: 'Vedi catalogo',
      footerStatus: 'Revisione umana e legale in attesa',
      availability: {
        available: 'Disponibile · simulazione',
        limited: 'Disponibilità limitata · simulazione',
        'on-request': 'Su richiesta · simulazione',
        unavailable: 'Non disponibile · simulazione',
      },
    },
    profiles: {
      valeria: {
        displayName: 'Valeria',
        biography:
          'Concetto editoriale fittizio ispirato all’eleganza mediterranea, creato per convalidare la presentazione visiva di un profilo a Madrid.',
        conceptTags: ['Eleganza mediterranea', 'Atmosfera boutique', 'Stile sereno'],
      },
      sofia: {
        displayName: 'Sofía',
        biography:
          'Concetto editoriale fittizio dalla presenza sofisticata e tranquilla, creato per verificare il profilo visivo di Barcelona.',
        conceptTags: ['Presenza sofisticata', 'Estetica contemporanea', 'Stile sereno'],
      },
      lucia: {
        displayName: 'Lucía',
        biography:
          'Concetto editoriale fittizio dal carattere indipendente e naturale, preparato per testare una scheda presente in due città.',
        conceptTags: ['Carattere indipendente', 'Estetica notturna', 'Doppia copertura simulata'],
      },
      julia: {
        displayName: 'Julia',
        biography:
          'Concetto editoriale fittizio dall’immagine raffinata e matura, utilizzato per verificare lo stato di richiesta preventiva a Girona.',
        conceptTags: ['Immagine raffinata', 'Ispirazione Girona', 'Richiesta simulata'],
      },
      mia: {
        displayName: 'Mia',
        biography:
          'Concetto editoriale fittizio dall’estetica minimalista e calda, creato per convalidare una seconda identità visiva a Barcelona.',
        conceptTags: ['Estetica minimalista', 'Atmosfera calda', 'Stile contemporaneo'],
      },
      alicia: {
        displayName: 'Alicia',
        biography:
          'Concetto editoriale fittizio dallo stile elegante e contemporaneo, aggiunto per verificare la varietà visiva del catalogo di Madrid.',
        conceptTags: ['Stile elegante', 'Ritratto contemporaneo', 'Disponibilità simulata'],
      },
    },
  },
} as const satisfies Readonly<Record<Locale, SyntheticBetaCopy>>;

export function getSyntheticBetaCopy(locale: Locale): SyntheticBetaCopy {
  return copy[locale];
}
