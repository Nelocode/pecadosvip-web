import type { Locale } from '../../lib/i18n/locales';

/**
 * Frequently asked questions, owned by the WordPress delivery.
 *
 * Written for this business: the site has no premises, so the first answer says so instead of
 * describing facilities. The answers state only what can be upheld — an outcall model, discretion,
 * prior agreement, protection that is not negotiable, no minors, no illegal content — and the
 * answer about photographs claims nothing about authenticity beyond what each companion chooses to
 * publish, because the site identifies the content that was generated with AI. Rates are not
 * invented: they appear when they are approved.
 */
export type FaqCopy = { title: string; lead: string; entries: readonly { question: string; answer: string }[] };

export const faqCopy: Readonly<Record<Locale, FaqCopy>> = {
  es: {
    title: 'Preguntas frecuentes',
    lead: 'Lo que más nos preguntáis antes de una primera cita, respondido sin rodeos.',
    entries: [
      { question: '¿Tenéis local propio?', answer: 'No. Trabajamos únicamente con salidas: la acompañante acude a tu hotel o a tu domicilio.' },
      { question: '¿Cómo pido una cita?', answer: 'Por un canal de contacto aprobado. Hablamos antes para concretar el lugar, la hora y las condiciones, y no se da nada por supuesto.' },
      { question: '¿Es discreto?', answer: 'Sí. La acompañante llega sola y no se identifica ante nadie, no pedimos datos que no necesitemos y no guardamos registro de tu visita.' },
      { question: '¿Cuánto cuesta?', answer: 'Cada acompañante fija sus propias tarifas. Se publican cuando están aprobadas; mientras tanto, pregúntanos por el canal de contacto.' },
      { question: '¿Qué incluye la cita?', answer: 'Lo que se acuerde antes. Se habla con claridad en la conversación previa, y lo que no se acuerda no ocurre.' },
      { question: '¿Puedo parar o cambiar algo durante la cita?', answer: 'Sí, en cualquier momento y sin tener que justificarte. Basta con decirlo.' },
      { question: '¿Se usa protección?', answer: 'Sí, y no es negociable en las prácticas que la requieren.' },
      { question: '¿Las fotos son reales?', answer: 'Publicamos lo que cada acompañante decide mostrar, y algunas no muestran la cara por privacidad. El contenido que se ha generado con IA aparece identificado como tal.' },
      { question: '¿Atendéis a menores de edad?', answer: 'No, en ningún caso, y tampoco aceptamos contenido ilegal.' },
    ],
  },
  en: {
    title: 'Frequently asked questions',
    lead: 'What we are asked most before a first meeting, answered plainly.',
    entries: [
      { question: 'Do you have your own premises?', answer: 'No. We work on outcalls only: the companion comes to your hotel or your home.' },
      { question: 'How do I arrange a meeting?', answer: 'Through an approved contact channel. We talk first to settle the place, the time and the terms, and nothing is taken for granted.' },
      { question: 'Is it discreet?', answer: 'Yes. The companion arrives alone and identifies herself to no one, we do not ask for details we do not need, and we keep no record of your visit.' },
      { question: 'How much does it cost?', answer: 'Each companion sets her own rates. They are published once they are approved; until then, ask us through the contact channel.' },
      { question: 'What does a meeting include?', answer: 'What is agreed beforehand. It is talked through clearly in advance, and what is not agreed does not happen.' },
      { question: 'Can I stop or change something during the meeting?', answer: 'Yes, at any moment and without having to justify it. Saying so is enough.' },
      { question: 'Is protection used?', answer: 'Yes, and it is not negotiable where it is required.' },
      { question: 'Are the photographs real?', answer: 'We publish what each companion chooses to show, and some do not show their face for privacy. Content generated with AI is identified as such.' },
      { question: 'Do you serve anyone under age?', answer: 'No, never, and we do not accept illegal content either.' },
    ],
  },
  fr: {
    title: 'Questions fréquentes',
    lead: 'Ce qu’on nous demande le plus avant un premier rendez-vous, sans détour.',
    entries: [
      { question: 'Avez-vous un local ?', answer: 'Non. Nous travaillons uniquement en sortie : l’accompagnante vient à votre hôtel ou à votre domicile.' },
      { question: 'Comment demander un rendez-vous ?', answer: 'Par un canal de contact approuvé. Nous parlons d’abord pour fixer le lieu, l’heure et les conditions, et rien n’est tenu pour acquis.' },
      { question: 'Est-ce discret ?', answer: 'Oui. L’accompagnante arrive seule et ne se présente à personne, nous ne demandons pas de détails inutiles et nous ne conservons aucune trace de votre visite.' },
      { question: 'Combien cela coûte ?', answer: 'Chaque accompagnante fixe ses propres tarifs. Ils sont publiés une fois approuvés ; en attendant, demandez-nous par le canal de contact.' },
      { question: 'Que comprend un rendez-vous ?', answer: 'Ce qui est convenu à l’avance. On en parle clairement avant, et ce qui n’est pas convenu n’a pas lieu.' },
      { question: 'Puis-je arrêter ou changer quelque chose pendant le rendez-vous ?', answer: 'Oui, à tout moment et sans avoir à vous justifier. Le dire suffit.' },
      { question: 'La protection est-elle utilisée ?', answer: 'Oui, et elle n’est pas négociable là où elle est requise.' },
      { question: 'Les photos sont-elles réelles ?', answer: 'Nous publions ce que chaque accompagnante choisit de montrer, et certaines ne montrent pas leur visage par discrétion. Le contenu généré par IA est identifié comme tel.' },
      { question: 'Recevez-vous des personnes mineures ?', answer: 'Non, en aucun cas, et nous n’acceptons pas non plus de contenu illégal.' },
    ],
  },
  it: {
    title: 'Domande frequenti',
    lead: 'Quello che ci chiedete più spesso prima di un primo incontro, detto senza giri di parole.',
    entries: [
      { question: 'Avete un locale vostro?', answer: 'No. Lavoriamo solo in uscita: l’accompagnatrice viene nel tuo hotel o a casa tua.' },
      { question: 'Come chiedo un appuntamento?', answer: 'Attraverso un canale di contatto approvato. Prima parliamo per stabilire luogo, orario e condizioni, e nulla si dà per scontato.' },
      { question: 'È discreto?', answer: 'Sì. L’accompagnatrice arriva da sola e non si presenta a nessuno, non chiediamo dettagli che non ci servono e non conserviamo traccia della tua visita.' },
      { question: 'Quanto costa?', answer: 'Ogni accompagnatrice fissa le proprie tariffe. Si pubblicano quando sono approvate; nel frattempo chiedici attraverso il canale di contatto.' },
      { question: 'Cosa comprende un incontro?', answer: 'Ciò che si concorda prima. Se ne parla con chiarezza in anticipo, e ciò che non è concordato non accade.' },
      { question: 'Posso fermare o cambiare qualcosa durante l’incontro?', answer: 'Sì, in qualsiasi momento e senza doverti giustificare. Basta dirlo.' },
      { question: 'Si usa la protezione?', answer: 'Sì, e non è negoziabile dove è richiesta.' },
      { question: 'Le foto sono reali?', answer: 'Pubblichiamo ciò che ogni accompagnatrice sceglie di mostrare, e alcune non mostrano il volto per privacy. I contenuti generati con IA sono identificati come tali.' },
      { question: 'Ricevete persone minorenni?', answer: 'No, in nessun caso, e non accettiamo nemmeno contenuti illegali.' },
    ],
  },
};

export function getFaqCopy(locale: Locale): FaqCopy {
  return faqCopy[locale] ?? faqCopy.es;
}
