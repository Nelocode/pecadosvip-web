import type { Locale } from '../i18n/locales.ts';
import type { SyntheticServiceMediaKey } from './synthetic-service-media.ts';

export const syntheticServiceGroups = [
  'company',
  'settings',
  'couples',
  'wellbeing',
  'roleplay',
  'private-preferences',
] as const;

export type SyntheticServiceGroup = (typeof syntheticServiceGroups)[number];

type LocalizedName = Readonly<Record<Locale, string>>;

type SyntheticServiceDefinition = {
  slug: string;
  group: SyntheticServiceGroup;
  name: LocalizedName;
  mediaKey: SyntheticServiceMediaKey;
  profileSlug: 'valeria' | 'sofia' | 'lucia' | 'julia' | 'mia' | 'alicia';
  mediaRole: 'cover' | 'gallery-01' | 'gallery-02' | 'gallery-03';
};

export type SyntheticServiceCard = Omit<SyntheticServiceDefinition, 'name'> & {
  name: string;
  groupLabel: string;
  teaser: string;
};

type GroupCopy = {
  label: string;
  teaser: string;
  overview: string;
  safeguards: readonly string[];
};

export type SyntheticServiceMessages = {
  languageName: string;
  navigation: {
    home: string;
    profiles: string;
    services: string;
    coverage: string;
    controls: string;
    menu: string;
    close: string;
    privateBooking: string;
    previewLabel: string;
    primaryAria: string;
    languageAria: string;
    mobileAria: string;
    footerAria: string;
    breadcrumbAria: string;
    skipLink: string;
  };
  media: {
    aiShort: string;
    generatedBadge: string;
    fictionalBadge: string;
    generatedAlt: string;
  };
  hub: {
    eyebrow: string;
    title: string;
    lead: string;
    breadcrumb: string;
    introExperienceTitle: string;
    introExperienceBody: string;
    introSafetyTitle: string;
    introSafetyBody: string;
    catalogEyebrow: string;
    catalogTitle: string;
    catalogLead: string;
    filterLegend: string;
    filterLabel: string;
    allGroups: string;
    applyFilter: string;
    resetFilter: string;
    searchLabel: string;
    searchPlaceholder: string;
    sortLabel: string;
    sortEditorial: string;
    sortName: string;
    clearFilters: string;
    noResultsTitle: string;
    noResultsBody: string;
    selectionTitle: string;
    selectionBody: string;
    selectionPrivacy: string;
    addToSelection: string;
    removeFromSelection: string;
    clearSelection: string;
    selectionLimit: string;
    selectionEmpty: string;
    resultSingular: string;
    resultPlural: string;
    editorialEyebrow: string;
    editorialTitle: string;
    editorialBody: string;
    ratesEyebrow: string;
    ratesTitle: string;
    ratesBody: string;
    ratesCta: string;
    independenceTitle: string;
    independenceBody: string;
    coverageEyebrow: string;
    coverageTitle: string;
    coverageBody: string;
    faqEyebrow: string;
    faqTitle: string;
    directoryTitle: string;
    openService: string;
    pendingStatus: string;
  };
  detail: {
    breadcrumb: string;
    previewEyebrow: string;
    overviewTitle: string;
    processTitle: string;
    processSteps: readonly string[];
    safeguardsTitle: string;
    relatedTitle: string;
    profilesTitle: string;
    profilesBody: string;
    disabledTitle: string;
    disabledBody: string;
    disabledButton: string;
    backToServices: string;
  };
  notice: {
    label: string;
    body: string;
    accept: string;
    restore: string;
  };
  footer: {
    tagline: string;
    status: string;
    top: string;
  };
  faqs: readonly { question: string; answer: string }[];
  groups: Readonly<Record<SyntheticServiceGroup, GroupCopy>>;
};

const names = (
  es: string,
  en: string,
  fr: string,
  it: string,
): LocalizedName => ({ es, en, fr, it });

