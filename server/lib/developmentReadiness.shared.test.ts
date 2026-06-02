import { describe, expect, it } from 'vitest';

import {
  calculateDevelopmentReadiness,
  getDevelopmentPublishBasicsReadiness,
  getDevelopmentPublishReadinessSummary,
  getDevelopmentUnitAuctionTimingReadiness,
  getDevelopmentUnitCommercialReadiness,
  getDevelopmentUnitInventoryReadiness,
  getDevelopmentUnitPublishReadinessSummary,
  getDevelopmentReadinessPricing,
  normalizeDevelopmentReadinessTransactionType,
} from '../../shared/developmentReadiness';

const completeDevelopment = {
  name: 'Shared Readiness Development',
  description:
    'A complete development description with enough detail to satisfy readiness requirements.',
  address: '1 Shared Street',
  latitude: '-26.1',
  longitude: '28.1',
  images: JSON.stringify(['hero.jpg']),
  amenities: JSON.stringify(['Pool', 'Security', 'Gym']),
};

describe('shared development readiness', () => {
  it('normalizes canonical and legacy transaction aliases', () => {
    expect(normalizeDevelopmentReadinessTransactionType('for_rent')).toBe('rent');
    expect(normalizeDevelopmentReadinessTransactionType('to-rent')).toBe('rent');
    expect(normalizeDevelopmentReadinessTransactionType('on auction')).toBe('auction');
    expect(normalizeDevelopmentReadinessTransactionType('for_sale')).toBe('sale');
  });

  it('scores canonical rental pricing and json-backed media fields', () => {
    expect(
      calculateDevelopmentReadiness({
        ...completeDevelopment,
        transactionType: 'for_rent',
        monthlyRentFrom: 12_500,
      }),
    ).toMatchObject({
      score: 100,
      missing: {
        specs: [],
        media: [],
        amenities: [],
      },
    });
  });

  it('flags inverted rental ranges as a readiness blocker', () => {
    expect(
      getDevelopmentReadinessPricing({
        transactionType: 'for_rent',
        monthlyRentFrom: 15_000,
        monthlyRentTo: 12_500,
      }),
    ).toMatchObject({
      transactionType: 'rent',
      value: null,
      missingLabel: 'Monthly Rent To must be greater than or equal to Monthly Rent From',
    });
  });

  it('uses canonical auction pricing fields', () => {
    expect(
      calculateDevelopmentReadiness({
        ...completeDevelopment,
        transactionType: 'auction',
        startingBidFrom: 850_000,
      }).score,
    ).toBe(100);
  });

  it('validates unit commercial pricing by transaction type', () => {
    expect(
      getDevelopmentUnitCommercialReadiness(
        { priceFrom: 1_500_000, priceTo: 1_650_000 },
        'for_sale',
      ),
    ).toMatchObject({ isReady: true, code: 'ready', transactionType: 'sale' });

    expect(
      getDevelopmentUnitCommercialReadiness(
        { monthlyRentFrom: 15_000, monthlyRentTo: 12_500 },
        'for_rent',
      ),
    ).toMatchObject({
      isReady: false,
      code: 'invalid_monthly_rent_range',
      field: 'monthlyRentTo',
      transactionType: 'rent',
    });

    expect(
      getDevelopmentUnitCommercialReadiness(
        { startingBid: 850_000, reservePrice: 800_000 },
        'auction',
      ),
    ).toMatchObject({
      isReady: false,
      code: 'invalid_reserve_price_range',
      field: 'reservePrice',
      transactionType: 'auction',
    });
  });

  it('validates canonical auction timing rules for publish readiness', () => {
    expect(
      getDevelopmentUnitAuctionTimingReadiness(
        {
          auctionStartDate: '2030-05-01T10:00:00.000Z',
          auctionEndDate: '2030-05-01T09:00:00.000Z',
        },
        { nowMs: new Date('2030-01-01T00:00:00.000Z').getTime() },
      ),
    ).toMatchObject({
      isReady: false,
      code: 'invalid_auction_date_order',
      field: 'auctionEndDate',
    });

    expect(
      getDevelopmentUnitAuctionTimingReadiness(
        {
          auctionStartDate: '2029-12-31T10:00:00.000Z',
          auctionEndDate: '2030-01-02T10:00:00.000Z',
        },
        { nowMs: new Date('2030-01-01T00:00:00.000Z').getTime() },
      ),
    ).toMatchObject({
      isReady: false,
      code: 'auction_start_date_in_past',
      field: 'auctionStartDate',
    });

    expect(
      getDevelopmentUnitAuctionTimingReadiness(
        {
          auctionStartDate: '2030-01-02T10:00:00.000Z',
          auctionEndDate: '2030-01-02T11:00:00.000Z',
        },
        { nowMs: new Date('2030-01-01T00:00:00.000Z').getTime() },
      ),
    ).toMatchObject({ isReady: true, code: 'ready' });
  });

  it('summarizes unit publish readiness into canonical field errors', () => {
    expect(
      getDevelopmentUnitPublishReadinessSummary(
        [
          {
            startingBid: 900_000,
            reservePrice: 950_000,
            auctionStartDate: '2030-05-01T10:00:00.000Z',
            auctionEndDate: '2030-05-01T09:00:00.000Z',
          },
        ],
        'auction',
        { nowMs: new Date('2030-01-01T00:00:00.000Z').getTime() },
      ),
    ).toMatchObject({
      isReady: false,
      fieldErrors: {
        'unitTypes.auctionEndDate': 'Auction end date must be after the start date',
      },
      messages: ['Auction end date must be after the start date'],
    });

    expect(
      getDevelopmentUnitPublishReadinessSummary(
        [{ monthlyRentFrom: 15_000, monthlyRentTo: 12_500 }],
        'for_rent',
      ),
    ).toMatchObject({
      fieldErrors: {
        'unitTypes.monthlyRentTo':
          'Monthly rent upper range must be greater than or equal to monthly rent from',
      },
    });
  });

  it('validates unit inventory and includes it in publish readiness summaries', () => {
    expect(
      getDevelopmentUnitInventoryReadiness({
        totalUnits: 10,
        availableUnits: 8,
        reservedUnits: 3,
      }),
    ).toMatchObject({
      isReady: false,
      code: 'invalid_inventory_counts',
      field: 'reservedUnits',
    });

    expect(
      getDevelopmentUnitPublishReadinessSummary(
        [
          {
            priceFrom: 1_500_000,
            totalUnits: 10,
            availableUnits: 8,
            reservedUnits: 3,
          },
        ],
        'for_sale',
      ),
    ).toMatchObject({
      isReady: false,
      fieldErrors: {
        'unitTypes.reservedUnits':
          'Each unit type must satisfy available + reserved <= total units',
      },
      messages: ['Each unit type must satisfy available + reserved <= total units'],
    });
  });

  it('summarizes basic publish readiness from canonical media and description', () => {
    expect(
      getDevelopmentPublishBasicsReadiness({
        name: 'Publish Basics Development',
        location: { address: '1 Main Road' },
        highlights: ['One', 'Two', 'Three'],
        status: 'planning',
        ownershipTypes: ['sectional-title'],
        description: 'Too short',
        media: { photos: [] },
        images: [],
      }),
    ).toMatchObject({
      isReady: false,
      fieldErrors: {
        'media.heroImage': 'At least one photo (Hero Image) is required',
        description: 'Description must be at least 50 characters',
      },
      messages: ['At least 1 image is required', 'Description must be at least 50 characters'],
    });

    expect(
      getDevelopmentPublishBasicsReadiness({
        name: 'Publish Basics Development',
        location: { address: '1 Main Road' },
        description:
          'A complete publish-ready development description with enough detail for public display.',
        media: {
          photos: [{ url: 'https://example.com/photo.jpg' }],
        },
        highlights: ['One', 'Two', 'Three'],
        status: 'planning',
        ownershipTypes: ['sectional-title'],
      }),
    ).toMatchObject({ isReady: true, fieldErrors: {}, messages: [] });
  });

  it('summarizes identity, location, status, and ownership publish blockers', () => {
    expect(
      getDevelopmentPublishBasicsReadiness({
        description:
          'A complete publish-ready development description with enough detail for public display.',
        media: { heroImage: { url: 'https://example.com/hero.jpg' } },
        highlights: ['Only one'],
        status: 'selling',
        handoverDuringConstruction: true,
      }),
    ).toMatchObject({
      isReady: false,
      fieldErrors: {
        name: 'Development Name is required',
        'location.address': 'Location Address is required',
        highlights: 'Add at least 3 highlights',
        launchDate: 'Launch date is required for this status',
        completionDate: 'Expected completion date is required for this status',
        ownershipTypes: 'Select at least one ownership type',
        expectedFirstHandoverDate:
          'Expected first handover date is required when handovers occur during construction',
      },
    });
  });

  it('summarizes full publish readiness across basics, classification, and unit inventory', () => {
    expect(
      getDevelopmentPublishReadinessSummary({
        name: 'Full Publish Readiness',
        location: { address: '1 Main Road' },
        description:
          'A complete publish-ready development description with enough detail for public display.',
        media: { heroImage: { url: 'https://example.com/hero.jpg' } },
        highlights: ['One', 'Two', 'Three'],
        status: 'planning',
        ownershipTypes: ['sectional-title'],
        transactionType: 'for_sale',
        unitTypes: [
          {
            priceFrom: 1_500_000,
            totalUnits: 10,
            availableUnits: 8,
            reservedUnits: 3,
          },
        ],
      }),
    ).toMatchObject({
      isReady: false,
      fieldErrors: {
        'classification.type': 'Classification Type is required',
        'unitTypes.reservedUnits':
          'Each unit type must satisfy available + reserved <= total units',
      },
      messages: [
        'Classification Type is required',
        'Each unit type must satisfy available + reserved <= total units',
      ],
    });

    expect(
      getDevelopmentPublishReadinessSummary({
        name: 'Land Publish Readiness',
        location: { address: '2 Main Road' },
        description:
          'A complete publish-ready land development description with enough detail for public display.',
        media: { heroImage: { url: 'https://example.com/land.jpg' } },
        highlights: ['One', 'Two', 'Three'],
        status: 'planning',
        ownershipTypes: ['freehold'],
        classification: { type: 'land' },
        transactionType: 'for_sale',
        unitTypes: [],
      }),
    ).toMatchObject({ isReady: true, fieldErrors: {}, messages: [] });
  });
});
