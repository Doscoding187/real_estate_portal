import { describe, expect, it } from 'vitest';

import {
  getDevelopmentReferralPricingContext,
  getUnitReferralPricingContext,
  normalizeReferrerTransactionType,
} from './ReferrerDashboard';

function normalizeMoneyLabel(value: string) {
  return value.replace(/\s|\u00a0/g, ' ');
}

describe('ReferrerDashboard pricing context', () => {
  it('normalizes referrer transaction aliases', () => {
    expect(normalizeReferrerTransactionType('for_rent')).toBe('rent');
    expect(normalizeReferrerTransactionType('to-rent')).toBe('rent');
    expect(normalizeReferrerTransactionType('auction')).toBe('auction');
    expect(normalizeReferrerTransactionType('for_sale')).toBe('sale');
  });

  it('uses monthly rent fields for rental referral units', () => {
    const context = getUnitReferralPricingContext(
      {
        priceFrom: 1200000,
        priceTo: 1400000,
        monthlyRentFrom: 12500,
        monthlyRentTo: 15000,
      },
      'for_rent',
    );

    expect({
      ...context,
      rangeLabel: normalizeMoneyLabel(context.rangeLabel),
    }).toMatchObject({
      transactionType: 'rent',
      label: 'Monthly rent',
      rangeLabel: 'R 12 500 - R 15 000',
      paymentAmount: 12500,
      affordabilityAnchor: 12500,
      usesBondEstimate: false,
    });
  });

  it('uses auction bid fields for referral units instead of sale prices', () => {
    const context = getUnitReferralPricingContext(
      {
        priceFrom: 1200000,
        priceTo: 1400000,
        startingBid: 850000,
        reservePrice: 950000,
      },
      'auction',
    );

    expect({
      ...context,
      rangeLabel: normalizeMoneyLabel(context.rangeLabel),
    }).toMatchObject({
      transactionType: 'auction',
      label: 'Starting bid',
      rangeLabel: 'R 850 000 - R 950 000',
      affordabilityAnchor: 850000,
      usesBondEstimate: true,
    });
  });

  it('labels development-level rent and auction ranges by transaction type', () => {
    const rentContext = getDevelopmentReferralPricingContext({
        transactionType: 'for_rent',
        priceFrom: 1200000,
        monthlyRentFrom: 10000,
        monthlyRentTo: 12500,
      });
    expect({
      ...rentContext,
      rangeLabel: normalizeMoneyLabel(rentContext.rangeLabel),
    }).toMatchObject({
      transactionType: 'rent',
      label: 'Development Rent Range',
      rangeLabel: 'R 10 000 - R 12 500',
    });

    const auctionContext = getDevelopmentReferralPricingContext({
        transactionType: 'auction',
        priceFrom: 1200000,
        startingBidFrom: 700000,
        reservePriceFrom: 900000,
      });
    expect({
      ...auctionContext,
      rangeLabel: normalizeMoneyLabel(auctionContext.rangeLabel),
    }).toMatchObject({
      transactionType: 'auction',
      label: 'Development Starting Bid Range',
      rangeLabel: 'R 700 000 - R 900 000',
    });
  });
});
