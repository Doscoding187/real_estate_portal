import { describe, expect, it } from 'vitest';

import {
  RENT_FILTER_PRICE_CEILING,
  RENT_PROPERTY_TYPES,
  isRentPropertyType,
  parseRentSearchParams,
  sanitizeRentSearchFilters,
  toRentPublicSearchFilters,
} from '@/../../shared/rentSearchContract';

describe('canonical Rent search contract', () => {
  it('parses only supported URL fields', () => {
    expect(
      parseRentSearchParams(
        new URLSearchParams(
          'propertyType=apartment&minPrice=5000&maxPrice=15000&minBedrooms=2&maxBedrooms=4&minArea=60&amenities=Pool',
        ),
      ),
    ).toEqual({
      propertyType: 'apartment',
      minPrice: 5_000,
      maxPrice: 15_000,
      minBedrooms: 2,
      maxBedrooms: 4,
      minArea: 60,
    });
  });

  it('drops invalid values and contradictory pairs wholesale', () => {
    expect(
      sanitizeRentSearchFilters({
        propertyType: 'commercial',
        minPrice: 20_000,
        maxPrice: 10_000,
        minBedrooms: 4,
        maxBedrooms: 2,
        minBathrooms: 3,
        maxBathrooms: 1,
        minArea: 120,
        maxArea: 40,
        unknown: 'value',
      }),
    ).toEqual({});
  });

  it('keeps coherent bounded pairs while dropping only incoherent ones', () => {
    expect(
      sanitizeRentSearchFilters({
        minBedrooms: 2,
        maxBedrooms: 1,
        minBathrooms: 1,
        maxBathrooms: 2,
      }),
    ).toEqual({ minBathrooms: 1, maxBathrooms: 2 });
  });

  it('treats untouched slider defaults as absent intent so canonical URLs stay clean', () => {
    expect(sanitizeRentSearchFilters({ minPrice: 0, maxPrice: RENT_FILTER_PRICE_CEILING })).toEqual(
      {},
    );
    expect(
      parseRentSearchParams(
        new URLSearchParams(`minPrice=0&maxPrice=${RENT_FILTER_PRICE_CEILING}`),
      ),
    ).toEqual({});
  });

  it('never lets the slider ceiling silently exclude above-ceiling rentals', () => {
    const filters = toRentPublicSearchFilters({
      minPrice: 0,
      maxPrice: RENT_FILTER_PRICE_CEILING,
    });
    expect(filters.maxPrice).toBeUndefined();
    expect(filters.minPrice).toBeUndefined();
    expect(filters.listingType).toBe('rent');
  });

  it('accepts only whitelisted listing sources', () => {
    expect(sanitizeRentSearchFilters({ listingSource: 'development' })).toEqual({
      listingSource: 'development',
    });
    expect(sanitizeRentSearchFilters({ listingSource: 'syndication' })).toEqual({});
  });

  it('keeps the rental vocabulary aligned with the shared taxonomy authority', () => {
    expect(RENT_PROPERTY_TYPES).not.toContain('villa');
    expect(isRentPropertyType('farm')).toBe(true);
    expect(isRentPropertyType('land')).toBe(false);
  });
});
