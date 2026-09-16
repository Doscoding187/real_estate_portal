import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  assertListingPublicationEntitled,
  evaluateIndependentAgentPublicationReadiness,
  ListingPublicationEntitlementError,
  resolveListingCommercialOwner,
} from '../listingPublicationEntitlementService';
import { isPaidSubscriptionRowEntitled } from '../planAccessService';

describe('paid subscription entitlement timestamps', () => {
  it('interprets SQL DATETIME values as UTC', () => {
    const now = new Date('2026-01-01T23:30:00.000Z');

    expect(
      isPaidSubscriptionRowEntitled(
        { status: 'active', currentPeriodEnd: '2026-01-02 00:00:00' },
        now,
      ),
    ).toBe(true);
    expect(
      isPaidSubscriptionRowEntitled(
        { status: 'active', currentPeriodEnd: '2026-01-01 23:00:00' },
        now,
      ),
    ).toBe(false);
  });
});

class QueuedDb {
  constructor(private readonly results: any[][]) {}

  select() {
    const result = this.results.shift() || [];
    const chain: any = {
      from: () => chain,
      leftJoin: () => chain,
      where: () => chain,
      limit: () => Promise.resolve(result),
      for: () => Promise.resolve(result),
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
  isVerified: 1,
};
const completeBranding = {
  companyName: 'Pilot Agency',
  primaryColor: '#000000',
  secondaryColor: '#ffffff',
};
const agencyPublishingPlan = { id: 1, segment: 'agency', isActive: 1 };
const paidAgencyLaunchPlan = {
  ...agencyPublishingPlan,
  metadata: {
    commercial_term_kind: 'paid_launch_access',
    commercial_term_duration_days: 90,
    commercial_requires_verified_payment: true,
    commercial_auto_renews: false,
  },
};
const publishingEntitlements = [{ featureKey: 'max_active_listings', valueJson: 1 }];
const at = new Date('2026-07-16T10:00:00.000Z');

const CANONICAL_AGENT_COVERAGE = JSON.stringify([
  {
    canonicalLocationId: 'suburb:1',
    label: 'Coverage suburb, Coverage city, Coverage province',
  },
]);

function agencyDb(input: {
  listing?: Record<string, unknown>;
  owner?: Record<string, unknown>;
  agent?: Record<string, unknown> | null;
  membership?: Record<string, unknown> | null;
  agency?: Record<string, unknown>;
  subscription?: Record<string, unknown> | null;
  plan?: Record<string, unknown> | null;
  entitlements?: Array<Record<string, unknown>>;
  activeListingCount?: number;
}) {
  const listing = { ...agencyListing, ...(input.listing || {}) };
  const results: any[][] = [[listing], [{ ...agencyOwner, ...(input.owner || {}) }]];
  if (listing.agentId) {
    results.push([input.agent || { id: listing.agentId, agencyId: 77 }]);
    results.push(
      input.membership === null
        ? []
        : [
            {
              agencyId: 77,
              status: 'active',
              effectiveFrom: null,
              effectiveTo: null,
              ...(input.membership || {}),
            },
          ],
    );
  }
  results.push([{ ...completeAgency, ...(input.agency || {}) }], [completeBranding]);
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
    results.push(
      Array.from({ length: input.activeListingCount || 0 }, (_, index) => ({ id: index + 1 })),
    );
  }
  return new QueuedDb(results);
}

function independentAgentDb(input: {
  activeListingCount?: number;
  entitlements?: Array<Record<string, unknown>>;
  agent?: Record<string, unknown>;
}) {
  const future = new Date(at.getTime() + 86_400_000).toISOString();
  const agent = {
    id: 45,
    userId: 200,
    agencyId: null,
    status: 'approved',
    isVerified: 1,
    profileImage: 'a',
    areasServed: CANONICAL_AGENT_COVERAGE,
    bio: 'c',
    phone: 'd',
    focus: 'sales',
    propertyTypes: 'house',
    ...(input.agent || {}),
  };
  return new QueuedDb([
    [{ id: 12, ownerId: 200, agencyId: null, agentId: 45 }],
    [{ id: 200, role: 'agent', agencyId: null, emailVerified: 1 }],
    [agent],
    [],
    [{ id: 200, role: 'agent', agencyId: null, emailVerified: 1 }],
    [agent],
    [],
    [
      {
        subscription: { status: 'active', currentPeriodEnd: future },
        plan: { id: 2, segment: 'agent', isActive: 1 },
      },
    ],
    input.entitlements || [{ featureKey: 'max_active_listings', valueJson: 50 }],
    Array.from({ length: input.activeListingCount || 0 }, (_, index) => ({ id: index + 1 })),
  ]);
}

function independentAgentReadinessDb(input: {
  activeListingCount?: number;
  entitlements?: Array<Record<string, unknown>>;
  agent?: Record<string, unknown>;
  user?: Record<string, unknown>;
  membership?: Record<string, unknown> | null;
  subscription?: Record<string, unknown> | null;
  plan?: Record<string, unknown> | null;
}) {
  const future = new Date(at.getTime() + 86_400_000).toISOString();
  const agent = {
    id: 45,
    userId: 200,
    agencyId: null,
    status: 'approved',
    profileImage: 'a',
    areasServed: CANONICAL_AGENT_COVERAGE,
    bio: 'c',
    phone: 'd',
    focus: 'sales',
    propertyTypes: 'house',
    ...(input.agent || {}),
  };
  const subscription =
    input.subscription === undefined
      ? { status: 'active', currentPeriodEnd: future }
      : input.subscription;
  const plan = input.plan === undefined ? { id: 2, segment: 'agent', isActive: 1 } : input.plan;
  const rows: any[][] = [
    [{ id: 200, role: 'agent', agencyId: null, emailVerified: 1, ...(input.user || {}) }],
    [agent],
    input.membership === null
      ? []
      : input.membership
        ? [
            {
              agencyId: 77,
              status: 'active',
              effectiveFrom: null,
              effectiveTo: null,
              ...input.membership,
            },
          ]
        : [],
    subscription ? [{ subscription, plan }] : [],
  ];

  if (plan) {
    rows.push(input.entitlements || [{ featureKey: 'max_active_listings', valueJson: 50 }]);
    rows.push(
      Array.from({ length: input.activeListingCount || 0 }, (_, index) => ({ id: index + 1 })),
    );
  }

  return new QueuedDb(rows);
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
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('fails closed for an otherwise valid paid listing while preparation-only is enabled', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('VITEST', 'true');

    await expect(
      assertListingPublicationEntitled(
        agencyDb({ subscription: { status: 'active', cancelAtPeriodEnd: 0 } }),
        { listingId: 10, operation: 'submit', at },
      ),
    ).rejects.toMatchObject<ListingPublicationEntitlementError>({
      reason: 'commercial_activation_unavailable',
    });
  });

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

