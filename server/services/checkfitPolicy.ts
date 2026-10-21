import { eq } from 'drizzle-orm';
import { platformSettings } from '../../drizzle/schema';
import { getDb } from '../db';

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;

/**
 * The one approved purchase-affordability rate source. The baseline is the
 * current SARB prime rate held in canonical platform settings, with no added
 * risk margin. Every check-fit policy reads it from here so the public tool,
 * the referrer prospect check fit and the published partner terms can never
 * drift apart.
 */
export const CHECKFIT_RATE_SOURCE_KEY = 'sarb_prime_rate';
export const CHECKFIT_RATE_SOURCE_LABEL = 'SARB prime rate (platform settings)';

export type CheckfitRate = {
  annualInterestRate: number;
  rateUpdatedAt: string | null;
};

export type PurchaseCapacityInput = {
  grossMonthlyIncome: number;
  monthlyDebts: number;
  annualInterestRate: number;
  termMonths: number;
  repaymentAllowanceRatio: number;
};

export type PurchaseCapacity = {
  repaymentAllowanceMonthly: number;
  estimatedLoanAmount: number;
};

function roundToCents(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * The repayment allowance is a share of gross income reduced by declared
 * monthly debts, capitalised over the agreed term at the agreed rate. A
 * missing or malformed rate is never replaced with a guessed default: the
 * caller must return a clear unavailable state instead.
 */
export function calculatePurchaseCapacity(input: PurchaseCapacityInput): PurchaseCapacity {
  const repaymentAllowanceMonthly = roundToCents(
    Math.max(
      0,
      input.grossMonthlyIncome * input.repaymentAllowanceRatio - input.monthlyDebts,
    ),
  );
  const monthlyRate = input.annualInterestRate / 100 / 12;
  const growth = Math.pow(1 + monthlyRate, input.termMonths);
  const annuityFactor = (growth - 1) / (monthlyRate * growth);

  return {
    repaymentAllowanceMonthly,
    estimatedLoanAmount: Math.round(repaymentAllowanceMonthly * annuityFactor),
  };
}

export async function resolveCheckfitRate(db: DbHandle): Promise<CheckfitRate | null> {
  const [row] = await db
    .select({
      settingValue: platformSettings.settingValue,
      updatedAt: platformSettings.updatedAt,
    })
    .from(platformSettings)
    .where(eq(platformSettings.settingKey, CHECKFIT_RATE_SOURCE_KEY))
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
