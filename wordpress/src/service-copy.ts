import type { Locale } from '../../lib/i18n/locales';
import type { SyntheticServiceGroup } from '../../lib/preview/synthetic-services';

/**
 * Service copy owned by the WordPress delivery.
 *
 * The native theme must not depend on the legacy application's editorial text, and the project
 * verifier forbids changing anything outside `wordpress/` beyond the build plumbing, so the
 * shared catalogue in `lib/preview` is left untouched. This module carries the copy the
 * WordPress site actually publishes and `wordpress/src/seed.ts` prefers it.
 *
 * Only the groups that have been rewritten are listed. Anything absent keeps using the shared
 * catalogue, so this can grow one group at a time without disturbing the rest.
 *
 * Editorial and legal register, applied on purpose:
 *
 * - Consent is written into the copy. It is never implied by the fact that a service appears
 *   in a catalogue, so a reader cannot take willingness for granted.
 * - Submissive or control play is described as agreed role play with a live safe word, because
 *   consent is what separates it from the conduct the Criminal Code punishes; consent does not
 *   reach injuries either (art. 155 CP), so nothing here depicts real pain, marks or restraint.
 * - Nothing depicts real violence, coercion or humiliation, which is also what advertising law
 *   requires: publicity that attacks personal dignity is unlawful (art. 3.a Ley 34/1988).
 * - Adult-only throughout, no minors, no explicit acts, no transactional promises, no health
 *   or therapeutic claims for the wellbeing routes, and no invented prices or availability.
 */
type GroupCopy = { teaser: string; overview: string; safeguards: readonly string[] };
type ServiceCopy = { name?: string; teaser?: string; overview?: string; safeguards?: readonly string[] };

export type WordPressServiceCopy = {
  groups: Partial<Record<SyntheticServiceGroup, GroupCopy>>;
  services: Readonly<Record<string, ServiceCopy>>;
};

