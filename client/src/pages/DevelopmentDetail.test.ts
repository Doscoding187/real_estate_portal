import { describe, expect, it } from 'vitest';

import {
  buildDevelopmentDetailAmenityGroups,
  formatDevelopmentDetailLabel,
  getDevelopmentDetailActionPanelCopy,
  getDevelopmentDetailHighlights,
  getDevelopmentDetailLeadUnitContext,
  getDevelopmentDetailMediaBuckets,
  getDevelopmentDetailPricingContext,
  getDevelopmentDetailUnitAvailabilityState,
  getDevelopmentDetailUnitPricingContext,
  normalizeDevelopmentDetailTransactionType,
} from './DevelopmentDetail';

describe('DevelopmentDetail pricing context', () => {
  it('builds amenity groups without render-order helper errors', () => {
    expect(formatDevelopmentDetailLabel('backup_power')).toBe('Backup Power');

    const groups = buildDevelopmentDetailAmenityGroups([
      '24_hour_security',
      'backup_power',
      'custom_rooftop_lounge',
    ]);

    expect(groups.security).toEqual([
      expect.objectContaining({ key: '24_hour_security', label: '24-Hour Security' }),
    ]);
    expect(groups.convenience).toEqual([
      expect.objectContaining({ key: 'backup_power', label: 'Backup Generator / Power' }),
    ]);
    expect(groups.other).toEqual([
      expect.objectContaining({ key: 'custom_rooftop_lounge', label: 'Custom Rooftop Lounge' }),
    ]);
  });

  it('normalizes development detail transaction aliases', () => {
    expect(normalizeDevelopmentDetailTransactionType('for_rent')).toBe('rent');
    expect(normalizeDevelopmentDetailTransactionType('to-rent')).toBe('rent');
    expect(normalizeDevelopmentDetailTransactionType('on auction')).toBe('auction');
    expect(normalizeDevelopmentDetailTransactionType('for_sale')).toBe('sale');
  });

  it('normalizes public highlights from canonical and legacy sources', () => {
    expect(
      getDevelopmentDetailHighlights({
        highlights: JSON.stringify(['No transfer duty', 'Prime Sandton address']),
        developmentData: {
          highlights: ['No transfer duty', 'Launch-ready investor units'],
        },
        stepData: {
          marketing_summary: {
            keySellingPoints: [{ label: 'Limited launch pricing' }],
          },
        },
      }),
    ).toEqual([
      'No transfer duty',
      'Prime Sandton address',
      'Launch-ready investor units',
      'Limited launch pricing',
    ]);
  });

  it('keeps sale action panel copy focused on affordability and sales enquiry', () => {
    expect(getDevelopmentDetailActionPanelCopy('for_sale', 4, true)).toMatchObject({
      headline: 'Check affordability and take the next step.',
      qualificationTitle: 'Quick Qualification Check',
      depositLabel: 'Optional deposit',
      primaryActionLabel: 'Start Full Qualification',
      brochureActionLabel: 'Download Brochure',
      contactActionLabel: 'Contact Sales Team',
      trustSignals: expect.arrayContaining([
        'Free pre-qualification available',
        'No obligation to enquire',
        '4 unit types available',
      ]),
    });
  });

  it('uses rental-native action panel copy for lease enquiries', () => {
    expect(getDevelopmentDetailActionPanelCopy('for_rent', 3, false)).toMatchObject({
      headline: 'Check rental fit and request lease details.',
      qualificationTitle: 'Rental Fit Check',
      depositLabel: 'Optional deposit or upfront amount',
      primaryActionLabel: 'Check Rental Fit',
      brochureActionLabel: 'Request Rental Pack',
      contactActionLabel: 'Contact Leasing Team',
      trustSignals: expect.arrayContaining([
        'Rental fit estimate available',
        'No obligation to enquire',
        '3 rental unit types available',
      ]),
    });
  });

  it('uses auction-native action panel copy for bidder readiness', () => {
    expect(getDevelopmentDetailActionPanelCopy('auction', 2, true)).toMatchObject({
      headline: 'Check bidder readiness and request auction details.',
      qualificationTitle: 'Bidder Readiness Check',
      depositLabel: 'Available deposit or cash contribution',
      primaryActionLabel: 'Check Bidder Readiness',
      brochureActionLabel: 'Download Auction Pack',
      contactActionLabel: 'Contact Auction Team',
      trustSignals: expect.arrayContaining([
        'Bidder readiness estimate available',
        'Auction interest stays obligation-free',
        '2 auction unit types available',
      ]),
    });
  });

  it('uses rental unit monthly rent instead of stale sale prices', () => {
    const context = getDevelopmentDetailPricingContext(
      {
        transactionType: 'for_rent',
        priceFrom: 1200000,
        monthlyRentFrom: 14000,
        monthlyRentTo: 18000,
      },
      [
        { basePriceFrom: 1200000, monthlyRentFrom: 12500, monthlyRentTo: 15500 },
        { basePriceFrom: 1500000, monthlyRentFrom: 10000 },
      ],
    );

    expect(context).toMatchObject({
      transactionType: 'rent',
      priceFrom: 10000,
      priceTo: 15500,
      priceLabel: 'Rent From',
      repaymentLabel: 'Monthly Rent',
      paymentAmount: 10000,
    });
  });

  it('uses auction starting bid and reserve price instead of sale prices', () => {
    const context = getDevelopmentDetailPricingContext(
      {
        transactionType: 'auction',
        priceFrom: 1500000,
        startingBidFrom: 800000,
        reservePriceFrom: 950000,
      },
      [
        { basePriceFrom: 1500000, startingBid: 850000, reservePrice: 1000000 },
        { basePriceFrom: 1600000, startingBid: 750000, reservePrice: 900000 },
      ],
    );

    expect(context).toMatchObject({
      transactionType: 'auction',
      priceFrom: 750000,
      priceTo: 1000000,
      priceLabel: 'Starting Bid',
      repaymentLabel: 'Est. Bond Repayment',
    });
  });

  it('builds rental unit card labels without bond wording', () => {
    expect(
      getDevelopmentDetailUnitPricingContext(
        { basePriceFrom: 1200000, monthlyRentFrom: 9500, monthlyRentTo: 12000 },
        'for_rent',
      ),
    ).toMatchObject({
      transactionType: 'rent',
      priceFrom: 9500,
      priceTo: 12000,
      snapshotLabel: 'Rental Snapshot',
      repaymentLabel: 'Monthly rent',
      usesBondEstimate: false,
    });
  });

  it('drops inverted sale and rental unit upper ranges on detail cards', () => {
    expect(
      getDevelopmentDetailUnitPricingContext(
        { basePriceFrom: 1500000, basePriceTo: 1200000 },
        'for_sale',
      ),
    ).toMatchObject({
      transactionType: 'sale',
      priceFrom: 1500000,
      priceTo: undefined,
    });

    expect(
      getDevelopmentDetailUnitPricingContext(
        { monthlyRentFrom: 15000, monthlyRentTo: 12500 },
        'for_rent',
      ),
    ).toMatchObject({
      transactionType: 'rent',
      priceFrom: 15000,
      priceTo: undefined,
    });
  });

  it('uses shared clamped inventory for unit availability labels', () => {
    expect(
      getDevelopmentDetailUnitAvailabilityState({
        totalUnits: 5,
        availableUnits: 9,
        reservedUnits: 4,
      }),
    ).toMatchObject({
      label: 'Only 1 left',
      primaryLabel: 'Request Callback',
    });

    expect(
      getDevelopmentDetailUnitAvailabilityState({
        totalUnits: 3,
        availableUnits: 0,
      }),
    ).toMatchObject({
      label: 'Sold out',
      primaryLabel: 'Join Waitlist',
    });
  });

  it('uses rental-native public availability and CTA labels', () => {
    expect(
      getDevelopmentDetailUnitAvailabilityState(
        {
          totalUnits: 12,
          availableUnits: 8,
        },
        'for_rent',
      ),
    ).toMatchObject({
      label: '8 rentals available',
      primaryLabel: 'Request Rental Details',
    });

    expect(
      getDevelopmentDetailUnitAvailabilityState(
        {
          totalUnits: 3,
          availableUnits: 0,
        },
        'rent',
      ),
    ).toMatchObject({
      label: 'Fully let',
      primaryLabel: 'Join Rental Waitlist',
    });
  });

  it('uses auction-native public availability and CTA labels', () => {
    expect(
      getDevelopmentDetailUnitAvailabilityState(
        {
          totalUnits: 5,
          availableUnits: 2,
        },
        'auction',
      ),
    ).toMatchObject({
      label: 'Only 2 lots open',
      primaryLabel: 'Register Auction Interest',
    });

    expect(
      getDevelopmentDetailUnitAvailabilityState(
        {
          totalUnits: 3,
          availableUnits: 0,
        },
        'on auction',
      ),
    ).toMatchObject({
      label: 'Auction closed',
      primaryLabel: 'Register Interest',
    });

    expect(
      getDevelopmentDetailUnitAvailabilityState(
        {
          totalUnits: 3,
          availableUnits: 2,
          auctionStatus: 'registration_open',
        },
        'auction',
      ),
    ).toMatchObject({
      label: 'Registration open',
      primaryLabel: 'Register Auction Interest',
    });
  });

  it('builds rental lead unit context from monthly rent fields', () => {
    expect(
      getDevelopmentDetailLeadUnitContext(
        {
          id: 'unit-rent',
          name: 'Type R',
          basePriceFrom: 1200000,
          monthlyRentFrom: 12500,
          bedrooms: 2,
          bathrooms: 1,
        },
        'for_rent',
      ),
    ).toMatchObject({
      unitId: 'unit-rent',
      unitName: 'Type R',
      unitPriceFrom: 12500,
      unitPriceLabel: 'Rent from',
      unitBedrooms: 2,
      unitBathrooms: 1,
    });
  });

  it('uses canonical unit route identity when a public unit has no database id', () => {
    expect(
      getDevelopmentDetailLeadUnitContext(
        {
          unitTypeId: 'unit-type-canonical',
          name: 'Type C',
          priceFrom: 1750000,
        },
        'sale',
      ),
    ).toMatchObject({
      unitId: 'unit-type-canonical',
      unitName: 'Type C',
      unitPriceFrom: 1750000,
    });
  });

  it('builds auction lead unit context from starting bid fields', () => {
    expect(
      getDevelopmentDetailLeadUnitContext(
        {
          id: 'unit-auction',
          name: 'Type A',
          basePriceFrom: 1200000,
          startingBid: 850000,
          reservePrice: 950000,
        },
        'auction',
      ),
    ).toMatchObject({
      unitId: 'unit-auction',
      unitName: 'Type A',
      unitPriceFrom: 850000,
      unitPriceLabel: 'Starting bid',
    });
  });

  it('uses canonical media buckets before legacy root media on public detail', () => {
    const buckets = getDevelopmentDetailMediaBuckets({
      images: ['https://example.com/legacy-photo.jpg'],
      videos: ['https://example.com/legacy-video.mp4'],
      floorPlans: ['https://example.com/legacy-floorplan.pdf'],
      brochures: ['https://example.com/legacy-brochure.pdf'],
      media: {
        photos: [{ url: 'https://example.com/canonical-photo.jpg' }],
        videos: [{ url: 'https://example.com/canonical-video.mp4' }],
        floorPlans: [{ url: 'https://example.com/canonical-floorplan.pdf' }],
        documents: [{ url: 'https://example.com/canonical-brochure.pdf' }],
      },
    });

    expect(buckets).toEqual({
      images: [{ url: 'https://example.com/canonical-photo.jpg' }],
      videos: [{ url: 'https://example.com/canonical-video.mp4' }],
      floorPlans: [{ url: 'https://example.com/canonical-floorplan.pdf' }],
      brochures: [{ url: 'https://example.com/canonical-brochure.pdf' }],
    });
  });

  it('falls back to legacy root media while detail callers migrate', () => {
    expect(
      getDevelopmentDetailMediaBuckets({
        images: JSON.stringify(['https://example.com/legacy-photo.jpg']),
        videos: ['https://example.com/legacy-video.mp4'],
        floorPlans: ['https://example.com/legacy-floorplan.pdf'],
        brochures: ['https://example.com/legacy-brochure.pdf'],
      }),
    ).toEqual({
      images: ['https://example.com/legacy-photo.jpg'],
      videos: ['https://example.com/legacy-video.mp4'],
      floorPlans: ['https://example.com/legacy-floorplan.pdf'],
      brochures: ['https://example.com/legacy-brochure.pdf'],
    });
  });
});
