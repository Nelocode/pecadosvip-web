import type { Locale } from '../../lib/i18n/locales';
import {
  syntheticExperienceService,
  type SyntheticExperienceMode,
} from '../../lib/preview/synthetic-experience';
import { getSyntheticServiceMedia } from '../../lib/preview/synthetic-service-media';
import type { SyntheticServiceCard as SyntheticServiceCardData } from '../../lib/preview/synthetic-services';
import PublicProfileMedia from './PublicProfileMedia';

type SelectionControl = {
  selected: boolean;
  addLabel: string;
  removeLabel: string;
  onToggle: () => void;
};

export default function SyntheticServiceCard({
  service,
  locale,
  action,
  badge,
  badgeLabel,
  selection,
  mode = 'local-preview',
}: {
  service: SyntheticServiceCardData;
  locale: Locale;
  action: string;
  badge: string;
  badgeLabel: string;
  selection?: SelectionControl;
  mode?: SyntheticExperienceMode;
}) {
  const media = getSyntheticServiceMedia(service.mediaKey, locale, mode);
  const href = syntheticExperienceService(locale, service.slug, mode);
  const selectionLabel = selection?.selected
    ? selection.removeLabel
    : selection?.addLabel;

  return (
    <article className="synthetic-service-card">
      <div className="synthetic-service-card-media">
        <a aria-hidden="true" href={href} tabIndex={-1}>
          <PublicProfileMedia
            media={{ ...media, alt: '' }}
            objectPosition={media.objectPosition}
            preserveFullImage={false}
            sizes="(max-width: 780px) 50vw, (max-width: 1180px) 33vw, 25vw"
          />
        </a>
        <span title={badgeLabel}>
          <span aria-hidden="true">{badge}</span>
          <span className="sr-only">{badgeLabel}</span>
        </span>
        {selection && selectionLabel ? (
          <button
            aria-label={`${selectionLabel}: ${service.name}`}
            aria-pressed={selection.selected}
            className="synthetic-service-card-select"
            onClick={selection.onToggle}
            type="button"
          >
            <span>{selectionLabel}</span>
          </button>
        ) : null}
      </div>
      <div className="synthetic-service-card-copy">
        <span>{service.groupLabel}</span>
        <h3><a href={href}>{service.name}</a></h3>
        <p>{service.teaser}</p>
        <a className="synthetic-service-card-action" href={href}>
          {action}
        </a>
      </div>
    </article>
  );
}
