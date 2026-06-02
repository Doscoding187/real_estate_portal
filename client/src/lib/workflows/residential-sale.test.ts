import { describe, expect, it } from 'vitest';
import { residentialSaleWorkflow } from './residential-sale';

const validateUnitTypes = (unitTypes: any[]) => {
  const step = residentialSaleWorkflow.steps.find(item => item.id === 'unit_types');
  if (!step?.validate) throw new Error('unit_types step validator is missing');
  return step.validate({ transactionType: 'for_sale', unitTypes });
};

describe('residential sale workflow validation', () => {
  it('rejects sale price upper ranges below the base price', () => {
    const result = validateUnitTypes([
      {
        id: 'sale-unit',
        name: 'Sale Unit',
        bedrooms: 2,
        bathrooms: 2,
        priceFrom: 1_500_000,
        priceTo: 1_200_000,
      },
    ]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContainEqual({
      field: 'unitTypes.sale-unit.priceTo',
      message: 'Sale Unit price upper range must be greater than or equal to base price',
    });
  });

  it('accepts sale unit types with a valid optional upper range', () => {
    const result = validateUnitTypes([
      {
        id: 'sale-unit',
        name: 'Sale Unit',
        bedrooms: 2,
        bathrooms: 2,
        basePriceFrom: 1_200_000,
        basePriceTo: 1_500_000,
      },
    ]);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});
