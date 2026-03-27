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

    expect(generateIntentUrl(intent)).toBe('/property-for-sale?locations=alberton&locations=gauteng');
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
});
