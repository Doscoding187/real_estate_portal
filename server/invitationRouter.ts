import { z } from 'zod';
import { router, agencyAdminProcedure, publicProcedure, protectedProcedure } from './_core/trpc';
import { agencies, agents, invitations, users } from '../drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';
import { getDb } from './db';
import { logAudit } from './_core/auditLog';
import crypto from 'crypto';
import { authService } from './_core/auth';
import { COOKIE_NAME } from '@shared/const';
import { getSessionCookieOptions } from './_core/cookies';
import { requireUser } from './_core/requireUser';
import { deliverAgencyInvitations } from './services/agencyInvitationDeliveryService';
import { ensureApprovedAgencyAgentProfile } from './services/agencyMembershipService';

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

    if (existingUser && existingUser.agencyId === agencyId) {
      throw new Error('This user is already part of your agency');
    }

    if (existingUser?.agencyId && existingUser.agencyId !== agencyId) {
      throw new Error('This account already belongs to another agency');
    }

    if (existingUser?.role === 'super_admin' || existingUser?.role === 'property_developer') {
      throw new Error('This account type cannot be invited into an agency team');
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

    // Check if expired
    if (new Date() > new Date(invitation.expiresAt)) {
      // Auto-update status to expired
      await db
        .update(invitations)
        .set({ status: 'expired' })
        .where(eq(invitations.id, invitation.id));

      throw new Error('This invitation has expired');
    }

    if (invitation.status !== 'pending') {
      throw new Error(`This invitation is ${invitation.status}`);
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

    // Get invitation
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, input.token))
      .limit(1);

    if (!invitation) {
      throw new Error('Invitation not found');
    }

    // Verify invitation is valid
    if (invitation.status !== 'pending') {
      throw new Error(`This invitation is ${invitation.status}`);
    }

    if (new Date() > new Date(invitation.expiresAt)) {
      await db
        .update(invitations)
        .set({ status: 'expired' })
        .where(eq(invitations.id, invitation.id));
      throw new Error('This invitation has expired');
    }

    // Verify email matches (user must be logged in with the invited email)
    const user = requireUser(ctx);
    if (normalizeInviteEmail(user.email || '') !== normalizeInviteEmail(invitation.email)) {
      throw new Error('This invitation is for a different email address');
    }

    const [currentUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (!currentUser) {
      throw new Error('User account not found');
    }

    if (currentUser.agencyId && currentUser.agencyId !== invitation.agencyId) {
      throw new Error('This account already belongs to another agency');
    }

    if (currentUser.role === 'super_admin' || currentUser.role === 'property_developer') {
      throw new Error('This account type cannot join an agency team');
    }

    // Principal conversion is not allowed through invitation acceptance:
    // agency_admin invites are for fresh owner accounts, mirroring the
    // createOnboarding rule that refuses principals carrying an agent
    // identity. Existing teams promote roles from the Agency workspace.
    if (invitation.role === 'agency_admin') {
      const [existingAgentProfile] = await db
        .select({ id: agents.id, agencyId: agents.agencyId })
        .from(agents)
        .where(eq(agents.userId, currentUser.id))
        .limit(1);

      if (existingAgentProfile) {
        throw new Error(
          'This account already carries an agent profile and cannot be converted into an agency owner account. Ask the agency to promote your team role instead.',
        );
      }
    }

    // All membership writes commit together: user affiliation, agent profile
    // with its canonical membership row, and invitation acceptance.
    await db.transaction(async tx => {
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

      await tx
        .update(invitations)
        .set({
          status: 'accepted',
          acceptedAt: new Date(),
          acceptedBy: user.id,
        })
        .where(eq(invitations.id, invitation.id));
    });

    // Issue new JWT cookie with updated role
    const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);

    if (updatedUser) {
      const sessionToken = await authService.createSessionToken(
        updatedUser.id,
        updatedUser.email!,
        updatedUser.name || updatedUser.email!,
      );

      ctx.res.cookie(COOKIE_NAME, sessionToken, getSessionCookieOptions(ctx.req));
    }

    // Audit log
    await logAudit({
      userId: user.id,
      action: 'invitation.accept',
      targetType: 'invitation',
      targetId: invitation.id,
      metadata: {
        agencyId: invitation.agencyId,
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

      // Get invitation
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error(`Only pending invitations can be revoked; this invitation is ${invitation.status}`);
      }

      // Verify it's from the same agency
      const user = requireUser(ctx);
      if (invitation.agencyId !== user.agencyId) {
        throw new Error('You can only cancel invitations from your agency');
      }

      // Update status
      await db
        .update(invitations)
        .set({ status: 'cancelled' })
        .where(eq(invitations.id, input.invitationId));

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

      // Get invitation
      const [invitation] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new Error('Invitation not found');
      }

      if (invitation.status !== 'pending') {
        throw new Error(`Only pending invitations can be resent; this invitation is ${invitation.status}`);
      }

      // Verify it's from the same agency
      const user = requireUser(ctx);
      if (invitation.agencyId !== user.agencyId) {
        throw new Error('You can only resend invitations from your agency');
      }

      // Generate new token and expiry
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Update invitation
      await db
        .update(invitations)
        .set({
          token,
          expiresAt,
          status: 'pending',
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, input.invitationId));

      // Audit log
      await logAudit({
        userId: requireUser(ctx).id,
        action: 'invitation.resend',
        targetType: 'invitation',
        targetId: input.invitationId,
        req: ctx.req,
      });

      const [updated] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, input.invitationId));

      let delivery = { deferred: false, attempted: 0, sent: 0, failed: 0 };
      try {
        delivery = await deliverAgencyInvitations({
          agencyId: invitation.agencyId,
          invitationIds: [updated.id],
        });
      } catch (error) {
        delivery = { deferred: false, attempted: 1, sent: 0, failed: 1 };
        console.error('[invitation.resend] Invitation updated but email delivery failed', error);
      }

      return { ...toInvitationClient(updated), delivery };
    }),
});
