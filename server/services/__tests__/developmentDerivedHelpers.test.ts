import { describe, expect, it } from 'vitest';
import {
  buildDevelopmentFinancialPayload,
  buildDevelopmentTransactionAggregates,
  calculateInventorySummary,
  calculatePriceFrom,
  compareDevelopmentUnitsForPublicDisplay,
  mapDevelopmentTransactionTypeToListingType,
  mapListingTypeToDevelopmentTransactionType,
  normalizeDevelopmentTransactionType,
  stripUnitPricingForTransaction,
} from '../../../shared/developmentDerived';

describe('development derived helpers', () => {
  it('normalizes transaction aliases for shared client and server inventory paths', () => {
    expect(normalizeDevelopmentTransactionType('sale')).toBe('for_sale');
    expect(normalizeDevelopmentTransactionType('to-rent')).toBe('for_rent');
    expect(normalizeDevelopmentTransactionType('rent_to_buy')).toBe('for_rent');
    expect(normalizeDevelopmentTransactionType('auctions')).toBe('auction');
  });

  it('maps public listing intent aliases to canonical development transaction filters', () => {
    expect(mapListingTypeToDevelopmentTransactionType('sale')).toBe('for_sale');
    expect(mapListingTypeToDevelopmentTransactionType('rent-to-buy')).toBe('for_rent');
    expect(mapListingTypeToDevelopmentTransactionType('to_rent')).toBe('for_rent');
    expect(mapListingTypeToDevelopmentTransactionType('auctions')).toBe('auction');
    expect(mapListingTypeToDevelopmentTransactionType('shared_living')).toBeUndefined();
  });

  it('maps canonical development transactions back to public listing types', () => {
    expect(mapDevelopmentTransactionTypeToListingType('for_sale')).toBe('sale');
    expect(mapDevelopmentTransactionTypeToListingType('for_rent')).toBe('rent');
    expect(mapDevelopmentTransactionTypeToListingType('auction')).toBe('auction');
  });

  it('strips inactive unit pricing fields while preserving the active commercial inventory model', () => {
    expect(
      stripUnitPricingForTransaction(
        {
          priceFrom: 1_500_000,
          priceTo: 1_200_000,
          monthlyRentFrom: 12_000,
        },
        'for_sale',
      ),
    ).toEqual({ priceFrom: 1_500_000, priceTo: 1_500_000 });

    expect(
      stripUnitPricingForTransaction(
        {
          monthlyRentFrom: 15_000,
          monthlyRentTo: 12_000,
          startingBid: 900_000,
        },
        'for_rent',
      ),
    ).toEqual({ monthlyRentFrom: 15_000, monthlyRentTo: 15_000 });

    expect(
      stripUnitPricingForTransaction(
        {
          startingBid: 900_000,
          reservePrice: 850_000,
          priceFrom: 1_500_000,
        },
        'auction',
      ),
    ).toEqual({ startingBid: 900_000, reservePrice: 900_000 });
  });

  it('builds active-only development financial payloads and transaction aggregates', () => {
    expect(
      buildDevelopmentFinancialPayload({
        transactionType: 'auction',
        priceFrom: 1_000_000,
        monthlyRentFrom: 12_000,
        auctionStartDate: '2026-10-01T09:00:00.000Z',
        startingBidFrom: 800_000,
      }),
    ).toMatchObject({
      priceFrom: undefined,
      monthlyRentFrom: undefined,
      auctionStartDate: '2026-10-01T09:00:00.000Z',
      startingBidFrom: 800_000,
    });

    expect(
      buildDevelopmentTransactionAggregates(
        'for_rent',
        { priceFrom: 1_000_000, startingBidFrom: 750_000 },
        [
          { monthlyRentFrom: 12_500, monthlyRentTo: 15_000 },
          { monthlyRentFrom: 9_500, monthlyRentTo: 18_000 },
        ],
      ),
    ).toEqual({
      priceFrom: null,
      priceTo: null,
      monthlyRentFrom: 9_500,
      monthlyRentTo: 18_000,
      auctionStartDate: null,
      auctionEndDate: null,
      startingBidFrom: null,
      reservePriceFrom: null,
    });
  });

  it('calculates transaction-aware unit price ranges', () => {
    expect(
      calculatePriceFrom(
        {
          priceFrom: '1195000.00',
          priceTo: '1395000.00',
          monthlyRentFrom: '18000.00',
          startingBid: '900000.00',
        },
        'for_sale',
      ),
    ).toEqual({ priceFrom: 1195000, priceTo: 1395000 });

    expect(
      calculatePriceFrom(
        {
          priceFrom: '1195000.00',
          monthlyRentFrom: '18000.00',
          monthlyRentTo: '21000.00',
          startingBid: '900000.00',
        },
        'for_rent',
      ),
    ).toEqual({ priceFrom: 18000, priceTo: 21000 });

    expect(
      calculatePriceFrom(
        {
          priceFrom: '1195000.00',
          reservePrice: '1200000.00',
          startingBid: '900000.00',
        },
        'auction',
      ),
    ).toEqual({ priceFrom: 900000, priceTo: 1200000 });
  });

  it('drops inverted upper price ranges instead of publishing misleading max values', () => {
    expect(calculatePriceFrom({ priceFrom: 1500000, priceTo: 1200000 }, 'for_sale')).toEqual({
      priceFrom: 1500000,
      priceTo: undefined,
    });

    expect(
      calculatePriceFrom({ monthlyRentFrom: 15000, monthlyRentTo: 12500 }, 'for_rent'),
    ).toEqual({ priceFrom: 15000, priceTo: undefined });

    expect(calculatePriceFrom({ startingBid: 900000, reservePrice: 850000 }, 'auction')).toEqual({
      priceFrom: 900000,
      priceTo: undefined,
    });
  });

  it('clamps inventory counts and derives sold stock consistently', () => {
    expect(
      calculateInventorySummary({
        totalUnits: 12,
        availableUnits: 7,
        reservedUnits: 2,
      }),
    ).toEqual({
      total: 12,
      available: 7,
      reserved: 2,
      sold: 3,
      soldPct: 25,
      isSoldOut: false,
    });

    expect(
      calculateInventorySummary({
        totalUnits: 5,
        availableUnits: 9,
        reservedUnits: 4,
      }),
    ).toEqual({
      total: 5,
      available: 1,
      reserved: 4,
      sold: 0,
      soldPct: 0,
      isSoldOut: false,
    });
  });

  it('orders public units by display order before transaction-aware price', () => {
    const units = [
      { name: 'Sale priced first but displayed second', displayOrder: 2, priceFrom: 500000 },
      { name: 'Displayed first', displayOrder: 1, priceFrom: 1000000 },
      { name: 'Displayed first lower price', displayOrder: 1, priceFrom: 750000 },
    ].sort((left, right) => compareDevelopmentUnitsForPublicDisplay(left, right, 'for_sale'));

    expect(units.map(unit => unit.name)).toEqual([
      'Displayed first lower price',
      'Displayed first',
      'Sale priced first but displayed second',
    ]);
  });

  it('orders rental and auction units by their commercial price fields', () => {
    const rentalUnits = [
      {
        name: 'Stale sale cheap rent high',
        displayOrder: 1,
        basePriceFrom: 100000,
        monthlyRentFrom: 22000,
      },
      {
        name: 'Stale sale expensive rent low',
        displayOrder: 1,
        basePriceFrom: 9000000,
        monthlyRentFrom: 15000,
      },
    ].sort((left, right) => compareDevelopmentUnitsForPublicDisplay(left, right, 'for_rent'));
    const auctionUnits = [
      {
        name: 'Reserve only is not entry',
        displayOrder: 1,
        startingBid: 950000,
        reservePrice: 1200000,
      },
      { name: 'Lower starting bid', displayOrder: 1, startingBid: 750000, reservePrice: 1600000 },
    ].sort((left, right) => compareDevelopmentUnitsForPublicDisplay(left, right, 'auction'));

    expect(rentalUnits.map(unit => unit.name)).toEqual([
      'Stale sale expensive rent low',
      'Stale sale cheap rent high',
    ]);
    expect(auctionUnits.map(unit => unit.name)).toEqual([
      'Lower starting bid',
      'Reserve only is not entry',
    ]);
  });
});
