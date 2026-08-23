import { parseCanonicalLocationId, type CanonicalLocationLevel } from './locationAuthority';

export const SEARCH_SCOPE_KINDS = [
  'province',
  'metro_city',
  'search_area',
  'locality',
  'multi_location',
] as const;

export type SearchScopeKind = (typeof SEARCH_SCOPE_KINDS)[number];
export type SearchScopeMemberKind = Exclude<SearchScopeKind, 'multi_location'>;

export const MULTI_LOCATION_MIN = 2;
export const MULTI_LOCATION_MAX = 10;

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
  'plot_land',
] as const satisfies readonly SearchJourneyId[];

export type SearchAreaExecutableJourneyId = (typeof SEARCH_AREA_EXECUTABLE_JOURNEYS)[number];

export const SEARCH_AREA_LIFECYCLES = ['active', 'preview', 'disabled'] as const;
export type SearchAreaLifecycle = (typeof SEARCH_AREA_LIFECYCLES)[number];

export const SEARCH_AREA_BOUNDARY_KINDS = ['canonical_members'] as const;
export type SearchAreaBoundaryKind = (typeof SEARCH_AREA_BOUNDARY_KINDS)[number];

export type SearchScopeMember =
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

export interface MultiLocationSearchScope {
  kind: 'multi_location';
  /**
   * Selected scope identities only. This is deliberately not a recursive
   * SearchScope union: nested OR scopes are outside S2D and are rejected.
   */
  members: readonly [SearchScopeMember, SearchScopeMember, ...SearchScopeMember[]];
}

export type SearchScope = SearchScopeMember | MultiLocationSearchScope;

export interface SearchAreaSummary {
  kind: 'search_area';
  searchAreaId: string;
  label: string;
  description?: string;
  publicSlug?: string;
  /** Optional context retained for legacy compatibility; never membership authority. */
  parentCanonicalLocationId?: string;
  parentLabel?: string;
  canonicalContext?: {
    contextType?: string;
    contextNames: readonly string[];
    primaryContextName?: string;
    isMembershipParent: false;
  };
  anchorFactualLocationId?: string;
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
  | 'invalid_search_area_id'
  | 'multi_location_invalid'
  | 'multi_location_too_many'
  | 'multi_location_mixed_kinds';

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

export function isSearchScopeMemberKind(value: unknown): value is SearchScopeMemberKind {
  return typeof value === 'string' && value !== 'multi_location' && isSearchScopeKind(value);
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
  kind: Exclude<SearchScopeKind, 'search_area' | 'multi_location'>,
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

function parseSearchScopeMember(
  value: unknown,
): { ok: true; member: SearchScopeMember } | { ok: false; error: SearchScopeValidationError } {
  if (!isRecord(value) || !isSearchScopeMemberKind(value.kind)) {
    return {
      ok: false,
      error: {
        code: 'unsupported_scope_kind',
        message: 'Multi-location members must use supported non-nested scope kinds.',
      },
    };
  }

  if (value.kind === 'search_area') {
    if (!hasOnlyKeys(value, ['kind', 'searchAreaId'])) {
      return {
        ok: false,
        error: {
          code: 'unknown_scope_field',
          message: 'Search Area member contains an unsupported field.',
        },
      };
    }
    if (!isSearchAreaId(value.searchAreaId)) {
      return {
        ok: false,
        error: {
          code: 'invalid_search_area_id',
          message: 'Search Area member requires a stable Search Area ID.',
        },
      };
    }
    return { ok: true, member: { kind: 'search_area', searchAreaId: value.searchAreaId } };
  }

  if (!hasOnlyKeys(value, ['kind', 'canonicalLocationId'])) {
    return {
      ok: false,
      error: {
        code: 'unknown_scope_field',
        message: 'Canonical multi-location member contains an unsupported field.',
      },
    };
  }

  const parsedLocationId = parseCanonicalLocationId(value.canonicalLocationId);
  if (!parsedLocationId) {
    return {
      ok: false,
      error: {
        code: 'invalid_canonical_location_id',
        message: 'Multi-location members require canonical location identities.',
      },
    };
  }

  if (parsedLocationId.level !== canonicalLevelForSearchScopeKind(value.kind)) {
    return {
      ok: false,
      error: {
        code: 'canonical_level_mismatch',
        message: `The canonical identity does not match the ${value.kind} member kind.`,
      },
    };
  }

  return {
    ok: true,
    member: {
      kind: value.kind,
      canonicalLocationId: `${parsedLocationId.level}:${parsedLocationId.id}`,
    },
  };
}

export function searchScopeMemberIdentity(member: SearchScopeMember): string {
  return member.kind === 'search_area'
    ? `search_area:${member.searchAreaId}`
    : `${member.kind}:${member.canonicalLocationId}`;
}

export function canonicalizeSearchScopeMembers(
  members: readonly SearchScopeMember[],
): SearchScopeMember[] {
  const unique = new Map<string, SearchScopeMember>();
  members.forEach(member => unique.set(searchScopeMemberIdentity(member), member));
  return Array.from(unique.values()).sort((a, b) =>
    searchScopeMemberIdentity(a).localeCompare(searchScopeMemberIdentity(b)),
  );
}

export function createMultiLocationSearchScope(
  members: readonly SearchScopeMember[],
): SearchScope | undefined {
  const result = parseSearchScope({ kind: 'multi_location', members });
  return result.ok ? result.scope : undefined;
}

export function parseSearchScope(value: unknown): SearchScopeParseResult {
  if (!isRecord(value)) {
    return invalid('invalid_shape', 'Search scope must be an object.');
  }

  const kind = value.kind;
  if (!isSearchScopeKind(kind)) {
    return invalid('unsupported_scope_kind', 'Search scope kind is not supported.');
  }

  if (kind === 'multi_location') {
    if (!hasOnlyKeys(value, ['kind', 'members']) || !Array.isArray(value.members)) {
      return invalid(
        'multi_location_invalid',
        'Multi-location scope requires an explicit member array.',
      );
    }

    if (value.members.length > MULTI_LOCATION_MAX) {
      return invalid(
        'multi_location_too_many',
        `Multi-location scope cannot contain more than ${MULTI_LOCATION_MAX} members.`,
      );
    }

    const parsedMembers = value.members.map(parseSearchScopeMember);
    const invalidMember = parsedMembers.find(result => !result.ok);
    if (invalidMember && !invalidMember.ok) return { ok: false, error: invalidMember.error };

    const members = canonicalizeSearchScopeMembers(
      parsedMembers.map(result => (result as { ok: true; member: SearchScopeMember }).member),
    );
    if (members.length < MULTI_LOCATION_MIN) {
      // Duplicate selections safely canonicalize to the remaining single
      // scope. The URL layer can then emit the backwards-compatible singular
      // representation rather than inventing an OR of one member.
      if (value.members.length >= MULTI_LOCATION_MIN && members.length === 1) {
        return { ok: true, scope: members[0] };
      }
      return invalid(
        'multi_location_invalid',
        `Multi-location scope requires at least ${MULTI_LOCATION_MIN} distinct members.`,
      );
    }

    const memberKinds = new Set(members.map(member => member.kind));
    if (memberKinds.size !== 1) {
      return invalid(
        'multi_location_mixed_kinds',
        'Multi-location members must use one geographic scope kind.',
      );
    }

    return {
      ok: true,
      scope: {
        kind,
        members: members as unknown as MultiLocationSearchScope['members'],
      },
    };
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
