import { describe, expect, it } from 'vitest';
import {
  buildListingLocationAuthoringPayload,
  listingLocationSchema,
  locationProviderMappingSchema,
  privateAddressSchema,
} from '../../shared/location-contract';

const baseLocation = {
  version: 1 as const,
  discovery: { provinceId: 1, cityId: 2, suburbId: 3 },
  privateAddress: { streetNumber: '10', streetName: 'Alice Lane' },
  coordinates: { latitude: -26.1076, longitude: 28.0567 },
  coordinateSource: 'autocomplete' as const,
  locationConfirmationState: 'confirmed' as const,
  publicLocationPrecision: 'approximate' as const,
  providerPlaceId: 'google-place-id',
};

describe('PLE-6B location contract', () => {
  it('keeps private address fields bounded and rejects arbitrary payload keys', () => {
    expect(privateAddressSchema.safeParse(baseLocation.privateAddress).success).toBe(true);
    expect(
      privateAddressSchema.safeParse({ ...baseLocation.privateAddress, arbitrary: 'value' })
        .success,
    ).toBe(false);
  });

  it('requires confirmed locations to carry non-zero coordinates and source evidence', () => {
    expect(listingLocationSchema.safeParse(baseLocation).success).toBe(true);
    expect(
      listingLocationSchema.safeParse({
        ...baseLocation,
        coordinates: { latitude: 0, longitude: 0 },
      }).success,
    ).toBe(false);
    expect(listingLocationSchema.safeParse({ ...baseLocation, coordinates: null }).success).toBe(
      false,
    );
  });

  it('requires provider evidence to target exactly one canonical geography level', () => {
    expect(
      locationProviderMappingSchema.safeParse({
        provider: 'google',
        providerPlaceId: 'abc',
        providerLabel: 'Sandton',
        normalizedAlias: 'sandton',
        provinceId: null,
        cityId: null,
        suburbId: 3,
      }).success,
    ).toBe(true);

    expect(
      locationProviderMappingSchema.safeParse({
        provider: 'google',
        providerPlaceId: 'abc',
        providerLabel: 'Sandton',
        normalizedAlias: 'sandton',
        provinceId: 1,
        cityId: 2,
        suburbId: null,
      }).success,
    ).toBe(false);
  });

  it('preserves an unconfirmed draft without turning missing location truth into a fake zero', () => {
    const draft = listingLocationSchema.safeParse({
      ...baseLocation,
      coordinates: { latitude: -26.1, longitude: 28.0 },
      coordinateSource: null,
      locationConfirmationState: 'needs_confirmation',
    });
    expect(draft.success).toBe(true);

    expect(
      listingLocationSchema.safeParse({
        ...baseLocation,
        coordinates: null,
        coordinateSource: null,
        locationConfirmationState: 'needs_confirmation',
      }).success,
    ).toBe(true);
  });

  it('allow-lists browser location payload keys', () => {
    const payload = buildListingLocationAuthoringPayload({
      ...baseLocation,
      address: '10 Alice Lane',
      latitude: -26.1076,
      longitude: 28.0567,
      city: 'Johannesburg',
      province: 'Gauteng',
      unexpectedUiState: 'must not cross the boundary',
    } as any);

    expect(payload).toMatchObject({
      address: '10 Alice Lane',
      city: 'Johannesburg',
      province: 'Gauteng',
    });
    expect(payload).not.toHaveProperty('unexpectedUiState');
  });
});
