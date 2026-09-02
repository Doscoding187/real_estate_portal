import { and, eq, inArray, isNull, ne, notInArray, or, sql } from 'drizzle-orm';
import {
  agencies,
  agencyBranding,
  agents,
  listings,
  planEntitlements,
  plans,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { getEntitlementNumber } from './planAccessService';

/**
 * The commercial decision for a canonical listing must be derived from the
 * listing, not from the caller. A principal can create a draft for another
 * agent and an administrator can approve it, but neither fact changes who is
 * commercially responsible for publication.
 */
export type ListingPublicationOperation =
  | 'submit'
  | 'fast_track'
  | 'admin_approval'
  | 'public_projection'
  | 'public_media_sync'
  | 'republish';

export type ListingPublicationFailureCode =
  | 'commercial_owner_unresolved'
  | 'listing_ownership_inconsistent'
  | 'unsupported_listing_owner_type'
  | 'subscription_required'
  | 'subscription_pending_payment'
  | 'subscription_suspended'
  | 'subscription_period_ended'
  | 'subscription_expired'
  | 'subscription_plan_unresolved'
  | 'subscription_plan_ineligible'
  | 'agency_unverified'
  | 'agency_profile_incomplete'
  | 'agency_branding_incomplete'
  | 'individual_agent_email_unverified'
  | 'individual_agent_unapproved'
  | 'individual_agent_profile_incomplete'
  | 'listing_capacity_exhausted';

export class ListingPublicationEntitlementError extends Error {
  constructor(
    public readonly reason: ListingPublicationFailureCode,
    message: string,
  ) {
    super(message);
    this.name = 'ListingPublicationEntitlementError';
  }
}

export type ListingCommercialOwner =
  | { kind: 'agency'; agencyId: number; listingId: number; responsibleAgentId: number | null }
  | { kind: 'independent_agent'; userId: number; agentId: number; listingId: number };

export function isSameListingCommercialOwner(
  left: ListingCommercialOwner,
  right: ListingCommercialOwner,
) {
  if (left.kind !== right.kind) return false;
  return left.kind === 'agency'
    ? left.agencyId === (right as Extract<ListingCommercialOwner, { kind: 'agency' }>).agencyId
    : left.userId ===
        (right as Extract<ListingCommercialOwner, { kind: 'independent_agent' }>).userId;
}

export type PublicationBlocker = {
  reason: ListingPublicationFailureCode;
  message: string;
};

export type AgencyPublicationReadiness = {
  ready: boolean;
  blockers: PublicationBlocker[];
  facts: {
    verified: boolean;
    profileComplete: boolean;
    brandingComplete: boolean;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    daysRemaining: number | null;
    capacityUsed: number | null;
    capacityMax: number | null;
  };
};

export type IndependentAgentPublicationReadiness = {
  ready: boolean;
  blockers: PublicationBlocker[];
  facts: {
    approved: boolean;
    emailVerified: boolean;
    profileCompletionScore: number;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    daysRemaining: number | null;
    capacityUsed: number | null;
    capacityMax: number | null;
  };
};

type DbLike = any;

/**
 * Enumerate EVERYTHING standing between an agency and publishable inventory.
 *
 * This is the same authority `assertListingPublicationEntitled` enforces,
 * evaluated in the same order but collecting every failure instead of
 * aborting at the first, so agencies can see their full path to live
 * inventory before authoring work that ends in a rejected submission.
 */
export async function evaluateAgencyPublicationReadiness(
  db: DbLike,
  agencyId: number,
  options: {
    excludeListingIds?: number[];
    now?: Date;
    includeCapacityCount?: boolean;
    /**
     * Enforcement-parity switch (default true): when earlier blockers already
     * exist, skip the capacity count so read sequences match the historical
     * throw-first behaviour. Readiness consumers pass false to enumerate
     * capacity regardless.
     */
    skipCapacityWhenBlocked?: boolean;
  } = {},
): Promise<AgencyPublicationReadiness> {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const blockers: PublicationBlocker[] = [];
  const push = (reason: ListingPublicationFailureCode, message: string) =>
    blockers.push({ reason, message });

  const [[agency], [branding]] = await Promise.all([
    db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1),
    db.select().from(agencyBranding).where(eq(agencyBranding.agencyId, agencyId)).limit(1),
  ]);

  if (!agency) {
    return {
      ready: false,
      blockers: [
        {
          reason: 'commercial_owner_unresolved',
          message: 'This listing does not have a resolvable commercial owner.',
        },
      ],
      facts: {
        verified: false,
        profileComplete: false,
        brandingComplete: false,
        subscriptionStatus: null,
        currentPeriodEnd: null,
        daysRemaining: null,
        capacityUsed: null,
        capacityMax: null,
      },
    };
  }

  const verified = Number(agency.isVerified || 0) === 1;
  if (!verified) {
    push('agency_unverified', 'The agency must be verified before publishing listings.');
  }

  const profileComplete = Boolean(agency.name && agency.email && agency.city && agency.province);
  if (!profileComplete) {
    push(
      'agency_profile_incomplete',
      'Complete the agency profile before submitting listings for publication.',
    );
  }

  const brandingComplete = Boolean(
    branding?.companyName && branding?.primaryColor && branding?.secondaryColor,
  );
  if (!brandingComplete) {
    push(
      'agency_branding_incomplete',
      'Complete agency branding before submitting listings for publication.',
    );
  }

  const subscriptionWithPlan = await getCanonicalSubscription(db, 'agency', agencyId);
  const subscriptionFailureForState = subscriptionFailure(subscriptionWithPlan?.subscription, now);
  if (subscriptionFailureForState) {
    push(subscriptionFailureForState.reason, subscriptionFailureForState.message);
  }

  const plan = subscriptionWithPlan?.plan;
  let capacityMax: number | null = null;
  if (!plan) {
    push(
      'subscription_plan_unresolved',
      'A valid agency publishing plan is required before this listing can be submitted.',
    );
  } else if (plan.segment !== 'agency' || Number(plan.isActive) !== 1) {
    push(
      'subscription_plan_ineligible',
      'The current plan is not eligible for agency listing publication.',
    );
  } else {
    capacityMax = await getPlanMaximumActiveListings(db, plan.id);
    if (capacityMax <= 0) {
      push(
        'listing_capacity_exhausted',
        'The current agency plan does not include active listing publication.',
      );
    }
  }

  const skipCapacity = (options.skipCapacityWhenBlocked ?? true) && blockers.length > 0;
  let capacityUsed: number | null = null;
  if (
    !skipCapacity &&
    capacityMax !== null &&
    capacityMax > 0 &&
    options.includeCapacityCount !== false
  ) {
    const owner: ListingCommercialOwner = {
      kind: 'agency',
      agencyId,
      listingId: 0,
      responsibleAgentId: null,
    };
    capacityUsed = await getActiveListingCount(db, owner, options.excludeListingIds ?? []);
    if (capacityMax !== null && capacityUsed !== null && capacityUsed >= capacityMax) {
      push(
        'listing_capacity_exhausted',
        `The current plan allows ${capacityMax} active listings. Archive an active listing before publishing another.`,
      );
    }
  }

  const currentPeriodEnd = dbTimestamp(subscriptionWithPlan?.subscription.currentPeriodEnd);
  const daysRemaining =
    currentPeriodEnd !== null
      ? Math.max(0, Math.ceil((currentPeriodEnd - nowMs) / 86_400_000))
      : null;

  return {
    ready: blockers.length === 0,
    blockers,
    facts: {
      verified,
      profileComplete,
      brandingComplete,
      subscriptionStatus: subscriptionWithPlan?.subscription.status ?? null,
      currentPeriodEnd:
        subscriptionWithPlan?.subscription.currentPeriodEnd != null
          ? String(subscriptionWithPlan.subscription.currentPeriodEnd)
          : null,
      daysRemaining,
      capacityUsed,
      capacityMax,
    },
  };
}

