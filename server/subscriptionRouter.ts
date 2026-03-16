/**
 * Subscription Router
 * API endpoints for subscription management
 */

import { z } from 'zod';
import { router, publicProcedure, protectedProcedure, superAdminProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import * as subscriptionService from './services/subscriptionService';
import { countActiveListingsByOwner, enforceActiveListingLimitByOwner, getDb } from './db';
import { requireUser } from './_core/requireUser';
import { managerialAuditLogs } from '../drizzle/schema';
import {
  getEntitlementNumber,
  getEntitlementsForPlanId,
  getPlanAccessProjectionForUserId,
  getPlanById,
  getPlanCatalog as getPlanCatalogV2,
  setSubscriptionPlanForOwner,
} from './services/planAccessService';
import { getAgentEntitlementsForUserId } from './services/agentEntitlementService';
import { AuditActions, logAudit } from './_core/auditLog';

function getUserId(ctx: { user: { id: number } | null }) {
  return requireUser(ctx).id;
}

type ListingLimitEnforcementSummary = {
  maxAllowed: number;
  totalActiveBefore: number;
  keptActive: number;
  demotedCount: number;
  demotedListingIds: number[];
};

async function logListingDemotionManagerialAudit(params: {
  actorUserId: number;
  ownerType: 'agent' | 'agency';
  ownerId: number;
  fromPlanId: number | null;
  toPlanId: number;
  source: 'self_serve_billing' | 'admin_override';
  reason?: string;
  enforcement: ListingLimitEnforcementSummary | null;
}) {
  if (params.ownerType !== 'agent') return;
  if (!params.enforcement || params.enforcement.demotedCount <= 0) return;

  const db = await getDb();
  if (!db) return;

  try {
    await db.insert(managerialAuditLogs).values({
      actorUserId: params.actorUserId,
      action: 'subscription_downgrade_listing_demotion',
      targetType: 'agent',
      targetId: params.ownerId,
      beforeData: {
        planId: params.fromPlanId,
        activeListings: params.enforcement.totalActiveBefore,
      },
      afterData: {
        planId: params.toPlanId,
        activeListings: params.enforcement.keptActive,
      },
      metadata: {
        source: params.source,
        reason: params.reason || null,
        maxAllowed: params.enforcement.maxAllowed,
        demotedCount: params.enforcement.demotedCount,
        demotedListingIds: params.enforcement.demotedListingIds,
      },
    });
  } catch (error) {
    console.error('[Subscription] Failed to write managerial audit demotion event:', error);
  }
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

const planCatalogSchema = z
  .object({
    segment: z.enum(['agent', 'agency', 'enterprise', 'developer']).optional(),
  })
  .optional();

const changeMyPlanSchema = z.object({
  planId: z.number(),
  action: z.enum(['upgrade', 'downgrade']).optional(),
});

const adminOverrideSchema = z.object({
  ownerType: z.enum(['agent', 'agency']),
  ownerId: z.number().int().positive(),
  planId: z.number().int().positive(),
  status: z.enum(['trial', 'active', 'expired', 'cancelled']).default('active'),
  trialDays: z.number().int().min(0).max(365).optional(),
  reason: z.string().min(3).max(500),
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

  getPlanCatalog: publicProcedure.input(planCatalogSchema).query(async ({ input }) => {
    return await getPlanCatalogV2(input?.segment);
  }),

  getMyPlanSnapshot: protectedProcedure.input(z.void()).query(async ({ ctx }) => {
    const user = requireUser(ctx);
    const projection = await getPlanAccessProjectionForUserId(user.id);
    if (!projection) return null;
    const entitlements = await getAgentEntitlementsForUserId(user.id);
    const usage =
      projection.ownerType === 'agent'
        ? {
            activeListings: await countActiveListingsByOwner(projection.ownerId),
          }
        : null;

    return {
      ...projection,
      current_plan: projection.currentPlan,
      trial_status: {
        status: projection.trialStatus,
        trialEndsAt: projection.trialEndsAt,
        daysRemaining: projection.trialDaysRemaining,
      },
      usage,
      entitlements: entitlements?.featureFlags || projection.entitlements,
    };
  }),

  changeMyPlan: protectedProcedure.input(changeMyPlanSchema).mutation(async ({ ctx, input }) => {
    const user = requireUser(ctx);
    const current = await getPlanAccessProjectionForUserId(user.id);
    if (!current || !current.currentPlan || !current.subscription) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'No subscription context found for this account.',
      });
    }

    const targetPlan = await getPlanById(input.planId);
    if (!targetPlan) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Target plan not found.' });
    }

    const inferredAction =
      targetPlan.priceMonthly >= current.currentPlan.priceMonthly ? 'upgrade' : 'downgrade';
    const action = input.action || inferredAction;
    let listingLimitEnforcement: ListingLimitEnforcementSummary | null = null;

    if (action === 'downgrade' && current.ownerType === 'agent') {
      const targetEntitlements = await getEntitlementsForPlanId(targetPlan.id);
      const maxActiveListings = getEntitlementNumber(targetEntitlements, 'max_active_listings', -1);
      if (Number.isFinite(maxActiveListings) && maxActiveListings >= 0) {
        const enforcement = await enforceActiveListingLimitByOwner(current.ownerId, maxActiveListings);
        listingLimitEnforcement = {
          maxAllowed: maxActiveListings,
          ...enforcement,
        };
      }
    }

    const keepTrialWindow =
      current.subscription.status === 'trial' &&
      current.trialStatus === 'active' &&
      current.subscription.trialEndsAt;
    const nextStatus = keepTrialWindow ? 'trial' : 'active';

    await setSubscriptionPlanForOwner({
      ownerType: current.ownerType,
      ownerId: current.ownerId,
      planId: targetPlan.id,
      status: nextStatus,
      trialEndsAt: keepTrialWindow ? current.subscription.trialEndsAt : null,
      billingCycleAnchor: keepTrialWindow
        ? current.subscription.trialEndsAt
        : new Date().toISOString().slice(0, 19).replace('T', ' '),
      metadata: {
        source: 'self_serve_billing',
        action,
        previous_plan: current.currentPlan.name,
        next_plan: targetPlan.name,
        listing_limit_enforcement:
          listingLimitEnforcement && listingLimitEnforcement.demotedCount > 0
            ? {
                max_allowed: listingLimitEnforcement.maxAllowed,
                total_active_before: listingLimitEnforcement.totalActiveBefore,
                demoted_count: listingLimitEnforcement.demotedCount,
                demoted_listing_ids: listingLimitEnforcement.demotedListingIds,
              }
            : null,
      },
      actorUserId: user.id,
    });

    await logListingDemotionManagerialAudit({
      actorUserId: user.id,
      ownerType: current.ownerType,
      ownerId: current.ownerId,
      fromPlanId: current.currentPlan.id,
      toPlanId: targetPlan.id,
      source: 'self_serve_billing',
      enforcement: listingLimitEnforcement,
    });

    await logAudit({
      userId: user.id,
      action: AuditActions.UPDATE_SUBSCRIPTION,
      targetType: 'subscription',
      targetId: current.subscription.id,
      metadata: {
        ownerType: current.ownerType,
        ownerId: current.ownerId,
        action,
        fromPlanId: current.currentPlan.id,
        toPlanId: targetPlan.id,
        listingLimitEnforcement,
      },
      req: ctx.req,
    });

    const updatedProjection =
      current.ownerType === 'agent'
        ? await getPlanAccessProjectionForUserId(current.ownerId)
        : await getPlanAccessProjectionForUserId(user.id);

    return {
      success: true,
      action,
      subscription: updatedProjection?.subscription || null,
      current_plan: updatedProjection?.currentPlan || null,
      listing_limit_enforcement: listingLimitEnforcement,
      trial_status: updatedProjection
        ? {
            status: updatedProjection.trialStatus,
            trialEndsAt: updatedProjection.trialEndsAt,
            daysRemaining: updatedProjection.trialDaysRemaining,
          }
        : null,
    };
  }),

  adminOverrideSubscription: superAdminProcedure
    .input(adminOverrideSchema)
    .mutation(async ({ ctx, input }) => {
      const user = requireUser(ctx);
      const targetPlan = await getPlanById(input.planId);
      if (!targetPlan) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Target plan not found.' });
      }
      const currentProjection =
        input.ownerType === 'agent' ? await getPlanAccessProjectionForUserId(input.ownerId) : null;
      let listingLimitEnforcement: ListingLimitEnforcementSummary | null = null;

      if (input.ownerType === 'agent') {
        const targetEntitlements = await getEntitlementsForPlanId(targetPlan.id);
        const maxActiveListings = getEntitlementNumber(targetEntitlements, 'max_active_listings', -1);
        if (Number.isFinite(maxActiveListings) && maxActiveListings >= 0) {
          const enforcement = await enforceActiveListingLimitByOwner(input.ownerId, maxActiveListings);
          listingLimitEnforcement = {
            maxAllowed: maxActiveListings,
            ...enforcement,
          };
        }
      }

      const trialEndsAt =
        input.status === 'trial'
          ? new Date(Date.now() + (input.trialDays ?? targetPlan.trialDays ?? 30) * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 19)
              .replace('T', ' ')
          : null;

      const updatedSubscription = await setSubscriptionPlanForOwner({
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        planId: input.planId,
        status: input.status,
        trialEndsAt,
        billingCycleAnchor:
          input.status === 'trial'
            ? trialEndsAt
            : new Date().toISOString().slice(0, 19).replace('T', ' '),
        metadata: {
          source: 'admin_override',
          reason: input.reason,
          actorUserId: user.id,
          listing_limit_enforcement:
            listingLimitEnforcement && listingLimitEnforcement.demotedCount > 0
              ? {
                  max_allowed: listingLimitEnforcement.maxAllowed,
                  total_active_before: listingLimitEnforcement.totalActiveBefore,
                  demoted_count: listingLimitEnforcement.demotedCount,
                  demoted_listing_ids: listingLimitEnforcement.demotedListingIds,
                }
              : null,
        },
        actorUserId: user.id,
      });

      await logListingDemotionManagerialAudit({
        actorUserId: user.id,
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        fromPlanId: currentProjection?.currentPlan?.id || null,
        toPlanId: input.planId,
        source: 'admin_override',
        reason: input.reason,
        enforcement: listingLimitEnforcement,
      });

      await logAudit({
        userId: user.id,
        action: AuditActions.UPDATE_SUBSCRIPTION,
        targetType: 'subscription',
        targetId: updatedSubscription?.id,
        metadata: {
          ownerType: input.ownerType,
          ownerId: input.ownerId,
          planId: input.planId,
          status: input.status,
          trialEndsAt,
          reason: input.reason,
          override: true,
          listingLimitEnforcement,
        },
        req: ctx.req,
      });

      const projection =
        input.ownerType === 'agent'
          ? await getPlanAccessProjectionForUserId(input.ownerId)
          : null;
      const entitlementSummary =
        input.ownerType === 'agent' ? await getAgentEntitlementsForUserId(input.ownerId) : null;

      return {
        success: true,
        subscription: updatedSubscription,
        current_plan: targetPlan,
        listing_limit_enforcement: listingLimitEnforcement,
        trial_status: projection
          ? {
              status: projection.trialStatus,
              trialEndsAt: projection.trialEndsAt,
              daysRemaining: projection.trialDaysRemaining,
            }
          : null,
        entitlements: entitlementSummary?.featureFlags || null,
      };
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
  getCurrentSubscription: protectedProcedure.input(z.void()).query(async () => ({ subscription: null })),
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
    const subscription = await subscriptionService.getUserSubscriptionWithPlan(getUserId(ctx));
    return subscription;
  }),

  /**
   * Start free trial
   */
  startTrial: protectedProcedure.input(startTrialSchema).mutation(async ({ ctx, input }) => {
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

      const existing = await subscriptionService.getUserSubscription(getUserId(ctx));

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
            getUserId(ctx),
          ],
        );
      } else {
        await db.execute(
          `INSERT INTO user_subscriptions 
           (user_id, plan_id, status, amount_zar, billing_interval, current_period_start, current_period_end, next_billing_date)
           VALUES (?, ?, 'active_paid', ?, ?, ?, ?, ?)`,
          [
            getUserId(ctx),
            input.plan_id,
            plan.price_zar,
            input.billing_interval,
            now,
            periodEnd,
            periodEnd,
          ],
        );
      }

      await subscriptionService.logSubscriptionEvent(getUserId(ctx), 'subscription_created', {
        plan_id: input.plan_id,
        amount: plan.price_zar,
      });

      const subscription = await subscriptionService.getUserSubscription(getUserId(ctx));
      return { subscription, plan };
    }),

  /**
   * Upgrade subscription
   */
  upgrade: protectedProcedure.input(upgradeSchema).mutation(async ({ ctx, input }) => {
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
      const prompt = await subscriptionService.getUpgradePrompt(getUserId(ctx), input.blocked_feature);
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
