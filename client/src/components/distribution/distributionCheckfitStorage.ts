export const CHECKFIT_SNAPSHOT_VERSION = 1 as const;

/**
 * Only snapshots written under the currently supported policy version are
 * readable. A policy change requires a new snapshot version, so yesterday's
 * assumptions are never presented as today's result.
 */
export const CHECKFIT_POLICY_VERSION = 'checkfit_v1' as const;

export const CHECKFIT_RATE_SOURCE = 'sarb_prime_rate' as const;

export const CHECKFIT_RATE_SOURCE_LABEL = 'SARB prime rate (platform settings)' as const;

export function checkfitStorageKey() {
  return `property-listify:distribution-checkfit:v${CHECKFIT_SNAPSHOT_VERSION}:public`;
}

export type CheckfitInputs = {
  grossMonthlyIncome: number;
  monthlyDebts: number;
  deposit: number;
};

export type CheckfitSnapshot = {
  version: typeof CHECKFIT_SNAPSHOT_VERSION;
  savedAt: string;
  policyVersion: typeof CHECKFIT_POLICY_VERSION;
  inputs: CheckfitInputs;
  assumptions: {
    annualInterestRate: number;
    rateUpdatedAt: string | null;
    termMonths: number;
    repaymentAllowanceRatio: number;
  };
  result: {
    repaymentAllowanceMonthly: number;
    estimatedLoanAmount: number;
    estimatedPurchasePrice: number;
  };
  disclaimers: string[];
};

const MAX_INCOME = 100_000_000;
const MAX_OTHER = 1_000_000_000;
const MAX_RAW_LENGTH = 20_000;
const MAX_DISCLAIMERS = 4;

function isBoundedInteger(value: unknown, max: number, min = 0): value is number {
  return (
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
  );
}

function isFiniteAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isRate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 100;
}

function isRatio(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value <= 1;
}

function parseSnapshot(value: unknown): CheckfitSnapshot | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (record.version !== CHECKFIT_SNAPSHOT_VERSION) return null;
  if (typeof record.savedAt !== 'string' || !record.savedAt) return null;
  if (record.policyVersion !== CHECKFIT_POLICY_VERSION) return null;

  const inputs = record.inputs as Record<string, unknown> | undefined;
  if (
    !inputs ||
    !isBoundedInteger(inputs.grossMonthlyIncome, MAX_INCOME, 1) ||
    !isBoundedInteger(inputs.monthlyDebts, MAX_OTHER) ||
    !isBoundedInteger(inputs.deposit, MAX_OTHER)
  ) {
    return null;
  }

  const assumptions = record.assumptions as Record<string, unknown> | undefined;
  if (
    !assumptions ||
    !isRate(assumptions.annualInterestRate) ||
    (assumptions.rateUpdatedAt !== null && typeof assumptions.rateUpdatedAt !== 'string') ||
    !isBoundedInteger(assumptions.termMonths, 600, 1) ||
    !isRatio(assumptions.repaymentAllowanceRatio)
  ) {
    return null;
  }

  const result = record.result as Record<string, unknown> | undefined;
  if (
    !result ||
    !isFiniteAmount(result.repaymentAllowanceMonthly) ||
    !isFiniteAmount(result.estimatedLoanAmount) ||
    !isFiniteAmount(result.estimatedPurchasePrice)
  ) {
    return null;
  }

  const disclaimers = Array.isArray(record.disclaimers)
    ? record.disclaimers
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
        .slice(0, MAX_DISCLAIMERS)
        .map(item => item.slice(0, 1000))
    : [];

  return {
    version: CHECKFIT_SNAPSHOT_VERSION,
    savedAt: record.savedAt.slice(0, 60),
    policyVersion: CHECKFIT_POLICY_VERSION,
    inputs: {
      grossMonthlyIncome: inputs.grossMonthlyIncome,
      monthlyDebts: inputs.monthlyDebts,
      deposit: inputs.deposit,
    },
    assumptions: {
      annualInterestRate: assumptions.annualInterestRate,
      rateUpdatedAt:
        typeof assumptions.rateUpdatedAt === 'string'
          ? assumptions.rateUpdatedAt.slice(0, 60)
          : null,
      termMonths: assumptions.termMonths,
      repaymentAllowanceRatio: assumptions.repaymentAllowanceRatio,
    },
    result: {
      repaymentAllowanceMonthly: result.repaymentAllowanceMonthly,
      estimatedLoanAmount: result.estimatedLoanAmount,
      estimatedPurchasePrice: result.estimatedPurchasePrice,
    },
    disclaimers,
  };
}

export function readCheckfitSnapshot(): CheckfitSnapshot | null {
  if (typeof window === 'undefined') return null;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(checkfitStorageKey());
  } catch {
    // Continue with the tab-scoped fallback when persistent storage is unavailable.
  }
  if (!raw) {
    try {
      raw = window.sessionStorage.getItem(checkfitStorageKey());
      if (raw) window.localStorage.setItem(checkfitStorageKey(), raw);
    } catch {
      // The snapshot remains unavailable when browser storage is unavailable.
    }
  }
  if (!raw || raw.length > MAX_RAW_LENGTH) return null;
  try {
    return parseSnapshot(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveCheckfitSnapshot(snapshot: CheckfitSnapshot): void {
  if (typeof window === 'undefined') return;
  const parsed = parseSnapshot(snapshot);
  if (!parsed) return;
  const raw = JSON.stringify(parsed);
  try {
    window.localStorage.setItem(checkfitStorageKey(), raw);
  } catch {
    try {
      window.sessionStorage.setItem(checkfitStorageKey(), raw);
    } catch {
      // Keep the check-fit usable when browser storage is unavailable.
    }
  }
}

export function clearCheckfitSnapshot(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(checkfitStorageKey());
  } catch {
    // Nothing further to clear.
  }
  try {
    window.sessionStorage.removeItem(checkfitStorageKey());
  } catch {
    // Nothing further to clear.
  }
}
