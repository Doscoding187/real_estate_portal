/**
 * Canonical Rent search fields shared by URL construction, URL parsing, and
 * the public inventory request mapping.
 *
 * This mirrors shared/buySearchContract.ts for the residential Rent journey.
 * Unsupported fields must not survive as active Rent filters, and historical
 * direct URLs remain readable through the same compatibility rules the public
 * validation boundary enforces server-side.
 */

import { RENT_PUBLIC_PROPERTY_TYPES } from './property-taxonomy';

export const RENT_TRANSACTION_TYPE = 'to-rent' as const;
export const RENT_LISTING_TYPE = 'rent' as const;

// The first-party choice set used by Rent surfaces; kept separate from the
// full public vocabulary so future rental types can land without silently
// appearing in composed searches.
export const RENT_PROPERTY_TYPES = RENT_PUBLIC_PROPERTY_TYPES;

export type RentPropertyType = (typeof RENT_PUBLIC_PROPERTY_TYPES)[number];

export const RENT_LISTING_SOURCES = ['manual', 'development'] as const;
export type RentListingSource = (typeof RENT_LISTING_SOURCES)[number];

/**
 * Inclusive upper bound of the consumer rental-budget control. `R250k+`
 * deliberately means no maximum, so an untouched control never excludes
 * higher-value rentals or pollutes a canonical URL with a fake budget cap.
 */
export const RENT_FILTER_PRICE_CEILING = 250_000;
export const RENT_FILTER_PRICE_STEP = 1_000;

export const RENT_NUMERIC_FILTER_KEYS = [
  'minPrice',
  'maxPrice',
  'minBedrooms',
  'maxBedrooms',
  'minBathrooms',
  'maxBathrooms',
  'minArea',
  'maxArea',
] as const;

export const RENT_BOUND_KEYS = ['minLat', 'maxLat', 'minLng', 'maxLng'] as const;

export const RENT_SEARCH_QUERY_KEYS = [
  'propertyType',
  'listingSource',
  ...RENT_NUMERIC_FILTER_KEYS,
  ...RENT_BOUND_KEYS,
] as const;

export interface RentSearchFilters {
  propertyType?: RentPropertyType;
  listingSource?: RentListingSource;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  minArea?: number;
  maxArea?: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export interface RentPublicSearchFilters extends RentSearchFilters {
  listingType: typeof RENT_LISTING_TYPE;
}

export function isRentPropertyType(value: unknown): value is RentPropertyType {
  return (
    typeof value === 'string' && (RENT_PUBLIC_PROPERTY_TYPES as readonly string[]).includes(value)
  );
}

function parseFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value !== 'string' || value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseNonNegativeNumber(value: unknown): number | undefined {
  const parsed = parseFiniteNumber(value);
  return parsed !== undefined && parsed >= 0 ? parsed : undefined;
}

/**
 * Keeps a bounded pair (min/max) only when coherent. Contradictory ranges are
 * dropped wholesale: half a range is never a truthful representation of the
 * consumer's intent.
 */
function sanitizeRange<K extends string>(
  state: { [P in K]?: number },
  minimumKey: K,
  maximumKey: K,
  minimum: number | undefined,
  maximum: number | undefined,
): void {
  if (minimum === undefined && maximum === undefined) return;
  if (minimum !== undefined && maximum !== undefined && minimum > maximum) return;
  if (minimum !== undefined) state[minimumKey] = minimum;
  if (maximum !== undefined) state[maximumKey] = maximum;
}

/**
 * Sanitizes arbitrary filter state into the supported Rent contract.
 * Unknown keys, invalid values, contradictory ranges, and slider-default
 * bounds are omitted.
 */
export function sanitizeRentSearchFilters(filters: Record<string, unknown>): RentSearchFilters {
  const sanitized: RentSearchFilters = {};

  if (isRentPropertyType(filters.propertyType)) {
    sanitized.propertyType = filters.propertyType;
  }

  if (RENT_LISTING_SOURCES.includes(filters.listingSource as RentListingSource)) {
    sanitized.listingSource = filters.listingSource as RentListingSource;
  }

  // Slider defaults carry no consumer intent; keeping them would pollute
  // canonical URLs with explicit bounds the consumer never chose.
  const rawMinPrice = parseNonNegativeNumber(filters.minPrice);
  const effectiveMinPrice = rawMinPrice === 0 ? undefined : rawMinPrice;
  const rawMaxPrice = parseNonNegativeNumber(filters.maxPrice);
  const effectiveMaxPrice = rawMaxPrice === RENT_FILTER_PRICE_CEILING ? undefined : rawMaxPrice;
  sanitizeRange(sanitized, 'minPrice', 'maxPrice', effectiveMinPrice, effectiveMaxPrice);

  sanitizeRange(
    sanitized,
    'minBedrooms',
    'maxBedrooms',
    parseNonNegativeNumber(filters.minBedrooms),
    parseNonNegativeNumber(filters.maxBedrooms),
  );

  sanitizeRange(
    sanitized,
    'minBathrooms',
    'maxBathrooms',
    parseNonNegativeNumber(filters.minBathrooms),
    parseNonNegativeNumber(filters.maxBathrooms),
  );

  sanitizeRange(
    sanitized,
    'minArea',
    'maxArea',
    parseNonNegativeNumber(filters.minArea),
    parseNonNegativeNumber(filters.maxArea),
  );

  const minLat = parseFiniteNumber(filters.minLat);
  const maxLat = parseFiniteNumber(filters.maxLat);
  const minLng = parseFiniteNumber(filters.minLng);
  const maxLng = parseFiniteNumber(filters.maxLng);
  const hasValidBounds =
    minLat !== undefined &&
    maxLat !== undefined &&
    minLng !== undefined &&
    maxLng !== undefined &&
    minLat >= -90 &&
    maxLat <= 90 &&
    minLng >= -180 &&
    maxLng <= 180 &&
    minLat <= maxLat &&
    minLng <= maxLng;

  if (hasValidBounds) {
    sanitized.minLat = minLat;
    sanitized.maxLat = maxLat;
    sanitized.minLng = minLng;
    sanitized.maxLng = maxLng;
  }

  return sanitized;
}

/** Parses only the supported Rent query keys. All other query keys are ignored. */
export function parseRentSearchParams(searchParams: URLSearchParams): RentSearchFilters {
  const rawFilters: Record<string, unknown> = {};

  for (const key of RENT_SEARCH_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value !== null) rawFilters[key] = value;
  }

  return sanitizeRentSearchFilters(rawFilters);
}

/** Maps the canonical Rent fields to the public inventory procedure contract. */
export function toRentPublicSearchFilters(
  filters: Record<string, unknown>,
): RentPublicSearchFilters {
  return {
    listingType: RENT_LISTING_TYPE,
    ...sanitizeRentSearchFilters(filters),
  };
}
