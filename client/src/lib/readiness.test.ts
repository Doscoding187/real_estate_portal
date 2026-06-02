import { describe, expect, it } from 'vitest';

import {
  calculateDevelopmentReadiness,
  getDevelopmentReadinessPricing,
  normalizeDevelopmentReadinessTransactionType,
} from './readiness';

const completeDevelopment = {
  name: 'Test Development',
  description:
    'A complete development description with enough detail to satisfy readiness requirements.',
  address: '1 Test Street',
  latitude: '-26.1',
  longitude: '28.1',
  images: ['hero.jpg'],
  amenities: ['Pool', 'Security', 'Gym'],
};

describe('development readiness pricing', () => {
  it('normalizes transaction aliases', () => {
    expect(normalizeDevelopmentReadinessTransactionType('for_rent')).toBe('rent');
    expect(normalizeDevelopmentReadinessTransactionType('to-rent')).toBe('rent');
    expect(normalizeDevelopmentReadinessTransactionType('on auction')).toBe('auction');
    expect(normalizeDevelopmentReadinessTransactionType('for_sale')).toBe('sale');
  });

  it('uses monthly rent for rental developments', () => {
    expect(
      getDevelopmentReadinessPricing({
        transactionType: 'for_rent',
        priceFrom: null,
        monthlyRentFrom: 12500,
      }),
    ).toMatchObject({
      transactionType: 'rent',
      value: 12500,
      missingLabel: 'Monthly Rent From (Units)',
    });

    expect(
      calculateDevelopmentReadiness({
        ...completeDevelopment,
        transactionType: 'for_rent',
        monthlyRentFrom: 12500,
      }).score,
    ).toBe(100);
  });

  it('flags inverted monthly rent ranges for rental developments', () => {
    expect(
      getDevelopmentReadinessPricing({
        transactionType: 'for_rent',
        monthlyRentFrom: 15_000,
        monthlyRentTo: 12_500,
      }),
    ).toMatchObject({
      transactionType: 'rent',
      value: null,
      missingLabel: 'Monthly Rent To must be greater than or equal to Monthly Rent From',
    });

    const readiness = calculateDevelopmentReadiness({
      ...completeDevelopment,
      transactionType: 'for_rent',
      monthlyRentFrom: 15_000,
      monthlyRentTo: 12_500,
    });

    expect(readiness.score).toBe(80);
    expect(readiness.missing.specs).toContain(
      'Monthly Rent To must be greater than or equal to Monthly Rent From',
    );
  });

  it('uses starting bid for auction developments', () => {
    expect(
      getDevelopmentReadinessPricing({
        transactionType: 'auction',
        priceFrom: null,
        startingBidFrom: 850000,
      }),
    ).toMatchObject({
      transactionType: 'auction',
      value: 850000,
      missingLabel: 'Starting Bid (Units)',
    });

    expect(
      calculateDevelopmentReadiness({
        ...completeDevelopment,
        transactionType: 'auction',
        startingBidFrom: 850000,
      }).score,
    ).toBe(100);
  });
});
