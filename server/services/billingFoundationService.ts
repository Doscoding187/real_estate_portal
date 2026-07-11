import { createHash, randomBytes, randomUUID } from 'crypto';
import path from 'path';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { TRPCError } from '@trpc/server';
import {
  agencies,
  billingAuditEvents,
  billingInvoices,
  billingPaymentDocuments,
  billingPayments,
  coupons,
  notifications,
  plans,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db';
import {
  BillingProofStorageConfigurationError,
  getBillingProofStorageStatus,
  readBillingProofDocument,
  storeBillingProofDocument,
} from './billingProofStorage';
import { deliverPendingAgencyInvitations } from './agencyInvitationDeliveryService';

export type BillingOwnerType = 'agent' | 'agency' | 'developer' | string;
export type BillingCycle = 'monthly' | 'annual';
export type CanonicalSubscriptionStatus =
  | 'trial'
  | 'pending_payment'
  | 'payment_under_review'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'suspended'
  | 'cancelled'
  | 'expired';
export type InvoiceStatus =
  | 'draft'
  | 'issued'
  | 'submitted'
  | 'paid'
  | 'partially_paid'
  | 'overdue'
  | 'void';
export type PaymentState =
  | 'submitted'
  | 'under_review'
  | 'verified'
  | 'rejected'
  | 'reversed'
  | 'refunded';

type DbHandle = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type BillingTx = any;
type DbOrTx = DbHandle | BillingTx;
type PlanRow = typeof plans.$inferSelect;
type SubscriptionRow = typeof subscriptions.$inferSelect;
type InvoiceRow = typeof billingInvoices.$inferSelect;
type PaymentRow = typeof billingPayments.$inferSelect;
type BillingUser = {
  id: number;
  role?: string | null;
  agencyId?: number | null;
  email?: string | null;
  name?: string | null;
};

const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const ALLOWED_PROOF_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const ACTIVE_SUBSCRIPTION_STATUSES = new Set<CanonicalSubscriptionStatus>([
  'active',
  'grace_period',
]);
const BLOCKED_REVIEW_DECISIONS = new Set(['reject', 'request_correction', 'duplicate', 'unmatched']);
const BILLING_FINANCE_ROLES = new Set(['super_admin']);

function nowDb() {
  return toDbTimestamp(new Date());
}

function toDbTimestamp(value: Date | string | null | undefined) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value)) {
    return value.slice(0, 19).replace('T', ' ');
  }
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function addMonths(value: Date, months: number) {
  const next = new Date(value);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseJsonRecord(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, any>;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return {};
}

function parseJsonArray(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      return value
        .split(',')
        .map(item => item.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function centsToRand(amount: number) {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

function safeFileExtension(filename: string, mimeType: string) {
  const ext = path.extname(filename).replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
  if (ext && ext.length <= 12) return ext;
  if (mimeType === 'application/pdf') return '.pdf';
  if (mimeType === 'image/png') return '.png';
  if (mimeType === 'image/webp') return '.webp';
  return '.jpg';
}

function isProductionRuntime() {
  return process.env.NODE_ENV === 'production';
}

function isBillingFinanceAdmin(user: BillingUser) {
  return Boolean(user.role && BILLING_FINANCE_ROLES.has(user.role));
}

function ownerPrefix(ownerType: string) {
  const normalized = ownerType.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized === 'AGENCY') return 'AG';
  if (normalized === 'AGENT') return 'AN';
  if (normalized === 'DEVELOPER') return 'DV';
  return normalized.slice(0, 2) || 'AC';
}

function referenceDatePart(date = new Date()) {
  return date.toISOString().slice(2, 10).replace(/-/g, '');
}

function randomReferencePart(bytes = 3) {
  return randomBytes(bytes).toString('hex').toUpperCase();
}

function buildInvoiceNumber(ownerType: string, ownerId: number) {
  return `PLI-${referenceDatePart()}-${ownerPrefix(ownerType)}${ownerId}-${randomReferencePart(3)}`;
}

function buildPaymentReference(ownerType: string, ownerId: number) {
  return `PL${ownerPrefix(ownerType)}${ownerId}-${randomReferencePart(3)}`;
}

function getPlanMonthlyPrice(plan: PlanRow) {
  const metadata = parseJsonRecord(plan.metadata);
  const earlyAccessPrice = Number(
    metadata.early_access_price_monthly ?? metadata.earlyAccessPriceMonthly,
  );
  if (Number.isFinite(earlyAccessPrice) && earlyAccessPrice > 0) return Math.round(earlyAccessPrice);
  return Number(plan.priceMonthly || plan.price || 0);
}

function getPlanAnnualPrice(plan: PlanRow) {
  const metadata = parseJsonRecord(plan.metadata);
  const explicitAnnual = Number(metadata.annual_price ?? metadata.annualPrice);
  if (Number.isFinite(explicitAnnual) && explicitAnnual > 0) return Math.round(explicitAnnual);

  const monthly = getPlanMonthlyPrice(plan);
  const discountPercent = Number(
    metadata.annual_discount_percent ?? metadata.annualDiscountPercent ?? 0,
  );
  const boundedDiscount = Number.isFinite(discountPercent)
    ? Math.max(0, Math.min(100, discountPercent))
    : 0;
  return Math.round(monthly * 12 * (1 - boundedDiscount / 100));
}

function getBillingAmount(plan: PlanRow, billingCycle: BillingCycle) {
  return billingCycle === 'annual' ? getPlanAnnualPrice(plan) : getPlanMonthlyPrice(plan);
}

function getBillingCycleMonths(billingCycle: BillingCycle) {
  return billingCycle === 'annual' ? 12 : 1;
}

function parseDbDate(value?: string | Date | null) {
  if (!value) return null;
  const date =
    value instanceof Date
      ? value
      : /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(value)
        ? new Date(`${value.slice(0, 19).replace(' ', 'T')}Z`)
        : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function resolveInvoicePeriod(input: {
  subscription?: SubscriptionRow | null;
  requestedPlanId: number;
  billingCycle: BillingCycle;
  now?: Date;
}) {
  const now = input.now || new Date();
  const currentEnd = parseDbDate(input.subscription?.currentPeriodEnd);
  const graceEnd = parseDbDate(input.subscription?.graceEndsAt);
  const status = input.subscription?.status as CanonicalSubscriptionStatus | undefined;
  const samePlan = Number(input.subscription?.planId || 0) === input.requestedPlanId;
  const activeRenewal =
    samePlan &&
    status === 'active' &&
    currentEnd &&
    currentEnd.getTime() > now.getTime();
  const graceRenewal =
    samePlan &&
    status === 'grace_period' &&
    currentEnd &&
    (!graceEnd || graceEnd.getTime() >= now.getTime());
  const periodStart = activeRenewal || graceRenewal ? currentEnd! : now;
  const periodEnd = addMonths(periodStart, getBillingCycleMonths(input.billingCycle));

  return {
    periodStart,
    periodEnd,
    reason: activeRenewal
      ? 'active_early_renewal'
      : graceRenewal
        ? 'grace_period_renewal'
        : status && ACTIVE_SUBSCRIPTION_STATUSES.has(status) && !samePlan
          ? 'verified_upgrade'
          : status === 'expired' || status === 'cancelled'
            ? 'late_reactivation'
            : 'first_activation',
  };
}

function buildInvoicePriceSnapshot(input: {
  plan: PlanRow;
  billingCycle: BillingCycle;
  baseAmount: number;
  discountAmount: number;
  amountDue: number;
  couponCode?: string | null;
}) {
  const metadata = parseJsonRecord(input.plan.metadata);
  return {
    planId: input.plan.id,
    planName: input.plan.name,
    planDisplayName: input.plan.displayName,
    segment: input.plan.segment,
    billingCycle: input.billingCycle,
    currency: input.plan.currency || 'ZAR',
    baseAmount: input.baseAmount,
    discountAmount: input.discountAmount,
    couponCode: input.couponCode || null,
    taxAmount: 0,
    taxTreatment: metadata.tax_treatment || metadata.taxTreatment || 'not_configured',
    totalDue: input.amountDue,
    lockedAt: nowDb(),
  };
}

function resolveActivationPeriod(input: {
  invoice: InvoiceRow;
  subscription?: SubscriptionRow | null;
  activatedAt?: Date;
}) {
  const metadata = parseJsonRecord(input.invoice.metadata);
  const requestedPlanId = Number(metadata.requested_plan_id || input.invoice.planId || 0);
  const billingCycle = input.invoice.billingCycle as BillingCycle;
  return resolveInvoicePeriod({
    subscription: input.subscription,
    requestedPlanId,
    billingCycle,
    now: input.activatedAt || new Date(),
  });
}

async function resolveCouponDiscount(
  db: DbOrTx,
  input: { couponCode?: string; planId: number; amount: number },
) {
  const code = input.couponCode?.trim().toUpperCase();
  if (!code) return { coupon: null, discountAmount: 0 };

  const [coupon] = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
  if (!coupon || !coupon.isActive) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon is invalid or inactive.' });
  }

  const now = Date.now();
  if (coupon.validFrom && new Date(coupon.validFrom).getTime() > now) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon is not active yet.' });
  }
  if (coupon.validUntil && new Date(coupon.validUntil).getTime() < now) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon has expired.' });
  }

  const appliesToPlans = parseJsonArray(coupon.appliesToPlans);
  if (appliesToPlans.length && !appliesToPlans.includes(String(input.planId))) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Coupon does not apply to this plan.' });
  }

  const rawDiscount =
    coupon.discountType === 'amount'
      ? Number(coupon.discountAmount || 0)
      : Math.round(input.amount * (Number(coupon.discountAmount || 0) / 100));
  const discountAmount = Math.max(0, Math.min(input.amount, rawDiscount));

  return { coupon, discountAmount };
}

