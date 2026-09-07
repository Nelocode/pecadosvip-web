import {
  citySlugs,
  type CitySlug as ContentCitySlug,
} from '../lib/content/types.ts';
import type { Locale } from '../lib/i18n/locales';

export const CITY_SLUGS = citySlugs;

export const SUPPLEMENTAL_CITY_SLUGS = [
  'girona',
  'tarragona',
  'toledo',
  'guadalajara',
  'segovia',
] as const;

export type CitySlug = ContentCitySlug;
export type SupplementalCitySlug = (typeof SUPPLEMENTAL_CITY_SLUGS)[number];

export type CityContent = {
  slug: CitySlug;
  coverageStatus: 'under-confirmation';
  city: string;
  regionLabel: string;
  kicker: string;
  headline: string;
  headlineAccent: string;
  lead: string;
  coordinates: [string, string];
  introEyebrow: string;
  introTitle: string;
  introBody: string[];
  areaEyebrow: string;
  areaTitle: string;
  areaIntro: string;
  highlights: Array<{ code: string; name: string; note: string }>;
  locations: string[];
  processTitle: string;
  processIntro: string;
  steps: Array<{ title: string; text: string }>;
  discretionTitle: string;
  discretionText: string;
  faqs: Array<{ question: string; answer: string }>;
  closingTitle: string;
  closingText: string;
};

