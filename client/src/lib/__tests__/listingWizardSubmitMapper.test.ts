import { describe, expect, it } from 'vitest';
import {
  buildListingWizardSubmitPayload,
  type ListingWizardSubmitState,
  type ListingWizardSubmitPayload,
} from '@/lib/listingWizardSubmitMapper';

const baseState: ListingWizardSubmitState = {
  action: 'sell',
  propertyType: 'house',
  title: 'Modern family home in a secure estate',
  description:
    'A detailed listing description that is long enough for the listing submission contract.',
  pricing: {
    askingPrice: 3250000,
    negotiable: true,
    transferCostEstimate: 125000,
  },
  propertyDetails: {
    bedrooms: 4,
    bathrooms: 2.5,
    houseAreaM2: 240,
    erfSizeM2: 600,
    parkingCount: 2,
  },
  additionalInfo: {
    flooring: 'wood',
    securityFeatures: ['electric_fence'],
    outdoorFeatures: ['garden'],
  },
  location: {
    address: '1 Main Road',
    latitude: -26.1076,
    longitude: 28.0567,
    city: 'Johannesburg',
    suburb: 'Sandton',
    province: 'Gauteng',
    postalCode: '2196',
    placeId: 'place-123',
  },
  media: [
    {
      id: 'uploads/listing/front.jpg',
      url: 'uploads/listing/front.jpg',
      type: 'image',
      displayOrder: 0,
      isPrimary: false,
    },
    {
      id: 'uploads/listing/kitchen.jpg',
      url: 'uploads/listing/kitchen.jpg',
      type: 'image',
      displayOrder: 1,
      isPrimary: true,
    },
  ],
  mainMediaId: 'uploads/listing/kitchen.jpg',
};

const clone = <T>(value: T): T => structuredClone(value);

type FullWizardSubmitState = ListingWizardSubmitState & {
  basicInfo?: Record<string, unknown>;
};

const buildPreviousInlinePayload = (state: ListingWizardSubmitState) => {
  const pricing = {
    ...state.pricing!,
    ...('transferCostEstimate' in state.pricing!
      ? state.pricing!.transferCostEstimate !== null &&
        state.pricing!.transferCostEstimate !== undefined &&
        !Number.isNaN(Number(state.pricing!.transferCostEstimate))
        ? { transferCostEstimate: Number(state.pricing!.transferCostEstimate) }
        : {}
      : {}),
  };

  const propertyDetails = {
    ...((state.propertyDetails || {}) as Record<string, unknown>),
    ...((state.additionalInfo || {}) as Record<string, unknown>),
  };

  const levies = pricing.levies ?? propertyDetails.leviesHoaOperatingCosts;
  if (propertyDetails.levies === undefined && levies !== undefined) propertyDetails.levies = levies;
  if (propertyDetails.leviesHoaOperatingCosts === undefined && levies !== undefined) {
    propertyDetails.leviesHoaOperatingCosts = levies;
  }

  const rates = pricing.ratesAndTaxes ?? propertyDetails.ratesAndTaxes ?? propertyDetails.ratesTaxes;
  if (propertyDetails.ratesAndTaxes === undefined && rates !== undefined) {
    propertyDetails.ratesAndTaxes = rates;
  }
  if (propertyDetails.ratesTaxes === undefined && rates !== undefined) propertyDetails.ratesTaxes = rates;

  const parking = propertyDetails.parkingCount ?? propertyDetails.parkingBays;
  if (propertyDetails.parkingCount === undefined && parking !== undefined) {
    propertyDetails.parkingCount = parking;
  }
  if (propertyDetails.parkingBays === undefined && parking !== undefined) {
    propertyDetails.parkingBays = parking;
  }

  const security = propertyDetails.security ?? propertyDetails.securityLevel;
  if (propertyDetails.security === undefined && security !== undefined) propertyDetails.security = security;
  if (propertyDetails.securityLevel === undefined && security !== undefined) {
    propertyDetails.securityLevel = security;
  }

  const flooring = propertyDetails.flooring ?? propertyDetails.flooringType;
  if (propertyDetails.flooring === undefined && flooring !== undefined) propertyDetails.flooring = flooring;
  if (propertyDetails.flooringType === undefined && flooring !== undefined) {
    propertyDetails.flooringType = flooring;
  }

  if (
    propertyDetails.prepaidElectricity === undefined &&
    String(propertyDetails.electricitySupply || '').toLowerCase() === 'prepaid'
  ) {
    propertyDetails.prepaidElectricity = true;
  }

  if (
    propertyDetails.fibreReady === undefined &&
    String(propertyDetails.internetAccess || '').toLowerCase() === 'fibre'
  ) {
    propertyDetails.fibreReady = true;
  }

  return {
    action: state.action!,
    propertyType: state.propertyType!,
    title: state.title,
    description: state.description,
    pricing,
    propertyDetails,
    location: state.location!,
    mediaIds: state.media.map(media => media.id?.toString() || ''),
    mainMediaId:
      state.mainMediaId?.toString() ||
      (state.media.length > 0 ? state.media[0].id?.toString() : undefined),
  };
};

