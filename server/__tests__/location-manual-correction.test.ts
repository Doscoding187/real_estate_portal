import { describe, expect, it } from 'vitest';
import { calculateListingReadiness } from '../lib/readiness';
import {
  hasGeographicLocalityEvidence,
  parseOptionalCoordinatePair,
  validateListingRecordLocation,
} from '../services/listingLocationResolver';
import { isSpatialLocationAction } from '../../shared/location-contract';

const manualUrbanListing = {
  propertyType: 'house',
  provinceId: 1,
  cityId: 2,
  suburbId: 3,
  privateAddress: { streetName: 'Katherine Street' },
  latitude: null,
  longitude: null,
  locationConfirmationState: 'confirmed',
  coordinateSource: 'manual_confirmed',
  publicLocationPrecision: 'approximate',
  propertyDetails: { bedrooms: 3 },
  action: 'sell',
  pricing: { askingPrice: 2_500_000 },
  title: 'A confirmed manual location test house',
  description: 'A sufficiently long description for a readiness contract test listing.',
  media: [],
};

describe('PLE-6C manual location correction', () => {
  it('represents missing coordinates as null and still rejects 0/0', () => {
    expect(parseOptionalCoordinatePair(null, null)).toBeNull();
    expect(() => parseOptionalCoordinatePair(0, 0)).toThrow(/zero coordinate/i);
  });

  it('accepts a confirmed urban street location without coordinates', () => {
    expect(validateListingRecordLocation(manualUrbanListing)).toEqual([]);
  });

  it('rejects a suburb-only urban location without street evidence', () => {
    expect(
      validateListingRecordLocation({
        ...manualUrbanListing,
        privateAddress: null,
      }),
    ).toEqual(['Enter the street name.']);
  });

  it('does not report Map Location for a valid confirmed manual listing', () => {
    const readiness = calculateListingReadiness(manualUrbanListing);
    expect(readiness.missing.location).not.toContain('Map Location');
    expect(readiness.missing.location).toEqual([]);
  });

  it('accepts a confirmed rural reference without a conventional street', () => {
    expect(
      validateListingRecordLocation({
        ...manualUrbanListing,
        propertyType: 'farm',
        suburbId: null,
        privateAddress: { farmOrHoldingName: 'Riverside Smallholding' },
      }),
    ).toEqual([]);
  });

  it('treats provider and pin actions as the newest location evidence', () => {
    expect(isSpatialLocationAction({ coordinateSource: 'map' })).toBe(true);
    expect(isSpatialLocationAction({ coordinateSource: 'autocomplete' })).toBe(true);
    expect(isSpatialLocationAction({ providerLocationPlaceId: 'google-place' })).toBe(true);
    expect(isSpatialLocationAction({ coordinateSource: 'manual_confirmed' })).toBe(false);
  });

  it('requires explicit geographic locality evidence before creating provider localities', () => {
    expect(
      hasGeographicLocalityEvidence([
        { long_name: 'Honey Street', short_name: 'Honey St', types: ['route'] },
        { long_name: 'Berea', short_name: 'Berea', types: ['sublocality', 'sublocality_level_1'] },
      ]),
    ).toBe(true);
    expect(
      hasGeographicLocalityEvidence([
        { long_name: 'Honey Street', short_name: 'Honey St', types: ['route'] },
      ]),
    ).toBe(false);
  });
});
