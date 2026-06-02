import { describe, expect, it } from 'vitest';

import {
  getDevelopmentUnitAvailabilityLabel,
  getDevelopmentUnitPricingModel,
  normalizeUnitTransactionType,
} from './DevelopmentUnitDetailPage';

const normalizeSpaces = (value: string) => value.replace(/\s/g, ' ');

describe('DevelopmentUnitDetailPage pricing model', () => {
  it('normalizes development transaction aliases', () => {
    expect(normalizeUnitTransactionType('for_rent')).toBe('rent');
    expect(normalizeUnitTransactionType('to-rent')).toBe('rent');
    expect(normalizeUnitTransactionType('auctions')).toBe('auction');
    expect(normalizeUnitTransactionType('for_sale')).toBe('sale');
  });

  it('uses monthly rent labels for rental development units', () => {
    const pricing = getDevelopmentUnitPricingModel(
      {
        basePriceFrom: 1200000,
        monthlyRentFrom: 12500,
        monthlyRentTo: 15000,
      },
      'for_rent',
    );

    expect(normalizeSpaces(pricing.label)).toBe('R 12 500 - R 15 000 / month');
    expect(pricing.summaryLabel).toBe('Rent from');
    expect(pricing.financeEligible).toBe(false);
  });

  it('uses starting-bid labels for auction development units', () => {
    const pricing = getDevelopmentUnitPricingModel(
      {
        basePriceFrom: 1200000,
        monthlyRentFrom: 12500,
        startingBid: 850000,
      },
      'auction',
    );

    expect(normalizeSpaces(pricing.label)).toBe('Starting bid R 850 000');
    expect(pricing.summaryLabel).toBe('Starting bid');
    expect(pricing.financeEligible).toBe(false);
  });

  it('drops inverted sale and rental upper ranges', () => {
    const salePricing = getDevelopmentUnitPricingModel(
      {
        basePriceFrom: 1500000,
        basePriceTo: 1200000,
      },
      'for_sale',
    );
    const rentalPricing = getDevelopmentUnitPricingModel(
      {
        monthlyRentFrom: 15000,
        monthlyRentTo: 12500,
      },
      'for_rent',
    );

    expect(normalizeSpaces(salePricing.label)).toBe('R 1 500 000');
    expect(salePricing.secondaryValue).toBeUndefined();
    expect(normalizeSpaces(rentalPricing.label)).toBe('R 15 000 / month');
    expect(rentalPricing.secondaryValue).toBeUndefined();
  });

  it('clamps availability labels using shared inventory logic', () => {
    expect(
      getDevelopmentUnitAvailabilityLabel({
        totalUnits: 5,
        availableUnits: 9,
        reservedUnits: 4,
      }),
    ).toBe('Only 1 left');

    expect(
      getDevelopmentUnitAvailabilityLabel({
        totalUnits: 3,
        availableUnits: 0,
      }),
    ).toBe('Currently sold out');
  });
});
