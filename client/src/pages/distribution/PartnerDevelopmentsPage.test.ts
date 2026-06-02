import { describe, expect, it } from 'vitest';
import {
  getPartnerDevelopmentPricingContext,
  normalizePartnerDevelopmentTransactionType,
} from './PartnerDevelopmentsPage';

describe('PartnerDevelopmentsPage pricing helpers', () => {
  it('normalizes partner development transaction aliases', () => {
    expect(normalizePartnerDevelopmentTransactionType('for_rent')).toBe('rent');
    expect(normalizePartnerDevelopmentTransactionType('to-rent')).toBe('rent');
    expect(normalizePartnerDevelopmentTransactionType('on auction')).toBe('auction');
    expect(normalizePartnerDevelopmentTransactionType('for_sale')).toBe('sale');
  });

  it('uses rental wording and monthly rent instead of bond wording', () => {
    const context = getPartnerDevelopmentPricingContext({
      transactionType: 'for_rent',
      priceFrom: 12_500,
      priceTo: 15_000,
    });

    expect(context).toMatchObject({
      transactionType: 'rent',
      priceLabel: 'Monthly rent',
      monthlyCostLabel: 'Monthly rent',
      monthlyCost: 12_500,
      incomeLabel: 'Suggested income',
    });
    expect(context.priceText).toContain('/ month');
    expect(context.assumptionsText).toContain('Rental fit');
    expect(context.assumptionsText).not.toContain('bond');
  });

  it('uses auction starting bid wording with bid-based bond estimates', () => {
    const context = getPartnerDevelopmentPricingContext({
      transactionType: 'auction',
      priceFrom: 850_000,
      priceTo: 950_000,
    });

    expect(context).toMatchObject({
      transactionType: 'auction',
      priceLabel: 'Starting bid',
      monthlyCostLabel: 'Est. bond payment',
      incomeLabel: 'Indicative income',
    });
    expect(context.priceText).toContain('Bid from');
    expect(context.monthlyCost).toBeGreaterThan(0);
    expect(context.assumptionsText).toContain('starting bid');
  });

  it('keeps sale pricing as price and qualifying income', () => {
    const context = getPartnerDevelopmentPricingContext({
      transactionType: 'for_sale',
      priceFrom: 1_200_000,
      priceTo: 1_500_000,
    });

    expect(context).toMatchObject({
      transactionType: 'sale',
      priceLabel: 'Price',
      monthlyCostLabel: 'Est. bond payment',
      incomeLabel: 'Qualifying income',
    });
    expect(context.priceText).toContain('R');
    expect(context.monthlyCost).toBeGreaterThan(0);
  });
});
