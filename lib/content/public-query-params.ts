import {
  isValidPublicProfileQuery,
  type PublicProfileQuery,
} from './public-profiles.ts';

export type PublicProfileSearchParamsResult =
  | { ok: true; query: PublicProfileQuery }
  | { ok: false; reason: 'INVALID_QUERY' };

const allowedKeys = new Set([
  'city',
  'availability',
  'minAge',
  'maxAge',
  'service',
  'page',
  'pageSize',
]);
const integerPattern = /^[1-9][0-9]*$/;

function singleValue(
  params: URLSearchParams,
  key: string,
): string | undefined | null {
  const values = params.getAll(key);
  if (values.length === 0) return undefined;
  if (values.length !== 1 || values[0].length > 64) {
    return null;
  }
  if (values[0].length === 0) return undefined;
  return values[0];
}

function safeInteger(value: string | undefined): number | undefined | null {
  if (value === undefined) return undefined;
  if (!integerPattern.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parsePublicProfileSearchParams(
  params: URLSearchParams,
): PublicProfileSearchParamsResult {
  for (const key of params.keys()) {
    if (!allowedKeys.has(key)) {
      return { ok: false, reason: 'INVALID_QUERY' };
    }
  }

  const city = singleValue(params, 'city');
  const availability = singleValue(params, 'availability');
  const minAgeValue = singleValue(params, 'minAge');
  const maxAgeValue = singleValue(params, 'maxAge');
  const serviceSlug = singleValue(params, 'service');
  const pageValue = singleValue(params, 'page');
  const pageSizeValue = singleValue(params, 'pageSize');
  if (
    city === null ||
    availability === null ||
    minAgeValue === null ||
    maxAgeValue === null ||
    serviceSlug === null ||
    pageValue === null ||
    pageSizeValue === null
  ) {
    return { ok: false, reason: 'INVALID_QUERY' };
  }

  const minAge = safeInteger(minAgeValue);
  const maxAge = safeInteger(maxAgeValue);
  const page = safeInteger(pageValue);
  const pageSize = safeInteger(pageSizeValue);
  if (minAge === null || maxAge === null || page === null || pageSize === null) {
    return { ok: false, reason: 'INVALID_QUERY' };
  }

  const query: PublicProfileQuery = {
    ...(city === undefined ? {} : { city }),
    ...(availability === undefined ? {} : { availability }),
    ...(minAge === undefined ? {} : { minAge }),
    ...(maxAge === undefined ? {} : { maxAge }),
    ...(serviceSlug === undefined ? {} : { serviceSlug }),
    ...(page === undefined ? {} : { page }),
    ...(pageSize === undefined ? {} : { pageSize }),
  };
  return isValidPublicProfileQuery(query)
    ? { ok: true, query }
    : { ok: false, reason: 'INVALID_QUERY' };
}