const copy: Readonly<Record<Locale, WordPressServiceCopy>> = {
  es: {
    groups: {
      roleplay: {
        teaser: 'El juego empieza en la conversación: la escena que imaginas, dicha en voz alta antes de vivirla.',
        overview:
          'Escenas de rol que se escriben entre dos mucho antes de empezar. Se elige el papel, el ambiente y hasta dónde llega cada gesto, y lo que no se acuerda no ocurre. La intensidad la marcas tú, y una sola palabra lo detiene todo al instante.',
        safeguards: ['Palabra de seguridad siempre activa', 'Papel, escena y accesorios acordados antes', 'Sin dolor real ni marcas: solo lo acordado'],
      },
      'private-preferences': {
        teaser: 'Lo que te gusta, dicho sin rodeos y solo para quien debe saberlo.',
        overview:
          'Un espacio para nombrar gustos y límites con la misma naturalidad con la que se disfrutan. Primero se habla, después se concreta lo que ambas partes quieren y se descarta lo que no: nada se da por hecho por aparecer en una lista.',
        safeguards: ['Se habla antes, se acuerda antes', 'Lo que no se acuerda, no ocurre', 'Prudencia y cuidado en todo momento'],
      },
      company: {
        teaser: 'Lo que se recuerda no es la cita: es cómo te hizo sentir.',
        overview:
          'Compañía de verdad: la conversación que fluye, una mano que se queda un rato más, la sensación de que alguien eligió estar ahí. El ritmo lo pones tú, y lo que prefieras no contar no hace falta que salga.',
        safeguards: ['Expectativas habladas antes del encuentro', 'Presencia sin prisa y sin libreto', 'Discreción dentro y fuera'],
      },
      settings: {
        teaser: 'El sitio importa menos que la puerta que se cierra detrás de vosotros.',
        overview:
          'Un domicilio, una habitación de hotel o una celebración privada: el escenario se elige para que la intimidad no tenga testigos. Se acuerdan el lugar, la llegada y los tiempos, y ninguna dirección se comparte sin acuerdo previo.',
        safeguards: ['Lugar y acceso confirmados de antemano', 'Horarios y salida acordados', 'Ninguna dirección se publica jamás'],
      },
      couples: {
        teaser: 'Tres o cuatro cuerpos, una sola condición: que todos quieran estar.',
        overview:
          'Experiencias para parejas y grupos donde el deseo se reparte sin que nadie ceda por cortesía. Se habla antes con todas las personas implicadas, cada una pone sus límites sobre la mesa y se respetan tal cual.',
        safeguards: ['Consentimiento de cada participante', 'Los límites individuales están por encima del plan', 'Cualquiera puede parar, y todo se para'],
      },
      wellbeing: {
        teaser: 'Bajar el ruido del día y quedarse solo con lo que se siente.',
        overview:
          'Rituales de cercanía, pausa y contacto pensados para disfrutarse, no para tratarse: no son terapia ni tratamiento de ninguna clase. El ritmo, la intensidad y las pausas se acuerdan y se ajustan sobre la marcha.',
        safeguards: ['No es terapia ni tratamiento', 'Ritmo e intensidad acordados', 'Pausa disponible en cualquier momento'],
      },
    },
    services: {},
  },
  en: {
    groups: {
      roleplay: {
        teaser: 'The game starts in the conversation: the scene you imagine, said out loud before it is lived.',
        overview:
          'Roleplay written between two people long before it begins. The role, the setting and how far each gesture goes are chosen in advance, and what is not agreed does not happen. You set the intensity, and a single word stops everything at once.',
        safeguards: ['Safe word always live', 'Role, scene and accessories agreed first', 'No real pain or marks: only what was agreed'],
      },
      'private-preferences': {
        teaser: 'What you like, said plainly and only for whoever should know.',
        overview:
          'A space to name tastes and limits as naturally as they are enjoyed. First the conversation, then what both people want is pinned down and what they do not is set aside: nothing is taken for granted because it appears on a list.',
        safeguards: ['Talked through first, agreed first', 'What is not agreed does not happen', 'Discretion and care throughout'],
      },
      company: {
        teaser: 'What you remember is not the date. It is how she made you feel.',
        overview:
          'Real company: conversation that flows, a hand that stays a little longer, the sense that someone chose to be there. You set the pace, and whatever you would rather not talk about never has to come up.',
        safeguards: ['Expectations talked through beforehand', 'Unhurried presence, no script', 'Discretion inside and outside'],
      },
      settings: {
        teaser: 'The place matters less than the door closing behind you.',
        overview:
          'A home, a hotel room or a private celebration: the setting is chosen so that intimacy has no witnesses. Place, arrival and timing are agreed, and no address is ever shared without consent.',
        safeguards: ['Place and access confirmed beforehand', 'Timing and departure agreed', 'No address is ever published'],
      },
      couples: {
        teaser: 'Three or four bodies, one condition: everyone wants to be there.',
        overview:
          'Experiences for couples and groups where desire is shared out without anyone giving in out of politeness. Everyone involved talks first, each person puts their limits on the table, and those limits are kept exactly as stated.',
        safeguards: ['Every participant consents', 'Individual limits outrank the plan', 'Anyone can stop, and everything stops'],
      },
      wellbeing: {
        teaser: 'Turn the day down and keep only what you can feel.',
        overview:
          'Rituals of closeness, pause and touch meant to be enjoyed, not treated: they are not therapy or any kind of treatment. Pace, intensity and breaks are agreed and adjusted as you go.',
        safeguards: ['Not therapy, not treatment', 'Pace and intensity agreed', 'A pause is available at any moment'],
      },
    },
    services: {},
  },
  fr: {
    groups: {
      roleplay: {
        teaser: 'Le jeu commence dans la conversation : la scène que vous imaginez, dite à voix haute avant d’être vécue.',
        overview:
          'Des jeux de rôle écrits à deux bien avant de commencer. Le rôle, l’ambiance et la portée de chaque geste se choisissent à l’avance, et ce qui n’est pas convenu n’arrive pas. C’est vous qui fixez l’intensité, et un seul mot arrête tout instantanément.',
        safeguards: ['Mot de sécurité toujours actif', 'Rôle, scène et accessoires convenus avant', 'Aucune douleur ni marque réelle : seulement ce qui est convenu'],
      },
      'private-preferences': {
        teaser: 'Ce qui vous plaît, dit sans détour et seulement pour qui doit le savoir.',
        overview:
          'Un espace pour nommer envies et limites avec autant de naturel qu’on en met à les vivre. D’abord la conversation, ensuite on précise ce que les deux personnes veulent et on écarte le reste : rien n’est acquis parce que cela figure sur une liste.',
        safeguards: ['On en parle avant, on le convient avant', 'Ce qui n’est pas convenu n’arrive pas', 'Discrétion et précaution à tout moment'],
      },
      company: {
        teaser: 'Ce dont on se souvient, ce n’est pas le rendez-vous, c’est ce que vous avez ressenti.',
        overview:
          'Une vraie compagnie : la conversation qui coule, une main qui reste un peu plus longtemps, le sentiment que quelqu’un a choisi d’être là. C’est vous qui donnez le rythme, et ce que vous préférez taire n’a pas à être dit.',
        safeguards: ['Attentes évoquées avant la rencontre', 'Présence sans hâte et sans script', 'Discrétion dedans comme dehors'],
      },
      settings: {
        teaser: 'Le lieu compte moins que la porte qui se referme derrière vous.',
        overview:
          'Un domicile, une chambre d’hôtel ou une célébration privée : le décor est choisi pour que l’intimité n’ait pas de témoin. Lieu, arrivée et horaires se conviennent, et aucune adresse n’est partagée sans accord.',
        safeguards: ['Lieu et accès confirmés à l’avance', 'Horaires et départ convenus', 'Aucune adresse n’est jamais publiée'],
      },
      couples: {
        teaser: 'Trois ou quatre corps, une seule condition : que tout le monde en ait envie.',
        overview:
          'Des expériences pour couples et groupes où le désir se partage sans que personne cède par politesse. On parle d’abord avec toutes les personnes concernées, chacune pose ses limites et celles-ci sont respectées telles quelles.',
        safeguards: ['Consentement de chaque participant', 'Les limites individuelles priment sur le plan', 'N’importe qui peut arrêter, et tout s’arrête'],
      },
      wellbeing: {
        teaser: 'Baisser le bruit de la journée et ne garder que ce qui se ressent.',
        overview:
          'Des rituels de proximité, de pause et de contact faits pour être savourés, non pour être soignés : ce ne sont ni une thérapie ni un traitement. Le rythme, l’intensité et les pauses se conviennent et s’ajustent en cours de route.',
        safeguards: ['Ni thérapie ni traitement', 'Rythme et intensité convenus', 'Une pause possible à tout moment'],
      },
    },
    services: {},
  },
  it: {
    groups: {
      roleplay: {
        teaser: 'Il gioco comincia nella conversazione: la scena che immagini, detta ad alta voce prima di viverla.',
        overview:
          'Giochi di ruolo scritti in due molto prima di iniziare. Il ruolo, l’ambientazione e fin dove arriva ogni gesto si scelgono prima, e ciò che non è concordato non accade. L’intensità la decidi tu, e una sola parola ferma tutto all’istante.',
        safeguards: ['Parola di sicurezza sempre attiva', 'Ruolo, scena e accessori concordati prima', 'Nessun dolore né segno reale: solo ciò che è concordato'],
      },
      'private-preferences': {
        teaser: 'Ciò che ti piace, detto senza giri di parole e solo per chi deve saperlo.',
        overview:
          'Uno spazio per nominare gusti e limiti con la stessa naturalezza con cui si vivono. Prima si parla, poi si precisa ciò che entrambe le persone vogliono e si mette da parte il resto: nulla si dà per scontato perché compare in un elenco.',
        safeguards: ['Prima se ne parla, prima si concorda', 'Ciò che non è concordato non accade', 'Prudenza e cura in ogni momento'],
      },
      company: {
        teaser: 'Non si ricorda l’appuntamento: si ricorda come ti ha fatto sentire.',
        overview:
          'Compagnia vera: la conversazione che scorre, una mano che resta un po’ di più, la sensazione che qualcuno abbia scelto di esserci. Il ritmo lo decidi tu, e ciò che preferisci non raccontare non deve emergere.',
        safeguards: ['Aspettative chiarite prima dell’incontro', 'Presenza senza fretta e senza copione', 'Discrezione dentro e fuori'],
      },
      settings: {
        teaser: 'Il posto conta meno della porta che si chiude dietro di voi.',
        overview:
          'Una casa, una camera d’albergo o una celebrazione privata: la scena si sceglie perché l’intimità non abbia testimoni. Luogo, arrivo e orari si concordano, e nessun indirizzo si condivide senza accordo.',
        safeguards: ['Luogo e accesso confermati prima', 'Orari e uscita concordati', 'Nessun indirizzo viene mai pubblicato'],
      },
      couples: {
        teaser: 'Tre o quattro corpi, una sola condizione: che tutti ne abbiano voglia.',
        overview:
          'Esperienze per coppie e gruppi in cui il desiderio si distribuisce senza che nessuno ceda per cortesia. Si parla prima con tutte le persone coinvolte, ognuna mette sul tavolo i propri limiti e quei limiti si rispettano così come sono.',
        safeguards: ['Consenso di ogni partecipante', 'I limiti individuali vengono prima del piano', 'Chiunque può fermarsi, e tutto si ferma'],
      },
      wellbeing: {
        teaser: 'Abbassare il rumore della giornata e tenere solo ciò che si sente.',
        overview:
          'Rituali di vicinanza, pausa e contatto pensati per essere goduti, non curati: non sono terapia né alcun tipo di trattamento. Ritmo, intensità e pause si concordano e si aggiustano strada facendo.',
        safeguards: ['Non è terapia né trattamento', 'Ritmo e intensità concordati', 'Pausa disponibile in qualsiasi momento'],
      },
    },
    services: {},
  },
};

export function getWordPressServiceCopy(locale: Locale): WordPressServiceCopy {
  return copy[locale] ?? copy.es;
}
