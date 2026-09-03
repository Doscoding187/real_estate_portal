import { describe, expect, it } from 'vitest';

import { canManageListingContent } from '../listingContentCustody';

const listing = {
  ownerId: 10,
  agentId: 20,
  agencyId: 30,
};

describe('generic Listing content custody', () => {
  it('keeps direct ownership and the super-admin break-glass path', () => {
    expect(
      canManageListingContent(listing, {
        userId: 10,
        role: 'agent',
        agencyId: null,
        agent: null,
      }),
    ).toBe(true);
    expect(
      canManageListingContent(listing, {
        userId: 99,
        role: 'super_admin',
        agencyId: null,
        agent: null,
      }),
    ).toBe(true);
  });

  it('allows an agency manager only for the Listing materialized to that agency', () => {
    expect(
      canManageListingContent(listing, {
        userId: 40,
        role: 'agency_admin',
        agencyId: 30,
        agent: null,
      }),
    ).toBe(true);
    expect(
      canManageListingContent(listing, {
        userId: 41,
        role: 'agency_admin',
        agencyId: 31,
        agent: null,
      }),
    ).toBe(false);
  });

  it('requires an approved, exactly assigned agent with a coherent agency claim', () => {
    const actor = {
      userId: 50,
      role: 'agent',
      agencyId: 30,
      agent: { id: 20, userId: 50, agencyId: 30, status: 'approved' },
    };

    expect(canManageListingContent(listing, actor)).toBe(true);
    expect(
      canManageListingContent(listing, {
        ...actor,
        agent: { ...actor.agent, agencyId: 31 },
      }),
    ).toBe(false);
    expect(
      canManageListingContent(listing, {
        ...actor,
        agent: { ...actor.agent, status: 'suspended' },
      }),
    ).toBe(false);
    expect(
      canManageListingContent(listing, {
        ...actor,
        agent: { ...actor.agent, id: 21 },
      }),
    ).toBe(false);
  });

  it('does not turn a missing agency claim into an agency-scoped assignment', () => {
    expect(
      canManageListingContent(
        { ...listing, agencyId: null },
        {
          userId: 50,
          role: 'agent',
          agencyId: 30,
          agent: { id: 20, userId: 50, agencyId: 30, status: 'approved' },
        },
      ),
    ).toBe(false);
  });
});
