import { describe, expect, it } from 'vitest';

import {
  FARM_INTENTS,
  FARM_PROPERTY_TYPE,
  parseFarmIntent,
  parseFarmSearchParams,
  sanitizeFarmSearchFilters,
  toFarmPublicSearchFilters,
} from '@/../../shared/farmSearchContract';

describe('canonical Farms & Smallholdings search contract', () => {
  it('locks inventory to the farm property type regardless of input', () => {
    expect(
      toFarmPublicSearchFilters({ propertyType: 'house', listingType: 'sale' }),
    ).toEqual({ listingType: 'sale', propertyType: 'farm' });
    expect(FARM_PROPERTY_TYPE).toBe('farm');
  });

  it('parses only supported URL fields and coerces numerics', () => {
    expect(
      parseFarmSearchParams(
        new URLSearchParams('listingType=rent&minPrice=2000000&minLandSize=100000&classification=agricultural_vacant_land'),
      ),
    ).toEqual({
      listingType: 'rent',
      minPrice: 2_000_000,
      minLandSize: 100_000,
    });
  });

  it('drops contradictory price and extent ranges wholesale', () => {
    expect(
      sanitizeFarmSearchFilters({
        minPrice: 5_000_000,
        maxPrice: 1_000_000,
        minLandSize: 500,
        maxLandSize: 100,
      }),
    ).toEqual({ listingType: 'sale' });
  });

  it('keeps coherent ranges on either axis independently', () => {
    expect(
      sanitizeFarmSearchFilters({
        minPrice: 1_000_000,
        maxLandSize: 250_000,
      }),
    ).toEqual({
      listingType: 'sale',
      minPrice: 1_000_000,
      maxLandSize: 250_000,
    });
  });

  it('falls back to sale for unknown intents instead of widening silently', () => {
    expect(parseFarmIntent('to-rent')).toBe('rent');
    expect(parseFarmIntent('garbage')).toBe('sale');
    expect(FARM_INTENTS).toEqual(['sale', 'rent']);
  });
});
