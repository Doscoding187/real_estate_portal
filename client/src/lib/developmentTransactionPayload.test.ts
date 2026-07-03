import { describe, expect, it } from 'vitest';

import {
  buildDevelopmentFinancialPayload,
  normalizeDevelopmentTransactionType,
  stripUnitPricingForTransaction,
} from './developmentTransactionPayload';

describe('development transaction payload helpers', () => {
  it('normalizes transaction aliases', () => {
    expect(normalizeDevelopmentTransactionType('sale')).toBe('for_sale');
    expect(normalizeDevelopmentTransactionType('to-rent')).toBe('for_rent');
    expect(normalizeDevelopmentTransactionType('rent_to_buy')).toBe('for_rent');
    expect(normalizeDevelopmentTransactionType('auctions')).toBe('auction');
  });

  it('strips unit pricing fields outside the active transaction type', () => {
    const unit = stripUnitPricingForTransaction(
      {
        priceFrom: 1000000,
        monthlyRentFrom: 12000,
        startingBid: 800000,
        auctionStatus: 'scheduled',
      },
      'auction',
    );

    expect(unit).toEqual({
      startingBid: 800000,
      auctionStatus: 'scheduled',
    });
  });

  it('normalizes inverted active unit pricing ranges while stripping inactive fields', () => {
    expect(
      stripUnitPricingForTransaction(
        {
          priceFrom: 1_500_000,
          priceTo: 1_200_000,
          monthlyRentFrom: 12_000,
        },
        'for_sale',
      ),
    ).toEqual({
      priceFrom: 1_500_000,
      priceTo: 1_500_000,
    });

    expect(
      stripUnitPricingForTransaction(
        {
          monthlyRentFrom: 15_000,
          monthlyRentTo: 12_000,
          startingBid: 900_000,
        },
        'for_rent',
      ),
    ).toEqual({
      monthlyRentFrom: 15_000,
      monthlyRentTo: 15_000,
    });

    expect(
      stripUnitPricingForTransaction(
        {
          startingBid: 900_000,
          reservePrice: 850_000,
          priceFrom: 1_500_000,
        },
        'auction',
      ),
    ).toEqual({
      startingBid: 900_000,
      reservePrice: 900_000,
    });
  });

  it('only includes development financial fields for the active transaction type', () => {
    expect(
      buildDevelopmentFinancialPayload({
        transactionType: 'auction',
        priceFrom: 1000000,
        monthlyRentFrom: 12000,
        auctionStartDate: '2026-10-01T09:00:00.000Z',
        startingBidFrom: 800000,
      }),
    ).toEqual({
      priceFrom: undefined,
      priceTo: undefined,
      monthlyRentFrom: undefined,
      monthlyRentTo: undefined,
      auctionStartDate: '2026-10-01T09:00:00.000Z',
      auctionEndDate: undefined,
      startingBidFrom: 800000,
      reservePriceFrom: undefined,
    });
  });

  it('drops inverted upper-range financial fields from development payloads', () => {
    expect(
      buildDevelopmentFinancialPayload({
        transactionType: 'for_rent',
        monthlyRentFrom: 15_000,
        monthlyRentTo: 12_500,
      }),
    ).toMatchObject({
      monthlyRentFrom: 15_000,
      monthlyRentTo: undefined,
    });

    expect(
      buildDevelopmentFinancialPayload({
        transactionType: 'for_sale',
        priceFrom: 1_500_000,
        priceTo: 1_200_000,
      }),
    ).toMatchObject({
      priceFrom: 1_500_000,
      priceTo: undefined,
    });

    expect(
      buildDevelopmentFinancialPayload({
        transactionType: 'auction',
        startingBidFrom: 900_000,
        reservePriceFrom: 850_000,
      }),
    ).toMatchObject({
      startingBidFrom: 900_000,
      reservePriceFrom: undefined,
    });
  });
});