function assertAgencyAdmin(user: BillingUser) {
  if (!user.agencyId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'User must belong to an agency.' });
  }
  return Number(user.agencyId);
}

async function getAgencyOrThrow(db: DbOrTx, agencyId: number) {
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
  if (!agency) throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency not found.' });
  return agency;
}

async function getInvoiceForOwnerOrThrow(db: DbOrTx, invoiceId: number, ownerType: string, ownerId: number) {
  const [invoice] = await db
    .select()
    .from(billingInvoices)
    .where(
      and(
        eq(billingInvoices.id, invoiceId),
        eq(billingInvoices.ownerType, ownerType),
        eq(billingInvoices.ownerId, ownerId),
      ),
    )
    .limit(1);

  if (!invoice) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Invoice not found.' });
  }
  return invoice;
}

async function getLatestInvoicePaymentTotal(db: DbOrTx, invoiceId: number) {
  const [row] = await db
    .select({ total: sql<number>`COALESCE(SUM(${billingPayments.amount}), 0)` })
    .from(billingPayments)
    .where(and(eq(billingPayments.invoiceId, invoiceId), eq(billingPayments.state, 'verified')));
  return Number(row?.total || 0);
}

async function logBillingEvent(
  db: DbOrTx,
  input: {
    ownerType: string;
    ownerId: number;
    subscriptionId?: number | null;
    invoiceId?: number | null;
    paymentId?: number | null;
    actorUserId?: number | null;
    eventType: string;
    message?: string;
    beforeData?: Record<string, any> | null;
    afterData?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
  },
) {
  await db.insert(billingAuditEvents).values({
    ownerType: input.ownerType,
    ownerId: input.ownerId,
    subscriptionId: input.subscriptionId || null,
    invoiceId: input.invoiceId || null,
    paymentId: input.paymentId || null,
    actorUserId: input.actorUserId || null,
    eventType: input.eventType,
    message: input.message || null,
    beforeData: input.beforeData || null,
    afterData: input.afterData || null,
    metadata: input.metadata || null,
  });
}

