import { parseCanonicalLocationId, type CanonicalLocationLevel } from './locationAuthority';

export const SHARED_LIVING_SEARCH_PATH = '/shared-living';
export const SHARED_LIVING_LOCATION_SELECTION_MAX = 5;

export interface SharedLivingSearchGeographyInput {
  locationId?: string | null;
  locationIds?: readonly string[] | null;
  searchAreaId?: string | null;
}

export type SharedLivingSearchGeography =
  | { status: 'none' }
  | {
      status: 'canonical';
      level: CanonicalLocationLevel;
      locationIds: string[];
    }
  | { status: 'invalid'; message: string }
  | { status: 'unsupported_search_area'; message: string };

function normalizedValues(values: readonly string[] | null | undefined): string[] {
  return (values || []).map(value => String(value).trim()).filter(Boolean);
}

/**
 * Shared Living geography has one authority per request. It intentionally
 * accepts only canonical location identities; display text, a Rent handoff,
 * and Search Areas that have not been graduated for this journey cannot widen
 * the marketplace scope.
 */
export function resolveSharedLivingSearchGeography(
  input: SharedLivingSearchGeographyInput,
): SharedLivingSearchGeography {
  const single = String(input.locationId || '').trim();
  const multiple = normalizedValues(input.locationIds);
  const searchAreaId = String(input.searchAreaId || '').trim();

  const authorityCount =
    Number(Boolean(single)) + Number(multiple.length > 0) + Number(Boolean(searchAreaId));
  if (authorityCount > 1) {
    return {
      status: 'invalid',
      message:
        'Choose one Shared Living location authority: one canonical location, sibling locations, or a supported Search Area.',
    };
  }

  if (searchAreaId) {
    return {
      status: 'unsupported_search_area',
      message:
        'Search Areas are not available for Shared Living yet. Choose one canonical city, suburb, or province instead.',
    };
  }

  if (!single && multiple.length === 0) return { status: 'none' };

  const rawIds = single ? [single] : multiple;
  if (!single && rawIds.length < 2) {
    return {
      status: 'invalid',
      message:
        'Use locationId for one Shared Living location or select at least two sibling locations.',
    };
  }
  if (rawIds.length > SHARED_LIVING_LOCATION_SELECTION_MAX) {
    return {
      status: 'invalid',
      message: `Shared Living search supports at most ${SHARED_LIVING_LOCATION_SELECTION_MAX} sibling locations.`,
    };
  }

  const parsed = rawIds.map(parseCanonicalLocationId);
  if (parsed.some(value => value === null)) {
    return {
      status: 'invalid',
      message: 'Every Shared Living location must use a canonical Property Listify identity.',
    };
  }

  const canonicalIds = parsed.map(value => `${value!.level}:${value!.id}`);
  if (new Set(canonicalIds).size !== canonicalIds.length) {
    return {
      status: 'invalid',
      message: 'A Shared Living location cannot be selected more than once.',
    };
  }

  const levels = new Set(parsed.map(value => value!.level));
  if (levels.size !== 1) {
    return {
      status: 'invalid',
      message: 'Sibling Shared Living locations must use the same geographic level.',
    };
  }

  return {
    status: 'canonical',
    level: parsed[0]!.level,
    locationIds: canonicalIds,
  };
}

const MAX_RETURN_URL_LENGTH = 2048;

/** Only an internal Shared Living discovery URL may be carried back from detail. */
export function normalizeSharedLivingSearchReturn(value: string | null | undefined): string | null {
  const raw = String(value || '').trim();
  if (!raw || raw.length > MAX_RETURN_URL_LENGTH || !raw.startsWith('/')) return null;

  try {
    const url = new URL(raw, 'https://property-listify.local');
    if (
      url.origin !== 'https://property-listify.local' ||
      url.pathname !== SHARED_LIVING_SEARCH_PATH
    )
      return null;
    if (url.searchParams.has('returnTo')) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function appendSharedLivingSearchReturn(
  path: string,
  returnTo: string | null | undefined,
): string {
  const normalizedReturn = normalizeSharedLivingSearchReturn(returnTo);
  if (!normalizedReturn) return path;

  try {
    const url = new URL(path, 'https://property-listify.local');
    if (
      url.origin !== 'https://property-listify.local' ||
      !url.pathname.startsWith('/shared-living/')
    )
      return path;
    url.searchParams.set('returnTo', normalizedReturn);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return path;
  }
}

export function getSharedLivingSearchReturn(search: string | URLSearchParams): string | null {
  const params =
    typeof search === 'string'
      ? new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
      : search;
  return normalizeSharedLivingSearchReturn(params.get('returnTo'));
}
