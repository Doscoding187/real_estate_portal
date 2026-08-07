import { describe, expect, it } from 'vitest';

import { generateIntentUrl, resolveSearchIntent, type SearchIntent } from '@/lib/searchIntent';

describe('search intent location serialization', () => {
  it('serializes object-based location filters as slug query params', () => {
    const intent: SearchIntent = {
      transactionType: 'for-sale',
      geography: {
        level: 'country',
      },
      filters: {
        listingType: 'sale',
        locations: [
          {
            name: 'Alberton',
            slug: 'alberton',
            type: 'city',
            provinceSlug: 'gauteng',
          },
          {
            name: 'Gauteng',
            slug: 'gauteng',
            type: 'province',
          },
        ],
      },
      resultState: { sort: 'relevance', page: 0 },
      defaults: {
        propertyCategory: 'residential',
        sort: 'relevance',
      },
    };

    expect(generateIntentUrl(intent)).toBe('/property-for-sale');
  });

  it('derives single locations query params into geography for result pages', () => {
    const result = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('locations=alberton'),
    );

    expect(result.geography).toMatchObject({
      level: 'city',
      city: 'alberton',
    });
    expect(result.filters.locations).toBeUndefined();
  });

  it('preserves direct Rent route interpretation and basic query filters', () => {
    const result = resolveSearchIntent(
      '/property-to-rent?city=johannesburg&minPrice=5000&propertyType=apartment',
      {},
      new URLSearchParams(
        'city=johannesburg&minPrice=5000&propertyType=apartment&sort=price_asc&page=2',
      ),
    );

    expect(result.transactionType).toBe('to-rent');
    expect(result.geography).toMatchObject({ level: 'city', city: 'johannesburg' });
    expect(result.filters).toMatchObject({
      listingType: 'rent',
      minPrice: 5000,
      propertyType: 'apartment',
    });
    expect(result.resultState).toEqual({ sort: 'price_asc', page: 2 });
  });

  it('does not infer Buy for an unknown path without explicit transaction context', () => {
    const result = resolveSearchIntent('/unknown-search', {}, new URLSearchParams());

    expect(result.transactionType).toBeNull();
    expect(result.validation?.code).toBe('missing-transaction-intent');
  });

  it('accepts explicit Rent context on a compatibility path', () => {
    const result = resolveSearchIntent(
      '/properties',
      {},
      new URLSearchParams('listingType=rent&city=johannesburg'),
    );

    expect(result.transactionType).toBe('to-rent');
    expect(result.filters.listingType).toBe('rent');
  });

  it('keeps province geography on the transactional root when a journey is declared', () => {
    const resultsIntent = resolveSearchIntent(
      '/property-for-sale?province=gauteng',
      {},
      new URLSearchParams('province=gauteng'),
    );
    expect(generateIntentUrl(resultsIntent)).toBe('/property-for-sale?province=gauteng');
  });

  it('allow-lists Buy filters and rejects unsupported query state', () => {
    const result = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams(
        'province=gauteng&locationId=province%3A1&propertyType=house&minPrice=500000&maxBedrooms=4&amenities=Pool&unknown=value',
      ),
    );

    expect(result.filters).toMatchObject({
      listingType: 'sale',
      propertyType: 'house',
      minPrice: 500000,
    });
    expect(result.filters).not.toHaveProperty('maxBedrooms');
    expect(result.filters).not.toHaveProperty('amenities');
    expect(result.filters).not.toHaveProperty('unknown');
  });

  it('preserves canonical geography level and identity for all supported levels', () => {
    expect(
      resolveSearchIntent(
        '/property-for-sale',
        {},
        new URLSearchParams('locationId=province%3A1&province=gauteng'),
      ).geography,
    ).toMatchObject({ level: 'province', province: 'gauteng', locationId: 'province:1' });

    expect(
      resolveSearchIntent(
        '/property-for-sale',
        {},
        new URLSearchParams('locationId=city%3A12&city=johannesburg&province=gauteng'),
      ).geography,
    ).toMatchObject({
      level: 'city',
      city: 'johannesburg',
      province: 'gauteng',
      locationId: 'city:12',
    });

    expect(
      resolveSearchIntent(
        '/property-for-sale',
        {},
        new URLSearchParams(
          'locationId=suburb%3A42&suburb=sandton&city=johannesburg&province=gauteng',
        ),
      ).geography,
    ).toMatchObject({
      level: 'suburb',
      suburb: 'sandton',
      city: 'johannesburg',
      province: 'gauteng',
      locationId: 'suburb:42',
    });
  });

  it('represents malformed and mismatched location identities without widening', () => {
    const malformed = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('locationId=google-place-id&province=gauteng'),
    );
    expect(malformed.validation?.code).toBe('invalid-location-id');
    expect(malformed.geography.locationId).toBeUndefined();

    const mismatched = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('locationId=city%3A12&suburb=sandton&city=johannesburg'),
    );
    expect(mismatched.validation?.code).toBe('location-identity-mismatch');
  });

  it('round-trips a supported Buy intent without state drift', () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams(
        'locationId=suburb%3A42&suburb=sandton&city=johannesburg&province=gauteng&propertyType=house&minPrice=500000&minBedrooms=2&minBathrooms=1',
      ),
    );
    const reparsed = new URL(generateIntentUrl(intent), 'https://listify.test');
    const roundTripped = resolveSearchIntent(reparsed.pathname, {}, reparsed.searchParams);

    expect(roundTripped).toMatchObject({
      transactionType: 'for-sale',
      geography: intent.geography,
      filters: intent.filters,
      resultState: intent.resultState,
    });
  });

  it('round-trips Buy sorting and pagination without changing the journey', () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams(
        'locationId=city%3A12&city=johannesburg&province=gauteng&sort=price_desc&page=4',
      ),
    );

    const generated = generateIntentUrl(intent);
    const reparsed = new URL(generated, 'https://listify.test');
    const roundTripped = resolveSearchIntent(reparsed.pathname, {}, reparsed.searchParams);

    expect(generated).toContain('sort=price_desc');
    expect(generated).toContain('page=4');
    expect(roundTripped.transactionType).toBe('for-sale');
    expect(roundTripped.resultState).toEqual({ sort: 'price_desc', page: 4 });
  });

  it('round-trips complete map bounds without retaining partial bounds', () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams(
        'locationId=city%3A12&city=johannesburg&province=gauteng&minLat=-26.3&maxLat=-25.9&minLng=27.8&maxLng=28.4',
      ),
    );

    const reparsed = new URL(generateIntentUrl(intent), 'https://listify.test');
    const roundTripped = resolveSearchIntent(reparsed.pathname, {}, reparsed.searchParams);

    expect(roundTripped.filters).toMatchObject({
      minLat: -26.3,
      maxLat: -25.9,
      minLng: 27.8,
      maxLng: 28.4,
    });
  });

  it('parses and round-trips a Search Area without inventing a parent geography', () => {
    const intent = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('searchAreaId=johannesburg-sandton'),
    );

    expect(intent.geography).toMatchObject({
      level: 'search_area',
      searchAreaId: 'johannesburg-sandton',
    });
    expect(intent.filters).not.toHaveProperty('searchAreaId');
    expect(generateIntentUrl(intent)).toBe('/property-for-sale?searchAreaId=johannesburg-sandton');

    const reparsed = new URL(generateIntentUrl(intent), 'https://listify.test');
    expect(
      resolveSearchIntent(reparsed.pathname, {}, reparsed.searchParams).geography,
    ).toMatchObject(intent.geography);
  });

  it('keeps an optional locality refinement distinct from its Search Area scope', () => {
    const intent = resolveSearchIntent(
      '/property-to-rent',
      {},
      new URLSearchParams('searchAreaId=johannesburg-sandton&locationId=suburb%3A34'),
    );

    expect(intent.geography).toMatchObject({
      level: 'suburb',
      searchAreaId: 'johannesburg-sandton',
      locationId: 'suburb:34',
    });
    const generated = new URL(generateIntentUrl(intent), 'https://listify.test');
    expect(generated.pathname).toBe('/property-to-rent');
    expect(Object.fromEntries(generated.searchParams)).toMatchObject({
      searchAreaId: 'johannesburg-sandton',
      locationId: 'suburb:34',
    });
  });

  it('fails closed for malformed or conflicting Search Area scope input', () => {
    const malformed = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('searchAreaId=Sandton%2Fpreview'),
    );
    expect(malformed.validation?.code).toBe('invalid-search-area-id');

    const conflicting = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('searchAreaId=johannesburg-sandton&city=johannesburg'),
    );
    expect(conflicting.validation?.code).toBe('search-area-location-conflict');
  });
});
