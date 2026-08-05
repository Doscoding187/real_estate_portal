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
      new URLSearchParams('city=johannesburg&minPrice=5000&propertyType=apartment'),
    );

    expect(result.transactionType).toBe('to-rent');
    expect(result.geography).toMatchObject({ level: 'city', city: 'johannesburg' });
    expect(result.filters).toMatchObject({
      listingType: 'rent',
      minPrice: 5000,
      propertyType: 'apartment',
    });
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
    });
  });
});
