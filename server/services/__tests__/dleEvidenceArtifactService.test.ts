import { describe, expect, it } from 'vitest';

import {
  assertEvidenceRoleForTransaction,
  getDefaultReviewOwnerForEvidence,
  getEvidenceArtifactEventType,
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
});
