import { describe, expect, it } from 'vitest';

import {
  normalizePartnerTermsTransactionType,
  resolvePartnerTermsPriceRange,
} from '../distributionPartnerTermsService';

describe('distributionPartnerTermsService pricing helpers', () => {
  it('normalizes partner terms transaction aliases', () => {
    expect(normalizePartnerTermsTransactionType('for_rent')).toBe('rent');
    expect(normalizePartnerTermsTransactionType('to-rent')).toBe('rent');
    expect(normalizePartnerTermsTransactionType('auction')).toBe('auction');
    expect(normalizePartnerTermsTransactionType('for_sale')).toBe('sale');
  });

  it('uses monthly rent fields for rental partner terms', () => {
    expect(
      resolvePartnerTermsPriceRange({
        transactionType: 'for_rent',
        priceFrom: 1200000,
        priceTo: 1500000,
        monthlyRentFrom: 9500,
        monthlyRentTo: 12500,
      }),
    ).toEqual({
      transactionType: 'rent',
      priceFrom: 9500,
      priceTo: 12500,
    });
  });

  it('uses auction fields for auction partner terms', () => {
    expect(
      resolvePartnerTermsPriceRange({
        transactionType: 'auction',
        priceFrom: 1200000,
        priceTo: 1500000,
        startingBidFrom: 700000,
        reservePriceFrom: 850000,
      }),
    ).toEqual({
      transactionType: 'auction',
      priceFrom: 700000,
      priceTo: 850000,
    });
  });
});
