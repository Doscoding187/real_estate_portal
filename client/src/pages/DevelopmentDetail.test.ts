import { describe, expect, it } from 'vitest';

import {
  buildDevelopmentDetailAmenityGroups,
  formatDevelopmentDetailLabel,
  getDevelopmentDetailActionPanelCopy,
  getDevelopmentDetailCommercialPack,
  getDevelopmentDetailHighlights,
  getDevelopmentDetailLeadUnitContext,
  getDevelopmentDetailMediaBuckets,
  getDevelopmentDetailPricingContext,
  getDevelopmentDetailTransactionJourney,
  getDevelopmentDetailTrustPreview,
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

  it('builds sale commercial pack copy for buyer packaging', () => {
    const pack = getDevelopmentDetailCommercialPack(
      {
        transactionType: 'for_sale',
        ownershipType: 'sectional-title',
      },
      [
        {
          basePriceFrom: 1_450_000,
          basePriceTo: 1_650_000,
          totalUnits: 8,
          availableUnits: 5,
        },
      ],
      { hasBrochure: true },
    );

    expect(pack).toMatchObject({
      eyebrow: 'Buyer Pack',
      title: 'Sales path at a glance',
      primaryActionLabel: 'Start Qualification',
      secondaryActionLabel: 'Download Brochure',
    });
    expect(pack.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Availability', value: '5 of 8 homes available' }),
        expect.objectContaining({ label: 'Ownership', value: 'Sectional Title' }),
      ]),
    );
    expect(pack.proofItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Price package',
          value: expect.stringContaining('sales range published'),
          isReady: true,
        }),
        expect.objectContaining({
          label: 'Buyer next step',
          value: 'Qualification and sales-team lead context ready',
          isReady: true,
        }),
      ]),
    );
  });

  it('builds rental commercial pack copy for lease packaging', () => {
    const pack = getDevelopmentDetailCommercialPack(
      { transactionType: 'for_rent' },
      [
        {
          monthlyRentFrom: 12_500,
          monthlyRentTo: 14_500,
          depositRequired: 25_000,
          leaseTerm: '12 months',
          isFurnished: true,
          totalUnits: 6,
          availableUnits: 2,
        },
      ],
      { hasBrochure: false },
    );

    expect(pack).toMatchObject({
      eyebrow: 'Rental Pack',
      title: 'Lease path at a glance',
      primaryActionLabel: 'Check Rental Fit',
      secondaryActionLabel: 'Request Rental Pack',
    });
    expect(pack.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Rent', value: expect.stringContaining('Rent From') }),
        expect.objectContaining({ label: 'Availability', value: '2 of 6 rentals available' }),
        expect.objectContaining({
          label: 'Lease signals',
          value: expect.stringContaining('furnished options'),
        }),
      ]),
    );
    expect(pack.proofItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Monthly rent package',
          value: expect.stringContaining('monthly range published'),
          isReady: true,
        }),
        expect.objectContaining({
          label: 'Lease terms packaged',
          value: '12 months',
          isReady: true,
        }),
        expect.objectContaining({
          label: 'Renter next step',
          value: 'Rental fit and leasing-team lead context ready',
          isReady: true,
        }),
      ]),
    );
  });

  it('builds rental transaction journey copy for lease follow-up', () => {
    const journey = getDevelopmentDetailTransactionJourney(
      { transactionType: 'for_rent' },
      [
        {
          monthlyRentFrom: 12_500,
          monthlyRentTo: 14_500,
          depositRequired: 25_000,
          leaseTerm: '12 months',
          totalUnits: 6,
          availableUnits: 4,
        },
      ],
      { hasBrochure: true },
    );

    expect(journey).toMatchObject({
      eyebrow: 'Rental journey',
      title: 'From rental fit to lease follow-up',
    });
    expect(journey.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Review lease package',
          detail: expect.stringContaining('4 rental homes currently available'),
        }),
        expect.objectContaining({
          label: 'Check rental fit',
          detail: expect.stringContaining('Estimate monthly rent fit'),
        }),
        expect.objectContaining({
          label: 'Leasing team follow-up',
          detail: expect.stringContaining('application documents'),
        }),
      ]),
    );
  });

  it('builds rental trust preview copy for lease documents and costs', () => {
    const preview = getDevelopmentDetailTrustPreview(
      {
        transactionType: 'for_rent',
        monthlyLevyFrom: 1_100,
        ratesFrom: 850,
      },
      [{ monthlyRentFrom: 12_500 }],
      { hasBrochure: true, isVerified: true },
    );

    expect(preview).toMatchObject({
      eyebrow: 'Rental trust preview',
      title: 'Lease documents and cost context',
    });
    expect(preview.items.find(item => item.label === 'Rental pack')).toMatchObject({
      value: 'Rental pack available before enquiry',
      isReady: true,
    });
    expect(preview.items.find(item => item.label === 'Lease cost context')).toMatchObject({
      isReady: true,
    });
    expect(preview.items.find(item => item.label === 'Lease cost context')?.value).toMatch(
      /levies from R\s*1\s*100/,
    );
    expect(preview.items.find(item => item.label === 'Leasing review')).toMatchObject({
      isReady: true,
    });
    expect(preview.items.find(item => item.label === 'Leasing review')?.value).toContain(
      'Proof of income',
    );
  });

  it('builds auction commercial pack copy for bidder packaging', () => {
    const pack = getDevelopmentDetailCommercialPack(
      { transactionType: 'auction' },
      [
        {
          startingBid: 850_000,
          reservePrice: 950_000,
          auctionStatus: 'registration_open',
          auctionStartDate: '2030-02-01T09:00:00.000Z',
          auctionEndDate: '2030-02-08T17:00:00.000Z',
          totalUnits: 1,
          availableUnits: 1,
        },
      ],
      { hasBrochure: true },
    );

    expect(pack).toMatchObject({
      eyebrow: 'Auction Pack',
      title: 'Bidder path at a glance',
      primaryActionLabel: 'Check Bidder Readiness',
      secondaryActionLabel: 'Download Auction Pack',
    });
    expect(pack.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Bid guidance',
          value: expect.stringContaining('Starting Bid'),
        }),
        expect.objectContaining({
          label: 'Auction status',
          value: expect.stringContaining('Registration Open'),
        }),
        expect.objectContaining({ label: 'Lots', value: '1 of 1 lots open' }),
      ]),
    );
    expect(pack.proofItems).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Auction window',
          value: expect.stringContaining('1 Feb 2030'),
          isReady: true,
        }),
        expect.objectContaining({
          label: 'Registration lifecycle',
          value: 'Registration Open',
          isReady: true,
        }),
        expect.objectContaining({
          label: 'Legal pack',
          value: 'Auction documents available',
          isReady: true,
        }),
      ]),
    );
  });

  it('builds auction transaction journey copy for bidder registration', () => {
    const journey = getDevelopmentDetailTransactionJourney(
      { transactionType: 'auction' },
      [
        {
          startingBid: 850_000,
          reservePrice: 950_000,
          auctionStartDate: '2030-02-01T09:00:00.000Z',
          auctionEndDate: '2030-02-08T17:00:00.000Z',
          auctionStatus: 'registration_open',
          totalUnits: 2,
          availableUnits: 1,
        },
      ],
      { hasBrochure: true },
    );

    expect(journey).toMatchObject({
      eyebrow: 'Auction journey',
      title: 'From bidder readiness to auction registration',
    });
    expect(journey.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Review bid package',
          detail: expect.stringContaining('1 Feb 2030'),
        }),
        expect.objectContaining({
          label: 'Check bidder readiness',
          detail: expect.stringContaining('Estimate bidding capacity'),
        }),
        expect.objectContaining({
          label: 'Auction team follow-up',
          detail: expect.stringContaining('registration open'),
        }),
      ]),
    );
  });

  it('builds auction trust preview copy for legal pack and bidder review', () => {
    const preview = getDevelopmentDetailTrustPreview(
      {
        transactionType: 'auction',
        monthlyLevyFrom: 1_350,
        ratesFrom: 900,
      },
      [{ startingBid: 850_000 }],
      { hasBrochure: true, isVerified: true },
    );

    expect(preview).toMatchObject({
      eyebrow: 'Auction trust preview',
      title: 'Bidder documents and auction rules',
    });
    expect(preview.items.find(item => item.label === 'Legal pack')).toMatchObject({
      value: 'Auction legal pack available before enquiry',
      isReady: true,
    });
    expect(preview.items.find(item => item.label === 'Cost context')).toMatchObject({
      isReady: true,
    });
    expect(preview.items.find(item => item.label === 'Cost context')?.value).toMatch(
      /rates from R\s*900/,
    );
    expect(preview.items.find(item => item.label === 'Bidder review')).toMatchObject({
      isReady: true,
    });
    expect(preview.items.find(item => item.label === 'Bidder review')?.value).toContain(
      'proof of funds',
    );
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