  it('denies an unverified agency before subscription-backed publication', async () => {
    await expectAgencyDenied(
      {
        agency: { isVerified: 0 },
        subscription: { status: 'active', cancelAtPeriodEnd: 0 },
      },
      'agency_unverified',
    );
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

  it('fails closed when an active fixed-term agency subscription has no usable end', async () => {
    await expectAgencyDenied(
      {
        subscription: { status: 'active', cancelAtPeriodEnd: 0 },
        plan: paidAgencyLaunchPlan,
      },
      'subscription_period_ended',
    );
    await expectAgencyDenied(
      {
        subscription: {
          status: 'active',
          cancelAtPeriodEnd: 0,
          currentPeriodEnd: 'not-a-date',
        },
        plan: paidAgencyLaunchPlan,
      },
      'subscription_period_ended',
    );
  });

  it('enforces the canonical numeric active-listing cap for agencies', async () => {
    await expectAgencyDenied(
      {
        subscription: { status: 'active', cancelAtPeriodEnd: 0 },
        entitlements: [{ featureKey: 'max_active_listings', valueJson: 500 }],
        activeListingCount: 500,
      },
      'listing_capacity_exhausted',
    );

    await expect(
      assertListingPublicationEntitled(
        agencyDb({
          subscription: { status: 'active', cancelAtPeriodEnd: 0 },
          entitlements: [{ featureKey: 'max_active_listings', valueJson: 500 }],
          activeListingCount: 499,
        }),
        { listingId: 10, operation: 'submit', at },
      ),
    ).resolves.toMatchObject({ kind: 'agency', agencyId: 77 });
  });

  it('enforces the canonical numeric active-listing cap for independent agents', async () => {
    await expect(
      assertListingPublicationEntitled(independentAgentDb({ activeListingCount: 49 }), {
        listingId: 12,
        operation: 'submit',
        at,
      }),
    ).resolves.toMatchObject({ kind: 'independent_agent', userId: 200 });

    await expect(
      assertListingPublicationEntitled(independentAgentDb({ activeListingCount: 50 }), {
        listingId: 12,
        operation: 'submit',
        at,
      }),
    ).rejects.toMatchObject({ reason: 'listing_capacity_exhausted' });
  });

  it('enumerates independent-agent blockers before authoring begins', async () => {
    const readiness = await evaluateIndependentAgentPublicationReadiness(
      independentAgentReadinessDb({
        agent: { status: 'pending', profileImage: null, areasServed: null, bio: null },
        user: { emailVerified: 0 },
        subscription: { status: 'payment_under_review' },
      }),
      200,
      { now: at, skipCapacityWhenBlocked: false },
    );

    expect(readiness.ready).toBe(false);
    expect(readiness.blockers.map(blocker => blocker.reason)).toEqual(
      expect.arrayContaining([
        'individual_agent_unapproved',
        'individual_agent_email_unverified',
        'individual_agent_profile_incomplete',
        'subscription_pending_payment',
      ]),
    );
    expect(readiness.facts.profileCompletionScore).toBeLessThan(70);
  });

  it('reports capacity facts for a ready independent agent', async () => {
    const readiness = await evaluateIndependentAgentPublicationReadiness(
      independentAgentReadinessDb({ activeListingCount: 3 }),
      200,
      { now: at },
    );

    expect(readiness).toMatchObject({
      ready: true,
      facts: { approved: true, emailVerified: true, capacityUsed: 3, capacityMax: 50 },
    });
  });

  it('uses current canonical membership rather than stale profile claims for independent preflight', async () => {
    const staleProfileReadiness = await evaluateIndependentAgentPublicationReadiness(
      independentAgentReadinessDb({
        agent: { agencyId: 77 },
        user: { agencyId: 77 },
        membership: null,
      }),
      200,
      { now: at },
    );
    expect(staleProfileReadiness.ready).toBe(true);

    const currentMembershipReadiness = await evaluateIndependentAgentPublicationReadiness(
      independentAgentReadinessDb({
        agent: { agencyId: null },
        user: { agencyId: null },
        membership: { agencyId: 77 },
      }),
      200,
      { now: at },
    );
    expect(currentMembershipReadiness.blockers).toEqual(
      expect.arrayContaining([expect.objectContaining({ reason: 'commercial_owner_unresolved' })]),
    );
  });

  it('denies unapproved agents and publishes approved agents regardless of the badge flag', async () => {
    await expect(
      assertListingPublicationEntitled(
        independentAgentDb({ agent: { status: 'pending', isVerified: 1 } }),
        { listingId: 12, operation: 'submit', at },
      ),
    ).rejects.toMatchObject({ reason: 'individual_agent_unapproved' });

    await expect(
      assertListingPublicationEntitled(
        independentAgentDb({ agent: { status: 'approved', isVerified: 0 } }),
        { listingId: 12, operation: 'submit', at },
      ),
    ).resolves.toMatchObject({ kind: 'independent_agent', userId: 200 });
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
    await expectAgencyDenied(
      {
        subscription: { status: 'active' },
        plan: agencyPublishingPlan,
        entitlements: [],
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
          status: 'approved',
          isVerified: 1,
          profileImage: 'a',
          areasServed: CANONICAL_AGENT_COVERAGE,
          bio: 'c',
          phone: 'd',
          focus: 'sales',
          propertyTypes: 'house',
        },
      ],
      [],
      [{ id: 200, role: 'agent', agencyId: null, emailVerified: 1 }],
      [
        {
          id: 45,
          userId: 200,
          agencyId: null,
          status: 'approved',
          isVerified: 1,
          profileImage: 'a',
          areasServed: CANONICAL_AGENT_COVERAGE,
          bio: 'c',
          phone: 'd',
          focus: 'sales',
          propertyTypes: 'house',
        },
      ],
      [],
      [
        {
          subscription: { status: 'trial', trialEndsAt: future },
          plan: { id: 2, segment: 'agent', isActive: 1 },
        },
      ],
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

  it('fails closed for missing commercial ownership and absent canonical membership', async () => {
    await expect(
      resolveListingCommercialOwner(new QueuedDb([[{ id: 21, ownerId: 999 }], []]), 21),
    ).rejects.toMatchObject({ reason: 'commercial_owner_unresolved' });

    const db = new QueuedDb([
      [{ id: 13, ownerId: 300, agencyId: 7, agentId: 99 }],
      [{ id: 300, role: 'agent', agencyId: 8 }],
      [{ id: 99, userId: 300, agencyId: 7 }],
      [],
    ]);
    await expect(resolveListingCommercialOwner(db, 13)).rejects.toMatchObject({
      reason: 'agency_membership_required',
    });
  });

  it('uses current canonical membership instead of forged profile affiliation claims', async () => {
    const db = new QueuedDb([
      [{ id: 14, ownerId: 301, agencyId: 7, agentId: 100 }],
      [{ id: 301, role: 'agent', agencyId: 999 }],
      [{ id: 100, userId: 301, agencyId: 999 }],
      [{ agencyId: 7, status: 'active', effectiveFrom: null, effectiveTo: null }],
    ]);

    await expect(resolveListingCommercialOwner(db, 14)).resolves.toMatchObject({
      kind: 'agency',
      agencyId: 7,
      responsibleAgentId: 100,
    });
  });

  it('denies suspended canonical membership even when every stored profile claim names the agency', async () => {
    const db = new QueuedDb([
      [{ id: 15, ownerId: 302, agencyId: 7, agentId: 101 }],
      [{ id: 302, role: 'agent', agencyId: 7 }],
      [{ id: 101, userId: 302, agencyId: 7 }],
      [{ agencyId: 7, status: 'suspended', effectiveFrom: null, effectiveTo: null }],
    ]);

    await expect(resolveListingCommercialOwner(db, 15)).rejects.toMatchObject({
      reason: 'agency_membership_required',
    });
  });

  it('denies an agency member who attempts to publish an unattributed listing as an independent', async () => {
    const db = new QueuedDb([
      [{ id: 16, ownerId: 303, agencyId: null, agentId: 102 }],
      [{ id: 303, role: 'agent', agencyId: null }],
      [{ id: 102, userId: 303, agencyId: null }],
      [{ agencyId: 7, status: 'active', effectiveFrom: null, effectiveTo: null }],
    ]);

    await expect(resolveListingCommercialOwner(db, 16)).rejects.toMatchObject({
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