async function notifyAgencyUsers(
  db: DbOrTx,
  input: {
    agencyId: number;
    type: string;
    title: string;
    content: string;
    data?: Record<string, any>;
  },
) {
  try {
    const agencyUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.agencyId, input.agencyId));
    if (!agencyUsers.length) return;

    await db.insert(notifications).values(
      agencyUsers.map(user => ({
        userId: user.id,
        type: 'system_alert' as const,
        title: input.title,
        content: input.content,
        data: JSON.stringify({ notificationType: input.type, ...(input.data || {}) }),
        isRead: 0,
      })),
    );
  } catch (error) {
    console.warn('[BillingFoundation] Notification insert skipped', {
      agencyId: input.agencyId,
      message: (error as any)?.message,
    });
  }
}

async function syncAgencyBillingShadow(
  db: DbOrTx,
  input: {
    agencyId: number;
    planId?: number | null;
    status: CanonicalSubscriptionStatus;
    periodEnd?: string | null;
  },
) {
  const legacyStatus =
    input.status === 'active' || input.status === 'grace_period'
      ? 'active'
      : input.status === 'past_due'
        ? 'past_due'
        : input.status === 'cancelled'
          ? 'canceled'
          : input.status === 'suspended'
            ? 'unpaid'
            : 'incomplete';

  await db
    .update(agencies)
    .set({
      subscriptionPlan: input.planId ? String(input.planId) : 'manual_eft',
      subscriptionStatus: input.status,
      subscriptionExpiry: input.periodEnd || null,
    })
    .where(eq(agencies.id, input.agencyId));

  // Do not create legacy agency_subscriptions rows here: that table is Stripe-shaped and has
  // non-null provider columns. It remains a compatibility read shadow only when it already exists.
  return legacyStatus;
}

async function upsertPendingSubscription(
  db: DbOrTx,
  input: {
    ownerType: 'agency';
    ownerId: number;
    requestedPlanId: number;
    actorUserId: number;
    metadata: Record<string, any>;
  },
) {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.ownerType, input.ownerType),
        eq(subscriptions.ownerId, input.ownerId),
      ),
    )
    .limit(1);

  if (existing && ACTIVE_SUBSCRIPTION_STATUSES.has(existing.status as CanonicalSubscriptionStatus)) {
    return {
      subscription: existing,
      pendingPlanId: input.requestedPlanId,
      accessChangeDeferred: existing.planId !== input.requestedPlanId,
    };
  }

  await db
    .insert(subscriptions)
    .values({
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      planId: input.requestedPlanId,
      status: 'pending_payment',
      metadata: input.metadata,
      createdBy: input.actorUserId,
      updatedBy: input.actorUserId,
    })
    .onDuplicateKeyUpdate({
      set: {
        planId: input.requestedPlanId,
        status: 'pending_payment',
        metadata: input.metadata,
        updatedBy: input.actorUserId,
      },
    });

  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.ownerType, input.ownerType),
        eq(subscriptions.ownerId, input.ownerId),
      ),
    )
    .limit(1);

  if (!subscription) {
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Subscription could not be created.',
    });
  }

  return { subscription, pendingPlanId: input.requestedPlanId, accessChangeDeferred: false };
}

export function getManualEftBankDetails() {
  const required = {
    accountName: process.env.BILLING_EFT_ACCOUNT_NAME,
    bankName: process.env.BILLING_EFT_BANK_NAME,
    branchCode: process.env.BILLING_EFT_BRANCH_CODE,
    accountNumber: process.env.BILLING_EFT_ACCOUNT_NUMBER,
    accountType: process.env.BILLING_EFT_ACCOUNT_TYPE,
    supportEmail: process.env.BILLING_SUPPORT_EMAIL,
  };
  const missing = Object.entries(required)
    .filter(([, value]) => !String(value || '').trim())
    .map(([key]) => key);
  const configured = missing.length === 0;
  const localFixture = !configured && !isProductionRuntime();
  const accountNumber = configured ? required.accountNumber! : '0000000000';

  return {
    configured,
    canIssueInvoices: configured || !isProductionRuntime(),
    localFixture,
    accountName: configured ? required.accountName! : 'LOCAL TEST EFT ACCOUNT - NOT PAYABLE',
    bankName: configured ? required.bankName! : 'Local test bank',
    branchCode: configured ? required.branchCode! : '000000',
    accountNumber,
    maskedAccountNumber: accountNumber.length > 4 ? `${'*'.repeat(accountNumber.length - 4)}${accountNumber.slice(-4)}` : accountNumber,
    accountType: configured ? required.accountType! : 'Local test account',
    supportEmail: required.supportEmail || 'support@propertylistifysa.co.za',
    missingConfiguration: missing,
    configurationMessage: configured
      ? null
      : isProductionRuntime()
        ? 'Manual EFT bank details are not configured for production.'
        : 'Local EFT fixture only. Do not treat these values as payable bank instructions.',
  };
}

export async function listBillingPlans(segment: 'agency' | 'agent' | 'developer' = 'agency') {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  return db
    .select()
    .from(plans)
    .where(and(eq(plans.segment, segment), eq(plans.isActive, 1)))
    .orderBy(plans.sortOrder);
}

