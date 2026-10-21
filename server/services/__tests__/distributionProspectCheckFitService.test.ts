import { describe, expect, it } from 'vitest';
import {
  buildProspectCheckFitMatches,
  calculateProspectCheckFit,
  PROSPECT_CHECK_FIT_DISCLAIMERS,
  PROSPECT_CHECK_FIT_POLICY,
  prospectCheckFitInputSchema,
  type QualifiedOpportunity,
} from '../distributionProspectCheckFitService';

function opportunity(
  overrides: Partial<QualifiedOpportunity> & { developmentId: number },
): QualifiedOpportunity {
  return {
    programId: overrides.developmentId + 1000,
    developmentName: `Development ${overrides.developmentId}`,
    city: 'Johannesburg',
    province: 'Gauteng',
    entryPrice: 1_000_000,
    currencyCode: 'ZAR',
    ...overrides,
  };
}

describe('prospect check fit policy', () => {
  it('applies the approved 240-month term, 30% allowance and prime rate source', () => {
    expect(PROSPECT_CHECK_FIT_POLICY.version).toBe('prospect_check_fit_v1');
    expect(PROSPECT_CHECK_FIT_POLICY.termMonths).toBe(240);
    expect(PROSPECT_CHECK_FIT_POLICY.repaymentAllowanceRatio).toBe(0.3);
    expect(PROSPECT_CHECK_FIT_POLICY.rateSourceKey).toBe('sarb_prime_rate');
    expect(PROSPECT_CHECK_FIT_POLICY.maxApplicants).toBe(2);
    expect(PROSPECT_CHECK_FIT_POLICY.approvalReference).toBe(
      'EDWARD-CHECKFIT-MODEL-2026-10-21',
    );
    expect(PROSPECT_CHECK_FIT_DISCLAIMERS[0]).toContain('Not a final bond approval');
  });

  it('accepts a single applicant income and rejects a missing income', () => {
    expect(
      prospectCheckFitInputSchema.parse({ grossIncomeMonthly: 45000 }),
    ).toMatchObject({ grossIncomeMonthly: 45000 });
    expect(() => prospectCheckFitInputSchema.parse({})).toThrow();
    expect(() =>
      prospectCheckFitInputSchema.parse({ grossIncomeMonthly: 0 }),
    ).toThrow();
  });

  it('calculates the indicative purchase price from the current prime rate', () => {
    const { assumptions, outputs } = calculateProspectCheckFit({
      grossIncomeMonthly: 50000,
      annualInterestRate: 10.5,
      rateUpdatedAt: '2026-10-01T00:00:00.000Z',
    });

    expect(assumptions).toMatchObject({
      policyVersion: 'prospect_check_fit_v1',
      annualInterestRate: 10.5,
      rateSource: 'sarb_prime_rate',
      termMonths: 240,
      repaymentAllowanceRatio: 0.3,
      applicantCount: 1,
      jointAssessment: false,
    });
    expect(outputs.combinedGrossIncomeMonthly).toBe(50000);
    expect(outputs.repaymentAllowanceMonthly).toBe(15000);
    expect(outputs.estimatedLoanAmount).toBe(1502434);
    expect(outputs.estimatedPurchasePrice).toBe(1502434);
  });

  it('assesses a joint application as one combined allowance', () => {
    const single = calculateProspectCheckFit({
      grossIncomeMonthly: 50000,
      annualInterestRate: 10.5,
      rateUpdatedAt: null,
    });
    const joint = calculateProspectCheckFit({
      grossIncomeMonthly: 30000,
      coApplicantGrossIncomeMonthly: 20000,
      annualInterestRate: 10.5,
      rateUpdatedAt: null,
    });

    expect(joint.assumptions.applicantCount).toBe(2);
    expect(joint.assumptions.jointAssessment).toBe(true);
    expect(joint.outputs.combinedGrossIncomeMonthly).toBe(50000);
    expect(joint.outputs.repaymentAllowanceMonthly).toBe(
      single.outputs.repaymentAllowanceMonthly,
    );
    expect(joint.outputs.estimatedPurchasePrice).toBe(
      single.outputs.estimatedPurchasePrice,
    );
  });

  it('qualifies the developments the prospect can reach and keeps the rest visible', () => {
    const matches = buildProspectCheckFitMatches(
      [
        opportunity({ developmentId: 1, entryPrice: 2_500_000 }),
        opportunity({ developmentId: 2, entryPrice: 1_200_000 }),
        opportunity({ developmentId: 3, entryPrice: 1_502_434 }),
        opportunity({ developmentId: 4, entryPrice: 0 }),
      ],
      1_502_434,
    );

    expect(matches.map(match => match.developmentId)).toEqual([2, 3, 1]);
    expect(matches.map(match => match.qualified)).toEqual([true, true, false]);
    expect(matches.map(match => match.matchRank)).toEqual([1, 2, 3]);
  });

  it('reports no qualified development when nothing is within reach', () => {
    const matches = buildProspectCheckFitMatches(
      [opportunity({ developmentId: 9, entryPrice: 4_000_000 })],
      1_502_434,
    );

    expect(matches).toHaveLength(1);
    expect(matches[0].qualified).toBe(false);
  });
});
