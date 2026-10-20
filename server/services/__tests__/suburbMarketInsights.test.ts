import { describe, expect, it } from 'vitest';

import { buildSuburbMarketInsights } from '../suburbMarketInsights';

describe('buildSuburbMarketInsights', () => {
  it('keeps sale and rental samples separate and hides under-sized medians', () => {
    const calculatedAt = new Date('2026-10-15T12:00:00.000Z');
    const insights = buildSuburbMarketInsights([
      ...[
        1_000_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000, 7_000_000, 8_000_000,
        9_000_000, 10_000_000,
      ].map((price, index) => ({
        transactionType: 'sale' as const,
        propertyType: 'house',
        bedrooms: index === 9 ? 6 : 3,
        price,
      })),
      ...[12_000, 14_000, 16_000, 18_000].map(price => ({
        transactionType: 'rent' as const,
        propertyType: 'apartment',
        bedrooms: 2,
        price,
      })),
      {
        transactionType: 'other' as const,
        propertyType: 'house',
        bedrooms: 4,
        price: 8_000_000,
      },
    ], calculatedAt);

    expect(insights.asOf).toBe('2026-10-15T12:00:00.000Z');
    expect(insights.minimumPriceSample).toBe(10);
    expect(insights.sale).toMatchObject({
      listingCount: 10,
      pricedListingCount: 10,
      medianPrice: 5_500_000,
    });
    expect(insights.sale.propertyTypes).toEqual([
      {
        propertyType: 'house',
        listingCount: 10,
        pricedListingCount: 10,
        medianPrice: 5_500_000,
      },
    ]);
    expect(insights.sale.bedrooms).toEqual([
      { bedroomBand: 3, listingCount: 9, pricedListingCount: 9, medianPrice: null },
      { bedroomBand: 5, listingCount: 1, pricedListingCount: 1, medianPrice: null },
    ]);
    expect(insights.rent).toMatchObject({
      listingCount: 4,
      pricedListingCount: 4,
      medianPrice: null,
    });
    expect(insights.otherTransactionListingCount).toBe(1);
  });

  it('retains availability counts while omitting unavailable prices and unknown bedrooms', () => {
    const insights = buildSuburbMarketInsights(
      Array.from({ length: 10 }, () => ({
        transactionType: 'sale' as const,
        propertyType: null,
        bedrooms: null,
        price: null,
      })),
    );

    expect(insights.sale).toMatchObject({
      listingCount: 10,
      pricedListingCount: 0,
      medianPrice: null,
      propertyTypes: [
        { propertyType: null, listingCount: 10, pricedListingCount: 0, medianPrice: null },
      ],
      bedrooms: [],
    });
  });
});