export const cities: Record<CitySlug, CityContent> = {
  madrid: {
    slug: 'madrid',
    coverageStatus: 'under-confirmation',
    city: 'Madrid',
    regionLabel: 'Madrid · Atención privada',
    kicker: 'La capital, a tu manera',
    headline: 'La ciudad cambia.',
    headlineAccent: 'Tu intimidad, no.',
    lead:
      'Compañía privada con desplazamiento a domicilios y hoteles. Una atención cuidada, puntual y discretamente extraordinaria.',
    coordinates: ['40.4168° N', '3.7038° W'],
    introEyebrow: 'Madrid, sin ruido',
    introTitle: 'Presencia cuando la quieres. Privacidad en cada detalle.',
    introBody: [
      'Madrid pide ritmo, criterio y una logística impecable. Coordinamos cada solicitud de forma individual para ofrecer una experiencia serena desde el primer contacto.',
      'El servicio se realiza exclusivamente con desplazamiento. No contamos con un local abierto al público: acudimos al domicilio u hotel indicado, siempre después de confirmar zona y disponibilidad.',
    ],
    areaEyebrow: 'Cobertura bajo confirmación',
    areaTitle: 'Madrid, distrito a distrito',
    areaIntro:
      'La atención se organiza por demanda, perfil hotelero y facilidad de desplazamiento. Estas son zonas de consulta prioritaria; la disponibilidad exacta se confirma de manera privada.',
    highlights: [
      {
        code: 'M·01',
        name: 'Centro',
        note: 'Hoteles, Gran Vía, Justicia y el corazón nocturno de la capital.',
      },
      {
        code: 'M·02',
        name: 'Barajas',
        note: 'Atención coordinada para hoteles y estancias próximas al aeropuerto.',
      },
      {
        code: 'M·03',
        name: 'Salamanca · Retiro',
        note: 'Entorno residencial y hotelero con especial cuidado por los tiempos.',
      },
      {
        code: 'M·04',
        name: 'Chamberí · Chamartín',
        note: 'Desplazamientos planificados para encuentros tranquilos y reservados.',
      },
    ],
    locations: [
      'Pozuelo de Alarcón',
      'Majadahonda',
      'Las Rozas',
      'Alcobendas',
      'San Sebastián de los Reyes',
      'Alcalá de Henares',
      'Getafe',
      'Leganés',
      'Móstoles',
      'Torrejón de Ardoz',
      'Rivas-Vaciamadrid',
      'Tres Cantos',
    ],
    processTitle: 'Una reserva clara, sin conversaciones de más',
    processIntro:
      'Solo pedimos lo necesario para confirmar el servicio. La información sensible no se publica ni se utiliza fuera de la coordinación.',
    steps: [
      {
        title: 'Indica zona y momento',
        text: 'Comparte el distrito o municipio, la fecha aproximada y si se trata de hotel o domicilio.',
      },
      {
        title: 'Recibe una confirmación privada',
        text: 'Validamos cobertura y disponibilidad antes de proponerte la opción adecuada.',
      },
      {
        title: 'Disfruta de una llegada puntual',
        text: 'Coordinamos el desplazamiento con discreción y sin exponer información innecesaria.',
      },
    ],
    discretionTitle: 'En Madrid, la verdadera exclusividad es no dejar rastro.',
    discretionText:
      'Diseñamos cada interacción para proteger tu tiempo, tu espacio y tu privacidad. Sin local público, sin exposición y sin promesas que no podamos confirmar.',
    faqs: [
      {
        question: '¿El servicio está disponible en todos los distritos de Madrid?',
        answer:
          'La cobertura depende de la zona, el horario y la disponibilidad del momento. Centro, Barajas, Salamanca, Retiro, Chamberí y Chamartín son áreas de consulta prioritaria, pero siempre confirmamos antes de cerrar la reserva.',
      },
      {
        question: '¿Podéis acudir a un hotel próximo al aeropuerto?',
        answer:
          'Sí, se pueden coordinar desplazamientos a hoteles de Barajas y su entorno cuando exista disponibilidad. Recomendamos indicar el hotel y la franja horaria con antelación.',
      },
      {
        question: '¿También atendéis municipios de la Comunidad?',
        answer:
          'Gestionamos solicitudes en municipios seleccionados, como Pozuelo, Majadahonda, Las Rozas, Alcobendas o Alcalá de Henares. La atención nunca se publica como disponible hasta validarla para esa fecha.',
      },
      {
        question: '¿Existe un local de PecadosVip en Madrid?',
        answer:
          'No. El servicio es exclusivamente con desplazamiento a domicilios y hoteles. No presentamos ninguna dirección como punto de atención al público.',
      },
    ],
    closingTitle: 'Madrid no espera. Tu reserva tampoco debería hacerlo.',
    closingText:
      'Cuéntanos únicamente dónde y cuándo. Confirmaremos el resto de forma privada.',
  },
  barcelona: {
    slug: 'barcelona',
    coverageStatus: 'under-confirmation',
    city: 'Barcelona',
    regionLabel: 'Barcelona · Atención privada',
    kicker: 'Del Eixample al Mediterráneo',
    headline: 'La noche fluye.',
    headlineAccent: 'Tu privacidad permanece.',
    lead:
      'Compañía privada con desplazamiento a domicilios y hoteles de Barcelona. Cercanía, elegancia y una coordinación hecha a tu medida.',
    coordinates: ['41.3874° N', '2.1686° E'],
    introEyebrow: 'Barcelona, en privado',
    introTitle: 'Natural en la forma. Impecable en la atención.',
    introBody: [
      'Barcelona combina estancias breves, vida local y escapadas junto al mar. Por eso cada solicitud se coordina según el ritmo real de la ciudad y la distancia de desplazamiento.',
      'Atendemos exclusivamente en domicilios y hoteles, sin local abierto al público. La cobertura se valida antes de confirmar para que la experiencia empiece con claridad.',
    ],
    areaEyebrow: 'Ciudad, litoral y municipios',
    areaTitle: 'De Barcelona al mar, sin perder la discreción',
    areaIntro:
      'Priorizamos áreas con actividad hotelera, turismo y demanda residencial. Las zonas siguientes orientan la consulta; cada desplazamiento queda sujeto a disponibilidad real.',
    highlights: [
      {
        code: 'B·01',
        name: 'Barcelona ciudad',
        note: 'Coordinación ágil para hoteles, apartamentos y domicilios de la ciudad.',
      },
      {
        code: 'B·02',
        name: 'Castelldefels · Sitges',
        note: 'Atención planificada para estancias de costa, ocio y escapadas privadas.',
      },
      {
        code: 'B·03',
        name: 'Sant Cugat · Vallès',
        note: 'Desplazamientos reservados hacia zonas residenciales y empresariales.',
      },
      {
        code: 'B·04',
        name: 'Baix Llobregat',
        note: 'Consultas para Gavà, Viladecans, El Prat, Esplugues y Sant Just.',
      },
    ],
    locations: [
      'Castelldefels',
      'Sitges',
      'Sant Cugat del Vallès',
      'Esplugues de Llobregat',
      'Sant Just Desvern',
      'Gavà',
      'Badalona',
      "L'Hospitalet de Llobregat",
      'Sabadell',
      'Terrassa',
      'Mataró',
      'Vilanova i la Geltrú',
    ],
    processTitle: 'La coordinación correcta hace que todo parezca sencillo',
    processIntro:
      'El mar, el tráfico y las distancias importan. Confirmamos cada detalle antes del desplazamiento para proteger la puntualidad y la privacidad.',
    steps: [
      {
        title: 'Cuéntanos tu ubicación',
        text: 'Indica ciudad o municipio, hotel o domicilio y una franja horaria aproximada.',
      },
      {
        title: 'Validamos el desplazamiento',
        text: 'Comprobamos cobertura real, tiempos de llegada y disponibilidad para tu zona.',
      },
      {
        title: 'Confirmamos de forma reservada',
        text: 'Recibes solo la información necesaria para una experiencia tranquila y puntual.',
      },
    ],
    discretionTitle: 'Barcelona se vive hacia fuera. Lo importante queda dentro.',
    discretionText:
      'La atención premium no necesita exceso: necesita criterio. Cuidamos la conversación, el desplazamiento y la llegada para mantener cada detalle en el ámbito privado.',
    faqs: [
      {
        question: '¿Atendéis tanto en Barcelona ciudad como en municipios cercanos?',
        answer:
          'Sí, se gestionan solicitudes en Barcelona y en municipios seleccionados de la demarcación. La disponibilidad depende de la fecha, el horario y la distancia, por lo que siempre se confirma previamente.',
      },
      {
        question: '¿Se puede solicitar atención en un hotel de Sitges o Castelldefels?',
        answer:
          'Podemos coordinar desplazamientos a hoteles de costa cuando exista cobertura para esa franja. Cuanto antes indiques ubicación y horario, mejor podremos validar el trayecto.',
      },
      {
        question: '¿Cómo se calcula el tiempo de llegada fuera de la ciudad?',
        answer:
          'Antes de confirmar revisamos el municipio, la movilidad del momento y la disponibilidad. No prometemos un tiempo hasta comprobar que el desplazamiento es viable.',
      },
      {
        question: '¿Puedo acudir a un local en Barcelona?',
        answer:
          'No. PecadosVip funciona únicamente con desplazamiento a domicilios y hoteles; no existe un punto de atención abierto al público.',
      },
    ],
    closingTitle: 'Tu Barcelona. Tu momento. Tus reglas.',
    closingText:
      'Comparte zona y horario. Nosotros confirmamos el desplazamiento con la discreción que esperas.',
  },
  girona: {
    slug: 'girona',
    coverageStatus: 'under-confirmation',
    city: 'Girona',
    regionLabel: 'Girona · Cobertura pendiente de confirmación',
    kicker: 'Entre piedra, río y calma',
    headline: 'La ciudad invita.',
    headlineAccent: 'La cobertura aún se confirma.',
    lead:
      'Borrador informativo para posibles desplazamientos a hoteles y domicilios de Girona. Ninguna zona ni disponibilidad está aprobada todavía.',
    coordinates: ['41.9794° N', '2.8214° E'],
    introEyebrow: 'Girona, en evaluación',
    introTitle: 'Un destino singular que exige confirmar cada trayecto.',
    introBody: [
      'El centro histórico, los puentes y los accesos modernos dibujan una ciudad compacta, pero cada desplazamiento necesita una revisión logística propia.',
      'Esta página es un borrador editorial. No anuncia un servicio activo: la atención, la zona y el horario solo podrían comunicarse después de una aprobación expresa.',
    ],
    areaEyebrow: 'Cobertura no aprobada',
    areaTitle: 'Girona, referencias para una futura validación',
    areaIntro:
      'Los sectores siguientes sirven únicamente para estudiar distancias y demanda. Su inclusión no significa que exista cobertura ni que se acepten solicitudes.',
    highlights: [
      {
        code: 'GI·01',
        name: 'Barri Vell · Centre',
        note: 'Referencia urbana para evaluar accesos a hoteles y alojamientos; sin cobertura confirmada.',
      },
      {
        code: 'GI·02',
        name: 'Devesa · Estació',
        note: 'Área de estudio por conectividad ferroviaria y hotelera; pendiente de aprobación.',
      },
    ],
    locations: ['Salt', 'Sarrià de Ter', 'Fornells de la Selva', 'Vilablareix'],
    processTitle: 'Primero se valida Girona; después se habilita cualquier contacto',
    processIntro:
      'Mientras la cobertura siga pendiente, esta ruta solo documenta el alcance que deberá confirmar el operador.',
    steps: [
      {
        title: 'Revisar el área solicitada',
        text: 'Se debe comprobar si la ciudad o el municipio pertenece al alcance operativo aprobado.',
      },
      {
        title: 'Validar logística y horario',
        text: 'Un responsable debe confirmar desplazamiento, disponibilidad y condiciones antes de publicar una opción.',
      },
      {
        title: 'Activar solo con evidencia',
        text: 'La ruta permanecerá informativa y sin promesas hasta registrar la aprobación correspondiente.',
      },
    ],
    discretionTitle: 'En Girona, la prudencia empieza por no prometer cobertura.',
    discretionText:
      'La discreción también implica distinguir una referencia editorial de un servicio real. Esta ciudad continúa bajo confirmación.',
    faqs: [
      {
        question: '¿PecadosVip ya presta servicio en Girona?',
        answer:
          'No se presenta como servicio activo. La cobertura de Girona está pendiente de confirmación operativa, legal y editorial.',
      },
      {
        question: '¿Las zonas y municipios de esta página están disponibles?',
        answer:
          'No. Son referencias para evaluación y no acreditan disponibilidad, tiempos de llegada ni aceptación de solicitudes.',
      },
    ],
    closingTitle: 'Girona sigue bajo confirmación.',
    closingText:
      'La información se mantendrá como borrador hasta que existan cobertura y aprobaciones verificables.',
  },
  tarragona: {
    slug: 'tarragona',
    coverageStatus: 'under-confirmation',
    city: 'Tarragona',
    regionLabel: 'Tarragona · Cobertura pendiente de confirmación',
    kicker: 'Historia frente al Mediterráneo',
    headline: 'El horizonte se abre.',
    headlineAccent: 'La disponibilidad todavía no.',
    lead:
      'Borrador de futura cobertura para hoteles y domicilios de Tarragona. No existe aprobación operativa ni disponibilidad publicada.',
    coordinates: ['41.1189° N', '1.2445° E'],
    introEyebrow: 'Tarragona, por validar',
    introTitle: 'Costa, patrimonio y distancias que deben medirse con precisión.',
    introBody: [
      'La Part Alta, la marina y el corredor hacia municipios turísticos plantean recorridos distintos según la temporada y la hora.',
      'Esta ruta no confirma atención. Solo reúne contenido preliminar para que el operador evalúe un posible alcance antes de publicarlo.',
    ],
    areaEyebrow: 'Cobertura no aprobada',
    areaTitle: 'Tarragona, sectores sujetos a revisión',
    areaIntro:
      'Cada referencia requiere validación individual. Ningún barrio, hotel o municipio se considera atendido por aparecer aquí.',
    highlights: [
      {
        code: 'TA·01',
        name: 'Part Alta · Centre',
        note: 'Zona patrimonial incluida solo para valorar accesos y movilidad; sin aprobación.',
      },
      {
        code: 'TA·02',
        name: 'Marina · Serrallo',
        note: 'Referencia costera y hotelera pendiente de confirmar en cada fase del proyecto.',
      },
    ],
    locations: ['Reus', 'Vila-seca', 'Salou', 'La Canonja'],
    processTitle: 'La temporada no sustituye una confirmación operativa',
    processIntro:
      'Antes de abrir Tarragona deberán revisarse trayectos, responsables, disponibilidad y autorización de contenido.',
    steps: [
      {
        title: 'Delimitar ciudad y costa',
        text: 'El operador debe definir por escrito qué áreas podrían formar parte del alcance.',
      },
      {
        title: 'Comprobar tiempos reales',
        text: 'Se validarán desplazamientos y franjas sin extrapolar disponibilidad entre municipios.',
      },
      {
        title: 'Publicar tras aprobación',
        text: 'Solo una cobertura confirmada y documentada podrá sustituir este borrador.',
      },
    ],
    discretionTitle: 'La mejor expectativa es la que puede cumplirse.',
    discretionText:
      'Por eso Tarragona se mantiene como destino en evaluación, sin afirmaciones de servicio ni disponibilidad.',
    faqs: [
      {
        question: '¿Está activa la cobertura en Tarragona?',
        answer:
          'No. La ciudad figura como propuesta editorial y su cobertura continúa pendiente de confirmación.',
      },
      {
        question: '¿Salou o Reus están incluidos?',
        answer:
          'Solo aparecen como referencias de análisis. No deben interpretarse como municipios atendidos o aprobados.',
      },
    ],
    closingTitle: 'Tarragona necesita una validación propia.',
    closingText:
      'Hasta completarla, esta página no ofrece reservas ni confirma desplazamientos.',
  },
  toledo: {
    slug: 'toledo',
    coverageStatus: 'under-confirmation',
    city: 'Toledo',
    regionLabel: 'Toledo · Cobertura pendiente de confirmación',
    kicker: 'Una ciudad de accesos únicos',
    headline: 'Cada calle cuenta.',
    headlineAccent: 'Cada promesa también.',
    lead:
      'Contenido preliminar para estudiar posibles desplazamientos en Toledo. La ciudad no dispone aún de cobertura aprobada.',
    coordinates: ['39.8628° N', '4.0273° W'],
    introEyebrow: 'Toledo, en estudio',
    introTitle: 'Una topografía especial requiere una logística confirmada.',
    introBody: [
      'El casco histórico, sus accesos y la conexión con la estación plantean condiciones diferentes a las de una gran capital.',
      'Este borrador evita convertir una intención de expansión en una promesa: ninguna solicitud puede considerarse aceptada desde esta página.',
    ],
    areaEyebrow: 'Cobertura no aprobada',
    areaTitle: 'Toledo, puntos de referencia sin disponibilidad anunciada',
    areaIntro:
      'Las áreas se muestran para planificar una futura evaluación. Su mención no equivale a cobertura, autorización o tiempo de llegada.',
    highlights: [
      {
        code: 'TO·01',
        name: 'Casco Histórico',
        note: 'Accesos y alojamientos por estudiar; no existe cobertura confirmada.',
      },
      {
        code: 'TO·02',
        name: 'Estación · Santa Bárbara',
        note: 'Referencia de conectividad sujeta a revisión logística y aprobación.',
      },
    ],
    locations: ['Bargas', 'Olías del Rey', 'Cobisa', 'Argés'],
    processTitle: 'Toledo solo se abrirá cuando la movilidad esté resuelta',
    processIntro:
      'La validación deberá distinguir el casco, los barrios exteriores y cada municipio cercano.',
    steps: [
      {
        title: 'Identificar el acceso',
        text: 'Se revisará la ubicación concreta sin asumir que toda la ciudad tiene las mismas condiciones.',
      },
      {
        title: 'Confirmar el alcance',
        text: 'La futura cobertura deberá estar documentada por zona y responsable operativo.',
      },
      {
        title: 'Mantener el cierre preventivo',
        text: 'Hasta entonces, la ruta seguirá sin canales activos ni afirmaciones comerciales.',
      },
    ],
    discretionTitle: 'En Toledo, avanzar con cautela también es una forma de respeto.',
    discretionText:
      'La página separa la exploración de una futura ciudad de cualquier oferta efectiva.',
    faqs: [
      {
        question: '¿Se puede solicitar atención en Toledo ahora?',
        answer:
          'No desde esta ruta. La cobertura permanece sin aprobar y la página tiene carácter informativo.',
      },
      {
        question: '¿El casco histórico y los municipios cercanos están cubiertos?',
        answer:
          'No se afirma cobertura para ninguno. Todos los puntos mencionados están pendientes de evaluación.',
      },
    ],
    closingTitle: 'Toledo permanece en fase de estudio.',
    closingText:
      'Una futura activación exigirá cobertura real, contenido aprobado y canales verificados.',
  },
  guadalajara: {
    slug: 'guadalajara',
    coverageStatus: 'under-confirmation',
    city: 'Guadalajara',
    regionLabel: 'Guadalajara · Cobertura pendiente de confirmación',
    kicker: 'Puerta del corredor del Henares',
    headline: 'La conexión acerca.',
    headlineAccent: 'La aprobación decide.',
    lead:
      'Borrador de expansión para Guadalajara y su entorno. No representa cobertura activa ni una oferta disponible.',
    coordinates: ['40.6333° N', '3.1669° W'],
    introEyebrow: 'Guadalajara, por confirmar',
    introTitle: 'La proximidad a Madrid no permite asumir el mismo servicio.',
    introBody: [
      'El corredor conecta ciudades y polígonos, pero los tiempos, la demanda y las responsabilidades operativas cambian en cada municipio.',
      'Por ello Guadalajara se documenta como alcance independiente y pendiente, sin heredar promesas de la página de Madrid.',
    ],
    areaEyebrow: 'Cobertura no aprobada',
    areaTitle: 'Guadalajara, una expansión que debe verificarse',
    areaIntro:
      'Estas referencias ayudan a dimensionar la futura operación. No acreditan presencia, disponibilidad ni aceptación de solicitudes.',
    highlights: [
      {
        code: 'GU·01',
        name: 'Centro · Estación',
        note: 'Conectividad urbana por revisar; sin cobertura confirmada.',
      },
      {
        code: 'GU·02',
        name: 'Corredor del Henares',
        note: 'Área amplia que requerirá límites expresos antes de cualquier publicación.',
      },
    ],
    locations: ['Azuqueca de Henares', 'Cabanillas del Campo', 'Marchamalo', 'Yunquera de Henares'],
    processTitle: 'Cercanía geográfica no significa cobertura automática',
    processIntro:
      'Guadalajara necesita responsables, trayectos y disponibilidad propios antes de incorporarse al servicio.',
    steps: [
      {
        title: 'Separar el alcance de Madrid',
        text: 'Se documentará Guadalajara como ciudad independiente, sin extender coberturas por analogía.',
      },
      {
        title: 'Definir municipios válidos',
        text: 'Cada localidad deberá contar con una decisión operativa y editorial verificable.',
      },
      {
        title: 'Habilitar después de aprobar',
        text: 'El contenido seguirá cerrado a solicitudes mientras falte alguna confirmación.',
      },
    ],
    discretionTitle: 'Una expansión responsable empieza por reconocer sus límites.',
    discretionText:
      'Esta ruta hace visible el proyecto de Guadalajara sin presentarlo como una realidad operativa.',
    faqs: [
      {
        question: '¿La cobertura de Madrid incluye Guadalajara?',
        answer:
          'No se debe asumir. Guadalajara requiere una confirmación independiente y todavía no está aprobada.',
      },
      {
        question: '¿Los municipios del corredor están disponibles?',
        answer:
          'No. Los nombres listados son referencias de planificación, no zonas atendidas.',
      },
    ],
    closingTitle: 'Guadalajara no hereda promesas de otra ciudad.',
    closingText:
      'Solo una aprobación específica podrá convertir este borrador en una ruta operativa.',
  },
  segovia: {
    slug: 'segovia',
    coverageStatus: 'under-confirmation',
    city: 'Segovia',
    regionLabel: 'Segovia · Cobertura pendiente de confirmación',
    kicker: 'Patrimonio, sierra y distancias reales',
    headline: 'El destino inspira.',
    headlineAccent: 'La cobertura se demuestra.',
    lead:
      'Página preliminar para evaluar Segovia como futuro destino. No hay servicio, municipios ni horarios aprobados.',
    coordinates: ['40.9429° N', '4.1088° W'],
    introEyebrow: 'Segovia, en evaluación',
    introTitle: 'Un destino de escapada necesita planificación, no suposiciones.',
    introBody: [
      'La llegada por carretera o tren, el recinto histórico y el entorno de la sierra producen escenarios logísticos diferentes.',
      'La ruta permanece como borrador hasta validar capacidad, distancias y requisitos de publicación para la ciudad.',
    ],
    areaEyebrow: 'Cobertura no aprobada',
    areaTitle: 'Segovia, referencias que aún no son cobertura',
    areaIntro:
      'Los puntos siguientes describen el análisis previsto. No confirman desplazamientos ni compromisos de disponibilidad.',
    highlights: [
      {
        code: 'SE·01',
        name: 'Recinto amurallado',
        note: 'Alojamientos y accesos históricos pendientes de evaluación operativa.',
      },
      {
        code: 'SE·02',
        name: 'Guiomar · Nueva Segovia',
        note: 'Conexiones de llegada incluidas como referencia, sin servicio aprobado.',
      },
    ],
    locations: ['La Lastrilla', 'San Cristóbal de Segovia', 'Palazuelos de Eresma', 'Torrecaballeros'],
    processTitle: 'Segovia exige confirmar tanto la llegada como el regreso',
    processIntro:
      'La operación futura deberá sostenerse en tiempos reales y en un alcance expresamente autorizado.',
    steps: [
      {
        title: 'Medir el desplazamiento',
        text: 'Se revisarán accesos, distancia y franja horaria para cada zona propuesta.',
      },
      {
        title: 'Aprobar la capacidad',
        text: 'La ciudad solo podrá abrirse si existe disponibilidad operativa demostrable.',
      },
      {
        title: 'Publicar sin ambigüedades',
        text: 'El borrador se sustituirá por información aprobada, clara y fechada.',
      },
    ],
    discretionTitle: 'La distancia merece información especialmente precisa.',
    discretionText:
      'Segovia se presenta como posibilidad futura, nunca como un servicio ya disponible.',
    faqs: [
      {
        question: '¿PecadosVip ofrece actualmente atención en Segovia?',
        answer:
          'No se anuncia atención activa. La ciudad está pendiente de confirmación operativa y de contenido.',
      },
      {
        question: '¿La estación y los municipios cercanos están incluidos?',
        answer:
          'Solo son referencias para estudiar el alcance. No existe cobertura confirmada para ellos.',
      },
    ],
    closingTitle: 'Segovia seguirá cerrada hasta tener evidencia suficiente.',
    closingText:
      'La expansión futura deberá aprobarse antes de activar cualquier canal o promesa de atención.',
  },
};

