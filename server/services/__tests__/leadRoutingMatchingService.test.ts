import { describe, expect, it } from 'vitest';
import {
  estimateMinimumMonthlyIncome,
  isDevelopmentEligibleForLeadRouting,
  matchDevelopments,
  scoreDevelopmentMatch,
  type DevelopmentMatchingCandidate,
} from '../leadRoutingMatchingService';

const profile = {
  grossMonthlyIncome: 28_000,
  grossMonthlyIncomeRange: 'R25,000 - R35,000',
  buyingMode: 'solo' as const,
  preferredProvince: 'Gauteng',
  preferredCity: 'Johannesburg South',
  creditReportStatus: 'not_checked_recently' as const,
};

const baseCandidate: DevelopmentMatchingCandidate = {
  id: 1,
  name: 'Sky City',
  province: 'Gauteng',
  city: 'Johannesburg South',
  suburb: 'Alberton',
  priceFrom: 650_000,
  isPublished: true,
  approvalStatus: 'approved',
  status: 'selling',
  campaignEligible: true,
  campaignPriority: 7,
  distributionReady: true,
  submissionAllowed: true,
  leadRoutingEnabled: true,
  hasMedia: true,
};

describe('leadRoutingMatchingService', () => {
  it('estimates minimum income from development price when no explicit income exists', () => {
    expect(estimateMinimumMonthlyIncome({ id: 1, priceFrom: 650_000 })).toBe(22_750);
    expect(estimateMinimumMonthlyIncome({ id: 1, estimatedMinIncome: 24_000 })).toBe(24_000);
  });

  it('filters developments that should not enter buyer-facing routing', () => {
    expect(isDevelopmentEligibleForLeadRouting(baseCandidate)).toBe(true);
    expect(isDevelopmentEligibleForLeadRouting({ ...baseCandidate, isPublished: false })).toBe(
      false,
    );
    expect(isDevelopmentEligibleForLeadRouting({ ...baseCandidate, status: 'sold-out' })).toBe(
      false,
    );
    expect(
      isDevelopmentEligibleForLeadRouting({ ...baseCandidate, leadRoutingEnabled: false }),
    ).toBe(false);
  });

  it('scores a strong location, income, campaign, and distribution match', () => {
    const match = scoreDevelopmentMatch({ profile, candidate: baseCandidate });

    expect(match).toMatchObject({
      developmentId: 1,
      label: 'good_match',
      incomeEligible: true,
      locationMatch: true,
      campaignEligible: true,
      distributionReady: true,
      submissionAllowed: true,
    });
    expect(match?.score).toBeGreaterThanOrEqual(90);
    expect(match?.reasons.map(reason => reason.code)).toContain('city_match');
  });

  it('keeps non-distribution-ready developments matchable for review', () => {
    const match = scoreDevelopmentMatch({
      profile,
      candidate: {
        ...baseCandidate,
        id: 2,
        distributionReady: false,
        submissionAllowed: false,
      },
    });

    expect(match).not.toBeNull();
    expect(match).toMatchObject({
      developmentId: 2,
      distributionReady: false,
      submissionAllowed: false,
    });
  });

  it('sorts by score and applies the result limit', () => {
    const matches = matchDevelopments({
      profile,
      limit: 2,
      candidates: [
        { ...baseCandidate, id: 3, city: 'Pretoria', campaignEligible: false, campaignPriority: 0 },
        { ...baseCandidate, id: 1 },
        { ...baseCandidate, id: 2, priceFrom: 1_200_000, campaignPriority: 0 },
      ],
    });

    expect(matches).toHaveLength(2);
    expect(matches[0].developmentId).toBe(1);
    expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
  });
});
