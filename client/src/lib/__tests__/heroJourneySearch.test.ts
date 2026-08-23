import { describe, expect, it } from 'vitest';
import {
  BUY_PROPERTY_TYPE_OPTIONS,
  buildBuySearchUrl,
  buildPropertySearchUrl,
  extractActiveSearchRefinementFilters,
  getPriceRangeError,
} from '@/lib/heroJourneySearch';
import { resolveSearchIntent } from '@/lib/searchIntent';
import type { LocationNode } from '@/types/location';

const johannesburg: LocationNode = {
  id: 'city:12',
  name: 'Johannesburg',
  slug: 'johannesburg',
  type: 'city',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  canonicalPath: '/property-for-sale?city=johannesburg&province=gauteng',
};

const sandton: LocationNode = {
  id: 'suburb:42',
  name: 'Sandton',
  slug: 'sandton',
  type: 'suburb',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
  canonicalPath: '/property-for-sale?suburb=sandton&city=johannesburg&province=gauteng',
};

const rosebank: LocationNode = {
  id: 'suburb:43',
  name: 'Rosebank',
  slug: 'rosebank',
  type: 'suburb',
  provinceSlug: 'gauteng',
  citySlug: 'johannesburg',
};

const gauteng: LocationNode = {
  id: 'province:1',
  name: 'Gauteng',
  slug: 'gauteng',
  type: 'province',
  canonicalPath: '/property-for-sale?province=gauteng&locationId=province%3A1',
};

