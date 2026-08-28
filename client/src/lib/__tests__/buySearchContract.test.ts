import { describe, expect, it } from 'vitest';

import {
  BUY_FILTER_PRICE_CEILING,
  BUY_PROPERTY_TYPES,
  isActiveBuyPropertyType,
  parseBuySearchParams,
  sanitizeBuySearchFilters,
  toBuyPublicSearchFilters,
} from '@/../../shared/buySearchContract';

describe('canonical Buy search contract', () => {
  it('parses only supported URL fields', () => {
    const filters = parseBuySearchParams(
      new URLSearchParams(
        'propertyType=house&minPrice=500000&minBedrooms=2&minBathrooms=1&minArea=120&maxArea=260&maxBedrooms=4&amenities=Pool',
      ),
    );

    expect(filters).toEqual({
      propertyType: 'house',
      minPrice: 500000,
      minBedrooms: 2,
      minBathrooms: 1,
      minArea: 120,
      maxArea: 260,
    });
  });

  it('removes invalid values and contradictory price ranges', () => {
    expect(
      sanitizeBuySearchFilters({
        propertyType: 'commercial',
        minPrice: 2_000_000,
        maxPrice: 1_000_000,
        minBedrooms: -1,
        unknown: 'value',
      }),
    ).toEqual({});
  });

  it('accepts only complete, ordered map bounds', () => {
    expect(
      sanitizeBuySearchFilters({
        minLat: -26.2,
        maxLat: -26,
        minLng: 28,
        maxLng: 28.1,
      }),
    ).toMatchObject({
      minLat: -26.2,
      maxLat: -26,
      minLng: 28,
      maxLng: 28.1,
    });

    expect(sanitizeBuySearchFilters({ minLat: -26.2, maxLat: -26, minLng: 28 })).not.toHaveProperty(
      'minLat',
    );
    expect(
      sanitizeBuySearchFilters({ minLat: -26, maxLat: -26.2, minLng: 28, maxLng: 28.1 }),
    ).not.toHaveProperty('maxLat');
  });

  it('maps the same fields to the public sale query', () => {
    expect(
      toBuyPublicSearchFilters({
        propertyType: 'apartment',
        listingSource: 'manual',
        minPrice: '500000',
        minBedrooms: '2',
        minArea: '80',
        maxArea: '140',
        maxBedrooms: 4,
        amenities: ['Pool'],
      }),
    ).toEqual({
      listingType: 'sale',
      propertyType: 'apartment',
      listingSource: 'manual',
      minPrice: 500000,
      minBedrooms: 2,
      minArea: 80,
      maxArea: 140,
    });
  });

  it('keeps historical villa searches readable without presenting Villa as an active Buy choice', () => {
    expect(BUY_PROPERTY_TYPES).not.toContain('villa');
    expect(isActiveBuyPropertyType('villa')).toBe(false);

    expect(
      parseBuySearchParams(new URLSearchParams('propertyType=villa&minPrice=2500000')),
    ).toEqual({
      propertyType: 'villa',
      minPrice: 2_500_000,
    });
  });

  it('treats untouched slider defaults as absent intent so canonical URLs stay clean', () => {
    expect(sanitizeBuySearchFilters({ minPrice: 0, maxPrice: BUY_FILTER_PRICE_CEILING })).toEqual(
      {},
    );
    expect(
      parseBuySearchParams(new URLSearchParams(`minPrice=0&maxPrice=${BUY_FILTER_PRICE_CEILING}`)),
    ).toEqual({});
    expect(toBuyPublicSearchFilters({ minPrice: 0, maxPrice: BUY_FILTER_PRICE_CEILING })).toEqual({
      listingType: 'sale',
    });
  });

  it('keeps explicit non-default bounds while dropping only the default-equal side', () => {
    expect(sanitizeBuySearchFilters({ minPrice: 0, maxPrice: 750_000 })).toEqual({
      maxPrice: 750_000,
    });
    expect(
      sanitizeBuySearchFilters({ minPrice: 1_500_000, maxPrice: BUY_FILTER_PRICE_CEILING }),
    ).toEqual({ minPrice: 1_500_000 });
    expect(
      sanitizeBuySearchFilters({ minPrice: 1_500_000, maxPrice: BUY_FILTER_PRICE_CEILING + 1 }),
    ).toEqual({ minPrice: 1_500_000, maxPrice: 50_000_001 });
  });

  it('never lets the slider ceiling silently exclude above-ceiling inventory', () => {
    // A consumer who touched the slider maximum expressed "up to the ceiling",
    // not "exclude everything above it".
    const filters = toBuyPublicSearchFilters({
      minPrice: 0,
      maxPrice: BUY_FILTER_PRICE_CEILING,
    });
    expect(filters.maxPrice).toBeUndefined();
    expect(filters.minPrice).toBeUndefined();
  });
});
