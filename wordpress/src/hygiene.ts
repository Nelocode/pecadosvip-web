import type { Locale } from '../../lib/i18n/locales';

/**
 * Hygiene and safety, owned by the WordPress delivery.
 *
 * Stated without a single claim that cannot be upheld: no medical check-ups, no health guarantee,
 * no "certified" hygiene company. Protection is stated as non-negotiable, showering as part of
 * looking after both people, and any health question is directed to the conversation beforehand and
 * to each person's own doctor. Claiming regular medical testing or certified hygiene on someone
 * else's behalf would be exactly the kind of borrowed assertion this delivery refuses to publish.
 */
export type HygieneCopy = { heading: string; items: readonly string[] };

export const hygieneCopy: Readonly<Record<Locale, HygieneCopy>> = {
  es: {
    heading: 'Higiene y seguridad',
    items: [
      'La protección no se negocia en las prácticas que la requieren.',
      'Ducharse antes de la cita es parte de cuidaros los dos.',
      'Si tienes cualquier duda de salud, plantéala antes: preferimos hablarlo a suponerlo.',
      'No damos ni pedimos garantías médicas: eso corresponde a cada persona y a su médico.',
    ],
  },
  en: {
    heading: 'Hygiene and safety',
    items: [
      'Protection is not negotiated where it is required.',
      'Showering before the meeting is part of looking after both of you.',
      'If you have any health question, raise it beforehand: we would rather talk it through than assume.',
      'We neither give nor ask for medical guarantees: that belongs to each person and their doctor.',
    ],
  },
  fr: {
    heading: 'Hygiène et sécurité',
    items: [
      'La protection ne se négocie pas là où elle est requise.',
      'Se doucher avant le rendez-vous fait partie du soin que vous vous portez tous les deux.',
      'Si vous avez une question de santé, posez-la avant : nous préférons en parler plutôt que de supposer.',
      'Nous ne donnons ni ne demandons de garantie médicale : cela relève de chaque personne et de son médecin.',
    ],
  },
  it: {
    heading: 'Igiene e sicurezza',
    items: [
      'La protezione non si negozia dove è richiesta.',
      'Fare la doccia prima dell’incontro fa parte dell’aver cura di entrambi.',
      'Se hai qualsiasi dubbio sulla salute, sollevalo prima: preferiamo parlarne che darlo per scontato.',
      'Non diamo né chiediamo garanzie mediche: riguardano ogni persona e il suo medico.',
    ],
  },
};

export function getHygieneCopy(locale: Locale): HygieneCopy {
  return hygieneCopy[locale] ?? hygieneCopy.es;
}
