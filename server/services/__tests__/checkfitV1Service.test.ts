import { describe, expect, it } from 'vitest';
import {
  calculateCheckfitV1,
  CHECKFIT_V1_DISCLAIMERS,
  CHECKFIT_V1_POLICY,
  checkfitV1InputSchema,
  resolveCheckfitV1Rate,
  runCheckfitV1,
} from '../checkfitV1Service';

function createRateDb(rows: unknown[]) {
  return {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => Promise.resolve(rows),
        }),
      }),
    }),
  } as any;
}

describe('checkfit_v1 calculation policy', () => {
  it('applies the approved 240-month term and 30% repayment allowance', () => {
    expect(CHECKFIT_V1_POLICY.version).toBe('checkfit_v1');
    expect(CHECKFIT_V1_POLICY.termMonths).toBe(240);
    expect(CHECKFIT_V1_POLICY.repaymentAllowanceRatio).toBe(0.3);
    expect(CHECKFIT_V1_POLICY.rateSourceKey).toBe('sarb_prime_rate');
    expect(CHECKFIT_V1_DISCLAIMERS[0]).toContain('Not a final bond approval');
  });

  it('calculates the indicative purchase price from the current prime rate', () => {
    const result = calculateCheckfitV1({
      grossMonthlyIncome: 50000,
      monthlyDebts: 0,
      deposit: 100000,
      annualInterestRate: 10.5,
      rateUpdatedAt: '2026-10-01T00:00:00.000Z',
    });

    expect(result.available).toBe(true);
    expect(result.assumptions).toEqual({
      annualInterestRate: 10.5,
      rateSource: 'sarb_prime_rate',
      rateSourceLabel: 'SARB prime rate (platform settings)',
      rateUpdatedAt: '2026-10-01T00:00:00.000Z',
      termMonths: 240,
      repaymentAllowanceRatio: 0.3,
    });
    expect(result.result).toEqual({
      repaymentAllowanceMonthly: 15000,
      estimatedLoanAmount: 1502434,
      estimatedPurchasePrice: 1602434,
    });
  });

  it('reduces the repayment allowance by declared monthly debts', () => {
    const result = calculateCheckfitV1({
      grossMonthlyIncome: 50000,
      monthlyDebts: 5000,
      deposit: 0,
      annualInterestRate: 11.75,
      rateUpdatedAt: null,
    });

    expect(result.available).toBe(true);
    expect(result.result).toEqual({
      repaymentAllowanceMonthly: 10000,
      estimatedLoanAmount: 922759,
      estimatedPurchasePrice: 922759,
    });
  });

  it('floors an exhausted repayment allowance at zero instead of a negative loan', () => {
    const result = calculateCheckfitV1({
      grossMonthlyIncome: 5000,
      monthlyDebts: 2000,
      deposit: 50000,
      annualInterestRate: 11.75,
      rateUpdatedAt: null,
    });

    expect(result.available).toBe(true);
    expect(result.result).toEqual({
      repaymentAllowanceMonthly: 0,
      estimatedLoanAmount: 0,
      estimatedPurchasePrice: 50000,
    });
  });
});

describe('checkfit_v1 rate resolution', () => {
  it('reads the SARB prime rate from canonical platform settings', async () => {
    const rate = await resolveCheckfitV1Rate(
      createRateDb([
        { settingValue: '11.75', updatedAt: new Date('2026-09-30T12:00:00.000Z') },
      ]),
    );

    expect(rate).toEqual({
      annualInterestRate: 11.75,
      rateUpdatedAt: '2026-09-30T12:00:00.000Z',
    });
  });

  it('returns null when the setting is missing or malformed instead of guessing', async () => {
    await expect(resolveCheckfitV1Rate(createRateDb([]))).resolves.toBeNull();
    await expect(
      resolveCheckfitV1Rate(createRateDb([{ settingValue: 'not-a-rate', updatedAt: null }])),
    ).resolves.toBeNull();
    await expect(
      resolveCheckfitV1Rate(createRateDb([{ settingValue: '-1', updatedAt: null }])),
    ).resolves.toBeNull();
  });

  it('reports a clear unavailable state when the prime rate is not configured', async () => {
    const outcome = await runCheckfitV1({
      db: createRateDb([]),
      input: { grossMonthlyIncome: 50000, monthlyDebts: 0, deposit: 0 },
    });

    expect(outcome).toEqual({
      available: false,
      policyVersion: 'checkfit_v1',
      unavailableReason: 'prime_rate_unavailable',
      disclaimers: [...CHECKFIT_V1_DISCLAIMERS],
    });
  });

  it('runs the full tool from the stored rate with defaulted optional inputs', async () => {
    const outcome = await runCheckfitV1({
      db: createRateDb([{ settingValue: '10.50', updatedAt: null }]),
      input: { grossMonthlyIncome: 50000 } as any,
    });

    expect(outcome.available).toBe(true);
    if (outcome.available) {
      expect(outcome.result.estimatedPurchasePrice).toBe(1502434);
      expect(outcome.inputs).toEqual({ grossMonthlyIncome: 50000, monthlyDebts: 0, deposit: 0 });
    }
  });
});

describe('checkfit_v1 input schema', () => {
  it('requires a positive gross income and defaults optional fields', () => {
    const parsed = checkfitV1InputSchema.parse({ grossMonthlyIncome: 42000 });
    expect(parsed).toEqual({ grossMonthlyIncome: 42000, monthlyDebts: 0, deposit: 0 });
    expect(() => checkfitV1InputSchema.parse({ grossMonthlyIncome: 0 })).toThrow();
    expect(() => checkfitV1InputSchema.parse({ grossMonthlyIncome: 1000, deposit: -5 })).toThrow();
  });
});
