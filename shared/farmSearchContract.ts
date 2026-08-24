/**
 * Canonical Farms & Smallholdings search fields shared by URL construction,
 * URL parsing, and the public inventory request mapping.
 *
 * Farm is a specialist journey over the canonical published-inventory search:
 * every result is an eligible published property with propertyType 'farm'.
 * Land extent uses the existing minLandSize/maxLandSize predicates
 * (COALESCE(landAreaM2, area)). Agricultural attributes such as irrigation,
 * water access, or land-use classification do not exist as structured data
 * and are deliberately absent here until a dedicated data workstream lands.
 */

import { RENT_LISTING_TYPE, RENT_TRANSACTION_TYPE } from './rentSearchContract';

export const FARM_SALE_INTENT = 'sale' as const;
export const FARM_RENT_INTENT = RENT_LISTING_TYPE;

/**
 * The journey serves both transactional intents over one page, matching the
 * consumer catalogue's Buy and Rent "Farms & Smallholdings" entries.
 */
export const FARM_INTENTS = [FARM_SALE_INTENT, FARM_RENT_INTENT] as const;
export type FarmIntent = (typeof FARM_INTENTS)[number];

export const FARM_PROPERTY_TYPE = 'farm' as const;

export const FARM_SEARCH_QUERY_KEYS = [
  'listingType',
  'minPrice',
  'maxPrice',
  'minLandSize',
  'maxLandSize',
] as const;

export interface FarmSearchFilters {
  listingType: FarmIntent;
  minPrice?: number;
  maxPrice?: number;
  minLandSize?: number;
  maxLandSize?: number;
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

/** Resolves a URL intent value; anything unsupported falls back to sale. */
export function parseFarmIntent(value: unknown): FarmIntent {
  return value === RENT_TRANSACTION_TYPE || value === 'to-rent' || value === FARM_RENT_INTENT
    ? FARM_RENT_INTENT
    : FARM_SALE_INTENT;
}

/**
 * Sanitizes arbitrary filter state into the supported Farm contract.
 * Contradictory ranges are dropped wholesale; half a range is never a
 * truthful representation of the consumer's intent.
 */
export function sanitizeFarmSearchFilters(filters: Record<string, unknown>): FarmSearchFilters {
  const sanitized: FarmSearchFilters = {
    listingType: parseFarmIntent(filters.listingType),
  };

  const priceRange: Array<['minPrice' | 'maxPrice', number | undefined]> = [];
  const minPrice = parseNonNegativeNumber(filters.minPrice);
  const maxPrice = parseNonNegativeNumber(filters.maxPrice);
  if (!(minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice)) {
    if (minPrice !== undefined) priceRange.push(['minPrice', minPrice]);
    if (maxPrice !== undefined) priceRange.push(['maxPrice', maxPrice]);
  }
  for (const [key, value] of priceRange) sanitized[key] = value;

  const extentRange: Array<['minLandSize' | 'maxLandSize', number | undefined]> = [];
  const minLandSize = parseNonNegativeNumber(filters.minLandSize);
  const maxLandSize = parseNonNegativeNumber(filters.maxLandSize);
  if (!(minLandSize !== undefined && maxLandSize !== undefined && minLandSize > maxLandSize)) {
    if (minLandSize !== undefined) extentRange.push(['minLandSize', minLandSize]);
    if (maxLandSize !== undefined) extentRange.push(['maxLandSize', maxLandSize]);
  }
  for (const [key, value] of extentRange) sanitized[key] = value;

  return sanitized;
}

/** Parses only the supported Farm query keys. All other query keys are ignored. */
export function parseFarmSearchParams(searchParams: URLSearchParams): FarmSearchFilters {
  const rawFilters: Record<string, unknown> = {};

  for (const key of FARM_SEARCH_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value !== null) rawFilters[key] = value;
  }

  return sanitizeFarmSearchFilters(rawFilters);
}

/**
 * Maps the canonical Farm fields onto the public inventory procedure contract.
 * The journey itself constrains inventory to farm-classified published
 * listings; no other property type can be composed through this contract.
 */
export function toFarmPublicSearchFilters(
  filters: Record<string, unknown>,
): Record<string, unknown> {
  const sanitized = sanitizeFarmSearchFilters(filters);
  return {
    ...sanitized,
    propertyType: FARM_PROPERTY_TYPE,
  };
}
