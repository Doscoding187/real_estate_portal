import { describe, it, expect } from 'vitest';
import {
  buildListingSubmitPayloadFromWizardState,
  extractSellPricing,
  extractRentPricing,
  extractAuctionPricing,
} from '../listingPayload';
import type { ListingWizardState } from '@shared/listing-types';

describe('buildListingSubmitPayloadFromWizardState', () => {
  const minState: Partial<ListingWizardState> = {
    action: 'sell',
    propertyType: 'apartment',
    title: 'Modern 2-Bed Apartment',
    description: 'Spacious apartment in secure complex',
    pricing: {
      askingPrice: 1500000,
      negotiable: true,
    },
    location: {
      address: '123 Main St',
      latitude: -33.9249,
      longitude: 18.4241,
      city: 'Cape Town',
      province: 'Western Cape',
      placeId: 'ChIJ123',
      addressComponents: {},
    },
  };

  it('creates a payload with required fields', () => {
    const payload = buildListingSubmitPayloadFromWizardState(minState);
    expect(payload.action).toBe('sell');
    expect(payload.propertyType).toBe('apartment');
    expect(payload.title).toBe('Modern 2-Bed Apartment');
    expect(payload.description).toBe('Spacious apartment in secure complex');
    expect(payload.pricing).toEqual({ askingPrice: 1500000, negotiable: true });
    expect(payload.location.address).toBe('123 Main St');
    expect(payload.mediaIds).toEqual([]);
    expect(payload.mainMediaId).toBeUndefined();
    expect(payload.status).toBeUndefined();
  });

  it('merges propertyDetails and additionalInfo (basicInfo excluded)', () => {
    const state: Partial<ListingWizardState> = {
      ...minState,
      propertyDetails: { bedrooms: 2, bathrooms: 1, unitSizeM2: 80 },
      additionalInfo: { furnishing: 'fully_furnished', petsAllowed: true },
      basicInfo: { possessionStatus: 'immediate', completionDate: '2025-06-01' },
    };
    const payload = buildListingSubmitPayloadFromWizardState(state);
    expect(payload.propertyDetails).toMatchObject({
      bedrooms: 2,
      bathrooms: 1,
      unitSizeM2: 80,
      furnishing: 'fully_furnished',
      petsAllowed: true,
    });
    // basicInfo fields intentionally excluded (duplicate with top-level/location/pricing)
    expect(payload.propertyDetails).not.toHaveProperty('possessionStatus');
    expect(payload.propertyDetails).not.toHaveProperty('completionDate');
  });

  it('maps media ids into mediaIds array', () => {
    const state: Partial<ListingWizardState> = {
      ...minState,
      media: [
        { id: 'media-1', url: 'https://example.com/1.jpg', type: 'image', displayOrder: 0 },
        { id: 'media-2', url: 'https://example.com/2.jpg', type: 'image', displayOrder: 1 },
      ] as any,
    };
    const payload = buildListingSubmitPayloadFromWizardState(state);
    expect(payload.mediaIds).toEqual(['media-1', 'media-2']);
  });

  it('sets mainMediaId from explicit value', () => {
    const state: Partial<ListingWizardState> = {
      ...minState,
      media: [
        { id: 'media-1', url: 'https://example.com/1.jpg', type: 'image', displayOrder: 0 },
      ] as any,
      mainMediaId: 'media-1',
    };
    const payload = buildListingSubmitPayloadFromWizardState(state);
    expect(payload.mainMediaId).toBe('media-1');
  });

  it('falls back mainMediaId to first media id', () => {
    const state: Partial<ListingWizardState> = {
      ...minState,
      media: [
        { id: 'media-1', url: 'https://example.com/1.jpg', type: 'image', displayOrder: 0 },
      ] as any,
    };
    const payload = buildListingSubmitPayloadFromWizardState(state);
    expect(payload.mainMediaId).toBe('media-1');
  });

  it('falls through empty string mainMediaId to first media id (V1 compat)', () => {
    const state: Partial<ListingWizardState> = {
      ...minState,
      media: [
        { id: 'media-1', url: 'https://example.com/1.jpg', type: 'image', displayOrder: 0 },
      ] as any,
      mainMediaId: '',
    };
    const payload = buildListingSubmitPayloadFromWizardState(state);
    expect(payload.mainMediaId).toBe('media-1');
  });

  it('provides empty defaults for missing fields', () => {
    const payload = buildListingSubmitPayloadFromWizardState({
      action: 'sell',
      propertyType: 'house',
      pricing: {},
      location: {} as any,
    });
    expect(payload.title).toBe('');
    expect(payload.description).toBe('');
    expect(payload.mediaIds).toEqual([]);
    expect(payload.mainMediaId).toBeUndefined();
    expect(payload.propertyDetails).toEqual({});
  });

  it('handles rent action pricing', () => {
    const state: Partial<ListingWizardState> = {
      ...minState,
      action: 'rent',
      pricing: {
        monthlyRent: 15000,
        deposit: 30000,
        leaseTerms: '12 months',
        availableFrom: '2025-07-01',
        utilitiesIncluded: ['water', 'electricity'],
      },
    };
    const payload = buildListingSubmitPayloadFromWizardState(state);
    expect(payload.action).toBe('rent');
    expect(payload.pricing).toMatchObject({
      monthlyRent: 15000,
      deposit: 30000,
      leaseTerms: '12 months',
    });
  });

  it('handles auction action pricing', () => {
    const state: Partial<ListingWizardState> = {
      ...minState,
      action: 'auction',
      pricing: {
        startingBid: 1000000,
        reservePrice: 1500000,
        auctionDateTime: '2025-08-15T10:00:00Z',
      },
    };
    const payload = buildListingSubmitPayloadFromWizardState(state);
    expect(payload.action).toBe('auction');
    expect(payload.pricing).toMatchObject({
      startingBid: 1000000,
      reservePrice: 1500000,
    });
  });

  it('preserves location fields including placeId and addressComponents', () => {
    const state: Partial<ListingWizardState> = {
      ...minState,
    };
    const payload = buildListingSubmitPayloadFromWizardState(state);
    expect(payload.location.placeId).toBe('ChIJ123');
    expect(payload.location.addressComponents).toEqual({});
  });

  it('filters out undefined media ids', () => {
    const state: Partial<ListingWizardState> = {
      ...minState,
      media: [
        { id: 'media-1' },
        { id: undefined },
        { id: 'media-3' },
      ] as any,
    };
    const payload = buildListingSubmitPayloadFromWizardState(state);
    expect(payload.mediaIds).toEqual(['media-1', 'media-3']);
  });

  it('does not mutate the original state', () => {
    const original = { ...minState };
    const frozen = JSON.parse(JSON.stringify(original));
    buildListingSubmitPayloadFromWizardState(original);
    expect(original).toEqual(frozen);
  });
});

