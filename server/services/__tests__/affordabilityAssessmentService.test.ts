import { describe, expect, it } from 'vitest';
import { TRPCError } from '@trpc/server';
import { calculateAffordabilityOutputs } from '../affordabilityAssessmentService';

describe('affordabilityAssessmentService.calculateAffordabilityOutputs', () => {
  it('fails closed while the affordability policy is unapproved', () => {
    const execute = () => calculateAffordabilityOutputs({
      grossIncomeMonthly: 50000,
      deductionsMonthly: 2500,
      depositAmount: 100000,
      assumptions: {
        interestRateAnnual: 11.75,
        termMonths: 240,
        maxRepaymentRatio: 0.3,
      },
    });

    expect(execute).toThrow(TRPCError);
    expect(execute).toThrow(/Income-based opportunity matching is not available yet/);
  });

  it('does not validate an unapproved model before it is enabled', () => {
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
    expect(execute).toThrow(/agreed loan term and repayment allowance/);
  });
});
