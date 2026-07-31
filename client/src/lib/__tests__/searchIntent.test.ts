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

    expect(generateIntentUrl(intent)).toBe(
      '/property-for-sale?locations=alberton&locations=gauteng',
    );
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
    expect(result.filters.locations).toEqual(['alberton']);
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

  it('keeps direct province SEO paths while query-based province results stay on SRP', () => {
    const seoIntent = resolveSearchIntent(
      '/property-for-sale/gauteng',
      { province: 'gauteng' },
      new URLSearchParams(),
    );
    expect(generateIntentUrl(seoIntent)).toBe('/property-for-sale/gauteng');

    const resultsIntent = resolveSearchIntent(
      '/property-for-sale?province=gauteng',
      {},
      new URLSearchParams('province=gauteng'),
    );
    expect(generateIntentUrl(resultsIntent)).toBe('/property-for-sale?province=gauteng');
  });
});
