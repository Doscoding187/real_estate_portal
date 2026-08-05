import { describe, expect, it } from 'vitest';
import {
  PROVINCIAL_CONFIGS,
  resolveProvincialQueryState,
  validateProvincialConfig,
} from '@shared/provincialDiscovery';

describe('provincial discovery contract', () => {
  it('keeps a canonical province URL neutral until intent is supplied', () => {
    const state = resolveProvincialQueryState(new URLSearchParams());

    expect(state.journey).toBeUndefined();
    expect(state.unsupportedJourney).toBeUndefined();
    expect(state.filters).toEqual({});
  });

  it('preserves valid Buy intent, location identity and supported filters', () => {
    const state = resolveProvincialQueryState(
      new URLSearchParams(
        'journey=buy&province=gauteng&city=pretoria&locationId=city:2&propertyType=house&maxPrice=2000000&listingType=rent',
      ),
    );

    expect(state.journey).toBe('buy');
    expect(state.locationId).toBe('city:2');
    expect(state.locationLevel).toBe('city');
    expect(state.invalidLocationIdentity).toBe(false);
    expect(state.filters).toEqual({ propertyType: 'house', maxPrice: 2_000_000 });
  });

  it('rejects an identity that does not match the deepest geography', () => {
    const state = resolveProvincialQueryState(
      new URLSearchParams('journey=buy&province=gauteng&city=pretoria&locationId=suburb:7'),
    );

    expect(state.invalidLocationIdentity).toBe(true);
  });

  it('accepts a canonical location identifier when the link omits redundant slugs', () => {
    const state = resolveProvincialQueryState(
      new URLSearchParams('journey=buy&province=gauteng&locationId=city:2'),
    );

    expect(state.locationLevel).toBe('city');
    expect(state.invalidLocationIdentity).toBe(false);
  });

  it('removes unsupported Buy filters and records unsupported journeys without activating them', () => {
    const filters = resolveProvincialQueryState(
      new URLSearchParams('journey=commercial&propertyType=plot&minPrice=2000000&maxPrice=1000000'),
    );

    expect(filters.journey).toBeUndefined();
    expect(filters.unsupportedJourney).toBe('commercial');
    expect(filters.filters).toEqual({});
  });

  it('validates the Gauteng, structurally different Western Cape and sparse Northern Cape configs', () => {
    expect(validateProvincialConfig(PROVINCIAL_CONFIGS.gauteng)).toEqual([]);
    expect(validateProvincialConfig(PROVINCIAL_CONFIGS['western-cape'])).toEqual([]);
    expect(validateProvincialConfig(PROVINCIAL_CONFIGS['northern-cape'])).toEqual([]);
    expect(PROVINCIAL_CONFIGS.gauteng.majorMarkets.map(market => market.slug)).toEqual([
      'johannesburg',
      'pretoria',
    ]);
    expect(PROVINCIAL_CONFIGS['northern-cape'].modules.marketSnapshot).toBe(false);
  });
});
