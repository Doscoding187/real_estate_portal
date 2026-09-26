/**
 * Canonical Place Authority — shared executable vocabulary (geography contract v0.5).
 *
 * Pure, deterministic logic with no database access. Everything the executable
 * discovery and execution path must agree on lives here so the same rules apply
 * whether a caller is a browser, a service, or a test:
 *
 *  - the discovery result contract, including a first-class ambiguity outcome;
 *  - the governed match ranking, which is a function of recorded name roles and
 *    never of insertion order;
 *  - the derived search-scope projection, which reads the projection-owned
 *    `place.search_scope` and never coerces an unsupported type;
 *  - the mixed-authority rejection rules, so a caller cannot combine a canonical
 *    Place, legacy geography text, a legacy numeric handle, or a Search Area.
 *
 * Authority is never inferred from a name. Every function here takes or returns a
 * canonical identity.
 */

/** Public search scopes. A projection of Place identity, never identity itself. */
export const PLACE_SEARCH_SCOPES = ['province', 'metro_city', 'locality'] as const;
export type PlaceSearchScope = (typeof PLACE_SEARCH_SCOPES)[number];

/** How a query matched a Place name. Governed by contract D8 ordering. */
export const PLACE_MATCH_REASONS = [
  'exact_preferred',
  'exact_name',
  'prefix_preferred',
  'prefix_name',
  'substring_name',
] as const;
export type PlaceMatchReason = (typeof PLACE_MATCH_REASONS)[number];

/** Discovery outcomes. `canonicalResultCount > 0` is never sufficient. */
export const PLACE_DISCOVERY_OUTCOMES = ['resolved', 'ambiguous', 'no_result'] as const;
export type PlaceDiscoveryOutcome = (typeof PLACE_DISCOVERY_OUTCOMES)[number];

/** A candidate is always either a canonical Place or a Search Area, never both. */
export const PLACE_DISCOVERY_KINDS = ['canonical_place', 'search_area'] as const;
export type PlaceDiscoveryKind = (typeof PLACE_DISCOVERY_KINDS)[number];

export const PLACE_ID_PREFIX = 'pl-place-01-';
export const PLACE_ID_REGEX = /^pl-place-01-[a-f0-9]{24}$/;
export const SEARCH_AREA_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isCanonicalPlaceId(value: unknown): value is string {
  return typeof value === 'string' && PLACE_ID_REGEX.test(value);
}

export function isSearchAreaId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= 120 &&
    SEARCH_AREA_ID_REGEX.test(value) &&
    !isCanonicalPlaceId(value)
  );
}

/**
 * Normalize a user-typed query the same way for matching and for the governed
 * coverage signal, so a no-result record is comparable with a later match.
 * Privacy-safe: diacritics folded, punctuation reduced to single spaces, and the
 * stored subject is bounded by the caller.
 */
