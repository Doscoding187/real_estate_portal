import { describe, expect, it } from 'vitest';
import {
  commercialAssets,
  commercialAvailabilities,
  commercialAvailabilityEconomics,
  commercialAvailabilityListingLinks,
  commercialSpaceSpecifications,
  commercialSpaces,
} from '../../../drizzle/schema';
import {
  assertCommercialAvailabilityFreshness,
  assertCommercialEconomicsInput,
  deriveCommercialMonthlyOccupancyCost,
} from '../../../shared/commercial-domain';

describe('Commercial canonical authority', () => {
  it('keeps asset, space, availability, economics, specifications and marketing links separate', () => {
    expect(commercialAssets[Symbol.for('drizzle:Name')]).toBe('commercial_assets');
    expect(commercialSpaces[Symbol.for('drizzle:Name')]).toBe('commercial_spaces');
    expect(commercialSpaceSpecifications[Symbol.for('drizzle:Name')]).toBe(
      'commercial_space_specifications',
    );
    expect(commercialAvailabilities[Symbol.for('drizzle:Name')]).toBe('commercial_availabilities');
    expect(commercialAvailabilityEconomics[Symbol.for('drizzle:Name')]).toBe(
      'commercial_availability_economics',
    );
    expect(commercialAvailabilityListingLinks[Symbol.for('drizzle:Name')]).toBe(
      'commercial_availability_listing_links',
    );
    expect(commercialAssets).not.toHaveProperty('listingId');
    expect(commercialSpaces).toHaveProperty('commercialAssetId');
    expect(commercialSpaces).not.toHaveProperty('listingId');
    expect(commercialAvailabilities).toHaveProperty('commercialSpaceId');
    expect(commercialAvailabilities).not.toHaveProperty('listingId');
    expect(commercialAvailabilityEconomics).toHaveProperty('commercialAvailabilityId');
    expect(commercialAvailabilityEconomics).not.toHaveProperty('totalMonthlyOccupancyCost');
    expect(commercialAvailabilityListingLinks).toHaveProperty('commercialAvailabilityId');
    expect(commercialAvailabilityListingLinks).toHaveProperty('listingId');
  });

  it('derives an occupancy range without turning unknown costs into zero', () => {
    const result = deriveCommercialMonthlyOccupancyCost({
      rentableAreaM2: 400,
      parkingBays: 10,
      economics: [
        { componentCode: 'base_rent', valueState: 'supplied', chargeBasis: 'per_m2_month', amountMinor: 14_500, rangeMaximumMinor: null },
        { componentCode: 'parking', valueState: 'supplied', chargeBasis: 'per_bay_month', amountMinor: 850_000, rangeMaximumMinor: null },
        { componentCode: 'utilities', valueState: 'estimated', chargeBasis: 'fixed_monthly', amountMinor: 300_000, rangeMaximumMinor: 480_000 },
        { componentCode: 'security_service', valueState: 'unknown', chargeBasis: null, amountMinor: null, rangeMaximumMinor: null },
      ],
    });

    expect(result.monthlyMinimumMinor).toBe(14_600_000);
    expect(result.monthlyMaximumMinor).toBe(14_780_000);
    expect(result.unknownComponentCodes).toEqual(['security_service']);
    expect(result.components.every(component => component.valueState === 'calculated')).toBe(true);
  });

  it('rejects economics that would turn unknowns into hidden authoritative amounts', () => {
    expect(() =>
      assertCommercialEconomicsInput({
        componentCode: 'utilities',
        valueState: 'unknown',
        chargeBasis: 'fixed_monthly',
        amountMinor: 300_000,
        rangeMaximumMinor: null,
      }),
    ).toThrow('unknown economics cannot carry a cost value');
    expect(() =>
      assertCommercialEconomicsInput({
        componentCode: 'base_rent',
        valueState: 'supplied',
        chargeBasis: null,
        amountMinor: 14_500,
        rangeMaximumMinor: null,
      }),
    ).toThrow('supplied economics require an amount and charge basis');
  });

  it('rejects availability claims that cannot support a freshness interpretation', () => {
    expect(() =>
      assertCommercialAvailabilityFreshness({ availabilityState: 'available_confirmed' }),
    ).toThrow('Confirmed availability requires confirmation source');
    expect(() =>
      assertCommercialAvailabilityFreshness({
        availabilityState: 'available_upcoming',
        lastConfirmedAt: '2026-08-20T09:00:00Z',
        reconfirmationDueAt: '2026-08-19T09:00:00Z',
      }),
    ).toThrow('Upcoming availability requires an occupation date');
  });
});
