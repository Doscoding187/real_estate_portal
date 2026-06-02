import { describe, expect, it } from 'vitest';

import { getEntityStatusCardPriceDisplay } from './EntityStatusCard';

function normalizeMoneyLabel(value: string | null) {
  return value?.replace(/\s|\u00a0/g, ' ') ?? null;
}

describe('EntityStatusCard pricing', () => {
  it('formats rental development pricing from monthly rent fields', () => {
    expect(
      normalizeMoneyLabel(
        getEntityStatusCardPriceDisplay('development', {
          transactionType: 'for_rent',
          priceFrom: 1200000,
          monthlyRentFrom: 12500,
          monthlyRentTo: 15000,
        }),
      ),
    ).toBe('Rent R 12 500 - R 15 000');
  });

  it('formats auction development pricing from bid fields', () => {
    expect(
      normalizeMoneyLabel(
        getEntityStatusCardPriceDisplay('development', {
          transactionType: 'auction',
          priceFrom: 1200000,
          startingBidFrom: 850000,
          reservePriceFrom: 950000,
        }),
      ),
    ).toBe('Starting bid R 850 000 - R 950 000');
  });

  it('keeps sale development pricing on price fields', () => {
    expect(
      normalizeMoneyLabel(
        getEntityStatusCardPriceDisplay('development', {
          transactionType: 'for_sale',
          priceFrom: 1200000,
          priceTo: 1500000,
        }),
      ),
    ).toBe('R 1 200 000 - R 1 500 000');
  });
});
