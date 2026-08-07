/**
 * Subscription Router
 * API endpoints for subscription management
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, superAdminProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import * as subscriptionService from './services/subscriptionService';
import { getDb } from './db';
import { requireUser } from './_core/requireUser';

function getUserId(ctx: { user: { id: number } | null }) {
  return requireUser(ctx).id;
}

function rejectLegacyAgentCommercialPath(ctx: {
  user: { id: number; role?: string | null } | null;
}) {
  if (requireUser(ctx).role === 'agent') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'Legacy agent subscription operations are retired. Use the canonical billing and commercial catalog authorities.',
    });
  }
}

function rejectLegacyDeveloperCommercialPath(ctx: {
  user: { id: number; role?: string | null } | null;
}) {
  if (requireUser(ctx).role === 'property_developer') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'Legacy developer subscription operations are retired. Use Developer Launch Access through the canonical commercial catalog and verified billing authority.',
    });
  }
}

function rejectLegacyDeveloperTrialCategory() {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message:
      'Legacy developer free trials are retired. Use Developer Launch Access through the canonical commercial catalog and verified billing authority.',
  });
}

function rejectLegacyUserCommercialPath(ctx: {
  user: { id: number; role?: string | null } | null;
}) {
  rejectLegacyAgentCommercialPath(ctx);
  rejectLegacyDeveloperCommercialPath(ctx);
}

// =====================================================
// VALIDATION SCHEMAS
// =====================================================

const createSubscriptionSchema = z.object({
  plan_id: z.string(),
  billing_interval: z.enum(['monthly', 'yearly']),
  payment_method_id: z.string().optional(),
  payment_gateway: z.enum(['stripe', 'paystack', 'manual']),
});

const upgradeSchema = z.object({
  new_plan_id: z.string(),
  immediate: z.boolean().default(true),
});

const downgradeSchema = z.object({
  new_plan_id: z.string(),
  immediate: z.boolean().default(false),
  reason: z.string().optional(),
});

const startTrialSchema = z.object({
  category: z.enum(['agent', 'agency', 'developer']),
});

const checkFeatureSchema = z.object({
  permission: z.string(),
});

const checkLimitSchema = z.object({
  limit_type: z.enum(['listings', 'projects', 'agents', 'boosts', 'crm_contacts']),
  current_count: z.number(),
});

// =====================================================
// SUBSCRIPTION ROUTER
// =====================================================

export const subscriptionRouter = router({
  // =====================================================
  // PUBLIC ENDPOINTS
  // =====================================================

  /**
   * Get all available plans
   */
  getPlans: publicProcedure
    .input(
      z
        .object({
          category: z.enum(['agent', 'agency', 'developer']).optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const plans = await subscriptionService.getAllPlans(input?.category);
      return plans.filter(plan => plan.category !== 'agent' && plan.category !== 'developer');
    }),

  /**
   * Get specific plan details
   */
  getPlan: publicProcedure.input(z.object({ plan_id: z.string() })).query(async ({ input }) => {
    const plan = await subscriptionService.getPlanByPlanId(input.plan_id);
    if (!plan || plan.category === 'agent' || plan.category === 'developer') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
    }
    return plan;
  }),

  // Compatibility stubs for client expectations
  getAvailablePlans: protectedProcedure.input(z.void()).query(async () => {
    return { plans: [] as any[] };
  }),
  createPlan: protectedProcedure.input(z.any()).mutation(async () => ({ ok: true })),
  updatePlan: protectedProcedure.input(z.any()).mutation(async () => ({ ok: true })),
  togglePlanStatus: protectedProcedure.input(z.any()).mutation(async () => ({ ok: true })),
  getPaymentProofs: protectedProcedure.input(z.any()).query(async () => ({ proofs: [] as any[] })),
  verifyPayment: protectedProcedure.input(z.any()).mutation(async () => ({ ok: true })),
  getCurrentSubscription: protectedProcedure
    .input(z.void())
    .query(async () => ({ subscription: null })),
  getMyInvoices: protectedProcedure
    .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }))
    .query(async () => ({ invoices: [] as any[], total: 0 })),
  getBankingDetails: protectedProcedure.input(z.void()).query(async () => ({ bank: null })),
  submitPaymentProof: protectedProcedure.input(z.any()).mutation(async () => ({ ok: true })),
  upgradeSubscription: protectedProcedure.input(z.any()).mutation(async () => ({ ok: true })),

  // =====================================================
  // USER SUBSCRIPTION ENDPOINTS
  // =====================================================

  /**
   * Get current user's subscription
   */
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    rejectLegacyUserCommercialPath(ctx);
    const subscription = await subscriptionService.getUserSubscriptionWithPlan(getUserId(ctx));
    return subscription;
  }),

  /**
   * Start free trial
   */
  startTrial: protectedProcedure.input(startTrialSchema).mutation(async ({ ctx, input }) => {
    if (input.category === 'agent') rejectLegacyAgentCommercialPath(ctx);
    if (input.category === 'developer') rejectLegacyDeveloperTrialCategory();
    try {
      const subscription = await subscriptionService.startTrial(getUserId(ctx), input.category);
      const plan = await subscriptionService.getPlanByPlanId(subscription.plan_id);

      return {
        subscription,
        plan,
        trial_ends_at: subscription.trial_ends_at,
      };
    } catch (error: any) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message || 'Failed to start trial',
      });
    }
  }),

  /**
   * Create paid subscription
   */
  createSubscription: protectedProcedure.input(createSubscriptionSchema).mutation(async () => {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'Legacy paid subscription activation is disabled. Use the canonical billing authority and verified payment workflow.',
    });
  }),

  /**
   * Upgrade subscription
   */
  upgrade: protectedProcedure.input(upgradeSchema).mutation(async ({ ctx, input }) => {
    rejectLegacyUserCommercialPath(ctx);
    try {
      await subscriptionService.upgradeSubscription(
        getUserId(ctx),
        input.new_plan_id,
        input.immediate,
      );
      const updated = await subscriptionService.getUserSubscriptionWithPlan(getUserId(ctx));
      return updated;
    } catch (error: any) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message || 'Failed to upgrade subscription',
      });
    }
  }),

  /**
   * Downgrade subscription
   */
  downgrade: protectedProcedure.input(downgradeSchema).mutation(async ({ ctx, input }) => {
    rejectLegacyUserCommercialPath(ctx);
    try {
      await subscriptionService.downgradeSubscription(
        getUserId(ctx),
        input.new_plan_id,
        input.immediate,
      );
      const updated = await subscriptionService.getUserSubscriptionWithPlan(getUserId(ctx));
      return updated;
    } catch (error: any) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: error.message || 'Failed to downgrade subscription',
      });
    }
  }),

  /**
   * Cancel subscription
   */
  cancel: protectedProcedure
    .input(z.object({ immediate: z.boolean().default(false) }))
    .mutation(async ({ ctx, input }) => {
      rejectLegacyUserCommercialPath(ctx);
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const subscription = await subscriptionService.getUserSubscription(getUserId(ctx));
      if (!subscription) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No active subscription' });
      }

      const now = new Date();
      const endsAt = input.immediate ? now : subscription.current_period_end || now;

      await db.execute(
        `UPDATE user_subscriptions 
         SET status = 'cancelled', cancelled_at = ?, ends_at = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [now, endsAt, getUserId(ctx)],
      );

      await subscriptionService.logSubscriptionEvent(getUserId(ctx), 'subscription_cancelled', {
        cancelled_at: now,
        ends_at: endsAt,
      });

      return { success: true, ends_at: endsAt };
    }),

  // =====================================================
  // FEATURE ACCESS & LIMITS
  // =====================================================

  /**
   * Check feature access
   */
  checkFeature: protectedProcedure.input(checkFeatureSchema).query(async ({ ctx, input }) => {
    rejectLegacyUserCommercialPath(ctx);
    const access = await subscriptionService.checkFeatureAccess(
      getUserId(ctx),
      input.permission as any,
    );
    return access;
  }),

  /**
   * Check usage limit
   */
  checkLimit: protectedProcedure.input(checkLimitSchema).query(async ({ ctx, input }) => {
    rejectLegacyUserCommercialPath(ctx);
    const limitCheck = await subscriptionService.checkLimit(
      getUserId(ctx),
      input.limit_type,
      input.current_count,
    );
    return limitCheck;
  }),

  /**
   * Get upgrade prompt for blocked feature
   */
  getUpgradePrompt: protectedProcedure
    .input(z.object({ blocked_feature: z.string() }))
    .query(async ({ ctx, input }) => {
      rejectLegacyUserCommercialPath(ctx);
      const prompt = await subscriptionService.getUpgradePrompt(
        getUserId(ctx),
        input.blocked_feature,
      );
      return prompt;
    }),

  // =====================================================
  // USAGE TRACKING
  // =====================================================

  /**
   * Get current usage
   */
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    rejectLegacyUserCommercialPath(ctx);
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

    const subscription = await subscriptionService.getUserSubscription(getUserId(ctx));
    if (!subscription) return null;

    const [rows] = await db.execute(
      `SELECT * FROM subscription_usage 
       WHERE user_id = ? AND subscription_id = ?
       ORDER BY period_start DESC LIMIT 1`,
      [getUserId(ctx), subscription.id],
    );

    const usage = (rows as any[])[0] || null;
    return usage;
  }),

  // =====================================================
  // SUPER ADMIN ENDPOINTS
  // =====================================================

  /**
   * Get all subscriptions (Admin only)
   */
  getAllSubscriptions: superAdminProcedure
    .input(
      z.object({
        status: z.string().optional(),
        category: z.enum(['agent', 'agency', 'developer']).optional(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      }),
    )
    .query(async ({ input }) => {
      if (input.category === 'agent' || input.category === 'developer') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Legacy agent and developer subscription administration is retired.',
        });
      }
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      let query = `
        SELECT us.*, sp.name as plan_name, sp.category, u.email, u.name as user_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.plan_id
        JOIN users u ON us.user_id = u.id
        WHERE sp.category NOT IN ('agent', 'developer')
      `;
      const params: any[] = [];

      if (input.status) {
        query += ' AND us.status = ?';
        params.push(input.status);
      }

      if (input.category) {
        query += ' AND sp.category = ?';
        params.push(input.category);
      }

      query += ' ORDER BY us.created_at DESC LIMIT ? OFFSET ?';
      params.push(input.limit, input.offset);

      const [rows] = await db.execute(query, params);
      return rows;
    }),

  /**
   * Get subscription analytics (Admin only)
   */
  getAnalytics: superAdminProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

    // Total subscriptions by status
    const [statusStats] = await db.execute(`
      SELECT status, COUNT(*) as count
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.plan_id
      WHERE sp.category NOT IN ('agent', 'developer')
      GROUP BY status
    `);

    // Revenue by category
    const [categoryRevenue] = await db.execute(`
      SELECT sp.category, COUNT(*) as count, SUM(us.amount_zar) as total_revenue
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.plan_id
      WHERE us.status = 'active_paid' AND sp.category NOT IN ('agent', 'developer')
      GROUP BY sp.category
    `);

    // MRR calculation
    const [mrrData] = await db.execute(`
      SELECT SUM(amount_zar) as total_mrr
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.plan_id
      WHERE us.status = 'active_paid' AND us.billing_interval = 'monthly' AND sp.category NOT IN ('agent', 'developer')
    `);

    const mrr = ((mrrData as any[])[0]?.total_mrr || 0) / 100; // Convert from cents

    return {
      statusStats,
      categoryRevenue,
      mrr,
    };
  }),

  /**
   * Force expire trial (Admin only)
   */
  forceExpireTrial: superAdminProcedure
    .input(z.object({ user_id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });
      const [rows] = await db.execute('SELECT role FROM users WHERE id = ?', [input.user_id]);
      if (
        ['agent', 'property_developer'].includes((rows as Array<{ role?: string }>)[0]?.role || '')
      ) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Legacy agent and developer trial administration is retired.',
        });
      }
      await subscriptionService.expireTrial(input.user_id);
      return { success: true };
    }),
});
