import { describe, expect, it } from 'vitest';
import { getPropertyCardPrice, getPropertyRunningCostFacts } from './publicPropertyNormalizer';

describe('public pricing normalization', () => {
  it('keeps Sale cards on asking price when a legacy rent column is also present', () => {
    expect(
      getPropertyCardPrice({
        listingType: 'sale',
        askingPrice: 2_500_000,
        monthlyRent: 18_000,
        pricingContract: {
          version: 1,
          intent: 'sale',
          askingPrice: 2_500_000,
          negotiability: 'unknown',
          recurringCosts: {},
        },
      }),
    ).toMatchObject({ amount: 2_500_000 });
  });

  it('keeps Rent cards on monthly rent when a legacy sale column is also present', () => {
    expect(
      getPropertyCardPrice({
        listingType: 'rent',
        askingPrice: 2_500_000,
        monthlyRent: 18_000,
        pricingContract: {
          version: 1,
          intent: 'rent',
          monthlyRent: 18_000,
          deposit: { status: 'unknown' },
        },
      }),
    ).toMatchObject({ amount: 18_000, qualifier: 'monthly' });
  });

  it('does not resurrect a legacy amount when the canonical contract has no primary price', () => {
    expect(
      getPropertyCardPrice({
        listingType: 'sale',
        monthlyRent: 18_000,
        displayPrice: 18_000,
        pricingContract: {
          version: 1,
          intent: 'sale',
          negotiability: 'unknown',
          recurringCosts: {},
        },
      }),
    ).toMatchObject({ amount: 0, label: 'Price on request' });
  });

  it('preserves explicit zero and unknown recurring-cost states for detail', () => {
    const facts = getPropertyRunningCostFacts({
      listingType: 'sale',
      pricingContract: {
        version: 1,
        intent: 'sale',
        askingPrice: 2_500_000,
        negotiability: 'unknown',
        recurringCosts: {
          ratesAndTaxes: { status: 'zero' },
          hoaEstateLevy: { status: 'unknown' },
        },
      },
    });
    expect(facts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: 'rates-and-taxes', status: 'confirmed' }),
        expect.objectContaining({ key: 'hoa-estate-levy', value: 'To confirm', status: 'unknown' }),
      ]),
    );
    expect(facts.find(fact => fact.key === 'rates-and-taxes')?.value).toContain('0');
  });
});
