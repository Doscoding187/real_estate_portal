import type { LocationNode } from '@/types/location';
import { normalizeLocationKey } from './locationUtils';
import {
  encodeCanonicalLocationId,
  parseCanonicalLocationId,
} from '../../../shared/locationAuthority';
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
  scope: SearchScopeMember;
  context: GeographySearchContext;
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
    'id' | 'canonicalLocationId' | 'type' | 'provinceSlug' | 'citySlug' | 'slug'
  >,
): CanonicalSearchLocation | undefined {
  const parsed = parseCanonicalLocationId(location.canonicalLocationId || location.id);
  if (!parsed) return undefined;

  const expectedLevel =
    location.type === 'province' ? 'province' : location.type === 'city' ? 'city' : 'suburb';
  if (location.type === 'area' || parsed.level !== expectedLevel) return undefined;

  const canonicalLocationId = encodeCanonicalLocationId(parsed.level, parsed.id);
  if (parsed.level === 'province') {
    return {
      scope: { kind: 'province', canonicalLocationId },
      context: { province: location.provinceSlug || location.slug },
    };
  }

  if (parsed.level === 'city') {
    return {
      scope: { kind: 'metro_city', canonicalLocationId },
      context: {
        province: location.provinceSlug,
        city: location.citySlug || location.slug,
      },
    };
  }

  return {
    scope: { kind: 'locality', canonicalLocationId },
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
  if (scope?.kind === 'province') {
    geography.level = 'province';
    geography.locationId = scope.canonicalLocationId;
    Object.assign(geography, contextForScope(scope, input.context));
  } else if (scope?.kind === 'metro_city') {
    geography.level = 'city';
    geography.locationId = scope.canonicalLocationId;
    Object.assign(geography, contextForScope(scope, input.context));
  } else if (scope?.kind === 'locality') {
    geography.level = 'suburb';
    geography.locationId = scope.canonicalLocationId;
    Object.assign(geography, contextForScope(scope, input.context));
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
