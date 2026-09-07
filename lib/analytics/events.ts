import { citySlugs } from '../content/types.ts';
import type { CitySlug } from '../content/types.ts';

export type AnalyticsConsentState =
  | 'unknown'
  | 'denied'
  | 'granted'
  | 'withdrawn';

export type AnalyticsGate = {
  analyticsEnabled: boolean;
  consentState: AnalyticsConsentState;
};

type ResultBucket = '0' | '1-5' | '6-20' | '21+';
type Surface = 'city' | 'profile' | 'header' | 'footer';
type Channel = 'whatsapp' | 'telegram' | 'phone' | 'email' | 'form';
type FilterName = 'city' | 'availability' | 'age' | 'service';
type ContactErrorCode =
  | 'network'
  | 'timeout'
  | 'rate_limited'
  | 'unavailable'
  | 'validation';

export type AnalyticsEvent =
  | {
      name: 'view_city';
      properties: { city_slug: CitySlug; locale: string };
    }
  | {
      name: 'view_profile_list';
      properties: {
        city_slug?: CitySlug;
        result_bucket: ResultBucket;
        page: number;
      };
    }
  | {
      name: 'filter_profiles';
      properties: {
        filter_names: FilterName[];
        result_bucket: ResultBucket;
      };
    }
  | {
      name: 'view_profile';
      properties: { city_slug: CitySlug };
    }
  | {
      name: 'contact_intent';
      properties: { channel: Channel; surface: Surface; city_slug?: CitySlug };
    }
  | {
      name: 'contact_submit';
      properties: { surface: Surface; city_slug?: CitySlug };
    }
  | {
      name: 'contact_error';
      properties: {
        code: ContactErrorCode;
        surface: Surface;
        city_slug?: CitySlug;
      };
    };

export type AnalyticsEventResult =
  | { ok: true; event: AnalyticsEvent }
  | {
      ok: false;
      reason: 'ANALYTICS_DISABLED' | 'CONSENT_REQUIRED' | 'INVALID_EVENT';
    };

const resultBuckets: readonly ResultBucket[] = ['0', '1-5', '6-20', '21+'];
const surfaces: readonly Surface[] = ['city', 'profile', 'header', 'footer'];
const channels: readonly Channel[] = [
  'whatsapp',
  'telegram',
  'phone',
  'email',
  'form',
];
const filterNames: readonly FilterName[] = [
  'city',
  'availability',
  'age',
  'service',
];
const contactErrorCodes: readonly ContactErrorCode[] = [
  'network',
  'timeout',
  'rate_limited',
  'unavailable',
  'validation',
];
const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  required: readonly string[],
  optional: readonly string[] = [],
): boolean {
  const keys = Object.keys(value);
  return (
    required.every((key) => Object.hasOwn(value, key)) &&
    keys.every((key) => required.includes(key) || optional.includes(key))
  );
}

function isCity(value: unknown): value is CitySlug {
  return typeof value === 'string' && citySlugs.includes(value as CitySlug);
}

function optionalCity(
  value: Record<string, unknown>,
): CitySlug | undefined | null {
  if (!Object.hasOwn(value, 'city_slug')) return undefined;
  const citySlug = value.city_slug;
  return isCity(citySlug) ? citySlug : null;
}

