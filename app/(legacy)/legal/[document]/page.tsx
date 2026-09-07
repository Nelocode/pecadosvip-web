import { notFound } from 'next/navigation';

import { getRuntimeContentSnapshot } from '../../../../lib/content/runtime-snapshot';
import {
  getPublicLegalDocument,
  legalDocumentKeys,
} from '../../../../lib/content/public-legal';
import { buildPublicMetadata } from '../../../../lib/seo';
import PublicFooter from '../../../components/PublicFooter';
import PublicHeader from '../../../components/PublicHeader';

type LegalPageProps = {
  params: Promise<{ document: string }>;
};

export function generateStaticParams() {
  return Object.keys(legalDocumentKeys).map((document) => ({ document }));
}

export async function generateMetadata({ params }: LegalPageProps) {
  const { document } = await params;
  const publicDocument = getPublicLegalDocument(
    getRuntimeContentSnapshot(),
    document,
  );

  return buildPublicMetadata({
    path: `/legal/${document}`,
    title: publicDocument?.title ?? 'Información legal no publicada',
    description: publicDocument
      ? `Información legal aprobada y vigente: ${publicDocument.title}.`
      : 'La información legal todavía no está publicada.',
    forceNoIndex: !publicDocument,
  });
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { document } = await params;
  const publicDocument = getPublicLegalDocument(
    getRuntimeContentSnapshot(),
    document,
  );

  if (!publicDocument) {
    notFound();
  }

  return (
    <div className="public-page">
      <PublicHeader currentPath={`/legal/${document}`} />
      <main id="main-content" tabIndex={-1}>
        <article className="legal-page" aria-labelledby="legal-document-title">
        <p className="public-eyebrow">Información legal aprobada</p>
        <h1 id="legal-document-title">{publicDocument.title}</h1>
        <p className="legal-updated">
          Última actualización: {publicDocument.updatedAt.slice(0, 10)}
        </p>
        <div className="legal-copy">
          {publicDocument.body
            .split(/\n{2,}/)
            .filter(Boolean)
            .map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
