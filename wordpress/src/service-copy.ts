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
    },
    services: {},
  },
};

export function getWordPressServiceCopy(locale: Locale): WordPressServiceCopy {
  return copy[locale] ?? copy.es;
}
