import type { Locale } from '../../lib/i18n/locales';

/**
 * House rules, owned by the WordPress delivery.
 *
 * They are written for this business and state only what can be upheld without inventing a
 * payment policy, a venue or a health claim: respect, talking things through first, protection
 * that is not negotiated, hygiene, no recordings, no aggression, and the right of either person
 * to stop. Rates and payment are deliberately absent because they depend on the operator's
 * approved intake; they belong to the questionnaire, not to an invented rule.
 */
export type RulesCopy = { heading: string; items: readonly string[] };

export const rulesCopy: Readonly<Record<Locale, RulesCopy>> = {
  es: {
    heading: 'Normas de convivencia',
    items: [
      'Trátala como tratarías a cualquier otra persona: con educación y respeto.',
      'Di lo que te gusta y lo que no desde el principio; no se adivina.',
      'El preservativo no se negocia en las prácticas que lo requieren.',
      'Ducharse antes de la cita es cuidaros los dos.',
      'El alcohol y las drogas no ayudan, y aquí no se tolera ningún comportamiento agresivo.',
      'Si quieres alargar la cita, coméntalo con antelación.',
      'No se hacen fotos ni grabaciones, en ningún momento.',
      'Nada de lo acordado se cambia sobre la marcha sin hablarlo antes.',
      'Si algo no va bien, dilo en el momento: se puede parar, y se para.',
      'Cualquier comportamiento violento o irrespetuoso se corta y tiene consecuencias legales.',
    ],
  },
  en: {
    heading: 'House rules',
    items: [
      'Treat her as you would treat anyone else: with courtesy and respect.',
      'Say what you like and what you do not from the start; it cannot be guessed.',
      'Protection is not negotiated where it is required.',
      'Showering before the meeting is looking after both of you.',
      'Alcohol and drugs do not help, and no aggressive behaviour is tolerated here.',
      'If you want to extend the meeting, say so in advance.',
      'No photographs and no recordings, at any point.',
      'Nothing that was agreed is changed on the spot without talking it through first.',
      'If something is not right, say so at the time: it can be stopped, and it stops.',
      'Any violent or disrespectful behaviour is cut short and carries legal consequences.',
    ],
  },
  fr: {
    heading: 'Règles de conduite',
    items: [
      'Traitez-la comme vous traiteriez n’importe qui : avec courtoisie et respect.',
      'Dites ce qui vous plaît et ce qui ne vous plaît pas dès le début ; cela ne se devine pas.',
      'La protection ne se négocie pas là où elle est requise.',
      'Se doucher avant le rendez-vous, c’est prendre soin de vous deux.',
      'L’alcool et les drogues n’aident pas, et aucun comportement agressif n’est toléré ici.',
      'Si vous souhaitez prolonger le rendez-vous, dites-le à l’avance.',
      'Aucune photo et aucun enregistrement, à aucun moment.',
      'Rien de ce qui a été convenu ne se modifie sur le moment sans en parler avant.',
      'Si quelque chose ne va pas, dites-le sur-le-champ : on peut arrêter, et on arrête.',
      'Tout comportement violent ou irrespectueux est interrompu et a des conséquences juridiques.',
    ],
  },
  it: {
    heading: 'Regole di convivenza',
    items: [
      'Trattala come tratteresti chiunque altro: con educazione e rispetto.',
      'Di’ ciò che ti piace e ciò che no fin dall’inizio; non si indovina.',
      'La protezione non si negozia dove è richiesta.',
      'Fare la doccia prima dell’incontro è prendersi cura di entrambi.',
      'L’alcol e le droghe non aiutano, e qui non si tollera alcun comportamento aggressivo.',
      'Se vuoi prolungare l’incontro, dillo in anticipo.',
      'Nessuna foto e nessuna registrazione, in nessun momento.',
      'Nulla di quanto concordato si cambia sul momento senza parlarne prima.',
      'Se qualcosa non va, dillo subito: si può fermare, e si ferma.',
      'Qualsiasi comportamento violento o irrispettoso viene interrotto e ha conseguenze legali.',
    ],
  },
};

export function getRulesCopy(locale: Locale): RulesCopy {
  return rulesCopy[locale] ?? rulesCopy.es;
}
