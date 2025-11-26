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
      price: z.number(), // in currency units (will be converted to cents)
      currency: z.string().default('ZAR'),
      interval: z.enum(['month', 'year']),
      features: z.array(z.string()),
      limits: z.record(z.any()),
      isPopular: z.boolean().default(false),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const result = await db.insert(plans).values({
        name: input.name,
        displayName: input.displayName,
        description: input.description,
        price: Math.round(input.price * 100), // Convert to cents
        currency: input.currency,
        interval: input.interval,
        features: JSON.stringify(input.features),
        limits: JSON.stringify(input.limits),
        isActive: 1,
        isPopular: input.isPopular ? 1 : 0,
        sortOrder: input.sortOrder,
      });

      return {
        success: true,
        planId: result[0].insertId,
        message: 'Plan created successfully',
      };
    }),

  /**
   * Admin: Update an existing plan
   */
  updatePlan: adminProcedure
    .input(z.object({
      planId: z.number(),
      displayName: z.string().optional(),
      description: z.string().optional(),
      price: z.number().optional(),
      features: z.array(z.string()).optional(),
      limits: z.record(z.any()).optional(),
      isActive: z.boolean().optional(),
      isPopular: z.boolean().optional(),
      sortOrder: z.number().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const updateData: any = {};
      if (input.displayName) updateData.displayName = input.displayName;
      if (input.description) updateData.description = input.description;
      if (input.price !== undefined) updateData.price = Math.round(input.price * 100);
      if (input.features) updateData.features = JSON.stringify(input.features);
      if (input.limits) updateData.limits = JSON.stringify(input.limits);
      if (input.isActive !== undefined) updateData.isActive = input.isActive ? 1 : 0;
      if (input.isPopular !== undefined) updateData.isPopular = input.isPopular ? 1 : 0;
      if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

      await db
        .update(plans)
        .set(updateData)
        .where(eq(plans.id, input.planId));

      return {
        success: true,
        message: 'Plan updated successfully',
      };
    }),

  /**
   * Admin: Get all subscriptions with filters
   */
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
});
