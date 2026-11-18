import { describe, expect, it } from 'vitest';

import { buildSuburbMarketInsights } from '../suburbMarketInsights';

describe('buildSuburbMarketInsights', () => {
  it('keeps sale and rental samples separate and hides under-sized medians', () => {
    const calculatedAt = new Date('2026-10-15T12:00:00.000Z');
    const insights = buildSuburbMarketInsights(
      [
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
      ],
      calculatedAt,
    );

    expect(insights.asOf).toBe('2026-10-15T12:00:00.000Z');
    expect(insights.minimumPriceSample).toBe(5);
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
      { bedroomBand: 3, listingCount: 9, pricedListingCount: 9, medianPrice: 5_000_000 },
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

  const saleFact = (price: number | null, internalAreaM2?: number | null) => ({
    transactionType: 'sale' as const,
    propertyType: 'house',
    bedrooms: 3,
    price,
    internalAreaM2,
  });

  it('applies the sample threshold of 5 at the boundary (4 -> null, 5 -> median)', () => {
    const four = buildSuburbMarketInsights([1, 2, 3, 4].map(n => saleFact(n * 1_000_000)));
    expect(four.sale.medianPrice).toBeNull();
    const five = buildSuburbMarketInsights([1, 2, 3, 4, 5].map(n => saleFact(n * 1_000_000)));
    expect(five.sale.medianPrice).toBe(3_000_000);
  });

  it('computes price per m2 only from sized rows and counts the sample on those rows', () => {
    const facts = [
      saleFact(1_000_000, 100), // 10_000
      saleFact(2_000_000, 100), // 20_000
      saleFact(3_000_000, 100), // 30_000
      saleFact(4_000_000, 100), // 40_000
      saleFact(5_000_000, 100), // 50_000
      saleFact(9_000_000, null),
      saleFact(9_000_000, 0),
      saleFact(9_000_000, -10),
      saleFact(null, 100),
    ];
    const sale = buildSuburbMarketInsights(facts).sale;
    expect(sale.pricePerM2SampleCount).toBe(5);
    expect(sale.medianPricePerM2).toBe(30_000);

    const belowThreshold = buildSuburbMarketInsights(facts.slice(1)).sale;
    expect(belowThreshold.pricePerM2SampleCount).toBe(4);
    expect(belowThreshold.medianPricePerM2).toBeNull();
  });

  it('does not let unsized rows reach the 5-row price per m2 threshold', () => {
    const sale = buildSuburbMarketInsights([
      ...[1, 2, 3].map(n => saleFact(n * 1_000_000, 100)),
      ...[4, 5, 6, 7].map(n => saleFact(n * 1_000_000)),
    ]).sale;
    expect(sale.medianPrice).toBe(4_000_000);
    expect(sale.pricePerM2SampleCount).toBe(3);
    expect(sale.medianPricePerM2).toBeNull();
  });
});
