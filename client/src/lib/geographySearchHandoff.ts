import type { LocationNode } from '@/types/location';
import { isCanonicalPlaceId } from '../../../shared/placeAuthority';
import {
  normalizeTransactionalResultState,
  type TransactionalResultState,
} from '../../../shared/transactionalSearchState';
import {
  parseSearchScope,
  type SearchScope,
  type SearchScopeMember,
} from '../../../shared/searchScope';
import { generateIntentUrl, type SearchIntent, type SearchIntentValidation } from './searchIntent';

export type TransactionalSearchJourney = 'buy' | 'rent';
export type TransactionalSearchTransactionType = 'for-sale' | 'to-rent';

export interface CanonicalSearchLocation {
  /** The admitted Place identity and the scope level asserted by Place Authority. */
  scope: SearchScopeMember;
}

export interface TransactionalGeographyHandoff {
  /** Only an explicit Buy or Rent journey can produce transactional results. */
  journey?: TransactionalSearchJourney;
  /** Omit the scope for a deliberately journey-wide search. */
  scope?: SearchScope;
  filters?: Record<string, unknown>;
  resultState?: Partial<TransactionalResultState>;
  validation?: SearchIntentValidation;
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
 * Converts one Place selection into the shared SearchScope contract.
 * Display labels and slugs do not participate in this conversion.
 */
export function createCanonicalSearchLocation(
  location: Pick<
    LocationNode,
    | 'canonicalPlaceId'
    | 'type'
  >,
): CanonicalSearchLocation | undefined {
  const placeId = location.canonicalPlaceId;
  if (!isCanonicalPlaceId(placeId)) return undefined;
  if (location.type === 'province') {
    return { scope: { kind: 'province', canonicalPlaceId: placeId } };
  }
  if (location.type === 'city') {
    return { scope: { kind: 'metro_city', canonicalPlaceId: placeId } };
  }
  return { scope: { kind: 'locality', canonicalPlaceId: placeId } };
}

/**
 * The single client-side semantic handoff from geography discovery to Buy/Rent
 * results. It accepts one canonical Place identity.
 */
export function buildTransactionalGeographyHref(
  input: TransactionalGeographyHandoff,
): string | undefined {
  const transactionType = transactionTypeForJourney(input.journey);
  if (!transactionType) return undefined;

  const parsedScope = input.scope === undefined ? undefined : parseSearchScope(input.scope);
  if (parsedScope && !parsedScope.ok) return undefined;

  const scope = parsedScope?.scope;
  if (scope && scope.kind !== 'multi_location') {
    if (!isCanonicalPlaceId(scope.canonicalPlaceId)) return undefined;
  }
  if (scope?.kind === 'multi_location') return undefined;

  const geography: SearchIntent['geography'] = { level: 'country' };
  const placeScopeId = scope && isCanonicalPlaceId(scope.canonicalPlaceId)
    ? scope.canonicalPlaceId
    : undefined;
  if (placeScopeId) {
    // Place identity is the only factual geography handle in a public request.
    geography.level = 'canonical_place';
    geography.canonicalPlaceId = placeScopeId;
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
