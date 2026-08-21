import { describe, expect, it } from 'vitest';
import { assertCommercialPricingContract, deriveCommercialMonthlyOccupancyCost } from '../../../shared/commercial-domain';
import { effectiveCommercialAvailabilityState } from '../commercialOfficeService';

describe('Commercial Office public truth', () => {
  it('keeps gross and componentised pricing mutually exclusive', () => {
    expect(() => assertCommercialPricingContract({ pricingMode: 'gross_quote', economics: [
      { componentCode: 'gross_rent', valueState: 'supplied', chargeBasis: 'per_m2_month', amountMinor: 21500, rangeMaximumMinor: null },
      { componentCode: 'rates_recoveries', valueState: 'supplied', chargeBasis: 'per_m2_month', amountMinor: 4130, rangeMaximumMinor: null },
    ] })).toThrow(/double-count/i);
    expect(() => assertCommercialPricingContract({ pricingMode: 'gross_quote', economics: [
      { componentCode: 'gross_rent', valueState: 'supplied', chargeBasis: 'per_m2_month', amountMinor: 21500, rangeMaximumMinor: null },
      { componentCode: 'parking', valueState: 'supplied', chargeBasis: 'per_bay_month', amountMinor: 850000, rangeMaximumMinor: null },
    ] })).not.toThrow();
  });

  it('does not present expired confirmation as confirmed availability', () => {
    expect(effectiveCommercialAvailabilityState({ availabilityState: 'available_confirmed', reconfirmationDueAt: '2026-01-01T00:00:00Z' }, new Date('2026-08-21T00:00:00Z'))).toBe('needs_reconfirmation');
    expect(effectiveCommercialAvailabilityState({ availabilityState: 'available_upcoming', reconfirmationDueAt: '2026-12-01T00:00:00Z' }, new Date('2026-08-21T00:00:00Z'))).toBe('available_upcoming');
  });

  it('retains unresolved Cost Passport components instead of calculating them as zero', () => {
    const cost = deriveCommercialMonthlyOccupancyCost({ rentableAreaM2: null, economics: [{ componentCode: 'gross_rent', valueState: 'supplied', chargeBasis: 'per_m2_month', amountMinor: 21500, rangeMaximumMinor: null }, { componentCode: 'utilities', valueState: 'unknown', chargeBasis: null, amountMinor: null, rangeMaximumMinor: null }] });
    expect(cost.components).toEqual([]);
    expect(cost.unknownComponentCodes).toEqual(['gross_rent', 'utilities']);
  });
});
