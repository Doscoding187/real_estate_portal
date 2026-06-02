import { describe, expect, it } from 'vitest';
import {
  normalizeDistributionCatalogTransactionType,
  resolveDistributionCatalogDevelopmentPricing,
  resolveDistributionCatalogUnitPricing,
} from '../distributionRouter';

describe('distribution catalog pricing helpers', () => {
  it('normalizes distribution catalog transaction aliases', () => {
    expect(normalizeDistributionCatalogTransactionType('for_rent')).toBe('rent');
    expect(normalizeDistributionCatalogTransactionType('to-rent')).toBe('rent');
    expect(normalizeDistributionCatalogTransactionType('on auction')).toBe('auction');
    expect(normalizeDistributionCatalogTransactionType('for_sale')).toBe('sale');
  });

  it('uses development rent aggregates instead of stale sale prices', () => {
    expect(
      resolveDistributionCatalogDevelopmentPricing({
        transactionType: 'for_rent',
        priceFrom: 1_200_000,
        priceTo: 1_500_000,
        monthlyRentFrom: 12_500,
        monthlyRentTo: 15_000,
      }),
    ).toMatchObject({
      transactionType: 'rent',
      priceFrom: 12_500,
      priceTo: 15_000,
    });
  });

  it('uses development auction aggregates instead of stale sale prices', () => {
    expect(
      resolveDistributionCatalogDevelopmentPricing({
        transactionType: 'auction',
        priceFrom: 1_200_000,
        priceTo: 1_500_000,
        startingBidFrom: 850_000,
        reservePriceFrom: 950_000,
      }),
    ).toMatchObject({
      transactionType: 'auction',
      priceFrom: 850_000,
      priceTo: 950_000,
    });
  });

  it('uses unit rent and auction fields for catalog unit summaries', () => {
    expect(
      resolveDistributionCatalogUnitPricing(
        {
          priceFrom: 1_200_000,
          basePriceFrom: 1_200_000,
          monthlyRentFrom: 10_500,
          monthlyRentTo: 12_500,
        },
        'for_rent',
      ),
    ).toMatchObject({
      transactionType: 'rent',
      priceFrom: 10_500,
      priceTo: 12_500,
    });

    expect(
      resolveDistributionCatalogUnitPricing(
        {
          priceFrom: 1_200_000,
          basePriceFrom: 1_200_000,
          startingBid: 780_000,
          reservePrice: 900_000,
        },
        'auction',
      ),
    ).toMatchObject({
      transactionType: 'auction',
      priceFrom: 780_000,
      priceTo: 900_000,
    });
  });
});
