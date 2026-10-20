import { beforeEach, describe, expect, it } from 'vitest';
import {
  CHECKFIT_POLICY_VERSION,
  checkfitStorageKey,
  clearCheckfitSnapshot,
  readCheckfitSnapshot,
  saveCheckfitSnapshot,
  type CheckfitSnapshot,
} from '../distributionCheckfitStorage';

function buildSnapshot(overrides: Partial<CheckfitSnapshot> = {}): CheckfitSnapshot {
  return {
    version: 1,
    savedAt: '2026-10-19T09:00:00.000Z',
    policyVersion: CHECKFIT_POLICY_VERSION,
    inputs: { grossMonthlyIncome: 50_000, monthlyDebts: 5_000, deposit: 100_000 },
    assumptions: {
      annualInterestRate: 10.5,
      rateUpdatedAt: '2026-10-01T00:00:00.000Z',
      termMonths: 240,
      repaymentAllowanceRatio: 0.3,
    },
    result: {
      repaymentAllowanceMonthly: 10_000,
      estimatedLoanAmount: 922_759,
      estimatedPurchasePrice: 1_022_759,
    },
    disclaimers: ['Indicative estimate only. Not a final bond approval.'],
    ...overrides,
  };
}

describe('distribution check-fit browser storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  it('round-trips a valid snapshot', () => {
    saveCheckfitSnapshot(buildSnapshot());
    const stored = readCheckfitSnapshot();
    expect(stored).not.toBeNull();
    expect(stored?.inputs).toEqual({
      grossMonthlyIncome: 50_000,
      monthlyDebts: 5_000,
      deposit: 100_000,
    });
    expect(stored?.result.estimatedPurchasePrice).toBe(1_022_759);
    expect(stored?.policyVersion).toBe(CHECKFIT_POLICY_VERSION);
  });

  it('rejects malformed, mismatched-version, and out-of-range payloads', () => {
    window.localStorage.setItem(checkfitStorageKey(), '{not valid json');
    expect(readCheckfitSnapshot()).toBeNull();

    window.localStorage.setItem(
      checkfitStorageKey(),
      JSON.stringify(buildSnapshot({ version: 2 as unknown as 1 })),
    );
    expect(readCheckfitSnapshot()).toBeNull();

    window.localStorage.setItem(
      checkfitStorageKey(),
      JSON.stringify({ ...buildSnapshot(), policyVersion: 'checkfit_v0' }),
    );
    expect(readCheckfitSnapshot()).toBeNull();

    const zeroIncome = buildSnapshot();
    zeroIncome.inputs.grossMonthlyIncome = 0;
    window.localStorage.setItem(checkfitStorageKey(), JSON.stringify(zeroIncome));
    expect(readCheckfitSnapshot()).toBeNull();

    const badAssumptions = buildSnapshot();
    badAssumptions.assumptions.repaymentAllowanceRatio = 2;
    window.localStorage.setItem(checkfitStorageKey(), JSON.stringify(badAssumptions));
    expect(readCheckfitSnapshot()).toBeNull();
  });

  it('ignores oversized raw payloads instead of parsing them', () => {
    window.localStorage.setItem(checkfitStorageKey(), 'x'.repeat(20_001));
    expect(readCheckfitSnapshot()).toBeNull();
  });

  it('clears the snapshot from both storage areas', () => {
    saveCheckfitSnapshot(buildSnapshot());
    clearCheckfitSnapshot();
    expect(window.localStorage.getItem(checkfitStorageKey())).toBeNull();
    expect(window.sessionStorage.getItem(checkfitStorageKey())).toBeNull();
    expect(readCheckfitSnapshot()).toBeNull();
  });
});
