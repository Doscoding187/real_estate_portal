import { describe, expect, it } from 'vitest';

import {
  deriveSearchListingType,
  generateIntentUrl,
  normalizeSearchListingType,
  resolveSearchIntent,
  type SearchIntent,
} from '@/lib/searchIntent';

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

  it('preserves auction listing intent on the shared sale route', () => {
    const result = resolveSearchIntent(
      '/property-for-sale',
      {},
      new URLSearchParams('listingType=auction&locations=menlyn'),
    );

    expect(result.transactionType).toBe('for-sale');
    expect(result.filters.listingType).toBe('auction');
    expect(result.filters.locations).toEqual(['menlyn']);
  });

  it('serializes auction intent as a sale route listingType query param', () => {
    const intent: SearchIntent = {
      transactionType: 'for-sale',
      geography: {
        level: 'country',
      },
      filters: {
        listingType: 'auction',
        locations: ['menlyn'],
      },
      defaults: {
        propertyCategory: 'residential',
        sort: 'relevance',
      },
    };

    expect(generateIntentUrl(intent)).toBe('/property-for-sale?listingType=auction&locations=menlyn');
  });

  it('normalizes route listing aliases before filters are sent to search', () => {
    expect(normalizeSearchListingType('to-rent')).toBe('rent');
    expect(normalizeSearchListingType('auctions')).toBe('auction');
    expect(normalizeSearchListingType('for-sale')).toBe('sale');
    expect(normalizeSearchListingType('developments')).toBeNull();
  });

  it('derives API listing type from explicit auction intent before the sale route fallback', () => {
    expect(
      deriveSearchListingType({
        transactionType: 'for-sale',
        filters: {
          listingType: 'auction',
        },
      }),
    ).toBe('auction');
  });
});
