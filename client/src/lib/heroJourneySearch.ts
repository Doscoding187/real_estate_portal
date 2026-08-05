import { isProvinceSearch, normalizeLocationKey } from './locationUtils';
import { type SearchFilters } from './urlUtils';
import type { LocationNode } from '@/types/location';
import {
  createSearchIntentValidation,
  generateIntentUrl,
  type SearchIntent,
  type SearchIntentValidationCode,
} from './searchIntent';
import {
  encodeCanonicalLocationId,
  parseCanonicalLocationId,
} from '../../../shared/locationAuthority';
import { isBuyPropertyType, sanitizeBuySearchFilters } from '../../../shared/buySearchContract';

export const BUY_PROPERTY_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'cluster_home', label: 'Cluster home' },
  { value: 'farm', label: 'Farm' },
] as const;

const LEGACY_PROPERTY_TYPES = new Set([
  ...BUY_PROPERTY_TYPE_OPTIONS.map(option => option.value),
  'plot',
  'commercial',
]);

export interface PropertySearchInput {
  searchQuery?: string;
  selectedLocations?: readonly LocationNode[];
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
 * Preserve the existing non-Buy composer behavior while S1 tightens only the
 * launch-critical Buy contract.
 */
function addSupportedLegacyFilters(input: PropertySearchInput, filters: SearchFilters) {
  const propertyType = String(input.propertyType || '')
    .trim()
    .toLowerCase();
  if (LEGACY_PROPERTY_TYPES.has(propertyType)) {
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

function addStructuredLocation(
  location: LocationNode,
  geography: SearchIntent['geography'],
  requireCanonicalIdentity = false,
) {
  const slug = normalizeLocationKey(location.slug || location.name);
  if (!slug) return false;

  const provinceSlug = normalizeLocationKey(location.provinceSlug || '');
  const citySlug = normalizeLocationKey(location.citySlug || '');
  const locationId = String(location.canonicalLocationId || location.id || '').trim();
  const canonicalLocation = parseCanonicalLocationId(locationId);

  if (
    requireCanonicalIdentity &&
    (!canonicalLocation || canonicalLocation.level !== location.type)
  ) {
    return false;
  }

  if (location.type === 'province') {
    geography.level = 'province';
    geography.province = slug;
  } else if (location.type === 'city') {
    geography.level = 'city';
    geography.city = slug;
    if (provinceSlug) geography.province = provinceSlug;
  } else {
    geography.level = 'suburb';
    geography.suburb = slug;
    if (citySlug) geography.city = citySlug;
    if (provinceSlug) geography.province = provinceSlug;
  }

  if (canonicalLocation) {
    geography.locationId = encodeCanonicalLocationId(canonicalLocation.level, canonicalLocation.id);
  }
  return true;
}

function buildInvalidBuySearchUrl(code: SearchIntentValidationCode): string {
  return generateIntentUrl({
    transactionType: 'for-sale',
    geography: { level: 'country' },
    filters: {},
    resultState: { sort: 'relevance', page: 0 },
    defaults: { propertyCategory: 'residential', sort: 'relevance' },
    routeMode: 'results',
    validation: createSearchIntentValidation(code),
  });
}

export function buildPropertySearchUrl({
  transactionType,
  searchQuery = '',
  selectedLocations = [],
  propertyType,
  minPrice,
  maxPrice,
  minBedrooms,
  minBathrooms,
}: PropertySearchInput & { transactionType: 'for-sale' | 'to-rent' }): string {
  const locations = selectedLocations.filter(location => Boolean(location.slug || location.name));
  const geography: SearchIntent['geography'] = { level: 'country' };
  const filters: SearchFilters = {};

  const filterInput = { propertyType, minPrice, maxPrice, minBedrooms, minBathrooms };
  if (transactionType === 'for-sale') {
    addSupportedBuyFilters(filterInput, filters);
  } else {
    addSupportedLegacyFilters(filterInput, filters);
  }

  if (transactionType === 'for-sale' && locations.length > 1) {
    return buildInvalidBuySearchUrl('multiple-locations-unsupported');
  }

  if (locations.length > 0) {
    const isCanonical = addStructuredLocation(
      locations[0],
      geography,
      transactionType === 'for-sale',
    );
    if (transactionType === 'for-sale' && !isCanonical) {
      return buildInvalidBuySearchUrl('canonical-location-required');
    }
  } else if (transactionType === 'for-sale' && searchQuery.trim()) {
    return buildInvalidBuySearchUrl('canonical-location-required');
  } else {
    const text = searchQuery.trim();
    if (text) {
      const province = isProvinceSearch(text);
      if (province) {
        geography.level = 'province';
        geography.province = province;
      } else {
        geography.level = 'city';
        geography.city = normalizeLocationKey(text);
      }
    }
  }

  return generateIntentUrl({
    transactionType,
    geography,
    filters,
    resultState: { sort: 'relevance', page: 0 },
    defaults: { propertyCategory: 'residential', sort: 'relevance' },
    routeMode: 'results',
  });
}

export function buildBuySearchUrl(input: PropertySearchInput): string {
  return buildPropertySearchUrl({ ...input, transactionType: 'for-sale' });
}
