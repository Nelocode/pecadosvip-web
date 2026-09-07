/* eslint-disable @next/next/no-html-link-for-pages -- Vinext 1.0.0-beta.3 client navigation throws at runtime; native links are the verified fallback. */
import { parsePublicProfileSearchParams } from '../../../lib/content/public-query-params';
import { queryPublicProfiles } from '../../../lib/content/public-profiles';
import { getRuntimeContentSnapshot } from '../../../lib/content/runtime-snapshot';
import { buildPublicMetadata } from '../../../lib/seo';
import ProfileCard from '../../components/ProfileCard';
import ProvisionalNotice from '../../components/ProvisionalNotice';
import PublicFooter from '../../components/PublicFooter';
import PublicHeader from '../../components/PublicHeader';
import ReleaseHoldingPage from '../../components/ReleaseHoldingPage';
import { getRuntimeVisibilityState } from '../../../lib/content/runtime-publication';

type RawSearchParams = Record<string, string | string[] | undefined>;
type ProfileListPageProps = {
  searchParams: Promise<RawSearchParams>;
};

function toUrlSearchParams(raw: RawSearchParams): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(raw)) {
    if (Array.isArray(value)) {
      value.forEach((item) => params.append(key, item));
    } else if (value !== undefined) {
      params.append(key, value);
    }
  }
  return params;
}

export async function generateMetadata({ searchParams }: ProfileListPageProps) {
  const raw = await searchParams;
  return buildPublicMetadata({
    path: '/perfiles',
    title: 'Perfiles',
    description: 'Catálogo de perfiles publicados y aprobados de PecadosVip.',
    forceNoIndex: Object.keys(raw).length > 0,
  });
}

export default async function ProfilesPage({ searchParams }: ProfileListPageProps) {
  if (!getRuntimeVisibilityState().renderPublicExperience) {
    return <ReleaseHoldingPage />;
  }

  const parsed = parsePublicProfileSearchParams(
    toUrlSearchParams(await searchParams),
  );
  const result = parsed.ok
    ? queryPublicProfiles(getRuntimeContentSnapshot(), parsed.query)
    : undefined;
  const query = parsed.ok ? parsed.query : {};
  const hasActiveFilters = Object.keys(query).length > 0;

  return (
    <div className="public-page">
      <PublicHeader currentPath="/perfiles" />
      <main id="main-content" tabIndex={-1}>
        <ProvisionalNotice />

      <section className="catalog-hero" aria-labelledby="catalog-title">
        <p className="public-eyebrow">Catálogo protegido</p>
        <h1 id="catalog-title">Perfiles</h1>
        <p>
          Los filtros operan sobre contenido publicable. Los borradores y registros
          sin evidencia nunca aparecen en esta ruta.
        </p>
      </section>

        <form className="profile-filters" action="/perfiles" method="get">
          <fieldset>
            <legend>Filtros del catálogo</legend>
            <p className="profile-filter-help" id="profile-filter-help">
              La edad debe estar entre 18 y 99 años. La edad mínima no puede
              superar la máxima.
            </p>
            <label htmlFor="profile-city">
              Ciudad
              <select id="profile-city" name="city" defaultValue={query.city ?? ''}>
                <option value="">Todas</option>
                <option value="madrid">Madrid</option>
                <option value="barcelona">Barcelona</option>
              </select>
            </label>
            <label htmlFor="profile-availability">
              Disponibilidad
              <select
                id="profile-availability"
                name="availability"
                defaultValue={query.availability ?? ''}
              >
                <option value="">Todas</option>
                <option value="available">Disponible</option>
                <option value="limited">Limitada</option>
                <option value="on-request">Bajo consulta</option>
                <option value="unavailable">No disponible</option>
              </select>
            </label>
            <label htmlFor="profile-min-age">
              Edad mínima
              <input
                id="profile-min-age"
                name="minAge"
                type="number"
                inputMode="numeric"
                min="18"
                max="99"
                aria-describedby="profile-filter-help"
                defaultValue={query.minAge}
              />
            </label>
            <label htmlFor="profile-max-age">
              Edad máxima
              <input
                id="profile-max-age"
                name="maxAge"
                type="number"
                inputMode="numeric"
                min="18"
                max="99"
                aria-describedby="profile-filter-help"
                defaultValue={query.maxAge}
              />
            </label>
            <button type="submit">Aplicar filtros</button>
          </fieldset>
        </form>

        <section className="catalog-results" aria-labelledby="results-title">
        <div className="catalog-results-heading">
          <h2 id="results-title">Resultados</h2>
          {result?.ok ? (
            <span role="status">
              {result.total} {result.total === 1 ? 'perfil' : 'perfiles'}
            </span>
          ) : null}
        </div>

        {!parsed.ok ? (
          <div className="public-empty-state public-empty-state-error" role="alert">
            <strong>Los filtros no son válidos.</strong>
            <p>No se consultó ni expuso contenido. Restablece los filtros para continuar.</p>
            <a href="/perfiles">Restablecer filtros</a>
          </div>
        ) : result?.ok && result.items.length > 0 ? (
          <div className="profile-grid">
            {result.items.map((profile) => (
              <ProfileCard profile={profile} key={profile.slug} />
            ))}
          </div>
        ) : hasActiveFilters ? (
          <div className="public-empty-state" role="status">
            <strong>No hay perfiles para estos filtros.</strong>
            <p>Cambia los criterios o restablece los filtros para ver el catálogo completo.</p>
            <a href="/perfiles">Restablecer filtros</a>
          </div>
        ) : (
          <div className="public-empty-state" role="status">
            <strong>El catálogo aún no está publicado.</strong>
            <p>
              No existen perfiles que hayan superado conjuntamente los controles de
              contenido, edad, consentimiento, derechos y release.
            </p>
          </div>
        )}
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
