import { randomBytes } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  agencies,
  billableAccounts,
  invitations,
  plans,
  subscriptions,
} from '../../drizzle/schema';
import { ENV } from '../_core/env';
import { getDb } from '../db';
import { isCommercialActivationAvailable } from './commercialActivationPolicy';
import { isPaidMvpLaunchAccessSubscriptionEntitled } from './planAccessService';

const ACTIVE_AGENCY_SUBSCRIPTION_STATUSES = new Set(['active', 'grace_period']);
const INVITATION_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;
const INVITATION_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

type CanonicalGateSubscription = {
  status: string | null;
  currentPeriodEnd: string | Date | null;
  graceEndsAt: string | Date | null;
};

type InvitationCommercialDatabase = Pick<NonNullable<Awaited<ReturnType<typeof getDb>>>, 'select'>;
type InvitationDeliveryDatabase = NonNullable<Awaited<ReturnType<typeof getDb>>>;

function affectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { affectedRows?: unknown } | null)?.affectedRows ?? 0);
}

/**
 * Effective paid access mirrors the canonical gates: an active/grace status
 * whose term (or grace window) has already elapsed is treated as expired,
 * so a finance lifecycle override cannot email invitations for access the
 * rest of the platform denies.
 */
export function hasEffectiveAgencyPaidAccess(subscription: CanonicalGateSubscription): boolean {
  if (
    !subscription ||
    !ACTIVE_AGENCY_SUBSCRIPTION_STATUSES.has(String(subscription.status || ''))
  ) {
    return false;
  }

  const now = Date.now();
  const toDate = (value: string | Date | null | undefined) => {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  };

  const periodEnd = toDate(subscription.currentPeriodEnd);
  if (subscription.status === 'active' && periodEnd && periodEnd.getTime() <= now) {
    return false;
  }

  const graceEndsAt = toDate(subscription.graceEndsAt);
  if (subscription.status === 'grace_period' && graceEndsAt && graceEndsAt.getTime() <= now) {
    return false;
  }

  return true;
}

/**
 * One canonical commercial decision for both invitation delivery and
 * acceptance. A queued record is not an authorization credential while its
 * agency remains in preparation-only mode: accepting it would otherwise mint
 * membership and workspace access without the activation that permits its
 * delivery.
 */
export async function hasEffectiveAgencyInvitationAccess(
  db: InvitationCommercialDatabase,
  agencyId: number,
): Promise<boolean> {
  // A persisted paid term is necessary but not sufficient. Until the
  // separately approved commercial release is enabled, no normal runtime may
  // turn a historical/manual active row into invitation delivery or team
  // membership authority. Governed test fixtures remain the narrowly scoped
  // exception for canonical paid-term coverage.
  if (!isCommercialActivationAvailable(process.env, 'agency_launch_access')) {
    return false;
  }

  const [subscription] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(
      and(
        eq(subscriptions.ownerType, 'agency'),
        eq(subscriptions.ownerId, agencyId),
        sql`EXISTS (
      SELECT 1
      FROM ${billableAccounts} account
      WHERE account.id = ${subscriptions.billableAccountId}
        AND account.account_kind = 'agency'
        AND account.agency_id = ${agencyId}
    )`,
      ),
    )
    // In invitation acceptance this runs inside the authoritative
    // transaction, so finance expiry/review cannot change the entitlement
    // after it has been validated but before membership is committed.
    .for('update')
    .limit(1);

  return Boolean(
    subscription &&
      isPaidMvpLaunchAccessSubscriptionEntitled(
        subscription.subscription,
        subscription.plan,
        'agency',
      ),
  );
}

export type AgencyInvitationDeliveryResult = {
  deferred: boolean;
  attempted: number;
  sent: number;
  failed: number;
};

export function buildAgencyInvitationUrl(token: string, appOrigin = ENV.appUrl) {
  return `${appOrigin}/accept-invitation?token=${encodeURIComponent(token)}`;
}

function invitationTokenHasElapsed(expiresAt: string | Date | null | undefined, now = Date.now()) {
  if (!expiresAt) return true;
  const expiresAtMs = new Date(expiresAt).getTime();
  return Number.isNaN(expiresAtMs) || expiresAtMs <= now;
}

