import { describe, expect, it } from 'vitest';

import { computeChecklistSummary } from './ManagerDealChecklistPage';

describe('ManagerDealChecklistPage checklist summary', () => {
  it('does not mark payout ready locally when a server milestone blocker remains', () => {
    const summary = computeChecklistSummary({
      requiredDocuments: [
        { isRequired: true, status: 'verified' },
        { isRequired: true, status: 'verified' },
      ],
      computed: {
        payoutReady: false,
        blockers: ['Payout milestone requires the deal to reach bond approval.'],
        programmeSemantics: { automationAllowed: false },
        manualReadinessReviews: [{ reviewType: 'rental_lease_readiness', status: 'accepted' }],
      },
    });

    expect(summary).toMatchObject({
      requiredCount: 2,
      verifiedRequiredCount: 2,
      allRequiredVerified: true,
      payoutReady: false,
      blockers: ['Payout milestone requires the deal to reach bond approval.'],
      programmeSemantics: { automationAllowed: false },
      manualReadinessReviews: [{ reviewType: 'rental_lease_readiness', status: 'accepted' }],
    });
  });

  it('downgrades payout readiness locally when a required document is no longer verified', () => {
    const summary = computeChecklistSummary({
      requiredDocuments: [
        { isRequired: true, status: 'verified' },
        { isRequired: true, status: 'received' },
      ],
      computed: {
        payoutReady: true,
        blockers: [],
      },
    });

    expect(summary).toMatchObject({
      requiredCount: 2,
      verifiedRequiredCount: 1,
      allRequiredVerified: false,
      payoutReady: false,
      blockers: ['1 required document still need verification.'],
    });
  });
});
