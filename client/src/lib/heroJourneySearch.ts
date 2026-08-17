import { normalizeLocationKey } from './locationUtils';
import { type SearchFilters } from './urlUtils';
import type { LocationNode } from '@/types/location';
import { createSearchIntentValidation, type SearchIntentValidationCode } from './searchIntent';
import { isBuyPropertyType, sanitizeBuySearchFilters } from '../../../shared/buySearchContract';
import { RENT_PUBLIC_PROPERTY_TYPES } from '../../../shared/property-taxonomy';
import {
  buildTransactionalGeographyHref,
  createCanonicalSearchLocation,
  journeyForTransactionType,
  type CanonicalSearchLocation,
  type GeographySearchContext,
} from './geographySearchHandoff';
import {
  createMultiLocationSearchScope,
  type SearchAreaSummary,
  type SearchScope,
} from '../../../shared/searchScope';

export const BUY_PROPERTY_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'cluster_home', label: 'Cluster home' },
  { value: 'farm', label: 'Farm' },
] as const;

const RENT_PROPERTY_TYPES = new Set<string>(RENT_PUBLIC_PROPERTY_TYPES);

export interface PropertySearchInput {
  searchQuery?: string;
  selectedLocations?: readonly LocationNode[];
  searchScope?: SearchScope;
  searchAreaAvailability?: SearchAreaSummary['availability'];
  localityRefinementId?: string;
  searchScopeContext?: GeographySearchContext;
  propertyType?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
  minBedrooms?: string | number;
  minBathrooms?: string | number;
}

function parseNonNegativeNumber(value: string | number | undefined): number | undefined {
  if (value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function getPriceRangeError(
  minPrice: string | number | undefined,
  maxPrice: string | number | undefined,
): string | undefined {
  const hasMin = String(minPrice ?? '').trim() !== '';
  const hasMax = String(maxPrice ?? '').trim() !== '';
  const min = parseNonNegativeNumber(minPrice);
  const max = parseNonNegativeNumber(maxPrice);

  if ((hasMin && min === undefined) || (hasMax && max === undefined)) {
    return 'Enter valid non-negative prices.';
  }

  if (min !== undefined && max !== undefined && min > max) {
    return 'Minimum price must be less than or equal to maximum price.';
  }

  return undefined;
}

function addSupportedBuyFilters(input: PropertySearchInput, filters: SearchFilters) {
  const propertyType = String(input.propertyType || '')
    .trim()
    .toLowerCase();
  const normalized = sanitizeBuySearchFilters({
    propertyType: isBuyPropertyType(propertyType) ? propertyType : undefined,
    minPrice: input.minPrice,
    maxPrice: input.maxPrice,
    minBedrooms: input.minBedrooms,
    minBathrooms: input.minBathrooms,
  });

  Object.assign(filters, normalized);
}

/**
 * Keep Rent composer output aligned with the canonical public rental contract.
 */
function addSupportedRentFilters(input: PropertySearchInput, filters: SearchFilters) {
  const propertyType = String(input.propertyType || '')
    .trim()
    .toLowerCase();
  if (RENT_PROPERTY_TYPES.has(propertyType)) {
    filters.propertyType = propertyType;
  }

  const minPrice = parseNonNegativeNumber(input.minPrice);
  const maxPrice = parseNonNegativeNumber(input.maxPrice);
  if (minPrice !== undefined && (maxPrice === undefined || minPrice <= maxPrice)) {
    filters.minPrice = minPrice;
  }
  if (maxPrice !== undefined && (minPrice === undefined || minPrice <= maxPrice)) {
    filters.maxPrice = maxPrice;
  }
}

function addStructuredLocation(location: LocationNode) {
  const slug = normalizeLocationKey(location.slug || location.name);
  if (!slug) return false;

  return createCanonicalSearchLocation({ ...location, slug });
}

function buildInvalidSearchUrl(transactionType: unknown, code: SearchIntentValidationCode): string {
  const journey = journeyForTransactionType(transactionType);
  if (!journey) return '/';

  return (
    buildTransactionalGeographyHref({
      journey,
      validation: createSearchIntentValidation(code),
    }) || '/'
  );
}

export function buildPropertySearchUrl({
  transactionType,
  searchQuery = '',
  selectedLocations = [],
  searchScope,
  searchAreaAvailability,
  localityRefinementId,
  searchScopeContext,
  propertyType,
  minPrice,
  maxPrice,
  minBedrooms,
  minBathrooms,
}: PropertySearchInput & { transactionType: 'for-sale' | 'to-rent' }): string {
  const journey = journeyForTransactionType(transactionType);
  if (!journey) return '/';

  const locations = selectedLocations.filter(location => Boolean(location.slug || location.name));
  const filters: SearchFilters = {};

  const filterInput = { propertyType, minPrice, maxPrice, minBedrooms, minBathrooms };
  if (transactionType === 'for-sale') {
    addSupportedBuyFilters(filterInput, filters);
  } else {
    addSupportedRentFilters(filterInput, filters);
  }

  let canonicalSelection: CanonicalSearchLocation | undefined;
  let multiLocationScope: SearchScope | undefined;
  if (locations.length > 0 && searchScope) {
    return buildInvalidSearchUrl(transactionType, 'multiple-locations-unsupported');
  } else if (locations.length > 1) {
    const canonicalSelections = locations.map(addStructuredLocation);
    const validSelections = canonicalSelections.filter(
      (selection): selection is CanonicalSearchLocation => Boolean(selection),
    );
    if (validSelections.length !== canonicalSelections.length) {
      return buildInvalidSearchUrl(transactionType, 'canonical-location-required');
    }

    multiLocationScope = createMultiLocationSearchScope(
      validSelections.map(selection => selection.scope),
    );
    if (!multiLocationScope) {
      return buildInvalidSearchUrl(transactionType, 'multiple-locations-unsupported');
    }
  } else if (locations.length > 0) {
    canonicalSelection = addStructuredLocation(locations[0]) || undefined;
    if (!canonicalSelection)
      return buildInvalidSearchUrl(transactionType, 'canonical-location-required');
  } else if (transactionType === 'for-sale' && searchQuery.trim()) {
    return buildInvalidSearchUrl(transactionType, 'canonical-location-required');
  } else if (searchQuery.trim() && !searchScope) {
    return buildInvalidSearchUrl(transactionType, 'canonical-location-required');
  }

  return (
    buildTransactionalGeographyHref({
      journey,
      scope: searchScope || multiLocationScope || canonicalSelection?.scope,
      searchAreaAvailability,
      localityRefinementId,
      context: searchScopeContext || canonicalSelection?.context,
      factualLocationId: canonicalSelection?.factualLocationId,
      filters,
      resultState: { sort: 'relevance', page: 0 },
    }) || '/'
  );
}

export function buildBuySearchUrl(input: PropertySearchInput): string {
  return buildPropertySearchUrl({ ...input, transactionType: 'for-sale' });
}
