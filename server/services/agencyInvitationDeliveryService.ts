import { and, eq, inArray } from 'drizzle-orm';
import { agencies, invitations, users } from '../../drizzle/schema';
import { ENV } from '../_core/env';
import { EmailService } from '../_core/emailService';
import { getDb } from '../db';

const ACTIVE_AGENCY_SUBSCRIPTION_STATUSES = new Set(['active', 'grace_period']);

export type AgencyInvitationDeliveryResult = {
  deferred: boolean;
  attempted: number;
  sent: number;
  failed: number;
};

export function buildAgencyInvitationUrl(token: string) {
  return `${ENV.appUrl}/accept-invitation?token=${encodeURIComponent(token)}`;
}

function inviterName(user?: Pick<typeof users.$inferSelect, 'name' | 'firstName' | 'lastName' | 'email'> | null) {
  const name = String(user?.name || '').trim();
  if (name) return name;

  const parts = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (parts) return parts;

  return String(user?.email || '').split('@')[0] || 'Your agency team';
}

/**
 * Delivers accepted-format invitation links only after canonical paid access
 * is active. Pending onboarding invitations remain safely queued in the
 * invitations table until finance has approved the payment.
 */
export async function deliverAgencyInvitations(input: {
  agencyId: number;
  invitationIds?: number[];
}): Promise<AgencyInvitationDeliveryResult> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const [agency] = await db
    .select({ id: agencies.id, name: agencies.name, subscriptionStatus: agencies.subscriptionStatus })
    .from(agencies)
    .where(eq(agencies.id, input.agencyId))
    .limit(1);

  if (!agency) throw new Error('Agency not found');
  if (!ACTIVE_AGENCY_SUBSCRIPTION_STATUSES.has(String(agency.subscriptionStatus || ''))) {
    return { deferred: true, attempted: 0, sent: 0, failed: 0 };
  }

  const filters = [eq(invitations.agencyId, input.agencyId), eq(invitations.status, 'pending')];
  if (input.invitationIds?.length) {
    filters.push(inArray(invitations.id, input.invitationIds));
  }

  const pending = await db.select().from(invitations).where(and(...filters));
  let sent = 0;
  let failed = 0;

  for (const invitation of pending) {
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
      buildAgencyInvitationUrl(invitation.token),
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