describe('buildListingWizardSubmitPayload', () => {
  it('preserves required top-level submission fields and media references', () => {
    const payload: ListingWizardSubmitPayload = buildListingWizardSubmitPayload(baseState);

    expect(payload).toMatchObject({
      action: 'sell',
      propertyType: 'house',
      title: baseState.title,
      description: baseState.description,
      pricing: {
        askingPrice: 3250000,
        negotiable: true,
        transferCostEstimate: 125000,
      },
      location: baseState.location,
      mediaIds: ['uploads/listing/front.jpg', 'uploads/listing/kitchen.jpg'],
      mainMediaId: 'uploads/listing/kitchen.jpg',
    });
  });

  it('maps supported propertyDetails and additionalInfo into submitted details', () => {
    const payload = buildListingWizardSubmitPayload(baseState);

    expect(payload.propertyDetails).toMatchObject({
      bedrooms: 4,
      bathrooms: 2.5,
      houseAreaM2: 240,
      erfSizeM2: 600,
      flooring: 'wood',
      flooringType: 'wood',
      securityFeatures: ['electric_fence'],
      outdoorFeatures: ['garden'],
    });
  });

  it('does not silently erase sibling property detail fields when normalizing aliases', () => {
    const payload = buildListingWizardSubmitPayload({
      ...baseState,
      pricing: {
        askingPrice: 3250000,
        negotiable: false,
        levies: 1800,
        ratesAndTaxes: 2100,
      } as any,
      propertyDetails: {
        bedrooms: 3,
        bathrooms: 2,
        parkingCount: 2,
        electricitySupply: 'prepaid',
        internetAccess: 'fibre',
      } as any,
    });

    expect(payload.propertyDetails).toMatchObject({
      bedrooms: 3,
      bathrooms: 2,
      parkingCount: 2,
      parkingBays: 2,
      levies: 1800,
      leviesHoaOperatingCosts: 1800,
      ratesAndTaxes: 2100,
      ratesTaxes: 2100,
      prepaidElectricity: true,
      fibreReady: true,
    });
  });

  it('handles missing optional sections without throwing', () => {
    const payload = buildListingWizardSubmitPayload({
      ...baseState,
      pricing: undefined,
      propertyDetails: undefined,
      additionalInfo: undefined,
      media: [],
      mainMediaId: undefined,
    });

    expect(payload.pricing).toEqual({});
    expect(payload.propertyDetails).toEqual({});
    expect(payload.mediaIds).toEqual([]);
    expect(payload.mainMediaId).toBeUndefined();
  });

  it('preserves sale, rental, and auction pricing behavior accepted by the active mutation contract', () => {
    const salePayload: ListingWizardSubmitPayload = buildListingWizardSubmitPayload({
      ...baseState,
      action: 'sell',
      pricing: {
        askingPrice: 4000000,
        negotiable: false,
        transferCostEstimate: null,
      },
    });
    expect(salePayload.pricing).toEqual({
      askingPrice: 4000000,
      negotiable: false,
      transferCostEstimate: null,
    });

    const availableFrom = new Date('2026-08-01T00:00:00.000Z');
    const rentPayload: ListingWizardSubmitPayload = buildListingWizardSubmitPayload({
      ...baseState,
      action: 'rent',
      pricing: {
        monthlyRent: 18500,
        deposit: 37000,
        leaseTerms: '12 months',
        availableFrom,
        utilitiesIncluded: false,
      },
    });
    expect(rentPayload.pricing).toEqual({
      monthlyRent: 18500,
      deposit: 37000,
      leaseTerms: '12 months',
      availableFrom,
      utilitiesIncluded: false,
    });

    const auctionDateTime = new Date('2026-09-10T10:00:00.000Z');
    const auctionPayload: ListingWizardSubmitPayload = buildListingWizardSubmitPayload({
      ...baseState,
      action: 'auction',
      pricing: {
        startingBid: 2500000,
        reservePrice: 3100000,
        auctionDateTime,
        auctionTermsDocumentUrl: 'https://example.test/auction-terms.pdf',
      },
    });
    expect(auctionPayload.pricing).toEqual({
      startingBid: 2500000,
      reservePrice: 3100000,
      auctionDateTime,
      auctionTermsDocumentUrl: 'https://example.test/auction-terms.pdf',
    });
  });

  it('does not mutate source wizard state objects', () => {
    const state = clone(baseState);
    const original = clone(state);

    buildListingWizardSubmitPayload(state);

    expect(state).toEqual(original);
  });

  it('matches the previous inline submit behavior for a representative listing state', () => {
    const state = {
      ...baseState,
      pricing: {
        askingPrice: 3250000,
        negotiable: true,
        levies: 1600,
        ratesAndTaxes: 1900,
      } as any,
    };

    expect(buildListingWizardSubmitPayload(state)).toEqual(buildPreviousInlinePayload(state));
  });

  it('does not leak wizard-only basicInfo fields into submitted propertyDetails', () => {
    const state: FullWizardSubmitState = {
      ...baseState,
      basicInfo: {
        title: 'Duplicate title field',
        province: 'Duplicate province field',
        selectedDeveloperId: 12,
        selectedDevelopmentId: 34,
        occupancyDate: '2026-09-01',
      },
    };

    const payload = buildListingWizardSubmitPayload(state);

    expect(payload.propertyDetails).not.toHaveProperty('title');
    expect(payload.propertyDetails).not.toHaveProperty('province');
    expect(payload.propertyDetails).not.toHaveProperty('selectedDeveloperId');
    expect(payload.propertyDetails).not.toHaveProperty('selectedDevelopmentId');
    expect(payload.propertyDetails).not.toHaveProperty('occupancyDate');
  });

  it('matches the previous inline submit behavior even when basicInfo is populated', () => {
    const state: FullWizardSubmitState = {
      ...baseState,
      basicInfo: {
        title: 'Duplicate title field',
        province: 'Duplicate province field',
        selectedDeveloperId: 12,
        selectedDevelopmentId: 34,
        occupancyDate: '2026-09-01',
      },
    };

    expect(buildListingWizardSubmitPayload(state)).toEqual(buildPreviousInlinePayload(state));
  });
});
