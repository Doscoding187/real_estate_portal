import { describe, expect, it } from 'vitest';
import { hasListingLeadAccess } from '../listingRouter';

describe('listingRouter.getLeads access guard', () => {
  it('allows listing owner access', () => {
    expect(
      hasListingLeadAccess({
        userRole: 'agent',
        userId: 7,
        listing: { ownerId: 7, agentId: 11, agencyId: 20 },
      }),
    ).toBe(true);
  });

  it('allows assigned agent access', () => {
    expect(
      hasListingLeadAccess({
        userRole: 'agent',
        userId: 9,
        actorAgentId: 44,
        listing: { ownerId: 101, agentId: 44, agencyId: 20 },
      }),
    ).toBe(true);
  });

  it('allows agency admin access for same agency', () => {
    expect(
      hasListingLeadAccess({
        userRole: 'agency_admin',
        userId: 5,
        userAgencyId: 20,
        listing: { ownerId: 100, agentId: null, agencyId: 20 },
      }),
    ).toBe(true);
  });

  it('allows agency admin when owner belongs to same agency', () => {
    expect(
      hasListingLeadAccess({
        userRole: 'agency_admin',
        userId: 6,
        userAgencyId: 77,
        listing: { ownerId: 200, agentId: null, agencyId: null, ownerAgencyId: 77 },
      }),
    ).toBe(true);
  });

  it('denies cross-tenant access', () => {
    expect(
      hasListingLeadAccess({
        userRole: 'agent',
        userId: 9,
        actorAgentId: 44,
        listing: { ownerId: 101, agentId: 55, agencyId: 20 },
      }),
    ).toBe(false);
  });

  it('allows super admin override', () => {
    expect(
      hasListingLeadAccess({
        userRole: 'super_admin',
        userId: 1,
        listing: { ownerId: 999, agentId: null, agencyId: null },
      }),
    ).toBe(true);
  });
});