describe('Buy journey URL authority', () => {
  it('uses the canonical sale root for an empty Buy search', () => {
    expect(buildBuySearchUrl({})).toBe('/property-for-sale');
  });

  it('does not guess unresolved free text as a city', () => {
    expect(buildBuySearchUrl({ searchQuery: 'Johannesburg' })).toBe(
      '/property-for-sale?searchError=canonical-location-required',
    );
  });

  it('sends a structured province selection to the sale-results authority', () => {
    const url = buildBuySearchUrl({ selectedLocations: [gauteng] });
    const params = new URL(url, 'https://listify.test').searchParams;

    expect(params.get('province')).toBe('gauteng');
    expect(params.get('locationId')).toBe('province:1');
  });

  it('preserves province identity alongside supported refinements', () => {
    const params = new URL(
      buildBuySearchUrl({
        selectedLocations: [gauteng],
        propertyType: 'house',
        maxPrice: 2_000_000,
      }),
      'https://listify.test',
    ).searchParams;

    expect(params.get('province')).toBe('gauteng');
    expect(params.get('locationId')).toBe('province:1');
    expect(params.get('propertyType')).toBe('house');
    expect(params.get('maxPrice')).toBe('2000000');
  });

  it('preserves structured location identity, hierarchy and supported filters', () => {
    const url = buildBuySearchUrl({
      selectedLocations: [sandton],
      propertyType: 'house',
      minPrice: '500000',
      maxPrice: '2000000',
    });
    const params = new URL(url, 'https://listify.test').searchParams;

    expect(url).toContain('/property-for-sale?');
    expect(params.get('suburb')).toBe('sandton');
    expect(params.get('city')).toBe('johannesburg');
    expect(params.get('province')).toBe('gauteng');
    expect(params.get('locationId')).toBe('suburb:42');
    expect(params.get('propertyType')).toBe('house');
    expect(params.get('minPrice')).toBe('500000');
    expect(params.get('maxPrice')).toBe('2000000');
  });

  it('serializes deliberate sibling locations as a canonical OR selection', () => {
    const url = buildBuySearchUrl({ selectedLocations: [sandton, rosebank] });
    const params = new URL(url, 'https://listify.test').searchParams;

    expect(params.getAll('locationIds')).toEqual(['suburb:42', 'suburb:43']);
    expect(params.get('locationId')).toBeNull();
    expect(params.get('city')).toBeNull();
    expect(params.get('suburb')).toBeNull();
  });

  it('rejects mixed-level selections instead of widening them to their parent', () => {
    const url = buildBuySearchUrl({ selectedLocations: [johannesburg, sandton] });
    const params = new URL(url, 'https://listify.test').searchParams;

    expect(params.get('searchError')).toBe('multiple-locations-unsupported');
    expect(params.get('city')).toBeNull();
    expect(params.get('suburb')).toBeNull();
  });

  it('blocks contradictory or invalid visible price ranges without dropping values', () => {
    expect(getPriceRangeError('2000000', '1000000')).toBe(
      'Minimum price must be less than or equal to maximum price.',
    );
    expect(getPriceRangeError('-1', '1000000')).toBe('Enter valid non-negative prices.');
    expect(getPriceRangeError('500000', '2000000')).toBeUndefined();
    expect(getPriceRangeError('', '2000000')).toBeUndefined();
  });

  it('does not serialize unsupported or malformed Buy filters', () => {
    const url = buildBuySearchUrl({
      propertyType: 'not-a-property-type',
      minPrice: 'not-a-number',
      maxPrice: '100000',
    });

    expect(url).toBe('/property-for-sale?maxPrice=100000');
  });

  it('offers only active Buy property types while preserving compatible historical values on re-entry', () => {
    // The composer vocabulary never offers villa as a first-party choice.
    expect(BUY_PROPERTY_TYPE_OPTIONS.map(option => option.value)).not.toContain('villa');

    // A historical villa URL re-entered through the navbar keeps its intent:
    // dropping it would silently widen the consumer's search to all types.
    const params = new URL(
      buildBuySearchUrl({ selectedLocations: [johannesburg], propertyType: 'villa' }),
      'https://listify.test',
    ).searchParams;

    expect(params.get('propertyType')).toBe('villa');
  });

  it('rejects a Google Place ID instead of falling back to its label', () => {
    const googleLocation: LocationNode = {
      id: 'ChIJgoogle-place-id',
      name: 'Sandton',
      slug: 'sandton',
      type: 'suburb',
      provinceSlug: 'gauteng',
      citySlug: 'johannesburg',
    };

    const params = new URL(
      buildBuySearchUrl({ selectedLocations: [googleLocation] }),
      'https://listify.test',
    ).searchParams;

    expect(params.get('searchError')).toBe('canonical-location-required');
    expect(params.get('locationId')).toBeNull();
  });

  it('preserves the supported bedroom and bathroom refinements', () => {
    const params = new URL(
      buildBuySearchUrl({
        selectedLocations: [johannesburg],
        propertyType: 'house',
        minBedrooms: 2,
        minBathrooms: 1,
      }),
      'https://listify.test',
    ).searchParams;

    expect(params.get('city')).toBe('johannesburg');
    expect(params.get('locationId')).toBe('city:12');
    expect(params.get('propertyType')).toBe('house');
    expect(params.get('minBedrooms')).toBe('2');
    expect(params.get('minBathrooms')).toBe('1');
  });

  it('interprets the submitted URL as the same search intent with numeric filters', () => {
    const url = buildBuySearchUrl({
      selectedLocations: [sandton],
      propertyType: 'house',
      minPrice: '500000',
      maxPrice: '2000000',
    });
    const parsedUrl = new URL(url, 'https://listify.test');
    const intent = resolveSearchIntent(parsedUrl.pathname, {}, parsedUrl.searchParams);

    expect(intent.transactionType).toBe('for-sale');
    expect(intent.geography).toMatchObject({
      level: 'suburb',
      province: 'gauteng',
      city: 'johannesburg',
      suburb: 'sandton',
      locationId: 'suburb:42',
    });
    expect(intent.filters).toMatchObject({
      propertyType: 'house',
      minPrice: 500000,
      maxPrice: 2000000,
      listingType: 'sale',
    });
  });
});

describe('transactional journey runtime closure', () => {
  it('preserves explicit Rent navigation', () => {
    const url = buildPropertySearchUrl({
      transactionType: 'to-rent',
      selectedLocations: [gauteng],
    });

    expect(url).toContain('/property-to-rent?');
    expect(url).toContain('locationId=province%3A1');
  });

  it('serializes canonical Rent property and monthly-rent filters', () => {
    const params = new URL(
      buildPropertySearchUrl({
        transactionType: 'to-rent',
        selectedLocations: [gauteng],
        propertyType: 'cluster_home',
        minPrice: '5000',
        maxPrice: '20000',
      }),
      'https://listify.test',
    ).searchParams;

    expect(params.get('propertyType')).toBe('cluster_home');
    expect(params.get('minPrice')).toBe('5000');
    expect(params.get('maxPrice')).toBe('20000');
  });

  it('does not serialize unsupported Rent property types from the composer', () => {
    const params = new URL(
      buildPropertySearchUrl({
        transactionType: 'to-rent',
        selectedLocations: [gauteng],
        propertyType: 'commercial',
      }),
      'https://listify.test',
    ).searchParams;

    expect(params.get('propertyType')).toBeNull();
    expect(params.get('locationId')).toBe('province:1');
  });

  it.each(['shared_living', 'developments', 'plot_land', 'commercial', 'unknown', '', null])(
    'fails closed for unsupported runtime transaction type %s',
    transactionType => {
      const url = buildPropertySearchUrl({
        transactionType: transactionType as never,
        selectedLocations: [gauteng],
      });

      expect(url).toBe('/');
      expect(url).not.toContain('/property-to-rent');
      expect(url).not.toContain('/property-for-sale');
    },
  );
});

