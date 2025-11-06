import { z } from 'zod';
import { router, agencyAdminProcedure, publicProcedure, protectedProcedure } from './_core/trpc';
import { invitations, users } from '../drizzle/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import { getDb } from './db';
import { logAudit } from './_core/auditLog';
import crypto from 'crypto';
import { authService } from './_core/auth';
import { COOKIE_NAME } from '@shared/const';
import { getSessionCookieOptions } from './_core/cookies';

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

export const invitationRouter = router({
  /**
   * Create a new invitation (Agency Admin only)
   */
  create: agencyAdminProcedure.input(createInvitationSchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // Verify user has an agency
    if (!ctx.user.agencyId) {
      throw new Error('You must be part of an agency to send invitations');
    }

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, input.email))
      .limit(1);

    if (existingUser && existingUser.agencyId === ctx.user.agencyId) {
      throw new Error('This user is already part of your agency');
    }

    // Check if there's already a pending invitation
    const [existingInvitation] = await db
      .select()
      .from(invitations)
      .where(
        and(
          eq(invitations.email, input.email),
          eq(invitations.agencyId, ctx.user.agencyId),
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
      agencyId: ctx.user.agencyId,
      invitedBy: ctx.user.id,
      email: input.email,
      role: input.role,
      token,
      status: 'pending',
      expiresAt,
    });

    // Audit log
    await logAudit({
      userId: ctx.user.id,
      action: 'invitation.create',
      targetType: 'invitation',
      targetId: Number(result.insertId),
      metadata: {
        email: input.email,
        role: input.role,
      },
      req: ctx.req,
    });

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, Number(result.insertId)));

    return invitation;
  }),

  /**
   * List invitations for the agency (Agency Admin only)
   */
  list: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    if (!ctx.user.agencyId) {
      throw new Error('You must be part of an agency');
    }

    const results = await db
      .select()
      .from(invitations)
      .where(eq(invitations.agencyId, ctx.user.agencyId))
      .orderBy(desc(invitations.createdAt));

    return results;
  }),

  /**
   * Get invitation by token (Public - for acceptance page)
   */
  getByToken: publicProcedure.input(z.object({ token: z.string() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, input.token))
      .limit(1);

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

    return invitation;
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
    if (ctx.user.email !== invitation.email) {
      throw new Error('This invitation is for a different email address');
    }

    // Update user's agency and role
    await db
      .update(users)
      .set({
        agencyId: invitation.agencyId,
        role: invitation.role as any,
        isSubaccount: 1,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ctx.user.id));

    // Mark invitation as accepted
    await db
      .update(invitations)
      .set({
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: ctx.user.id,
      })
      .where(eq(invitations.id, invitation.id));

    // Issue new JWT cookie with updated role
    const [updatedUser] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);

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
      userId: ctx.user.id,
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

      // Verify it's from the same agency
      if (invitation.agencyId !== ctx.user.agencyId) {
        throw new Error('You can only cancel invitations from your agency');
      }

      // Update status
      await db
        .update(invitations)
        .set({ status: 'cancelled' })
        .where(eq(invitations.id, input.invitationId));

      // Audit log
      await logAudit({
        userId: ctx.user.id,
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

      // Verify it's from the same agency
      if (invitation.agencyId !== ctx.user.agencyId) {
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
        userId: ctx.user.id,
        action: 'invitation.resend',
        targetType: 'invitation',
        targetId: input.invitationId,
        req: ctx.req,
      });

      const [updated] = await db
        .select()
        .from(invitations)
        .where(eq(invitations.id, input.invitationId));

      return updated;
    }),
});