/**
 * Enumerate the requirements for an independent agent to submit inventory.
 *
 * This is deliberately the same commercial authority used during a listing
 * transition. It gives authoring surfaces an honest, complete preflight
 * without weakening the transaction-time assertion that still protects every
 * publication operation.
 */
export async function evaluateIndependentAgentPublicationReadiness(
  db: DbLike,
  userId: number,
  options: {
    agentId?: number;
    excludeListingIds?: number[];
    now?: Date;
    includeCapacityCount?: boolean;
    skipCapacityWhenBlocked?: boolean;
  } = {},
): Promise<IndependentAgentPublicationReadiness> {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const blockers: PublicationBlocker[] = [];
  const push = (reason: ListingPublicationFailureCode, message: string) =>
    blockers.push({ reason, message });

  const [[user], [agent]] = await Promise.all([
    db.select().from(users).where(eq(users.id, userId)).limit(1),
    options.agentId
      ? db.select().from(agents).where(eq(agents.id, options.agentId)).limit(1)
      : db.select().from(agents).where(eq(agents.userId, userId)).limit(1),
  ]);

  if (!user || !agent || Number(agent.userId || 0) !== Number(userId)) {
    push(
      'commercial_owner_unresolved',
      'This listing does not have a resolvable independent-agent owner.',
    );
  }

  const hasAgencyMembership = Boolean(user?.agencyId || agent?.agencyId);
  if (hasAgencyMembership) {
    push(
      'commercial_owner_unresolved',
      'Your account is associated with an agency. Use your agency listing workspace for this inventory.',
    );
  }

  const approved = Boolean(agent && agent.status === 'approved');
  if (agent && !approved) {
    push(
      'individual_agent_unapproved',
      'The agent profile must be approved before publishing listings.',
    );
  }

  const emailVerified = Number(user?.emailVerified || 0) === 1;
  if (user && !emailVerified) {
    push(
      'individual_agent_email_unverified',
      'Verify the agent email address before publishing listings.',
    );
  }

  const completionScore = profileCompletionScore(agent);
  if (agent && completionScore < 70) {
    push(
      'individual_agent_profile_incomplete',
      'Complete the agent profile before publishing listings.',
    );
  }

  const subscriptionWithPlan = await getCanonicalSubscription(db, 'agent', userId);
  const subscription = subscriptionWithPlan?.subscription;
  const plan = subscriptionWithPlan?.plan;
  const trialEndsAt = dbTimestamp(subscription?.trialEndsAt);
  const validTrial =
    subscription?.status === 'trial' && trialEndsAt !== null && trialEndsAt > nowMs;
  const failure = validTrial ? null : subscriptionFailure(subscription, now);
  if (failure) {
    push(failure.reason, failure.message);
  }

  let capacityMax: number | null = null;
  if (!plan) {
    push(
      'subscription_plan_unresolved',
      'A valid agent publishing plan is required before this listing can be submitted.',
    );
  } else if (plan.segment !== 'agent' || Number(plan.isActive) !== 1) {
    push(
      'subscription_plan_ineligible',
      'The current plan is not eligible for independent-agent listing publication.',
    );
  } else {
    capacityMax = await getPlanMaximumActiveListings(db, plan.id);
    if (capacityMax <= 0) {
      push(
        'listing_capacity_exhausted',
        'The current plan does not include active listing publication.',
      );
    }
  }

  const skipCapacity = (options.skipCapacityWhenBlocked ?? true) && blockers.length > 0;
  let capacityUsed: number | null = null;
  if (
    !skipCapacity &&
    capacityMax !== null &&
    capacityMax > 0 &&
    options.includeCapacityCount !== false
  ) {
    const activeCapacityUsed = await getActiveListingCount(
      db,
      {
        kind: 'independent_agent',
        userId,
        agentId: Number(agent?.id || options.agentId || 0),
        listingId: 0,
      },
      options.excludeListingIds ?? [],
    );
    capacityUsed = activeCapacityUsed;
    if (activeCapacityUsed >= capacityMax) {
      push(
        'listing_capacity_exhausted',
        `The current plan allows ${capacityMax} active listings. Archive an active listing before publishing another.`,
      );
    }
  }

  const currentPeriodEnd = dbTimestamp(subscription?.currentPeriodEnd);
  const daysRemaining =
    currentPeriodEnd !== null
      ? Math.max(0, Math.ceil((currentPeriodEnd - nowMs) / 86_400_000))
      : null;

  return {
    ready: blockers.length === 0,
    blockers,
    facts: {
      approved,
      emailVerified,
      profileCompletionScore: completionScore,
      subscriptionStatus: subscription?.status ?? null,
      currentPeriodEnd:
        subscription?.currentPeriodEnd != null ? String(subscription.currentPeriodEnd) : null,
      daysRemaining,
      capacityUsed,
      capacityMax,
    },
  };
}

