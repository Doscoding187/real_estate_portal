import { describe, expect, it } from 'vitest';

import {
  getEntityStatusCardOperationsSnapshot,
  getEntityStatusCardPriceDisplay,
} from './EntityStatusCard';

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

describe('EntityStatusCard operations snapshot', () => {
  it('builds a sale-native read-only operations snapshot', () => {
    expect(
      getEntityStatusCardOperationsSnapshot('development', {
        transactionType: 'for_sale',
        totalUnits: 10,
        availableUnits: 4,
        reservedUnits: 2,
      }),
    ).toMatchObject({
      engineLabel: 'Sale Engine',
      inventoryLabel: 'Sales inventory',
      primaryLabel: 'Available',
      primaryCount: 4,
      secondaryLabel: 'Reserved',
      secondaryCount: 2,
      outcomeLabel: 'Sold estimate',
      outcomeCount: 4,
      leadCtaLabel: 'Manage buyer leads',
    });
  });

  it('builds a rental-native read-only operations snapshot', () => {
    expect(
      getEntityStatusCardOperationsSnapshot('development', {
        transactionType: 'for_rent',
        totalUnits: 12,
        availableUnits: 5,
        reservedUnits: 3,
      }),
    ).toMatchObject({
      engineLabel: 'Rental Engine',
      inventoryLabel: 'Leasing inventory',
      primaryLabel: 'Rentals available',
      primaryCount: 5,
      secondaryLabel: 'Held',
      secondaryCount: 3,
      outcomeLabel: 'Let estimate',
      outcomeCount: 4,
      leadCtaLabel: 'Manage rental leads',
    });
  });

  it('builds an auction-native read-only operations snapshot', () => {
    expect(
      getEntityStatusCardOperationsSnapshot('development', {
        transactionType: 'auction',
        totalUnits: 6,
        availableUnits: 2,
        reservedUnits: 1,
      }),
    ).toMatchObject({
      engineLabel: 'Auction Engine',
      inventoryLabel: 'Auction lots',
      primaryLabel: 'Lots open',
      primaryCount: 2,
      secondaryLabel: 'Registered or held',
      secondaryCount: 1,
      outcomeLabel: 'Auction outcomes',
      outcomeCount: 3,
      leadCtaLabel: 'Manage bidder leads',
    });
  });

  it('does not build an operating snapshot for normal listings', () => {
    expect(getEntityStatusCardOperationsSnapshot('listing', {})).toBeNull();
  });
});