export async function startAgencyManualCheckout(input: {
  user: BillingUser;
  planId: number;
  billingCycle: BillingCycle;
  couponCode?: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const agencyId = assertAgencyAdmin(input.user);
  const bankDetails = getManualEftBankDetails();
  if (!bankDetails.canIssueInvoices) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: bankDetails.configurationMessage || 'Manual EFT bank details are not configured.',
    });
  }
  const proofStorage = getBillingProofStorageStatus();
  if (!proofStorage.configured) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: proofStorage.message || 'Private proof-of-payment storage is not configured.',
    });
  }

  return db.transaction(async tx => {
    const agency = await getAgencyOrThrow(tx, agencyId);
    const [plan] = await tx.select().from(plans).where(eq(plans.id, input.planId)).limit(1);
    if (!plan || plan.isActive !== 1 || plan.segment !== 'agency') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Agency plan not found.' });
    }

    const baseAmount = getBillingAmount(plan, input.billingCycle);
    const { coupon, discountAmount } = await resolveCouponDiscount(tx, {
      couponCode: input.couponCode,
      planId: plan.id,
      amount: baseAmount,
    });
    const amountDue = Math.max(0, baseAmount - discountAmount);
    const invoiceNumber = buildInvoiceNumber('agency', agencyId);
    const paymentReference = buildPaymentReference('agency', agencyId);

    const subscriptionResult = await upsertPendingSubscription(tx, {
      ownerType: 'agency',
      ownerId: agencyId,
      requestedPlanId: plan.id,
      actorUserId: input.user.id,
      metadata: {
        billing_provider: 'manual_eft',
        requested_plan_id: plan.id,
        requested_billing_cycle: input.billingCycle,
        agency_name_snapshot: agency.name,
      },
    });
    const invoicePeriod = resolveInvoicePeriod({
      subscription: subscriptionResult.subscription,
      requestedPlanId: plan.id,
      billingCycle: input.billingCycle,
    });
    const priceSnapshot = buildInvoicePriceSnapshot({
      plan,
      billingCycle: input.billingCycle,
      baseAmount,
      discountAmount,
      amountDue,
      couponCode: coupon?.code || null,
    });

    const [invoiceInsert] = await tx
      .insert(billingInvoices)
      .values({
        ownerType: 'agency',
        ownerId: agencyId,
        subscriptionId: subscriptionResult.subscription.id,
        planId: plan.id,
        invoiceNumber,
        paymentReference,
        status: 'issued',
        billingCycle: input.billingCycle,
        amountDue,
        amountPaid: 0,
        discountAmount,
        currency: plan.currency || 'ZAR',
        issuedAt: nowDb(),
        dueAt: toDbTimestamp(addDays(new Date(), 7)),
        periodStart: toDbTimestamp(invoicePeriod.periodStart),
        periodEnd: toDbTimestamp(invoicePeriod.periodEnd),
        lineItems: [
          {
            description: `${plan.displayName} ${input.billingCycle === 'annual' ? 'annual' : 'monthly'} subscription`,
            planId: plan.id,
            planName: plan.name,
            planDisplayName: plan.displayName,
            segment: plan.segment,
            billingCycle: input.billingCycle,
            currency: plan.currency || 'ZAR',
            amount: baseAmount,
            discountAmount,
            taxAmount: 0,
            total: amountDue,
          },
        ],
        metadata: {
          billing_provider: 'manual_eft',
          payment_adapter: 'manual_eft',
          price_locked_at_invoice: true,
          price_snapshot: priceSnapshot,
          period_policy: invoicePeriod.reason,
          requested_plan_id: plan.id,
          requested_billing_cycle: input.billingCycle,
          existing_subscription_status: subscriptionResult.subscription.status,
          access_change_deferred: subscriptionResult.accessChangeDeferred,
          coupon_code: coupon?.code || null,
        },
        createdBy: input.user.id,
        updatedBy: input.user.id,
      })
      .$returningId();

    const invoiceId = Number(invoiceInsert.id);

    await syncAgencyBillingShadow(tx, {
      agencyId,
      planId: subscriptionResult.subscription.planId,
      status: subscriptionResult.subscription.status as CanonicalSubscriptionStatus,
      periodEnd: subscriptionResult.subscription.currentPeriodEnd || null,
    });

    await logBillingEvent(tx, {
      ownerType: 'agency',
      ownerId: agencyId,
      subscriptionId: subscriptionResult.subscription.id,
      invoiceId,
      actorUserId: input.user.id,
      eventType: 'invoice_issued',
      message: `Manual EFT invoice ${invoiceNumber} issued for ${agency.name}.`,
      afterData: {
        planId: plan.id,
        invoiceNumber,
        paymentReference,
        amountDue,
        billingCycle: input.billingCycle,
      },
    });

    await notifyAgencyUsers(tx, {
      agencyId,
      type: 'invoice_issued',
      title: 'Invoice issued',
      content: `Invoice ${invoiceNumber} has been issued for ${centsToRand(amountDue)}.`,
      data: { invoiceId, invoiceNumber, paymentReference },
    });

    const [invoice] = await tx
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.id, invoiceId))
      .limit(1);

    return {
      agency,
      plan,
      subscription: subscriptionResult.subscription,
      invoice,
      bankDetails,
      paymentReference,
    };
  });
}

export async function getAgencyBillingWorkspace(user: BillingUser) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const agencyId = assertAgencyAdmin(user);
  const agency = await getAgencyOrThrow(db, agencyId);
  const planRows = await listBillingPlans('agency');

  const [subscriptionWithPlan] = await db
    .select({ subscription: subscriptions, plan: plans })
    .from(subscriptions)
    .leftJoin(plans, eq(subscriptions.planId, plans.id))
    .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)))
    .limit(1);

  const invoiceRows = await db
    .select()
    .from(billingInvoices)
    .where(and(eq(billingInvoices.ownerType, 'agency'), eq(billingInvoices.ownerId, agencyId)))
    .orderBy(desc(billingInvoices.createdAt))
    .limit(25);

  const invoiceIds = invoiceRows.map(invoice => invoice.id);
  const paymentRows = invoiceIds.length
    ? await db
        .select()
        .from(billingPayments)
        .where(inArray(billingPayments.invoiceId, invoiceIds))
        .orderBy(desc(billingPayments.createdAt))
        .limit(50)
    : [];

  const activeInvoice =
    invoiceRows.find(invoice => ['issued', 'submitted', 'partially_paid', 'overdue'].includes(invoice.status)) ||
    null;

  return {
    agency,
    plans: planRows,
    subscription: subscriptionWithPlan?.subscription || null,
    currentPlan: subscriptionWithPlan?.plan || null,
    activeInvoice,
    invoices: invoiceRows,
    payments: paymentRows,
    bankDetails: getManualEftBankDetails(),
    proofStorage: getBillingProofStorageStatus(),
  };
}

