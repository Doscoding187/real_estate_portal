import { describe, expect, it } from 'vitest';
import {
  getAuctionLifecycleLabel,
  getUnitTypesPhaseMerchandisingPreview,
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

  it('shows Auction lifecycle labels without Sale/Rental status language', () => {
    expect(getAuctionLifecycleLabel('scheduled')).toBe('Scheduled');
    expect(getAuctionLifecycleLabel('registration_open')).toBe('Registration open');
    expect(getAuctionLifecycleLabel('active')).toBe('Auction active');
    expect(getAuctionLifecycleLabel('sold')).toBe('Sold at auction');
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

  it('builds sale, rental, and auction public merchandising previews', () => {
    const salePreview = getUnitTypesPhaseMerchandisingPreview(
      {
        priceFrom: 1_200_000,
        priceTo: 1_450_000,
        availableUnits: 4,
      },
      'for_sale',
    );
    expect(salePreview).toMatchObject({
      eyebrow: 'Sale card preview',
      priceLabel: 'Price from',
      priceSuffix: '',
      availabilityLabel: '4 for sale',
      ctaLabel: 'Enquire to buy',
      leadContextLabel: 'Purchase lead context',
      supportingDetails: expect.arrayContaining(['4 units for sale', 'Buyer price band']),
    });

    const rentalPreview = getUnitTypesPhaseMerchandisingPreview(
      {
        monthlyRentFrom: 12_500,
        monthlyRentTo: 14_000,
        depositRequired: 25_000,
        leaseTerm: '12 months',
        availableUnits: 3,
      },
      'for_rent',
    );
    expect(rentalPreview).toMatchObject({
      eyebrow: 'Rental card preview',
      priceLabel: 'Rent from',
      priceSuffix: '/ month',
      availabilityLabel: '3 rentals available',
      ctaLabel: 'Request rental details',
      leadContextLabel: 'Rental lead context',
      supportingDetails: expect.arrayContaining(['12 months']),
    });
    expect(rentalPreview.supportingDetails.map(normalizeCurrencySpacing)).toContain(
      'Deposit R 25 000',
    );

    const auctionPreview = getUnitTypesPhaseMerchandisingPreview(
      {
        startingBid: 850_000,
        reservePrice: 950_000,
        auctionStartDate: '2030-02-01T09:00:00.000Z',
        auctionEndDate: '2030-02-08T17:00:00.000Z',
        availableUnits: 2,
      },
      'auction',
    );
    expect(auctionPreview).toMatchObject({
      eyebrow: 'Auction card preview',
      priceLabel: 'Starting bid',
      priceSuffix: 'starting bid',
      availabilityLabel: '2 lots open',
      ctaLabel: 'Register auction interest',
      leadContextLabel: 'Auction lead context',
      supportingDetails: expect.arrayContaining(['Reserve tracked internally']),
    });
    expect(auctionPreview.supportingDetails.some(detail => detail.includes('2030'))).toBe(true);
  });
});
