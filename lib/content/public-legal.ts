import { evaluateRelease } from './release-gates.ts';
import type { ContentSnapshot, LegalDocument } from './types.ts';

export const legalDocumentKeys = {
  'aviso-legal': 'legalNotice',
  privacidad: 'privacy',
  cookies: 'cookies',
  'terminos-del-servicio': 'serviceTerms',
} as const;

export type LegalDocumentSlug = keyof typeof legalDocumentKeys;

export type PublicLegalLink = {
  href: `/legal/${LegalDocumentSlug}`;
  title: string;
};

export function isLegalDocumentSlug(value: string): value is LegalDocumentSlug {
  return Object.hasOwn(legalDocumentKeys, value);
}

export function getPublicLegalDocument(
  snapshot: ContentSnapshot,
  slug: string,
): LegalDocument | undefined {
  if (!evaluateRelease(snapshot).ok || !isLegalDocumentSlug(slug)) {
    return undefined;
  }

  const document = snapshot.settings.legal[legalDocumentKeys[slug]];
  return structuredClone(document);
}

export function getPublicLegalLinks(
  snapshot: ContentSnapshot,
): PublicLegalLink[] {
  if (!evaluateRelease(snapshot).ok) return [];

  return (Object.keys(legalDocumentKeys) as LegalDocumentSlug[]).map((slug) => ({
    href: `/legal/${slug}`,
    title: snapshot.settings.legal[legalDocumentKeys[slug]].title,
  }));
}
