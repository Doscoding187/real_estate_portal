import { TRPCError } from '@trpc/server';

/**
 * Purchase estimates remain disabled until the approved prime-based model has
 * explicit, versioned repayment and loan-term assumptions. Rental affordability
 * requires a separate model.
 */
export function requireApprovedAffordabilityModel(): never {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message:
      'Income-based opportunity matching is not available yet. Purchase estimates still need an agreed loan term and repayment allowance, and rental affordability needs its own rules.',
  });
}

export function requireCreditReportFlow(): never {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message:
      'Credit reports cannot be requested yet. An approved provider and a separate authorization process are not configured.',
  });
}

/**
 * Retain a fail-closed export for any stale internal caller. The previous
 * hard-coded rate, term, and repayment ratio are retired and must not produce
 * an affordability result.
 */
export function calculateAffordabilityOutputs(_input: {
  grossIncomeMonthly: number;
  deductionsMonthly?: number;
  depositAmount?: number;
  assumptions?: {
    interestRateAnnual?: number;
    termMonths?: number;
    maxRepaymentRatio?: number;
    calcVersion?: string;
  };
}): never {
  return requireApprovedAffordabilityModel();
}
