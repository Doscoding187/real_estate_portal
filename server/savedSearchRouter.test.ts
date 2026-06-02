import { describe, expect, it } from 'vitest';

import {
  normalizeSavedSearchPreviewListingType,
  normalizeSavedSearchPreviewMatches,
} from './savedSearchRouter';

describe('savedSearchRouter preview match normalization', () => {
  it('preserves auction preview matches from aliases', () => {
    expect(normalizeSavedSearchPreviewListingType('auctions')).toBe('auction');

    const matches = normalizeSavedSearchPreviewMatches([
      {
        id: 'dev-51-unit-auction',
        title: 'Auction Villa',
        href: '/development/auction-yard',
        city: 'Pretoria',
        suburb: 'Menlyn',
        image: '/auction.jpg',
        listingType: 'auctions',
        listingSource: 'development',
        price: '2750000',
      },
    ]);

    expect(matches).toEqual([
      expect.objectContaining({
        id: 'dev-51-unit-auction',
        listingType: 'auction',
        listingSource: 'development',
        price: 2750000,
      }),
    ]);
  });

  it('normalizes rent aliases in preview matches', () => {
    const matches = normalizeSavedSearchPreviewMatches([
      {
        id: 'property-7',
        title: 'Rental Apartment',
        href: '/property/7',
        listingType: 'to-rent',
        listingSource: 'manual',
      },
    ]);

    expect(matches[0]).toMatchObject({
      listingType: 'rent',
      listingSource: 'manual',
    });
  });
});
