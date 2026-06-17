import { describe, expect, it } from 'vitest';

import {
  assertEvidenceArtifactReviewTransition,
  assertEvidenceRoleForTransaction,
  buildDevelopmentEvidenceCoverageSummary,
  getDefaultReviewOwnerForEvidence,
  getEvidenceArtifactEventType,
  getEvidenceArtifactReviewEventType,
} from '../dleEvidenceArtifactService';

describe('dleEvidenceArtifactService helpers', () => {
  it('accepts Rental evidence roles only for Rental leads', () => {
    expect(assertEvidenceRoleForTransaction('for_rent', 'proof_of_income')).toBe(
      'proof_of_income',
    );
    expect(assertEvidenceRoleForTransaction('for_rent', 'signed_lease')).toBe('signed_lease');

    expect(() => assertEvidenceRoleForTransaction('for_rent', 'proof_of_funds')).toThrow(
      'Selected evidence role is not valid for Rental leads.',
    );
  });

  it('accepts Auction evidence roles only for Auction leads', () => {
    expect(assertEvidenceRoleForTransaction('auction', 'proof_of_funds')).toBe('proof_of_funds');
    expect(assertEvidenceRoleForTransaction('auction', 'bidder_registration')).toBe(
      'bidder_registration',
    );

    expect(() => assertEvidenceRoleForTransaction('auction', 'signed_lease')).toThrow(
      'Selected evidence role is not valid for Auction leads.',
    );
  });

  it('keeps review ownership transaction-native', () => {
    expect(getDefaultReviewOwnerForEvidence('for_rent')).toBe('leasing_team');
    expect(getDefaultReviewOwnerForEvidence('auction')).toBe('auction_team');
  });

  it('maps first-slice evidence statuses to operating-event types', () => {
    expect(getEvidenceArtifactEventType('requested')).toBe('evidence_artifact_requested');
    expect(getEvidenceArtifactEventType('submitted')).toBe('evidence_artifact_submitted');
  });

  it('maps review statuses to operating-event types', () => {
    expect(getEvidenceArtifactReviewEventType('under_review')).toBe(
      'evidence_artifact_review_started',
    );
    expect(getEvidenceArtifactReviewEventType('accepted')).toBe('evidence_artifact_accepted');
    expect(getEvidenceArtifactReviewEventType('rejected')).toBe('evidence_artifact_rejected');
  });

  it('allows review transitions without allowing requested evidence to be accepted directly', () => {
    expect(() =>
      assertEvidenceArtifactReviewTransition({
        fromStatus: 'submitted',
        toStatus: 'under_review',
      }),
    ).not.toThrow();
    expect(() =>
      assertEvidenceArtifactReviewTransition({
        fromStatus: 'under_review',
        toStatus: 'accepted',
      }),
    ).not.toThrow();
    expect(() =>
      assertEvidenceArtifactReviewTransition({
        fromStatus: 'submitted',
        toStatus: 'rejected',
      }),
    ).not.toThrow();

    expect(() =>
      assertEvidenceArtifactReviewTransition({
        fromStatus: 'requested',
        toStatus: 'accepted',
      }),
    ).toThrow('Evidence can only be accepted or rejected after submission or review start.');
  });

  it('summarizes Rental accepted coverage across active leads without readiness automation', () => {
    expect(
      buildDevelopmentEvidenceCoverageSummary({
        transactionType: 'for_rent',
        leads: [
          {
            leadId: 1,
            acceptedRoles: ['proof_of_income'],
          },
          {
            leadId: 2,
            acceptedRoles: ['proof_of_income', 'deposit_readiness', 'signed_lease'],
          },
          {
            leadId: 3,
            acceptedRoles: [],
          },
        ],
      }),
    ).toMatchObject({
      title: 'Rental evidence coverage',
      statusLabel: '1 lead with complete accepted coverage',
      totalActiveLeadCount: 3,
      completeLeadCount: 1,
      partialLeadCount: 1,
      noAcceptedLeadCount: 1,
      acceptedRoleCounts: [
        { role: 'proof_of_income', label: 'Proof of income', count: 2 },
        { role: 'deposit_readiness', label: 'Deposit readiness', count: 1 },
        { role: 'signed_lease', label: 'Lease review', count: 1 },
      ],
      missingRoleCounts: [
        { role: 'proof_of_income', label: 'Proof of income', count: 1 },
        { role: 'deposit_readiness', label: 'Deposit readiness', count: 2 },
        { role: 'signed_lease', label: 'Lease review', count: 2 },
      ],
      guardrail:
        'Coverage is not verified lease readiness, inventory let status, or distribution payout readiness.',
    });
  });

  it('summarizes Auction accepted coverage without bidder-readiness claims', () => {
    expect(
      buildDevelopmentEvidenceCoverageSummary({
        transactionType: 'auction',
        leads: [
          {
            leadId: 10,
            acceptedRoles: [
              'legal_pack_acknowledgement',
              'proof_of_funds',
              'bidder_registration',
            ],
          },
        ],
      }),
    ).toMatchObject({
      title: 'Auction evidence coverage',
      statusLabel: '1 lead with complete accepted coverage',
      totalActiveLeadCount: 1,
      completeLeadCount: 1,
      partialLeadCount: 0,
      noAcceptedLeadCount: 0,
      missingRoleCounts: [
        { role: 'legal_pack_acknowledgement', label: 'Legal-pack access', count: 0 },
        { role: 'proof_of_funds', label: 'Proof of funds', count: 0 },
        { role: 'bidder_registration', label: 'Registration review', count: 0 },
      ],
      guardrail:
        'Coverage is not verified bidder registration, proof-of-funds readiness, winning-bid status, or distribution payout readiness.',
    });
  });
});
