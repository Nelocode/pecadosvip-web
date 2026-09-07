import type { PublicProfileCard } from '../../lib/content/public-profiles';
import { getCatalog, interpolate } from '../../lib/i18n/catalog';
import { localizedPath, type Locale } from '../../lib/i18n/locales';
import PublicProfileMedia from './PublicProfileMedia';

export default function ProfileCard({
  profile,
  profileHref,
  locale,
  disclosure,
  compactDisclosure = 'Imagen IA',
  preserveFullImage = true,
  variant = 'default',
  headingLevel = 2,
}: {
  profile: PublicProfileCard;
  profileHref?: string | null;
  locale?: Locale;
  disclosure?: string;
  compactDisclosure?: string;
  preserveFullImage?: boolean;
  variant?: 'default' | 'featured-compact';
  headingLevel?: 2 | 3 | 4 | 5 | 6;
}) {
  const effectiveLocale = locale ?? 'es';
  const messages = getCatalog(effectiveLocale).profiles;
  const availabilityLabels: Record<PublicProfileCard['availability'], string> = {
    available: messages.availability.available,
    limited: messages.availability.limited,
    unavailable: messages.availability.unavailable,
    'on-request': messages.availability.onRequest,
  };
  const headingId = `profile-${profile.slug}-title`;
  const cityLabel = profile.citySlugs
    .map((city) => `${city.charAt(0).toUpperCase()}${city.slice(1)}`)
    .join(' · ');
  const href =
    profileHref === undefined
      ? locale
        ? localizedPath(locale, `/perfiles/${profile.slug}`)
        : `/perfiles/${profile.slug}`
      : profileHref;
  const headingTags = {
    2: 'h2',
    3: 'h3',
    4: 'h4',
    5: 'h5',
    6: 'h6',
  } as const;
  const HeadingTag = headingTags[headingLevel];

  return (
    <article
      className={`profile-card${variant === 'featured-compact' ? ' profile-card--featured-compact' : ''}`}
      aria-labelledby={headingId}
    >
      <div className="profile-card-media">
        <PublicProfileMedia
          media={profile.cover}
          sizes="(max-width: 720px) 88vw, (max-width: 1100px) 44vw, 280px"
          preserveFullImage={preserveFullImage}
        />
      </div>
      <div className="profile-card-copy">
        {disclosure ? (
          <p className="profile-card-disclosure">
            {variant === 'featured-compact' ? (
              <>
                <span aria-hidden="true">{compactDisclosure}</span>
                <span className="visually-hidden">{disclosure}</span>
              </>
            ) : disclosure}
          </p>
        ) : null}
        <HeadingTag className="profile-card-title" id={headingId}>
          {profile.displayName}
        </HeadingTag>
        <p>
          {cityLabel} ·{' '}
          {interpolate(messages.card.ageYears, { age: profile.age })}
        </p>
        <span data-availability={profile.availability}>
          <span className="visually-hidden">{messages.card.statusPrefix} </span>
          {availabilityLabels[profile.availability]}
        </span>
        {href ? (
          <a
            href={href}
            aria-label={interpolate(messages.card.viewProfileAria, {
              name: profile.displayName,
            })}
          >
            {messages.card.viewProfile}
          </a>
        ) : (
          <span aria-label={interpolate(messages.card.syntheticViewAria, {
            name: profile.displayName,
          })}>
            {messages.card.syntheticView}
          </span>
        )}
      </div>
    </article>
  );
}
