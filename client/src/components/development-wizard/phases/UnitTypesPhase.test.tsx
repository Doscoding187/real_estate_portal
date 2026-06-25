import { describe, expect, it } from 'vitest';
import {
  getAuctionLifecycleLabel,
  getUnitTypesPhaseMerchandisingPreview,
  getUnitTypesPhasePackagingChecklist,
  getUnitTypesPhasePriceDisplay,
  getUnitTypesPhasePricingRepairAffectedUnits,
  getUnitTypesPhasePricingRepairDiagnostic,
  getUnitTypesPhasePricingRepairCopy,
  getUnitTypesPhaseStockCopy,
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

  it('uses transaction-specific stock labels for held inventory', () => {
    expect(getUnitTypesPhaseStockCopy('for_sale')).toMatchObject({
      availableLabel: 'Available Units',
      reservedLabel: 'Reserved / Under Offer',
      historicalLabel: 'Sold Units (Historical)',
      emptyStatus: 'SOLD OUT / LISTING',
    });

    expect(getUnitTypesPhaseStockCopy('for_rent')).toMatchObject({
      availableLabel: 'Available Rentals',
      reservedLabel: 'Application Holds',
      historicalLabel: 'Let Units (Historical)',
      emptyStatus: 'FULLY LET',
    });

    expect(getUnitTypesPhaseStockCopy('auction')).toMatchObject({
      availableLabel: 'Open Lots',
      reservedLabel: 'Bidder Holds',
      historicalLabel: 'Closed Lots (Historical)',
      emptyStatus: 'AUCTION CLOSED',
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

  it('builds transaction-specific pricing repair hints for remediation routes', () => {
    expect(getUnitTypesPhasePricingRepairCopy('for_sale')).toMatchObject({
      title: 'Sale price repair fields',
      fields: expect.arrayContaining(['Base price', 'Maximum price', 'Available stock']),
    });

    expect(getUnitTypesPhasePricingRepairCopy('for_rent')).toMatchObject({
      title: 'Rental rent repair fields',
      fields: expect.arrayContaining(['Monthly rent from', 'Monthly rent to', 'Deposit']),
    });

    expect(getUnitTypesPhasePricingRepairCopy('auction')).toMatchObject({
      title: 'Auction bid repair fields',
      fields: expect.arrayContaining(['Starting bid', 'Reserve price', 'Auction window']),
    });
  });

  it('builds transaction-specific pricing repair diagnostics from public mirrors and unit inventory', () => {
    const saleDiagnostic = getUnitTypesPhasePricingRepairDiagnostic({
      developmentData: { priceFrom: 1_200_000, priceTo: 1_650_000 },
      transactionType: 'for_sale',
      unitTypes: [
        { basePriceFrom: 1_200_000, basePriceTo: 1_450_000 },
        { priceFrom: 1_350_000, priceTo: 1_650_000 },
      ],
    });
    expect({
      ...saleDiagnostic,
      publicValue: normalizeCurrencySpacing(saleDiagnostic.publicValue),
      liveValue: normalizeCurrencySpacing(saleDiagnostic.liveValue),
    }).toMatchObject({
      publicLabel: 'Public price band',
      publicValue: 'R 1 200 000 - R 1 650 000',
      liveLabel: 'Live unit price band',
      liveValue: 'R 1 200 000 - R 1 650 000',
    });

    const rentalDiagnostic = getUnitTypesPhasePricingRepairDiagnostic({
      developmentData: { monthlyRentFrom: 13_500, monthlyRentTo: 15_500 },
      transactionType: 'for_rent',
      unitTypes: [{ monthlyRentFrom: 13_500, monthlyRentTo: 15_500 }],
    });
    expect({
      ...rentalDiagnostic,
      publicValue: normalizeCurrencySpacing(rentalDiagnostic.publicValue),
      liveValue: normalizeCurrencySpacing(rentalDiagnostic.liveValue),
    }).toMatchObject({
      publicLabel: 'Public rent range',
      publicValue: 'R 13 500 - R 15 500 / month',
      liveLabel: 'Live unit rent range',
      liveValue: 'R 13 500 - R 15 500 / month',
    });

    const auctionDiagnostic = getUnitTypesPhasePricingRepairDiagnostic({
      developmentData: { startingBidFrom: 800_000 },
      transactionType: 'auction',
      unitTypes: [{ startingBid: 850_000 }],
    });
    expect({
      ...auctionDiagnostic,
      publicValue: normalizeCurrencySpacing(auctionDiagnostic.publicValue),
      liveValue: normalizeCurrencySpacing(auctionDiagnostic.liveValue),
    }).toMatchObject({
      publicLabel: 'Public bid from',
      publicValue: 'R 800 000',
      liveLabel: 'Live lot bid from',
      liveValue: 'R 850 000',
    });
  });

  it('identifies unit rows responsible for public-vs-live pricing drift', () => {
    const saleRows = getUnitTypesPhasePricingRepairAffectedUnits({
      developmentData: { priceFrom: 1_000_000, priceTo: 1_500_000 },
      transactionType: 'for_sale',
      unitTypes: [
        { id: 'sale-a', name: 'Starter Apartment', basePriceFrom: 1_200_000, basePriceTo: 1_350_000 },
        { id: 'sale-b', name: 'Penthouse', basePriceFrom: 1_400_000, basePriceTo: 1_650_000 },
      ],
    });
    expect(saleRows).toEqual([
      {
        id: 'sale-a',
        name: 'Starter Apartment',
        reason: 'Sets live price from',
        value: expect.stringContaining('1'),
      },
      {
        id: 'sale-b',
        name: 'Penthouse',
        reason: 'Sets live price to',
        value: expect.stringContaining('1'),
      },
    ]);

    const rentalRows = getUnitTypesPhasePricingRepairAffectedUnits({
      developmentData: { monthlyRentFrom: 12_000, monthlyRentTo: 15_000 },
      transactionType: 'for_rent',
      unitTypes: [
        { id: 'rent-a', name: 'Two Bed Rental', monthlyRentFrom: 13_500, monthlyRentTo: 15_500 },
      ],
    });
    expect(rentalRows).toMatchObject([
      {
        id: 'rent-a',
        name: 'Two Bed Rental',
        reason: 'Sets live rent from, Sets live rent to',
      },
    ]);
    expect(normalizeCurrencySpacing(rentalRows[0].value)).toBe('R 13 500, R 15 500');

    const auctionRows = getUnitTypesPhasePricingRepairAffectedUnits({
      developmentData: { startingBidFrom: 800_000 },
      transactionType: 'auction',
      unitTypes: [{ id: 'auction-a', name: 'Auction Lot', startingBid: 850_000 }],
    });
    expect(auctionRows).toMatchObject([
      {
        id: 'auction-a',
        name: 'Auction Lot',
        reason: 'Sets live bid from',
      },
    ]);
    expect(normalizeCurrencySpacing(auctionRows[0].value)).toBe('R 850 000');
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
      supportingDetails: expect.arrayContaining([
        'Internal reserve tracked for auction-team review',
      ]),
    });
    expect(auctionPreview.supportingDetails.some(detail => detail.includes('2030'))).toBe(true);
  });

  it('builds Rental package readiness around lease clarity and availability', () => {
    const checklist = getUnitTypesPhasePackagingChecklist(
      {
        name: '2 Bedroom Rental',
        description: 'Lease-ready rental unit.',
        monthlyRentFrom: 14_500,
        depositRequired: 29_000,
        leaseTerm: '12 months',
        isFurnished: false,
        availableUnits: 4,
      },
      'for_rent',
    );

    expect(checklist.title).toBe('Rental package readiness');
    expect(checklist.summary).toContain('lease clarity');
    expect(checklist.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Monthly rent', state: 'complete' }),
        expect.objectContaining({ label: 'Deposit', state: 'complete' }),
        expect.objectContaining({ label: 'Lease term', state: 'complete' }),
        expect.objectContaining({ label: 'Furnished state', state: 'complete' }),
        expect.objectContaining({ label: 'Rental availability', state: 'complete' }),
      ]),
    );
  });

  it('flags incomplete Rental package readiness before autosave can imply safety', () => {
    const checklist = getUnitTypesPhasePackagingChecklist(
      {
        monthlyRentFrom: 0,
        availableUnits: 0,
      },
      'for_rent',
    );

    expect(checklist.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Monthly rent', state: 'missing' }),
        expect.objectContaining({ label: 'Deposit', state: 'attention' }),
        expect.objectContaining({ label: 'Lease term', state: 'attention' }),
        expect.objectContaining({ label: 'Rental availability', state: 'missing' }),
      ]),
    );
  });

  it('builds Auction package readiness around bidding terms and lot availability', () => {
    const checklist = getUnitTypesPhasePackagingChecklist(
      {
        startingBid: 850_000,
        reservePrice: 950_000,
        auctionStartDate: '2030-02-01T09:00:00.000Z',
        auctionEndDate: '2030-02-08T17:00:00.000Z',
        auctionStatus: 'registration_open',
        availableUnits: 2,
      },
      'auction',
    );

    expect(checklist.title).toBe('Auction package readiness');
    expect(checklist.summary).toContain('bidding terms');
    expect(checklist.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Starting bid', state: 'complete' }),
        expect.objectContaining({ label: 'Auction window', state: 'complete' }),
        expect.objectContaining({
          label: 'Reserve strategy',
          detail: expect.stringContaining('bidder-facing copy'),
          state: 'complete',
        }),
        expect.objectContaining({
          label: 'Auction lifecycle',
          detail: 'Registration open',
          state: 'complete',
        }),
        expect.objectContaining({ label: 'Lot availability', state: 'complete' }),
      ]),
    );
  });

  it('keeps missing Auction package readiness distinct from sale or rental pricing', () => {
    const checklist = getUnitTypesPhasePackagingChecklist(
      {
        priceFrom: 1_200_000,
        monthlyRentFrom: 12_500,
        availableUnits: 0,
      },
      'auction',
    );

    expect(checklist.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Starting bid', state: 'missing' }),
        expect.objectContaining({ label: 'Auction window', state: 'missing' }),
        expect.objectContaining({ label: 'Reserve strategy', state: 'attention' }),
        expect.objectContaining({ label: 'Lot availability', state: 'missing' }),
      ]),
    );
  });
});
