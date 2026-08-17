import { normalizeLocationKey } from './locationUtils';
import { type SearchFilters } from './urlUtils';
import type { LocationNode } from '@/types/location';
import {
  createSearchIntentValidation,
  generateIntentUrl,
  type SearchIntent,
  type SearchIntentValidationCode,
} from './searchIntent';
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

export interface DevelopmentsSearchInput {
  selectedLocations?: readonly LocationNode[];
  developmentType?: string;
  developmentStatus?: string;
  minPrice?: string | number;
  maxPrice?: string | number;
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

/**
 * Canonical homepage handoff for the gated New Developments journey.
 * The journey is intentionally not visible while its activation flag is off,
 * but when the flag is enabled this path carries the same canonical location
 * and URL-owned refinement state consumed by /new-developments.
 */
export function buildDevelopmentsSearchUrl({
  selectedLocations = [],
  developmentType,
  developmentStatus,
  minPrice,
  maxPrice,
}: DevelopmentsSearchInput): string {
  const locations = selectedLocations.filter(location => Boolean(location.slug || location.name));
  const selections = locations.map(addStructuredLocation);
  const validSelections = selections.filter(
    (selection): selection is CanonicalSearchLocation => Boolean(selection),
  );

  if (validSelections.length !== locations.length || validSelections.length === 0) {
    return '/new-developments?searchError=canonical-location-required';
  }

  const geography: SearchIntent['geography'] = { level: 'country' };
  if (validSelections.length === 1) {
    const [selection] = validSelections;
    if (selection.scope.kind === 'province') {
      geography.level = 'province';
    } else if (selection.scope.kind === 'metro_city') {
      geography.level = 'city';
    } else if (selection.scope.kind === 'locality') {
      geography.level = 'suburb';
    } else {
      return '/new-developments?searchError=canonical-location-required';
    }
    geography.locationId = selection.scope.canonicalLocationId;
    Object.assign(geography, selection.context);
  } else {
    const multiLocationScope = createMultiLocationSearchScope(
      validSelections.map(selection => selection.scope),
    );
    if (!multiLocationScope || multiLocationScope.kind !== 'multi_location') {
      return '/new-developments?searchError=canonical-location-required';
    }
    const canonicalIds = multiLocationScope.members
      .filter(member => member.kind !== 'search_area')
      .map(member => member.canonicalLocationId);
    if (canonicalIds.length !== validSelections.length) {
      return '/new-developments?searchError=canonical-location-required';
    }
    geography.level = 'multi_location';
    geography.locationIds = canonicalIds;
  }

  const filters: Record<string, unknown> = {};
  const normalizedType = String(developmentType || '').trim().toLowerCase();
  if (['residential', 'commercial', 'mixed_use', 'land'].includes(normalizedType)) {
    filters.developmentType = normalizedType;
  }

  const normalizedStatus = String(developmentStatus || '').trim().toLowerCase();
  if (['launching-soon', 'selling', 'sold-out'].includes(normalizedStatus)) {
    filters.developmentStatus = normalizedStatus;
  }

  const normalizedMinPrice = parseNonNegativeNumber(minPrice);
  const normalizedMaxPrice = parseNonNegativeNumber(maxPrice);
  if (
    normalizedMinPrice !== undefined &&
    (normalizedMaxPrice === undefined || normalizedMinPrice <= normalizedMaxPrice)
  ) {
    filters.minPrice = normalizedMinPrice;
  }
  if (
    normalizedMaxPrice !== undefined &&
    (normalizedMinPrice === undefined || normalizedMinPrice <= normalizedMaxPrice)
  ) {
    filters.maxPrice = normalizedMaxPrice;
  }

  return generateIntentUrl({
    transactionType: 'developments',
    geography,
    filters,
    resultState: { sort: 'relevance', page: 0 },
    defaults: { propertyCategory: 'residential', sort: 'relevance' },
    routeMode: 'results',
  });
}
