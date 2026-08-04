import { describe, expect, it } from 'vitest';
import { buildBuySearchUrl, getPriceRangeError } from '@/lib/heroJourneySearch';
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

const gauteng: LocationNode = {
  id: 'province:1',
  name: 'Gauteng',
  slug: 'gauteng',
  type: 'province',
  canonicalPath: '/property-for-sale/gauteng',
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

  it('rejects multiple structured locations instead of silently taking the first', () => {
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
