import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { agencyAdminProcedure, protectedProcedure, publicProcedure, superAdminProcedure } from './_core/trpc';
import { getDb } from './db';
import { billingInvoices, billingPayments, plans, subscriptions } from '../drizzle/schema';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  getAdminFinanceQueue,
  getAgencyBillingWorkspace,
  getBillingDocumentForUser,
  getManualEftBankDetails,
  listBillingPlans,
  requestAgencyCancellationAtPeriodEnd,
  restoreAgencySubscription,
  reviewManualPayment,
  startAgencyManualCheckout,
  submitAgencyPaymentProof,
  updateSubscriptionLifecycle,
  type BillingCycle,
  type CanonicalSubscriptionStatus,
  type PaymentState,
} from './services/billingFoundationService';
import { requireUser } from './_core/requireUser';

const billingCycleSchema = z.enum(['monthly', 'annual']);

const createCheckoutSessionSchema = z.object({
  planId: z.number().int().positive(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
  billingCycle: billingCycleSchema.default('monthly'),
  couponCode: z.string().optional(),
});

const startManualCheckoutSchema = z.object({
  planId: z.number().int().positive(),
  billingCycle: billingCycleSchema.default('monthly'),
  couponCode: z.string().optional(),
});

const submitPaymentProofSchema = z.object({
  invoiceId: z.number().int().positive(),
  amount: z.number().positive(),
  bankReference: z.string().max(120).optional(),
  payerName: z.string().max(160).optional(),
  paymentDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  file: z.object({
    filename: z.string().min(1).max(255),
    mimeType: z.string().min(1).max(120),
    sizeBytes: z.number().int().positive(),
    contentBase64: z.string().min(1),
  }),
});

const reviewPaymentSchema = z.object({
  paymentId: z.number().int().positive(),
  decision: z.enum([
    'approve',
    'reject',
    'request_correction',
    'partial_payment',
    'duplicate',
    'unmatched',
  ]),
  note: z.string().max(2000).optional(),
  verifiedAmount: z.number().positive().optional(),
});

const lifecycleSchema = z.object({
  subscriptionId: z.number().int().positive(),
  status: z.enum([
    'trial',
    'pending_payment',
    'payment_under_review',
    'active',
    'past_due',
    'grace_period',
    'suspended',
    'cancelled',
    'expired',
  ]),
  periodEnd: z.string().nullable().optional(),
  graceEndsAt: z.string().nullable().optional(),
  note: z.string().max(2000).optional(),
});

function requireAgencyId(ctx: { user?: { agencyId?: number | null } | null }): number {
  const agencyId = ctx.user?.agencyId ?? null;
  if (!agencyId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'User must belong to an agency' });
  }
  return Number(agencyId);
}