const serviceDefinitions: readonly SyntheticServiceDefinition[] = [
  { slug: 'compania-privada', group: 'company', name: names('Compañía privada', 'Private companionship', 'Accompagnement privé', 'Compagnia privata'), mediaKey: 'company-private-lounge', profileSlug: 'valeria', mediaRole: 'cover' },
  { slug: 'preferencia-intima-personalizada', group: 'private-preferences', name: names('Preferencia íntima personalizada', 'Personalised intimate preference', 'Préférence intime personnalisée', 'Preferenza intima personalizzata'), mediaKey: 'preferences-silk-envelope', profileSlug: 'sofia', mediaRole: 'gallery-01' },
  { slug: 'besos-y-cercania', group: 'wellbeing', name: names('Besos y cercanía', 'Kisses and closeness', 'Baisers et proximité', 'Baci e vicinanza'), mediaKey: 'wellbeing-spa-ritual', profileSlug: 'lucia', mediaRole: 'gallery-02' },
  { slug: 'celebraciones-privadas', group: 'settings', name: names('Celebraciones privadas', 'Private celebrations', 'Célébrations privées', 'Celebrazioni private'), mediaKey: 'settings-private-celebration', profileSlug: 'julia', mediaRole: 'gallery-03' },
  { slug: 'ambientacion-tematica', group: 'roleplay', name: names('Ambientación temática', 'Themed styling', 'Mise en scène thématique', 'Ambientazione a tema'), mediaKey: 'roleplay-theatre-mask', profileSlug: 'mia', mediaRole: 'cover' },
  { slug: 'ritual-de-ducha', group: 'wellbeing', name: names('Ritual de ducha', 'Shower ritual', 'Rituel de douche', 'Rituale doccia'), mediaKey: 'wellbeing-water-ritual', profileSlug: 'alicia', mediaRole: 'gallery-01' },
  { slug: 'experiencia-a-duo', group: 'couples', name: names('Experiencia a dúo', 'Duo experience', 'Expérience en duo', 'Esperienza in coppia'), mediaKey: 'couples-two-settings', profileSlug: 'valeria', mediaRole: 'gallery-02' },
  { slug: 'atencion-a-domicilio', group: 'settings', name: names('Atención a domicilio', 'At-home visit', 'Visite à domicile', 'Visita a domicilio'), mediaKey: 'settings-home-arrival', profileSlug: 'sofia', mediaRole: 'gallery-03' },
  { slug: 'encuentro-privado-de-grupo', group: 'couples', name: names('Encuentro privado de grupo', 'Private group experience', 'Rencontre privée en groupe', 'Incontro privato di gruppo'), mediaKey: 'couples-private-gathering', profileSlug: 'lucia', mediaRole: 'cover' },
  { slug: 'acompanamiento-para-mujeres', group: 'company', name: names('Acompañamiento para mujeres', 'Companionship for women', 'Accompagnement pour femmes', 'Compagnia per donne'), mediaKey: 'company-women-companionship', profileSlug: 'julia', mediaRole: 'gallery-01' },
  { slug: 'atencion-en-hotel', group: 'settings', name: names('Atención en hotel', 'Hotel visit', 'Visite à l’hôtel', 'Visita in hotel'), mediaKey: 'settings-hotel-arrival', profileSlug: 'mia', mediaRole: 'gallery-02' },
  { slug: 'juego-de-rol-sumiso', group: 'roleplay', name: names('Juego de rol sumiso', 'Submissive roleplay', 'Jeu de rôle soumis', 'Gioco di ruolo sottomesso'), mediaKey: 'roleplay-consent-accessories', profileSlug: 'alicia', mediaRole: 'gallery-03' },
  { slug: 'acompanamiento-para-parejas', group: 'couples', name: names('Acompañamiento para parejas', 'Companionship for couples', 'Accompagnement pour couples', 'Compagnia per coppie'), mediaKey: 'couples-partner-companionship', profileSlug: 'valeria', mediaRole: 'cover' },
  { slug: 'preferencia-intima-acordada', group: 'private-preferences', name: names('Preferencia íntima acordada', 'Agreed intimate preference', 'Préférence intime convenue', 'Preferenza intima concordata'), mediaKey: 'preferences-agreed-intimacy', profileSlug: 'sofia', mediaRole: 'gallery-01' },
  { slug: 'preferencia-oral-final-acordado', group: 'private-preferences', name: names('Preferencia oral con final acordado', 'Oral preference with agreed ending', 'Préférence orale avec fin convenue', 'Preferenza orale con finale concordato'), mediaKey: 'preferences-choice-boxes', profileSlug: 'lucia', mediaRole: 'gallery-02' },
  { slug: 'fantasias-personalizadas', group: 'roleplay', name: names('Fantasías personalizadas', 'Personalised fantasies', 'Fantasmes personnalisés', 'Fantasie personalizzate'), mediaKey: 'roleplay-personal-fantasy', profileSlug: 'julia', mediaRole: 'gallery-03' },
  { slug: 'fetiches-acordados', group: 'roleplay', name: names('Fetiches acordados', 'Agreed fetishes', 'Fétiches convenus', 'Feticci concordati'), mediaKey: 'roleplay-agreed-fetish', profileSlug: 'mia', mediaRole: 'cover' },
  { slug: 'experiencia-oral-completa', group: 'private-preferences', name: names('Experiencia oral completa', 'Complete oral experience', 'Expérience orale complète', 'Esperienza orale completa'), mediaKey: 'preferences-oral-complete', profileSlug: 'alicia', mediaRole: 'gallery-01' },
  { slug: 'experiencia-oral-natural', group: 'private-preferences', name: names('Experiencia oral natural', 'Natural oral experience', 'Expérience orale naturelle', 'Esperienza orale naturale'), mediaKey: 'preferences-oral-natural', profileSlug: 'valeria', mediaRole: 'gallery-02' },
  { slug: 'preferencia-oral-intensa', group: 'private-preferences', name: names('Preferencia oral intensa', 'Intense oral preference', 'Préférence orale intense', 'Preferenza orale intensa'), mediaKey: 'preferences-oral-intense', profileSlug: 'sofia', mediaRole: 'gallery-03' },
  { slug: 'experiencia-parejas-abiertas', group: 'couples', name: names('Experiencia para parejas abiertas', 'Open-couple experience', 'Expérience pour couples ouverts', 'Esperienza per coppie aperte'), mediaKey: 'couples-open-pair', profileSlug: 'lucia', mediaRole: 'cover' },
  { slug: 'juegos-para-adultos', group: 'roleplay', name: names('Juegos para adultos', 'Adult games', 'Jeux pour adultes', 'Giochi per adulti'), mediaKey: 'roleplay-adult-games', profileSlug: 'julia', mediaRole: 'gallery-01' },
  { slug: 'kamasutra-y-conexion', group: 'wellbeing', name: names('Kamasutra y conexión', 'Kamasutra and connection', 'Kamasutra et connexion', 'Kamasutra e connessione'), mediaKey: 'wellbeing-kamasutra-connection', profileSlug: 'mia', mediaRole: 'gallery-02' },
  { slug: 'juego-acuatico-consensuado', group: 'private-preferences', name: names('Juego acuático consensuado', 'Consensual water play', 'Jeu aquatique consenti', 'Gioco acquatico consensuale'), mediaKey: 'preferences-water-play', profileSlug: 'alicia', mediaRole: 'gallery-03' },
  { slug: 'masaje-sensual', group: 'wellbeing', name: names('Masaje sensual', 'Sensual massage', 'Massage sensuel', 'Massaggio sensuale'), mediaKey: 'wellbeing-sensual-massage', profileSlug: 'valeria', mediaRole: 'cover' },
  { slug: 'experiencia-editorial-pse', group: 'roleplay', name: names('Experiencia editorial PSE', 'Editorial PSE experience', 'Expérience éditoriale PSE', 'Esperienza editoriale PSE'), mediaKey: 'roleplay-editorial-pse', profileSlug: 'sofia', mediaRole: 'gallery-01' },
  { slug: 'sado-consensuado', group: 'roleplay', name: names('Sado erótico consensuado', 'Consensual erotic S/M', 'Sado érotique consenti', 'Sado erotico consensuale'), mediaKey: 'roleplay-consensual-sm', profileSlug: 'lucia', mediaRole: 'gallery-02' },
  { slug: 'intimidad-oral', group: 'private-preferences', name: names('Intimidad oral', 'Oral intimacy', 'Intimité orale', 'Intimità orale'), mediaKey: 'preferences-oral-intimacy', profileSlug: 'julia', mediaRole: 'gallery-03' },
  { slug: 'juguetes-para-adultos', group: 'roleplay', name: names('Juguetes para adultos', 'Adult toys', 'Jouets pour adultes', 'Accessori per adulti'), mediaKey: 'roleplay-adult-accessories', profileSlug: 'mia', mediaRole: 'cover' },
  { slug: 'striptease-privado', group: 'roleplay', name: names('Striptease privado', 'Private striptease', 'Strip-tease privé', 'Spogliarello privato'), mediaKey: 'roleplay-private-striptease', profileSlug: 'alicia', mediaRole: 'gallery-01' },
  { slug: 'experiencia-gfe', group: 'company', name: names('Experiencia GFE', 'GFE experience', 'Expérience GFE', 'Esperienza GFE'), mediaKey: 'company-gfe-experience', profileSlug: 'valeria', mediaRole: 'gallery-02' },
  { slug: 'trio-privado', group: 'couples', name: names('Trío privado', 'Private trio', 'Trio privé', 'Trio privato'), mediaKey: 'couples-private-trio', profileSlug: 'sofia', mediaRole: 'gallery-03' },
  { slug: 'experiencia-entre-mujeres', group: 'couples', name: names('Experiencia entre mujeres', 'Experience between women', 'Expérience entre femmes', 'Esperienza tra donne'), mediaKey: 'couples-women-experience', profileSlug: 'lucia', mediaRole: 'cover' },
  { slug: 'juego-control-consensuado', group: 'private-preferences', name: names('Juego de control consensuado', 'Consensual control play', 'Jeu de contrôle consenti', 'Gioco di controllo consensuale'), mediaKey: 'preferences-control-play', profileSlug: 'julia', mediaRole: 'gallery-01' },
] as const;

