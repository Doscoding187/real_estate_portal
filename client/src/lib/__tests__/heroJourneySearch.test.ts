import { describe, expect, it } from 'vitest';
import {
  BUY_PROPERTY_TYPE_OPTIONS,
  buildBuySearchUrl,
  buildDevelopmentsSearchUrl,
  buildPropertySearchUrl,
  extractActiveSearchRefinementFilters,
  getPriceRangeError,
  resolveCanonicalLocationSelection,
} from '@/lib/heroJourneySearch';
import { resolveSearchIntent } from '@/lib/searchIntent';
import type { LocationNode } from '@/types/location';

const PLACE_ID = 'pl-place-01-000000000000000000000001';
const CITY: LocationNode = {
  canonicalPlaceId: PLACE_ID,
  name: 'Johannesburg',
  slug: 'johannesburg',
  type: 'city',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
};
const LOCALITY: LocationNode = {
  canonicalPlaceId: 'pl-place-01-000000000000000000000002',
  name: 'Sandton',
  slug: 'sandton',
  type: 'suburb',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
};

describe('canonical transactional search navigation', () => {
  it('opens country-wide Buy only when the user intentionally selects no Place', () => {
    expect(buildBuySearchUrl({})).toBe('/property-for-sale');
  });

  it('requires an admitted Place selection instead of resolving typed city text', () => {
    expect(buildBuySearchUrl({ searchQuery: 'Johannesburg' })).toBe(
      '/property-for-sale?searchError=invalid-place-authority',
    );
  });

  it('serializes one selected Place ID with supported filters', () => {
    const url = buildBuySearchUrl({
      selectedLocations: [LOCALITY],
      propertyType: 'house',
      minPrice: '500000',
      maxPrice: '2000000',
    });
    const parsedUrl = new URL(url, 'https://listify.test');
    const intent = resolveSearchIntent(parsedUrl.pathname, {}, parsedUrl.searchParams);

    expect(parsedUrl.searchParams.get('canonicalPlaceId')).toBe(LOCALITY.canonicalPlaceId);
    expect(parsedUrl.searchParams.has('city')).toBe(false);
    expect(parsedUrl.searchParams.has('suburb')).toBe(false);
    expect(intent.transactionType).toBe('for-sale');
    expect(intent.geography).toEqual({
      level: 'canonical_place',
      canonicalPlaceId: LOCALITY.canonicalPlaceId,
    });
    expect(intent.filters).toMatchObject({
      propertyType: 'house',
      minPrice: 500000,
      maxPrice: 2000000,
    });
  });

  it('does not drop a selected Place or widen the search when its display label is empty', () => {
    const placeWithoutDisplayText: LocationNode = {
      ...CITY,
      name: '',
      slug: '',
      provinceSlug: undefined,
      citySlug: undefined,
    };
    const url = buildBuySearchUrl({ selectedLocations: [placeWithoutDisplayText] });
    const params = new URL(url, 'https://listify.test').searchParams;

    expect(params.get('canonicalPlaceId')).toBe(PLACE_ID);
    expect(params.get('searchError')).toBeNull();
  });

  it('rejects multiple Places and mixed Place plus Search Scope inputs', () => {
    expect(buildBuySearchUrl({ selectedLocations: [CITY, LOCALITY] })).toBe(
      '/property-for-sale?searchError=invalid-place-authority',
    );
    expect(
      buildPropertySearchUrl({
        transactionType: 'for-sale',
        selectedLocations: [CITY],
        searchScope: { kind: 'metro_city', canonicalPlaceId: PLACE_ID },
      }),
    ).toBe('/property-for-sale?searchError=invalid-place-authority');
  });

  it('replaces a selected Place in a single-place journey instead of forming an OR scope', () => {
    const nextPlace: LocationNode = {
      ...LOCALITY,
      canonicalPlaceId: 'pl-place-01-000000000000000000000003',
      name: 'Rosebank',
      slug: 'rosebank',
    };

    expect(resolveCanonicalLocationSelection([LOCALITY], nextPlace, 1)).toEqual({
      locations: [nextPlace],
      outcome: 'replaced-incompatible',
    });
  });

  it('rejects provider IDs and labels as Place authority', () => {
    const providerLocation: LocationNode = {
      id: 'ChIJgoogle-place-id',
      name: 'Sandton',
      slug: 'sandton',
      type: 'suburb',
    } as unknown as LocationNode;
    expect(buildBuySearchUrl({ selectedLocations: [providerLocation] })).toBe(
      '/property-for-sale?searchError=invalid-place-authority',
    );
  });

  it('preserves supported price and bedroom refinements and rejects invalid ranges', () => {
    const params = new URL(
      buildBuySearchUrl({
        selectedLocations: [CITY],
        propertyType: 'house',
        minPrice: '500000',
        maxPrice: '2000000',
        minBedrooms: 2,
        minBathrooms: 1,
      }),
      'https://listify.test',
    ).searchParams;

    expect(params.get('canonicalPlaceId')).toBe(PLACE_ID);
    expect(params.get('propertyType')).toBe('house');
    expect(params.get('minPrice')).toBe('500000');
    expect(params.get('maxPrice')).toBe('2000000');
    expect(params.get('minBedrooms')).toBe('2');
    expect(params.get('minBathrooms')).toBe('1');
    expect(getPriceRangeError('2000000', '1000000')).toBe(
      'Minimum price must be less than or equal to maximum price.',
    );
    expect(getPriceRangeError('-1', '1000000')).toBe('Enter valid non-negative prices.');
    expect(getPriceRangeError('500000', '2000000')).toBeUndefined();
  });

  it('keeps the active Buy composer vocabulary bounded', () => {
    expect(BUY_PROPERTY_TYPE_OPTIONS.map(option => option.value)).not.toContain('villa');
  });
});

describe('development and navbar Place handoffs', () => {
  it('requires exactly one canonical Place for the gated developments route', () => {
    const url = buildDevelopmentsSearchUrl({
      canonicalPlaceId: PLACE_ID,
      developmentType: 'residential',
      minPrice: 500000,
    });
    const parsed = new URL(url, 'https://listify.test');

    expect(parsed.pathname).toBe('/new-developments');
    expect(parsed.searchParams.get('canonicalPlaceId')).toBe(PLACE_ID);
    expect(parsed.searchParams.has('city')).toBe(false);
    expect(buildDevelopmentsSearchUrl({ canonicalPlaceId: 'ChIJgoogle-place-id' })).toBe(
      '/new-developments?searchError=canonical-place-required',
    );
  });

  it('extracts supported refinements without carrying geographic display text', () => {
    expect(
      extractActiveSearchRefinementFilters(
        `?canonicalPlaceId=${PLACE_ID}&city=johannesburg&propertyType=apartment&minPrice=1000000&minBedrooms=3&sort=price_asc`,
      ),
    ).toEqual({ propertyType: 'apartment', minPrice: 1_000_000, minBedrooms: 3 });
  });
});