export async function submitAgencyPaymentProof(input: {
  user: BillingUser;
  invoiceId: number;
  amount: number;
  bankReference?: string;
  payerName?: string;
  paymentDate?: string;
  notes?: string;
  file: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    contentBase64: string;
  };
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const agencyId = assertAgencyAdmin(input.user);
  const mimeType = input.file.mimeType.trim().toLowerCase();
  if (!ALLOWED_PROOF_MIME_TYPES.has(mimeType)) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Unsupported proof-of-payment file type.' });
  }
  if (input.file.sizeBytes <= 0 || input.file.sizeBytes > MAX_PROOF_BYTES) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Proof-of-payment file is too large.' });
  }
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Payment amount must be greater than zero.' });
  }

  const fileBuffer = Buffer.from(input.file.contentBase64, 'base64');
  if (fileBuffer.length !== input.file.sizeBytes || fileBuffer.length > MAX_PROOF_BYTES) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Proof-of-payment file size mismatch.' });
  }

  return db.transaction(async tx => {
    const invoice = await getInvoiceForOwnerOrThrow(tx, input.invoiceId, 'agency', agencyId);
    if (!['issued', 'submitted', 'partially_paid', 'overdue'].includes(invoice.status)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Invoice cannot accept payment proof while ${invoice.status}.`,
      });
    }

    const idempotencyKey = `manual_eft:${invoice.id}:${randomUUID()}`;
    const [paymentInsert] = await tx
      .insert(billingPayments)
      .values({
        invoiceId: invoice.id,
        subscriptionId: invoice.subscriptionId || null,
        ownerType: invoice.ownerType,
        ownerId: invoice.ownerId,
        paymentMethod: 'manual_eft',
        state: 'under_review',
        amount: Math.round(input.amount),
        currency: invoice.currency,
        paymentReference: invoice.paymentReference,
        bankReference: input.bankReference || null,
        payerName: input.payerName || null,
        paymentDate: input.paymentDate ? toDbTimestamp(input.paymentDate) : nowDb(),
        submittedBy: input.user.id,
        idempotencyKey,
        metadata: {
          notes: input.notes || null,
          upload_source: 'agency_billing_workspace',
        },
      })
      .$returningId();

    const paymentId = Number(paymentInsert.id);
    const sha256Hash = createHash('sha256').update(fileBuffer).digest('hex');
    const extension = safeFileExtension(input.file.filename, mimeType);
    const storageKey = path.join(
      'agency',
      String(agencyId),
      `${paymentId}-${randomReferencePart(4)}${extension}`,
    );
    let storedDocument: Awaited<ReturnType<typeof storeBillingProofDocument>>;
    try {
      storedDocument = await storeBillingProofDocument({
        storageKey,
        buffer: fileBuffer,
        mimeType,
        originalFileName: input.file.filename,
      });
    } catch (error) {
      if (error instanceof BillingProofStorageConfigurationError) {
        throw new TRPCError({ code: 'PRECONDITION_FAILED', message: error.message });
      }
      throw error;
    }

    const [documentInsert] = await tx
      .insert(billingPaymentDocuments)
      .values({
        paymentId,
        invoiceId: invoice.id,
        ownerType: invoice.ownerType,
        ownerId: invoice.ownerId,
        storageKey: storedDocument.storageKey,
        originalFileName: input.file.filename,
        mimeType,
        fileSizeBytes: fileBuffer.length,
        sha256Hash,
        visibility: 'private',
        status: 'active',
        uploadedBy: input.user.id,
        metadata: {
          source: 'manual_eft_upload',
          excluded_from_public_media: true,
          ...storedDocument.metadata,
        },
      })
      .$returningId();

    await tx
      .update(billingInvoices)
      .set({
        status: 'submitted',
        updatedBy: input.user.id,
      })
      .where(eq(billingInvoices.id, invoice.id));

    let nextSubscriptionStatus: CanonicalSubscriptionStatus = 'payment_under_review';
    let nextSubscriptionPeriodEnd: string | null = null;
    if (invoice.subscriptionId) {
      const [currentSubscription] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, invoice.subscriptionId))
        .limit(1);
      const currentStatus = currentSubscription?.status as CanonicalSubscriptionStatus | undefined;
      const shouldPreserveAccess = currentStatus ? ACTIVE_SUBSCRIPTION_STATUSES.has(currentStatus) : false;
      nextSubscriptionStatus = shouldPreserveAccess ? currentStatus! : 'payment_under_review';
      nextSubscriptionPeriodEnd = currentSubscription?.currentPeriodEnd || null;

      if (!shouldPreserveAccess) {
        await tx
          .update(subscriptions)
          .set({
            status: 'payment_under_review',
            updatedBy: input.user.id,
          })
          .where(eq(subscriptions.id, invoice.subscriptionId));
      }
    }

    await syncAgencyBillingShadow(tx, {
      agencyId,
      planId: invoice.planId,
      status: nextSubscriptionStatus,
      periodEnd: nextSubscriptionPeriodEnd,
    });

    await logBillingEvent(tx, {
      ownerType: invoice.ownerType,
      ownerId: invoice.ownerId,
      subscriptionId: invoice.subscriptionId,
      invoiceId: invoice.id,
      paymentId,
      actorUserId: input.user.id,
      eventType: 'payment_proof_received',
      message: `Proof of payment received for ${invoice.invoiceNumber}.`,
      afterData: {
        paymentId,
        documentId: Number(documentInsert.id),
        amount: input.amount,
        state: 'under_review',
        subscriptionStatus: nextSubscriptionStatus,
      },
    });

    await notifyAgencyUsers(tx, {
      agencyId,
      type: 'proof_received',
      title: 'Proof received',
      content: `Proof of payment for ${invoice.invoiceNumber} has been submitted for review.`,
      data: { invoiceId: invoice.id, paymentId },
    });

    return { success: true, paymentId, documentId: Number(documentInsert.id) };
  });
}

export async function getAdminFinanceQueue(input: {
  status?: PaymentState | 'all';
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const status = input.status || 'under_review';
  const limit = Math.min(Math.max(input.limit || 50, 1), 100);
  const offset = Math.max(input.offset || 0, 0);
  const conditions =
    status === 'all' ? undefined : eq(billingPayments.state, status as PaymentState);

  const rows = await db
    .select({
      payment: billingPayments,
      invoice: billingInvoices,
      agency: agencies,
      documentId: billingPaymentDocuments.id,
      documentFileName: billingPaymentDocuments.originalFileName,
      documentMimeType: billingPaymentDocuments.mimeType,
      documentSizeBytes: billingPaymentDocuments.fileSizeBytes,
    })
    .from(billingPayments)
    .innerJoin(billingInvoices, eq(billingPayments.invoiceId, billingInvoices.id))
    .leftJoin(
      billingPaymentDocuments,
      and(
        eq(billingPaymentDocuments.paymentId, billingPayments.id),
        eq(billingPaymentDocuments.status, 'active'),
      ),
    )
    .leftJoin(
      agencies,
      and(eq(billingInvoices.ownerType, 'agency'), eq(agencies.id, billingInvoices.ownerId)),
    )
    .where(conditions)
    .orderBy(desc(billingPayments.createdAt))
    .limit(limit)
    .offset(offset);

  const [pendingCount] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(billingPayments)
    .where(inArray(billingPayments.state, ['submitted', 'under_review']));

  return {
    payments: rows,
    pagination: {
      limit,
      offset,
      totalPending: Number(pendingCount?.count || 0),
    },
  };
}

async function activateSubscriptionForPaidInvoice(
  tx: DbOrTx,
  input: {
    invoice: InvoiceRow;
    actorUserId: number;
  },
) {
  if (!input.invoice.subscriptionId) return null;
  const metadata = parseJsonRecord(input.invoice.metadata);
  const effectivePlanId = Number(metadata.requested_plan_id || input.invoice.planId || 0);
  const [currentSubscription] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, input.invoice.subscriptionId))
    .limit(1);
  const activatedAt = new Date();
  const activationPeriod = resolveActivationPeriod({
    invoice: input.invoice,
    subscription: currentSubscription || null,
    activatedAt,
  });
  const periodStart = toDbTimestamp(activationPeriod.periodStart);
  const periodEnd = toDbTimestamp(activationPeriod.periodEnd);

  await tx
    .update(subscriptions)
    .set({
      planId: Number.isFinite(effectivePlanId) && effectivePlanId > 0 ? effectivePlanId : input.invoice.planId,
      status: 'active',
      trialEndsAt: null,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      graceEndsAt: null,
      cancelAtPeriodEnd: 0,
      cancelledAt: null,
      billingCycleAnchor: periodEnd,
      updatedBy: input.actorUserId,
      metadata: {
        ...metadata,
        billing_provider: 'manual_eft',
        activated_from_invoice_id: input.invoice.id,
        activated_at: toDbTimestamp(activatedAt),
        activation_period_policy: activationPeriod.reason,
      },
    })
    .where(eq(subscriptions.id, input.invoice.subscriptionId));

  const [subscription] = await tx
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.id, input.invoice.subscriptionId))
    .limit(1);

  if (subscription && input.invoice.ownerType === 'agency') {
    await syncAgencyBillingShadow(tx, {
      agencyId: input.invoice.ownerId,
      planId: subscription.planId,
      status: 'active',
      periodEnd: subscription.currentPeriodEnd || periodEnd,
    });
  }

  return subscription || null;
}

export async function reviewManualPayment(input: {
  actorUser: BillingUser;
  paymentId: number;
  decision:
    | 'approve'
    | 'reject'
    | 'request_correction'
    | 'partial_payment'
    | 'duplicate'
    | 'unmatched';
  note?: string;
  verifiedAmount?: number;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  if (!isBillingFinanceAdmin(input.actorUser)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Finance admin privileges required.' });
  }

  let activatedAgencyId: number | null = null;
  const result = await db.transaction(async tx => {
    const [row] = await tx
      .select({
        payment: billingPayments,
        invoice: billingInvoices,
      })
      .from(billingPayments)
      .innerJoin(billingInvoices, eq(billingPayments.invoiceId, billingInvoices.id))
      .where(eq(billingPayments.id, input.paymentId))
      .limit(1);

    if (!row) throw new TRPCError({ code: 'NOT_FOUND', message: 'Payment not found.' });

    const beforePayment = row.payment;
    const invoice = row.invoice;
    const reviewedAt = nowDb();

    if (beforePayment.state === 'verified' && input.decision === 'approve') {
      return { success: true, idempotent: true, invoiceStatus: invoice.status };
    }

    if (!['submitted', 'under_review'].includes(beforePayment.state)) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Payment cannot be reviewed while ${beforePayment.state}.`,
      });
    }

    if (BLOCKED_REVIEW_DECISIONS.has(input.decision)) {
      const reason =
        input.decision === 'request_correction'
          ? 'Correction requested'
          : input.decision === 'duplicate'
            ? 'Duplicate payment proof'
          : input.decision === 'unmatched'
            ? 'Payment could not be matched'
            : 'Payment rejected';
      let nextSubscriptionStatus: CanonicalSubscriptionStatus = 'pending_payment';
      let nextSubscriptionPeriodEnd: string | null = null;

      await tx
        .update(billingPayments)
        .set({
          state: 'rejected',
          reviewedBy: input.actorUser.id,
          reviewedAt,
          rejectionReason: input.note || reason,
          reviewNote: input.note || reason,
        })
        .where(eq(billingPayments.id, beforePayment.id));

      await tx
        .update(billingInvoices)
        .set({
          status: 'submitted',
          updatedBy: input.actorUser.id,
        })
        .where(eq(billingInvoices.id, invoice.id));

      if (invoice.subscriptionId) {
        const [currentSubscription] = await tx
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.id, invoice.subscriptionId))
          .limit(1);
        const currentStatus = currentSubscription?.status as CanonicalSubscriptionStatus | undefined;
        const shouldPreserveAccess = currentStatus ? ACTIVE_SUBSCRIPTION_STATUSES.has(currentStatus) : false;
        nextSubscriptionStatus = shouldPreserveAccess ? currentStatus! : 'pending_payment';
        nextSubscriptionPeriodEnd = currentSubscription?.currentPeriodEnd || null;

        if (!shouldPreserveAccess) {
          await tx
            .update(subscriptions)
            .set({
              status: 'pending_payment',
              updatedBy: input.actorUser.id,
            })
            .where(eq(subscriptions.id, invoice.subscriptionId));
        }
      }

      await logBillingEvent(tx, {
        ownerType: invoice.ownerType,
        ownerId: invoice.ownerId,
        subscriptionId: invoice.subscriptionId,
        invoiceId: invoice.id,
        paymentId: beforePayment.id,
        actorUserId: input.actorUser.id,
        eventType: `payment_${input.decision}`,
        message: input.note || reason,
        beforeData: beforePayment,
        afterData: { state: 'rejected', invoiceStatus: 'submitted', subscriptionStatus: nextSubscriptionStatus },
      });

      if (invoice.ownerType === 'agency') {
        await syncAgencyBillingShadow(tx, {
          agencyId: invoice.ownerId,
          planId: invoice.planId,
          status: nextSubscriptionStatus,
          periodEnd: nextSubscriptionPeriodEnd,
        });
        await notifyAgencyUsers(tx, {
          agencyId: invoice.ownerId,
          type: 'payment_rejected',
          title: input.decision === 'request_correction' ? 'Payment correction requested' : 'Payment not approved',
          content: input.note || reason,
          data: { invoiceId: invoice.id, paymentId: beforePayment.id },
        });
      }

      return { success: true, idempotent: false, invoiceStatus: 'submitted' };
    }

    const verifiedAmount = Math.round(input.verifiedAmount || beforePayment.amount);
    if (!Number.isFinite(verifiedAmount) || verifiedAmount <= 0) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Verified amount must be greater than zero.' });
    }

    await tx
      .update(billingPayments)
      .set({
        state: 'verified',
        amount: verifiedAmount,
        reviewedBy: input.actorUser.id,
        reviewedAt,
        reviewNote: input.note || null,
      })
      .where(eq(billingPayments.id, beforePayment.id));

    const amountPaid = await getLatestInvoicePaymentTotal(tx, invoice.id);
    const invoicePaid = amountPaid >= invoice.amountDue && input.decision !== 'partial_payment';
    const nextInvoiceStatus: InvoiceStatus = invoicePaid ? 'paid' : 'partially_paid';
    const overpaymentAmount = Math.max(0, amountPaid - invoice.amountDue);

    await tx
      .update(billingInvoices)
      .set({
        status: nextInvoiceStatus,
        amountPaid,
        paidAt: invoicePaid ? reviewedAt : null,
        updatedBy: input.actorUser.id,
        metadata: {
          ...parseJsonRecord(invoice.metadata),
          last_reviewed_payment_id: beforePayment.id,
          last_reviewed_at: reviewedAt,
          overpayment_amount: overpaymentAmount,
          amount_rule: invoicePaid
            ? overpaymentAmount > 0
              ? 'overpayment_activates'
              : 'exact_or_full_payment_activates'
            : 'partial_payment_does_not_activate',
        },
      })
      .where(eq(billingInvoices.id, invoice.id));

    let subscription: SubscriptionRow | null = null;
    if (invoicePaid) {
      subscription = await activateSubscriptionForPaidInvoice(tx, {
        invoice: { ...invoice, amountPaid, status: nextInvoiceStatus },
        actorUserId: input.actorUser.id,
      });
    } else if (invoice.subscriptionId) {
      const [currentSubscription] = await tx
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.id, invoice.subscriptionId))
        .limit(1);
      const currentStatus = currentSubscription?.status as CanonicalSubscriptionStatus | undefined;
      const shouldPreserveAccess = currentStatus ? ACTIVE_SUBSCRIPTION_STATUSES.has(currentStatus) : false;
      if (!shouldPreserveAccess) {
        await tx
          .update(subscriptions)
          .set({
            status: 'payment_under_review',
            updatedBy: input.actorUser.id,
          })
          .where(eq(subscriptions.id, invoice.subscriptionId));
      }
    }

    await logBillingEvent(tx, {
      ownerType: invoice.ownerType,
      ownerId: invoice.ownerId,
      subscriptionId: invoice.subscriptionId,
      invoiceId: invoice.id,
      paymentId: beforePayment.id,
      actorUserId: input.actorUser.id,
      eventType: invoicePaid ? 'payment_approved_subscription_activated' : 'payment_partially_approved',
      message: input.note || (invoicePaid ? 'Payment approved.' : 'Partial payment recorded.'),
      beforeData: beforePayment,
      afterData: {
        paymentState: 'verified',
        invoiceStatus: nextInvoiceStatus,
        amountPaid,
        subscriptionStatus: subscription?.status || 'payment_under_review',
      },
    });

    if (invoice.ownerType === 'agency') {
      await notifyAgencyUsers(tx, {
        agencyId: invoice.ownerId,
        type: invoicePaid ? 'payment_approved' : 'partial_payment',
        title: invoicePaid ? 'Payment approved' : 'Partial payment recorded',
        content: invoicePaid
          ? `Payment for ${invoice.invoiceNumber} has been approved and your subscription is active.`
          : `A partial payment was recorded for ${invoice.invoiceNumber}.`,
        data: { invoiceId: invoice.id, paymentId: beforePayment.id },
      });
      if (invoicePaid) {
        activatedAgencyId = invoice.ownerId;
      }
    }

    return {
      success: true,
      idempotent: false,
      invoiceStatus: nextInvoiceStatus,
      subscriptionStatus: subscription?.status || 'payment_under_review',
    };
  });

  if (activatedAgencyId) {
    try {
      await deliverPendingAgencyInvitations(activatedAgencyId);
    } catch (error) {
      // Finance approval must remain durable even when an email provider is unavailable.
      console.error('[Billing] Agency activated but pending invitation delivery failed', {
        agencyId: activatedAgencyId,
        error,
      });
    }
  }

  return result;
}

