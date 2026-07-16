import { describe, expect, it } from 'vitest';
import {
  assertListingPublicationEntitled,
  ListingPublicationEntitlementError,
  resolveListingCommercialOwner,
} from '../listingPublicationEntitlementService';

class QueuedDb {
  constructor(private readonly results: any[][]) {}

  select() {
    const result = this.results.shift() || [];
    const chain: any = {
      from: () => chain,
      leftJoin: () => chain,
      where: () => chain,
      limit: () => Promise.resolve(result),
      then: (resolve: (value: any[]) => unknown) => Promise.resolve(result).then(resolve),
    };
    return chain;
  }
}

const agencyListing = { id: 10, ownerId: 100, agencyId: 77, agentId: null };
const agencyOwner = { id: 100, role: 'agency_admin', agencyId: 77 };
const completeAgency = {
  id: 77,
  name: 'Pilot Agency',
  email: 'hello@pilot.example',
  city: 'Cape Town',
  province: 'Western Cape',
};
const completeBranding = {
  companyName: 'Pilot Agency',
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
};
const agencyPublishingPlan = { id: 1, segment: 'agency', isActive: 1 };
const publishingEntitlements = [{ featureKey: 'max_active_listings', valueJson: 1 }];
const at = new Date('2026-07-16T10:00:00.000Z');

function agencyDb(input: {
  listing?: Record<string, unknown>;
  owner?: Record<string, unknown>;
  agent?: Record<string, unknown> | null;
  subscription?: Record<string, unknown> | null;
  plan?: Record<string, unknown> | null;
  entitlements?: Array<Record<string, unknown>>;
}) {
  const listing = { ...agencyListing, ...(input.listing || {}) };
  const results: any[][] = [[listing], [{ ...agencyOwner, ...(input.owner || {}) }]];
  if (listing.agentId) results.push([input.agent || { id: listing.agentId, agencyId: 77 }]);
  results.push([completeAgency], [completeBranding]);
  results.push(
    [
      input.subscription
        ? {
            subscription: input.subscription,
            plan: input.plan === undefined ? agencyPublishingPlan : input.plan,
          }
        : undefined,
    ].filter(Boolean),
  );
  if (input.subscription && input.plan !== null) {
    results.push(input.entitlements === undefined ? publishingEntitlements : input.entitlements);
  }
  return new QueuedDb(results);
}

async function expectAgencyDenied(
  input: Parameters<typeof agencyDb>[0],
  reason: ListingPublicationEntitlementError['reason'],
) {
  await expect(
    assertListingPublicationEntitled(agencyDb(input), { listingId: 10, operation: 'submit', at }),
  ).rejects.toMatchObject<ListingPublicationEntitlementError>({ reason });
}