type LocalizedSupplementalCopy = Omit<
  CityContent,
  'slug' | 'coverageStatus' | 'city' | 'coordinates' | 'locations'
>;

function localizeSupplementalCity(
  slug: SupplementalCitySlug,
  copy: LocalizedSupplementalCopy,
): CityContent {
  const source = cities[slug];
  return {
    slug,
    coverageStatus: 'under-confirmation',
    city: source.city,
    coordinates: source.coordinates,
    locations: source.locations,
    ...copy,
  };
}

const englishSupplementalCities: Record<
  SupplementalCitySlug,
  CityContent
> = {
  girona: localizeSupplementalCity('girona', {
    regionLabel: 'Girona · Coverage pending confirmation',
    kicker: 'Between stone, river and calm',
    headline: 'The city invites.',
    headlineAccent: 'Coverage is still unconfirmed.',
    lead:
      'Informational draft for possible travel to Girona hotels and homes. No area or availability has been approved yet.',
    introEyebrow: 'Girona, under review',
    introTitle: 'A distinctive destination where every journey must be confirmed.',
    introBody: [
      'The old quarter, bridges and modern access routes form a compact city, but each journey needs its own logistical review.',
      'This is an editorial draft, not an active service announcement. Area, time and service could only be communicated after explicit approval.',
    ],
    areaEyebrow: 'Coverage not approved',
    areaTitle: 'Girona, references for future validation',
    areaIntro:
      'The following sectors are listed only to assess distances and demand. Inclusion does not mean coverage exists or enquiries are accepted.',
    highlights: [
      {
        code: 'GI·01',
        name: 'Barri Vell · Centre',
        note: 'Urban reference for assessing access to hotels and accommodation; coverage is not confirmed.',
      },
      {
        code: 'GI·02',
        name: 'Devesa · Estació',
        note: 'Study area for rail and hotel connections; approval remains pending.',
      },
    ],
    processTitle: 'Validate Girona first; enable contact only afterwards',
    processIntro:
      'While coverage is pending, this route only documents the scope the operator must confirm.',
    steps: [
      {
        title: 'Review the requested area',
        text: 'Check whether the city or municipality belongs to an approved operational scope.',
      },
      {
        title: 'Validate logistics and timing',
        text: 'An owner must confirm travel, availability and conditions before an option is published.',
      },
      {
        title: 'Activate only with evidence',
        text: 'The route remains informational and promise-free until the relevant approval is recorded.',
      },
    ],
    discretionTitle: 'In Girona, caution begins with not promising coverage.',
    discretionText:
      'Discretion also means separating an editorial reference from a real service. This city remains under confirmation.',
    faqs: [
      {
        question: 'Does PecadosVip already operate in Girona?',
        answer:
          'It is not presented as an active service. Girona coverage is pending operational, legal and editorial confirmation.',
      },
      {
        question: 'Are the areas and municipalities on this page available?',
        answer:
          'No. They are planning references and do not prove availability, arrival times or acceptance of enquiries.',
      },
    ],
    closingTitle: 'Girona remains under confirmation.',
    closingText:
      'The information will stay in draft until verifiable coverage and approvals exist.',
  }),
  tarragona: localizeSupplementalCity('tarragona', {
    regionLabel: 'Tarragona · Coverage pending confirmation',
    kicker: 'History facing the Mediterranean',
    headline: 'The horizon opens.',
    headlineAccent: 'Availability does not yet.',
    lead:
      'Draft future coverage for Tarragona hotels and homes. No operational approval or published availability exists.',
    introEyebrow: 'Tarragona, to be validated',
    introTitle: 'Coast, heritage and distances that must be measured precisely.',
    introBody: [
      'Part Alta, the marina and the corridor towards tourist towns create different journeys depending on season and time.',
      'This route does not confirm service. It only gathers preliminary content so the operator can assess a possible scope before publication.',
    ],
    areaEyebrow: 'Coverage not approved',
    areaTitle: 'Tarragona, sectors subject to review',
    areaIntro:
      'Every reference needs individual validation. No district, hotel or municipality is served merely because it appears here.',
    highlights: [
      {
        code: 'TA·01',
        name: 'Part Alta · Centre',
        note: 'Heritage area listed only to assess access and mobility; not approved.',
      },
      {
        code: 'TA·02',
        name: 'Marina · Serrallo',
        note: 'Coastal and hotel reference pending confirmation at every project stage.',
      },
    ],
    processTitle: 'The season never replaces operational confirmation',
    processIntro:
      'Before opening Tarragona, journeys, owners, availability and content authorisation must be reviewed.',
    steps: [
      {
        title: 'Define city and coast',
        text: 'The operator must state in writing which areas could form part of the scope.',
      },
      {
        title: 'Check real journey times',
        text: 'Travel and time bands must be validated without extending availability across municipalities.',
      },
      {
        title: 'Publish after approval',
        text: 'Only confirmed and documented coverage may replace this draft.',
      },
    ],
    discretionTitle: 'The best expectation is one that can be met.',
    discretionText:
      'Tarragona therefore remains a destination under review, without service or availability claims.',
    faqs: [
      {
        question: 'Is coverage active in Tarragona?',
        answer:
          'No. The city is an editorial proposal and its coverage is still pending confirmation.',
      },
      {
        question: 'Are Salou or Reus included?',
        answer:
          'They appear only as analysis references and must not be read as approved or served municipalities.',
      },
    ],
    closingTitle: 'Tarragona needs its own validation.',
    closingText:
      'Until that is complete, this page offers no booking and confirms no journey.',
  }),
  toledo: localizeSupplementalCity('toledo', {
    regionLabel: 'Toledo · Coverage pending confirmation',
    kicker: 'A city with unique access',
    headline: 'Every street matters.',
    headlineAccent: 'Every promise does too.',
    lead:
      'Preliminary content for studying possible travel in Toledo. The city does not yet have approved coverage.',
    introEyebrow: 'Toledo, under study',
    introTitle: 'Distinctive terrain requires confirmed logistics.',
    introBody: [
      'The old town, its access routes and the station connection create conditions unlike those of a major capital.',
      'This draft prevents an expansion idea becoming a promise: no enquiry can be considered accepted through this page.',
    ],
    areaEyebrow: 'Coverage not approved',
    areaTitle: 'Toledo, reference points without announced availability',
    areaIntro:
      'Areas are shown for future planning. Mention does not amount to coverage, authorisation or an arrival time.',
    highlights: [
      {
        code: 'TO·01',
        name: 'Casco Histórico',
        note: 'Access and accommodation still to be studied; coverage is not confirmed.',
      },
      {
        code: 'TO·02',
        name: 'Estación · Santa Bárbara',
        note: 'Transport reference subject to logistical review and approval.',
      },
    ],
    processTitle: 'Toledo opens only when mobility has been resolved',
    processIntro:
      'Validation must distinguish the old town, outer districts and every nearby municipality.',
    steps: [
      {
        title: 'Identify the access point',
        text: 'Review the exact location without assuming equal conditions across the city.',
      },
      {
        title: 'Confirm the scope',
        text: 'Future coverage must be documented by area and operational owner.',
      },
      {
        title: 'Keep the preventive closure',
        text: 'Until then, the route remains without active channels or commercial claims.',
      },
    ],
    discretionTitle: 'In Toledo, moving carefully is also a form of respect.',
    discretionText:
      'The page separates exploration of a future city from any effective offer.',
    faqs: [
      {
        question: 'Can service be requested in Toledo now?',
        answer:
          'Not through this route. Coverage is unapproved and the page remains informational.',
      },
      {
        question: 'Are the old town and nearby municipalities covered?',
        answer:
          'Coverage is not claimed for any of them. Every listed point is pending evaluation.',
      },
    ],
    closingTitle: 'Toledo remains in the study phase.',
    closingText:
      'Future activation requires real coverage, approved content and verified channels.',
  }),
  guadalajara: localizeSupplementalCity('guadalajara', {
    regionLabel: 'Guadalajara · Coverage pending confirmation',
    kicker: 'Gateway to the Henares corridor',
    headline: 'Connections bring us closer.',
    headlineAccent: 'Approval makes the decision.',
    lead:
      'Expansion draft for Guadalajara and its surroundings. It does not represent active coverage or an available offer.',
    introEyebrow: 'Guadalajara, to be confirmed',
    introTitle: 'Proximity to Madrid does not allow the same service to be assumed.',
    introBody: [
      'The corridor connects cities and business areas, but timing, demand and operational responsibility change in each municipality.',
      'Guadalajara is therefore documented as an independent pending scope and inherits no promise from the Madrid page.',
    ],
    areaEyebrow: 'Coverage not approved',
    areaTitle: 'Guadalajara, an expansion that must be verified',
    areaIntro:
      'These references help size a future operation. They do not prove presence, availability or acceptance of enquiries.',
    highlights: [
      {
        code: 'GU·01',
        name: 'Centro · Estación',
        note: 'Urban connections to be reviewed; coverage is not confirmed.',
      },
      {
        code: 'GU·02',
        name: 'Corredor del Henares',
        note: 'A broad area that will need explicit limits before any publication.',
      },
    ],
    processTitle: 'Geographical proximity does not mean automatic coverage',
    processIntro:
      'Guadalajara needs its own owners, journeys and availability before joining the service.',
    steps: [
      {
        title: 'Separate it from the Madrid scope',
        text: 'Document Guadalajara independently and never extend coverage by analogy.',
      },
      {
        title: 'Define valid municipalities',
        text: 'Each place needs a verifiable operational and editorial decision.',
      },
      {
        title: 'Enable only after approval',
        text: 'Content remains closed to enquiries while any confirmation is missing.',
      },
    ],
    discretionTitle: 'Responsible expansion begins by recognising its limits.',
    discretionText:
      'This route makes the Guadalajara project visible without presenting it as operational reality.',
    faqs: [
      {
        question: 'Does Madrid coverage include Guadalajara?',
        answer:
          'That must not be assumed. Guadalajara needs separate confirmation and is not yet approved.',
      },
      {
        question: 'Are corridor municipalities available?',
        answer:
          'No. Listed names are planning references, not served areas.',
      },
    ],
    closingTitle: 'Guadalajara inherits no promise from another city.',
    closingText:
      'Only specific approval can turn this draft into an operational route.',
  }),
  segovia: localizeSupplementalCity('segovia', {
    regionLabel: 'Segovia · Coverage pending confirmation',
    kicker: 'Heritage, mountains and real distances',
    headline: 'The destination inspires.',
    headlineAccent: 'Coverage must be proven.',
    lead:
      'Preliminary page evaluating Segovia as a future destination. No service, municipality or timetable has been approved.',
    introEyebrow: 'Segovia, under review',
    introTitle: 'A getaway destination needs planning, not assumptions.',
    introBody: [
      'Arrival by road or rail, the historic enclosure and the mountain surroundings create different logistical cases.',
      'The route remains a draft until capacity, distances and publication requirements are validated for the city.',
    ],
    areaEyebrow: 'Coverage not approved',
    areaTitle: 'Segovia, references that are not yet coverage',
    areaIntro:
      'The points below describe the planned assessment. They confirm no journey or availability commitment.',
    highlights: [
      {
        code: 'SE·01',
        name: 'Recinto amurallado',
        note: 'Historic accommodation and access pending operational assessment.',
      },
      {
        code: 'SE·02',
        name: 'Guiomar · Nueva Segovia',
        note: 'Arrival connections listed as references, with no approved service.',
      },
    ],
    processTitle: 'Segovia requires both arrival and return to be confirmed',
    processIntro:
      'Any future operation must be based on real timing and expressly authorised scope.',
    steps: [
      {
        title: 'Measure the journey',
        text: 'Access, distance and time bands will be reviewed for every proposed area.',
      },
      {
        title: 'Approve capacity',
        text: 'The city can open only when demonstrable operational availability exists.',
      },
      {
        title: 'Publish without ambiguity',
        text: 'Approved, clear and dated information must replace this draft.',
      },
    ],
    discretionTitle: 'Distance deserves especially precise information.',
    discretionText:
      'Segovia is presented as a future possibility, never as an already available service.',
    faqs: [
      {
        question: 'Does PecadosVip currently offer service in Segovia?',
        answer:
          'No active service is announced. The city is pending operational and content confirmation.',
      },
      {
        question: 'Are the station and nearby municipalities included?',
        answer:
          'They are only references for studying scope. No coverage is confirmed for them.',
      },
    ],
    closingTitle: 'Segovia remains closed until sufficient evidence exists.',
    closingText:
      'Future expansion must be approved before any contact channel or service claim is enabled.',
  }),
};

