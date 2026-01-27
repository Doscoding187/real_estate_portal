/**
 * Subscription Router
 * API endpoints for subscription management
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, superAdminProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import * as subscriptionService from './services/subscriptionService';
import { getDb } from './db';

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
      return plans;
    }),

  /**
   * Get specific plan details
   */
  getPlan: publicProcedure.input(z.object({ plan_id: z.string() })).query(async ({ input }) => {
    const plan = await subscriptionService.getPlanByPlanId(input.plan_id);
    if (!plan) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
    }
    return plan;
  }),

  // =====================================================
  // USER SUBSCRIPTION ENDPOINTS
  // =====================================================

  /**
   * Get current user's subscription
   */
  getMySubscription: protectedProcedure.query(async ({ ctx }) => {
    const subscription = await subscriptionService.getUserSubscriptionWithPlan(ctx.user.id);
    return subscription;
  }),

  /**
   * Start free trial
   */
  startTrial: protectedProcedure.input(startTrialSchema).mutation(async ({ ctx, input }) => {
    try {
      const subscription = await subscriptionService.startTrial(ctx.user.id, input.category);
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
  createSubscription: protectedProcedure
    .input(createSubscriptionSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const plan = await subscriptionService.getPlanByPlanId(input.plan_id);
      if (!plan) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
      }

      // Here you would integrate with Stripe/Paystack
      // For now, we'll create a basic subscription

      const now = new Date();
      const periodEnd = new Date(now);
      if (input.billing_interval === 'yearly') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }

      const existing = await subscriptionService.getUserSubscription(ctx.user.id);

      if (existing) {
        await db.execute(
          `UPDATE user_subscriptions 
           SET plan_id = ?, status = 'active_paid', amount_zar = ?, billing_interval = ?,
               current_period_start = ?, current_period_end = ?, next_billing_date = ?, updated_at = NOW()
           WHERE user_id = ?`,
          [
            input.plan_id,
            plan.price_zar,
            input.billing_interval,
            now,
            periodEnd,
            periodEnd,
            ctx.user.id,
          ],
        );
      } else {
        await db.execute(
          `INSERT INTO user_subscriptions 
           (user_id, plan_id, status, amount_zar, billing_interval, current_period_start, current_period_end, next_billing_date)
           VALUES (?, ?, 'active_paid', ?, ?, ?, ?, ?)`,
          [
            ctx.user.id,
            input.plan_id,
            plan.price_zar,
            input.billing_interval,
            now,
            periodEnd,
            periodEnd,
          ],
        );
      }

      await subscriptionService.logSubscriptionEvent(ctx.user.id, 'subscription_created', {
        plan_id: input.plan_id,
        amount: plan.price_zar,
      });

      const subscription = await subscriptionService.getUserSubscription(ctx.user.id);
      return { subscription, plan };
    }),

  /**
   * Upgrade subscription
   */
  upgrade: protectedProcedure.input(upgradeSchema).mutation(async ({ ctx, input }) => {
    try {
      await subscriptionService.upgradeSubscription(
        ctx.user.id,
        input.new_plan_id,
        input.immediate,
      );
      const updated = await subscriptionService.getUserSubscriptionWithPlan(ctx.user.id);
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
    try {
      await subscriptionService.downgradeSubscription(
        ctx.user.id,
        input.new_plan_id,
        input.immediate,
      );
      const updated = await subscriptionService.getUserSubscriptionWithPlan(ctx.user.id);
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
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      const subscription = await subscriptionService.getUserSubscription(ctx.user.id);
      if (!subscription) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No active subscription' });
      }

      const now = new Date();
      const endsAt = input.immediate ? now : subscription.current_period_end || now;

      await db.execute(
        `UPDATE user_subscriptions 
         SET status = 'cancelled', cancelled_at = ?, ends_at = ?, updated_at = NOW()
         WHERE user_id = ?`,
        [now, endsAt, ctx.user.id],
      );

      await subscriptionService.logSubscriptionEvent(ctx.user.id, 'subscription_cancelled', {
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
    const access = await subscriptionService.checkFeatureAccess(
      ctx.user.id,
      input.permission as any,
    );
    return access;
  }),

  /**
   * Check usage limit
   */
  checkLimit: protectedProcedure.input(checkLimitSchema).query(async ({ ctx, input }) => {
    const limitCheck = await subscriptionService.checkLimit(
      ctx.user.id,
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
      const prompt = await subscriptionService.getUpgradePrompt(ctx.user.id, input.blocked_feature);
      return prompt;
    }),

  // =====================================================
  // USAGE TRACKING
  // =====================================================

  /**
   * Get current usage
   */
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

    const subscription = await subscriptionService.getUserSubscription(ctx.user.id);
    if (!subscription) return null;

    const [rows] = await db.execute(
      `SELECT * FROM subscription_usage 
       WHERE user_id = ? AND subscription_id = ?
       ORDER BY period_start DESC LIMIT 1`,
      [ctx.user.id, subscription.id],
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
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database unavailable' });

      let query = `
        SELECT us.*, sp.name as plan_name, sp.category, u.email, u.name as user_name
        FROM user_subscriptions us
        JOIN subscription_plans sp ON us.plan_id = sp.plan_id
        JOIN users u ON us.user_id = u.id
        WHERE 1=1
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
      FROM user_subscriptions
      GROUP BY status
    `);

    // Revenue by category
    const [categoryRevenue] = await db.execute(`
      SELECT sp.category, COUNT(*) as count, SUM(us.amount_zar) as total_revenue
      FROM user_subscriptions us
      JOIN subscription_plans sp ON us.plan_id = sp.plan_id
      WHERE us.status = 'active_paid'
      GROUP BY sp.category
    `);

    // MRR calculation
    const [mrrData] = await db.execute(`
      SELECT SUM(amount_zar) as total_mrr
      FROM user_subscriptions
      WHERE status = 'active_paid' AND billing_interval = 'monthly'
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
      await subscriptionService.expireTrial(input.user_id);
      return { success: true };
    }),
});
