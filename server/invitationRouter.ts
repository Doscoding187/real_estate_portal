import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, agencyAdminProcedure, publicProcedure, protectedProcedure } from './_core/trpc';
import { agencies, agencyAgentMemberships, agents, invitations, users } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './db';
import { logAudit } from './_core/auditLog';
import crypto from 'crypto';
import { authService } from './_core/auth';
import { COOKIE_NAME } from '@shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import { requireUser } from './_core/requireUser';
import {
  deliverAgencyInvitations,
  hasEffectiveAgencyInvitationAccess,
} from './services/agencyInvitationDeliveryService';
import {
  ensureApprovedAgencyAgentProfile,
  isCurrentActiveAgencyMembership,
} from './services/agencyMembershipService';

/**
 * Invitation Router
 * Agency admins can invite agents to join their agency
 */

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['agent', 'agency_admin']).default('agent'),
});

const acceptInvitationSchema = z.object({
  token: z.string(),
});

function normalizeInviteEmail(email: string) {
  return email.trim().toLowerCase();
}

function affectedRows(result: unknown): number {
  const header = Array.isArray(result) ? result[0] : result;
  return Number((header as { affectedRows?: unknown } | null)?.affectedRows ?? 0);
}

/**
 * Locks serialize the normal path. A single retry handles the database's
 * explicit deadlock/serialization response when an adjacent membership or
 * finance transition takes locks in a different, already-established order.
 * Business rejections are never retried.
 */
async function withInvitationTransactionRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const code =
        (error as { cause?: { code?: string }; code?: string })?.cause?.code ??
        (error as { code?: string })?.code;
      if (
        attempt >= 1 ||
        !['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT', '40001'].includes(String(code || ''))
      ) {
        throw error;
      }
    }
  }
}

function invitationIssueTime(invitation: typeof invitations.$inferSelect): number {
  // A resend/token rotation does not create a new invitation authority. Keep
  // the original issue time so it cannot revive a membership that was removed
  // or suspended after the invitation was first issued.
  const value = new Date(invitation.createdAt).getTime();
  return Number.isFinite(value) ? value : Number.MAX_SAFE_INTEGER;
}

function membershipWasClosedAfterInvitation(
  membership: typeof agencyAgentMemberships.$inferSelect,
  invitation: typeof invitations.$inferSelect,
): boolean {
  const terminalStatus = membership.status === 'suspended' || membership.status === 'left';
  const closedWindow =
    membership.status === 'active' &&
    membership.effectiveTo &&
    new Date(membership.effectiveTo).getTime() <= Date.now();
  if (!terminalStatus && !closedWindow) return false;

  const changedAt = Math.max(
    ...[membership.updatedAt, membership.effectiveTo]
      .map(value => (value ? new Date(value).getTime() : Number.NEGATIVE_INFINITY))
      .filter(Number.isFinite),
  );
  return Number.isFinite(changedAt) && changedAt >= invitationIssueTime(invitation);
}

function buildInvitationHistory(invitation: typeof invitations.$inferSelect) {
  const history = [
    {
      event: 'created',
      at: invitation.createdAt,
    },
  ];

  if (invitation.status === 'accepted' && invitation.acceptedAt) {
    history.push({
      event: 'accepted',
      at: invitation.acceptedAt,
    });
  } else if (invitation.status !== 'pending') {
    history.push({
      event: invitation.status,
      at: invitation.updatedAt || invitation.createdAt,
    });
  } else if (invitation.updatedAt && invitation.updatedAt !== invitation.createdAt) {
    history.push({
      event: 'updated',
      at: invitation.updatedAt,
    });
  }

  return history;
}

function toInvitationClient(invitation: typeof invitations.$inferSelect, agency?: { id: number; name: string } | null) {
  return {
    id: invitation.id,
    agencyId: invitation.agencyId,
    agency: agency || null,
    invitedBy: invitation.invitedBy,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expiresAt,
    acceptedAt: invitation.acceptedAt,
    acceptedBy: invitation.acceptedBy,
    createdAt: invitation.createdAt,
    updatedAt: invitation.updatedAt,
    history: buildInvitationHistory(invitation),
  };
}

