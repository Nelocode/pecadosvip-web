'use client';

import { useMemo, useState } from 'react';

import type { Locale } from '../../lib/i18n/locales';
import {
  syntheticExperienceService,
  syntheticExperienceServices,
  type SyntheticExperienceMode,
} from '../../lib/preview/synthetic-experience';
import {
  getSyntheticServiceMessages,
  syntheticServiceGroups,
  type SyntheticServiceCard as SyntheticServiceCardData,
  type SyntheticServiceGroup,
} from '../../lib/preview/synthetic-services';
import SyntheticServiceCard from './SyntheticServiceCard';

type SortMode = 'editorial' | 'name';

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLocaleLowerCase()
    .trim();
}

export default function SyntheticServiceExplorer({
  catalog,
  initialGroup,
  locale,
  mode = 'local-preview',
}: {
  catalog: SyntheticServiceCardData[];
  initialGroup?: SyntheticServiceGroup;
  locale: Locale;
  mode?: SyntheticExperienceMode;
}) {
  const messages = getSyntheticServiceMessages(locale);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<SyntheticServiceGroup | 'all'>(
    initialGroup ?? 'all',
  );
  const [sort, setSort] = useState<SortMode>('editorial');
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState('');

  const visibleServices = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    const filtered = catalog.filter((service) => {
      if (group !== 'all' && service.group !== group) return false;
      if (!normalizedQuery) return true;
      return normalizeSearch(
        `${service.name} ${service.groupLabel} ${service.teaser}`,
      ).includes(normalizedQuery);
    });
    if (sort === 'name') {
      return [...filtered].sort((first, second) =>
        first.name.localeCompare(second.name, locale, { sensitivity: 'base' }),
      );
    }
    return filtered;
  }, [catalog, group, locale, query, sort]);

  const selectedServices = selectedSlugs
    .map((slug) => catalog.find((service) => service.slug === slug))
    .filter((service): service is SyntheticServiceCardData => Boolean(service));

  const resultLabel = `${visibleServices.length} ${
    visibleServices.length === 1
      ? messages.hub.resultSingular
      : messages.hub.resultPlural
  }`;

  function clearFilters() {
    setQuery('');
    setGroup('all');
    setSort('editorial');
  }

  function toggleSelection(service: SyntheticServiceCardData) {
    setSelectedSlugs((current) => {
      if (current.includes(service.slug)) {
        setAnnouncement(`${messages.hub.removeFromSelection}: ${service.name}`);
        return current.filter((slug) => slug !== service.slug);
      }
      if (current.length >= 3) {
        setAnnouncement(messages.hub.selectionLimit);
        return current;
      }
      setAnnouncement(`${messages.hub.addToSelection}: ${service.name}`);
      return [...current, service.slug];
    });
  }

  return (
    <div className="synthetic-service-explorer">
      <form
        action={`${syntheticExperienceServices(locale, mode)}#service-catalog`}
        className="synthetic-service-filters"
        method="get"
        onSubmit={(event) => event.preventDefault()}
        role="search"
      >
        <fieldset>
          <legend>{messages.hub.filterLegend}</legend>
          {mode === 'local-preview' ? (
            <input name="lang" type="hidden" value={locale} />
          ) : null}
          <label className="synthetic-service-search" htmlFor="service-search">
            {messages.hub.searchLabel}
            <input
              autoComplete="off"
              id="service-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder={messages.hub.searchPlaceholder}
              type="search"
              value={query}
            />
          </label>
          <label htmlFor="service-category">
            {messages.hub.filterLabel}
            <select
              id="service-category"
              name="category"
              onChange={(event) =>
                setGroup(event.target.value as SyntheticServiceGroup | 'all')
              }
              value={group}
            >
              <option value="all">{messages.hub.allGroups}</option>
              {syntheticServiceGroups.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {messages.groups[candidate].label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="service-sort">
            {messages.hub.sortLabel}
            <select
              id="service-sort"
              onChange={(event) => setSort(event.target.value as SortMode)}
              value={sort}
            >
              <option value="editorial">{messages.hub.sortEditorial}</option>
              <option value="name">{messages.hub.sortName}</option>
            </select>
          </label>
          <button onClick={clearFilters} type="button">
            {messages.hub.clearFilters}
          </button>
        </fieldset>
        <div className="synthetic-service-category-chips" aria-label={messages.hub.filterLabel}>
          <button
            aria-pressed={group === 'all'}
            onClick={() => setGroup('all')}
            type="button"
          >
            {messages.hub.allGroups}
          </button>
          {syntheticServiceGroups.map((candidate) => (
            <button
              aria-pressed={group === candidate}
              key={candidate}
              onClick={() => setGroup(candidate)}
              type="button"
            >
              {messages.groups[candidate].label}
            </button>
          ))}
        </div>
      </form>

      <div className="synthetic-service-results-bar">
        <span aria-live="polite" role="status">{resultLabel}</span>
        <span className="synthetic-service-privacy-note">{messages.hub.selectionPrivacy}</span>
      </div>

      {visibleServices.length === 0 ? (
        <div className="public-empty-state synthetic-service-empty" role="status">
          <strong>{messages.hub.noResultsTitle}</strong>
          <p>{messages.hub.noResultsBody}</p>
          <button onClick={clearFilters} type="button">
            {messages.hub.clearFilters}
          </button>
        </div>
      ) : (
        <div className="synthetic-services-grid">
          {visibleServices.map((service) => (
            <SyntheticServiceCard
              action={messages.hub.openService}
              badge={messages.media.aiShort}
              badgeLabel={messages.media.generatedBadge}
              key={service.slug}
              locale={locale}
              mode={mode}
              selection={{
                selected: selectedSlugs.includes(service.slug),
                addLabel: messages.hub.addToSelection,
                removeLabel: messages.hub.removeFromSelection,
                onToggle: () => toggleSelection(service),
              }}
              service={service}
            />
          ))}
        </div>
      )}

      <section
        aria-labelledby="service-selection-title"
        className="synthetic-service-selection"
      >
        <div>
          <p className="public-eyebrow">{messages.hub.selectionPrivacy}</p>
          <h3 id="service-selection-title">{messages.hub.selectionTitle}</h3>
          <p>{messages.hub.selectionBody}</p>
        </div>
        <div>
          <span aria-live="polite" role="status">
            {selectedServices.length} / 3
          </span>
          {selectedServices.length === 0 ? (
            <p>{messages.hub.selectionEmpty}</p>
          ) : (
            <ol>
              {selectedServices.map((service) => (
                <li key={service.slug}>
                  <a href={syntheticExperienceService(locale, service.slug, mode)}>
                    {service.name}
                  </a>
                  <button
                    aria-label={`${messages.hub.removeFromSelection}: ${service.name}`}
                    onClick={() => toggleSelection(service)}
                    type="button"
                  >
                    {messages.hub.removeFromSelection}
                  </button>
                </li>
              ))}
            </ol>
          )}
          <button
            disabled={selectedServices.length === 0}
            onClick={() => {
              setSelectedSlugs([]);
              setAnnouncement(messages.hub.clearSelection);
            }}
            type="button"
          >
            {messages.hub.clearSelection}
          </button>
        </div>
      </section>
      <p aria-live="assertive" className="sr-only" role="status">
        {announcement}
      </p>
    </div>
  );
}