const ACTIVE_CANONICAL_LISTING_STATUSES = ['approved', 'published'] as const;

const dbTimestamp = (value: unknown) => {
  if (!value) return null;
  const timestamp = new Date(String(value)).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
};

function subscriptionFailure(
  subscription: any,
  now: Date,
): ListingPublicationEntitlementError | null {
  if (!subscription) {
    return new ListingPublicationEntitlementError(
      'subscription_required',
      'Subscription activation is required before this listing can be submitted.',
    );
  }

  const nowMs = now.getTime();
  const currentPeriodEnd = dbTimestamp(subscription.currentPeriodEnd);
  const graceEndsAt = dbTimestamp(subscription.graceEndsAt);

  if (subscription.status === 'grace_period') {
    if (!graceEndsAt || graceEndsAt <= nowMs) {
      return new ListingPublicationEntitlementError(
        'subscription_expired',
        'The subscription grace period has ended. Reactivate the subscription to publish listings.',
      );
    }
    return null;
  }

  if (subscription.status === 'active') {
    if (currentPeriodEnd && currentPeriodEnd <= nowMs) {
      return new ListingPublicationEntitlementError(
        'subscription_period_ended',
        'The subscription period has ended. Reactivate the subscription to publish listings.',
      );
    }
    return null;
  }

  if (subscription.status === 'pending_payment' || subscription.status === 'payment_under_review') {
    return new ListingPublicationEntitlementError(
      'subscription_pending_payment',
      'Payment activation is still pending. This listing can be saved as a draft but cannot be submitted.',
    );
  }

  if (subscription.status === 'suspended' || subscription.status === 'past_due') {
    return new ListingPublicationEntitlementError(
      'subscription_suspended',
      'The subscription is suspended. Reactivate it before publishing listings.',
    );
  }

  return new ListingPublicationEntitlementError(
    'subscription_expired',
    'The subscription is no longer active. Reactivate it before publishing listings.',
  );
}