export async function updateSubscriptionLifecycle(input: {
  actorUser: BillingUser;
  subscriptionId: number;
  status: CanonicalSubscriptionStatus;
  periodEnd?: string | null;
  graceEndsAt?: string | null;
  note?: string;
}) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  if (!isBillingFinanceAdmin(input.actorUser)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Finance admin privileges required.' });
  }

  return db.transaction(async tx => {
    const [subscription] = await tx
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.id, input.subscriptionId))
      .limit(1);

    if (!subscription) throw new TRPCError({ code: 'NOT_FOUND', message: 'Subscription not found.' });

    const updateSet: Partial<typeof subscriptions.$inferInsert> = {
      status: input.status,
      updatedBy: input.actorUser.id,
      metadata: {
        ...parseJsonRecord(subscription.metadata),
        lifecycle_note: input.note || null,
        lifecycle_updated_at: nowDb(),
      },
    };

    if (input.periodEnd !== undefined) updateSet.currentPeriodEnd = input.periodEnd ? toDbTimestamp(input.periodEnd) : null;
    if (input.graceEndsAt !== undefined) updateSet.graceEndsAt = input.graceEndsAt ? toDbTimestamp(input.graceEndsAt) : null;
    if (input.status === 'cancelled') {
      updateSet.cancelledAt = nowDb();
      updateSet.cancelAtPeriodEnd = 0;
    }

    await tx.update(subscriptions).set(updateSet).where(eq(subscriptions.id, input.subscriptionId));

    if (subscription.ownerType === 'agency') {
      await syncAgencyBillingShadow(tx, {
        agencyId: subscription.ownerId,
        planId: subscription.planId,
        status: input.status,
        periodEnd: updateSet.currentPeriodEnd ?? subscription.currentPeriodEnd ?? null,
      });
    }

    await logBillingEvent(tx, {
      ownerType: subscription.ownerType,
      ownerId: subscription.ownerId,
      subscriptionId: subscription.id,
      actorUserId: input.actorUser.id,
      eventType: 'subscription_lifecycle_updated',
      message: input.note || `Subscription moved to ${input.status}.`,
      beforeData: subscription,
      afterData: updateSet,
    });

    return { success: true };
  });
}

