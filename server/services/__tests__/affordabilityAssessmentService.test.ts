import { describe, expect, it } from 'vitest';
import { TRPCError } from '@trpc/server';
import { calculateAffordabilityOutputs } from '../affordabilityAssessmentService';

describe('affordabilityAssessmentService.calculateAffordabilityOutputs', () => {
  it('returns deterministic amortization outputs for fixed inputs', () => {
    const result = calculateAffordabilityOutputs({
      grossIncomeMonthly: 50000,
      deductionsMonthly: 2500,
      depositAmount: 100000,
      assumptions: {
        interestRateAnnual: 11.75,
        termMonths: 240,
        maxRepaymentRatio: 0.3,
      },
    });

    expect(result.assumptions.calcVersion).toBe('v1');
    expect(result.outputs.maxMonthlyRepayment).toBe(15000);
    expect(result.outputs.indicativeLoanAmount).toBe(1384138);
    expect(result.outputs.purchasePrice).toBe(1484138);
    expect(result.outputs.indicativePurchaseMin).toBe(1484138);
    expect(result.outputs.indicativePurchaseMax).toBe(1484138);
    expect(result.outputs.confidenceLabel).toBe('Indicative — needs credit verification');
  });

  it('throws validation error when assumptions are invalid', () => {
    const execute = () =>
      calculateAffordabilityOutputs({
        grossIncomeMonthly: 50000,
        assumptions: {
          interestRateAnnual: 0,
          termMonths: 240,
          maxRepaymentRatio: 0.3,
        },
      });

    expect(execute).toThrow(TRPCError);
    expect(execute).toThrow(/interestRateAnnual/);
  });
});
