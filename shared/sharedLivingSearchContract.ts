import { isCanonicalPlaceId } from './placeAuthority';

export const SHARED_LIVING_SEARCH_PATH = '/shared-living';
export const SHARED_LIVING_LOCATION_SELECTION_MAX = 5;

export interface SharedLivingSearchGeographyInput {
  canonicalPlaceId?: string | null;
  canonicalPlaceIds?: readonly string[] | null;
}

export type SharedLivingSearchGeography =
  | { status: 'none' }
  | {
      status: 'canonical';
      canonicalPlaceIds: string[];
    }
  | { status: 'invalid'; message: string };

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
  const single = String(input.canonicalPlaceId || '').trim();
  const multiple = normalizedValues(input.canonicalPlaceIds);
  const authorityCount = Number(Boolean(single)) + Number(multiple.length > 0);
  if (authorityCount > 1) {
    return {
      status: 'invalid',
      message:
        'Choose one Shared Living geography authority: one canonical Place or sibling Places.',
    };
  }

  if (!single && multiple.length === 0) return { status: 'none' };

  const rawIds = single ? [single] : multiple;
  if (!single && rawIds.length < 2) {
    return {
      status: 'invalid',
      message:
        'Use canonicalPlaceId for one Shared Living Place or select at least two sibling Places.',
    };
  }
  if (rawIds.length > SHARED_LIVING_LOCATION_SELECTION_MAX) {
    return {
      status: 'invalid',
      message: `Shared Living search supports at most ${SHARED_LIVING_LOCATION_SELECTION_MAX} sibling locations.`,
    };
  }

  if (rawIds.some(value => !isCanonicalPlaceId(value))) {
    return {
      status: 'invalid',
      message: 'Every Shared Living location must use an admitted canonical Place identity.',
    };
  }

  if (new Set(rawIds).size !== rawIds.length) {
    return {
      status: 'invalid',
      message: 'A Shared Living Place cannot be selected more than once.',
    };
  }
  return { status: 'canonical', canonicalPlaceIds: rawIds };
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
