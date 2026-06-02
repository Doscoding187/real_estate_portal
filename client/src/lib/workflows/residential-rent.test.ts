import { describe, expect, it } from 'vitest';
import { residentialRentWorkflow } from './residential-rent';

const validateUnitTypes = (unitTypes: any[]) => {
  const step = residentialRentWorkflow.steps.find(item => item.id === 'unit_types');
  if (!step?.validate) throw new Error('unit_types step validator is missing');
  return step.validate({ transactionType: 'for_rent', unitTypes });
};

describe('residential rent workflow validation', () => {
  it('requires a monthly rent from value for every rental unit type', () => {
    const result = validateUnitTypes([
      {
        id: 'rental-unit',
        name: 'Rental Unit',
        bedrooms: 2,
        bathrooms: 1,
        monthlyRentTo: 12_500,
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'unitTypes.rental-unit.monthlyRentFrom',
      message: 'Rental Unit is missing a monthly rent',
    });
  });

  it('rejects monthly rent upper ranges below monthly rent from', () => {
    const result = validateUnitTypes([
      {
        id: 'rental-unit',
        name: 'Rental Unit',
        bedrooms: 2,
        bathrooms: 1,
        monthlyRentFrom: 15_000,
        monthlyRentTo: 12_500,
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'unitTypes.rental-unit.monthlyRentTo',
      message:
        'Rental Unit monthly rent upper range must be greater than or equal to monthly rent from',
    });
  });

  it('accepts rental unit types with a valid optional upper range', () => {
    const result = validateUnitTypes([
      {
        id: 'rental-unit',
        name: 'Rental Unit',
        bedrooms: 2,
        bathrooms: 1,
        monthlyRentFrom: 12_500,
        monthlyRentTo: 15_000,
      },
    ]);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