describe('extractSellPricing', () => {
  it('returns sell-specific fields', () => {
    const result = extractSellPricing({ askingPrice: 2000000, negotiable: false, transferCostEstimate: 50000 });
    expect(result).toEqual({ askingPrice: 2000000, negotiable: false, transferCostEstimate: 50000 });
  });

  it('returns empty object for undefined', () => {
    expect(extractSellPricing(undefined)).toEqual({});
  });
});

describe('extractRentPricing', () => {
  it('returns rent-specific fields', () => {
    const result = extractRentPricing({
      monthlyRent: 12000,
      deposit: 24000,
      leaseTerms: '6 months',
      availableFrom: '2025-06-01',
      utilitiesIncluded: ['water'],
    });
    expect(result).toEqual({
      monthlyRent: 12000,
      deposit: 24000,
      leaseTerms: '6 months',
      availableFrom: '2025-06-01',
      utilitiesIncluded: ['water'],
    });
  });

  it('returns empty object for undefined', () => {
    expect(extractRentPricing(undefined)).toEqual({});
  });
});

describe('extractAuctionPricing', () => {
  it('returns auction-specific fields', () => {
    const result = extractAuctionPricing({
      startingBid: 500000,
      reservePrice: 750000,
      auctionDateTime: '2025-09-01T14:00:00Z',
      auctionTermsDocumentUrl: 'https://example.com/terms.pdf',
    });
    expect(result).toEqual({
      startingBid: 500000,
      reservePrice: 750000,
      auctionDateTime: '2025-09-01T14:00:00Z',
      auctionTermsDocumentUrl: 'https://example.com/terms.pdf',
    });
  });

  it('returns empty object for undefined', () => {
    expect(extractAuctionPricing(undefined)).toEqual({});
  });
});
