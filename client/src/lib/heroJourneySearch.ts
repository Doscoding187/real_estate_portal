import { isProvinceSearch, normalizeLocationKey } from './locationUtils';
import { type SearchFilters } from './urlUtils';
import type { LocationNode } from '@/types/location';
import { generateIntentUrl, type SearchIntent } from './searchIntent';
import { isCanonicalLocationId } from '../../../shared/locationAuthority';

export const BUY_PROPERTY_TYPE_OPTIONS = [
  { value: 'house', label: 'House' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'villa', label: 'Villa' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'cluster_home', label: 'Cluster home' },
  { value: 'farm', label: 'Farm' },
  { value: 'plot', label: 'Plot' },
  { value: 'commercial', label: 'Commercial' },
] as const;

const BUY_PROPERTY_TYPES = new Set(BUY_PROPERTY_TYPE_OPTIONS.map(option => option.value));

export interface PropertySearchInput {
  searchQuery?: string;
  selectedLocations?: readonly LocationNode[];
  propertyType?: string;
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
  if (BUY_PROPERTY_TYPES.has(propertyType as (typeof BUY_PROPERTY_TYPE_OPTIONS)[number]['value'])) {
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

function addStructuredLocation(location: LocationNode, geography: SearchIntent['geography']) {
  const slug = normalizeLocationKey(location.slug || location.name);
  if (!slug) return;

  const provinceSlug = normalizeLocationKey(location.provinceSlug || '');
  const citySlug = normalizeLocationKey(location.citySlug || '');
  const locationId = String(location.id || '').trim();

  if (location.type === 'province') {
    geography.level = 'province';
    geography.province = slug;
  } else if (location.type === 'city') {
    geography.level = 'city';
    geography.city = slug;
    if (provinceSlug) geography.province = provinceSlug;
  } else {
    geography.level = 'locality';
    geography.suburb = slug;
    if (citySlug) geography.city = citySlug;
    if (provinceSlug) geography.province = provinceSlug;
  }

  if (isCanonicalLocationId(locationId)) geography.locationId = locationId;
}

export function buildPropertySearchUrl({
  transactionType,
  searchQuery = '',
  selectedLocations = [],
  propertyType,
  minPrice,
  maxPrice,
}: PropertySearchInput & { transactionType: 'for-sale' | 'to-rent' }): string {
  const locations = selectedLocations.filter(location => Boolean(location.slug || location.name));
  const geography: SearchIntent['geography'] = { level: 'country' };
  const filters: SearchFilters = {};

  addSupportedBuyFilters({ propertyType, minPrice, maxPrice }, filters);

  if (locations.length > 0) {
    addStructuredLocation(locations[0], geography);
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
    defaults: { propertyCategory: 'residential', sort: 'relevance' },
    routeMode: 'results',
  });
}

export function buildBuySearchUrl(input: PropertySearchInput): string {
  return buildPropertySearchUrl({ ...input, transactionType: 'for-sale' });
}