describe('listing publication entitlement service', () => {
  it('allows a paid agency principal with a valid agency publishing plan', async () => {
    await expect(
      assertListingPublicationEntitled(
        agencyDb({ subscription: { status: 'active', cancelAtPeriodEnd: 0 } }),
        { listingId: 10, operation: 'submit', at },
      ),
    ).resolves.toMatchObject({ kind: 'agency', agencyId: 77 });
  });

  it('allows an agency agent to inherit the paid agency entitlement', async () => {
    const agentListing = { id: 11, ownerId: 101, agencyId: 77, agentId: 44 };
    await expect(
      assertListingPublicationEntitled(
        agencyDb({
          listing: agentListing,
          owner: { id: 101, role: 'agent', agencyId: 77 },
          agent: { id: 44, userId: 101, agencyId: 77 },
          subscription: { status: 'active', cancelAtPeriodEnd: 0 },
        }),
        { listingId: 11, operation: 'submit', at },
      ),
    ).resolves.toMatchObject({ kind: 'agency', agencyId: 77, responsibleAgentId: 44 });
  });

  it('denies an agency with no canonical subscription', async () => {
    await expectAgencyDenied({}, 'subscription_required');
  });

  it('denies pending, suspended, and explicitly expired agency subscriptions', async () => {
    await expectAgencyDenied(
      { subscription: { status: 'payment_under_review' } },
      'subscription_pending_payment',
    );
    await expectAgencyDenied({ subscription: { status: 'suspended' } }, 'subscription_suspended');
    await expectAgencyDenied({ subscription: { status: 'expired' } }, 'subscription_expired');
  });

  it('denies an active agency subscription whose dated period has ended', async () => {
    await expectAgencyDenied(
      {
        subscription: {
          status: 'active',
          cancelAtPeriodEnd: 0,
          currentPeriodEnd: '2026-07-16T09:59:59.000Z',
        },
      },
      'subscription_period_ended',
    );
  });

  it('accepts a valid agency grace period', async () => {
    await expect(
      assertListingPublicationEntitled(
        agencyDb({
          subscription: {
            status: 'grace_period',
            graceEndsAt: '2026-07-17T10:00:00.000Z',
          },
        }),
        { listingId: 10, operation: 'submit', at },
      ),
    ).resolves.toMatchObject({ kind: 'agency', agencyId: 77 });
  });

  it('denies an agency grace period that has ended', async () => {
    await expectAgencyDenied(
      {
        subscription: {
          status: 'grace_period',
          graceEndsAt: '2026-07-16T09:59:59.000Z',
        },
      },
      'subscription_expired',
    );
  });

  it('denies agency subscriptions without a valid publishing plan', async () => {
    await expectAgencyDenied(
      { subscription: { status: 'active' }, plan: null },
      'subscription_plan_unresolved',
    );
    await expectAgencyDenied(
      {
        subscription: { status: 'active' },
        plan: { id: 2, segment: 'agent', isActive: 1 },
      },
      'subscription_plan_ineligible',
    );
    await expectAgencyDenied(
      {
        subscription: { status: 'active' },
        plan: { id: 3, segment: 'agency', isActive: 0 },
      },
      'subscription_plan_ineligible',
    );
    await expectAgencyDenied(
      {
        subscription: { status: 'active' },
        plan: agencyPublishingPlan,
        entitlements: [{ featureKey: 'max_active_listings', valueJson: 0 }],
      },
      'listing_capacity_exhausted',
    );
  });

  it('preserves an unexpired individual-agent trial without using agency billing', async () => {
    const future = new Date(at.getTime() + 86_400_000).toISOString();
    const db = new QueuedDb([
      [{ id: 12, ownerId: 200, agencyId: null, agentId: 45 }],
      [{ id: 200, role: 'agent', agencyId: null, emailVerified: 1 }],
      [
        {
          id: 45,
          userId: 200,
          agencyId: null,
          profileImage: 'a',
          areasServed: 'b',
          bio: 'c',
          phone: 'd',
          focus: 'sales',
          propertyTypes: 'house',
        },
      ],
      [{ id: 200, role: 'agent', agencyId: null, emailVerified: 1 }],
      [
        {
          id: 45,
          userId: 200,
          agencyId: null,
          profileImage: 'a',
          areasServed: 'b',
          bio: 'c',
          phone: 'd',
          focus: 'sales',
          propertyTypes: 'house',
        },
      ],
      [{ subscription: { status: 'trial', trialEndsAt: future }, plan: { id: 2 } }],
      publishingEntitlements,
    ]);

    await expect(
      assertListingPublicationEntitled(db, { listingId: 12, operation: 'submit', at }),
    ).resolves.toMatchObject({ kind: 'independent_agent', userId: 200 });
  });

  it('denies developer, prospect, and unassociated authenticated listing owners', async () => {
    for (const role of ['property_developer', 'prospect', 'buyer']) {
      const db = new QueuedDb([
        [{ id: 20, ownerId: 400, agencyId: null, agentId: null }],
        [{ id: 400, role, agencyId: null }],
      ]);
      await expect(resolveListingCommercialOwner(db, 20)).rejects.toBeInstanceOf(
        ListingPublicationEntitlementError,
      );
    }
  });

  it('fails closed for missing and conflicting commercial ownership', async () => {
    await expect(
      resolveListingCommercialOwner(new QueuedDb([[{ id: 21, ownerId: 999 }], []]), 21),
    ).rejects.toMatchObject({ reason: 'commercial_owner_unresolved' });

    const db = new QueuedDb([
      [{ id: 13, ownerId: 300, agencyId: 7, agentId: 99 }],
      [{ id: 300, role: 'agent', agencyId: 8 }],
      [{ id: 99, userId: 300, agencyId: 7 }],
    ]);
    await expect(resolveListingCommercialOwner(db, 13)).rejects.toMatchObject({
      reason: 'listing_ownership_inconsistent',
    });
  });

  it('uses valid stored agency ownership for a seller-converted listing without changing attribution', async () => {
    const db = agencyDb({
      listing: { sellerProspectId: 81 },
      subscription: { status: 'active', cancelAtPeriodEnd: 0 },
    });
    await expect(
      assertListingPublicationEntitled(db, { listingId: 10, operation: 'submit', at }),
    ).resolves.toMatchObject({ kind: 'agency', agencyId: 77 });
  });
});
