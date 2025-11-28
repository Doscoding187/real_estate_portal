import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getDb } from './db';
import {
  plans,
  agencySubscriptions,
  invoices,
  paymentMethods,
  coupons,
  agencies,
  users,
  paymentProofs,
} from '../drizzle/schema';
import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { recordSubscriptionTransaction, recordFailedPayment } from './revenueCenterSync';

/**
 * Subscription Management Router
 * Handles subscription lifecycle, plan management, billing, and payments
 */

const t = initTRPC.create();
const router = t.router;
const publicProcedure = t.procedure;

// Middleware for authenticated users
const isAuthenticated = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const authenticatedProcedure = publicProcedure.use(isAuthenticated);

// Middleware for admin users
const isAdmin = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user || (ctx.user.role !== 'super_admin' && ctx.user.role !== 'admin')) {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

const adminProcedure = authenticatedProcedure.use(isAdmin);

export const subscriptionRouter = router({
  /**
   * Get banking details for EFT payments
   */
  getBankingDetails: authenticatedProcedure.query(() => {
    return {
      bankName: 'Standard Bank',
      accountName: 'Real Estate Portal',
      accountNumber: '123456789',
      branchCode: '051001',
      accountType: 'Cheque',
      referencePrefix: 'SUB-',
    };
  }),

  /**
   * Submit proof of payment for manual verification
   */
  submitPaymentProof: authenticatedProcedure
    .input(z.object({
      invoiceId: z.number().optional(),
      amount: z.number(), // in cents
      paymentMethod: z.enum(['eft', 'bank_transfer', 'cash_deposit', 'other']),
      referenceNumber: z.string().optional(),
      proofOfPaymentUrl: z.string().optional(),
      paymentDate: z.string(), // ISO date string
      bankName: z.string().optional(),
      accountHolderName: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Get user's agency
      const [agency] = await db
        .select()
        .from(agencies)
        .where(eq(agencies.id, ctx.user.agencyId))
        .limit(1);

      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      // Get active subscription if not provided
      let subscriptionId: number | null = null;
      const [sub] = await db
        .select()
        .from(agencySubscriptions)
        .where(
          and(
            eq(agencySubscriptions.agencyId, agency.id),
            eq(agencySubscriptions.status, 'active')
          )
        )
        .limit(1);
      
      if (sub) {
        subscriptionId = sub.id;
      }

      const result = await db.insert(paymentProofs).values({
        invoiceId: input.invoiceId,
        subscriptionId: subscriptionId,
        agencyId: agency.id,
        userId: ctx.user.id,
        amount: input.amount,
        currency: 'ZAR',
        paymentMethod: input.paymentMethod,
        referenceNumber: input.referenceNumber,
        proofOfPaymentUrl: input.proofOfPaymentUrl,
        bankName: input.bankName,
        accountHolderName: input.accountHolderName,
        paymentDate: input.paymentDate,
        notes: input.notes,
        status: 'pending',
      });

      return {
        success: true,
        paymentProofId: result[0].insertId,
        message: 'Payment proof submitted successfully. Verification may take 24-48 hours.',
      };
    }),

  /**
   * Admin: Get payment proofs
   */
  getPaymentProofs: adminProcedure
    .input(z.object({
      status: z.enum(['pending', 'verified', 'rejected', 'expired']).optional(),
      page: z.number().default(1),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const offset = (input.page - 1) * input.limit;
      const conditions: any[] = [];

      if (input.status) {
        conditions.push(eq(paymentProofs.status, input.status));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [proofs, totalResult] = await Promise.all([
        db
          .select({
            proof: paymentProofs,
            agency: agencies,
            user: users,
          })
          .from(paymentProofs)
          .leftJoin(agencies, eq(paymentProofs.agencyId, agencies.id))
          .leftJoin(users, eq(paymentProofs.userId, users.id))
          .where(where)
          .limit(input.limit)
          .offset(offset)
          .orderBy(desc(paymentProofs.createdAt)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(paymentProofs)
          .where(where),
      ]);

      const total = Number(totalResult[0]?.count || 0);

      return {
        proofs: proofs.map(p => ({
          ...p.proof,
          agencyName: p.agency?.name,
          submittedBy: p.user ? `${p.user.firstName} ${p.user.lastName}` : 'Unknown',
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),

  /**
   * Admin: Verify or reject payment proof
   */
  verifyPayment: adminProcedure
    .input(z.object({
      paymentProofId: z.number(),
      status: z.enum(['verified', 'rejected']),
      rejectionReason: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const [proof] = await db
        .select()
        .from(paymentProofs)
        .where(eq(paymentProofs.id, input.paymentProofId))
        .limit(1);

      if (!proof) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment proof not found' });
      }

      if (proof.status !== 'pending') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment proof already processed' });
      }

      await db
        .update(paymentProofs)
        .set({
          status: input.status,
          verifiedBy: ctx.user.id,
          verifiedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          rejectionReason: input.rejectionReason,
          notes: input.notes,
        })
        .where(eq(paymentProofs.id, input.paymentProofId));

      // If verified, record transaction in Revenue Center and update invoice/subscription
      if (input.status === 'verified') {
        // 1. Record in Revenue Center
        // Determine revenue category (simplified)
        let revenueCategory: 'developer' | 'agency' | 'agent' | 'vendor' = 'agency';
        
        await recordSubscriptionTransaction({
          subscriptionId: proof.subscriptionId || 0,
          agencyId: proof.agencyId,
          userId: proof.userId,
          amount: proof.amount,
          currency: proof.currency,
          status: 'completed',
          revenueCategory,
          paymentMethod: proof.paymentMethod,
          description: `Manual EFT Payment - Ref: ${proof.referenceNumber}`,
          metadata: { paymentProofId: proof.id },
        });

        // 2. Update Invoice if linked
        if (proof.invoiceId) {
          await db
            .update(invoices)
            .set({
              status: 'paid',
              paidAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            })
            .where(eq(invoices.id, proof.invoiceId));
        }

        // 3. Update Subscription if needed (e.g. activate trial or extend)
        if (proof.subscriptionId) {
           // Logic to extend subscription would go here
           // For now, just ensure it's active
           await db
             .update(agencySubscriptions)
             .set({ status: 'active' })
             .where(eq(agencySubscriptions.id, proof.subscriptionId));
        }
      }

      return {
        success: true,
        message: `Payment proof ${input.status}`,
      };
    }),
  /**
   * Get all available subscription plans
   */
  getAvailablePlans: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const activePlans = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, 1))
      .orderBy(plans.sortOrder);

    return activePlans.map(plan => ({
      ...plan,
      features: plan.features ? JSON.parse(plan.features) : [],
      limits: plan.limits ? JSON.parse(plan.limits) : {},
      price: Number(plan.price) / 100, // Convert cents to currency
    }));
  }),

  /**
   * Get detailed information about a specific plan
   */
  getPlanDetails: publicProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
      }

      return {
        ...plan,
        features: plan.features ? JSON.parse(plan.features) : [],
        limits: plan.limits ? JSON.parse(plan.limits) : {},
        price: Number(plan.price) / 100,
      };
    }),

  /**
   * Get current user's subscription
   */
  getCurrentSubscription: authenticatedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    // Find user's agency
    const [agency] = await db
      .select()
      .from(agencies)
      .where(eq(agencies.id, ctx.user.agencyId))
      .limit(1);

    if (!agency) {
      return null;
    }

    // Get active subscription
    const [subscription] = await db
      .select({
        subscription: agencySubscriptions,
        plan: plans,
      })
      .from(agencySubscriptions)
      .leftJoin(plans, eq(agencySubscriptions.planId, plans.id))
      .where(eq(agencySubscriptions.agencyId, agency.id))
      .orderBy(desc(agencySubscriptions.createdAt))
      .limit(1);

    if (!subscription) {
      return null;
    }

    return {
      ...subscription.subscription,
      plan: subscription.plan ? {
        ...subscription.plan,
        features: subscription.plan.features ? JSON.parse(subscription.plan.features) : [],
        limits: subscription.plan.limits ? JSON.parse(subscription.plan.limits) : {},
        price: Number(subscription.plan.price) / 100,
      } : null,
    };
  }),

  /**
   * Create a new subscription
   */
  createSubscription: authenticatedProcedure
    .input(z.object({
      planId: z.number(),
      paymentMethodId: z.string().optional(),
      couponCode: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Get plan details
      const [plan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.planId))
        .limit(1);

      if (!plan || !plan.isActive) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found or inactive' });
      }

      // Get user's agency
      const [agency] = await db
        .select()
        .from(agencies)
        .where(eq(agencies.id, ctx.user.agencyId))
        .limit(1);

      if (!agency) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
      }

      // Check if agency already has an active subscription
      const [existingSub] = await db
        .select()
        .from(agencySubscriptions)
        .where(
          and(
            eq(agencySubscriptions.agencyId, agency.id),
            eq(agencySubscriptions.status, 'active')
          )
        )
        .limit(1);

      if (existingSub) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Agency already has an active subscription. Use upgrade/downgrade instead.' 
        });
      }

      // TODO: Integrate with Stripe to create subscription
      // For now, create a trial subscription
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14); // 14-day trial

      const result = await db.insert(agencySubscriptions).values({
        agencyId: agency.id,
        planId: plan.id,
        stripeCustomerId: '', // Will be set by Stripe integration
        status: 'trialing',
        currentPeriodStart: new Date().toISOString().slice(0, 19).replace('T', ' '),
        currentPeriodEnd: trialEnd.toISOString().slice(0, 19).replace('T', ' '),
        trialEnd: trialEnd.toISOString().slice(0, 19).replace('T', ' '),
        cancelAtPeriodEnd: 0,
      });

      // Update agency subscription status
      await db
        .update(agencies)
        .set({
          subscriptionPlan: plan.name,
          subscriptionStatus: 'trial',
          subscriptionExpiry: trialEnd.toISOString().slice(0, 19).replace('T', ' '),
        })
        .where(eq(agencies.id, agency.id));

      return {
        success: true,
        subscriptionId: result[0].insertId,
        message: 'Subscription created successfully. Trial period: 14 days.',
      };
    }),

  /**
   * Upgrade subscription to a higher tier
   */
  upgradeSubscription: authenticatedProcedure
    .input(z.object({
      newPlanId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Get current subscription
      const [currentSub] = await db
        .select()
        .from(agencySubscriptions)
        .where(
          and(
            eq(agencySubscriptions.agencyId, ctx.user.agencyId),
            eq(agencySubscriptions.status, 'active')
          )
        )
        .limit(1);

      if (!currentSub) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No active subscription found' });
      }

      // Get new plan
      const [newPlan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.newPlanId))
        .limit(1);

      if (!newPlan || !newPlan.isActive) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found or inactive' });
      }

      // Verify it's an upgrade (higher price)
      const [currentPlan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, currentSub.planId!))
        .limit(1);

      if (currentPlan && newPlan.price <= currentPlan.price) {
        throw new TRPCError({ 
          code: 'BAD_REQUEST', 
          message: 'Use downgradeSubscription for lower-tier plans' 
        });
      }

      // TODO: Integrate with Stripe for pro-rated upgrade
      // For now, just update the subscription
      await db
        .update(agencySubscriptions)
        .set({
          planId: newPlan.id,
        })
        .where(eq(agencySubscriptions.id, currentSub.id));

      // Update agency
      await db
        .update(agencies)
        .set({
          subscriptionPlan: newPlan.name,
        })
        .where(eq(agencies.id, ctx.user.agencyId));

      return {
        success: true,
        message: `Successfully upgraded to ${newPlan.displayName}`,
      };
    }),

  /**
   * Downgrade subscription (takes effect at period end)
   */
  downgradeSubscription: authenticatedProcedure
    .input(z.object({
      newPlanId: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Get current subscription
      const [currentSub] = await db
        .select()
        .from(agencySubscriptions)
        .where(
          and(
            eq(agencySubscriptions.agencyId, ctx.user.agencyId),
            eq(agencySubscriptions.status, 'active')
          )
        )
        .limit(1);

      if (!currentSub) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No active subscription found' });
      }

      // Get new plan
      const [newPlan] = await db
        .select()
        .from(plans)
        .where(eq(plans.id, input.newPlanId))
        .limit(1);

      if (!newPlan || !newPlan.isActive) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found or inactive' });
      }

      // TODO: Schedule downgrade for period end via Stripe
      // For now, store in metadata
      const metadata = currentSub.metadata ? JSON.parse(currentSub.metadata) : {};
      metadata.scheduledDowngrade = {
        planId: newPlan.id,
        planName: newPlan.name,
        effectiveDate: currentSub.currentPeriodEnd,
      };

      await db
        .update(agencySubscriptions)
        .set({
          metadata: JSON.stringify(metadata),
        })
        .where(eq(agencySubscriptions.id, currentSub.id));

      return {
        success: true,
        message: `Downgrade to ${newPlan.displayName} scheduled for ${currentSub.currentPeriodEnd}`,
        effectiveDate: currentSub.currentPeriodEnd,
      };
    }),

  /**
   * Cancel subscription
   */
  cancelSubscription: authenticatedProcedure
    .input(z.object({
      reason: z.string().optional(),
      immediate: z.boolean().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Get current subscription
      const [currentSub] = await db
        .select()
        .from(agencySubscriptions)
        .where(
          and(
            eq(agencySubscriptions.agencyId, ctx.user.agencyId),
            eq(agencySubscriptions.status, 'active')
          )
        )
        .limit(1);

      if (!currentSub) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No active subscription found' });
      }

      if (input.immediate) {
        // Cancel immediately
        await db
          .update(agencySubscriptions)
          .set({
            status: 'canceled',
            canceledAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
            endedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          })
          .where(eq(agencySubscriptions.id, currentSub.id));

        await db
          .update(agencies)
          .set({
            subscriptionStatus: 'canceled',
          })
          .where(eq(agencies.id, ctx.user.agencyId));

        return {
          success: true,
          message: 'Subscription cancelled immediately',
        };
      } else {
        // Cancel at period end
        await db
          .update(agencySubscriptions)
          .set({
            cancelAtPeriodEnd: 1,
            canceledAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
          })
          .where(eq(agencySubscriptions.id, currentSub.id));

        return {
          success: true,
          message: `Subscription will be cancelled at ${currentSub.currentPeriodEnd}`,
          effectiveDate: currentSub.currentPeriodEnd,
        };
      }
    }),

  /**
   * Admin: Create a new plan
   */
  createPlan: adminProcedure
    .input(z.object({
      name: z.string(),
      displayName: z.string(),
      description: z.string().optional(),
      price: z.number(), // in currency units
      currency: z.string().default('ZAR'),
      interval: z.enum(['month', 'year']),
      features: z.array(z.string()),
      limits: z.any(), // Must contain revenueCategory
      isPopular: z.boolean().default(false),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Ensure revenueCategory is present in limits
      const limits = input.limits || {};
      if (!limits.revenueCategory) {
        limits.revenueCategory = 'owner'; // Default
      }

      const result = await db.insert(plans).values({
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        price: Math.round(input.price * 100), // Convert to cents
        currency: input.currency,
        interval: input.interval,
        features: JSON.stringify(input.features),
        limits: JSON.stringify(limits),
        isActive: 1,
        isPopular: input.isPopular ? 1 : 0,
        sortOrder: input.sortOrder,
      });

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.SYSTEM_UPDATE,
        metadata: { action: 'create_plan', planId: result[0].insertId },
        req: ctx.req,
      });

      return {
        success: true,
        planId: result[0].insertId,
        message: 'Plan created successfully',
      };
    }),

  /**
   * Admin: Update an existing plan (with Versioning)
   */
  updatePlan: adminProcedure
    .input(z.object({
      planId: z.number(),
      changes: z.object({
        displayName: z.string().optional(),
        description: z.string().optional(),
        price: z.number().optional(),
        currency: z.string().optional(),
        interval: z.enum(['month', 'year']).optional(),
        features: z.array(z.string()).optional(),
        limits: z.record(z.any()).optional(),
        isActive: z.boolean().optional(),
        isPopular: z.boolean().optional(),
        sortOrder: z.number().optional(),
      }),
      createNewVersion: z.boolean().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const oldPlan = await db.query.plans.findFirst({
        where: eq(plans.id, input.planId),
      });

      if (!oldPlan) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });

      // Merge limits safely
      const oldLimits = oldPlan.limits ? JSON.parse(oldPlan.limits as string) : {};
      const newLimits = { ...oldLimits, ...(input.changes.limits || {}) };
      // Ensure revenueCategory persists
      if (!newLimits.revenueCategory) {
          newLimits.revenueCategory = oldLimits.revenueCategory || 'owner';
      }

      if (input.createNewVersion) {
        // VERSIONING: Create new plan, archive old
        const result = await db.insert(plans).values({
          name: oldPlan.name, // Keep internal name/slug
          displayName: input.changes.displayName ?? oldPlan.displayName,
          description: input.changes.description ?? oldPlan.description,
          price: input.changes.price !== undefined ? Math.round(input.changes.price * 100) : oldPlan.price,
          currency: input.changes.currency ?? oldPlan.currency,
          interval: input.changes.interval ?? oldPlan.interval,
          features: JSON.stringify(input.changes.features ?? JSON.parse(oldPlan.features as string)),
          limits: JSON.stringify(newLimits),
          isActive: 1, // New version is active
          isPopular: input.changes.isPopular !== undefined ? (input.changes.isPopular ? 1 : 0) : oldPlan.isPopular,
          sortOrder: input.changes.sortOrder ?? oldPlan.sortOrder,
        });

        // Archive old plan
        await db.update(plans)
          .set({ isActive: 0 })
          .where(eq(plans.id, input.planId));

        await logAudit({
            userId: ctx.user.id,
            action: AuditActions.SYSTEM_UPDATE,
            metadata: { action: 'version_plan', oldPlanId: input.planId, newPlanId: result[0].insertId },
            req: ctx.req,
        });

        return {
          success: true,
          oldPlanId: input.planId,
          newPlanId: result[0].insertId,
          message: 'Plan versioned successfully',
        };

      } else {
        // IN-PLACE UPDATE
        // Strict check: Only allow if no active subscriptions OR changes are cosmetic
        const isCriticalChange = input.changes.price !== undefined || input.changes.interval !== undefined;
        
        if (isCriticalChange) {
            const activeSubs = await db
                .select({ count: sql<number>`count(*)` })
                .from(agencySubscriptions)
                .where(and(
                    eq(agencySubscriptions.planId, input.planId),
                    eq(agencySubscriptions.status, 'active')
                ));
            
            if (Number(activeSubs[0].count) > 0) {
                throw new TRPCError({ 
                    code: 'BAD_REQUEST', 
                    message: 'Cannot modify price/interval of a plan with active subscriptions. Create a new version instead.' 
                });
            }
        }

        const updateData: any = {};
        if (input.changes.displayName) updateData.displayName = input.changes.displayName;
        if (input.changes.description) updateData.description = input.changes.description;
        if (input.changes.price !== undefined) updateData.price = Math.round(input.changes.price * 100);
        if (input.changes.currency) updateData.currency = input.changes.currency;
        if (input.changes.interval) updateData.interval = input.changes.interval;
        if (input.changes.features) updateData.features = JSON.stringify(input.changes.features);
        if (input.changes.limits) updateData.limits = JSON.stringify(newLimits);
        if (input.changes.isActive !== undefined) updateData.isActive = input.changes.isActive ? 1 : 0;
        if (input.changes.isPopular !== undefined) updateData.isPopular = input.changes.isPopular ? 1 : 0;
        if (input.changes.sortOrder !== undefined) updateData.sortOrder = input.changes.sortOrder;

        await db
          .update(plans)
          .set(updateData)
          .where(eq(plans.id, input.planId));

        await logAudit({
            userId: ctx.user.id,
            action: AuditActions.SYSTEM_UPDATE,
            metadata: { action: 'update_plan', planId: input.planId, changes: input.changes },
            req: ctx.req,
        });

        return {
          success: true,
          message: 'Plan updated successfully',
        };
      }
    }),

  /**
   * Admin: Toggle Plan Status
   */
  togglePlanStatus: adminProcedure
    .input(z.object({
      planId: z.number(),
      isActive: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      await db
        .update(plans)
        .set({ isActive: input.isActive ? 1 : 0 })
        .where(eq(plans.id, input.planId));

      await logAudit({
        userId: ctx.user.id,
        action: AuditActions.SYSTEM_UPDATE,
        metadata: { action: 'toggle_plan_status', planId: input.planId, isActive: input.isActive },
        req: ctx.req,
      });

      return { success: true };
    }),

  /**
   * Admin: Get Plans List
   */
  getPlans: adminProcedure
    .input(z.object({
      includeInactive: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const conditions = [];
      if (!input.includeInactive) {
        conditions.push(eq(plans.isActive, 1));
      }

      const allPlans = await db
        .select()
        .from(plans)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(plans.sortOrder);

      return allPlans.map(plan => ({
        ...plan,
        features: plan.features ? JSON.parse(plan.features as string) : [],
        limits: plan.limits ? JSON.parse(plan.limits as string) : {},
        price: Number(plan.price) / 100,
      }));
    }),

  /**
   * Admin: Get Single Plan
   */
  getPlanById: adminProcedure
    .input(z.object({ planId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const plan = await db.query.plans.findFirst({
        where: eq(plans.id, input.planId),
      });

      if (!plan) throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });

      return {
        ...plan,
        features: plan.features ? JSON.parse(plan.features as string) : [],
        limits: plan.limits ? JSON.parse(plan.limits as string) : {},
        price: Number(plan.price) / 100,
      };
    }),
  getAllSubscriptions: adminProcedure
    .input(z.object({
      status: z.enum(['active', 'trialing', 'past_due', 'canceled', 'unpaid']).optional(),
      page: z.number().default(1),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const offset = (input.page - 1) * input.limit;
      const conditions: any[] = [];

      if (input.status) {
        conditions.push(eq(agencySubscriptions.status, input.status));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [subscriptions, totalResult] = await Promise.all([
        db
          .select({
            subscription: agencySubscriptions,
            plan: plans,
            agency: agencies,
          })
          .from(agencySubscriptions)
          .leftJoin(plans, eq(agencySubscriptions.planId, plans.id))
          .leftJoin(agencies, eq(agencySubscriptions.agencyId, agencies.id))
          .where(where)
          .limit(input.limit)
          .offset(offset)
          .orderBy(desc(agencySubscriptions.createdAt)),
        db
          .select({ count: sql<number>`count(*)` })
          .from(agencySubscriptions)
          .where(where),
      ]);

      const total = Number(totalResult[0]?.count || 0);

      return {
        subscriptions: subscriptions.map(s => ({
          ...s.subscription,
          plan: s.plan,
          agency: s.agency,
        })),
        pagination: {
          page: input.page,
          limit: input.limit,
          total,
          totalPages: Math.ceil(total / input.limit),
        },
      };
    }),
    /**
     * Get invoices for current agency
     */
    getMyInvoices: authenticatedProcedure
      .input(z.object({
        page: z.number().default(1),
        limit: z.number().default(10),
      }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const offset = (input.page - 1) * input.limit;

        const [results, totalResult] = await Promise.all([
          db
            .select()
            .from(invoices)
            .where(eq(invoices.agencyId, ctx.user.agencyId))
            .limit(input.limit)
            .offset(offset)
            .orderBy(desc(invoices.createdAt)),
          db
            .select({ count: sql<number>`count(*)` })
            .from(invoices)
            .where(eq(invoices.agencyId, ctx.user.agencyId)),
        ]);

        const total = Number(totalResult[0]?.count || 0);

        return {
          invoices: results.map(inv => ({
            ...inv,
            amount: Number(inv.amount) / 100, // Convert to currency
          })),
          pagination: {
            page: input.page,
            limit: input.limit,
            total,
            totalPages: Math.ceil(total / input.limit),
          },
        };
      }),
});