export const invitationRouter = router({
  /**
   * Create a new invitation (Agency Admin only)
   */
  create: agencyAdminProcedure.input(createInvitationSchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const user = requireUser(ctx);
    const agencyId = user.agencyId;
    const email = normalizeInviteEmail(input.email);
    if (!agencyId) {
      throw new Error('You must be part of an agency to send invitations');
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      // `users.agencyId` and `agents.agencyId` are retained projections. A
      // historical value must not turn a departed member into a permanently
      // affiliated account, nor authorize a current one. The canonical
      // membership window is the only ordinary-member decision here too.
      const [profile] = await db
        .select({ id: agents.id })
        .from(agents)
        .where(eq(agents.userId, existingUser.id))
        .limit(1);
      if (profile) {
        const memberships = await db
          .select()
          .from(agencyAgentMemberships)
          .where(eq(agencyAgentMemberships.agentId, profile.id));
        const currentMembership = memberships.find(isCurrentActiveAgencyMembership);
        if (currentMembership?.agencyId === agencyId) {
          throw new Error('This user is already part of your agency');
        }
        if (currentMembership) {
          throw new Error('This account already belongs to another agency');
        }
      }

      // A principal is distinct from an ordinary membership and cannot be
      // silently moved by an invitation. Historical ordinary-member
      // projections above deliberately do not use this branch.
      if (
        existingUser.role === 'agency_admin' &&
        existingUser.agencyId
      ) {
        throw new Error(
          existingUser.agencyId === agencyId
            ? 'This user already administers your agency'
            : 'This account already administers another agency',
        );
      }
      if (existingUser.role === 'super_admin' || existingUser.role === 'property_developer') {
        throw new Error('This account type cannot be invited into an agency team');
      }
    }

    // Check if there's already a pending invitation
    const [existingInvitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, email),
          eq(invitations.agencyId, agencyId),
          eq(invitations.status, 'pending'),
        ),
      )
      .limit(1);

    if (existingInvitation) {
      throw new Error('An invitation has already been sent to this email');
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiry to 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invitation
    const [result] = await db.insert(invitations).values({
      agencyId,
      invitedBy: user.id,
      email,
      role: input.role,
      token,
      status: 'pending',
      expiresAt,
    });

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'invitation.create',
      targetType: 'invitation',
      targetId: Number(result.insertId),
      metadata: {
        email,
        role: input.role,
        existingAccount: Boolean(existingUser),
      },
      req: ctx.req,
    });

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, Number(result.insertId)));

    let delivery = { deferred: false, attempted: 0, sent: 0, failed: 0 };
    try {
      delivery = await deliverAgencyInvitations({
        agencyId,
        invitationIds: [invitation.id],
      });
    } catch (error) {
      delivery = { deferred: false, attempted: 1, sent: 0, failed: 1 };
      console.error('[invitation.create] Invitation saved but email delivery failed', error);
    }

    return { ...toInvitationClient(invitation), delivery };
  }),

  /**
   * List invitations for the agency (Agency Admin only)
   */
  list: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const user = requireUser(ctx);
    const agencyId = user.agencyId;
    if (!agencyId) {
      throw new Error('You must be part of an agency');
    }

    const results = await db
      .select()
      .from(invitations)
      .where(eq(invitations.agencyId, agencyId))
      .orderBy(desc(invitations.createdAt));

    return results.map(invitation => toInvitationClient(invitation));
  }),

  /**
   * Get invitation by token (Public - for acceptance page)
   */
  getByToken: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const [row] = await db
      .select({
        invitation: invitations,
        agency: {
          id: agencies.id,
          name: agencies.name,
        },
      })
      .from(invitations)
      .leftJoin(agencies, eq(invitations.agencyId, agencies.id))
      .where(eq(invitations.token, input.token))
      .limit(1);

    const invitation = row?.invitation;
    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Never let public inspection rewrite accepted/cancelled terminal history.
    if (invitation.status !== 'pending') {
      throw new Error(`This invitation is ${invitation.status}`);
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      // The conditional transition competes safely with acceptance, cancellation
      // and token rotation. A stale public read cannot overwrite a terminal row.
      await db
        .update(invitations)
        .set({ status: 'expired', updatedAt: new Date() })
        .where(
          and(
            eq(invitations.id, invitation.id),
            eq(invitations.token, input.token),
            eq(invitations.status, 'pending'),
          ),
        );

      throw new Error('This invitation has expired');
    }

    return toInvitationClient(invitation, row.agency);
  }),

  /**
   * Accept invitation (Authenticated user)
   */
  accept: protectedProcedure.input(acceptInvitationSchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const user = requireUser(ctx);
    // The authenticated person is locked before their invitation. That shared
    // order serializes competing Agency invitations for one target user while
    // the invitation lock serializes accept/cancel/resend/token rotation.
    const acceptance = (await withInvitationTransactionRetry(() =>
      db.transaction(async tx => {
      const [currentUser] = await tx
        .select()
        .from(users)
        .where(eq(users.id, user.id))
        .for('update')
        .limit(1);
      if (!currentUser) {
        throw new Error('User account not found');
      }

      const [invitation] = await tx
        .select()
        .from(invitations)
        .where(eq(invitations.token, input.token))
        .for('update')
        .limit(1);
      if (!invitation) {
        throw new Error('Invitation not found');
      }
      if (invitation.status !== 'pending') {
        throw new Error(`This invitation is ${invitation.status}`);
      }
      if (new Date() > new Date(invitation.expiresAt)) {
        // Do not throw from this transaction after the terminal transition:
        // throwing would roll it back and leave an expired token pending.
        const expiration = await tx
          .update(invitations)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(
            and(
              eq(invitations.id, invitation.id),
              eq(invitations.token, input.token),
              eq(invitations.status, 'pending'),
            ),
          );
        if (affectedRows(expiration) !== 1) {
          throw new Error('Invitation expiry transition did not complete.');
        }
        return { kind: 'expired' as const, invitation };
      }
      if (normalizeInviteEmail(currentUser.email || '') !== normalizeInviteEmail(invitation.email)) {
        throw new Error('This invitation is for a different email address');
      }
      if (Number(currentUser.emailVerified) !== 1) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Verify your email before accepting an agency invitation.',
        });
      }
      if (currentUser.role === 'super_admin' || currentUser.role === 'property_developer') {
        throw new Error('This account type cannot join an agency team');
      }
      const [agency] = await tx
        .select({ id: agencies.id, isVerified: agencies.isVerified })
        .from(agencies)
        .where(eq(agencies.id, invitation.agencyId))
        .for('update')
        .limit(1);
      if (!agency || Number(agency.isVerified) !== 1) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Agency approval is required before team membership can be activated.',
        });
      }
      if (!(await hasEffectiveAgencyInvitationAccess(tx, invitation.agencyId))) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Agency team access is available after commercial activation.',
        });
      }

      const [existingAgentProfile] = await tx
        .select()
        .from(agents)
        .where(eq(agents.userId, currentUser.id))
        .for('update')
        .limit(1);
      if (invitation.role === 'agency_admin' && existingAgentProfile) {
        throw new Error(
          'This account already carries an agent profile and cannot be converted into an agency owner account. Ask the agency to promote your team role instead.',
        );
      }
      if (existingAgentProfile) {
        const memberships = await tx
          .select()
          .from(agencyAgentMemberships)
          .where(eq(agencyAgentMemberships.agentId, existingAgentProfile.id))
          .for('update');
        if (memberships.some(membership => isCurrentActiveAgencyMembership(membership))) {
          throw new Error('This account already has a current agency membership.');
        }
        if (
          memberships.some(
            membership =>
              membership.agencyId === invitation.agencyId &&
              membershipWasClosedAfterInvitation(membership, invitation),
          )
        ) {
          throw new Error(
            'A newer agency membership transition invalidated this invitation. Ask an agency administrator to issue a new invitation.',
          );
        }
      }

      // Agency-admin affiliation is a principal authority, not an ordinary
      // member projection. It cannot be replaced through a team token.
      if (currentUser.role === 'agency_admin' && currentUser.agencyId) {
        throw new Error('This account already administers an agency');
      }

      await tx
        .update(users)
        .set({
          agencyId: invitation.agencyId,
          role: invitation.role as any,
          isSubaccount: 1,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      await ensureApprovedAgencyAgentProfile({
        db: tx,
        user: currentUser,
        agencyId: invitation.agencyId,
        actorUserId: invitation.invitedBy,
      });

      const consumption = await tx
        .update(invitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedBy: user.id,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(invitations.id, invitation.id),
            eq(invitations.token, input.token),
            eq(invitations.status, 'pending'),
          ),
        );
      if (affectedRows(consumption) !== 1) {
        throw new Error('Invitation consumption did not complete.');
      }
      return { kind: 'accepted' as const, invitation };
      }),
    )) as
      | { kind: 'expired'; invitation: typeof invitations.$inferSelect }
      | { kind: 'accepted'; invitation: typeof invitations.$inferSelect };

    if (acceptance.kind === 'expired') throw new Error('This invitation has expired');
    const acceptedInvitation = acceptance.invitation;

    // Issue new JWT cookie with updated role
    const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (updatedUser) {
      const sessionToken = await authService.createSessionToken(
        updatedUser.id,
        updatedUser.email!,
        updatedUser.name || updatedUser.email!,
        updatedUser.sessionVersion,
      );

      ctx.res.cookie(COOKIE_NAME, sessionToken, getSessionCookieOptions(ctx.req));
    }

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'invitation.accept',
      targetType: 'invitation',
      targetId: acceptedInvitation.id,
      metadata: {
        agencyId: acceptedInvitation.agencyId,
      },
      req: ctx.req,
    });

    return { success: true };
  }),

  /**
   * Cancel invitation (Agency Admin only)
   */
  cancel: agencyAdminProcedure
    .input(z.object({ invitationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const user = requireUser(ctx);
      await withInvitationTransactionRetry(() =>
        db.transaction(async tx => {
        const [invitation] = await tx
          .select()
          .from(invitations)
          .where(eq(invitations.id, input.invitationId))
          .for('update')
          .limit(1);
        if (!invitation) throw new Error('Invitation not found');
        if (invitation.status !== 'pending') {
          throw new Error(`Only pending invitations can be revoked; this invitation is ${invitation.status}`);
        }
        if (invitation.agencyId !== user.agencyId) {
          throw new Error('You can only cancel invitations from your agency');
        }
        const cancellation = await tx
          .update(invitations)
          .set({ status: 'cancelled', updatedAt: new Date() })
          .where(and(eq(invitations.id, invitation.id), eq(invitations.status, 'pending')));
        if (affectedRows(cancellation) !== 1) {
          throw new Error('Invitation cancellation did not complete.');
        }
        }),
      );

      // Audit log
      await logAudit({
        userId: requireUser(ctx).id,
        action: 'invitation.cancel',
        targetType: 'invitation',
        targetId: input.invitationId,
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Resend invitation (creates new token with new expiry)
   */
  resend: agencyAdminProcedure
    .input(z.object({ invitationId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      const user = requireUser(ctx);
      const updated = (await withInvitationTransactionRetry(() =>
        db.transaction(async tx => {
        const [invitation] = await tx
          .select()
          .from(invitations)
          .where(eq(invitations.id, input.invitationId))
          .for('update')
          .limit(1);
        if (!invitation) throw new Error('Invitation not found');
        if (invitation.status !== 'pending') {
          throw new Error(`Only pending invitations can be resent; this invitation is ${invitation.status}`);
        }
        if (invitation.agencyId !== user.agencyId) {
          throw new Error('You can only resend invitations from your agency');
        }

        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7);
        const rotation = await tx
          .update(invitations)
          .set({ token, expiresAt, status: 'pending', updatedAt: new Date() })
          .where(and(eq(invitations.id, invitation.id), eq(invitations.status, 'pending')));
        if (affectedRows(rotation) !== 1) {
          throw new Error('Invitation token rotation did not complete.');
        }
        const [rotated] = await tx
          .select()
          .from(invitations)
          .where(eq(invitations.id, invitation.id))
          .limit(1);
        if (!rotated) throw new Error('Invitation token rotation did not complete.');
        return rotated;
        }),
      )) as typeof invitations.$inferSelect;

      // Audit log
      await logAudit({
        userId: requireUser(ctx).id,
        action: 'invitation.resend',
        targetType: 'invitation',
        targetId: input.invitationId,
        req: ctx.req,
      });

      let delivery = { deferred: false, attempted: 0, sent: 0, failed: 0 };
      try {
        delivery = await deliverAgencyInvitations({
          agencyId: updated.agencyId,
          invitationIds: [updated.id],
        });
      } catch (error) {
        delivery = { deferred: false, attempted: 1, sent: 0, failed: 1 };
        console.error('[invitation.resend] Invitation updated but email delivery failed', error);
      }

      return { ...toInvitationClient(updated), delivery };
    }),
});
