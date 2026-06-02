import { describe, expect, it } from 'vitest';

import { getPreviewUnitPricing, normalizePreviewTransactionType } from './DevelopmentPreview';

describe('DevelopmentPreview transaction pricing', () => {
  it('normalizes preview transaction aliases', () => {
    expect(normalizePreviewTransactionType('for-sale')).toBe('sale');
    expect(normalizePreviewTransactionType('for_rent')).toBe('rent');
    expect(normalizePreviewTransactionType('to rent')).toBe('rent');
    expect(normalizePreviewTransactionType('on auction')).toBe('auction');
  });

  it('uses sale price ranges for sale units', () => {
    expect(
      getPreviewUnitPricing(
        {
          basePriceFrom: 1_200_000,
          basePriceTo: 1_500_000,
        },
        'for_sale',
      ),
    ).toEqual({
      heading: 'Starting From',
      value: 'R 1\u00a0200\u00a0000 - R 1\u00a0500\u00a0000',
    });
  });

  it('uses monthly rent for rental units instead of base sale price', () => {
    expect(
      getPreviewUnitPricing(
        {
          basePriceFrom: 1_200_000,
          monthlyRentFrom: 12_500,
          monthlyRentTo: 15_000,
        },
        'for_rent',
      ),
    ).toEqual({
      heading: 'Monthly Rent',
      value: 'R 12\u00a0500 - R 15\u00a0000/mo',
    });
  });

  it('uses starting bid for auction units instead of base sale price', () => {
    expect(
      getPreviewUnitPricing(
        {
          basePriceFrom: 1_200_000,
          startingBid: 850_000,
          reservePrice: 900_000,
        },
        'auction',
      ),
    ).toEqual({
      heading: 'Starting Bid',
      value: 'R 850\u00a0000 - R 900\u00a0000',
    });
  });

  it('drops inverted sale and rental upper ranges in draft preview', () => {
    expect(
      getPreviewUnitPricing(
        {
          basePriceFrom: 1_500_000,
          basePriceTo: 1_200_000,
        },
        'for_sale',
      ),
    ).toEqual({
      heading: 'Starting From',
      value: 'R 1\u00a0500\u00a0000',
    });

    expect(
      getPreviewUnitPricing(
        {
          monthlyRentFrom: 15_000,
          monthlyRentTo: 12_500,
        },
        'for_rent',
      ),
    ).toEqual({
      heading: 'Monthly Rent',
      value: 'R 15\u00a0000/mo',
    });
  });
});