const frenchSupplementalCities: Record<
  SupplementalCitySlug,
  CityContent
> = {
  girona: localizeSupplementalCity('girona', {
    regionLabel: 'Gérone · Couverture en attente de confirmation',
    kicker: 'Entre pierre, rivière et calme',
    headline: 'La ville invite.',
    headlineAccent: 'La couverture reste à confirmer.',
    lead:
      'Brouillon informatif pour de possibles déplacements vers des hôtels et domiciles de Gérone. Aucune zone ni disponibilité n’est encore approuvée.',
    introEyebrow: 'Gérone, en cours d’évaluation',
    introTitle: 'Une destination singulière où chaque trajet doit être confirmé.',
    introBody: [
      'Le centre historique, les ponts et les accès modernes composent une ville compacte, mais chaque déplacement exige sa propre analyse logistique.',
      'Cette page est un brouillon éditorial, pas l’annonce d’un service actif. Zone, horaire et service ne pourraient être communiqués qu’après approbation expresse.',
    ],
    areaEyebrow: 'Couverture non approuvée',
    areaTitle: 'Gérone, repères pour une validation future',
    areaIntro:
      'Les secteurs suivants servent uniquement à étudier les distances et la demande. Leur présence ne signifie ni couverture ni acceptation de demandes.',
    highlights: [
      {
        code: 'GI·01',
        name: 'Barri Vell · Centre',
        note: 'Repère urbain pour évaluer les accès aux hôtels et hébergements ; couverture non confirmée.',
      },
      {
        code: 'GI·02',
        name: 'Devesa · Estació',
        note: 'Zone d’étude liée au train et aux hôtels ; approbation en attente.',
      },
    ],
    processTitle: 'Valider Gérone avant d’activer tout contact',
    processIntro:
      'Tant que la couverture reste en attente, cette route documente seulement le périmètre que l’opérateur devra confirmer.',
    steps: [
      {
        title: 'Examiner la zone demandée',
        text: 'Vérifier si la ville ou la commune appartient à un périmètre opérationnel approuvé.',
      },
      {
        title: 'Valider logistique et horaire',
        text: 'Un responsable doit confirmer déplacement, disponibilité et conditions avant toute publication.',
      },
      {
        title: 'Activer uniquement sur preuve',
        text: 'La route demeure informative et sans promesse jusqu’à l’enregistrement de l’approbation.',
      },
    ],
    discretionTitle: 'À Gérone, la prudence commence par ne pas promettre de couverture.',
    discretionText:
      'La discrétion consiste aussi à distinguer un repère éditorial d’un service réel. Cette ville reste à confirmer.',
    faqs: [
      {
        question: 'PecadosVip opère-t-il déjà à Gérone ?',
        answer:
          'La page ne présente aucun service actif. La couverture de Gérone attend des confirmations opérationnelle, juridique et éditoriale.',
      },
      {
        question: 'Les zones et communes de cette page sont-elles disponibles ?',
        answer:
          'Non. Ce sont des repères de planification qui ne prouvent ni disponibilité, ni délai d’arrivée, ni acceptation de demandes.',
      },
    ],
    closingTitle: 'Gérone reste en attente de confirmation.',
    closingText:
      'Les informations resteront au stade de brouillon jusqu’à l’existence d’une couverture et d’approbations vérifiables.',
  }),
  tarragona: localizeSupplementalCity('tarragona', {
    regionLabel: 'Tarragone · Couverture en attente de confirmation',
    kicker: 'L’histoire face à la Méditerranée',
    headline: 'L’horizon s’ouvre.',
    headlineAccent: 'Pas encore la disponibilité.',
    lead:
      'Brouillon d’une future couverture pour les hôtels et domiciles de Tarragone. Aucune approbation opérationnelle ni disponibilité publiée.',
    introEyebrow: 'Tarragone, à valider',
    introTitle: 'Littoral, patrimoine et distances à mesurer avec précision.',
    introBody: [
      'La Part Alta, la marina et le corridor vers les communes touristiques imposent des trajets différents selon la saison et l’heure.',
      'Cette route ne confirme aucun service. Elle rassemble seulement un contenu préliminaire pour évaluer un éventuel périmètre avant publication.',
    ],
    areaEyebrow: 'Couverture non approuvée',
    areaTitle: 'Tarragone, secteurs soumis à examen',
    areaIntro:
      'Chaque repère exige une validation individuelle. Aucun quartier, hôtel ou commune n’est desservi du seul fait de figurer ici.',
    highlights: [
      {
        code: 'TA·01',
        name: 'Part Alta · Centre',
        note: 'Zone patrimoniale citée uniquement pour évaluer accès et mobilité ; non approuvée.',
      },
      {
        code: 'TA·02',
        name: 'Marina · Serrallo',
        note: 'Repère côtier et hôtelier en attente de confirmation à chaque étape du projet.',
      },
    ],
    processTitle: 'La saison ne remplace jamais une confirmation opérationnelle',
    processIntro:
      'Avant toute ouverture de Tarragone, trajets, responsables, disponibilité et autorisation du contenu doivent être vérifiés.',
    steps: [
      {
        title: 'Délimiter ville et côte',
        text: 'L’opérateur doit préciser par écrit les zones susceptibles d’intégrer le périmètre.',
      },
      {
        title: 'Contrôler les temps réels',
        text: 'Les trajets et créneaux doivent être validés sans étendre la disponibilité entre communes.',
      },
      {
        title: 'Publier après approbation',
        text: 'Seule une couverture confirmée et documentée pourra remplacer ce brouillon.',
      },
    ],
    discretionTitle: 'La meilleure attente est celle qui peut être tenue.',
    discretionText:
      'Tarragone reste donc une destination à l’étude, sans affirmation de service ni de disponibilité.',
    faqs: [
      {
        question: 'La couverture est-elle active à Tarragone ?',
        answer:
          'Non. La ville est une proposition éditoriale et sa couverture reste en attente de confirmation.',
      },
      {
        question: 'Salou ou Reus sont-elles incluses ?',
        answer:
          'Elles ne sont citées que comme repères d’analyse, jamais comme communes approuvées ou desservies.',
      },
    ],
    closingTitle: 'Tarragone nécessite sa propre validation.',
    closingText:
      'Jusqu’à son achèvement, cette page ne propose aucune réservation et ne confirme aucun déplacement.',
  }),
  toledo: localizeSupplementalCity('toledo', {
    regionLabel: 'Tolède · Couverture en attente de confirmation',
    kicker: 'Une ville aux accès singuliers',
    headline: 'Chaque rue compte.',
    headlineAccent: 'Chaque promesse aussi.',
    lead:
      'Contenu préliminaire pour étudier de possibles déplacements à Tolède. La ville ne dispose pas encore d’une couverture approuvée.',
    introEyebrow: 'Tolède, à l’étude',
    introTitle: 'Une topographie particulière exige une logistique confirmée.',
    introBody: [
      'Le centre historique, ses accès et la liaison avec la gare présentent des conditions différentes de celles d’une grande capitale.',
      'Ce brouillon évite de transformer une intention d’expansion en promesse : aucune demande ne peut être considérée acceptée depuis cette page.',
    ],
    areaEyebrow: 'Couverture non approuvée',
    areaTitle: 'Tolède, repères sans disponibilité annoncée',
    areaIntro:
      'Les zones sont affichées pour une planification future. Leur mention ne vaut ni couverture, ni autorisation, ni délai d’arrivée.',
    highlights: [
      {
        code: 'TO·01',
        name: 'Casco Histórico',
        note: 'Accès et hébergements encore à étudier ; couverture non confirmée.',
      },
      {
        code: 'TO·02',
        name: 'Estación · Santa Bárbara',
        note: 'Repère de transport soumis à une analyse logistique et à approbation.',
      },
    ],
    processTitle: 'Tolède ne s’ouvrira que lorsque la mobilité sera résolue',
    processIntro:
      'La validation devra distinguer le centre ancien, les quartiers extérieurs et chaque commune voisine.',
    steps: [
      {
        title: 'Identifier l’accès',
        text: 'Examiner l’emplacement précis sans supposer des conditions identiques dans toute la ville.',
      },
      {
        title: 'Confirmer le périmètre',
        text: 'La future couverture devra être documentée par zone et responsable opérationnel.',
      },
      {
        title: 'Maintenir la fermeture préventive',
        text: 'Jusque-là, la route reste sans canaux actifs ni affirmations commerciales.',
      },
    ],
    discretionTitle: 'À Tolède, avancer avec prudence est aussi une forme de respect.',
    discretionText:
      'La page sépare l’exploration d’une ville future de toute offre effective.',
    faqs: [
      {
        question: 'Peut-on demander un service à Tolède maintenant ?',
        answer:
          'Pas depuis cette route. La couverture n’est pas approuvée et la page reste informative.',
      },
      {
        question: 'Le centre historique et les communes proches sont-ils couverts ?',
        answer:
          'Aucune couverture n’est affirmée. Tous les points cités restent à évaluer.',
      },
    ],
    closingTitle: 'Tolède demeure en phase d’étude.',
    closingText:
      'Une future activation exigera une couverture réelle, un contenu approuvé et des canaux vérifiés.',
  }),
  guadalajara: localizeSupplementalCity('guadalajara', {
    regionLabel: 'Guadalajara · Couverture en attente de confirmation',
    kicker: 'Porte du corridor de l’Henares',
    headline: 'Les liaisons rapprochent.',
    headlineAccent: 'L’approbation décide.',
    lead:
      'Brouillon d’expansion pour Guadalajara et ses environs. Il ne représente ni couverture active ni offre disponible.',
    introEyebrow: 'Guadalajara, à confirmer',
    introTitle: 'La proximité de Madrid ne permet pas de supposer le même service.',
    introBody: [
      'Le corridor relie villes et zones d’activité, mais délais, demande et responsabilités opérationnelles changent dans chaque commune.',
      'Guadalajara est donc documentée comme un périmètre indépendant en attente et n’hérite d’aucune promesse de la page Madrid.',
    ],
    areaEyebrow: 'Couverture non approuvée',
    areaTitle: 'Guadalajara, une expansion à vérifier',
    areaIntro:
      'Ces repères servent à dimensionner une future opération. Ils ne prouvent ni présence, ni disponibilité, ni acceptation de demandes.',
    highlights: [
      {
        code: 'GU·01',
        name: 'Centro · Estación',
        note: 'Liaisons urbaines à examiner ; couverture non confirmée.',
      },
      {
        code: 'GU·02',
        name: 'Corredor del Henares',
        note: 'Zone étendue qui exigera des limites explicites avant publication.',
      },
    ],
    processTitle: 'La proximité géographique ne crée pas une couverture automatique',
    processIntro:
      'Guadalajara a besoin de ses propres responsables, trajets et disponibilités avant d’intégrer le service.',
    steps: [
      {
        title: 'Séparer le périmètre de Madrid',
        text: 'Documenter Guadalajara indépendamment, sans étendre une couverture par analogie.',
      },
      {
        title: 'Définir les communes valides',
        text: 'Chaque lieu exige une décision opérationnelle et éditoriale vérifiable.',
      },
      {
        title: 'Activer après approbation',
        text: 'Le contenu reste fermé aux demandes tant qu’une confirmation manque.',
      },
    ],
    discretionTitle: 'Une expansion responsable commence par reconnaître ses limites.',
    discretionText:
      'Cette route rend visible le projet Guadalajara sans le présenter comme une réalité opérationnelle.',
    faqs: [
      {
        question: 'La couverture de Madrid inclut-elle Guadalajara ?',
        answer:
          'Il ne faut pas le supposer. Guadalajara exige une confirmation distincte et n’est pas encore approuvée.',
      },
      {
        question: 'Les communes du corridor sont-elles disponibles ?',
        answer:
          'Non. Les noms listés sont des repères de planification, pas des zones desservies.',
      },
    ],
    closingTitle: 'Guadalajara n’hérite des promesses d’aucune autre ville.',
    closingText:
      'Seule une approbation spécifique pourra transformer ce brouillon en route opérationnelle.',
  }),
  segovia: localizeSupplementalCity('segovia', {
    regionLabel: 'Ségovie · Couverture en attente de confirmation',
    kicker: 'Patrimoine, montagne et distances réelles',
    headline: 'La destination inspire.',
    headlineAccent: 'La couverture doit être prouvée.',
    lead:
      'Page préliminaire évaluant Ségovie comme future destination. Aucun service, aucune commune et aucun horaire ne sont approuvés.',
    introEyebrow: 'Ségovie, en cours d’évaluation',
    introTitle: 'Une destination d’escapade exige une planification, pas des suppositions.',
    introBody: [
      'L’arrivée par route ou train, l’enceinte historique et les environs montagneux créent des situations logistiques différentes.',
      'La route reste un brouillon jusqu’à validation de la capacité, des distances et des exigences de publication pour la ville.',
    ],
    areaEyebrow: 'Couverture non approuvée',
    areaTitle: 'Ségovie, des repères qui ne sont pas encore une couverture',
    areaIntro:
      'Les points ci-dessous décrivent l’évaluation envisagée. Ils ne confirment aucun déplacement ni engagement de disponibilité.',
    highlights: [
      {
        code: 'SE·01',
        name: 'Recinto amurallado',
        note: 'Hébergements et accès historiques en attente d’évaluation opérationnelle.',
      },
      {
        code: 'SE·02',
        name: 'Guiomar · Nueva Segovia',
        note: 'Liaisons d’arrivée citées comme repères, sans service approuvé.',
      },
    ],
    processTitle: 'Ségovie exige de confirmer l’aller comme le retour',
    processIntro:
      'Toute opération future devra reposer sur des temps réels et un périmètre expressément autorisé.',
    steps: [
      {
        title: 'Mesurer le trajet',
        text: 'Accès, distance et créneaux seront examinés pour chaque zone proposée.',
      },
      {
        title: 'Approuver la capacité',
        text: 'La ville ne pourra ouvrir qu’avec une disponibilité opérationnelle démontrable.',
      },
      {
        title: 'Publier sans ambiguïté',
        text: 'Des informations approuvées, claires et datées devront remplacer ce brouillon.',
      },
    ],
    discretionTitle: 'La distance mérite des informations particulièrement précises.',
    discretionText:
      'Ségovie est présentée comme une possibilité future, jamais comme un service déjà disponible.',
    faqs: [
      {
        question: 'PecadosVip propose-t-il actuellement un service à Ségovie ?',
        answer:
          'Aucun service actif n’est annoncé. La ville attend une confirmation opérationnelle et éditoriale.',
      },
      {
        question: 'La gare et les communes voisines sont-elles incluses ?',
        answer:
          'Ce sont seulement des repères pour étudier le périmètre. Aucune couverture n’est confirmée.',
      },
    ],
    closingTitle: 'Ségovie restera fermée jusqu’à disposer de preuves suffisantes.',
    closingText:
      'L’expansion future devra être approuvée avant l’activation de tout canal ou de toute affirmation de service.',
  }),
};

