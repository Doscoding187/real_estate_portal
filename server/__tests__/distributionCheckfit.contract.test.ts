import { describe, expect, it, vi } from 'vitest';
import { distributionRouter } from '../distributionRouter';

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));
vi.mock('../db', () => ({ getDb: mocks.getDb }));

function fixtureSettingRows(rows: unknown[]) {
  mocks.getDb.mockResolvedValue({
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => rows }),
      }),
    }),
  });
}

const anonymousCaller = () =>
  distributionRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: null,
  } as never);

describe('public check-fit boundary', () => {
  it('runs the indicative estimate for an anonymous visitor from the stored prime rate', async () => {
    fixtureSettingRows([
      { settingValue: '10.50', updatedAt: new Date('2026-10-01T00:00:00.000Z') },
    ]);

    const outcome = await anonymousCaller().calculateCheckfit({ grossMonthlyIncome: 50000 });

    expect(outcome.available).toBe(true);
    if (outcome.available) {
      expect(outcome.policyVersion).toBe('checkfit_v1');
      expect(outcome.assumptions.annualInterestRate).toBe(10.5);
      expect(outcome.assumptions.termMonths).toBe(240);
      expect(outcome.assumptions.repaymentAllowanceRatio).toBe(0.3);
      expect(outcome.result).toEqual({
        repaymentAllowanceMonthly: 15000,
        estimatedLoanAmount: 1502434,
        estimatedPurchasePrice: 1502434,
      });
      expect(outcome.inputs).toEqual({ grossMonthlyIncome: 50000, monthlyDebts: 0, deposit: 0 });
      expect(outcome.disclaimers[0]).toContain('Not a final bond approval');
    }
  });

  it('returns a clear unavailable state instead of guessing a rate', async () => {
    fixtureSettingRows([]);

    const outcome = await anonymousCaller().calculateCheckfit({ grossMonthlyIncome: 50000 });

    expect(outcome).toEqual({
      available: false,
      policyVersion: 'checkfit_v1',
      unavailableReason: 'prime_rate_unavailable',
      disclaimers: expect.any(Array),
    });
  });

  it('rejects an invalid income before reading any database state', async () => {
    fixtureSettingRows([]);

    await expect(
      anonymousCaller().calculateCheckfit({ grossMonthlyIncome: -1 } as never),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });
});
