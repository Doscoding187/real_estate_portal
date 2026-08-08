import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  agencies,
  billingAuditEvents,
  billingInvoices,
  billingPaymentDocuments,
  billingPayments,
  notifications,
  plans,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db-connection';
import { getCommercialCatalog } from '../services/commercialCatalogService';
import {
  getPlanAccessProjectionForUserId,
  isSubscriptionEntitled,
} from '../services/planAccessService';
import {
  requestPaidLaunchAccessInvoice,
  reviewManualPayment,
  submitPaidLaunchAccessPaymentProof,
} from '../services/billingFoundationService';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe;

const created = {
  userIds: [] as number[],
  agencyIds: [] as number[],
};

const originalEnvironment: Record<string, string | undefined> = {};

function rememberEnvironment(key: string, value: string) {
  if (!(key in originalEnvironment)) originalEnvironment[key] = process.env[key];
  process.env[key] = value;
}

function insertId(result: any): number {
  return Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
}

async function insertUser(input: {
  label: string;
  role: 'agent' | 'agency_admin' | 'super_admin';
  agencyId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [result] = await db.insert(users).values({
    email: `${input.label}-${suffix}@example.test`,
    name: input.label,
    role: input.role,
    agencyId: input.agencyId ?? null,
    emailVerified: 1,
  } as any);
  const userId = insertId(result);
  if (!userId) throw new Error(`Could not create ${input.label} test user.`);
  created.userIds.push(userId);
  return userId;
}

async function insertAgency(label: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [result] = await db.insert(agencies).values({
    name: `${label} Agency`,
    slug: `${label.toLowerCase()}-${suffix}`,
    email: `${label}-${suffix}@example.test`,
    city: 'Johannesburg',
    province: 'Gauteng',
    subscriptionPlan: 'free',
    subscriptionStatus: 'trial',
    isVerified: 1,
  } as any);
  const agencyId = insertId(result);
  if (!agencyId) throw new Error(`Could not create ${label} test agency.`);
  created.agencyIds.push(agencyId);
  return agencyId;
}

function proofFor(invoice: { id: number; amountDue: number }) {
  const content = Buffer.from(`S4 launch proof ${invoice.id}`);
  return {
    invoiceId: invoice.id,
    amount: invoice.amountDue,
    bankReference: `TEST-${invoice.id}`,
    payerName: 'Property Listify S4 Test',
    file: {
      filename: `launch-${invoice.id}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: content.length,
      contentBase64: content.toString('base64'),
    },
  };
}

async function ownerInvoiceCount(ownerType: string, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(billingInvoices)
    .where(and(eq(billingInvoices.ownerType, ownerType), eq(billingInvoices.ownerId, ownerId)));
  return Number(row?.count || 0);
}

async function loadSubscription(ownerType: 'agent' | 'agency', ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.ownerType, ownerType), eq(subscriptions.ownerId, ownerId)))
    .limit(1);
  return row;
}

async function cleanup() {
  const db = await getDb();
  if (!db) return;

  const userIds = Array.from(new Set(created.userIds));
  const agencyIds = Array.from(new Set(created.agencyIds));

  if (userIds.length) {
    await db.delete(notifications).where(inArray(notifications.userId, userIds));
  }
  if (agencyIds.length) {
    await db
      .delete(billingAuditEvents)
      .where(and(eq(billingAuditEvents.ownerType, 'agency'), inArray(billingAuditEvents.ownerId, agencyIds)));
    await db
      .delete(billingPaymentDocuments)
      .where(and(eq(billingPaymentDocuments.ownerType, 'agency'), inArray(billingPaymentDocuments.ownerId, agencyIds)));
    await db
      .delete(billingPayments)
      .where(and(eq(billingPayments.ownerType, 'agency'), inArray(billingPayments.ownerId, agencyIds)));
    await db
      .delete(billingInvoices)
      .where(and(eq(billingInvoices.ownerType, 'agency'), inArray(billingInvoices.ownerId, agencyIds)));
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.ownerType, 'agency'), inArray(subscriptions.ownerId, agencyIds)));
  }
  if (userIds.length) {
    await db
      .delete(billingAuditEvents)
      .where(and(eq(billingAuditEvents.ownerType, 'agent'), inArray(billingAuditEvents.ownerId, userIds)));
    await db
      .delete(billingPaymentDocuments)
      .where(and(eq(billingPaymentDocuments.ownerType, 'agent'), inArray(billingPaymentDocuments.ownerId, userIds)));
    await db
      .delete(billingPayments)
      .where(and(eq(billingPayments.ownerType, 'agent'), inArray(billingPayments.ownerId, userIds)));
    await db
      .delete(billingInvoices)
      .where(and(eq(billingInvoices.ownerType, 'agent'), inArray(billingInvoices.ownerId, userIds)));
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.ownerType, 'agent'), inArray(subscriptions.ownerId, userIds)));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  if (agencyIds.length) await db.delete(agencies).where(inArray(agencies.id, agencyIds));

  created.userIds.length = 0;
  created.agencyIds.length = 0;
}

describeWithDb('S4 paid Launch Access disposable runtime', () => {
  beforeAll(() => {
    rememberEnvironment('BILLING_PROOF_STORAGE_ADAPTER', 'local');
    rememberEnvironment('BILLING_PRIVATE_STORAGE_DIR', `/tmp/property-listify-s4-launch-${process.pid}`);
    rememberEnvironment('BILLING_EFT_ACCOUNT_NAME', 'LOCAL TEST EFT ACCOUNT - NOT PAYABLE');
    rememberEnvironment('BILLING_EFT_BANK_NAME', 'Local Test Bank');
    rememberEnvironment('BILLING_EFT_BRANCH_CODE', '000000');
    rememberEnvironment('BILLING_EFT_ACCOUNT_NUMBER', '0000000000');
    rememberEnvironment('BILLING_EFT_ACCOUNT_TYPE', 'Local test account');
    rememberEnvironment('BILLING_SUPPORT_EMAIL', 'billing-test@propertylistify.local');
  });

  afterAll(async () => {
    await cleanup();
    for (const [key, value] of Object.entries(originalEnvironment)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it('provisions the three first-class launch products without source plans', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const launchRows = await db
      .select({ name: plans.name, segment: plans.segment })
      .from(plans)
      .where(inArray(plans.segment, ['agent', 'agency', 'developer']));
    expect(launchRows.map(row => row.name).sort()).toEqual([
      'agency_launch_access',
      'agent_launch_access',
      'developer_launch_access',
    ]);

    const catalog = await getCommercialCatalog();
    expect(catalog.products.map(product => product.productKey)).toEqual([
      'agent_launch_access',
      'agency_launch_access',
      'developer_launch_access',
    ]);
    expect(catalog.products.map(product => product.pricing.basePrice?.amountMinor)).toEqual([
      49900,
      99900,
      149900,
    ]);
    expect(catalog.products.every(product => product.term.kind === 'paid_launch_access')).toBe(true);
    expect(catalog.products.every(product => product.term.durationDays === 90)).toBe(true);
    expect(catalog.products.every(product => product.pricing.billingInterval === 'once')).toBe(true);
    expect(catalog.products.find(product => product.productKey === 'agent_launch_access')?.limits).toEqual({
      max_active_listings: 50,
    });
    expect(catalog.products.find(product => product.productKey === 'agency_launch_access')?.limits).toEqual({
      max_active_listings: 500,
    });
    expect(catalog.products.find(product => product.productKey === 'developer_launch_access')?.limits).toMatchObject({
      unlimited_development_portfolio: true,
    });
  });

  it('runs Agent and Agency request-proof-finance-activation-expiry with owner isolation', async () => {
    const agentId = await insertUser({ label: 's4-agent-primary', role: 'agent' });
    const otherAgentId = await insertUser({ label: 's4-agent-other', role: 'agent' });
    const agencyId = await insertAgency('s4-primary');
    const agencyUserId = await insertUser({
      label: 's4-agency-primary',
      role: 'agency_admin',
      agencyId,
    });
    const otherAgencyId = await insertAgency('s4-other');
    const otherAgencyUserId = await insertUser({
      label: 's4-agency-other',
      role: 'agency_admin',
      agencyId: otherAgencyId,
    });
    const financeId = await insertUser({ label: 's4-finance', role: 'super_admin' });

    const runOwner = async (input: {
      ownerType: 'agent' | 'agency';
      ownerId: number;
      userId: number;
      otherUserId: number;
      planKey: 'agent_launch_access' | 'agency_launch_access';
      expectedAmount: number;
      expectedLimit: number;
      expectedFlags: Record<string, boolean>;
    }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not available');
      const [plan] = await db.select().from(plans).where(eq(plans.name, input.planKey)).limit(1);
      if (!plan) throw new Error(`Missing ${input.planKey}`);

      const ownerUser = {
        id: input.userId,
        role: input.ownerType === 'agent' ? 'agent' : 'agency_admin',
        agencyId: input.ownerType === 'agency' ? input.ownerId : null,
      };
      const otherUser = {
        id: input.otherUserId,
        role: input.ownerType === 'agent' ? 'agent' : 'agency_admin',
        agencyId: input.ownerType === 'agency' ? otherAgencyId : null,
      };

      const requested = await requestPaidLaunchAccessInvoice({
        user: ownerUser,
        planId: plan.id,
      });
      expect(requested.invoice.amountDue).toBe(input.expectedAmount);
      expect(requested.invoice.commercialTermKind).toBe('paid_launch_access');
      expect(requested.invoice.metadata).toMatchObject({
        requested_billing_cycle: 'once_off',
        commercial_term_duration_days: 90,
        entitlement_starts_on_verified_activation: true,
      });

      const pending = await getPlanAccessProjectionForUserId(input.userId);
      expect(pending?.subscription?.status).toBe('pending_payment');
      expect(isSubscriptionEntitled(pending?.subscription?.status)).toBe(false);

      await expect(
        submitPaidLaunchAccessPaymentProof({
          user: otherUser,
          ...proofFor(requested.invoice),
        }),
      ).rejects.toThrow(/not found|forbidden/i);

      const proof = await submitPaidLaunchAccessPaymentProof({
        user: ownerUser,
        ...proofFor(requested.invoice),
      });
      const afterProof = await getPlanAccessProjectionForUserId(input.userId);
      expect(afterProof?.subscription?.status).toBe('payment_under_review');
      expect(isSubscriptionEntitled(afterProof?.subscription?.status)).toBe(false);

      const approved = await reviewManualPayment({
        actorUser: { id: financeId, role: 'super_admin' },
        paymentId: proof.paymentId,
        decision: 'approve',
        verifiedAmount: input.expectedAmount,
      });
      expect(approved).toMatchObject({
        success: true,
        invoiceStatus: 'paid',
        subscriptionStatus: 'active',
      });

      const active = await getPlanAccessProjectionForUserId(input.userId);
      expect(active?.subscription?.status).toBe('active');
      expect(isSubscriptionEntitled(active?.subscription?.status)).toBe(true);
      expect(active?.currentPlan?.name).toBe(input.planKey);
      expect(active?.entitlements.max_active_listings).toBe(input.expectedLimit);
      for (const [key, value] of Object.entries(input.expectedFlags)) {
        expect(active?.entitlements[key]).toBe(value);
      }

      const subscription = await loadSubscription(input.ownerType, input.ownerId);
      expect(subscription?.currentPeriodStart).toBeTruthy();
      expect(subscription?.currentPeriodEnd).toBeTruthy();
      const duration =
        new Date(subscription!.currentPeriodEnd!).getTime() -
        new Date(subscription!.currentPeriodStart!).getTime();
      expect(duration).toBe(90 * 24 * 60 * 60 * 1000);
      expect(subscription?.cancelAtPeriodEnd).toBe(0);

      const invoiceCountBeforeExpiry = await ownerInvoiceCount(input.ownerType, input.ownerId);
      await db
        .update(subscriptions)
        .set({ currentPeriodEnd: new Date(Date.now() - 1000).toISOString().slice(0, 19).replace('T', ' ') })
        .where(and(eq(subscriptions.ownerType, input.ownerType), eq(subscriptions.ownerId, input.ownerId)));
      const expired = await getPlanAccessProjectionForUserId(input.userId);
      expect(expired?.subscription?.status).toBe('expired');
      expect(isSubscriptionEntitled(expired?.subscription?.status)).toBe(false);
      expect(await ownerInvoiceCount(input.ownerType, input.ownerId)).toBe(invoiceCountBeforeExpiry);
    };

    await runOwner({
      ownerType: 'agent',
      ownerId: agentId,
      userId: agentId,
      otherUserId: otherAgentId,
      planKey: 'agent_launch_access',
      expectedAmount: 49900,
      expectedLimit: 50,
      expectedFlags: {
        has_commission_tracking: true,
        has_revenue_dashboard: true,
      },
    });
    await runOwner({
      ownerType: 'agency',
      ownerId: agencyId,
      userId: agencyUserId,
      otherUserId: otherAgencyUserId,
      planKey: 'agency_launch_access',
      expectedAmount: 99900,
      expectedLimit: 500,
      expectedFlags: {
        has_commission_tracking: true,
        has_revenue_dashboard: true,
        has_team_dashboard: true,
        has_lead_routing: true,
      },
    });
  }, 60_000);
});
