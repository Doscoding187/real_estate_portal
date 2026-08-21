import { describe, expect, it } from 'vitest';
import {
  assertCommercialPricingContract,
  deriveCommercialMonthlyOccupancyCost,
} from '../../../shared/commercial-domain';
import {
  deriveOfficeListingSupplierCustody,
  effectiveCommercialAvailabilityState,
} from '../commercialOfficeService';
import { toMySqlDateTime } from '../leadDeliveryService';

describe('Commercial Office public truth', () => {
  it('keeps gross and componentised pricing mutually exclusive', () => {
    expect(() =>
      assertCommercialPricingContract({
        pricingMode: 'gross_quote',
        economics: [
          {
            componentCode: 'gross_rent',
            valueState: 'supplied',
            chargeBasis: 'per_m2_month',
            amountMinor: 21500,
            rangeMaximumMinor: null,
          },
          {
            componentCode: 'rates_recoveries',
            valueState: 'supplied',
            chargeBasis: 'per_m2_month',
            amountMinor: 4130,
            rangeMaximumMinor: null,
          },
        ],
      }),
    ).toThrow(/double-count/i);
    expect(() =>
      assertCommercialPricingContract({
        pricingMode: 'gross_quote',
        economics: [
          {
            componentCode: 'gross_rent',
            valueState: 'supplied',
            chargeBasis: 'per_m2_month',
            amountMinor: 21500,
            rangeMaximumMinor: null,
          },
          {
            componentCode: 'parking',
            valueState: 'supplied',
            chargeBasis: 'per_bay_month',
            amountMinor: 850000,
            rangeMaximumMinor: null,
          },
        ],
      }),
    ).not.toThrow();
  });

  it('does not present expired confirmation as confirmed availability', () => {
    expect(
      effectiveCommercialAvailabilityState(
        { availabilityState: 'available_confirmed', reconfirmationDueAt: '2026-01-01T00:00:00Z' },
        new Date('2026-08-21T00:00:00Z'),
      ),
    ).toBe('needs_reconfirmation');
    expect(
      effectiveCommercialAvailabilityState(
        { availabilityState: 'available_upcoming', reconfirmationDueAt: '2026-12-01T00:00:00Z' },
        new Date('2026-08-21T00:00:00Z'),
      ),
    ).toBe('available_upcoming');
  });

  it('retains unresolved Cost Passport components instead of calculating them as zero', () => {
    const cost = deriveCommercialMonthlyOccupancyCost({
      rentableAreaM2: null,
      economics: [
        {
          componentCode: 'gross_rent',
          valueState: 'supplied',
          chargeBasis: 'per_m2_month',
          amountMinor: 21500,
          rangeMaximumMinor: null,
        },
        {
          componentCode: 'utilities',
          valueState: 'unknown',
          chargeBasis: null,
          amountMinor: null,
          rangeMaximumMinor: null,
        },
      ],
    });
    expect(cost.components).toEqual([]);
    expect(cost.unknownComponentCodes).toEqual(['gross_rent', 'utilities']);
  });

  it('normalizes ISO API timestamps to strict-MySQL UTC without a timezone shift', () => {
    expect(toMySqlDateTime('2026-08-20T08:00:00.000Z')).toBe('2026-08-20 08:00:00');
    expect(toMySqlDateTime('2026-08-20T10:00:00+02:00')).toBe('2026-08-20 08:00:00');
  });

  it('materializes agency-principal custody without creating an Agent profile', () => {
    expect(
      deriveOfficeListingSupplierCustody({
        user: { role: 'agency_admin', agencyId: 44 },
        agent: null,
        agencyExists: true,
      }),
    ).toEqual({ agentId: null, agencyId: 44 });
  });

  it('preserves approved Agent custody and fails closed without a durable recipient', () => {
    expect(
      deriveOfficeListingSupplierCustody({
        user: { role: 'agent', agencyId: 44 },
        agent: { id: 9, agencyId: 44, status: 'approved' },
        agencyExists: true,
      }),
    ).toEqual({ agentId: 9, agencyId: 44 });
    expect(() =>
      deriveOfficeListingSupplierCustody({
        user: { role: 'property_developer', agencyId: null },
        agent: null,
        agencyExists: true,
      }),
    ).toThrow(/canonical Agent or agency-principal/i);
    expect(() =>
      deriveOfficeListingSupplierCustody({
        user: { role: 'agency_admin', agencyId: 44 },
        agent: null,
        agencyExists: false,
      }),
    ).toThrow(/agency is not an active canonical authority/i);
  });
});
