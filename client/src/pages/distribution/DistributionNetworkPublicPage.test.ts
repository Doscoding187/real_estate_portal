import { describe, expect, it } from 'vitest';

import {
  calculateQualifyingIncome,
  getPublicDistributionDevelopmentPricing,
} from './DistributionNetworkPublicPage';

describe('DistributionNetworkPublicPage development pricing', () => {
  it('uses sale price for purchase qualification and card labels', () => {
    expect(
      getPublicDistributionDevelopmentPricing({
        transactionType: 'for_sale',
        priceFrom: 1_200_000,
        priceTo: 1_500_000,
      }),
    ).toMatchObject({
      transactionType: 'sale',
      priceFrom: 1_200_000,
      headline: 'From R1.2m',
      subline: 'Est. bond from R13k/month',
      qualifyingText: calculateQualifyingIncome(1_200_000),
      incomeFilterPrice: 1_200_000,
    });
  });

  it('uses monthly rent for rental developments and skips purchase income filtering', () => {
    expect(
      getPublicDistributionDevelopmentPricing({
        transactionType: 'for_rent',
        priceFrom: 1_200_000,
        monthlyRentFrom: 12_500,
        monthlyRentTo: 15_000,
      }),
    ).toMatchObject({
      transactionType: 'rent',
      priceFrom: 12_500,
      priceTo: 15_000,
      headline: 'Rent from R13k',
      subline: 'Monthly rent',
      qualifyingText: 'Renters around R13k/month may qualify',
      incomeFilterPrice: null,
    });
  });

  it('uses starting bid for auction developments instead of stale sale price', () => {
    expect(
      getPublicDistributionDevelopmentPricing({
        transactionType: 'auction',
        priceFrom: 1_200_000,
        startingBidFrom: 850_000,
        reservePriceFrom: 900_000,
      }),
    ).toMatchObject({
      transactionType: 'auction',
      priceFrom: 850_000,
      priceTo: 900_000,
      headline: 'Bid from R850k',
      subline: 'Est. bond from R9k/month',
      qualifyingText: calculateQualifyingIncome(850_000),
      incomeFilterPrice: 850_000,
    });
  });
});