function queuedInvitationNeedsRefresh(
  invitation: Pick<typeof invitations.$inferSelect, 'token' | 'expiresAt'>,
) {
  return (
    !INVITATION_TOKEN_PATTERN.test(String(invitation.token || '')) ||
    invitationTokenHasElapsed(invitation.expiresAt)
  );
}

/**
 * Delivery is deliberately outside the transaction because a mail provider is
 * an external boundary. The token selection/rotation itself must still share
 * the invitation row lock used by acceptance, cancellation and resend: an
 * accepted row must never be refreshed back into a usable pending token.
 */
async function lockDeliverableInvitation(
  db: InvitationDeliveryDatabase,
  invitationId: number,
): Promise<typeof invitations.$inferSelect | null> {
  return db.transaction(async tx => {
    const [invitation] = await tx
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .for('update')
      .limit(1);
    if (!invitation || invitation.status !== 'pending') return null;

    if (!queuedInvitationNeedsRefresh(invitation)) return invitation;

    const refreshedAt = new Date();
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(refreshedAt.getTime() + INVITATION_VALIDITY_MS);
    const rotation = await tx
      .update(invitations)
      .set({ token, expiresAt, updatedAt: refreshedAt })
      .where(
        and(
          eq(invitations.id, invitation.id),
          eq(invitations.status, 'pending'),
          eq(invitations.token, invitation.token),
        ),
      );
    if (affectedRows(rotation) !== 1) return null;

    const [rotated] = await tx
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitation.id))
      .limit(1);
    if (!rotated || rotated.status !== 'pending') return null;
    return rotated;
  });
}

/**
 * Delivers accepted-format invitation links only after canonical paid access
 * is active. The gate reads the canonical subscriptions table — the single
 * commercial-access authority — rather than the legacy agencies shadow
 * column, so activation, expiry and lifecycle overrides decide delivery
 * consistently. Pending onboarding invitations remain safely queued in the
 * invitations table until finance has approved the payment.
 */
export async function deliverAgencyInvitations(input: {
  agencyId: number;
  invitationIds?: number[];
}): Promise<AgencyInvitationDeliveryResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [agency] = await db
    .select({ id: agencies.id, name: agencies.name })
    .from(agencies)
    .where(eq(agencies.id, input.agencyId))
    .limit(1);

  if (!agency) throw new Error('Agency not found');

  if (!(await hasEffectiveAgencyInvitationAccess(db, input.agencyId))) {
    return { deferred: true, attempted: 0, sent: 0, failed: 0 };
  }

  const filters = [eq(invitations.agencyId, input.agencyId), eq(invitations.status, 'pending')];
  if (input.invitationIds?.length) {
    filters.push(inArray(invitations.id, input.invitationIds));
  }

  const pending = await db
    .select()
    .from(invitations)
    .where(and(...filters));
  let attempted = 0;
  let sent = 0;
  let failed = 0;

  for (const pendingInvitation of pending) {
    // Onboarding can safely queue an invitation while commercial activation is
    // unavailable. Its acceptance token begins its validity window when
    // delivery starts, under the same row lock as terminal transitions.
    const deliverableInvitation = await lockDeliverableInvitation(db, pendingInvitation.id);
    if (!deliverableInvitation) continue;
    attempted += 1;

    const { queueAgencyInvitationEmail, runTransactionalEmailWorker } =
      await import('./transactionalEmailDeliveryService');
    const deliveryId = await queueAgencyInvitationEmail({ database: db, invitation: deliverableInvitation });
    const outcome = deliveryId
      ? await runTransactionalEmailWorker({ database: db, deliveryId })
      : { accepted: 0 };
    if (outcome.accepted) {
      sent += 1;
    } else {
      failed += 1;
      console.error('[AgencyInvitationDelivery] Invitation email is pending or requires attention', {
        agencyId: input.agencyId,
        invitationId: deliverableInvitation.id,
      });
    }
  }

  return { deferred: false, attempted, sent, failed };
}

export async function deliverPendingAgencyInvitations(agencyId: number) {
  return deliverAgencyInvitations({ agencyId });
}