const italianSupplementalCities: Record<
  SupplementalCitySlug,
  CityContent
> = {
  girona: localizeSupplementalCity('girona', {
    regionLabel: 'Girona · Copertura in attesa di conferma',
    kicker: 'Tra pietra, fiume e quiete',
    headline: 'La città invita.',
    headlineAccent: 'La copertura è ancora da confermare.',
    lead:
      'Bozza informativa per possibili spostamenti verso hotel e domicili di Girona. Nessuna zona o disponibilità è stata ancora approvata.',
    introEyebrow: 'Girona, in valutazione',
    introTitle: 'Una destinazione particolare in cui ogni tragitto va confermato.',
    introBody: [
      'Il centro storico, i ponti e gli accessi moderni compongono una città compatta, ma ogni spostamento richiede una verifica logistica dedicata.',
      'Questa è una bozza editoriale, non l’annuncio di un servizio attivo. Zona, orario e servizio potranno essere comunicati solo dopo un’approvazione esplicita.',
    ],
    areaEyebrow: 'Copertura non approvata',
    areaTitle: 'Girona, riferimenti per una futura verifica',
    areaIntro:
      'I settori seguenti servono soltanto a valutare distanze e domanda. La loro presenza non implica copertura né accettazione di richieste.',
    highlights: [
      {
        code: 'GI·01',
        name: 'Barri Vell · Centre',
        note: 'Riferimento urbano per valutare gli accessi a hotel e alloggi; copertura non confermata.',
      },
      {
        code: 'GI·02',
        name: 'Devesa · Estació',
        note: 'Area di studio per collegamenti ferroviari e alberghieri; approvazione in sospeso.',
      },
    ],
    processTitle: 'Prima si verifica Girona, poi si abilita qualsiasi contatto',
    processIntro:
      'Finché la copertura resta in sospeso, questa rotta documenta solo l’ambito che l’operatore dovrà confermare.',
    steps: [
      {
        title: 'Esaminare l’area richiesta',
        text: 'Verificare se la città o il comune appartiene a un ambito operativo approvato.',
      },
      {
        title: 'Convalidare logistica e orario',
        text: 'Un responsabile deve confermare spostamento, disponibilità e condizioni prima della pubblicazione.',
      },
      {
        title: 'Attivare solo con evidenze',
        text: 'La rotta resta informativa e priva di promesse finché l’approvazione non viene registrata.',
      },
    ],
    discretionTitle: 'A Girona, la prudenza inizia dal non promettere copertura.',
    discretionText:
      'La discrezione significa anche distinguere un riferimento editoriale da un servizio reale. Questa città resta da confermare.',
    faqs: [
      {
        question: 'PecadosVip opera già a Girona?',
        answer:
          'Non viene presentato alcun servizio attivo. La copertura di Girona è in attesa di conferma operativa, legale ed editoriale.',
      },
      {
        question: 'Le zone e i comuni in questa pagina sono disponibili?',
        answer:
          'No. Sono riferimenti di pianificazione e non provano disponibilità, tempi di arrivo o accettazione di richieste.',
      },
    ],
    closingTitle: 'Girona resta in attesa di conferma.',
    closingText:
      'Le informazioni resteranno in bozza finché non esisteranno copertura e approvazioni verificabili.',
  }),
  tarragona: localizeSupplementalCity('tarragona', {
    regionLabel: 'Tarragona · Copertura in attesa di conferma',
    kicker: 'La storia davanti al Mediterraneo',
    headline: 'L’orizzonte si apre.',
    headlineAccent: 'La disponibilità non ancora.',
    lead:
      'Bozza di futura copertura per hotel e domicili di Tarragona. Non esistono approvazione operativa né disponibilità pubblicata.',
    introEyebrow: 'Tarragona, da verificare',
    introTitle: 'Costa, patrimonio e distanze da misurare con precisione.',
    introBody: [
      'Part Alta, il porto e il corridoio verso i comuni turistici richiedono tragitti diversi a seconda della stagione e dell’orario.',
      'Questa rotta non conferma alcun servizio. Raccoglie soltanto contenuti preliminari per valutare un possibile ambito prima della pubblicazione.',
    ],
    areaEyebrow: 'Copertura non approvata',
    areaTitle: 'Tarragona, settori soggetti a verifica',
    areaIntro:
      'Ogni riferimento richiede una convalida individuale. Nessun quartiere, hotel o comune è servito solo perché compare qui.',
    highlights: [
      {
        code: 'TA·01',
        name: 'Part Alta · Centre',
        note: 'Zona storica citata solo per valutare accessi e mobilità; non approvata.',
      },
      {
        code: 'TA·02',
        name: 'Marina · Serrallo',
        note: 'Riferimento costiero e alberghiero in attesa di conferma in ogni fase del progetto.',
      },
    ],
    processTitle: 'La stagione non sostituisce mai una conferma operativa',
    processIntro:
      'Prima di aprire Tarragona vanno verificati tragitti, responsabili, disponibilità e autorizzazione dei contenuti.',
    steps: [
      {
        title: 'Delimitare città e costa',
        text: 'L’operatore deve indicare per iscritto quali aree potrebbero rientrare nell’ambito.',
      },
      {
        title: 'Controllare i tempi reali',
        text: 'Spostamenti e fasce orarie vanno verificati senza estendere la disponibilità tra comuni.',
      },
      {
        title: 'Pubblicare dopo l’approvazione',
        text: 'Solo una copertura confermata e documentata potrà sostituire questa bozza.',
      },
    ],
    discretionTitle: 'La migliore aspettativa è quella che si può mantenere.',
    discretionText:
      'Tarragona resta quindi una destinazione in valutazione, senza dichiarazioni di servizio o disponibilità.',
    faqs: [
      {
        question: 'La copertura è attiva a Tarragona?',
        answer:
          'No. La città è una proposta editoriale e la sua copertura resta in attesa di conferma.',
      },
      {
        question: 'Salou o Reus sono incluse?',
        answer:
          'Compaiono solo come riferimenti di analisi e non come comuni approvati o serviti.',
      },
    ],
    closingTitle: 'Tarragona richiede una verifica propria.',
    closingText:
      'Fino al suo completamento, questa pagina non offre prenotazioni e non conferma spostamenti.',
  }),
  toledo: localizeSupplementalCity('toledo', {
    regionLabel: 'Toledo · Copertura in attesa di conferma',
    kicker: 'Una città con accessi particolari',
    headline: 'Ogni strada conta.',
    headlineAccent: 'Anche ogni promessa.',
    lead:
      'Contenuto preliminare per studiare possibili spostamenti a Toledo. La città non dispone ancora di una copertura approvata.',
    introEyebrow: 'Toledo, in esame',
    introTitle: 'Una topografia speciale richiede una logistica confermata.',
    introBody: [
      'Il centro storico, i suoi accessi e il collegamento con la stazione presentano condizioni diverse da quelle di una grande capitale.',
      'Questa bozza evita che un’idea di espansione diventi una promessa: nessuna richiesta può essere considerata accettata da questa pagina.',
    ],
    areaEyebrow: 'Copertura non approvata',
    areaTitle: 'Toledo, riferimenti senza disponibilità annunciata',
    areaIntro:
      'Le zone sono mostrate per una futura pianificazione. La menzione non equivale a copertura, autorizzazione o tempo di arrivo.',
    highlights: [
      {
        code: 'TO·01',
        name: 'Casco Histórico',
        note: 'Accessi e alloggi ancora da studiare; copertura non confermata.',
      },
      {
        code: 'TO·02',
        name: 'Estación · Santa Bárbara',
        note: 'Riferimento di trasporto soggetto a verifica logistica e approvazione.',
      },
    ],
    processTitle: 'Toledo si aprirà solo quando la mobilità sarà risolta',
    processIntro:
      'La convalida dovrà distinguere il centro storico, i quartieri esterni e ogni comune vicino.',
    steps: [
      {
        title: 'Identificare l’accesso',
        text: 'Esaminare la posizione precisa senza presumere condizioni uguali in tutta la città.',
      },
      {
        title: 'Confermare l’ambito',
        text: 'La futura copertura dovrà essere documentata per zona e responsabile operativo.',
      },
      {
        title: 'Mantenere la chiusura preventiva',
        text: 'Fino ad allora la rotta resta priva di canali attivi e dichiarazioni commerciali.',
      },
    ],
    discretionTitle: 'A Toledo, procedere con cautela è anche una forma di rispetto.',
    discretionText:
      'La pagina separa l’esplorazione di una futura città da qualsiasi offerta effettiva.',
    faqs: [
      {
        question: 'È possibile richiedere ora un servizio a Toledo?',
        answer:
          'Non tramite questa rotta. La copertura non è approvata e la pagina resta informativa.',
      },
      {
        question: 'Il centro storico e i comuni vicini sono coperti?',
        answer:
          'Non viene dichiarata copertura per nessuno di essi. Tutti i punti citati sono ancora da valutare.',
      },
    ],
    closingTitle: 'Toledo rimane in fase di studio.',
    closingText:
      'Una futura attivazione richiederà copertura reale, contenuti approvati e canali verificati.',
  }),
  guadalajara: localizeSupplementalCity('guadalajara', {
    regionLabel: 'Guadalajara · Copertura in attesa di conferma',
    kicker: 'Porta del corridoio dell’Henares',
    headline: 'I collegamenti avvicinano.',
    headlineAccent: 'L’approvazione decide.',
    lead:
      'Bozza di espansione per Guadalajara e dintorni. Non rappresenta copertura attiva né un’offerta disponibile.',
    introEyebrow: 'Guadalajara, da confermare',
    introTitle: 'La vicinanza a Madrid non consente di presumere lo stesso servizio.',
    introBody: [
      'Il corridoio collega città e aree produttive, ma tempi, domanda e responsabilità operative cambiano in ogni comune.',
      'Guadalajara viene quindi documentata come ambito indipendente in sospeso e non eredita promesse dalla pagina di Madrid.',
    ],
    areaEyebrow: 'Copertura non approvata',
    areaTitle: 'Guadalajara, un’espansione da verificare',
    areaIntro:
      'Questi riferimenti aiutano a dimensionare una futura operazione. Non provano presenza, disponibilità o accettazione di richieste.',
    highlights: [
      {
        code: 'GU·01',
        name: 'Centro · Estación',
        note: 'Collegamenti urbani da esaminare; copertura non confermata.',
      },
      {
        code: 'GU·02',
        name: 'Corredor del Henares',
        note: 'Area ampia che richiederà limiti espliciti prima di qualsiasi pubblicazione.',
      },
    ],
    processTitle: 'La vicinanza geografica non crea copertura automatica',
    processIntro:
      'Guadalajara necessita di responsabili, percorsi e disponibilità propri prima di entrare nel servizio.',
    steps: [
      {
        title: 'Separare l’ambito da Madrid',
        text: 'Documentare Guadalajara in modo indipendente, senza estendere coperture per analogia.',
      },
      {
        title: 'Definire i comuni validi',
        text: 'Ogni località richiede una decisione operativa ed editoriale verificabile.',
      },
      {
        title: 'Abilitare dopo l’approvazione',
        text: 'Il contenuto resta chiuso alle richieste finché manca una conferma.',
      },
    ],
    discretionTitle: 'Un’espansione responsabile inizia riconoscendo i propri limiti.',
    discretionText:
      'Questa rotta rende visibile il progetto Guadalajara senza presentarlo come realtà operativa.',
    faqs: [
      {
        question: 'La copertura di Madrid include Guadalajara?',
        answer:
          'Non va presunto. Guadalajara richiede una conferma separata e non è ancora approvata.',
      },
      {
        question: 'I comuni del corridoio sono disponibili?',
        answer:
          'No. I nomi elencati sono riferimenti di pianificazione, non zone servite.',
      },
    ],
    closingTitle: 'Guadalajara non eredita promesse da un’altra città.',
    closingText:
      'Solo un’approvazione specifica potrà trasformare questa bozza in una rotta operativa.',
  }),
  segovia: localizeSupplementalCity('segovia', {
    regionLabel: 'Segovia · Copertura in attesa di conferma',
    kicker: 'Patrimonio, montagna e distanze reali',
    headline: 'La destinazione ispira.',
    headlineAccent: 'La copertura va dimostrata.',
    lead:
      'Pagina preliminare che valuta Segovia come destinazione futura. Nessun servizio, comune o orario è stato approvato.',
    introEyebrow: 'Segovia, in valutazione',
    introTitle: 'Una destinazione per una fuga richiede pianificazione, non supposizioni.',
    introBody: [
      'L’arrivo su strada o in treno, il recinto storico e l’ambiente montano producono scenari logistici diversi.',
      'La rotta resta una bozza finché non saranno convalidati capacità, distanze e requisiti di pubblicazione per la città.',
    ],
    areaEyebrow: 'Copertura non approvata',
    areaTitle: 'Segovia, riferimenti che non sono ancora copertura',
    areaIntro:
      'I punti seguenti descrivono la valutazione prevista. Non confermano spostamenti né impegni di disponibilità.',
    highlights: [
      {
        code: 'SE·01',
        name: 'Recinto amurallado',
        note: 'Alloggi e accessi storici in attesa di valutazione operativa.',
      },
      {
        code: 'SE·02',
        name: 'Guiomar · Nueva Segovia',
        note: 'Collegamenti di arrivo elencati come riferimenti, senza servizio approvato.',
      },
    ],
    processTitle: 'Segovia richiede di confermare sia l’arrivo sia il ritorno',
    processIntro:
      'Ogni futura operazione dovrà basarsi su tempi reali e su un ambito espressamente autorizzato.',
    steps: [
      {
        title: 'Misurare lo spostamento',
        text: 'Accessi, distanza e fasce orarie saranno esaminati per ogni zona proposta.',
      },
      {
        title: 'Approvare la capacità',
        text: 'La città potrà aprire solo con una disponibilità operativa dimostrabile.',
      },
      {
        title: 'Pubblicare senza ambiguità',
        text: 'Informazioni approvate, chiare e datate dovranno sostituire questa bozza.',
      },
    ],
    discretionTitle: 'La distanza merita informazioni particolarmente precise.',
    discretionText:
      'Segovia è presentata come possibilità futura, mai come servizio già disponibile.',
    faqs: [
      {
        question: 'PecadosVip offre attualmente un servizio a Segovia?',
        answer:
          'Non viene annunciato alcun servizio attivo. La città attende conferma operativa ed editoriale.',
      },
      {
        question: 'La stazione e i comuni vicini sono inclusi?',
        answer:
          'Sono soltanto riferimenti per studiare l’ambito. Nessuna copertura è confermata.',
      },
    ],
    closingTitle: 'Segovia resterà chiusa fino a evidenze sufficienti.',
    closingText:
      'L’espansione futura dovrà essere approvata prima di attivare canali o dichiarazioni di servizio.',
  }),
};

