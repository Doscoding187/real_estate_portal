import { randomBytes } from 'node:crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  agencies,
  billableAccounts,
  invitations,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { ENV } from '../_core/env';
import { EmailService } from '../_core/emailService';
import { getDb } from '../db';

const ACTIVE_AGENCY_SUBSCRIPTION_STATUSES = new Set(['active', 'grace_period']);
const INVITATION_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;
const INVITATION_TOKEN_PATTERN = /^[a-f0-9]{64}$/i;

type CanonicalGateSubscription = {
  status: string | null;
  currentPeriodEnd: string | Date | null;
  graceEndsAt: string | Date | null;
};

type InvitationCommercialDatabase = Pick<NonNullable<Awaited<ReturnType<typeof getDb>>>, 'select'>;

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
  const [subscription] = await db
    .select({
      status: subscriptions.status,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
      graceEndsAt: subscriptions.graceEndsAt,
    })
    .from(subscriptions)
    .where(
      sql`EXISTS (
      SELECT 1
      FROM ${billableAccounts} account
      WHERE account.id = ${subscriptions.billableAccountId}
        AND account.account_kind = 'agency'
        AND account.agency_id = ${agencyId}
    )`,
    )
    .limit(1);

  return hasEffectiveAgencyPaidAccess(subscription ?? null);
}

export type AgencyInvitationDeliveryResult = {
  deferred: boolean;
  attempted: number;
  sent: number;
  failed: number;
};

export function buildAgencyInvitationUrl(token: string) {
  return `${ENV.appUrl}/accept-invitation?token=${encodeURIComponent(token)}`;
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

function inviterName(
  user?: Pick<typeof users.$inferSelect, 'name' | 'firstName' | 'lastName' | 'email'> | null,
) {
  const name = String(user?.name || '').trim();
  if (name) return name;

  const parts = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (parts) return parts;

  return String(user?.email || '').split('@')[0] || 'Your agency team';
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
  let sent = 0;
  let failed = 0;

  for (const invitation of pending) {
    // Onboarding can safely queue an invitation while commercial activation is
    // unavailable. Its acceptance token must begin its validity window when
    // delivery actually starts, not while the invitation is waiting unsent.
    let deliverableInvitation = invitation;
    if (queuedInvitationNeedsRefresh(invitation)) {
      const refreshedAt = new Date();
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(refreshedAt.getTime() + INVITATION_VALIDITY_MS);

      await db
        .update(invitations)
        .set({ token, expiresAt, updatedAt: refreshedAt })
        .where(eq(invitations.id, invitation.id));

      deliverableInvitation = {
        ...invitation,
        token,
        expiresAt: expiresAt.toISOString(),
        updatedAt: refreshedAt.toISOString(),
      };
    }

    const [inviter] = await db
      .select({
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, invitation.invitedBy))
      .limit(1);

    const delivered = await EmailService.sendAgencyInvitationEmail(
      invitation.email,
      inviterName(inviter),
      agency.name,
      buildAgencyInvitationUrl(deliverableInvitation.token),
    );

    if (delivered) {
      sent += 1;
    } else {
      failed += 1;
      console.error('[AgencyInvitationDelivery] Invitation email was not accepted by provider', {
        agencyId: input.agencyId,
        invitationId: invitation.id,
      });
    }
  }

  return { deferred: false, attempted: pending.length, sent, failed };
}

export async function deliverPendingAgencyInvitations(agencyId: number) {
  return deliverAgencyInvitations({ agencyId });
}
