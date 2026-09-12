import type { Locale } from '../../lib/i18n/locales';

/**
 * The first-time guide, owned by the WordPress delivery.
 *
 * It is written for this business and nothing else: the site has no premises, so every meeting
 * is an outcall to a hotel or a home, and the guide says so instead of describing a building,
 * a reception desk or a parade of companions that do not exist. It promises no rates, no
 * availability and no venue, it tells the reader that either side can stop, and it states what
 * is not offered. The text is seeded as a page, so it stays editable in the WordPress editor
 * afterwards like any other page.
 */
export type GuideCopy = {
  title: string;
  lead: string;
  sections: readonly { heading: string; body: string }[];
  limitsHeading: string;
  limits: readonly string[];
  closing: string;
};

export const guideCopy: Readonly<Record<Locale, GuideCopy>> = {
  es: {
    title: 'Primera vez con una acompañante',
    lead: 'Todo lo que conviene saber antes de tu primera cita, contado sin rodeos y sin promesas que no podamos cumplir.',
    sections: [
      {
        heading: 'Cómo funciona una cita',
        body: 'Nos escribes por un canal aprobado y hablamos antes: qué buscas, cuándo y dónde. No tenemos local propio, así que el encuentro es siempre una salida a tu hotel o a tu domicilio. El lugar, la hora y las condiciones se cierran en esa misma conversación, no después.',
      },
      {
        heading: 'Discreción de principio a fin',
        body: 'La acompañante llega sola y no se identifica ante nadie. No pedimos datos que no necesitemos, no dejamos registro de tu visita y no compartimos nada con terceros. Lo que hablamos se queda entre nosotros.',
      },
      {
        heading: 'Límites, consentimiento y salud',
        body: 'Lo que no se acuerda antes, no ocurre. Cualquiera de los dos puede parar en cualquier momento, y se para. La protección no es negociable en las prácticas que la requieren, y si tienes cualquier duda de salud la hablamos antes sin ningún problema.',
      },
    ],
    limitsHeading: 'Lo que no hacemos',
    limits: [
      'No prometemos instalaciones propias: no tenemos local.',
      'No publicamos tarifas hasta que estén aprobadas.',
      'No atendemos a personas menores de edad ni aceptamos contenido ilegal.',
      'No pedimos ni aceptamos pagos fuera del canal acordado.',
    ],
    closing: 'Si te queda cualquier duda, escríbenos antes de la cita. Preferimos contestar diez preguntas a que llegues con una.',
  },
  en: {
    title: 'Your first time with a companion',
    lead: 'What is worth knowing before your first meeting, said plainly and without promises we cannot keep.',
    sections: [
      {
        heading: 'How a meeting works',
        body: 'You write through an approved channel and we talk first: what you are looking for, when and where. We have no premises of our own, so it is always an outcall to your hotel or your home. Place, time and terms are settled in that same conversation, not afterwards.',
      },
      {
        heading: 'Discretion throughout',
        body: 'The companion arrives alone and identifies herself to no one. We do not ask for details we do not need, we keep no record of your visit and we share nothing with third parties. What we discuss stays between us.',
      },
      {
        heading: 'Limits, consent and health',
        body: 'What is not agreed beforehand does not happen. Either of you can stop at any moment, and it stops. Protection is not negotiable where it is required, and if you have any health question we talk it through beforehand.',
      },
    ],
    limitsHeading: 'What we do not do',
    limits: [
      'We do not promise premises: we have none.',
      'We do not publish rates until they are approved.',
      'We do not serve anyone under age and we do not accept illegal content.',
      'We do not ask for or accept payment outside the agreed channel.',
    ],
    closing: 'If anything is still unclear, write to us before the meeting. We would rather answer ten questions than have you arrive with one.',
  },
  fr: {
    title: 'Votre première fois avec une accompagnante',
    lead: 'Ce qu’il faut savoir avant votre premier rendez-vous, dit sans détour et sans promesses que nous ne pouvons pas tenir.',
    sections: [
      {
        heading: 'Comment se déroule un rendez-vous',
        body: 'Vous écrivez par un canal approuvé et nous parlons d’abord : ce que vous cherchez, quand et où. Nous n’avons pas de local, il s’agit donc toujours d’une sortie à votre hôtel ou à votre domicile. Le lieu, l’heure et les conditions se règlent dans cette même conversation, pas après.',
      },
      {
        heading: 'De la discrétion de bout en bout',
        body: 'L’accompagnante arrive seule et ne se présente à personne. Nous ne demandons pas de détails inutiles, nous ne conservons aucune trace de votre visite et nous ne partageons rien avec des tiers. Ce que nous nous disons reste entre nous.',
      },
      {
        heading: 'Limites, consentement et santé',
        body: 'Ce qui n’est pas convenu à l’avance n’a pas lieu. L’un comme l’autre peut arrêter à tout moment, et tout s’arrête. La protection n’est pas négociable là où elle est requise, et si vous avez la moindre question de santé, nous en parlons avant.',
      },
    ],
    limitsHeading: 'Ce que nous ne faisons pas',
    limits: [
      'Nous ne promettons pas de locaux : nous n’en avons pas.',
      'Nous ne publions pas de tarifs avant leur approbation.',
      'Nous ne recevons aucune personne mineure et n’acceptons aucun contenu illégal.',
      'Nous ne demandons ni n’acceptons de paiement hors du canal convenu.',
    ],
    closing: 'S’il reste une question, écrivez-nous avant le rendez-vous. Nous préférons répondre à dix questions que vous voir arriver avec une.',
  },
  it: {
    title: 'La tua prima volta con un’accompagnatrice',
    lead: 'Quello che conviene sapere prima del primo incontro, detto senza giri di parole e senza promesse che non possiamo mantenere.',
    sections: [
      {
        heading: 'Come funziona un incontro',
        body: 'Ci scrivi attraverso un canale approvato e prima parliamo: cosa cerchi, quando e dove. Non abbiamo un locale nostro, quindi è sempre un’uscita nel tuo hotel o a casa tua. Luogo, orario e condizioni si stabiliscono in quella stessa conversazione, non dopo.',
      },
      {
        heading: 'Discrezione dall’inizio alla fine',
        body: 'L’accompagnatrice arriva da sola e non si presenta a nessuno. Non chiediamo dettagli che non ci servono, non conserviamo traccia della tua visita e non condividiamo nulla con terzi. Ciò che ci diciamo resta tra noi.',
      },
      {
        heading: 'Limiti, consenso e salute',
        body: 'Ciò che non è concordato prima non accade. Entrambi potete fermarvi in qualsiasi momento, e tutto si ferma. La protezione non è negoziabile dove è richiesta, e se hai qualsiasi dubbio sulla salute ne parliamo prima.',
      },
    ],
    limitsHeading: 'Cosa non facciamo',
    limits: [
      'Non promettiamo locali: non ne abbiamo.',
      'Non pubblichiamo tariffe finché non sono approvate.',
      'Non riceviamo persone minorenni e non accettiamo contenuti illegali.',
      'Non chiediamo né accettiamo pagamenti fuori dal canale concordato.',
    ],
    closing: 'Se resta un dubbio, scrivici prima dell’incontro. Preferiamo rispondere a dieci domande che vederti arrivare con una.',
  },
};

export function getGuideCopy(locale: Locale): GuideCopy {
  return guideCopy[locale] ?? guideCopy.es;
}
