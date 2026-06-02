import { describe, expect, it } from 'vitest';

import {
  normalizeHomeFeedListingType,
  resolveDevelopmentHomeFeedPricing,
} from '../developerRouter';

describe('developerRouter home trending development pricing', () => {
  it('normalizes home feed listing type aliases', () => {
    expect(normalizeHomeFeedListingType('for-rent')).toBe('rent');
    expect(normalizeHomeFeedListingType('to_rent')).toBe('rent');
    expect(normalizeHomeFeedListingType('auctions')).toBe('auction');
    expect(normalizeHomeFeedListingType('sale')).toBe('sale');
  });

  it('uses rental pricing for rental developments instead of stale sale prices', () => {
    expect(
      resolveDevelopmentHomeFeedPricing({
        transactionType: 'for_rent',
        priceFrom: 1_500_000,
        priceTo: 1_900_000,
        monthlyRentFrom: 12_500,
        monthlyRentTo: 14_000,
      }),
    ).toEqual({
      listingType: 'rent',
      priceFrom: 12_500,
      priceTo: 14_000,
    });
  });

  it('uses auction pricing for auction developments instead of stale sale prices', () => {
    expect(
      resolveDevelopmentHomeFeedPricing({
        listingType: 'auction',
        priceFrom: 1_500_000,
        priceTo: 1_900_000,
        startingBidFrom: 900_000,
        reservePriceFrom: 1_100_000,
      }),
    ).toEqual({
      listingType: 'auction',
      priceFrom: 900_000,
      priceTo: 1_100_000,
    });
  });

  it('defaults sale priceTo to priceFrom when the range is missing or inverted', () => {
    expect(
      resolveDevelopmentHomeFeedPricing({
        transactionType: 'for_sale',
        priceFrom: 1_500_000,
        priceTo: 1_200_000,
      }),
    ).toEqual({
      listingType: 'sale',
      priceFrom: 1_500_000,
      priceTo: 1_500_000,
    });
  });
});