export function normalizePlaceQuery(value: unknown): string {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** A name role that is a current statement about the Place's name. */
export const PLACE_PREFERRED_ROLE = 'preferred_public';

export interface PlaceDiscoveryCandidate {
  placeId: string;
  placeType: string;
  placeClassification: string;
  verificationStatus: string;
  lifecycleStatus: string;
  searchEligible: boolean;
  publicationEligible: boolean;
  searchScope: PlaceSearchScope | null;
  preferredPublicLabel: string | null;
  matchedName: string;
  matchedNormalizedName: string;
  matchedNameRole: string;
  matchReason: PlaceMatchReason;
  searchableNames: string[];
  context: {
    provincePlaceId: string | null;
    cityPlaceId: string | null;
    localityPlaceId: string | null;
    administrativeContext: string | null;
  };
}

/** Ranking weights, exactly the contract D8 order. */
const MATCH_RANK: Record<PlaceMatchReason, number> = {
  exact_preferred: 0,
  exact_name: 1,
  prefix_preferred: 2,
  prefix_name: 3,
  substring_name: 4,
};

export function rankPlaceCandidate(
  candidate: PlaceDiscoveryCandidate,
  queryNormalized: string,
): number {
  const base = MATCH_RANK[candidate.matchReason];
  // A deterministic tie-break: the preferred label, then the Place id. Never
  // input order, and never "whatever the database returned first".
  return (
    base * 1e9 +
    (candidate.preferredPublicLabel ?? '').length * 1000 +
    Number.parseInt(candidate.placeId.slice(-6), 16) % 1000
  );
}

export function isAliasMatch(candidate: PlaceDiscoveryCandidate): boolean {
  return candidate.matchedNameRole !== PLACE_PREFERRED_ROLE;
}

/**
 * A Place may be returned by discovery only when it is searchable. A
 * publication/SEO decision is a separate, stricter fact and is never inferred
 * from searchability.
 */
export function isDiscoverable(candidate: {
  searchEligible: boolean;
  lifecycleStatus: string;
}): boolean {
  return candidate.searchEligible === true && candidate.lifecycleStatus === 'active';
}

/** Publication/SEO eligibility is a distinct gate, checked by its callers. */
export function isPublishable(candidate: {
  publicationEligible: boolean;
  verificationStatus: string;
  lifecycleStatus: string;
}): boolean {
  return (
    candidate.publicationEligible === true &&
    candidate.verificationStatus === 'verified' &&
    candidate.lifecycleStatus === 'active'
  );
}

export interface PlaceDiscoveryResponse {
  outcome: PlaceDiscoveryOutcome;
  query: string;
  results: PlaceDiscoveryCandidate[];
  /** Present when the outcome produced governed coverage evidence. */
  coverageSignal: { kind: 'unresolved_query' | 'ambiguous_query'; subject: string } | null;
}

/**
 * Reduce matched candidates to a governed outcome.
 *
 * Only the strongest match class present is eligible to decide the outcome. This
 * is what makes the ranking load-bearing rather than cosmetic: a query for an
 * exact admitted name must not be reported as ambiguous just because some other
 * Place happens to contain that string inside a longer name. A weaker class is
 * never allowed to compete with a stronger one, and distinct Places that match
 * at the *same* strongest class remain genuinely ambiguous and are never
 * collapsed.
 */
export function resolveDiscoveryOutcome(
  queryNormalized: string,
  candidates: PlaceDiscoveryCandidate[],
): PlaceDiscoveryResponse {
  const bestClass = candidates.reduce<number | null>((best, candidate) => {
    const rank = MATCH_RANK[candidate.matchReason];
    return best === null || rank < best ? rank : best;
  }, null);
  const eligible =
    bestClass === null ? [] : candidates.filter(c => MATCH_RANK[c.matchReason] === bestClass);

  const ordered = [...eligible].sort(
    (a, b) => rankPlaceCandidate(a, queryNormalized) - rankPlaceCandidate(b, queryNormalized),
  );
  const outcome: PlaceDiscoveryOutcome =
    ordered.length === 0 ? 'no_result' : ordered.length === 1 ? 'resolved' : 'ambiguous';
  return {
    outcome,
    query: queryNormalized,
    results: ordered,
    coverageSignal:
      outcome === 'no_result'
        ? { kind: 'unresolved_query', subject: queryNormalized }
        : outcome === 'ambiguous'
          ? { kind: 'ambiguous_query', subject: queryNormalized }
          : null,
  };
}

/* ------------------------------------------------------------------ *
 * Mixed-authority rejection
 * ------------------------------------------------------------------ */

/** The authority shapes a caller may claim. Exactly one may be present. */
export interface PlaceAuthorityClaim {
  placeId?: string | null;
  searchAreaId?: string | null;
  legacyLocationId?: string | number | null;
  legacyProvince?: string | null;
  legacyCity?: string | null;
  legacySuburb?: string | null;
}

export type PlaceAuthorityRejection =
  | 'no_geography_authority'
  | 'competing_place_and_legacy_geography'
  | 'competing_place_and_search_area'
  | 'competing_place_and_legacy_handle'
  | 'competing_search_area_and_legacy_geography'
  | 'competing_legacy_handle_and_legacy_geography'
  | 'multiple_legacy_geography_fields'
  | 'malformed_place_id'
  | 'malformed_search_area_id';

export type PlaceAuthorityResolution =
  | { ok: true; authority: { kind: 'place'; placeId: string } }
  | { ok: true; authority: { kind: 'search_area'; searchAreaId: string } }
  | { ok: true; authority: { kind: 'legacy'; legacyLocationId: string } }
  | { ok: true; authority: { kind: 'legacy_text'; province?: string; city?: string; suburb?: string } }
  | { ok: false; reason: PlaceAuthorityRejection };

const present = (value: unknown) => value !== undefined && value !== null && String(value).trim() !== '';

/**
 * Exactly one geography authority per request. A caller may not claim a
 * canonical Place together with legacy geography text, a legacy numeric handle,
 * or a Search Area, and may not combine Search Area with legacy geography.
 *
 * Transitional coexistence is governed, not silent: when `placeId` is present it
 * is the sole authority and the legacy fields are rejected rather than merged,
 * so a request can never be widened or guessed.
 */
export function resolveSingleGeographyAuthority(
  claim: PlaceAuthorityClaim,
): PlaceAuthorityResolution {
  const hasPlace = present(claim.placeId);
  const hasSearchArea = present(claim.searchAreaId);
  const hasLegacyHandle = present(claim.legacyLocationId);
  const legacyTextFields = [
    present(claim.legacyProvince),
    present(claim.legacyCity),
    present(claim.legacySuburb),
  ];
  const hasLegacyText = legacyTextFields.some(Boolean);
  const legacyTextCount = legacyTextFields.filter(Boolean).length;

  if (hasPlace) {
    if (!isCanonicalPlaceId(claim.placeId)) return { ok: false, reason: 'malformed_place_id' };
    if (hasSearchArea) return { ok: false, reason: 'competing_place_and_search_area' };
    if (hasLegacyHandle) return { ok: false, reason: 'competing_place_and_legacy_handle' };
    if (hasLegacyText) return { ok: false, reason: 'competing_place_and_legacy_geography' };
    return { ok: true, authority: { kind: 'place', placeId: claim.placeId as string } };
  }

  if (hasSearchArea) {
    if (!isSearchAreaId(claim.searchAreaId)) return { ok: false, reason: 'malformed_search_area_id' };
    if (hasLegacyHandle) return { ok: false, reason: 'competing_search_area_and_legacy_geography' };
    if (hasLegacyText) return { ok: false, reason: 'competing_search_area_and_legacy_geography' };
    return { ok: true, authority: { kind: 'search_area', searchAreaId: claim.searchAreaId as string } };
  }

  if (hasLegacyHandle) {
    if (hasLegacyText) return { ok: false, reason: 'competing_legacy_handle_and_legacy_geography' };
    return {
      ok: true,
      authority: { kind: 'legacy', legacyLocationId: String(claim.legacyLocationId) },
    };
  }

  if (hasLegacyText) {
    // Transitional compatibility: a coherent single-level legacy text claim is
    // still accepted, because pre-Place consumers have not converged. Competing
    // or multi-level claims are not.
    if (legacyTextCount > 1) return { ok: false, reason: 'multiple_legacy_geography_fields' };
    return {
      ok: true,
      authority: {
        kind: 'legacy_text',
        province: claim.legacyProvince ?? undefined,
        city: claim.legacyCity ?? undefined,
        suburb: claim.legacySuburb ?? undefined,
      },
    };
  }

  return { ok: false, reason: 'no_geography_authority' };
}

/* ------------------------------------------------------------------ *
 * Search-scope projection
 * ------------------------------------------------------------------ */

export const PLACE_SCOPE_EXECUTION_PROBLEMS = [
  'unknown_place',
  'place_not_active',
  'place_not_searchable',
  'place_has_no_searchable_scope',
  'unresolved_parent',
  'no_evidenced_province_context',
  'containment_cycle',
] as const;
export type PlaceScopeExecutionProblem = (typeof PLACE_SCOPE_EXECUTION_PROBLEMS)[number];

export interface PlaceScopeExecution {
  placeId: string;
  scope: PlaceSearchScope;
  /**
   * The canonical identity of the ancestor at each search level. These are real
   * Place ids, not derived or synthesized keys: `place` carries no natural key
   * or slug, so a path is expressed as the identities it actually traverses. A
   * consumer that needs a human label reads the ancestor's preferred name.
   */
  provincePlaceId: string;
  cityPlaceId: string | null;
  localityPlaceId: string | null;
  /** Ancestors traversed but carrying no search scope, e.g. a local municipality. */
  contextAncestorPlaceIds: string[];
}

export type PlaceScopeExecutionResolution =
  | { ok: true; execution: PlaceScopeExecution }
  | { ok: false; reason: PlaceScopeExecutionProblem };

/** Scope categories, coarsest first. A category, not a required ancestry depth. */
const SCOPE_ORDER: Record<PlaceSearchScope, number> = { province: 0, metro_city: 1, locality: 2 };

/**
 * The projection-owned scope is authoritative. This function never derives a
 * scope from `place_type`, never coerces an unsupported type, and never walks a
 * relationship other than the single authoritative containment edge.
 *
 * `ancestry` is the containment chain already walked by the caller, ordered
 * nearest parent first, and may include context-only ancestors whose `scope` is
 * null. Such an intermediary is recorded as context and skipped for scope
 * resolution: it must not break execution, and it must not contribute a scope
 * either.
 *
 * The binding requirement is an **evidenced province context**, not a fixed
 * three-tier ancestry. `province / metro_city / locality` are derived search
 * categories, not mandatory levels in the containment hierarchy, so a suburb
 * under a municipality is a legitimate `locality` execution with no city Place
 * anywhere above it. What is refused is a scope with no provincial bound, which
 * would be unbounded, and a malformed or inverted context chain.
 */
export function projectPlaceScope(
  place: {
    placeId: string;
    lifecycleStatus: string;
    searchEligible: boolean;
    searchScope: PlaceSearchScope | null;
  },
  ancestry: { placeId: string; scope: PlaceSearchScope | null }[],
): PlaceScopeExecutionResolution {
  if (place.lifecycleStatus !== 'active') return { ok: false, reason: 'place_not_active' };
  if (!place.searchEligible) return { ok: false, reason: 'place_not_searchable' };
  const scope = place.searchScope;
  if (!scope || !PLACE_SEARCH_SCOPES.includes(scope)) {
    return { ok: false, reason: 'place_has_no_searchable_scope' };
  }

  const ordered = ancestry.slice().reverse();
  const scoped = ordered.filter(
    (node): node is { placeId: string; scope: PlaceSearchScope } => node.scope !== null,
  );
  const contextAncestorPlaceIds = ordered
    .filter(node => node.scope === null)
    .map(node => node.placeId);

  // A province-scoped Place is its own provincial bound, so it needs no
  // ancestor. Every other scope requires an evidenced province context, because a
  // search with no provincial bound is unbounded.
  const provinceNode = scoped[0];
  if (scope !== 'province' && (!provinceNode || provinceNode.scope !== 'province')) {
    return { ok: false, reason: 'no_evidenced_province_context' };
  }
  // Any further scoped ancestor must be strictly coarser than the Place, so a
  // scope can never sit above its own level.
  for (let depth = 1; depth < scoped.length; depth += 1) {
    if (SCOPE_ORDER[scoped[depth].scope] >= SCOPE_ORDER[scope]) {
      return { ok: false, reason: 'unresolved_parent' };
    }
  }

  // An intervening metro_city tier is reported when the factual hierarchy
  // genuinely has one, and is null when it does not. It is never invented to
  // complete an abstraction.
  const cityNode = scoped.find(node => node.scope === 'metro_city');
  return {
    ok: true,
    execution: {
      placeId: place.placeId,
      scope,
      provincePlaceId: scope === 'province' ? place.placeId : provinceNode.placeId,
      cityPlaceId: cityNode?.placeId ?? null,
      // A locality-scoped Place *is* the locality level. It is not a child of
      // some other locality Place.
      localityPlaceId: scope === 'locality' ? place.placeId : null,
      contextAncestorPlaceIds,
    },
  };
}
