import { describe, expect, it } from 'vitest';

import {
  calculateDevelopmentReadiness,
  getDevelopmentReadinessPricing,
  normalizeDevelopmentReadinessTransactionType,
} from './readiness';

const completeDevelopment = {
  name: 'Server Readiness Development',
  description:
    'A complete development description with enough detail to satisfy readiness requirements.',
  address: '1 Readiness Street',
  latitude: '-26.1',
  longitude: '28.1',
  images: ['hero.jpg'],
  amenities: ['Pool', 'Security', 'Gym'],
};

describe('server development readiness pricing', () => {
  it('normalizes canonical and legacy transaction aliases', () => {
    expect(normalizeDevelopmentReadinessTransactionType('for_rent')).toBe('rent');
    expect(normalizeDevelopmentReadinessTransactionType('rent-to-buy')).toBe('rent');
    expect(normalizeDevelopmentReadinessTransactionType('on auction')).toBe('auction');
    expect(normalizeDevelopmentReadinessTransactionType('for_sale')).toBe('sale');
  });

  it('uses canonical monthly rent fields for rental developments', () => {
    expect(
      getDevelopmentReadinessPricing({
        transactionType: 'for_rent',
        priceFrom: null,
        monthlyRentFrom: 12_500,
      }),
    ).toMatchObject({
      transactionType: 'rent',
      value: 12_500,
      missingLabel: 'Monthly Rent From (Units)',
    });

    expect(
      calculateDevelopmentReadiness({
        ...completeDevelopment,
        transactionType: 'for_rent',
        monthlyRentFrom: 12_500,
      }).score,
    ).toBe(100);
  });

  it('does not let inverted rental ranges pass readiness', () => {
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

  it('uses canonical starting bid fields for auction developments', () => {
    expect(
      getDevelopmentReadinessPricing({
        transactionType: 'auction',
        priceFrom: null,
        startingBidFrom: 850_000,
      }),
    ).toMatchObject({
      transactionType: 'auction',
      value: 850_000,
      missingLabel: 'Starting Bid (Units)',
    });

    expect(
      calculateDevelopmentReadiness({
        ...completeDevelopment,
        transactionType: 'auction',
        startingBidFrom: 850_000,
      }).score,
    ).toBe(100);
  });
});
