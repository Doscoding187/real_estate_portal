import { describe, expect, it } from 'vitest';
import { isPublicLandEligible } from '../landPublicService';

const eligible = (overrides = {}) => isPublicLandEligible({ listingStatus: 'approved', listingApprovalStatus: 'approved', reviewState: 'approved', authorityStatus: 'active', hasBlockingConflict: false, ...overrides });

describe('public Land eligibility', () => {
  it('requires the shared publication state and Land-specific approval', () => {
    expect(eligible()).toBe(true);
    expect(eligible({ listingStatus: 'draft' })).toBe(false);
    expect(eligible({ listingApprovalStatus: 'pending' })).toBe(false);
    expect(eligible({ reviewState: 'pending' })).toBe(false);
    expect(eligible({ reviewState: 'changes_requested' })).toBe(false);
    expect(eligible({ reviewState: 'rejected' })).toBe(false);
    expect(eligible({ reviewState: 'suspended' })).toBe(false);
    expect(eligible({ authorityStatus: 'expired' })).toBe(false);
  });

  it('excludes an unresolved high-severity conflict from public inventory rather than merely downgrading Passport', () => {
    expect(eligible({ hasBlockingConflict: true })).toBe(false);
  });
});
