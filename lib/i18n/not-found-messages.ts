import type { Locale } from './locales.ts';

export type NotFoundMessages = {
  eyebrow: string;
  title: string;
  body: string;
  homeLink: string;
};

// Keep this client-safe fragment deliberately small. Importing the complete
// catalogs from a client 404 would expose unreleased page copy in its bundle.
export const NOT_FOUND_MESSAGES: Readonly<Record<Locale, NotFoundMessages>> = {
  es: {
    eyebrow: 'Error 404',
    title: 'Página no encontrada',
    body: 'La página solicitada no existe o no está disponible.',
    homeLink: 'Volver al inicio',
  },
  en: {
    eyebrow: 'Error 404',
    title: 'Page not found',
    body: 'The requested page does not exist or is not available.',
    homeLink: 'Return to home',
  },
  fr: {
    eyebrow: 'Erreur 404',
    title: 'Page introuvable',
    body: "La page demandée n'existe pas ou n'est pas disponible.",
    homeLink: "Retour à l'accueil",
  },
  it: {
    eyebrow: 'Errore 404',
    title: 'Pagina non trovata',
    body: 'La pagina richiesta non esiste o non è disponibile.',
    homeLink: 'Torna alla home',
  },
};