const localizedSupplementalCities: Readonly<
  Record<Locale, Readonly<Record<SupplementalCitySlug, CityContent>>>
> = {
  es: Object.fromEntries(
    SUPPLEMENTAL_CITY_SLUGS.map((slug) => [slug, cities[slug]]),
  ) as Record<SupplementalCitySlug, CityContent>,
  en: englishSupplementalCities,
  fr: frenchSupplementalCities,
  it: italianSupplementalCities,
};

export function isCitySlug(value: string): value is CitySlug {
  return (CITY_SLUGS as readonly string[]).includes(value);
}

export function isSupplementalCitySlug(
  value: string,
): value is SupplementalCitySlug {
  return (SUPPLEMENTAL_CITY_SLUGS as readonly string[]).includes(value);
}

export function getSupplementalCityContent(
  locale: Locale,
  slug: SupplementalCitySlug,
): CityContent {
  return localizedSupplementalCities[locale][slug];
}

export function getSupplementalCityMetadata(
  locale: Locale,
  slug: SupplementalCitySlug,
): {
  title: string;
  description: string;
  openGraphDescription: string;
  twitterDescription: string;
  imageAlt: string;
} {
  const content = getSupplementalCityContent(locale, slug);
  const titlePrefix: Record<Locale, string> = {
    es: 'Borrador de cobertura en',
    en: 'Coverage draft for',
    fr: 'Brouillon de couverture à',
    it: 'Bozza di copertura per',
  };

  return {
    title: `${titlePrefix[locale]} ${content.city}`,
    description: content.lead,
    openGraphDescription: content.areaIntro,
    twitterDescription: content.closingText,
    imageAlt: `PecadosVip ${content.city}`,
  };
}
