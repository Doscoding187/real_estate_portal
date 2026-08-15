import { describe, expect, it } from 'vitest';
import { calculateListingReadiness } from '../lib/readiness';
import {
  buildListingLocationPersistence,
  buildUnresolvedDraftLocation,
  formatCompatibilityAddress,
  hasGeographicLocalityEvidence,
  parseOptionalCoordinatePair,
  prepareListingLocationUpdate,
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
    expect(() => parseOptionalCoordinatePair(-26.1, null)).toThrow(/both map coordinates/i);
    expect(() => parseOptionalCoordinatePair(Number.NaN, 28.0)).toThrow(
      /expected number|valid property map/i,
    );
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

  it('derives compatibility address state from structured private address', () => {
    const draft = buildUnresolvedDraftLocation({
      address: '999 Wrong Road',
      city: ' Johannesburg ',
      province: ' Gauteng ',
      postalCode: '2001',
      privateAddress: {
        streetNumber: '10',
        streetName: 'Alice Lane',
        complexOrEstateName: 'The Towers',
        unitNumber: '4B',
        postalCode: '2001',
      },
      latitude: null,
      longitude: null,
    });
    const persisted = buildListingLocationPersistence({
      ...draft,
      address: '999 Wrong Road',
      postalCode: '9999',
    });

    expect(formatCompatibilityAddress(draft.privateAddress)).toBe('10 Alice Lane, The Towers');
    expect(persisted).toMatchObject({
      address: '10 Alice Lane, The Towers',
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
      latitude: null,
      longitude: null,
    });
    expect(persisted.address).not.toContain('999 Wrong Road');
  });

  it('invalidates stale coordinate evidence after a confirmed location changes', () => {
    const current = {
      provinceId: 1,
      cityId: 2,
      suburbId: 3,
      province: 'Gauteng',
      city: 'Johannesburg',
      suburb: 'Sandton',
      privateAddress: { streetNumber: '10', streetName: 'Old Road' },
      address: '10 Old Road',
      latitude: '-26.1076000',
      longitude: '28.0567000',
      locationConfirmationState: 'confirmed',
    };
    const next = buildUnresolvedDraftLocation({
      address: '20 New Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      provinceId: 1,
      cityId: 2,
      suburbId: 3,
      privateAddress: { streetNumber: '20', streetName: 'New Road' },
      latitude: -26.1076,
      longitude: 28.0567,
      coordinateSource: 'map',
      locationConfirmationState: 'needs_confirmation',
    });

    const prepared = prepareListingLocationUpdate(current, next, false);

    expect(prepared.requiresReconfirmation).toBe(true);
    expect(prepared.location.latitude).toBeNull();
    expect(prepared.location.longitude).toBeNull();
    expect(prepared.location.coordinateSource).toBeNull();
    expect(prepared.location.locationConfirmationState).toBe('needs_confirmation');
  });

  it('preserves deliberately reconfirmed replacement coordinates', () => {
    const current = {
      provinceId: 1,
      cityId: 2,
      suburbId: 3,
      province: 'Gauteng',
      city: 'Johannesburg',
      suburb: 'Sandton',
      privateAddress: { streetNumber: '10', streetName: 'Old Road' },
      latitude: '-26.1076000',
      longitude: '28.0567000',
      locationConfirmationState: 'confirmed',
    };
    const next = buildUnresolvedDraftLocation({
      address: '20 New Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      provinceId: 1,
      cityId: 2,
      suburbId: 3,
      privateAddress: { streetNumber: '20', streetName: 'New Road' },
      latitude: -26.108,
      longitude: 28.057,
      coordinateSource: 'map',
      locationConfirmationState: 'confirmed',
    });

    const prepared = prepareListingLocationUpdate(current, next, true);

    expect(prepared.requiresReconfirmation).toBe(false);
    expect(prepared.location.latitude).toBe(-26.108);
    expect(prepared.location.longitude).toBe(28.057);
    expect(prepared.location.coordinateSource).toBe('map');
    expect(prepared.location.locationConfirmationState).toBe('confirmed');
  });
});
