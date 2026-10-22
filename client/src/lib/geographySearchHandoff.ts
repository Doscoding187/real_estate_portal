import type { LocationNode } from '@/types/location';
import { normalizeLocationKey } from './locationUtils';
import {
  encodeCanonicalLocationId,
  parseCanonicalLocationId,
  parseCanonicalLocationIdentity,
} from '../../../shared/locationAuthority';
import { isCanonicalPlaceId } from '../../../shared/placeAuthority';
import { isFactualGeographyId } from '../../../shared/factualRuntimeGeographyBridge';
import {
  normalizeTransactionalResultState,
  type TransactionalResultState,
} from '../../../shared/transactionalSearchState';
import {
  parseSearchScope,
  type SearchAreaSummary,
  type SearchScope,
  type SearchScopeMember,
} from '../../../shared/searchScope';
import { generateIntentUrl, type SearchIntent, type SearchIntentValidation } from './searchIntent';

export type TransactionalSearchJourney = 'buy' | 'rent';
export type TransactionalSearchTransactionType = 'for-sale' | 'to-rent';

export interface GeographySearchContext {
  province?: string;
  city?: string;
  suburb?: string;
}

export interface CanonicalSearchLocation {
  /**
   * The search scope.
   *
   * A place the published projection still carries carries the runtime scope, so a city search
   * still covers its suburbs. A place it does not carry carries the Place Authority identity,
   * and the scope kind is the level the authority asserted.
   */
  scope: SearchScopeMember;
  context: GeographySearchContext;
  factualLocationId?: string;
}

export interface TransactionalGeographyHandoff {
  /** Only an explicit Buy or Rent journey can produce transactional results. */
  journey?: TransactionalSearchJourney;
  /** Omit the scope for a deliberately journey-wide search. */
  scope?: SearchScope;
  /** Required when scope.kind is search_area; preview summaries cannot navigate. */
  searchAreaAvailability?: SearchAreaSummary['availability'];
  /** Required for multi-Search-Area handoffs; one safe summary per selected ID. */
  searchAreaAvailabilityById?: Readonly<Record<string, SearchAreaSummary['availability']>>;
  /** S2B-M.2 validates this locality against the server-owned Search Area members. */
  localityRefinementId?: string;
  /** Slugs are display context only; canonical IDs remain the scope authority. */
  context?: GeographySearchContext;
  /** Durable factual identity retained alongside the runtime compatibility scope. */
  factualLocationId?: string;
  filters?: Record<string, unknown>;
  resultState?: Partial<TransactionalResultState>;
  validation?: SearchIntentValidation;
}

function normalizedContextValue(value: string | undefined): string | undefined {
  const normalized = normalizeLocationKey(String(value || ''));
  return normalized && !normalized.includes('/') ? normalized : undefined;
}

function contextForScope(
  scope: SearchScope,
  context: GeographySearchContext | undefined,
): GeographySearchContext {
  const province = normalizedContextValue(context?.province);
  const city = normalizedContextValue(context?.city);
  const suburb = normalizedContextValue(context?.suburb);

  if (scope.kind === 'province') return { province };
  if (scope.kind === 'metro_city') return { province, city };
  if (scope.kind === 'locality') return { province, city, suburb };
  return {};
}

function stripGeographyFilters(filters: Record<string, unknown> | undefined) {
  const safeFilters = { ...(filters || {}) };

  for (const key of [
    'province',
    'city',
    'suburb',
    'locationId',
    'factualLocationId',
    'locationIds',
    'locations',
    'locations[]',
    'searchAreaId',
    'searchAreaIds',
    'searchAreaAvailability',
    'searchAreaAvailabilityById',
  ]) {
    delete safeFilters[key];
  }

  return safeFilters;
}

function transactionTypeForJourney(
  journey: unknown,
): TransactionalSearchTransactionType | undefined {
  if (journey === 'buy') return 'for-sale';
  if (journey === 'rent') return 'to-rent';
  return undefined;
}

export function journeyForTransactionType(
  transactionType: unknown,
): TransactionalSearchJourney | undefined {
  if (transactionType === 'for-sale') return 'buy';
  if (transactionType === 'to-rent') return 'rent';
  return undefined;
}

