import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { publicProcedure, agencyAdminProcedure, superAdminProcedure } from './_core/trpc';
import { getDb } from './db';
import { stripe } from './_core/stripe';
import {
  plans,
  agencySubscriptions,
  paymentMethods,
  invoices,
  agencies,
  coupons,
} from '../drizzle/schema';
import { eq, and, sql, or, desc } from 'drizzle-orm';

// Input validation schemas
const createCheckoutSessionSchema = z.object({
  planId: z.number(),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const createSetupIntentSchema = z.object({
  paymentMethodType: z.enum(['card']).default('card'),
});

export const billingRouter = {
  // Public endpoints
  plans: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    return await db.select().from(plans).where(eq(plans.isActive, 1)).orderBy(plans.sortOrder);
  }),

  createCheckoutSession: agencyAdminProcedure
    .input(createCheckoutSessionSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Check if Stripe is configured
      if (!stripe) {
        throw new TRPCError({
          code: 'SERVICE_UNAVAILABLE',
          message: 'Payment system is not configured. Please contact support.',
        });
      }

      try {
        // Get the plan
        const [plan] = await db.select().from(plans).where(eq(plans.id, input.planId)).limit(1);
        if (!plan) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Plan not found' });
        }

        if (!plan.stripePriceId) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Plan is not configured for Stripe billing',
          });
        }

        // Check if user has agency
        if (!ctx.user.agencyId) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'User must belong to an agency' });
        }

        // Get agency info
        const [agency] = await db
          .select()
          .from(agencies)
          .where(eq(agencies.id, ctx.user.agencyId))
          .limit(1);
        if (!agency) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found' });
        }

        // Create or get Stripe customer
        let customerId: string;
        const existingSubscription = await db
          .select()
          .from(agencySubscriptions)
          .where(eq(agencySubscriptions.agencyId, ctx.user.agencyId))
          .limit(1);

        if (existingSubscription.length > 0) {
          customerId = existingSubscription[0].stripeCustomerId;
        } else {
          // Create new customer
          const customer = await stripe.customers.create({
            email: agency.email,
            name: agency.name,
            metadata: {
              agencyId: ctx.user.agencyId.toString(),
            },
          });
          customerId = customer.id;

          // Create subscription record
          await db.insert(agencySubscriptions).values({
            agencyId: ctx.user.agencyId,
            planId: input.planId,
            stripeCustomerId: customerId,
            stripePriceId: plan.stripePriceId,
            status: 'incomplete',
          });
        }

        // Create checkout session
        const session = await stripe.checkout.sessions.create({
          customer: customerId,
          payment_method_types: ['card'],
          line_items: [
            {
              price: plan.stripePriceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          metadata: {
            agencyId: ctx.user.agencyId.toString(),
            planId: input.planId.toString(),
          },
        });

        return { sessionId: session.id, url: session.url };
      } catch (error) {
        console.error('Error creating checkout session:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create checkout session',
        });
      }
    }),

  // Agency billing endpoints
  subscription: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    const [subscription] = await db
      .select({
        id: agencySubscriptions.id,
        planId: agencySubscriptions.planId,
        status: agencySubscriptions.status,
        currentPeriodStart: agencySubscriptions.currentPeriodStart,
        currentPeriodEnd: agencySubscriptions.currentPeriodEnd,
        cancelAtPeriodEnd: agencySubscriptions.cancelAtPeriodEnd,
        stripeSubscriptionId: agencySubscriptions.stripeSubscriptionId,
        plan: plans,
      })
      .from(agencySubscriptions)
      .leftJoin(plans, eq(agencySubscriptions.planId, plans.id))
      .where(eq(agencySubscriptions.agencyId, ctx.user.agencyId))
      .limit(1);

    return subscription || null;
  }),

  paymentMethods: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    return await db
      .select()
      .from(paymentMethods)
      .where(eq(paymentMethods.agencyId, ctx.user.agencyId))
      .orderBy(paymentMethods.isDefault);
  }),

  createSetupIntent: agencyAdminProcedure
    .input(createSetupIntentSchema)
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      try {
        // Get or create customer
        const [subscription] = await db
          .select()
          .from(agencySubscriptions)
          .where(eq(agencySubscriptions.agencyId, ctx.user.agencyId!))
          .limit(1);

        if (!subscription) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No subscription found for agency' });
        }

        const setupIntent = await stripe.setupIntents.create({
          customer: subscription.stripeCustomerId,
          payment_method_types: ['card'],
          metadata: {
            agencyId: ctx.user.agencyId!.toString(),
          },
        });

        return {
          clientSecret: setupIntent.client_secret,
          setupIntentId: setupIntent.id,
        };
      } catch (error) {
        console.error('Error creating setup intent:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create payment method setup',
        });
      }
    }),

  invoices: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    return await db
      .select()
      .from(invoices)
      .where(eq(invoices.agencyId, ctx.user.agencyId))
      .orderBy(invoices.createdAt);
  }),

  cancelSubscription: agencyAdminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    try {
      const [subscription] = await db
        .select()
        .from(agencySubscriptions)
        .where(eq(agencySubscriptions.agencyId, ctx.user.agencyId))
        .limit(1);

      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No active subscription found' });
      }

      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update local record
      await db
        .update(agencySubscriptions)
        .set({
          cancelAtPeriodEnd: 1,
          updatedAt: new Date(),
        })
        .where(eq(agencySubscriptions.id, subscription.id));

      return { success: true };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to cancel subscription',
      });
    }
  }),

  reactivateSubscription: agencyAdminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

    try {
      const [subscription] = await db
        .select()
        .from(agencySubscriptions)
        .where(eq(agencySubscriptions.agencyId, ctx.user.agencyId))
        .limit(1);

      if (!subscription || !subscription.stripeSubscriptionId) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No subscription found' });
      }

      // Reactivate subscription
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update local record
      await db
        .update(agencySubscriptions)
        .set({
          cancelAtPeriodEnd: 0,
          updatedAt: new Date(),
        })
        .where(eq(agencySubscriptions.id, subscription.id));

      return { success: true };
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reactivate subscription',
      });
    }
  }),

  // Admin-only endpoints
  admin: {
    plans: superAdminProcedure.query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      return await db.select().from(plans).orderBy(plans.sortOrder);
    }),

    updatePlan: superAdminProcedure
      .input(
        z.object({
          id: z.number(),
          updates: z.object({
            name: z.string().optional(),
            displayName: z.string().optional(),
            price: z.number().optional(),
            stripePriceId: z.string().optional(),
            isActive: z.number().optional(),
            isPopular: z.number().optional(),
          }),
        }),
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        await db.update(plans).set(input.updates).where(eq(plans.id, input.id));
        return { success: true };
      }),

    billingOverview: superAdminProcedure.query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      // Revenue metrics
      const [totalRevenue] = await db
        .select({ total: sql<number>`sum(${invoices.amount})` })
        .from(invoices)
        .where(eq(invoices.status, 'paid'));

      const [monthlyRevenue] = await db
        .select({ total: sql<number>`sum(${invoices.amount})` })
        .from(invoices)
        .where(
          and(
            eq(invoices.status, 'paid'),
            sql`${invoices.createdAt} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
          ),
        );

      // Subscription metrics
      const [activeSubscriptions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agencySubscriptions)
        .where(eq(agencySubscriptions.status, 'active'));

      const [totalSubscriptions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agencySubscriptions);

      const [trialSubscriptions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agencySubscriptions)
        .where(eq(agencySubscriptions.status, 'trialing'));

      const [churnedSubscriptions] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agencySubscriptions)
        .where(
          or(eq(agencySubscriptions.status, 'canceled'), eq(agencySubscriptions.status, 'unpaid')),
        );

      // Agency metrics
      const [totalAgencies] = await db.select({ count: sql<number>`count(*)` }).from(agencies);

      const [paidAgencies] = await db
        .select({ count: sql<number>`count(distinct ${agencies.id})` })
        .from(agencies)
        .innerJoin(agencySubscriptions, eq(agencies.id, agencySubscriptions.agencyId))
        .where(eq(agencySubscriptions.status, 'active'));

      // Plan distribution
      const planDistribution = await db
        .select({
          planName: plans.name,
          planDisplayName: plans.displayName,
          count: sql<number>`count(*)`,
        })
        .from(agencySubscriptions)
        .innerJoin(plans, eq(agencySubscriptions.planId, plans.id))
        .where(eq(agencySubscriptions.status, 'active'))
        .groupBy(plans.id, plans.name, plans.displayName);

      // Recent transactions (last 30 days)
      const recentTransactions = await db
        .select({
          id: invoices.id,
          amount: invoices.amount,
          currency: invoices.currency,
          status: invoices.status,
          createdAt: invoices.createdAt,
          agencyName: agencies.name,
        })
        .from(invoices)
        .innerJoin(agencySubscriptions, eq(invoices.subscriptionId, agencySubscriptions.id))
        .innerJoin(agencies, eq(agencySubscriptions.agencyId, agencies.id))
        .where(sql`${invoices.createdAt} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`)
        .orderBy(desc(invoices.createdAt))
        .limit(10);

      // Monthly recurring revenue (MRR)
      const activeSubsWithPlans = await db
        .select({
          amount: plans.price,
          interval: plans.interval,
        })
        .from(agencySubscriptions)
        .innerJoin(plans, eq(agencySubscriptions.planId, plans.id))
        .where(eq(agencySubscriptions.status, 'active'));

      let mrr = 0;
      for (const sub of activeSubsWithPlans) {
        const monthlyAmount = sub.interval === 'year' ? sub.amount / 12 : sub.amount;
        mrr += monthlyAmount;
      }

      return {
        revenue: {
          total: Number(totalRevenue?.total || 0) / 100,
          monthly: Number(monthlyRevenue?.total || 0) / 100,
          mrr: mrr / 100,
        },
        subscriptions: {
          active: Number(activeSubscriptions?.count || 0),
          total: Number(totalSubscriptions?.count || 0),
          trial: Number(trialSubscriptions?.count || 0),
          churned: Number(churnedSubscriptions?.count || 0),
        },
        agencies: {
          total: Number(totalAgencies?.count || 0),
          paid: Number(paidAgencies?.count || 0),
          free: Number(totalAgencies?.count || 0) - Number(paidAgencies?.count || 0),
        },
        planDistribution: planDistribution.map(p => ({
          name: p.planName,
          displayName: p.planDisplayName,
          count: Number(p.count),
        })),
        recentTransactions: recentTransactions.map(t => ({
          id: t.id,
          amount: Number(t.amount) / 100,
          currency: t.currency,
          status: t.status,
          createdAt: t.createdAt,
          agencyName: t.agencyName,
        })),
      };
    }),

    // Coupon management
    coupons: superAdminProcedure.query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      return await db.select().from(coupons).orderBy(coupons.createdAt);
    }),

    createCoupon: superAdminProcedure
      .input(
        z.object({
          code: z.string().min(3).max(20).toUpperCase(),
          name: z.string().min(1),
          description: z.string().optional(),
          discountType: z.enum(['amount', 'percent']),
          discountAmount: z.number().positive(),
          maxRedemptions: z.number().int().positive().optional(),
          validFrom: z.date().optional(),
          validUntil: z.date().optional(),
          appliesToPlans: z.array(z.number()).optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        // Check if code already exists
        const [existing] = await db
          .select()
          .from(coupons)
          .where(eq(coupons.code, input.code))
          .limit(1);

        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Coupon code already exists' });
        }

        const couponData = {
          ...input,
          appliesToPlans: input.appliesToPlans ? JSON.stringify(input.appliesToPlans) : null,
        };

        await db.insert(coupons).values(couponData);

        return { success: true };
      }),

    updateCoupon: superAdminProcedure
      .input(
        z.object({
          id: z.number(),
          updates: z.object({
            name: z.string().optional(),
            description: z.string().optional(),
            discountAmount: z.number().optional(),
            maxRedemptions: z.number().optional(),
            validFrom: z.date().optional(),
            validUntil: z.date().optional(),
            isActive: z.number().optional(),
          }),
        }),
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        await db.update(coupons).set(input.updates).where(eq(coupons.id, input.id));
        return { success: true };
      }),

    deleteCoupon: superAdminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        await db.delete(coupons).where(eq(coupons.id, input.id));
        return { success: true };
      }),

    // Validate coupon for checkout
    validateCoupon: publicProcedure
      .input(
        z.object({
          code: z.string(),
          planId: z.number(),
        }),
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db)
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

        const [coupon] = await db
          .select()
          .from(coupons)
          .where(eq(coupons.code, input.code.toUpperCase()))
          .limit(1);

        if (!coupon || !coupon.isActive) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Invalid or expired coupon' });
        }

        // Check expiry
        const now = new Date();
        if (coupon.validFrom && now < coupon.validFrom) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon not yet valid' });
        }
        if (coupon.validUntil && now > coupon.validUntil) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon has expired' });
        }

        // Check max redemptions
        if (coupon.maxRedemptions && coupon.redemptionsUsed >= coupon.maxRedemptions) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon usage limit exceeded' });
        }

        // Check if applies to this plan
        if (coupon.appliesToPlans) {
          const allowedPlans = JSON.parse(coupon.appliesToPlans);
          if (!allowedPlans.includes(input.planId)) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon not valid for this plan' });
          }
        }

        return {
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          description: coupon.description,
          discountType: coupon.discountType,
          discountAmount: coupon.discountAmount,
        };
      }),
  },
};
