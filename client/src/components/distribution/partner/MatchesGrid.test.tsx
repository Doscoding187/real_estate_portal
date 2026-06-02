import { describe, expect, it } from 'vitest';
import {
  getAcceleratorMatchPriceText,
  normalizeAcceleratorMatchTransactionType,
} from './MatchesGrid';

describe('MatchesGrid pricing helpers', () => {
  it('normalizes listing transaction types', () => {
    expect(normalizeAcceleratorMatchTransactionType('for_rent')).toBe('rent');
    expect(normalizeAcceleratorMatchTransactionType('auction')).toBe('auction');
    expect(normalizeAcceleratorMatchTransactionType('leasehold')).toBe('sale');
  });

  it('labels rent and auction unit options without purchase-price copy', () => {
    const rent = getAcceleratorMatchPriceText({
      transactionType: 'rent',
      priceFrom: 12_500,
      priceTo: 14_000,
    });
    expect(rent.label).toBe('Monthly rent');
    expect(rent.text.replace(/\s/g, ' ')).toBe('R12 500 - R14 000 / month');

    const auction = getAcceleratorMatchPriceText({
      transactionType: 'auction',
      priceFrom: 850_000,
      priceTo: 900_000,
    });
    expect(auction.label).toBe('Starting bid');
    expect(auction.text.replace(/\s/g, ' ')).toBe('R850 000 - R900 000');
  });
});
