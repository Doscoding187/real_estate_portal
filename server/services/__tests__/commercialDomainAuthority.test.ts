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
  assertCommercialSpecificationInput,
  assertCommercialSpaceAreas,
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
        {
          componentCode: 'base_rent',
          valueState: 'supplied',
          chargeBasis: 'per_m2_month',
          amountMinor: 14_500,
          rangeMaximumMinor: null,
        },
        {
          componentCode: 'parking',
          valueState: 'supplied',
          chargeBasis: 'per_bay_month',
          amountMinor: 850_000,
          rangeMaximumMinor: null,
        },
        {
          componentCode: 'utilities',
          valueState: 'estimated',
          chargeBasis: 'fixed_monthly',
          amountMinor: 300_000,
          rangeMaximumMinor: 480_000,
        },
        {
          componentCode: 'security_service',
          valueState: 'unknown',
          chargeBasis: null,
          amountMinor: null,
          rangeMaximumMinor: null,
        },
      ],
    });

    expect(result.monthlyMinimumMinor).toBe(14_600_000);
    expect(result.monthlyMaximumMinor).toBe(14_780_000);
    expect(result.unknownComponentCodes).toEqual(['security_service']);
    expect(result.components.every(component => component.valueState === 'calculated')).toBe(true);
  });

  it('reports missing Cost Passport quantities as unresolved without treating a legitimate zero as missing', () => {
    const unresolvedArea = deriveCommercialMonthlyOccupancyCost({
      economics: [
        {
          componentCode: 'base_rent',
          valueState: 'supplied',
          chargeBasis: 'per_m2_month',
          amountMinor: 14_500,
          rangeMaximumMinor: null,
        },
        {
          componentCode: 'operating_costs',
          valueState: 'estimated',
          chargeBasis: 'per_m2_month',
          amountMinor: 2_400,
          rangeMaximumMinor: 3_000,
        },
      ],
    });
    expect(unresolvedArea.components).toEqual([]);
    expect(unresolvedArea.unknownComponentCodes).toEqual(['base_rent', 'operating_costs']);

    const unresolvedParking = deriveCommercialMonthlyOccupancyCost({
      rentableAreaM2: 100,
      economics: [
        {
          componentCode: 'parking',
          valueState: 'supplied',
          chargeBasis: 'per_bay_month',
          amountMinor: 850_000,
          rangeMaximumMinor: null,
        },
      ],
    });
    expect(unresolvedParking.unknownComponentCodes).toEqual(['parking']);

    const knownQuantities = deriveCommercialMonthlyOccupancyCost({
      rentableAreaM2: 100,
      parkingBays: 2,
      economics: [
        {
          componentCode: 'base_rent',
          valueState: 'supplied',
          chargeBasis: 'per_m2_month',
          amountMinor: 14_500,
          rangeMaximumMinor: null,
        },
        {
          componentCode: 'parking',
          valueState: 'supplied',
          chargeBasis: 'per_bay_month',
          amountMinor: 850_000,
          rangeMaximumMinor: null,
        },
        {
          componentCode: 'utilities',
          valueState: 'unknown',
          chargeBasis: null,
          amountMinor: null,
          rangeMaximumMinor: null,
        },
        {
          componentCode: 'fixed_levies',
          valueState: 'supplied',
          chargeBasis: 'fixed_monthly',
          amountMinor: 25_000,
          rangeMaximumMinor: null,
        },
        {
          componentCode: 'other_recovery',
          valueState: 'supplied',
          chargeBasis: 'annual',
          amountMinor: 120_000,
          rangeMaximumMinor: null,
        },
      ],
    });
    expect(knownQuantities.monthlyMinimumMinor).toBe(3_185_000);
    expect(knownQuantities.monthlyMaximumMinor).toBe(3_185_000);
    expect(knownQuantities.unknownComponentCodes).toEqual(['utilities']);

    const explicitZero = deriveCommercialMonthlyOccupancyCost({
      rentableAreaM2: 0,
      economics: [
        {
          componentCode: 'base_rent',
          valueState: 'supplied',
          chargeBasis: 'per_m2_month',
          amountMinor: 14_500,
          rangeMaximumMinor: null,
        },
      ],
    });
    expect(explicitZero.unknownComponentCodes).toEqual([]);
    expect(explicitZero.monthlyMinimumMinor).toBe(0);
  });

  it('requires canonical Commercial areas to be positive when known', () => {
    expect(() => assertCommercialSpaceAreas({ rentableAreaM2: -1 })).toThrow(
      'Commercial rentable area must be greater than zero when known.',
    );
    expect(() => assertCommercialSpaceAreas({ usableAreaM2: 0 })).toThrow(
      'Commercial usable area must be greater than zero when known.',
    );
    expect(() =>
      assertCommercialSpaceAreas({ rentableAreaM2: null, usableAreaM2: 120 }),
    ).not.toThrow();
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
    ).toThrow('Positive availability requires confirmation source');
    expect(() =>
      assertCommercialAvailabilityFreshness({
        availabilityState: 'available_upcoming',
        lastConfirmedAt: '2026-08-20T09:00:00Z',
        reconfirmationDueAt: '2026-08-19T09:00:00Z',
      }),
    ).toThrow('Upcoming availability requires an occupation date');
    expect(() =>
      assertCommercialAvailabilityFreshness({
        availabilityState: 'available_upcoming',
        occupationDate: '2026-12-01',
      }),
    ).toThrow('Positive availability requires confirmation source');
    expect(() =>
      assertCommercialAvailabilityFreshness({
        availabilityState: 'available_upcoming',
        occupationDate: '2026-12-01',
        lastConfirmedAt: '2026-08-20T09:00:00Z',
        confirmationSource: 'broker',
        reconfirmationDueAt: '2026-08-27T09:00:00Z',
      }),
    ).not.toThrow();
    expect(() =>
      assertCommercialAvailabilityFreshness({
        availabilityState: 'available_confirmed',
        lastConfirmedAt: '2026-08-20T09:00:00Z',
        confirmationSource: 'landlord',
        reconfirmationDueAt: '2026-08-27T09:00:00Z',
      }),
    ).not.toThrow();
  });

  it('enforces specification state integrity and governed value kinds', () => {
    expect(() =>
      assertCommercialSpecificationInput({
        specificationCode: 'backup_power',
        valueState: 'unknown',
        numericValue: null,
        textValue: null,
        booleanValue: true,
      }),
    ).toThrow('unknown specification cannot carry a value');
    expect(() =>
      assertCommercialSpecificationInput({
        specificationCode: 'building_grade',
        valueState: 'not_applicable',
        numericValue: null,
        textValue: 'A Grade',
        booleanValue: null,
      }),
    ).toThrow('not_applicable specification cannot carry a value');
    expect(() =>
      assertCommercialSpecificationInput({
        specificationCode: 'eaves_height_m',
        valueState: 'known',
        numericValue: null,
        textValue: null,
        booleanValue: null,
      }),
    ).toThrow('known specification requires exactly one value');
    expect(() =>
      assertCommercialSpecificationInput({
        specificationCode: 'building_grade',
        valueState: 'known',
        numericValue: 7,
        textValue: 'A Grade',
        booleanValue: null,
      }),
    ).toThrow('known specification requires exactly one value');

    expect(() =>
      assertCommercialSpecificationInput({
        specificationCode: 'backup_power',
        valueState: 'known',
        numericValue: null,
        textValue: null,
        booleanValue: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertCommercialSpecificationInput({
        specificationCode: 'eaves_height_m',
        valueState: 'known',
        numericValue: 8.5,
        textValue: null,
        booleanValue: null,
      }),
    ).not.toThrow();
    expect(() =>
      assertCommercialSpecificationInput({
        specificationCode: 'building_grade',
        valueState: 'known',
        numericValue: null,
        textValue: 'A Grade',
        booleanValue: null,
      }),
    ).not.toThrow();
  });
});