export async function requestAgencyCancellationAtPeriodEnd(user: BillingUser) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const agencyId = assertAgencyAdmin(user);

  return db.transaction(async tx => {
    const [subscription] = await tx
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)))
      .limit(1);

    if (!subscription) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No agency subscription found.' });
    }

    const accessPreservingStatus = ACTIVE_SUBSCRIPTION_STATUSES.has(
      subscription.status as CanonicalSubscriptionStatus,
    )
      ? subscription.status
      : 'cancelled';

    await tx
      .update(subscriptions)
      .set({
        status: accessPreservingStatus as CanonicalSubscriptionStatus,
        cancelAtPeriodEnd: 1,
        cancelledAt: nowDb(),
        updatedBy: user.id,
        metadata: {
          ...parseJsonRecord(subscription.metadata),
          cancellation_requested_at: nowDb(),
          cancellation_effective_at: subscription.currentPeriodEnd || null,
        },
      })
      .where(eq(subscriptions.id, subscription.id));

    await syncAgencyBillingShadow(tx, {
      agencyId,
      planId: subscription.planId,
      status: accessPreservingStatus as CanonicalSubscriptionStatus,
      periodEnd: subscription.currentPeriodEnd || null,
    });

    await logBillingEvent(tx, {
      ownerType: 'agency',
      ownerId: agencyId,
      subscriptionId: subscription.id,
      actorUserId: user.id,
      eventType: 'subscription_cancellation_requested',
      message: 'Cancellation requested for period end.',
      beforeData: subscription,
      afterData: { cancelAtPeriodEnd: true, status: accessPreservingStatus },
    });

    return { success: true, cancelAtPeriodEnd: true };
  });
}