const copy: Readonly<Record<Locale, SyntheticServiceMessages>> = {
  es: {
    languageName: 'Español',
    navigation: { home: 'Inicio', profiles: 'Perfiles', services: 'Servicios', coverage: 'Cobertura', controls: 'Controles', menu: 'Menú', close: 'Cerrar', privateBooking: 'Reserva desactivada', previewLabel: 'Vista previa local', primaryAria: 'Navegación principal', languageAria: 'Idioma', mobileAria: 'Navegación móvil', footerAria: 'Navegación del pie', breadcrumbAria: 'Ruta de navegación', skipLink: 'Saltar al contenido principal' },
    media: { aiShort: 'IA', generatedBadge: 'IMAGEN SIMBÓLICA GENERADA CON IA', fictionalBadge: 'IDENTIDAD FICTICIA · IA', generatedAlt: 'Retrato editorial de una identidad adulta ficticia generada con IA' },
    hub: {
      eyebrow: 'Servicios exclusivos · maqueta local', title: 'Experiencias pensadas alrededor de tus límites', lead: 'Explora una arquitectura editorial completa para servicios privados. Cada ficha es una propuesta sintética, no una oferta comercial activa.', breadcrumb: 'Inicio / Servicios',
      introExperienceTitle: 'Una experiencia que empieza antes del encuentro', introExperienceBody: 'El diseño reúne contexto, preferencias, escenario y acompañamiento para que cada opción sea fácil de entender y comparar.',
      introSafetyTitle: 'Consentimiento, discreción y claridad', introSafetyBody: 'Nada se presume: los límites, la identidad adulta, la cobertura y la disponibilidad deberán confirmarse antes de activar cualquier canal.',
      catalogEyebrow: 'Catálogo editorial', catalogTitle: '34 rutas de servicio preparadas', catalogLead: 'Organizadas por intención para que la navegación siga siendo clara incluso con un catálogo amplio.', filterLegend: 'Explorar servicios', filterLabel: 'Tipo de experiencia', allGroups: 'Todas', applyFilter: 'Aplicar filtro', resetFilter: 'Restablecer', searchLabel: 'Buscar en el catálogo', searchPlaceholder: 'Nombre, intención o ambiente', sortLabel: 'Ordenar', sortEditorial: 'Orden editorial', sortName: 'Nombre A–Z', clearFilters: 'Limpiar búsqueda y filtros', noResultsTitle: 'No encontramos coincidencias', noResultsBody: 'Prueba otra palabra o vuelve a mostrar todas las categorías.', selectionTitle: 'Selección temporal', selectionBody: 'Reúne hasta tres fichas para revisarlas durante esta visita.', selectionPrivacy: 'No se guarda ni se envía.', addToSelection: 'Añadir a la selección', removeFromSelection: 'Quitar de la selección', clearSelection: 'Vaciar selección', selectionLimit: 'Puedes seleccionar un máximo de tres servicios.', selectionEmpty: 'Aún no has añadido ninguna ficha.', resultSingular: 'servicio', resultPlural: 'servicios',
      editorialEyebrow: 'Atención personalizada', editorialTitle: 'Tu ritmo define la experiencia', editorialBody: 'La propuesta visual prioriza información útil, conversación previa y límites explícitos. El contenido final dependerá de aprobación comercial, lingüística y legal.',
      ratesEyebrow: 'Tarifas y condiciones', ratesTitle: 'Sin precios inventados ni promesas prematuras', ratesBody: 'Duración, desplazamiento, suplementos y medios de pago permanecerán ocultos hasta contar con una tabla aprobada y verificable.', ratesCta: 'Tarifas pendientes',
      independenceTitle: 'Colaboración independiente', independenceBody: 'La futura publicación deberá explicar con precisión la relación entre la plataforma y cada profesional, junto con obligaciones, derechos y canales de reclamación.',
      coverageEyebrow: 'Cobertura propuesta', coverageTitle: 'Madrid, Barcelona y destinos en evaluación', coverageBody: 'La maqueta permite explorar ciudades, pero no presenta ninguna zona como activa sin confirmación operativa.',
      faqEyebrow: 'Preguntas frecuentes', faqTitle: 'Lo esencial antes de continuar', directoryTitle: 'Directorio completo de servicios', openService: 'Ver detalle', pendingStatus: 'ESTADO · PENDIENTE',
    },
    detail: { breadcrumb: 'Servicios', previewEyebrow: 'Ficha editorial sintética', overviewTitle: 'Qué representa esta ruta', processTitle: 'Cómo funcionaría', processSteps: ['Consultar la ficha y sus límites.', 'Confirmar de forma privada identidad adulta, cobertura y disponibilidad.', 'Acordar condiciones únicamente por un canal aprobado.'], safeguardsTitle: 'Límites y controles', relatedTitle: 'También puedes explorar', profilesTitle: 'Perfiles sintéticos relacionados', profilesBody: 'Las identidades mostradas son ficticias y solo sirven para validar navegación y composición.', disabledTitle: 'Contacto y reserva desactivados', disabledBody: 'Esta maqueta no envía datos, no abre mensajería y no procesa pagos.', disabledButton: 'No disponible en preview', backToServices: 'Volver a todos los servicios' },
    notice: { label: 'Preview local · solo adultos', body: 'Contenido sintético no publicable; no hay reservas, pagos ni canales externos activos.', accept: 'Entendido', restore: 'Mostrar aviso' },
    footer: { tagline: 'Arquitectura de servicios en validación.', status: 'Revisión humana, comercial, lingüística y legal pendiente.', top: 'Volver arriba' },
    faqs: [
      { question: '¿Estos servicios están disponibles ahora?', answer: 'No. Son rutas de una maqueta local y permanecen cerradas hasta completar las aprobaciones.' },
      { question: '¿Las personas de las imágenes son reales?', answer: 'No. Todas las identidades de esta demostración fueron generadas con IA y están identificadas como ficticias.' },
      { question: '¿Puedo reservar desde esta página?', answer: 'No. Los controles de contacto, reserva y pago están deliberadamente desactivados.' },
      { question: '¿La cobertura está confirmada?', answer: 'No. Las ciudades se muestran para validar la experiencia de navegación, no como promesa comercial.' },
    ],
    groups: {
      company: { label: 'Compañía', teaser: 'Presencia, conversación y acompañamiento en un contexto privado.', overview: 'Una categoría editorial centrada en compañía, atención y experiencia compartida, siempre bajo acuerdos claros.', safeguards: ['Identidad adulta verificada', 'Expectativas acordadas previamente', 'Privacidad por defecto'] },
      settings: { label: 'Escenarios', teaser: 'Opciones pensadas para domicilios, hoteles y celebraciones privadas.', overview: 'Agrupa escenarios de desplazamiento o celebración que requieren validar lugar, acceso, tiempos y cobertura.', safeguards: ['Zona y acceso confirmados', 'Sin direcciones públicas inventadas', 'Desplazamiento sujeto a aprobación'] },
      couples: { label: 'Parejas y grupos', teaser: 'Experiencias compartidas sujetas a consentimiento explícito de todas las personas.', overview: 'Organiza propuestas para parejas o grupos con atención especial a consentimiento, límites y participación voluntaria.', safeguards: ['Consentimiento individual', 'Límites de cada participante', 'Sin cambios no acordados'] },
      wellbeing: { label: 'Bienestar', teaser: 'Rituales de cercanía, pausa y conexión en un ambiente cuidado.', overview: 'Una familia orientada a la conexión y el bienestar, descrita sin asumir prácticas, tiempos ni resultados.', safeguards: ['Ritmo acordado', 'Higiene y cuidado', 'Pausa disponible en todo momento'] },
      roleplay: { label: 'Fantasía y rol', teaser: 'Temáticas y juegos de rol definidos de antemano y sin improvisar límites.', overview: 'Presenta opciones creativas que requieren conversación previa, palabras de seguridad y alcance explícito.', safeguards: ['Palabra de seguridad', 'Tema y accesorios acordados', 'Consentimiento reversible'] },
      'private-preferences': { label: 'Preferencias privadas', teaser: 'Preferencias íntimas descritas con discreción, precisión y consentimiento.', overview: 'Estas rutas solo organizan preferencias para una conversación privada; nunca garantizan prácticas ni disponibilidad.', safeguards: ['Sin promesas automáticas', 'Consentimiento específico', 'Salud y seguridad primero'] },
    },
  },
  en: {
    languageName: 'English',
    navigation: { home: 'Home', profiles: 'Profiles', services: 'Services', coverage: 'Coverage', controls: 'Controls', menu: 'Menu', close: 'Close', privateBooking: 'Booking disabled', previewLabel: 'Local preview', primaryAria: 'Primary navigation', languageAria: 'Language', mobileAria: 'Mobile navigation', footerAria: 'Footer navigation', breadcrumbAria: 'Breadcrumb', skipLink: 'Skip to main content' },
    media: { aiShort: 'AI', generatedBadge: 'SYMBOLIC IMAGE GENERATED WITH AI', fictionalBadge: 'FICTIONAL IDENTITY · AI', generatedAlt: 'Editorial portrait of a fictional adult identity generated with AI' },
    hub: {
      eyebrow: 'Exclusive services · local prototype', title: 'Experiences designed around your boundaries', lead: 'Explore a complete editorial architecture for private services. Every page is a synthetic proposal, not an active commercial offer.', breadcrumb: 'Home / Services',
      introExperienceTitle: 'The experience starts before the meeting', introExperienceBody: 'The design brings together context, preferences, setting and companionship so each option is easy to understand and compare.',
      introSafetyTitle: 'Consent, discretion and clarity', introSafetyBody: 'Nothing is assumed: boundaries, adult identity, coverage and availability must be confirmed before any channel can be activated.',
      catalogEyebrow: 'Editorial catalogue', catalogTitle: '34 service routes prepared', catalogLead: 'Organised by intent so navigation remains clear even with a broad catalogue.', filterLegend: 'Explore services', filterLabel: 'Experience type', allGroups: 'All', applyFilter: 'Apply filter', resetFilter: 'Reset', searchLabel: 'Search the catalogue', searchPlaceholder: 'Name, intention or setting', sortLabel: 'Sort', sortEditorial: 'Editorial order', sortName: 'Name A–Z', clearFilters: 'Clear search and filters', noResultsTitle: 'No matches found', noResultsBody: 'Try another term or show every category again.', selectionTitle: 'Temporary selection', selectionBody: 'Collect up to three pages to review during this visit.', selectionPrivacy: 'Not saved or sent.', addToSelection: 'Add to selection', removeFromSelection: 'Remove from selection', clearSelection: 'Clear selection', selectionLimit: 'You can select up to three services.', selectionEmpty: 'You have not added any pages yet.', resultSingular: 'service', resultPlural: 'services',
      editorialEyebrow: 'Personal attention', editorialTitle: 'Your pace defines the experience', editorialBody: 'The visual proposal prioritises useful information, prior conversation and explicit boundaries. Final content depends on commercial, linguistic and legal approval.',
      ratesEyebrow: 'Rates and conditions', ratesTitle: 'No invented prices or premature promises', ratesBody: 'Duration, travel, supplements and payment methods remain hidden until an approved, verifiable table is available.', ratesCta: 'Rates pending',
      independenceTitle: 'Independent collaboration', independenceBody: 'A future release must clearly explain the relationship between the platform and each professional, including duties, rights and complaint channels.',
      coverageEyebrow: 'Proposed coverage', coverageTitle: 'Madrid, Barcelona and destinations under review', coverageBody: 'The prototype lets you explore cities but does not present any area as active without operational confirmation.',
      faqEyebrow: 'Frequently asked questions', faqTitle: 'What matters before continuing', directoryTitle: 'Complete services directory', openService: 'View details', pendingStatus: 'STATUS · PENDING',
    },
    detail: { breadcrumb: 'Services', previewEyebrow: 'Synthetic editorial page', overviewTitle: 'What this route represents', processTitle: 'How it would work', processSteps: ['Review the page and its boundaries.', 'Privately confirm adult identity, coverage and availability.', 'Agree conditions only through an approved channel.'], safeguardsTitle: 'Boundaries and controls', relatedTitle: 'You may also explore', profilesTitle: 'Related synthetic profiles', profilesBody: 'The identities shown are fictional and only validate navigation and composition.', disabledTitle: 'Contact and booking disabled', disabledBody: 'This prototype sends no data, opens no messaging and processes no payments.', disabledButton: 'Unavailable in preview', backToServices: 'Back to all services' },
    notice: { label: 'Local preview · adults only', body: 'Synthetic, non-publishable content; no booking, payment or external channels are active.', accept: 'Understood', restore: 'Show notice' },
    footer: { tagline: 'Service architecture under validation.', status: 'Human, commercial, linguistic and legal review pending.', top: 'Back to top' },
    faqs: [
      { question: 'Are these services available now?', answer: 'No. They are local prototype routes and remain closed until all approvals are complete.' },
      { question: 'Are the people in the images real?', answer: 'No. Every identity in this demonstration was generated with AI and is labelled as fictional.' },
      { question: 'Can I book from this page?', answer: 'No. Contact, booking and payment controls are deliberately disabled.' },
      { question: 'Is coverage confirmed?', answer: 'No. Cities are shown to validate navigation, not as a commercial promise.' },
    ],
    groups: {
      company: { label: 'Companionship', teaser: 'Presence, conversation and companionship in a private setting.', overview: 'An editorial category focused on company, attention and shared experience under clear agreements.', safeguards: ['Verified adult identity', 'Expectations agreed in advance', 'Privacy by default'] },
      settings: { label: 'Settings', teaser: 'Options designed for homes, hotels and private celebrations.', overview: 'Groups travel or celebration settings that require location, access, timing and coverage checks.', safeguards: ['Area and access confirmed', 'No invented public addresses', 'Travel subject to approval'] },
      couples: { label: 'Couples and groups', teaser: 'Shared experiences subject to explicit consent from everyone involved.', overview: 'Organises proposals for couples or groups with particular care for consent, boundaries and voluntary participation.', safeguards: ['Individual consent', 'Each participant’s boundaries', 'No unagreed changes'] },
      wellbeing: { label: 'Wellbeing', teaser: 'Rituals of closeness, pause and connection in a considered setting.', overview: 'A family centred on connection and wellbeing without assuming practices, timings or outcomes.', safeguards: ['Agreed pace', 'Hygiene and care', 'Pause available at any time'] },
      roleplay: { label: 'Fantasy and roleplay', teaser: 'Themes and roleplay agreed beforehand without improvising boundaries.', overview: 'Presents creative options that need prior discussion, safe words and an explicit scope.', safeguards: ['Safe word', 'Theme and accessories agreed', 'Reversible consent'] },
      'private-preferences': { label: 'Private preferences', teaser: 'Intimate preferences described with discretion, precision and consent.', overview: 'These routes only organise preferences for a private conversation; they never guarantee practices or availability.', safeguards: ['No automatic promises', 'Specific consent', 'Health and safety first'] },
    },
  },
  fr: {
    languageName: 'Français',
    navigation: { home: 'Accueil', profiles: 'Profils', services: 'Services', coverage: 'Couverture', controls: 'Contrôles', menu: 'Menu', close: 'Fermer', privateBooking: 'Réservation désactivée', previewLabel: 'Aperçu local', primaryAria: 'Navigation principale', languageAria: 'Langue', mobileAria: 'Navigation mobile', footerAria: 'Navigation de pied de page', breadcrumbAria: 'Fil d’Ariane', skipLink: 'Aller au contenu principal' },
    media: { aiShort: 'IA', generatedBadge: 'IMAGE SYMBOLIQUE GÉNÉRÉE PAR IA', fictionalBadge: 'IDENTITÉ FICTIVE · IA', generatedAlt: 'Portrait éditorial d’une identité adulte fictive générée par IA' },
    hub: {
      eyebrow: 'Services exclusifs · maquette locale', title: 'Des expériences pensées autour de vos limites', lead: 'Découvrez une architecture éditoriale complète pour des services privés. Chaque page est une proposition synthétique, pas une offre commerciale active.', breadcrumb: 'Accueil / Services',
      introExperienceTitle: 'L’expérience commence avant la rencontre', introExperienceBody: 'Le design réunit contexte, préférences, cadre et accompagnement pour rendre chaque option facile à comprendre et à comparer.',
      introSafetyTitle: 'Consentement, discrétion et clarté', introSafetyBody: 'Rien n’est présumé : limites, majorité, couverture et disponibilité devront être confirmées avant l’activation de tout canal.',
      catalogEyebrow: 'Catalogue éditorial', catalogTitle: '34 routes de service préparées', catalogLead: 'Classées par intention afin de conserver une navigation claire malgré un catalogue étendu.', filterLegend: 'Explorer les services', filterLabel: 'Type d’expérience', allGroups: 'Tous', applyFilter: 'Appliquer', resetFilter: 'Réinitialiser', searchLabel: 'Rechercher dans le catalogue', searchPlaceholder: 'Nom, intention ou cadre', sortLabel: 'Trier', sortEditorial: 'Ordre éditorial', sortName: 'Nom A–Z', clearFilters: 'Effacer recherche et filtres', noResultsTitle: 'Aucune correspondance', noResultsBody: 'Essayez un autre terme ou affichez à nouveau toutes les catégories.', selectionTitle: 'Sélection temporaire', selectionBody: 'Réunissez jusqu’à trois fiches à consulter pendant cette visite.', selectionPrivacy: 'Ni enregistrée ni envoyée.', addToSelection: 'Ajouter à la sélection', removeFromSelection: 'Retirer de la sélection', clearSelection: 'Vider la sélection', selectionLimit: 'Vous pouvez sélectionner trois services au maximum.', selectionEmpty: 'Vous n’avez encore ajouté aucune fiche.', resultSingular: 'service', resultPlural: 'services',
      editorialEyebrow: 'Attention personnalisée', editorialTitle: 'Votre rythme définit l’expérience', editorialBody: 'La proposition visuelle privilégie l’information utile, l’échange préalable et les limites explicites. Le contenu final dépend d’une validation commerciale, linguistique et juridique.',
      ratesEyebrow: 'Tarifs et conditions', ratesTitle: 'Ni prix inventés ni promesses prématurées', ratesBody: 'Durée, déplacement, suppléments et moyens de paiement restent masqués jusqu’à disposer d’une grille approuvée et vérifiable.', ratesCta: 'Tarifs en attente',
      independenceTitle: 'Collaboration indépendante', independenceBody: 'Une future publication devra expliquer clairement la relation entre la plateforme et chaque professionnelle, ainsi que les obligations, droits et voies de réclamation.',
      coverageEyebrow: 'Couverture proposée', coverageTitle: 'Madrid, Barcelone et destinations à l’étude', coverageBody: 'La maquette permet d’explorer les villes, sans présenter aucune zone comme active sans confirmation opérationnelle.',
      faqEyebrow: 'Questions fréquentes', faqTitle: 'L’essentiel avant de continuer', directoryTitle: 'Répertoire complet des services', openService: 'Voir le détail', pendingStatus: 'STATUT · EN ATTENTE',
    },
    detail: { breadcrumb: 'Services', previewEyebrow: 'Fiche éditoriale synthétique', overviewTitle: 'Ce que représente cette route', processTitle: 'Comment cela fonctionnerait', processSteps: ['Consulter la fiche et ses limites.', 'Confirmer en privé la majorité, la couverture et la disponibilité.', 'Convenir des conditions uniquement via un canal approuvé.'], safeguardsTitle: 'Limites et contrôles', relatedTitle: 'À explorer également', profilesTitle: 'Profils synthétiques associés', profilesBody: 'Les identités affichées sont fictives et servent uniquement à valider la navigation et la composition.', disabledTitle: 'Contact et réservation désactivés', disabledBody: 'Cette maquette n’envoie aucune donnée, n’ouvre aucune messagerie et ne traite aucun paiement.', disabledButton: 'Indisponible en preview', backToServices: 'Retour à tous les services' },
    notice: { label: 'Aperçu local · réservé aux adultes', body: 'Contenu synthétique non publiable ; aucune réservation, paiement ou canal externe actif.', accept: 'Compris', restore: 'Afficher l’avis' },
    footer: { tagline: 'Architecture de services en validation.', status: 'Révision humaine, commerciale, linguistique et juridique en attente.', top: 'Retour en haut' },
    faqs: [
      { question: 'Ces services sont-ils disponibles maintenant ?', answer: 'Non. Ce sont des routes de maquette locale, fermées jusqu’à la fin des validations.' },
      { question: 'Les personnes sur les images sont-elles réelles ?', answer: 'Non. Toutes les identités de cette démonstration sont générées par IA et signalées comme fictives.' },
      { question: 'Puis-je réserver depuis cette page ?', answer: 'Non. Les contrôles de contact, réservation et paiement sont volontairement désactivés.' },
      { question: 'La couverture est-elle confirmée ?', answer: 'Non. Les villes servent à valider la navigation, pas à formuler une promesse commerciale.' },
    ],
    groups: {
      company: { label: 'Accompagnement', teaser: 'Présence, conversation et accompagnement dans un cadre privé.', overview: 'Une catégorie éditoriale centrée sur la compagnie, l’attention et l’expérience partagée, avec des accords clairs.', safeguards: ['Majorité vérifiée', 'Attentes convenues en amont', 'Confidentialité par défaut'] },
      settings: { label: 'Cadres', teaser: 'Options pensées pour domiciles, hôtels et célébrations privées.', overview: 'Réunit des cadres de déplacement ou de célébration qui exigent de vérifier lieu, accès, horaires et couverture.', safeguards: ['Zone et accès confirmés', 'Aucune adresse publique inventée', 'Déplacement soumis à validation'] },
      couples: { label: 'Couples et groupes', teaser: 'Expériences partagées soumises au consentement explicite de chaque personne.', overview: 'Organise des propositions pour couples ou groupes avec une attention particulière au consentement et aux limites.', safeguards: ['Consentement individuel', 'Limites de chaque personne', 'Aucun changement non convenu'] },
      wellbeing: { label: 'Bien-être', teaser: 'Rituels de proximité, de pause et de connexion dans un cadre soigné.', overview: 'Une famille orientée vers la connexion et le bien-être, sans présumer des pratiques, durées ou résultats.', safeguards: ['Rythme convenu', 'Hygiène et soin', 'Pause possible à tout moment'] },
      roleplay: { label: 'Fantasme et jeu de rôle', teaser: 'Thèmes et jeux de rôle définis à l’avance sans improviser les limites.', overview: 'Présente des options créatives qui exigent discussion préalable, mot de sécurité et périmètre explicite.', safeguards: ['Mot de sécurité', 'Thème et accessoires convenus', 'Consentement réversible'] },
      'private-preferences': { label: 'Préférences privées', teaser: 'Préférences intimes décrites avec discrétion, précision et consentement.', overview: 'Ces routes organisent seulement des préférences pour un échange privé ; elles ne garantissent jamais pratiques ni disponibilité.', safeguards: ['Aucune promesse automatique', 'Consentement spécifique', 'Santé et sécurité d’abord'] },
    },
  },
  it: {
    languageName: 'Italiano',
    navigation: { home: 'Home', profiles: 'Profili', services: 'Servizi', coverage: 'Copertura', controls: 'Controlli', menu: 'Menu', close: 'Chiudi', privateBooking: 'Prenotazione disattivata', previewLabel: 'Anteprima locale', primaryAria: 'Navigazione principale', languageAria: 'Lingua', mobileAria: 'Navigazione mobile', footerAria: 'Navigazione del piè di pagina', breadcrumbAria: 'Percorso di navigazione', skipLink: 'Vai al contenuto principale' },
    media: { aiShort: 'IA', generatedBadge: 'IMMAGINE SIMBOLICA GENERATA CON IA', fictionalBadge: 'IDENTITÀ FITTIZIA · IA', generatedAlt: 'Ritratto editoriale di un’identità adulta fittizia generata con IA' },
    hub: {
      eyebrow: 'Servizi esclusivi · prototipo locale', title: 'Esperienze pensate intorno ai tuoi limiti', lead: 'Esplora un’architettura editoriale completa per servizi privati. Ogni pagina è una proposta sintetica, non un’offerta commerciale attiva.', breadcrumb: 'Home / Servizi',
      introExperienceTitle: 'L’esperienza inizia prima dell’incontro', introExperienceBody: 'Il design riunisce contesto, preferenze, ambiente e compagnia per rendere ogni opzione facile da capire e confrontare.',
      introSafetyTitle: 'Consenso, discrezione e chiarezza', introSafetyBody: 'Nulla è presunto: limiti, maggiore età, copertura e disponibilità devono essere confermati prima di attivare qualsiasi canale.',
      catalogEyebrow: 'Catalogo editoriale', catalogTitle: '34 percorsi di servizio preparati', catalogLead: 'Organizzati per intenzione affinché la navigazione resti chiara anche con un catalogo ampio.', filterLegend: 'Esplora i servizi', filterLabel: 'Tipo di esperienza', allGroups: 'Tutti', applyFilter: 'Applica filtro', resetFilter: 'Reimposta', searchLabel: 'Cerca nel catalogo', searchPlaceholder: 'Nome, intenzione o ambiente', sortLabel: 'Ordina', sortEditorial: 'Ordine editoriale', sortName: 'Nome A–Z', clearFilters: 'Cancella ricerca e filtri', noResultsTitle: 'Nessuna corrispondenza', noResultsBody: 'Prova un altro termine o mostra di nuovo tutte le categorie.', selectionTitle: 'Selezione temporanea', selectionBody: 'Raccogli fino a tre schede da rivedere durante questa visita.', selectionPrivacy: 'Non viene salvata né inviata.', addToSelection: 'Aggiungi alla selezione', removeFromSelection: 'Rimuovi dalla selezione', clearSelection: 'Svuota selezione', selectionLimit: 'Puoi selezionare al massimo tre servizi.', selectionEmpty: 'Non hai ancora aggiunto alcuna scheda.', resultSingular: 'servizio', resultPlural: 'servizi',
      editorialEyebrow: 'Attenzione personalizzata', editorialTitle: 'Il tuo ritmo definisce l’esperienza', editorialBody: 'La proposta visiva privilegia informazioni utili, conversazione preliminare e limiti espliciti. Il contenuto finale dipende da approvazione commerciale, linguistica e legale.',
      ratesEyebrow: 'Tariffe e condizioni', ratesTitle: 'Nessun prezzo inventato o promessa prematura', ratesBody: 'Durata, spostamenti, supplementi e metodi di pagamento restano nascosti finché non esiste una tabella approvata e verificabile.', ratesCta: 'Tariffe in attesa',
      independenceTitle: 'Collaborazione indipendente', independenceBody: 'Una futura pubblicazione dovrà spiegare chiaramente il rapporto tra piattaforma e ogni professionista, inclusi obblighi, diritti e canali di reclamo.',
      coverageEyebrow: 'Copertura proposta', coverageTitle: 'Madrid, Barcellona e destinazioni in valutazione', coverageBody: 'Il prototipo consente di esplorare le città, ma non presenta alcuna zona come attiva senza conferma operativa.',
      faqEyebrow: 'Domande frequenti', faqTitle: 'L’essenziale prima di continuare', directoryTitle: 'Elenco completo dei servizi', openService: 'Vedi dettagli', pendingStatus: 'STATO · IN ATTESA',
    },
    detail: { breadcrumb: 'Servizi', previewEyebrow: 'Scheda editoriale sintetica', overviewTitle: 'Cosa rappresenta questo percorso', processTitle: 'Come funzionerebbe', processSteps: ['Consulta la scheda e i suoi limiti.', 'Conferma privatamente maggiore età, copertura e disponibilità.', 'Concorda le condizioni solo tramite un canale approvato.'], safeguardsTitle: 'Limiti e controlli', relatedTitle: 'Puoi esplorare anche', profilesTitle: 'Profili sintetici correlati', profilesBody: 'Le identità mostrate sono fittizie e servono solo a validare navigazione e composizione.', disabledTitle: 'Contatto e prenotazione disattivati', disabledBody: 'Questo prototipo non invia dati, non apre messaggistica e non elabora pagamenti.', disabledButton: 'Non disponibile in preview', backToServices: 'Torna a tutti i servizi' },
    notice: { label: 'Anteprima locale · solo adulti', body: 'Contenuto sintetico non pubblicabile; nessuna prenotazione, pagamento o canale esterno è attivo.', accept: 'Ho capito', restore: 'Mostra avviso' },
    footer: { tagline: 'Architettura dei servizi in validazione.', status: 'Revisione umana, commerciale, linguistica e legale in attesa.', top: 'Torna in alto' },
    faqs: [
      { question: 'Questi servizi sono disponibili ora?', answer: 'No. Sono percorsi del prototipo locale e restano chiusi fino al completamento delle approvazioni.' },
      { question: 'Le persone nelle immagini sono reali?', answer: 'No. Tutte le identità della dimostrazione sono generate con IA e indicate come fittizie.' },
      { question: 'Posso prenotare da questa pagina?', answer: 'No. I controlli di contatto, prenotazione e pagamento sono volutamente disattivati.' },
      { question: 'La copertura è confermata?', answer: 'No. Le città servono a validare la navigazione, non costituiscono una promessa commerciale.' },
    ],
    groups: {
      company: { label: 'Compagnia', teaser: 'Presenza, conversazione e compagnia in un contesto privato.', overview: 'Una categoria editoriale centrata su compagnia, attenzione ed esperienza condivisa, sempre con accordi chiari.', safeguards: ['Maggiore età verificata', 'Aspettative concordate in anticipo', 'Privacy per impostazione predefinita'] },
      settings: { label: 'Ambienti', teaser: 'Opzioni pensate per domicili, hotel e celebrazioni private.', overview: 'Raggruppa contesti di spostamento o celebrazione che richiedono verifica di luogo, accesso, tempi e copertura.', safeguards: ['Zona e accesso confermati', 'Nessun indirizzo pubblico inventato', 'Spostamento soggetto ad approvazione'] },
      couples: { label: 'Coppie e gruppi', teaser: 'Esperienze condivise soggette al consenso esplicito di ogni persona.', overview: 'Organizza proposte per coppie o gruppi con particolare attenzione a consenso, limiti e partecipazione volontaria.', safeguards: ['Consenso individuale', 'Limiti di ogni partecipante', 'Nessuna modifica non concordata'] },
      wellbeing: { label: 'Benessere', teaser: 'Rituali di vicinanza, pausa e connessione in un ambiente curato.', overview: 'Una famiglia orientata a connessione e benessere, senza presumere pratiche, tempi o risultati.', safeguards: ['Ritmo concordato', 'Igiene e cura', 'Pausa disponibile in ogni momento'] },
      roleplay: { label: 'Fantasie e ruolo', teaser: 'Temi e giochi di ruolo definiti in anticipo senza improvvisare i limiti.', overview: 'Presenta opzioni creative che richiedono conversazione preliminare, parola di sicurezza e ambito esplicito.', safeguards: ['Parola di sicurezza', 'Tema e accessori concordati', 'Consenso revocabile'] },
      'private-preferences': { label: 'Preferenze private', teaser: 'Preferenze intime descritte con discrezione, precisione e consenso.', overview: 'Questi percorsi organizzano soltanto preferenze per una conversazione privata; non garantiscono pratiche o disponibilità.', safeguards: ['Nessuna promessa automatica', 'Consenso specifico', 'Salute e sicurezza prima di tutto'] },
    },
  },
};