/**
 * Converts one canonical LocationNode into the shared SearchScope contract.
 * Names and slugs are retained only as readable URL context.
 */
export function createCanonicalSearchLocation(
  location: Pick<
    LocationNode,
    | 'id'
    | 'canonicalLocationId'
    | 'factualLocationId'
    | 'runtimeLocationId'
    | 'type'
    | 'provinceSlug'
    | 'citySlug'
    | 'slug'
  >,
): CanonicalSearchLocation | undefined {
  if (location.type === 'area') return undefined;

  // A place the published projection still carries keeps the runtime query handle, so a city
  // search still covers its suburbs exactly as it did before the Place Authority took over
  // discovery. A selection that still carries a runtime identity is used as it is.
  const runtimeHandle =
    location.runtimeLocationId ??
    (parseCanonicalLocationId(location.canonicalLocationId || location.id)
      ? location.canonicalLocationId || location.id
      : undefined);
  if (runtimeHandle) {
    const parsed = parseCanonicalLocationId(runtimeHandle);
    if (!parsed) return undefined;
    const expectedLevel =
      location.type === 'province' ? 'province' : location.type === 'city' ? 'city' : 'suburb';
    if (parsed.level !== expectedLevel) return undefined;

    const canonicalLocationId = encodeCanonicalLocationId(parsed.level, parsed.id);
    const durable = location.factualLocationId ? { factualLocationId: location.factualLocationId } : {};
    if (parsed.level === 'province') {
      return {
        scope: { kind: 'province', canonicalLocationId },
        context: { province: location.provinceSlug || location.slug },
        ...durable,
      };
    }
    if (parsed.level === 'city') {
      return {
        scope: { kind: 'metro_city', canonicalLocationId },
        context: {
          province: location.provinceSlug,
          city: location.citySlug || location.slug,
        },
        ...durable,
      };
    }
    return {
      scope: { kind: 'locality', canonicalLocationId },
      context: {
        province: location.provinceSlug,
        city: location.citySlug,
        suburb: location.slug,
      },
      ...durable,
    };
  }

  // A place the published projection does not carry is searched through the Place Authority.
  // The identity does not carry a level, so the scope kind is the level the authority asserted.
  const identity = parseCanonicalLocationIdentity(location.canonicalLocationId || location.id);
  if (!identity || identity.kind !== 'place') return undefined;
  if (location.type === 'province') {
    return {
      scope: { kind: 'province', canonicalLocationId: identity.placeId },
      context: { province: location.provinceSlug || location.slug },
    };
  }
  if (location.type === 'city') {
    return {
      scope: { kind: 'metro_city', canonicalLocationId: identity.placeId },
      context: { province: location.provinceSlug, city: location.citySlug || location.slug },
    };
  }
  return {
    scope: { kind: 'locality', canonicalLocationId: identity.placeId },
    context: {
      province: location.provinceSlug,
      city: location.citySlug,
      suburb: location.slug,
    },
  };
}

export function createCanonicalSearchScope(canonicalLocationId: string): SearchScope | undefined {
  const parsed = parseCanonicalLocationId(canonicalLocationId);
  if (!parsed) return undefined;

  const normalizedId = encodeCanonicalLocationId(parsed.level, parsed.id);
  if (parsed.level === 'province') {
    return { kind: 'province', canonicalLocationId: normalizedId };
  }
  if (parsed.level === 'city') {
    return { kind: 'metro_city', canonicalLocationId: normalizedId };
  }
  return { kind: 'locality', canonicalLocationId: normalizedId };
}

/**
 * The single client-side semantic handoff from geography discovery to Buy/Rent
 * results. It serializes only a validated SearchScope and never accepts member
 * arrays or browser-defined Search Area boundaries.
 */
