import { describe, expect, it } from 'vitest';
import { assertPublicLandSearchInput, isPublicLandEligible } from '../landPublicService';

const eligible = (overrides = {}) =>
  isPublicLandEligible({
    listingStatus: 'approved',
    listingApprovalStatus: 'approved',
    reviewState: 'approved',
    classification: 'residential_stand',
    authorityStatus: 'active',
    assetLifecycleStatus: 'active',
    hasBlockingConflict: false,
    hasCompletedMarketingImage: true,
    ...overrides,
  });

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
    expect(eligible({ assetLifecycleStatus: 'draft' })).toBe(false);
    expect(eligible({ classification: 'farm' })).toBe(false);
  });

  it('excludes an unresolved high-severity conflict from public inventory rather than merely downgrading Passport', () => {
    expect(eligible({ hasBlockingConflict: true })).toBe(false);
  });

  it('removes an expired mandate from public inventory and enquiry custody', () => {
    expect(eligible({ authorityExpiresAt: '2000-01-01 00:00:00' })).toBe(false);
    expect(eligible({ hasCompletedMarketingImage: false })).toBe(false);
  });

  it('enforces one complete geography authority before any database search can run', () => {
    expect(() => assertPublicLandSearchInput({})).toThrow(/Choose one Land geography authority/);
    expect(() => assertPublicLandSearchInput({ city: 'Johannesburg' })).toThrow(/both city and province/);
    expect(() => assertPublicLandSearchInput({ locationId: 'city:12', searchAreaId: 'area-1' })).toThrow(/cannot be combined/);
    expect(() => assertPublicLandSearchInput({ city: 'Johannesburg', province: 'Gauteng', minPrice: 2, maxPrice: 1 })).toThrow(/minimum price/);
    expect(() => assertPublicLandSearchInput({ locationId: 'city:12', minSize: Number.NaN })).toThrow(/positive finite/);
    expect(() => assertPublicLandSearchInput({ locationId: 'city:12' })).not.toThrow();
  });
});
