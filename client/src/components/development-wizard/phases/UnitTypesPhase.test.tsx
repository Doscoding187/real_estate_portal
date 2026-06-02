import { describe, expect, it } from 'vitest';
import { describe, expect, it } from 'vitest';
import {
  getUnitTypesPhasePriceDisplay,
  getUnitTypesPhaseTransactionCopy,
  isValidUnitTypesPhaseMonthlyRentRange,
  normalizeUnitTypesPhaseTransactionType,
} from './UnitTypesPhase';

const normalizeCurrencySpacing = (value: string) => value.replace(/\s+/g, ' ');

describe('UnitTypesPhase transaction helpers', () => {
  it('normalizes transaction type aliases for unit type pricing', () => {
    expect(normalizeUnitTypesPhaseTransactionType('for_rent')).toBe('for_rent');
    expect(normalizeUnitTypesPhaseTransactionType('to rent')).toBe('for_rent');
    expect(normalizeUnitTypesPhaseTransactionType('on-auction')).toBe('auction');
    expect(normalizeUnitTypesPhaseTransactionType('for_sale')).toBe('for_sale');
  });

  it('returns transaction-specific helper copy', () => {
    expect(getUnitTypesPhaseTransactionCopy('for_sale')).toMatchObject({
      recommendation:
        'Recommended for cards: add at least 2 unit types with clear names and sale prices.',
      emptyVerb: 'selling',
    });

    expect(getUnitTypesPhaseTransactionCopy('for_rent')).toMatchObject({
      recommendation:
        'Recommended for cards: add at least 2 unit types with clear names and monthly rents.',
      emptyVerb: 'leasing',
    });

    expect(getUnitTypesPhaseTransactionCopy('auction')).toMatchObject({
      recommendation:
        'Recommended for cards: add at least 2 unit types with clear names and starting bids.',
      emptyVerb: 'auctioning',
    });
  });

  it('formats sale, rent, and auction card prices from transaction-specific fields', () => {
    const saleDisplay = getUnitTypesPhasePriceDisplay(
      {
        priceFrom: 1_200_000,
        priceTo: 1_450_000,
        monthlyRentFrom: 12_500,
        startingBid: 850_000,
      },
      'for_sale',
    );
    expect(normalizeCurrencySpacing(saleDisplay.display)).toBe('R 1 200 000 - R 1 450 000');
    expect(saleDisplay.suffix).toBe('');

    const rentDisplay = getUnitTypesPhasePriceDisplay(
      {
        priceFrom: 1_200_000,
        monthlyRentFrom: 12_500,
        monthlyRentTo: 14_000,
      },
      'for_rent',
    );
    expect(normalizeCurrencySpacing(rentDisplay.display)).toBe('R 12 500 - R 14 000');
    expect(rentDisplay.suffix).toBe('/ month');

    const auctionDisplay = getUnitTypesPhasePriceDisplay(
      {
        priceFrom: 1_200_000,
        startingBid: 850_000,
        reservePrice: 950_000,
      },
      'auction',
    );
    expect(normalizeCurrencySpacing(auctionDisplay.display)).toBe('R 850 000');
    expect(auctionDisplay.suffix).toBe('starting bid');
  });

  it('validates optional monthly rent upper range against monthly rent from', () => {
    expect(
      isValidUnitTypesPhaseMonthlyRentRange({
        monthlyRentFrom: 15_000,
        monthlyRentTo: 16_000,
      }),
    ).toBe(true);
    expect(
      isValidUnitTypesPhaseMonthlyRentRange({
        monthlyRentFrom: 15_000,
        monthlyRentTo: undefined,
      }),
    ).toBe(true);
    expect(
      isValidUnitTypesPhaseMonthlyRentRange({
        monthlyRentFrom: 15_000,
        monthlyRentTo: 12_500,
      }),
    ).toBe(false);
  });
});
