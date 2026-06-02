import { describe, expect, it } from 'vitest';

import { getPublisherDevelopmentPriceBadge } from './EnhancedDevelopmentCard';

describe('EnhancedDevelopmentCard price badge', () => {
  it('formats sale price ranges', () => {
    expect(
      getPublisherDevelopmentPriceBadge({
        transactionType: 'for_sale',
        priceFrom: 1_200_000,
        priceTo: 1_500_000,
      }),
    ).toBe('R\u00a01\u00a0200\u00a0000 - R\u00a01\u00a0500\u00a0000');
  });

  it('uses rent aggregates for rental developments instead of stale sale prices', () => {
    expect(
      getPublisherDevelopmentPriceBadge({
        transactionType: 'for_rent',
        priceFrom: 1_200_000,
        priceTo: 1_500_000,
        monthlyRentFrom: 12_500,
        monthlyRentTo: 15_000,
      }),
    ).toBe('R\u00a012\u00a0500 - R\u00a015\u00a0000/mo');
  });

  it('uses auction aggregates for auction developments instead of stale sale prices', () => {
    expect(
      getPublisherDevelopmentPriceBadge({
        transactionType: 'auction',
        priceFrom: 1_200_000,
        priceTo: 1_500_000,
        startingBidFrom: 850_000,
        reservePriceFrom: 900_000,
      }),
    ).toBe('Bid from R\u00a0850\u00a0000 - R\u00a0900\u00a0000');
  });
});