describe('navbar refinement preservation', () => {
  it('extracts every supported Buy refinement from an active results URL', () => {
    expect(
      extractActiveSearchRefinementFilters(
        '?propertyType=apartment&listingSource=development&minPrice=1000000&maxPrice=2500000&minBedrooms=3&minBathrooms=2&page=2&sort=price_asc',
      ),
    ).toEqual({
      propertyType: 'apartment',
      listingSource: 'development',
      minPrice: 1_000_000,
      maxPrice: 2_500_000,
      minBedrooms: 3,
      minBathrooms: 2,
    });
  });

  it('ignores malformed values and unknown keys', () => {
    expect(
      extractActiveSearchRefinementFilters('?minPrice=abc&searchError=canonical-location-required'),
    ).toEqual({});
    expect(extractActiveSearchRefinementFilters('')).toEqual({});
  });

  it('re-enters the Buy journey with a new location while carrying active refinements', () => {
    const refinements = extractActiveSearchRefinementFilters(
      '?suburb=34&propertyType=apartment&minPrice=1000000&minBedrooms=3&listingSource=manual',
    );
    const url = buildPropertySearchUrl({
      transactionType: 'for-sale',
      selectedLocations: [rosebank],
      ...refinements,
    });

    expect(url).toContain('/property-for-sale');
    expect(url).toContain('propertyType=apartment');
    expect(url).toContain('minPrice=1000000');
    expect(url).toContain('minBedrooms=3');
    expect(url).toContain('listingSource=manual');
  });

  it('sanitizes preserved refinements through the canonical contract', () => {
    const refinements = extractActiveSearchRefinementFilters(
      '?propertyType=villa&amenities=Pool&minPrice=0&maxPrice=50000000',
    );
    const url = buildPropertySearchUrl({
      transactionType: 'for-sale',
      selectedLocations: [sandton],
      ...refinements,
    });

    // villa remains read-compatible; slider defaults are dropped; unknown keys never survive.
    expect(url).toContain('propertyType=villa');
    expect(url).not.toContain('amenities');
    expect(url).not.toContain('minPrice=0');
    expect(url).not.toContain('maxPrice=');
  });

  it('emits listingSource for Buy when explicitly provided', () => {
    const url = buildBuySearchUrl({ listingSource: 'development' });
    expect(url).toContain('listingSource=development');
  });
});

describe('navbar refinement preservation (rent)', () => {
  it('extracts rent-only refinement keys from an active results URL', () => {
    expect(
      extractActiveSearchRefinementFilters(
        '?propertyType=apartment&minPrice=8000&maxPrice=15000&maxBedrooms=3&maxBathrooms=2&minArea=60',
      ),
    ).toEqual({
      propertyType: 'apartment',
      minPrice: 8_000,
      maxPrice: 15_000,
      maxBedrooms: 3,
      maxBathrooms: 2,
      minArea: 60,
    });
  });

  it('re-enters the Rent journey with a new location while carrying active refinements', () => {
    const refinements = extractActiveSearchRefinementFilters(
      '?suburb=42&propertyType=apartment&maxPrice=15000&maxBedrooms=2',
    );
    const url = buildPropertySearchUrl({
      transactionType: 'to-rent',
      selectedLocations: [sandton],
      ...refinements,
    });

    expect(url).toContain('/property-to-rent');
    expect(url).toContain('propertyType=apartment');
    expect(url).toContain('maxPrice=15000');
    expect(url).toContain('maxBedrooms=2');
  });

  it('never leaks rent-only keys into Buy URLs and vice versa', () => {
    const buyUrl = buildPropertySearchUrl({
      transactionType: 'for-sale',
      selectedLocations: [johannesburg],
      maxBedrooms: 4,
      minArea: 80,
    });
    expect(buyUrl).not.toContain('maxBedrooms');
    expect(buyUrl).not.toContain('minArea');

    const rentUrl = buildPropertySearchUrl({
      transactionType: 'to-rent',
      selectedLocations: [johannesburg],
      propertyType: 'apartment',
      minPrice: 5000,
    });
    expect(rentUrl).toContain('propertyType=apartment');
    expect(rentUrl).toContain('minPrice=5000');
  });
});
