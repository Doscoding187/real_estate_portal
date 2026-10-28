import { describe, expect, it } from 'vitest';
import {
  buildCanonicalListingLocationPayload,
  canonicalListingLocationSchema,
} from '../../shared/canonicalListingLocation';
import { normalizeCoordinatePair, privateAddressSchema } from '../../shared/location-contract';

const placeId = 'pl-place-01-000000000000000000000001';

const baseLocation = {
  version: 2 as const,
  canonicalPlaceId: placeId,
  privateAddress: { streetNumber: '10', streetName: 'Alice Lane' },
  coordinates: { latitude: -26.1076, longitude: 28.0567 },
  coordinateSource: 'autocomplete' as const,
  locationConfirmationState: 'confirmed' as const,
  publicLocationPrecision: 'approximate' as const,
  providerObservation: { provider: 'google' as const, providerPlaceId: 'google-place-id' },
};

describe('canonical listing location contract', () => {
  it('keeps private address evidence bounded and rejects arbitrary fields', () => {
    expect(privateAddressSchema.safeParse(baseLocation.privateAddress).success).toBe(true);
    expect(
      privateAddressSchema.safeParse({ ...baseLocation.privateAddress, arbitrary: 'value' })
        .success,
    ).toBe(false);
  });

  it('requires an exact Place identity for confirmed locations and rejects zero coordinates', () => {
    expect(canonicalListingLocationSchema.safeParse(baseLocation).success).toBe(true);
    expect(
      canonicalListingLocationSchema.safeParse({ ...baseLocation, canonicalPlaceId: null }).success,
    ).toBe(false);
    expect(
      canonicalListingLocationSchema.safeParse({
        ...baseLocation,
        coordinates: { latitude: 0, longitude: 0 },
      }).success,
    ).toBe(false);
  });

  it('allows manual street evidence without coordinates and preserves unconfirmed drafts', () => {
    expect(
      canonicalListingLocationSchema.safeParse({
        ...baseLocation,
        coordinates: null,
        coordinateSource: 'manual_confirmed',
      }).success,
    ).toBe(true);
    expect(
      canonicalListingLocationSchema.safeParse({
        ...baseLocation,
        coordinates: null,
        coordinateSource: null,
        locationConfirmationState: 'needs_confirmation',
      }).success,
    ).toBe(true);
  });

  it('allow-lists wizard evidence and never turns labels or numeric handles into identity', () => {
    const payload = buildCanonicalListingLocationPayload({
      address: '10 Alice Lane',
      latitude: null,
      longitude: null,
      city: 'Johannesburg',
      province: 'Gauteng',
      provinceId: 1,
      cityId: 2,
      suburbId: 3,
      unexpectedUiState: 'must not cross the boundary',
    } as any);
    expect(payload).toMatchObject({ version: 2, canonicalPlaceId: null, coordinates: null });
    for (const key of [
      'unexpectedUiState',
      'address',
      'city',
      'province',
      'provinceId',
      'cityId',
      'suburbId',
    ]) {
      expect(payload).not.toHaveProperty(key);
    }
  });

  it('normalizes only complete valid public coordinate pairs', () => {
    expect(normalizeCoordinatePair('-26.1076000', '28.0567000')).toEqual({
      latitude: -26.1076,
      longitude: 28.0567,
    });
    expect(normalizeCoordinatePair(null, null)).toBeNull();
    expect(normalizeCoordinatePair(-26.1076, null)).toBeNull();
    expect(normalizeCoordinatePair(0, 0)).toBeNull();
    expect(normalizeCoordinatePair(Number.NaN, 28.0567)).toBeNull();
    expect(normalizeCoordinatePair(-91, 28.0567)).toBeNull();
  });
});