export const billingRouter = {
  plans: publicProcedure
    .input(z.object({ segment: z.enum(['agent', 'agency', 'developer']).default('agency') }).optional())
    .query(async ({ input }) => listBillingPlans(input?.segment || 'agency')),

  bankDetails: protectedProcedure.query(() => getManualEftBankDetails()),

  workspace: agencyAdminProcedure.query(async ({ ctx }) => {
    return getAgencyBillingWorkspace(requireUser(ctx));
  }),

  startManualEftCheckout: agencyAdminProcedure
    .input(startManualCheckoutSchema)
    .mutation(async ({ ctx, input }) => {
      return startAgencyManualCheckout({
        user: requireUser(ctx),
        planId: input.planId,
        billingCycle: input.billingCycle as BillingCycle,
        couponCode: input.couponCode,
      });
    }),

  // Backwards-compatible name used by older agency onboarding/billing components.
  createCheckoutSession: agencyAdminProcedure
    .input(createCheckoutSessionSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await startAgencyManualCheckout({
        user: requireUser(ctx),
        planId: input.planId,
        billingCycle: input.billingCycle as BillingCycle,
        couponCode: input.couponCode,
      });

      const url = input.successUrl
        ? `${input.successUrl}${input.successUrl.includes('?') ? '&' : '?'}invoiceId=${result.invoice.id}`
        : `/agency/billing?invoiceId=${result.invoice.id}`;

      return {
        sessionId: `manual_eft:${result.invoice.id}`,
        url,
        invoice: result.invoice,
        bankDetails: result.bankDetails,
      };
    }),

  submitPaymentProof: agencyAdminProcedure
    .input(submitPaymentProofSchema)
    .mutation(async ({ ctx, input }) =>
      submitAgencyPaymentProof({
        user: requireUser(ctx),
        invoiceId: input.invoiceId,
        amount: Math.round(input.amount),
        bankReference: input.bankReference,
        payerName: input.payerName,
        paymentDate: input.paymentDate,
        notes: input.notes,
        file: input.file,
      }),
    ),

  getProofDocument: protectedProcedure
    .input(z.object({ documentId: z.number().int().positive() }))
    .query(async ({ ctx, input }) =>
      getBillingDocumentForUser({ user: requireUser(ctx), documentId: input.documentId }),
    ),

  subscription: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const agencyId = requireAgencyId(ctx);
    const [row] = await db
      .select({ subscription: subscriptions, plan: plans })
      .from(subscriptions)
      .leftJoin(plans, eq(subscriptions.planId, plans.id))
      .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)))
      .limit(1);
    return row
      ? {
          ...row.subscription,
          plan: row.plan,
        }
      : null;
  }),

  invoices: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const agencyId = requireAgencyId(ctx);
    return db
      .select()
      .from(billingInvoices)
      .where(and(eq(billingInvoices.ownerType, 'agency'), eq(billingInvoices.ownerId, agencyId)))
      .orderBy(desc(billingInvoices.createdAt));
  }),

  payments: agencyAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
    const agencyId = requireAgencyId(ctx);
    return db
      .select()
      .from(billingPayments)
      .where(and(eq(billingPayments.ownerType, 'agency'), eq(billingPayments.ownerId, agencyId)))
      .orderBy(desc(billingPayments.createdAt));
  }),

  paymentMethods: agencyAdminProcedure.query(async () => {
    return [
      {
        id: 'manual_eft',
        type: 'manual_eft',
        isDefault: true,
        label: 'Manual EFT',
        cardLast4: null,
        cardBrand: 'eft',
      },
    ];
  }),

  cancelSubscription: agencyAdminProcedure.mutation(async ({ ctx }) =>
    requestAgencyCancellationAtPeriodEnd(requireUser(ctx)),
  ),

  reactivateSubscription: agencyAdminProcedure.mutation(async ({ ctx }) =>
    restoreAgencySubscription(requireUser(ctx)),
  ),

  admin: {
    plans: superAdminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      return db.select().from(plans).orderBy(plans.sortOrder);
    }),

    financeQueue: superAdminProcedure
      .input(
        z
          .object({
            status: z
              .enum(['submitted', 'under_review', 'verified', 'rejected', 'reversed', 'refunded', 'all'])
              .default('under_review'),
            limit: z.number().int().positive().max(100).default(50),
            offset: z.number().int().min(0).default(0),
          })
          .optional(),
      )
      .query(async ({ input }) =>
        getAdminFinanceQueue({
          status: (input?.status || 'under_review') as PaymentState | 'all',
          limit: input?.limit,
          offset: input?.offset,
        }),
      ),

    reviewManualPayment: superAdminProcedure
      .input(reviewPaymentSchema)
      .mutation(async ({ ctx, input }) =>
        reviewManualPayment({
          actorUser: requireUser(ctx),
          paymentId: input.paymentId,
          decision: input.decision,
          note: input.note,
          verifiedAmount: input.verifiedAmount,
        }),
      ),

    updateSubscriptionLifecycle: superAdminProcedure
      .input(lifecycleSchema)
      .mutation(async ({ ctx, input }) =>
        updateSubscriptionLifecycle({
          actorUser: requireUser(ctx),
          subscriptionId: input.subscriptionId,
          status: input.status as CanonicalSubscriptionStatus,
          periodEnd: input.periodEnd,
          graceEndsAt: input.graceEndsAt,
          note: input.note,
        }),
      ),

    proofDocument: superAdminProcedure
      .input(z.object({ documentId: z.number().int().positive() }))
      .query(async ({ ctx, input }) =>
        getBillingDocumentForUser({ user: requireUser(ctx), documentId: input.documentId }),
      ),

    billingOverview: superAdminProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

      const [revenue] = await db
        .select({ total: sql<number>`COALESCE(SUM(${billingInvoices.amountPaid}), 0)` })
        .from(billingInvoices)
        .where(eq(billingInvoices.status, 'paid'));
      const [pendingPayments] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(billingPayments)
        .where(and(eq(billingPayments.paymentMethod, 'manual_eft'), eq(billingPayments.state, 'under_review')));
      const [activeSubscriptions] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.status, 'active'));

      return {
        revenue: {
          total: Number(revenue?.total || 0) / 100,
          monthly: 0,
          mrr: 0,
        },
        subscriptions: {
          active: Number(activeSubscriptions?.count || 0),
          pendingManualEft: Number(pendingPayments?.count || 0),
        },
      };
    }),
  },
};