async function getCanonicalSubscription(
  db: DbLike,
  ownerType: 'agency' | 'agent',
  ownerId: number,
) {
  const [row] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(and(eq(subscriptions.ownerType, ownerType), eq(subscriptions.ownerId, ownerId)))
    .limit(1);
  return row || null;
}

async function getPlanMaximumActiveListings(db: DbLike, planId: number | null | undefined) {
  if (!planId) return 0;
  const rows = await db
    .select({ featureKey: planEntitlements.featureKey, valueJson: planEntitlements.valueJson })
    .from(planEntitlements)
    .where(eq(planEntitlements.planId, planId));
  const map = Object.fromEntries(rows.map((row: any) => [row.featureKey, row.valueJson]));
  return getEntitlementNumber(map, 'max_active_listings', 0);
}

async function lockListingPublicationOwner(db: DbLike, owner: ListingCommercialOwner) {
  // Publication callers pass their transaction handle. Keep the unit-test
  // adapter and read-only callers compatible while making the real transition
  // serialize on the same canonical owner row as billing.
  if (typeof db.execute !== 'function') return;

  if (owner.kind === 'agency') {
    await db.execute(sql`SELECT id FROM agencies WHERE id = ${owner.agencyId} FOR UPDATE`);
    return;
  }

  await db.execute(sql`SELECT id FROM users WHERE id = ${owner.userId} FOR UPDATE`);
}

async function getActiveListingCount(
  db: DbLike,
  owner: ListingCommercialOwner,
  additionalExcludedListingIds: number[] = [],
) {
  const ownerCondition =
    owner.kind === 'agency'
      ? or(
          eq(listings.agencyId, owner.agencyId),
          and(
            isNull(listings.agencyId),
            or(
              eq(users.agencyId, owner.agencyId),
              and(isNull(users.agencyId), eq(agents.agencyId, owner.agencyId)),
            ),
          ),
        )
      : and(
          eq(listings.ownerId, owner.userId),
          isNull(listings.agencyId),
          isNull(users.agencyId),
          isNull(agents.agencyId),
        );

  const activeListingQuery = db
    .select({ id: listings.id })
    .from(listings)
    .leftJoin(users, eq(listings.ownerId, users.id))
    .leftJoin(agents, eq(listings.agentId, agents.id))
    .where(
      and(
        ownerCondition,
        inArray(listings.status, ACTIVE_CANONICAL_LISTING_STATUSES as any),
        eq(listings.approvalStatus, 'approved' as any),
        // A republish/media-sync assertion is about the existing item. It must
        // not consume a second slot while the item is already active.
        additionalExcludedListingIds.length
          ? notInArray(listings.id, [owner.listingId, ...additionalExcludedListingIds])
          : ne(listings.id, owner.listingId),
      ),
    );

  // A locking read is a current read in MySQL/TiDB. This prevents a second
  // publication transaction from counting a stale snapshot after it waits on
  // the canonical owner-row lock.
  const rows =
    typeof activeListingQuery.for === 'function'
      ? await activeListingQuery.for('update')
      : await activeListingQuery;
  return rows.length;
}

