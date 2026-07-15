import { and, eq } from 'drizzle-orm';
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
  | 'agency_profile_incomplete'
  | 'agency_branding_incomplete'
  | 'individual_agent_email_unverified'
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

type DbLike = any;

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
 * Read-only entitlement assertion used by every publication-capable listing
 * transition. Callers must provide the same transaction that will write the
 * transition/projection so a later implementation can add row locking without
 * changing the public API.
 */
export async function assertListingPublicationEntitled(
  db: DbLike,
  input: { listingId: number; operation: ListingPublicationOperation; at?: Date },
): Promise<ListingCommercialOwner> {
  const now = input.at || new Date();
  const owner = await resolveListingCommercialOwner(db, input.listingId);

  if (owner.kind === 'agency') {
    const [[agency], [branding]] = await Promise.all([
      db.select().from(agencies).where(eq(agencies.id, owner.agencyId)).limit(1),
      db.select().from(agencyBranding).where(eq(agencyBranding.agencyId, owner.agencyId)).limit(1),
    ]);

    if (!agency) {
      throw new ListingPublicationEntitlementError(
        'commercial_owner_unresolved',
        'This listing does not have a resolvable commercial owner.',
      );
    }
    if (!(agency.name && agency.email && agency.city && agency.province)) {
      throw new ListingPublicationEntitlementError(
        'agency_profile_incomplete',
        'Complete the agency profile before submitting listings for publication.',
      );
    }
    if (!(branding?.companyName && branding?.primaryColor && branding?.secondaryColor)) {
      throw new ListingPublicationEntitlementError(
        'agency_branding_incomplete',
        'Complete agency branding before submitting listings for publication.',
      );
    }

    const subscriptionWithPlan = await getCanonicalSubscription(db, 'agency', owner.agencyId);
    const failure = subscriptionFailure(subscriptionWithPlan?.subscription, now);
    if (failure) throw failure;

    const plan = subscriptionWithPlan?.plan;
    if (!plan) {
      throw new ListingPublicationEntitlementError(
        'subscription_plan_unresolved',
        'A valid agency publishing plan is required before this listing can be submitted.',
      );
    }
    if (plan.segment !== 'agency' || Number(plan.isActive) !== 1) {
      throw new ListingPublicationEntitlementError(
        'subscription_plan_ineligible',
        'The current plan is not eligible for agency listing publication.',
      );
    }

    const maxActiveListings = await getPlanMaximumActiveListings(db, plan.id);
    if (maxActiveListings === 0) {
      throw new ListingPublicationEntitlementError(
        'listing_capacity_exhausted',
        'The current agency plan does not include active listing publication.',
      );
    }
    return owner;
  }

  const [[user], [agent]] = await Promise.all([
    db.select().from(users).where(eq(users.id, owner.userId)).limit(1),
    db.select().from(agents).where(eq(agents.id, owner.agentId)).limit(1),
  ]);
  if (!user || !agent) {
    throw new ListingPublicationEntitlementError(
      'commercial_owner_unresolved',
      'This listing does not have a resolvable commercial owner.',
    );
  }
  if (user.emailVerified !== 1) {
    throw new ListingPublicationEntitlementError(
      'individual_agent_email_unverified',
      'Verify the agent email address before publishing listings.',
    );
  }
  if (profileCompletionScore(agent) < 70) {
    throw new ListingPublicationEntitlementError(
      'individual_agent_profile_incomplete',
      'Complete the agent profile before publishing listings.',
    );
  }

  const subscriptionWithPlan = await getCanonicalSubscription(db, 'agent', owner.userId);
  const subscription = subscriptionWithPlan?.subscription;
  const trialEndsAt = dbTimestamp(subscription?.trialEndsAt);
  const validTrial =
    subscription?.status === 'trial' && trialEndsAt !== null && trialEndsAt > now.getTime();
  const failure = validTrial ? null : subscriptionFailure(subscription, now);
  if (failure) throw failure;

  const maxActiveListings = await getPlanMaximumActiveListings(db, subscriptionWithPlan?.plan?.id);
  if (maxActiveListings === 0) {
    throw new ListingPublicationEntitlementError(
      'listing_capacity_exhausted',
      'The current plan does not include active listing publication.',
    );
  }
  return owner;
}
