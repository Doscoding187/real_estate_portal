import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { platformSettings } from '../../drizzle/schema';
import { getDb } from '../db';

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/**
 * Versioned purchase-affordability assumptions for the public check-fit tool.
 * The interest rate is deliberately not part of this constant: the baseline is
 * the current SARB prime rate from canonical platform settings, with no added
 * risk margin. The oracle for every other factor (term, repayment allowance)
 * lives here so a policy change requires a new version.
 */
export const CHECKFIT_V1_POLICY = Object.freeze({
  version: 'checkfit_v1' as const,
  termMonths: 240,
  repaymentAllowanceRatio: 0.3,
  rateSourceKey: 'sarb_prime_rate',
  rateSourceLabel: 'SARB prime rate (platform settings)',
});

export const CHECKFIT_V1_DISCLAIMERS = Object.freeze([
  'Indicative estimate only. Not a final bond approval.',
  'This is an indicative estimate based on information you provide and stated assumptions. It is not a credit decision, lending decision, guaranteed finance offer, or bond approval. A lender or authorised financial provider makes its own assessment.',
]);

export const checkfitV1InputSchema = z.object({
  grossMonthlyIncome: z.number().int().positive().max(100_000_000),
  monthlyDebts: z.number().int().min(0).max(1_000_000_000).default(0),
  deposit: z.number().int().min(0).max(1_000_000_000).default(0),
});

export type CheckfitV1Input = z.input<typeof checkfitV1InputSchema>;

export type CheckfitV1Assumptions = {
  annualInterestRate: number;
  rateSource: typeof CHECKFIT_V1_POLICY.rateSourceKey;
  rateSourceLabel: string;
  rateUpdatedAt: string | null;
  termMonths: number;
  repaymentAllowanceRatio: number;
};

export type CheckfitV1AvailableResult = {
  available: true;
  policyVersion: typeof CHECKFIT_V1_POLICY.version;
  assumptions: CheckfitV1Assumptions;
  inputs: {
    grossMonthlyIncome: number;
    monthlyDebts: number;
    deposit: number;
  };
  result: {
    repaymentAllowanceMonthly: number;
    estimatedLoanAmount: number;
    estimatedPurchasePrice: number;
  };
  disclaimers: string[];
};

export type CheckfitV1Outcome =
  | CheckfitV1AvailableResult
  | {
      available: false;
      policyVersion: typeof CHECKFIT_V1_POLICY.version;
      unavailableReason: 'prime_rate_unavailable';
      disclaimers: string[];
    };

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateCheckfitV1(input: {
  grossMonthlyIncome: number;
  monthlyDebts: number;
  deposit: number;
  annualInterestRate: number;
  rateUpdatedAt: string | null;
}): CheckfitV1AvailableResult {
  const repaymentAllowanceMonthly = roundToCents(
    Math.max(
      0,
      input.grossMonthlyIncome * CHECKFIT_V1_POLICY.repaymentAllowanceRatio - input.monthlyDebts,
    ),
  );
  const monthlyRate = input.annualInterestRate / 100 / 12;
  const growth = Math.pow(1 + monthlyRate, CHECKFIT_V1_POLICY.termMonths);
  const annuityFactor = (growth - 1) / (monthlyRate * growth);
  const estimatedLoanAmount = Math.round(repaymentAllowanceMonthly * annuityFactor);
  const estimatedPurchasePrice = estimatedLoanAmount + input.deposit;

  return {
    available: true,
    policyVersion: CHECKFIT_V1_POLICY.version,
    assumptions: {
      annualInterestRate: input.annualInterestRate,
      rateSource: CHECKFIT_V1_POLICY.rateSourceKey,
      rateSourceLabel: CHECKFIT_V1_POLICY.rateSourceLabel,
      rateUpdatedAt: input.rateUpdatedAt,
      termMonths: CHECKFIT_V1_POLICY.termMonths,
      repaymentAllowanceRatio: CHECKFIT_V1_POLICY.repaymentAllowanceRatio,
    },
    inputs: {
      grossMonthlyIncome: input.grossMonthlyIncome,
      monthlyDebts: input.monthlyDebts,
      deposit: input.deposit,
    },
    result: {
      repaymentAllowanceMonthly,
      estimatedLoanAmount,
      estimatedPurchasePrice,
    },
    disclaimers: [...CHECKFIT_V1_DISCLAIMERS],
  };
}

/**
 * The authoritative baseline is the canonical platform setting. A missing or
 * malformed rate is not replaced with a guessed default; the caller returns a
 * clear unavailable state instead.
 */
export async function resolveCheckfitV1Rate(db: DbHandle): Promise<{
  annualInterestRate: number;
  rateUpdatedAt: string | null;
} | null> {
  const [row] = await db
    .select({
      settingValue: platformSettings.settingValue,
      updatedAt: platformSettings.updatedAt,
    })
    .from(platformSettings)
    .where(eq(platformSettings.settingKey, CHECKFIT_V1_POLICY.rateSourceKey))
    .limit(1);

  if (!row) return null;

  const annualInterestRate = Number.parseFloat(String(row.settingValue ?? '').trim());
  if (!Number.isFinite(annualInterestRate) || annualInterestRate <= 0) return null;

  const updatedAt = row.updatedAt;
  return {
    annualInterestRate,
    rateUpdatedAt:
      updatedAt instanceof Date
        ? updatedAt.toISOString()
        : updatedAt
          ? String(updatedAt)
          : null,
  };
}

export async function runCheckfitV1(params: {
  db: DbHandle;
  input: CheckfitV1Input;
}): Promise<CheckfitV1Outcome> {
  const rate = await resolveCheckfitV1Rate(params.db);
  if (!rate) {
    return {
      available: false,
      policyVersion: CHECKFIT_V1_POLICY.version,
      unavailableReason: 'prime_rate_unavailable',
      disclaimers: [...CHECKFIT_V1_DISCLAIMERS],
    };
  }

  return calculateCheckfitV1({
    grossMonthlyIncome: params.input.grossMonthlyIncome,
    monthlyDebts: params.input.monthlyDebts ?? 0,
    deposit: params.input.deposit ?? 0,
    annualInterestRate: rate.annualInterestRate,
    rateUpdatedAt: rate.rateUpdatedAt,
  });
}
