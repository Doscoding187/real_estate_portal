import { describe, expect, it } from 'vitest';

import {
  assertEvidenceArtifactReviewTransition,
  assertEvidenceRoleForTransaction,
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
});