export async function restoreAgencySubscription(user: BillingUser) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
  const agencyId = assertAgencyAdmin(user);

  return db.transaction(async tx => {
    const [subscription] = await tx
      .select()
      .from(subscriptions)
      .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)))
      .limit(1);

    if (!subscription) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'No agency subscription found.' });
    }

    const restoredStatus: CanonicalSubscriptionStatus =
      subscription.status === 'cancelled' && subscription.currentPeriodEnd ? 'active' : (subscription.status as CanonicalSubscriptionStatus);

    await tx
      .update(subscriptions)
      .set({
        status: restoredStatus,
        cancelAtPeriodEnd: 0,
        cancelledAt: null,
        updatedBy: user.id,
        metadata: {
          ...parseJsonRecord(subscription.metadata),
          restored_at: nowDb(),
        },
      })
      .where(eq(subscriptions.id, subscription.id));

    await syncAgencyBillingShadow(tx, {
      agencyId,
      planId: subscription.planId,
      status: restoredStatus,
      periodEnd: subscription.currentPeriodEnd || null,
    });

    await logBillingEvent(tx, {
      ownerType: 'agency',
      ownerId: agencyId,
      subscriptionId: subscription.id,
      actorUserId: user.id,
      eventType: 'subscription_restored',
      message: 'Cancellation request was removed.',
      beforeData: subscription,
      afterData: { cancelAtPeriodEnd: false, status: restoredStatus },
    });

    return { success: true, cancelAtPeriodEnd: false };
  });
}

export async function getBillingDocumentForUser(input: { user: BillingUser; documentId: number }) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });

  const [document] = await db
    .select()
    .from(billingPaymentDocuments)
    .where(and(eq(billingPaymentDocuments.id, input.documentId), eq(billingPaymentDocuments.status, 'active')))
    .limit(1);

  if (!document) throw new TRPCError({ code: 'NOT_FOUND', message: 'Document not found.' });

  const isFinanceAdmin = isBillingFinanceAdmin(input.user);
  const isOwningAgencyUser =
    document.ownerType === 'agency' && Number(input.user.agencyId || 0) === document.ownerId;
  if (!isFinanceAdmin && !isOwningAgencyUser) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Document is private.' });
  }

  let buffer: Buffer;
  try {
    buffer = await readBillingProofDocument({
      storageKey: document.storageKey,
      metadata: parseJsonRecord(document.metadata),
    });
  } catch (error) {
    if (error instanceof BillingProofStorageConfigurationError) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: error.message });
    }
    const errorName = String((error as any)?.name || '');
    const errorCode = String((error as any)?.code || '');
    if (errorCode === 'ENOENT' || errorName === 'NoSuchKey' || errorName === 'NotFound') {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Stored proof document is unavailable.' });
    }
    throw error;
  }
  const hash = createHash('sha256').update(buffer).digest('hex');
  if (hash !== document.sha256Hash) {
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Document integrity check failed.' });
  }

  return {
    filename: document.originalFileName,
    mimeType: document.mimeType,
    sizeBytes: document.fileSizeBytes,
    contentBase64: buffer.toString('base64'),
  };
}
