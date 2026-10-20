import { describe, expect, it } from 'vitest';
import {
  BROCHURE_MAX_VISIBLE_UNITS,
  buildBrochureHtml,
  estimateBrochureMonthlyRepayment,
  estimateBrochureQualifyingIncome,
  formatBrochureCurrencyRange,
  getBrochureUnitRows,
  getMinimumBrochureQualifyingIncome,
  type BrochureAffordability,
  type BrochureItem,
} from '../distributionBrochure';

const affordability: BrochureAffordability = {
  policyVersion: 'checkfit_v1',
  available: true,
  annualInterestRate: 10.5,
  rateSource: 'sarb_prime_rate',
  rateSourceLabel: 'SARB prime rate (platform settings)',
  rateUpdatedAt: '2026-10-19T08:00:00.000Z',
  termMonths: 240,
  repaymentAllowanceRatio: 0.3,
  disclaimers: ['Indicative only.'],
};

function brochureItem(overrides: Partial<BrochureItem> = {}): BrochureItem {
  return {
    developmentName: 'Preview Ridge Estate',
    city: 'Cape Town',
    province: 'Western Cape',
    description: 'A demonstration development.',
    imageUrl: 'https://cdn.example.com/hero.jpg',
    affordability,
    unitTypes: [
      {
        id: 'unit-2',
        name: 'Two bedroom',
        bedrooms: 2,
        bathrooms: 2,
        size: 78,
        modes: { sale: { priceFrom: 1150000, priceTo: 1150000, availableCount: 4 } },
      },
      {
        id: 'unit-3',
        name: 'Three bedroom',
        bedrooms: 3,
        bathrooms: 2,
        size: 105,
        modes: { sale: { priceFrom: 1650000, priceTo: 1725000, availableCount: 2 } },
      },
    ],
    ...overrides,
  };
}

describe('distribution brochure', () => {
  it('uses the canonical checkfit_v1 annuity rate and term', () => {
    const repayment = estimateBrochureMonthlyRepayment(1_150_000, affordability);

    expect(repayment).toBeCloseTo(11_481.37, 2);
    expect(estimateBrochureQualifyingIncome(repayment, affordability)).toBeCloseTo(38_271.23, 2);
  });

  it('returns no estimates when the prime rate is unavailable', () => {
    const unavailable = { ...affordability, available: false, annualInterestRate: null };

    expect(estimateBrochureMonthlyRepayment(1_150_000, unavailable)).toBeNull();
    expect(estimateBrochureQualifyingIncome(11_481, unavailable)).toBeNull();
    expect(estimateBrochureMonthlyRepayment(1_150_000, null)).toBeNull();
  });

  it('only includes priced sale units and orders them by size', () => {
    const { visibleRows, hiddenUnitCount } = getBrochureUnitRows(
      brochureItem({
        unitTypes: [
          {
            id: 'rent-only',
            name: 'Rental unit',
            modes: { rent: { priceFrom: 9000, priceTo: 9000, availableCount: 1 } },
          },
          {
            id: 'unpriced',
            name: 'Unpriced unit',
            modes: { sale: { priceFrom: null, priceTo: null } },
          },
          {
            id: 'large',
            name: 'Large unit',
            size: 120,
            modes: { sale: { priceFrom: 1_800_000, priceTo: 1_900_000 } },
          },
          {
            id: 'small',
            name: 'Small unit',
            size: 55,
            modes: { sale: { priceFrom: 900_000, priceTo: 950_000 } },
          },
        ],
      }),
    );

    expect(visibleRows.map(row => row.unit.id)).toEqual(['small', 'large']);
    expect(hiddenUnitCount).toBe(0);
    expect(visibleRows[0]?.referencePrice).toBe(900_000);
  });

  it('derives the minimum qualifying income from the lowest priced sale unit', () => {
    expect(getMinimumBrochureQualifyingIncome(brochureItem())).toBeCloseTo(38_271.23, 2);
    expect(
      getMinimumBrochureQualifyingIncome(
        brochureItem({
          unitTypes: [
            {
              id: 'small',
              name: 'Small unit',
              modes: { sale: { priceFrom: 500_000, priceTo: 600_000 } },
            },
            {
              id: 'large',
              name: 'Large unit',
              modes: { sale: { priceFrom: 900_000, priceTo: 900_000 } },
            },
          ],
        }),
      ),
    ).toBeCloseTo(16_639.66, 2);
  });

  it('returns no minimum qualifying income without a rate or priced sale units', () => {
    expect(
      getMinimumBrochureQualifyingIncome(
        brochureItem({
          affordability: { ...affordability, available: false, annualInterestRate: null },
        }),
      ),
    ).toBeNull();
    expect(
      getMinimumBrochureQualifyingIncome(
        brochureItem({
          unitTypes: [
            {
              id: 'rent-only',
              name: 'Rental unit',
              modes: { rent: { priceFrom: 9000, priceTo: 9000 } },
            },
          ],
        }),
      ),
    ).toBeNull();
  });

  it('caps the brochure table and reports hidden units', () => {
    const unitTypes = Array.from({ length: BROCHURE_MAX_VISIBLE_UNITS + 3 }, (_, index) => ({
      id: `unit-${index}`,
      name: `Unit ${index}`,
      size: 50 + index,
      modes: { sale: { priceFrom: 500_000 + index * 10_000, priceTo: null } },
    }));

    const { visibleRows, hiddenUnitCount } = getBrochureUnitRows(brochureItem({ unitTypes }));

    expect(visibleRows).toHaveLength(BROCHURE_MAX_VISIBLE_UNITS);
    expect(hiddenUnitCount).toBe(3);
  });

  it('formats price ranges without duplicating equal prices', () => {
    const format = (value: string) => value.replace(/\u00A0/g, ' ');

    expect(format(formatBrochureCurrencyRange(1_150_000, 1_150_000))).toContain('From R');
    expect(format(formatBrochureCurrencyRange(1_650_000, 1_725_000))).toContain(' - ');
    expect(formatBrochureCurrencyRange(null, null)).toBe('Price on request');
  });

  it('builds escaped HTML with canonical assumptions and no legacy fixed rate', () => {
    const html = buildBrochureHtml(
      brochureItem({
        developmentName: 'Ridge & <Estate>',
        unitTypes: [
          {
            id: 'unit-1',
            name: '<script>alert(1)</script>',
            modes: { sale: { priceFrom: 1_150_000, priceTo: 1_150_000 } },
          },
        ],
      }),
    );

    expect(html).toContain('Ridge &amp; &lt;Estate&gt;');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('240-month bond at 10.50%');
    expect(html).toContain('SARB prime rate (platform settings)');
    expect(html).toContain('30% of gross monthly income');
    expect(html).not.toContain('11.75');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  it('renders an unavailable state instead of estimates when the rate is missing', () => {
    const html = buildBrochureHtml(
      brochureItem({
        affordability: { ...affordability, available: false, annualInterestRate: null },
      }),
    );

    expect(html).toContain('Affordability estimates are temporarily unavailable');
    expect(html).toContain('Unavailable');
    expect(html).not.toContain('undefined');
  });
});
