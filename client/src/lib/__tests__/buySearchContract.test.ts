import { describe, expect, it } from 'vitest';

import {
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
        'propertyType=house&minPrice=500000&minBedrooms=2&minBathrooms=1&maxBedrooms=4&amenities=Pool',
      ),
    );

    expect(filters).toEqual({
      propertyType: 'house',
      minPrice: 500000,
      minBedrooms: 2,
      minBathrooms: 1,
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
        maxBedrooms: 4,
        amenities: ['Pool'],
      }),
    ).toEqual({
      listingType: 'sale',
      propertyType: 'apartment',
      listingSource: 'manual',
      minPrice: 500000,
      minBedrooms: 2,
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
});
