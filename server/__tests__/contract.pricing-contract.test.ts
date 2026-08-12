import { describe, expect, it } from 'vitest';
import {
  buildPricingContract,
  getMoneyFactAmount,
  getPrimaryPrice,
  validatePricingContract,
} from '../../shared/pricing-contract';

describe('canonical pricing contract', () => {
  it('keeps Sale and Rent primary prices action-specific', () => {
    expect(getPrimaryPrice('sell', { askingPrice: 2_500_000, monthlyRent: 18_000 })).toBe(
      2_500_000,
    );
    expect(getPrimaryPrice('rent', { askingPrice: 2_500_000, monthlyRent: 18_000 })).toBe(18_000);
    expect(getPrimaryPrice('sell', { monthlyRent: 18_000 })).toBeUndefined();
    expect(getPrimaryPrice('rent', { askingPrice: 2_500_000 })).toBeUndefined();
  });

  it('preserves zero, unknown and not-applicable money states', () => {
    const contract = buildPricingContract('rent', {
      monthlyRent: 18_000,
      depositFact: { status: 'zero' },
    });

    expect(contract).toMatchObject({ intent: 'rent', deposit: { status: 'zero' } });
    expect(getMoneyFactAmount({ status: 'zero' })).toBe(0);
    expect(getMoneyFactAmount({ status: 'unknown' })).toBeUndefined();
    expect(getMoneyFactAmount({ status: 'not_applicable' })).toBeUndefined();
  });

  it('requires an explicit Rent deposit state for publication, not a positive amount', () => {
    expect(
      validatePricingContract('rent', { monthlyRent: 18_000 }, {}, { mode: 'publish' }),
    ).toEqual([expect.objectContaining({ field: 'deposit' })]);
    expect(
      validatePricingContract(
        'rent',
        { monthlyRent: 18_000, depositFact: { status: 'zero' } },
        {},
        { mode: 'publish' },
      ),
    ).toEqual([]);
    expect(
      validatePricingContract(
        'rent',
        { monthlyRent: 18_000, depositFact: { status: 'unknown' } },
        {},
        { mode: 'publish' },
      ),
    ).toEqual([]);
    expect(
      validatePricingContract(
        'rent',
        { monthlyRent: 18_000, depositFact: { status: 'not_applicable' } },
        {},
        { mode: 'publish' },
      ),
    ).toEqual([expect.objectContaining({ field: 'deposit' })]);
  });

  it('rejects incompatible active action input', () => {
    expect(
      validatePricingContract('sell', { askingPrice: 2_500_000, monthlyRent: 18_000 }),
    ).toEqual([expect.objectContaining({ field: 'pricing' })]);
    expect(
      validatePricingContract('rent', { monthlyRent: 18_000, askingPrice: 2_500_000 }),
    ).toEqual([expect.objectContaining({ field: 'pricing' })]);
  });

  it('does not invent a levy category from the historical generic levy alias', () => {
    expect(buildPricingContract('sell', { askingPrice: 2_500_000, levies: 1_250 })).toMatchObject({
      recurringCosts: {
        otherMandatoryCharge: {
          status: 'known',
          amount: 1_250,
          cadence: 'monthly',
          provenance: 'legacy',
        },
      },
    });
  });

  it('allows an explicit write value to replace an older embedded snapshot', () => {
    expect(
      buildPricingContract(
        'sell',
        { askingPrice: 3_000_000, negotiability: 'negotiable', recurringCosts: {} },
        {
          pricingContract: {
            version: 1,
            intent: 'sale',
            askingPrice: 2_000_000,
            negotiability: 'not_negotiable',
            recurringCosts: {},
          },
        },
        { preferEmbedded: false },
      ),
    ).toMatchObject({ askingPrice: 3_000_000, negotiability: 'negotiable' });
  });
});