export function isSyntheticServiceLocale(value: unknown): value is Locale {
  return value === 'es' || value === 'en' || value === 'fr' || value === 'it';
}

export function getSyntheticServiceMessages(locale: Locale): SyntheticServiceMessages {
  return structuredClone(copy[locale]);
}

export function getSyntheticServiceCatalog(locale: Locale): SyntheticServiceCard[] {
  const messages = copy[locale];
  return serviceDefinitions.map((service) => ({
    ...service,
    name: service.name[locale],
    groupLabel: messages.groups[service.group].label,
    teaser: messages.groups[service.group].teaser,
  }));
}

export function getSyntheticService(
  slug: string,
  locale: Locale,
): SyntheticServiceCard | undefined {
  const service = getSyntheticServiceCatalog(locale).find(
    (candidate) => candidate.slug === slug,
  );
  return service ? structuredClone(service) : undefined;
}

export function getRelatedSyntheticServices(
  service: SyntheticServiceCard,
  locale: Locale,
  limit = 4,
): SyntheticServiceCard[] {
  return getSyntheticServiceCatalog(locale)
    .filter(
      (candidate) =>
        candidate.slug !== service.slug && candidate.group === service.group,
    )
    .slice(0, limit);
}

export function isSyntheticServiceGroup(
  value: unknown,
): value is SyntheticServiceGroup {
  return syntheticServiceGroups.includes(value as SyntheticServiceGroup);
}
