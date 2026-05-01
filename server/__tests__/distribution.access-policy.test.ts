import { describe, expect, it } from 'vitest';

import {
  buildOpportunityReadiness,
  deriveInventoryState,
  summarizeDistributionBlockers,
  type DevelopmentDistributionAccessEvaluation,
} from '../services/distributionAccessPolicy';

function buildEvaluation(
  overrides: Partial<DevelopmentDistributionAccessEvaluation> = {},
): DevelopmentDistributionAccessEvaluation {
  return {
    brandProfileId: 10,
    brandPartnershipId: 20,
    brandPartnershipStatus: 'active',
    developmentAccessId: 30,
    developmentAccessStatus: 'included',
    developmentVisible: true,
    brandPartnered: true,
    developmentIncluded: true,
    submissionAllowed: true,
    excludedByMandate: false,
    excludedByExclusivity: false,
    programExists: true,
    programId: 40,
    programActive: true,
    referralEnabled: true,
    readiness: {
      configured: true,
      ready: true,
      reasons: [],
    },
    inventoryState: 'enabled',
    submitReady: true,
    reasons: [],
    opportunity: {
      status: 'ready',
      reasonCodes: [],
      nextAction: 'submit_referral',
      friendlyMessage: 'Ready for buyer referrals.',
    },
    legacyFallbackUsed: false,
    ...overrides,
  };
}

describe('distribution access policy', () => {
  it('derives listed state when partnership is not active', () => {
    expect(
      deriveInventoryState({
        developmentVisible: true,
        brandPartnershipStatus: 'pending',
        developmentAccessStatus: 'included',
        submissionAllowed: true,
        readinessReady: true,
        referralEnabled: true,
        excludedByMandate: false,
        excludedByExclusivity: false,
      }),
    ).toBe('listed');
  });

  it('derives accessible state when included access exists but readiness is not complete', () => {
    expect(
      deriveInventoryState({
        developmentVisible: true,
        brandPartnershipStatus: 'active',
        developmentAccessStatus: 'included',
        submissionAllowed: true,
        readinessReady: false,
        referralEnabled: false,
        excludedByMandate: false,
        excludedByExclusivity: false,
      }),
    ).toBe('accessible');
  });

  it('derives ready state when readiness passes but referral enablement is still off', () => {
    expect(
      deriveInventoryState({
        developmentVisible: true,
        brandPartnershipStatus: 'active',
        developmentAccessStatus: 'included',
        submissionAllowed: true,
        readinessReady: true,
        referralEnabled: false,
        excludedByMandate: false,
        excludedByExclusivity: false,
      }),
    ).toBe('ready');
  });

  it('summarizes access, readiness, and program blockers separately', () => {
    const summary = summarizeDistributionBlockers(
      buildEvaluation({
        developmentAccessStatus: 'excluded',
        submissionAllowed: false,
        programActive: false,
        referralEnabled: false,
        readiness: {
          configured: true,
          ready: false,
          reasons: ['manager_missing', 'commission_missing'],
        },
        reasons: [
          'development_access_excluded',
          'submission_not_allowed',
          'program_inactive',
          'program_referral_disabled',
          'readiness_manager_missing',
          'readiness_commission_missing',
        ],
      }),
    );

    expect(summary.accessBlockers).toEqual(
      expect.arrayContaining(['development_access_excluded', 'submission_not_allowed']),
    );
    expect(summary.readinessBlockers).toEqual(
      expect.arrayContaining(['readiness_manager_missing', 'readiness_commission_missing']),
    );
    expect(summary.programBlockers).toEqual(
      expect.arrayContaining(['program_inactive', 'program_referral_disabled']),
    );
  });

  it('maps canonical blockers to referrer-safe opportunity metadata', () => {
    const opportunity = buildOpportunityReadiness({
      inventoryState: 'accessible',
      reasons: ['readiness_primaryManagerAssignment', 'readiness_requiredDocuments'],
    });

    expect(opportunity.status).toBe('pending_setup');
    expect(opportunity.reasonCodes).toEqual(
      expect.arrayContaining(['NO_MANAGER_ASSIGNED', 'REQUIRED_DOCS_MISSING']),
    );
    expect(opportunity.friendlyMessage).not.toContain('readiness_');
  });
});
