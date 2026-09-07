import type { Metadata } from 'next';
import { getRuntimePublicationState } from '../../lib/content/runtime-publication';
import { siteConfig } from '../../lib/site-config';
import '../globals.css';
import '../theme.css';
import '../public-site.css';

const runtimeReleaseReady = getRuntimePublicationState().release.ok;
const publicationEnabled = Boolean(
  siteConfig.indexingEnabled && runtimeReleaseReady && siteConfig.origin,
);
const socialImageUrl = publicationEnabled && siteConfig.origin
  ? new URL('/og.png', siteConfig.origin).toString()
  : undefined;
const defaultTitle = runtimeReleaseReady
  ? 'PecadosVip | Compañía privada en Madrid y Barcelona'
  : 'PecadosVip | Sitio en preparación';
const defaultDescription = runtimeReleaseReady
  ? 'Servicio de compañía privada con desplazamiento a domicilios y hoteles en Madrid y Barcelona. Atención discreta y personalizada.'
  : 'Versión no publicada. El contenido y los canales permanecen cerrados hasta completar las aprobaciones del release.';

export const metadata: Metadata = {
  ...(publicationEnabled && siteConfig.origin
    ? { metadataBase: new URL(siteConfig.origin) }
    : {}),
  title: {
    default: defaultTitle,
    template: '%s | PecadosVip',
  },
  description: defaultDescription,
  ...(runtimeReleaseReady
    ? {
        keywords: [
          'compañía privada Madrid',
          'compañía privada Barcelona',
          'servicio a hoteles',
          'atención a domicilio',
          'PecadosVip',
        ],
      }
    : {}),
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    siteName: 'PecadosVip',
    locale: 'es',
    type: 'website',
    ...(socialImageUrl
      ? {
          images: [
            {
              url: socialImageUrl,
              width: 1200,
              height: 630,
              alt: 'PecadosVip Madrid y Barcelona',
            },
          ],
        }
      : {}),
  },
  twitter: {
    card: 'summary_large_image',
    title: defaultTitle,
    description: defaultDescription,
    ...(socialImageUrl ? { images: [socialImageUrl] } : {}),
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        <a className="skip-link" href="#main-content">Saltar al contenido principal</a>
        {children}
      </body>
    </html>
  );
}
