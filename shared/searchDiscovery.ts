import type { FactualGeographyType, RuntimeSearchScopeKind } from './factualRuntimeGeographyBridge';
import type { CanonicalLocationLevel } from './locationAuthority';
import type { SearchAreaLifecycle, SearchJourneyId } from './searchScope';

/**
 * The public discovery contract is deliberately discriminated.  A label and
 * a slug are presentation data; the selected identity is carried separately
 * so a factual place can never be mistaken for a governed Search Area.
 */
export interface SearchDiscoveryDisplayContext {
  /** Human-readable type/capability shown beside the result. */
  typeLabel: string;
  /** Optional factual or market context shown beside the result. */
  contextLabel?: string;
}

export type SearchDiscoveryMatchReason =
  | 'exact'
  | 'prefix'
  | 'contains'
  | 'alias_exact'
  | 'alias_prefix';

export interface CanonicalLocationDiscoveryResult {
  kind: 'canonical_location';
  /** Environment-independent factual identity when a governed projection exists. */
  factualLocationId?: string;
  /** Existing canonical location authority handle used by the runtime query. */
  canonicalLocationId: string;
  label: string;
  factualLevel: CanonicalLocationLevel;
  factualType?: FactualGeographyType;
  searchScopeKind: RuntimeSearchScopeKind;
  display: SearchDiscoveryDisplayContext;
  provinceSlug: string;
  citySlug?: string;
  suburbSlug?: string;
  /** Canonical parent handle used to validate same-level sibling selections. */
  parentCanonicalLocationId?: string;
  /** Readable hierarchy context for legacy and accessibility consumers. */
  provinceName?: string;
  cityName?: string;
  /** Optional catalog metadata retained for map and legacy autocomplete consumers. */
  latitude?: string;
  longitude?: string;
  postalCode?: string;
  isMetro?: number;
  provinceCode?: string;
  code?: string;
  status?: string;
  origin?: string;
  /** Presentation/routing context only; it is never selection authority. */
  canonicalPath: string;
  source: 'canonical_geography';
  listingCount?: number;
  /** How the query matched this result; alias hits never create new identities. */
  matchReason?: SearchDiscoveryMatchReason;
  /** The accepted alternate name that matched, when the hit came through an alias. */
  matchedAlias?: string;
}

export interface SearchAreaDiscoveryResult {
  kind: 'search_area';
  searchAreaId: string;
  label: string;
  display: SearchDiscoveryDisplayContext;
  publicSlug?: string;
  lifecycle: SearchAreaLifecycle;
  availability: 'available' | 'preview';
  /** False for controlled preview candidates and all inactive areas. */
  publicEligible: boolean;
  supportedJourneys: readonly SearchJourneyId[];
  source: 'search_area';
}

export type SearchDiscoveryResult = CanonicalLocationDiscoveryResult | SearchAreaDiscoveryResult;

/**
 * Selection carries identity only.  Labels, slugs, and display context are
 * intentionally absent so the server cannot be asked to guess from text.
 */
export type SearchDiscoverySelection =
  | {
      kind: 'canonical_location';
      canonicalLocationId: string;
      factualLocationId?: string;
    }
  | {
      kind: 'search_area';
      searchAreaId: string;
    };

export function selectionFromDiscoveryResult(
  result: SearchDiscoveryResult,
): SearchDiscoverySelection {
  if (result.kind === 'search_area') {
    return { kind: 'search_area', searchAreaId: result.searchAreaId };
  }

  return {
    kind: 'canonical_location',
    canonicalLocationId: result.canonicalLocationId,
    ...(result.factualLocationId ? { factualLocationId: result.factualLocationId } : {}),
  };
}
