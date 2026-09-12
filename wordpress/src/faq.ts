import type { Locale } from '../../lib/i18n/locales';

/**
 * Frequently asked questions and the notes published with them, owned by the WordPress delivery.
 *
 * Written for this business: the site has no premises, so the first answer says so instead of
 * describing facilities. Every answer states only what can be upheld. Rates, payment methods,
 * medical checks and any data-protection promise are deliberately absent or left open, because
 * they depend on the operator's approved intake and on a privacy policy that is still unpublished;
 * the answer about personal data says exactly that instead of inventing a guarantee.
 */
export type FaqCopy = { title: string; lead: string; notesHeading: string; notes: readonly string[]; entries: readonly { question: string; answer: string }[] };

export const faqCopy: Readonly<Record<Locale, FaqCopy>> = {
  es: {
    title: 'Preguntas frecuentes',
    lead: 'Lo que más nos preguntáis antes de una primera cita, respondido sin rodeos.',
    notesHeading: 'Notas importantes',
    notes: [
      'No tenemos local propio: cada cita es una salida a tu hotel o a tu domicilio.',
      'No publicamos tarifas hasta que estén aprobadas.',
      'Las fotos se publican con el consentimiento de cada acompañante, y el contenido generado con IA va identificado como tal.',
      'No atendemos a personas menores de edad y no aceptamos contenido ilegal.',
      'La política de privacidad se publicará con el detalle de qué datos se tratan y durante cuánto tiempo.',
    ],
    entries: [
      { question: '¿Tenéis local propio?', answer: 'No. Trabajamos únicamente con salidas: la acompañante acude a tu hotel o a tu domicilio.' },
      { question: '¿Cómo pido una cita?', answer: 'Por un canal de contacto aprobado. Hablamos antes para concretar el lugar, la hora y las condiciones, y no se da nada por supuesto.' },
      { question: '¿Con cuánta antelación conviene pedirla?', answer: 'Cuanto antes, mejor: la disponibilidad se confirma por el canal de contacto y depende del día.' },
      { question: '¿Puedo elegir con quién?', answer: 'Sí. Puedes ver el catálogo y los perfiles, y concretar tu elección en la conversación previa.' },
      { question: '¿Es discreto?', answer: 'Sí. La acompañante llega sola y no se identifica ante nadie, no pedimos datos que no necesitemos y no guardamos registro de tu visita.' },
      { question: '¿Cuánto cuesta?', answer: 'Cada acompañante fija sus propias tarifas. Se publican cuando están aprobadas; mientras tanto, pregúntanos por el canal de contacto.' },
      { question: '¿Qué incluye la cita?', answer: 'Lo que se acuerde antes. Se habla con claridad en la conversación previa, y lo que no se acuerda no ocurre.' },
      { question: '¿Puedo alargar la cita?', answer: 'Puedes pedirlo durante el encuentro; depende de la disponibilidad de ese momento.' },
      { question: '¿Puedo parar o cambiar algo durante la cita?', answer: 'Sí, en cualquier momento y sin tener que justificarte. Basta con decirlo.' },
      { question: '¿Se usa protección?', answer: 'Sí, y no es negociable en las prácticas que la requieren.' },
      { question: '¿Qué pasa si algo no va bien?', answer: 'Dilo en el momento: se puede parar, y se para. También puedes avisarnos por el canal de reporte.' },
      { question: '¿Las fotos son reales?', answer: 'Publicamos lo que cada acompañante decide mostrar, y algunas no muestran la cara por privacidad. El contenido generado con IA aparece identificado como tal.' },
      { question: '¿Qué datos míos guardáis?', answer: 'La política de privacidad todavía no está publicada. Cuando lo esté dirá exactamente qué se trata, con qué finalidad y durante cuánto tiempo.' },
      { question: '¿Atendéis a menores de edad?', answer: 'No, en ningún caso, y tampoco aceptamos contenido ilegal.' },
      { question: '¿Y si no sé por dónde empezar?', answer: 'Dínoslo por el canal de contacto. Para eso está la guía de primera vez, y para eso preguntamos antes de nada.' },
    ],
  },
  en: {
    title: 'Frequently asked questions',
    lead: 'What we are asked most before a first meeting, answered plainly.',
    notesHeading: 'Important notes',
    notes: [
      'We have no premises of our own: every meeting is an outcall to your hotel or your home.',
      'We do not publish rates until they are approved.',
      'Photographs are published with each companion’s consent, and content generated with AI is identified as such.',
      'We do not serve anyone under age and we do not accept illegal content.',
      'The privacy policy will be published with the detail of what data is processed and for how long.',
    ],
    entries: [
      { question: 'Do you have your own premises?', answer: 'No. We work on outcalls only: the companion comes to your hotel or your home.' },
      { question: 'How do I arrange a meeting?', answer: 'Through an approved contact channel. We talk first to settle the place, the time and the terms, and nothing is taken for granted.' },
      { question: 'How far in advance should I ask?', answer: 'The earlier the better: availability is confirmed through the contact channel and depends on the day.' },
      { question: 'Can I choose who I meet?', answer: 'Yes. You can browse the catalogue and the profiles, and settle your choice in the conversation beforehand.' },
      { question: 'Is it discreet?', answer: 'Yes. The companion arrives alone and identifies herself to no one, we do not ask for details we do not need, and we keep no record of your visit.' },
      { question: 'How much does it cost?', answer: 'Each companion sets her own rates. They are published once they are approved; until then, ask us through the contact channel.' },
      { question: 'What does a meeting include?', answer: 'What is agreed beforehand. It is talked through clearly in advance, and what is not agreed does not happen.' },
      { question: 'Can I extend the meeting?', answer: 'You can ask during the meeting; it depends on availability at that moment.' },
      { question: 'Can I stop or change something during the meeting?', answer: 'Yes, at any moment and without having to justify it. Saying so is enough.' },
      { question: 'Is protection used?', answer: 'Yes, and it is not negotiable where it is required.' },
      { question: 'What if something is not right?', answer: 'Say so at the time: it can be stopped, and it stops. You can also tell us through the reporting channel.' },
      { question: 'Are the photographs real?', answer: 'We publish what each companion chooses to show, and some do not show their face for privacy. Content generated with AI is identified as such.' },
      { question: 'What data of mine do you keep?', answer: 'The privacy policy is not published yet. When it is, it will state exactly what is processed, for what purpose and for how long.' },
      { question: 'Do you serve anyone under age?', answer: 'No, never, and we do not accept illegal content either.' },
      { question: 'What if I do not know where to start?', answer: 'Tell us through the contact channel. That is what the first-time guide is for, and why we ask before anything else.' },
    ],
  },
  fr: {
    title: 'Questions fréquentes',
    lead: 'Ce qu’on nous demande le plus avant un premier rendez-vous, sans détour.',
    notesHeading: 'Notes importantes',
    notes: [
      'Nous n’avons pas de local : chaque rendez-vous est une sortie à votre hôtel ou à votre domicile.',
      'Nous ne publions pas de tarifs avant leur approbation.',
      'Les photos sont publiées avec le consentement de chaque accompagnante, et le contenu généré par IA est identifié comme tel.',
      'Nous ne recevons aucune personne mineure et nous n’acceptons aucun contenu illégal.',
      'La politique de confidentialité sera publiée avec le détail des données traitées et de leur durée de conservation.',
    ],
    entries: [
      { question: 'Avez-vous un local ?', answer: 'Non. Nous travaillons uniquement en sortie : l’accompagnante vient à votre hôtel ou à votre domicile.' },
      { question: 'Comment demander un rendez-vous ?', answer: 'Par un canal de contact approuvé. Nous parlons d’abord pour fixer le lieu, l’heure et les conditions, et rien n’est tenu pour acquis.' },
      { question: 'Combien de temps à l’avance faut-il demander ?', answer: 'Le plus tôt possible : la disponibilité se confirme par le canal de contact et dépend du jour.' },
      { question: 'Puis-je choisir avec qui ?', answer: 'Oui. Vous pouvez parcourir le catalogue et les profils, et arrêter votre choix lors de l’échange préalable.' },
      { question: 'Est-ce discret ?', answer: 'Oui. L’accompagnante arrive seule et ne se présente à personne, nous ne demandons pas de détails inutiles et nous ne conservons aucune trace de votre visite.' },
      { question: 'Combien cela coûte ?', answer: 'Chaque accompagnante fixe ses propres tarifs. Ils sont publiés une fois approuvés ; en attendant, demandez-nous par le canal de contact.' },
      { question: 'Que comprend un rendez-vous ?', answer: 'Ce qui est convenu à l’avance. On en parle clairement avant, et ce qui n’est pas convenu n’a pas lieu.' },
      { question: 'Puis-je prolonger le rendez-vous ?', answer: 'Vous pouvez le demander pendant le rendez-vous ; cela dépend de la disponibilité du moment.' },
      { question: 'Puis-je arrêter ou changer quelque chose pendant le rendez-vous ?', answer: 'Oui, à tout moment et sans avoir à vous justifier. Le dire suffit.' },
      { question: 'La protection est-elle utilisée ?', answer: 'Oui, et elle n’est pas négociable là où elle est requise.' },
      { question: 'Et si quelque chose ne va pas ?', answer: 'Dites-le sur-le-champ : on peut arrêter, et on arrête. Vous pouvez aussi nous le signaler par le canal de signalement.' },
      { question: 'Les photos sont-elles réelles ?', answer: 'Nous publions ce que chaque accompagnante choisit de montrer, et certaines ne montrent pas leur visage par discrétion. Le contenu généré par IA est identifié comme tel.' },
      { question: 'Quelles données conservez-vous ?', answer: 'La politique de confidentialité n’est pas encore publiée. Quand elle le sera, elle précisera ce qui est traité, dans quel but et pendant combien de temps.' },
      { question: 'Recevez-vous des personnes mineures ?', answer: 'Non, en aucun cas, et nous n’acceptons pas non plus de contenu illégal.' },
      { question: 'Et si je ne sais pas par où commencer ?', answer: 'Dites-le-nous par le canal de contact. C’est le rôle du guide de première fois, et c’est pourquoi nous posons des questions avant tout.' },
    ],
  },
  it: {
    title: 'Domande frequenti',
    lead: 'Quello che ci chiedete più spesso prima di un primo incontro, detto senza giri di parole.',
    notesHeading: 'Note importanti',
    notes: [
      'Non abbiamo un locale nostro: ogni incontro è un’uscita nel tuo hotel o a casa tua.',
      'Non pubblichiamo tariffe finché non sono approvate.',
      'Le foto si pubblicano con il consenso di ogni accompagnatrice, e i contenuti generati con IA sono identificati come tali.',
      'Non riceviamo persone minorenni e non accettiamo contenuti illegali.',
      'L’informativa sulla privacy sarà pubblicata con il dettaglio dei dati trattati e della durata di conservazione.',
    ],
    entries: [
      { question: 'Avete un locale vostro?', answer: 'No. Lavoriamo solo in uscita: l’accompagnatrice viene nel tuo hotel o a casa tua.' },
      { question: 'Come chiedo un appuntamento?', answer: 'Attraverso un canale di contatto approvato. Prima parliamo per stabilire luogo, orario e condizioni, e nulla si dà per scontato.' },
      { question: 'Con quanto anticipo conviene chiederlo?', answer: 'Prima è, meglio è: la disponibilità si conferma attraverso il canale di contatto e dipende dal giorno.' },
      { question: 'Posso scegliere con chi?', answer: 'Sì. Puoi consultare il catalogo e i profili e definire la tua scelta nella conversazione preliminare.' },
      { question: 'È discreto?', answer: 'Sì. L’accompagnatrice arriva da sola e non si presenta a nessuno, non chiediamo dettagli che non ci servono e non conserviamo traccia della tua visita.' },
      { question: 'Quanto costa?', answer: 'Ogni accompagnatrice fissa le proprie tariffe. Si pubblicano quando sono approvate; nel frattempo chiedici attraverso il canale di contatto.' },
      { question: 'Cosa comprende un incontro?', answer: 'Ciò che si concorda prima. Se ne parla con chiarezza in anticipo, e ciò che non è concordato non accade.' },
      { question: 'Posso prolungare l’incontro?', answer: 'Puoi chiederlo durante l’incontro; dipende dalla disponibilità di quel momento.' },
      { question: 'Posso fermare o cambiare qualcosa durante l’incontro?', answer: 'Sì, in qualsiasi momento e senza doverti giustificare. Basta dirlo.' },
      { question: 'Si usa la protezione?', answer: 'Sì, e non è negoziabile dove è richiesta.' },
      { question: 'E se qualcosa non va bene?', answer: 'Dillo subito: si può fermare, e si ferma. Puoi anche segnalarcelo attraverso il canale di segnalazione.' },
      { question: 'Le foto sono reali?', answer: 'Pubblichiamo ciò che ogni accompagnatrice sceglie di mostrare, e alcune non mostrano il volto per privacy. I contenuti generati con IA sono identificati come tali.' },
      { question: 'Quali miei dati conservate?', answer: 'L’informativa sulla privacy non è ancora pubblicata. Quando lo sarà, indicherà esattamente cosa si tratta, per quale finalità e per quanto tempo.' },
      { question: 'Ricevete persone minorenni?', answer: 'No, in nessun caso, e non accettiamo nemmeno contenuti illegali.' },
      { question: 'E se non so da dove cominciare?', answer: 'Dircelo attraverso il canale di contatto. La guida per la prima volta serve a questo, ed è per questo che chiediamo prima di tutto.' },
    ],
  },
};

export function getFaqCopy(locale: Locale): FaqCopy {
  return faqCopy[locale] ?? faqCopy.es;
}
