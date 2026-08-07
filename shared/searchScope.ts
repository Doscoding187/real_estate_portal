import { parseCanonicalLocationId, type CanonicalLocationLevel } from './locationAuthority';

export const SEARCH_SCOPE_KINDS = ['province', 'metro_city', 'search_area', 'locality'] as const;

export type SearchScopeKind = (typeof SEARCH_SCOPE_KINDS)[number];

/**
 * Search journeys are deliberately distinct from the transaction type used by
 * the existing Buy/Rent URL contract. Shared Living must not be normalized to
 * Rent merely because a future route adapter may share infrastructure.
 */
export const SEARCH_JOURNEY_IDS = [
  'buy',
  'rent',
  'shared_living',
  'developments',
  'plot_land',
  'commercial',
] as const;

export type SearchJourneyId = (typeof SEARCH_JOURNEY_IDS)[number];

/**
 * These are the only journeys with an executable Search Area contract in this
 * slice. The broader SearchJourneyId union remains available for explicit
 * unsupported-state handling in later work.
 */
export const SEARCH_AREA_EXECUTABLE_JOURNEYS = [
  'buy',
  'rent',
] as const satisfies readonly SearchJourneyId[];

export type SearchAreaExecutableJourneyId = (typeof SEARCH_AREA_EXECUTABLE_JOURNEYS)[number];

export const SEARCH_AREA_LIFECYCLES = ['active', 'preview', 'disabled'] as const;
export type SearchAreaLifecycle = (typeof SEARCH_AREA_LIFECYCLES)[number];

export const SEARCH_AREA_BOUNDARY_KINDS = ['canonical_members'] as const;
export type SearchAreaBoundaryKind = (typeof SEARCH_AREA_BOUNDARY_KINDS)[number];

export type SearchScope =
  | {
      kind: 'province';
      canonicalLocationId: string;
    }
  | {
      kind: 'metro_city';
      canonicalLocationId: string;
    }
  | {
      kind: 'search_area';
      searchAreaId: string;
    }
  | {
      kind: 'locality';
      canonicalLocationId: string;
    };

export interface SearchAreaSummary {
  kind: 'search_area';
  searchAreaId: string;
  label: string;
  description?: string;
  publicSlug?: string;
  parentCanonicalLocationId: string;
  parentLabel?: string;
  lifecycle: SearchAreaLifecycle;
  availability: 'available' | 'preview';
  supportedJourneys: readonly SearchJourneyId[];
  definitionVersion: number;
}

export type SearchScopeValidationErrorCode =
  | 'invalid_shape'
  | 'unsupported_scope_kind'
  | 'unknown_scope_field'
  | 'invalid_canonical_location_id'
  | 'canonical_level_mismatch'
  | 'invalid_search_area_id';

export interface SearchScopeValidationError {
  code: SearchScopeValidationErrorCode;
  message: string;
}

export type SearchScopeParseResult =
  | {
      ok: true;
      scope: SearchScope;
    }
  | {
      ok: false;
      error: SearchScopeValidationError;
    };

const SEARCH_AREA_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isSearchAreaId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 120 &&
    SEARCH_AREA_ID_PATTERN.test(value)
  );
}

export function isSearchJourneyId(value: unknown): value is SearchJourneyId {
  return typeof value === 'string' && SEARCH_JOURNEY_IDS.includes(value as SearchJourneyId);
}

export function isSearchScopeKind(value: unknown): value is SearchScopeKind {
  return typeof value === 'string' && SEARCH_SCOPE_KINDS.includes(value as SearchScopeKind);
}

export function isSearchAreaLifecycle(value: unknown): value is SearchAreaLifecycle {
  return typeof value === 'string' && SEARCH_AREA_LIFECYCLES.includes(value as SearchAreaLifecycle);
}

export function isSearchAreaBoundaryKind(value: unknown): value is SearchAreaBoundaryKind {
  return (
    typeof value === 'string' &&
    SEARCH_AREA_BOUNDARY_KINDS.includes(value as SearchAreaBoundaryKind)
  );
}

export function canonicalLevelForSearchScopeKind(
  kind: Exclude<SearchScopeKind, 'search_area'>,
): CanonicalLocationLevel {
  if (kind === 'province') return 'province';
  if (kind === 'metro_city') return 'city';
  return 'suburb';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, allowedKeys: readonly string[]): boolean {
  return Object.keys(value).every(key => allowedKeys.includes(key));
}

function invalid(code: SearchScopeValidationErrorCode, message: string): SearchScopeParseResult {
  return { ok: false, error: { code, message } };
}

export function parseSearchScope(value: unknown): SearchScopeParseResult {
  if (!isRecord(value)) {
    return invalid('invalid_shape', 'Search scope must be an object.');
  }

  const kind = value.kind;
  if (!isSearchScopeKind(kind)) {
    return invalid('unsupported_scope_kind', 'Search scope kind is not supported.');
  }

  if (kind === 'search_area') {
    if (!hasOnlyKeys(value, ['kind', 'searchAreaId'])) {
      return invalid('unknown_scope_field', 'Search Area scope contains an unsupported field.');
    }
    if (!isSearchAreaId(value.searchAreaId)) {
      return invalid(
        'invalid_search_area_id',
        'Search Area scope requires a stable Search Area ID.',
      );
    }
    return { ok: true, scope: { kind, searchAreaId: value.searchAreaId } };
  }

  if (!hasOnlyKeys(value, ['kind', 'canonicalLocationId'])) {
    return invalid('unknown_scope_field', 'Canonical scope contains an unsupported field.');
  }

  const parsedLocationId = parseCanonicalLocationId(value.canonicalLocationId);
  if (!parsedLocationId) {
    return invalid(
      'invalid_canonical_location_id',
      'Canonical scope requires a valid canonical location identity.',
    );
  }

  if (parsedLocationId.level !== canonicalLevelForSearchScopeKind(kind)) {
    return invalid(
      'canonical_level_mismatch',
      `The canonical location identity does not match the ${kind} scope kind.`,
    );
  }

  return {
    ok: true,
    scope: { kind, canonicalLocationId: value.canonicalLocationId as string },
  };
}

export function isSearchScope(value: unknown): value is SearchScope {
  return parseSearchScope(value).ok;
}
