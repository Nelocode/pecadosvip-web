import {
  getRuntimePublicationState,
} from '../lib/content/runtime-publication.ts';
import { buildLocalizedRouteManifest } from '../lib/content/route-manifest.ts';
import { evaluateRelease } from '../lib/content/release-gates.ts';
import type {
  CityPage,
  CitySlug,
  ContentSnapshot,
} from '../lib/content/types.ts';
import { localizedPath, type Locale } from '../lib/i18n/locales.ts';
import type { CityContent } from './city-data.ts';

export type RuntimeCityPresentation = {
  content: CityContent;
  approvedCity?: CityPage;
  releaseReady: boolean;
  renderPublicExperience: boolean;
  routeIndexable: boolean;
};

type PublicationProjection = Pick<
  ReturnType<typeof getRuntimePublicationState>,
  'snapshot' | 'release' | 'manifest'
>;

function paragraphs(value: string): string[] {
  return value
    .split(/\r?\n\s*\r?\n/gu)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/**
 * Projects the approved city entity into the visual shell without retaining
 * unapproved operational claims from the code-owned draft copy.
 */
export function projectApprovedCityContent(
  shell: CityContent,
  city: CityPage,
): CityContent {
  const introduction = paragraphs(city.introduction);
  const differentiators = [...city.differentiators];
  const coverageAreas = city.coverageAreas.map((area) => area.name);
  const highlightCount = Math.min(
    Math.max(shell.highlights.length, 1),
    coverageAreas.length,
  );
  const highlights = coverageAreas.slice(0, highlightCount).map((name, index) => ({
    code: shell.highlights[index]?.code ?? `${city.slug.toUpperCase()}·${index + 1}`,
    name,
    note: differentiators[index % differentiators.length] ?? city.seo.description,
  }));

  return {
    ...shell,
    city: city.name,
    regionLabel: city.name,
    kicker: city.seo.title,
    headline: city.headline,
    headlineAccent: city.name,
    lead: city.seo.description,
    introEyebrow: city.name,
    introTitle: city.headline,
    introBody: introduction,
    areaEyebrow: city.name,
    areaTitle: city.seo.title,
    areaIntro: city.introduction,
    highlights,
    locations: coverageAreas.slice(highlightCount),
    processTitle: city.headline,
    processIntro: city.seo.description,
    steps: differentiators.map((title) => ({
      title,
      text: city.introduction,
    })),
    discretionTitle: city.headline,
    discretionText: city.introduction,
    faqs: structuredClone(city.faqs),
    closingTitle: city.seo.title,
    closingText: city.seo.description,
  };
}

function resolveProjection(
  publication: PublicationProjection,
  locale: Locale,
  slug: CitySlug,
  shell: CityContent,
): RuntimeCityPresentation {
  const path = localizedPath(locale, `/${slug}`);
  const route = publication.manifest.find(
    (candidate) => candidate.kind === 'city' && candidate.path === path,
  );
  const approvedCity = publication.release.ok && route?.indexable
    ? publication.snapshot.cities.find((city) => city.slug === slug)
    : undefined;

  return {
    content: approvedCity
      ? projectApprovedCityContent(shell, approvedCity)
      : shell,
    ...(approvedCity ? { approvedCity } : {}),
    releaseReady: publication.release.ok,
    renderPublicExperience: publication.release.ok,
    routeIndexable: Boolean(approvedCity && route?.indexable),
  };
}

export function resolveCityPresentationFromSnapshot(
  snapshot: ContentSnapshot,
  locale: Locale,
  slug: CitySlug,
  shell: CityContent,
): RuntimeCityPresentation {
  return resolveProjection(
    {
      snapshot,
      release: evaluateRelease(snapshot),
      manifest: buildLocalizedRouteManifest(snapshot),
    },
    locale,
    slug,
    shell,
  );
}

export function getRuntimeCityPresentation(
  locale: Locale,
  slug: CitySlug,
  shell: CityContent,
): RuntimeCityPresentation {
  return resolveProjection(
    getRuntimePublicationState(),
    locale,
    slug,
    shell,
  );
}