export function buildTransactionalGeographyHref(
  input: TransactionalGeographyHandoff,
): string | undefined {
  const transactionType = transactionTypeForJourney(input.journey);
  if (!transactionType) return undefined;

  const parsedScope = input.scope === undefined ? undefined : parseSearchScope(input.scope);
  if (parsedScope && !parsedScope.ok) return undefined;

  const scope = parsedScope?.scope;
  if (input.factualLocationId && !isFactualGeographyId(input.factualLocationId)) {
    return undefined;
  }
  if (input.factualLocationId && (!scope || scope.kind === 'search_area' || scope.kind === 'multi_location')) {
    return undefined;
  }
  if (scope?.kind === 'search_area' && input.searchAreaAvailability !== 'available') {
    return undefined;
  }

  if (scope?.kind === 'multi_location') {
    if (input.searchAreaAvailability !== undefined || input.localityRefinementId !== undefined) {
      return undefined;
    }

    const searchAreaMembers = scope.members.filter(
      member => member.kind === 'search_area',
    ) as Array<{ kind: 'search_area'; searchAreaId: string }>;
    if (
      searchAreaMembers.length > 0 &&
      searchAreaMembers.some(
        member => input.searchAreaAvailabilityById?.[member.searchAreaId] !== 'available',
      )
    ) {
      return undefined;
    }
  } else if (scope?.kind !== 'search_area' && input.searchAreaAvailability !== undefined) {
    return undefined;
  }

  let localityRefinementId: string | undefined;
  if (input.localityRefinementId !== undefined) {
    if (!scope || scope.kind !== 'search_area') return undefined;
    const refinement = parseCanonicalLocationId(input.localityRefinementId);
    if (!refinement || refinement.level !== 'suburb') return undefined;
    localityRefinementId = encodeCanonicalLocationId(refinement.level, refinement.id);
  }

  const geography: SearchIntent['geography'] = { level: 'country' };
  const placeScopeId =
    scope &&
    scope.kind !== 'search_area' &&
    scope.kind !== 'multi_location' &&
    isCanonicalPlaceId(scope.canonicalLocationId)
      ? scope.canonicalLocationId
      : undefined;
  if (placeScopeId) {
    // A place the published projection does not carry is searched through the Place Authority.
    // One authority per request: a Place identity never travels with a runtime scope.
    if (input.factualLocationId) return undefined;
    // One authority per request: the Place identity travels alone. The published slugs are
    // display context and stay on the selection, not in the search criteria.
    geography.level = 'canonical_place';
    geography.canonicalPlaceId = placeScopeId;
  } else if (scope?.kind === 'province') {
    geography.level = 'province';
    geography.locationId = scope.canonicalLocationId;
    Object.assign(geography, contextForScope(scope, input.context));
    if (input.factualLocationId) geography.factualLocationId = input.factualLocationId;
  } else if (scope?.kind === 'metro_city') {
    geography.level = 'city';
    geography.locationId = scope.canonicalLocationId;
    Object.assign(geography, contextForScope(scope, input.context));
    if (input.factualLocationId) geography.factualLocationId = input.factualLocationId;
  } else if (scope?.kind === 'locality') {
    geography.level = 'suburb';
    geography.locationId = scope.canonicalLocationId;
    Object.assign(geography, contextForScope(scope, input.context));
    if (input.factualLocationId) geography.factualLocationId = input.factualLocationId;
  } else if (scope?.kind === 'search_area') {
    geography.level = localityRefinementId ? 'suburb' : 'search_area';
    geography.searchAreaId = scope.searchAreaId;
    if (localityRefinementId) geography.locationId = localityRefinementId;
  } else if (scope?.kind === 'multi_location') {
    geography.level = 'multi_location';
    const canonicalMembers = scope.members.filter(member => member.kind !== 'search_area') as Array<
      Exclude<(typeof scope.members)[number], { kind: 'search_area' }>
    >;
    if (canonicalMembers.length > 0) {
      geography.locationIds = canonicalMembers.map(member => member.canonicalLocationId);
    } else {
      geography.searchAreaIds = scope.members
        .filter(member => member.kind === 'search_area')
        .map(member => member.searchAreaId);
    }
  }

  return generateIntentUrl({
    transactionType,
    geography,
    filters: stripGeographyFilters(input.filters),
    resultState: normalizeTransactionalResultState(input.resultState),
    defaults: { propertyCategory: 'residential', sort: 'relevance' },
    validation: input.validation,
    routeMode: 'results',
  });
}