function buildValidatedEventUnsafe(input: unknown): AnalyticsEvent | undefined {
  if (!isRecord(input) || !hasExactKeys(input, ['name', 'properties'])) {
    return undefined;
  }
  const name = input.name;
  const propertiesInput = input.properties;
  if (typeof name !== 'string' || !isRecord(propertiesInput)) {
    return undefined;
  }
  const properties = propertiesInput;

  if (name === 'view_city') {
    const citySlug = properties.city_slug;
    const locale = properties.locale;
    if (
      !hasExactKeys(properties, ['city_slug', 'locale']) ||
      !isCity(citySlug) ||
      typeof locale !== 'string' ||
      !localePattern.test(locale)
    ) {
      return undefined;
    }
    return {
      name,
      properties: {
        city_slug: citySlug,
        locale,
      },
    };
  }

  if (name === 'view_profile_list') {
    const city = optionalCity(properties);
    const resultBucket = properties.result_bucket;
    const page = properties.page;
    if (
      !hasExactKeys(properties, ['result_bucket', 'page'], ['city_slug']) ||
      city === null ||
      !resultBuckets.includes(resultBucket as ResultBucket) ||
      !Number.isSafeInteger(page) ||
      (page as number) < 1 ||
      (page as number) > 100_000
    ) {
      return undefined;
    }
    return {
      name,
      properties: {
        ...(city === undefined ? {} : { city_slug: city }),
        result_bucket: resultBucket as ResultBucket,
        page: page as number,
      },
    };
  }

  if (name === 'filter_profiles') {
    const rawFilterNames = properties.filter_names;
    const resultBucket = properties.result_bucket;
    if (!Array.isArray(rawFilterNames)) return undefined;
    const filterNamesSnapshot = [...rawFilterNames];
    if (
      !hasExactKeys(properties, ['filter_names', 'result_bucket']) ||
      filterNamesSnapshot.length > filterNames.length ||
      new Set(filterNamesSnapshot).size !== filterNamesSnapshot.length ||
      !filterNamesSnapshot.every(
        (name) =>
          typeof name === 'string' &&
          filterNames.includes(name as FilterName),
      ) ||
      !resultBuckets.includes(resultBucket as ResultBucket)
    ) {
      return undefined;
    }
    return {
      name,
      properties: {
        filter_names: filterNamesSnapshot as FilterName[],
        result_bucket: resultBucket as ResultBucket,
      },
    };
  }

  if (name === 'view_profile') {
    const citySlug = properties.city_slug;
    if (!hasExactKeys(properties, ['city_slug']) || !isCity(citySlug)) {
      return undefined;
    }
    return {
      name,
      properties: { city_slug: citySlug },
    };
  }

  if (name === 'contact_intent') {
    const city = optionalCity(properties);
    const channel = properties.channel;
    const surface = properties.surface;
    if (
      !hasExactKeys(properties, ['channel', 'surface'], ['city_slug']) ||
      city === null ||
      !channels.includes(channel as Channel) ||
      !surfaces.includes(surface as Surface)
    ) {
      return undefined;
    }
    return {
      name,
      properties: {
        channel: channel as Channel,
        surface: surface as Surface,
        ...(city === undefined ? {} : { city_slug: city }),
      },
    };
  }

  if (name === 'contact_submit') {
    const city = optionalCity(properties);
    const surface = properties.surface;
    if (
      !hasExactKeys(properties, ['surface'], ['city_slug']) ||
      city === null ||
      !surfaces.includes(surface as Surface)
    ) {
      return undefined;
    }
    return {
      name,
      properties: {
        surface: surface as Surface,
        ...(city === undefined ? {} : { city_slug: city }),
      },
    };
  }

  if (name === 'contact_error') {
    const city = optionalCity(properties);
    const code = properties.code;
    const surface = properties.surface;
    if (
      !hasExactKeys(properties, ['code', 'surface'], ['city_slug']) ||
      city === null ||
      !contactErrorCodes.includes(code as ContactErrorCode) ||
      !surfaces.includes(surface as Surface)
    ) {
      return undefined;
    }
    return {
      name,
      properties: {
        code: code as ContactErrorCode,
        surface: surface as Surface,
        ...(city === undefined ? {} : { city_slug: city }),
      },
    };
  }

  return undefined;
}

function buildValidatedEvent(input: unknown): AnalyticsEvent | undefined {
  try {
    return buildValidatedEventUnsafe(input);
  } catch {
    return undefined;
  }
}

export function buildAnalyticsEvent(
  gate: unknown,
  input: unknown,
): AnalyticsEventResult {
  try {
    if (
      !isRecord(gate) ||
      !hasExactKeys(gate, ['analyticsEnabled', 'consentState'])
    ) {
      return { ok: false, reason: 'INVALID_EVENT' };
    }
    const analyticsEnabled = gate.analyticsEnabled;
    const consentState = gate.consentState;
    if (analyticsEnabled !== true) {
      return { ok: false, reason: 'ANALYTICS_DISABLED' };
    }
    if (consentState !== 'granted') {
      return { ok: false, reason: 'CONSENT_REQUIRED' };
    }
  } catch {
    return { ok: false, reason: 'INVALID_EVENT' };
  }
  const event = buildValidatedEvent(input);
  return event
    ? { ok: true, event }
    : { ok: false, reason: 'INVALID_EVENT' };
}
