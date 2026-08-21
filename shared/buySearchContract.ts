/**
 * Canonical Buy search fields shared by URL construction, URL parsing, and
 * the public inventory request mapping.
 *
 * This is deliberately narrower than the full multi-journey public search
 * procedure. The S1 contract is for residential Buy only; unsupported fields
 * must not survive as active Buy filters.
 */

import {
  BUY_ACTIVE_PUBLIC_PROPERTY_TYPES,
  BUY_PUBLIC_PROPERTY_TYPES,
} from './property-taxonomy';

export const BUY_TRANSACTION_TYPE = 'for-sale' as const;
export const BUY_LISTING_TYPE = 'sale' as const;

// This is the product-facing choice set used by first-party Buy surfaces.
// Compatibility-only values remain accepted by the read contract below so a
// historical public URL never becomes a dead link.
export const BUY_PROPERTY_TYPES = BUY_ACTIVE_PUBLIC_PROPERTY_TYPES;

// The complete read vocabulary is deliberately separate from selectable UI.
export const BUY_COMPATIBLE_PROPERTY_TYPES = BUY_PUBLIC_PROPERTY_TYPES;

export type BuyPropertyType = (typeof BUY_COMPATIBLE_PROPERTY_TYPES)[number];

export const BUY_LISTING_SOURCES = ['manual', 'development'] as const;
export type BuyListingSource = (typeof BUY_LISTING_SOURCES)[number];

export const BUY_NUMERIC_FILTER_KEYS = [
  'minPrice',
  'maxPrice',
  'minBedrooms',
  'minBathrooms',
] as const;

export const BUY_BOUND_KEYS = ['minLat', 'maxLat', 'minLng', 'maxLng'] as const;

export const BUY_SEARCH_QUERY_KEYS = [
  'propertyType',
  'listingSource',
  ...BUY_NUMERIC_FILTER_KEYS,
  ...BUY_BOUND_KEYS,
] as const;

export interface BuySearchFilters {
  propertyType?: BuyPropertyType;
  listingSource?: BuyListingSource;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  minBathrooms?: number;
  minLat?: number;
  maxLat?: number;
  minLng?: number;
  maxLng?: number;
}

export interface BuyPublicSearchFilters extends BuySearchFilters {
  listingType: typeof BUY_LISTING_TYPE;
}

export function isBuyPropertyType(value: unknown): value is BuyPropertyType {
  return (
    typeof value === 'string' &&
    (BUY_COMPATIBLE_PROPERTY_TYPES as readonly string[]).includes(value)
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
 * Sanitizes arbitrary filter state into the supported Buy contract.
 * Unknown keys, invalid values, and contradictory price ranges are omitted.
 */
export function sanitizeBuySearchFilters(filters: Record<string, unknown>): BuySearchFilters {
  const sanitized: BuySearchFilters = {};

  if (isBuyPropertyType(filters.propertyType)) {
    sanitized.propertyType = filters.propertyType;
  }

  if (BUY_LISTING_SOURCES.includes(filters.listingSource as BuyListingSource)) {
    sanitized.listingSource = filters.listingSource as BuyListingSource;
  }

  const minPrice = parseNonNegativeNumber(filters.minPrice);
  const maxPrice = parseNonNegativeNumber(filters.maxPrice);
  if (minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice) {
    if (minPrice !== undefined) sanitized.minPrice = minPrice;
    if (maxPrice !== undefined) sanitized.maxPrice = maxPrice;
  }

  const minBedrooms = parseNonNegativeNumber(filters.minBedrooms);
  if (minBedrooms !== undefined) sanitized.minBedrooms = minBedrooms;

  const minBathrooms = parseNonNegativeNumber(filters.minBathrooms);
  if (minBathrooms !== undefined) sanitized.minBathrooms = minBathrooms;

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

/** Parses only the supported Buy query keys. All other query keys are ignored. */
export function parseBuySearchParams(searchParams: URLSearchParams): BuySearchFilters {
  const rawFilters: Record<string, unknown> = {};

  for (const key of BUY_SEARCH_QUERY_KEYS) {
    const value = searchParams.get(key);
    if (value !== null) rawFilters[key] = value;
  }

  return sanitizeBuySearchFilters(rawFilters);
}

/** Maps the canonical Buy fields to the public inventory procedure contract. */
export function toBuyPublicSearchFilters(filters: Record<string, unknown>): BuyPublicSearchFilters {
  return {
    listingType: BUY_LISTING_TYPE,
    ...sanitizeBuySearchFilters(filters),
  };
}
