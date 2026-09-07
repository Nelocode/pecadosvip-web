import { notFound } from 'next/navigation';

import { getRuntimeContentSnapshot } from '../../../../lib/content/runtime-snapshot';
import {
  getPublicLegalDocument,
  isLegalDocumentSlug,
  legalDocumentKeys,
} from '../../../../lib/content/public-legal';
import { getRuntimeVisibilityState } from '../../../../lib/content/runtime-publication';
import { getCatalog, interpolate } from '../../../../lib/i18n/catalog';
import { SOURCE_LOCALE } from '../../../../lib/i18n/locales';
import { buildLocalizedPublicMetadata } from '../../../../lib/seo';
import PublicFooter from '../../../components/PublicFooter';
import PublicHeader from '../../../components/PublicHeader';
import ReleaseHoldingPage from '../../../components/ReleaseHoldingPage';
import { localeOrNotFound } from '../../../locale-routing';

type Props = {
  params: Promise<{ locale: string; document: string }>;
};

export function generateStaticParams() {
  return Object.keys(legalDocumentKeys).map((document) => ({ document }));
}

export async function generateMetadata({ params }: Props) {
  const { locale: rawLocale, document } = await params;
  const locale = localeOrNotFound(rawLocale);
  if (!isLegalDocumentSlug(document)) notFound();
  const messages = getCatalog(locale).meta.legal;
  const publicDocument = locale === SOURCE_LOCALE
    ? getPublicLegalDocument(getRuntimeContentSnapshot(), document)
    : undefined;

  return buildLocalizedPublicMetadata({
    locale,
    semanticPath: `/legal/${document}`,
    title: publicDocument?.title ?? messages.unpublishedTitle,
    description: publicDocument
      ? interpolate(messages.publishedDescription, { title: publicDocument.title })
      : messages.unpublishedDescription,
    forceNoIndex: !publicDocument,
    languageAlternates: false,
  });
}

export default async function LegalPage({ params }: Props) {
  const { locale: rawLocale, document } = await params;
  const locale = localeOrNotFound(rawLocale);
  if (!isLegalDocumentSlug(document)) notFound();
  if (!getRuntimeVisibilityState().renderPublicExperience) {
    return (
      <ReleaseHoldingPage
        locale={locale}
        semanticPath={`/legal/${document}`}
      />
    );
  }
  if (locale !== SOURCE_LOCALE) {
    return (
      <ReleaseHoldingPage
        locale={locale}
        semanticPath={`/legal/${document}`}
      />
    );
  }

  const publicDocument = getPublicLegalDocument(
    getRuntimeContentSnapshot(),
    document,
  );
  if (!publicDocument) notFound();
  const messages = getCatalog(locale).legal;

  return (
    <div className="public-page">
      <PublicHeader currentPath={`/legal/${document}`} locale={locale} />
      <main id="main-content" tabIndex={-1}>
        <article className="legal-page" aria-labelledby="legal-document-title">
          <p className="public-eyebrow">{messages.approvedEyebrow}</p>
          <h1 id="legal-document-title">{publicDocument.title}</h1>
          <p className="legal-updated">
            {interpolate(messages.updatedLabel, {
              date: publicDocument.updatedAt.slice(0, 10),
            })}
          </p>
          <div className="legal-copy">
            {publicDocument.body
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </article>
      </main>
      <PublicFooter locale={locale} />
    </div>
  );
}
