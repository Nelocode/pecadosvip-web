import ContactOptions from '../../components/ContactOptions';
import ProvisionalNotice from '../../components/ProvisionalNotice';
import PublicFooter from '../../components/PublicFooter';
import PublicHeader from '../../components/PublicHeader';
import { buildPublicMetadata } from '../../../lib/seo';
import { getRuntimeVisibilityState } from '../../../lib/content/runtime-publication';
import ReleaseHoldingPage from '../../components/ReleaseHoldingPage';

export const metadata = buildPublicMetadata({
  path: '/contacto',
  title: 'Contacto privado',
  description: 'Estado de los canales privados de contacto de PecadosVip.',
});

export default function ContactPage() {
  if (!getRuntimeVisibilityState().renderPublicExperience) {
    return <ReleaseHoldingPage />;
  }

  return (
    <div className="public-page">
      <PublicHeader currentPath="/contacto" />
      <main id="main-content" tabIndex={-1}>
        <ProvisionalNotice />
        <section className="contact-page" aria-labelledby="contact-page-title">
        <div>
          <p className="public-eyebrow">Contacto privado</p>
          <h1 id="contact-page-title">Comparte datos solo cuando exista un canal aprobado.</h1>
          <p>
            Esta versión no envía formularios ni almacena solicitudes. Los canales
            se activan únicamente tras validar su destino y completar las aprobaciones
            de contacto y privacidad.
          </p>
        </div>
        <ContactOptions />
        </section>
        <section className="contact-safety-note" aria-labelledby="contact-safety-title">
        <h2 id="contact-safety-title">Estado técnico</h2>
        <ul>
          <li>No hay un formulario POST activo.</li>
          <li>No se cargan SDK de analítica o mensajería desde esta página.</li>
          <li>No incluyas información sensible mientras los canales estén deshabilitados.</li>
        </ul>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
