import { describe, expect, it } from 'vitest';
import {
  buildDevelopmentHomeInventory,
  prioritizeDevelopmentHomeInventoryWarnings,
} from '../developmentInventorySummary';

const development = { developmentType: 'residential', transactionType: 'for_sale' } as const;
const validUnit = {
  isActive: 1,
  totalUnits: 10,
  availableUnits: 4,
  reservedUnits: 2,
  priceFrom: 1200000,
  priceTo: null,
  basePriceFrom: 1200000,
  basePriceTo: null,
  monthlyRentFrom: null,
  monthlyRentTo: null,
  startingBid: null,
  reservePrice: null,
  auctionStartDate: null,
  auctionEndDate: null,
};

describe('buildDevelopmentHomeInventory', () => {
  it('uses only active unit types for exact aggregate quantities, sold and sale pricing', () => {
    const result = buildDevelopmentHomeInventory(
      development,
      [
        validUnit,
        {
          ...validUnit,
          totalUnits: 6,
          availableUnits: 1,
          reservedUnits: null,
          priceFrom: 2000000,
          basePriceFrom: 2000000,
        },
        { ...validUnit, isActive: 0, totalUnits: 99, availableUnits: 99, priceFrom: 1 },
      ],
      [],
    );
    expect(result).toMatchObject({
      activeUnitTypeCount: 2,
      totalUnits: 16,
      availableUnits: 5,
      reservedUnits: 2,
      derivedSoldUnits: 9,
      pricing: { kind: 'sale', from: 1200000, to: 2000000 },
    });
    expect(result.warnings.map(warning => warning.code)).toEqual(['inactive_unit_types']);
  });

  it('does not fabricate aggregate quantities or derived sold for invalid active persisted inventory', () => {
    const result = buildDevelopmentHomeInventory(
      development,
      [{ ...validUnit, availableUnits: 9, reservedUnits: 2 }],
      [{ field: 'unitTypes.Home.inventory', message: 'Home has invalid aggregate inventory.' }],
    );
    expect(result.totalUnits).toBeNull();
    expect(result.availableUnits).toBeNull();
    expect(result.derivedSoldUnits).toBeNull();
    expect(result.warnings.map(warning => warning.code)).toContain('invalid_aggregate_inventory');
  });

  it('reports a truthful empty catalogue and preserves the land exemption', () => {
    expect(buildDevelopmentHomeInventory(development, [], [])).toMatchObject({
      catalogueState: 'not_configured',
      activeUnitTypeCount: 0,
      totalUnits: null,
    });
    expect(
      buildDevelopmentHomeInventory({ ...development, developmentType: 'land' }, [], []),
    ).toMatchObject({
      catalogueState: 'land_not_required',
      activeUnitTypeCount: 0,
      warnings: [],
    });
  });

  it('uses canonical base pricing, allows explicit legacy compatibility, and never hides conflicts', () => {
    expect(
      buildDevelopmentHomeInventory(development, [{ ...validUnit, priceFrom: null }], []).pricing,
    ).toEqual({
      kind: 'sale',
      from: 1200000,
      to: 1200000,
    });
    const legacy = buildDevelopmentHomeInventory(
      development,
      [{ ...validUnit, basePriceFrom: null, priceFrom: 900000 }],
      [],
    );
    expect(legacy.pricing).toEqual({ kind: 'sale', from: 900000, to: 900000 });
    expect(legacy.warnings.map(warning => warning.code)).toContain(
      'legacy_sale_price_compatibility',
    );

    const conflict = buildDevelopmentHomeInventory(
      development,
      [{ ...validUnit, basePriceFrom: 1200000, priceFrom: 900000 }],
      [],
    );
    expect(conflict.pricing).toEqual({ kind: 'unavailable', from: null, to: null });
    expect(conflict.warnings.map(warning => warning.code)).toContain(
      'sale_price_integrity_conflict',
    );
  });

  it('does not allow valid legacy pricing to mask an invalid canonical price', () => {
    const result = buildDevelopmentHomeInventory(
      development,
      [{ ...validUnit, basePriceFrom: 0, priceFrom: 1200000 }],
      [],
    );
    expect(result.pricing).toEqual({ kind: 'unavailable', from: null, to: null });
    expect(result.warnings.map(warning => warning.code)).toContain('missing_or_invalid_pricing');
  });

  it('uses monthly lower and optional upper bounds without substitution', () => {
    const single = buildDevelopmentHomeInventory(
      { ...development, transactionType: 'for_rent' },
      [{ ...validUnit, monthlyRentFrom: 12000, monthlyRentTo: null }],
      [],
    );
    expect(single.pricing).toEqual({ kind: 'rent', from: 12000, to: 12000 });
    const rent = buildDevelopmentHomeInventory(
      { ...development, transactionType: 'for_rent' },
      [{ ...validUnit, monthlyRentFrom: 12000, monthlyRentTo: 14000 }],
      [],
    );
    expect(rent.pricing).toEqual({ kind: 'rent', from: 12000, to: 14000 });
    const invalid = buildDevelopmentHomeInventory(
      { ...development, transactionType: 'for_rent' },
      [{ ...validUnit, monthlyRentFrom: null, monthlyRentTo: 14000 }],
      [],
    );
    expect(invalid.pricing.kind).toBe('unavailable');
    expect(invalid.warnings.map(warning => warning.code)).toContain('missing_or_invalid_pricing');
  });

  it('returns only a truthful auction terms count and starting-bid range', () => {
    const auction = buildDevelopmentHomeInventory(
      { ...development, transactionType: 'auction' },
      [
        {
          ...validUnit,
          startingBid: 1000000,
          reservePrice: 1200000,
          auctionStartDate: '2030-01-01 10:00:00',
          auctionEndDate: '2030-01-02 10:00:00',
        },
      ],
      [],
    );
    expect(auction.pricing).toMatchObject({
      kind: 'auction',
      from: 1000000,
      to: 1000000,
    });
    expect(auction.auctionTermsConfiguredCount).toBe(1);
    expect(auction.pricing).not.toHaveProperty('reserveFrom');
    expect(auction.pricing).not.toHaveProperty('auctionStartDate');
  });

  it('uses the exact zero-availability warning without sales or reservation claims', () => {
    const result = buildDevelopmentHomeInventory(
      development,
      [{ ...validUnit, availableUnits: 0, reservedUnits: 0 }],
      [],
    );
    expect(result.warnings).toContainEqual({
      code: 'zero_aggregate_availability',
      message: '0 aggregate units are marked available.',
    });
  });

  it('keeps integrity warnings visible before bounded informational warnings', () => {
    const warnings = prioritizeDevelopmentHomeInventoryWarnings([
      { code: 'inactive_unit_types', message: 'inactive' },
      { code: 'legacy_sale_price_compatibility', message: 'legacy' },
      { code: 'zero_aggregate_availability', message: 'zero' },
      { code: 'no_active_unit_types', message: 'empty' },
      { code: 'rental_price_integrity_conflict', message: 'rent conflict' },
      { code: 'missing_or_invalid_pricing', message: 'missing' },
      { code: 'invalid_aggregate_inventory', message: 'inventory' },
      { code: 'sale_price_integrity_conflict', message: 'sale conflict' },
    ]);
    expect(warnings).toHaveLength(5);
    expect(warnings.map(warning => warning.code)).toEqual([
      'sale_price_integrity_conflict',
      'invalid_aggregate_inventory',
      'missing_or_invalid_pricing',
      'rental_price_integrity_conflict',
      'no_active_unit_types',
    ]);
  });
});
