import { describe, expect, it } from 'vitest';

import { partnerTypeLabels } from './DistributionReferralApplyPage';

describe('DistributionReferralApplyPage applicant type copy', () => {
  it('uses transaction-neutral individual referral language', () => {
    expect(partnerTypeLabels.individual).toBe('Individual With Qualified Referral');
    expect(partnerTypeLabels.individual).not.toMatch(/buyer/i);
  });
});
