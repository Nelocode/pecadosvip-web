import { notFound } from 'next/navigation';

import { getPublicProfileDetail } from '../../../../lib/content/public-profiles';
import { getRuntimeContentSnapshot } from '../../../../lib/content/runtime-snapshot';
import { buildPublicMetadata } from '../../../../lib/seo';
import ContactOptions from '../../../components/ContactOptions';
import ProvisionalNotice from '../../../components/ProvisionalNotice';
import PublicFooter from '../../../components/PublicFooter';
import PublicHeader from '../../../components/PublicHeader';
import PublicProfileMedia from '../../../components/PublicProfileMedia';
import ReleaseHoldingPage from '../../../components/ReleaseHoldingPage';
import { getRuntimeVisibilityState } from '../../../../lib/content/runtime-publication';

type ProfileDetailPageProps = {
  params: Promise<{ slug: string }>;
};

const measurementPresentation: Record<string, { label: string; unit: string }> = {
  heightCm: { label: 'Altura', unit: 'cm' },
  weightKg: { label: 'Peso', unit: 'kg' },
  bustCm: { label: 'Busto', unit: 'cm' },
  waistCm: { label: 'Cintura', unit: 'cm' },
  hipsCm: { label: 'Cadera', unit: 'cm' },
};

export async function generateMetadata({ params }: ProfileDetailPageProps) {
  const { slug } = await params;
  const profile = getPublicProfileDetail(getRuntimeContentSnapshot(), slug);
  if (!profile) {
    return buildPublicMetadata({
      path: `/perfiles/${slug}`,
      title: 'Perfil no disponible',
      description: 'El perfil solicitado no está publicado.',
      forceNoIndex: true,
    });
  }

  return buildPublicMetadata({
    path: `/perfiles/${profile.slug}`,
    title: profile.displayName,
    description: profile.biography,
    imageAlt: profile.cover.alt,
  });
}

export default async function ProfileDetailPage({ params }: ProfileDetailPageProps) {
  if (!getRuntimeVisibilityState().renderPublicExperience) {
    return <ReleaseHoldingPage />;
  }

  const { slug } = await params;
  const profile = getPublicProfileDetail(getRuntimeContentSnapshot(), slug);
  if (!profile) notFound();

  const measurements = Object.entries(profile.measurements).filter(
    ([, value]) => value !== undefined,
  );

  return (
    <div className="public-page">
      <PublicHeader currentPath={`/perfiles/${profile.slug}`} />
      <main id="main-content" tabIndex={-1}>
        <ProvisionalNotice />
        <article className="profile-detail" aria-labelledby="profile-detail-title">
        <section
          className="profile-detail-media"
          aria-label={`Galería de ${profile.displayName}`}
        >
          {profile.media.map((media) => (
            <div className="profile-detail-image" key={`${media.desktopUrl}-${media.order}`}>
              <PublicProfileMedia
                media={media}
                priority={media.order === 0}
                sizes="(max-width: 820px) 92vw, 48vw"
              />
            </div>
          ))}
        </section>
        <div className="profile-detail-copy">
          <p className="public-eyebrow">Perfil publicado</p>
          <h1 id="profile-detail-title">{profile.displayName}</h1>
          <p>{profile.age} años · {profile.citySlugs.join(' · ')}</p>
          <p>{profile.biography}</p>
          {measurements.length > 0 ? (
            <dl>
              {measurements.map(([label, value]) => (
                <div key={label}>
                  <dt>{measurementPresentation[label]?.label ?? label}</dt>
                  <dd>
                    {value} {measurementPresentation[label]?.unit}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
          <h2>Servicios</h2>
          <ul>
            {profile.services.map((service) => (
              <li key={service.slug}>
                <a href={`/servicios/${service.slug}`}>{service.name}</a>
              </li>
            ))}
          </ul>
          <ContactOptions />
        </div>
        </article>
      </main>
      <PublicFooter />
    </div>
  );
}