function profileCompletionScore(agent: any) {
  if (!agent) return 0;
  const present = (value: unknown) => Boolean(typeof value === 'string' ? value.trim() : value);
  return [
    [agent.profileImage, 20],
    [agent.areasServed, 20],
    [agent.bio, 15],
    [agent.phone, 15],
    [agent.focus || agent.specialization, 15],
    [agent.propertyTypes, 15],
  ].reduce((score, [value, weight]) => score + (present(value) ? Number(weight) : 0), 0);
}

export async function resolveListingCommercialOwner(
  db: DbLike,
  listingId: number,
): Promise<ListingCommercialOwner> {
  const [listing] = await db.select().from(listings).where(eq(listings.id, listingId)).limit(1);
  if (!listing) throw new Error('Listing not found');

  const [[owner], agent] = await Promise.all([
    db.select().from(users).where(eq(users.id, listing.ownerId)).limit(1),
    listing.agentId
      ? db
          .select()
          .from(agents)
          .where(eq(agents.id, listing.agentId))
          .limit(1)
          .then((rows: any[]) => rows[0])
      : Promise.resolve(null),
  ]);

  if (!owner) {
    throw new ListingPublicationEntitlementError(
      'commercial_owner_unresolved',
      'This listing does not have a resolvable commercial owner.',
    );
  }

  const agencyClaims = [listing.agencyId, owner.agencyId, agent?.agencyId]
    .map(value => Number(value || 0))
    .filter(Boolean);
  const uniqueAgencyClaims = [...new Set(agencyClaims)];

  if (uniqueAgencyClaims.length > 1) {
    throw new ListingPublicationEntitlementError(
      'listing_ownership_inconsistent',
      'This listing has inconsistent ownership details and cannot be submitted.',
    );
  }

  if (uniqueAgencyClaims.length === 1) {
    return {
      kind: 'agency',
      agencyId: uniqueAgencyClaims[0],
      listingId,
      responsibleAgentId: listing.agentId ? Number(listing.agentId) : null,
    };
  }

  if (
    owner.role === 'agent' &&
    agent &&
    Number(agent.userId || 0) === Number(owner.id) &&
    !agent.agencyId
  ) {
    return {
      kind: 'independent_agent',
      userId: Number(owner.id),
      agentId: Number(agent.id),
      listingId,
    };
  }

  if (owner.role === 'property_developer') {
    throw new ListingPublicationEntitlementError(
      'unsupported_listing_owner_type',
      'Developer inventory must use the development publishing workflow.',
    );
  }

  throw new ListingPublicationEntitlementError(
    'commercial_owner_unresolved',
    'This listing does not have a supported commercial owner for publication.',
  );
}

/**
 * Entitlement assertion used by every publication-capable listing transition.
 * Publication mutations pass their transaction handle so owner locking and the
 * current active-inventory read cover the subsequent public write.
 */
export async function assertListingPublicationEntitled(
  db: DbLike,
  input: {
    listingId: number;
    operation: ListingPublicationOperation;
    at?: Date;
    excludeListingIds?: number[];
  },
): Promise<ListingCommercialOwner> {
  const now = input.at || new Date();
  const owner = await resolveListingCommercialOwner(db, input.listingId);
  await lockListingPublicationOwner(db, owner);

  if (owner.kind === 'agency') {
    // Same authority, enumerated: collect every blocker, then enforce the
    // first one exactly as the sequential throws did before. Callers that
    // need the full picture use evaluateAgencyPublicationReadiness directly.
    const readiness = await evaluateAgencyPublicationReadiness(db, owner.agencyId, {
      excludeListingIds: input.excludeListingIds ?? [owner.listingId],
      now,
      includeCapacityCount: true,
    });
    if (readiness.blockers.length > 0) {
      throw new ListingPublicationEntitlementError(
        readiness.blockers[0].reason,
        readiness.blockers[0].message,
      );
    }
    return owner;
  }

  const readiness = await evaluateIndependentAgentPublicationReadiness(db, owner.userId, {
    agentId: owner.agentId,
    excludeListingIds: input.excludeListingIds ?? [owner.listingId],
    now,
    includeCapacityCount: true,
  });
  if (readiness.blockers.length > 0) {
    throw new ListingPublicationEntitlementError(
      readiness.blockers[0].reason,
      readiness.blockers[0].message,
    );
  }
  return owner;
}
