import { z } from 'zod';
import { router, superAdminProcedure } from './_core/trpc';
import { users } from '../drizzle/schema';
import { eq, like, or, desc, and } from 'drizzle-orm';
import { getDb } from './db';
import { logAudit } from './_core/auditLog';

/**
 * User Management Router - Super Admin only
 * Manages users, roles, and agency assignments
 */

// Validation schemas
const userFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.enum(['visitor', 'agent', 'agency_admin', 'property_developer', 'super_admin']).optional(),
  agencyId: z.number().optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const updateUserRoleSchema = z.object({
  userId: z.number(),
  role: z.enum(['visitor', 'agent', 'agency_admin', 'property_developer', 'super_admin']),
});

const assignToAgencySchema = z.object({
  userId: z.number(),
  agencyId: z.number().nullable(),
  isSubaccount: z.boolean().default(false),
});

export const userRouter = router({
  /**
   * Get all users with filters (Super Admin only)
   */
  list: superAdminProcedure.input(userFiltersSchema).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    let query = db.select().from(users);

    // Apply filters
    const conditions = [];

    if (input.search) {
      conditions.push(
        or(
          like(users.email, `%${input.search}%`),
          like(users.name, `%${input.search}%`),
          like(users.firstName, `%${input.search}%`),
          like(users.lastName, `%${input.search}%`),
        ),
      );
    }

    if (input.role) {
      conditions.push(eq(users.role, input.role));
    }

    if (input.agencyId !== undefined) {
      if (input.agencyId === null) {
        conditions.push(eq(users.agencyId, null));
      } else {
        conditions.push(eq(users.agencyId, input.agencyId));
      }
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const results = await query
      .orderBy(desc(users.createdAt))
      .limit(input.limit)
      .offset(input.offset);

    // Get total count for pagination
    const allUsers = await db.select().from(users);
    const total = allUsers.length;

    return {
      users: results,
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }),

  /**
   * Get user by ID (Super Admin only)
   */
  getById: superAdminProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }),

  /**
   * Update user role (Super Admin only)
   */
  updateRole: superAdminProcedure.input(updateUserRoleSchema).mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    // Get the user
    const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

    if (!user) {
      throw new Error('User not found');
    }

    // Prevent demoting the last super admin
    if (user.role === 'super_admin' && input.role !== 'super_admin') {
      const superAdmins = await db.select().from(users).where(eq(users.role, 'super_admin'));

      if (superAdmins.length === 1) {
        throw new Error('Cannot demote the last super admin');
      }
    }

    // Update role
    await db
      .update(users)
      .set({
        role: input.role,
        updatedAt: new Date(),
      })
      .where(eq(users.id, input.userId));

    // Audit log
    await logAudit({
      userId: ctx.user.id,
      action: 'user.update_role',
      targetType: 'user',
      targetId: input.userId,
      metadata: {
        oldRole: user.role,
        newRole: input.role,
      },
      req: ctx.req,
    });

    const [updated] = await db.select().from(users).where(eq(users.id, input.userId));
    return updated;
  }),

  /**
   * Assign user to agency (Super Admin only)
   */
  assignToAgency: superAdminProcedure
    .input(assignToAgencySchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Get the user
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Update agency assignment
      await db
        .update(users)
        .set({
          agencyId: input.agencyId,
          isSubaccount: input.agencyId ? (input.isSubaccount ? 1 : 0) : 0,
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));

      // Audit log
      await logAudit({
        userId: ctx.user.id,
        action: input.agencyId ? 'user.assign_agency' : 'user.remove_agency',
        targetType: 'user',
        targetId: input.userId,
        metadata: {
          agencyId: input.agencyId,
          isSubaccount: input.isSubaccount,
        },
        req: ctx.req,
      });

      const [updated] = await db.select().from(users).where(eq(users.id, input.userId));
      return updated;
    }),

  /**
   * Delete user (Super Admin only)
   */
  delete: superAdminProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new Error('Database not available');
      }

      // Get the user
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Prevent deleting yourself
      if (user.id === ctx.user.id) {
        throw new Error('Cannot delete your own account');
      }

      // Prevent deleting the last super admin
      if (user.role === 'super_admin') {
        const superAdmins = await db.select().from(users).where(eq(users.role, 'super_admin'));

        if (superAdmins.length === 1) {
          throw new Error('Cannot delete the last super admin');
        }
      }

      // Delete user
      await db.delete(users).where(eq(users.id, input.userId));

      // Audit log
      await logAudit({
        userId: ctx.user.id,
        action: 'user.delete',
        targetType: 'user',
        targetId: input.userId,
        metadata: {
          email: user.email,
          role: user.role,
        },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Get user statistics
   */
  stats: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new Error('Database not available');
    }

    const allUsers = await db.select().from(users);

    const stats = {
      total: allUsers.length,
      byRole: {
        super_admin: allUsers.filter(u => u.role === 'super_admin').length,
        agency_admin: allUsers.filter(u => u.role === 'agency_admin').length,
        agent: allUsers.filter(u => u.role === 'agent').length,
        visitor: allUsers.filter(u => u.role === 'visitor').length,
      },
      withAgency: allUsers.filter(u => u.agencyId !== null).length,
      subaccounts: allUsers.filter(u => u.isSubaccount === 1).length,
    };

    return stats;
  }),
});
