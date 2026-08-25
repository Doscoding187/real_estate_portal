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
  getAdminFinanceQueue,
  requestPaidLaunchAccessInvoice,
  reviewManualPayment,
  submitPaidLaunchAccessPaymentProof,
} from '../services/billingFoundationService';
import {
  createDeveloperTestContext,
  deleteDeveloperTestContext,
  type DeveloperTestContext,
} from '../test-utils/developerTestContext';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe);

const created = {
  userIds: [] as number[],
  agencyIds: [] as number[],
  developerContexts: [] as DeveloperTestContext[],
};

const launchPlanNames = [
  'agent_launch_access',
  'agency_launch_access',
  'developer_launch_access',
] as const;

function selectLaunchProducts<T extends { productKey: string }>(products: readonly T[]) {
  return products
    .filter(product => (launchPlanNames as readonly string[]).includes(product.productKey))
    .sort((left, right) => left.productKey.localeCompare(right.productKey));
}

describe('S4 Launch Access catalog selection invariant', () => {
  it('selects the three required products without treating unrelated disposable plans as a failure', () => {
    expect(
      selectLaunchProducts([
        { productKey: 'performance-publication-fixture' },
        { productKey: 'developer_launch_access' },
        { productKey: 'agency_launch_access' },
        { productKey: 'agent_launch_access' },
      ]).map(product => product.productKey),
    ).toEqual(['agency_launch_access', 'agent_launch_access', 'developer_launch_access']);
  });
});

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
  role: 'agent' | 'agency_admin' | 'property_developer' | 'super_admin';
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

async function insertDeveloper(userId: number, label: string) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const context = await createDeveloperTestContext({
    userId,
    name: `${label} Developer ${suffix}`,
    email: `${label}-${suffix}@example.test`,
  });
  created.developerContexts.push(context);
  return context.organisationId;
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

async function loadSubscription(ownerType: 'agent' | 'agency' | 'developer', ownerId: number) {
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
  const developerIds = Array.from(
    new Set(created.developerContexts.map(context => context.organisationId)),
  );

  if (userIds.length) {
    await db.delete(notifications).where(inArray(notifications.userId, userIds));
  }
  if (agencyIds.length) {
    await db
      .delete(billingAuditEvents)
      .where(
        and(
          eq(billingAuditEvents.ownerType, 'agency'),
          inArray(billingAuditEvents.ownerId, agencyIds),
        ),
      );
    await db
      .delete(billingPaymentDocuments)
      .where(
        and(
          eq(billingPaymentDocuments.ownerType, 'agency'),
          inArray(billingPaymentDocuments.ownerId, agencyIds),
        ),
      );
    await db
      .delete(billingPayments)
      .where(
        and(eq(billingPayments.ownerType, 'agency'), inArray(billingPayments.ownerId, agencyIds)),
      );
    await db
      .delete(billingInvoices)
      .where(
        and(eq(billingInvoices.ownerType, 'agency'), inArray(billingInvoices.ownerId, agencyIds)),
      );
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.ownerType, 'agency'), inArray(subscriptions.ownerId, agencyIds)));
  }
  if (developerIds.length) {
    await db
      .delete(billingAuditEvents)
      .where(
        and(
          eq(billingAuditEvents.ownerType, 'developer'),
          inArray(billingAuditEvents.ownerId, developerIds),
        ),
      );
    await db
      .delete(billingPaymentDocuments)
      .where(
        and(
          eq(billingPaymentDocuments.ownerType, 'developer'),
          inArray(billingPaymentDocuments.ownerId, developerIds),
        ),
      );
    await db
      .delete(billingPayments)
      .where(
        and(
          eq(billingPayments.ownerType, 'developer'),
          inArray(billingPayments.ownerId, developerIds),
        ),
      );
    await db
      .delete(billingInvoices)
      .where(
        and(
          eq(billingInvoices.ownerType, 'developer'),
          inArray(billingInvoices.ownerId, developerIds),
        ),
      );
    await db
      .delete(subscriptions)
      .where(
        and(eq(subscriptions.ownerType, 'developer'), inArray(subscriptions.ownerId, developerIds)),
      );
    for (const context of created.developerContexts) {
      await deleteDeveloperTestContext(context);
    }
  }
  if (userIds.length) {
    await db
      .delete(billingAuditEvents)
      .where(
        and(
          eq(billingAuditEvents.ownerType, 'agent'),
          inArray(billingAuditEvents.ownerId, userIds),
        ),
      );
    await db
      .delete(billingPaymentDocuments)
      .where(
        and(
          eq(billingPaymentDocuments.ownerType, 'agent'),
          inArray(billingPaymentDocuments.ownerId, userIds),
        ),
      );
    await db
      .delete(billingPayments)
      .where(
        and(eq(billingPayments.ownerType, 'agent'), inArray(billingPayments.ownerId, userIds)),
      );
    await db
      .delete(billingInvoices)
      .where(
        and(eq(billingInvoices.ownerType, 'agent'), inArray(billingInvoices.ownerId, userIds)),
      );
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.ownerType, 'agent'), inArray(subscriptions.ownerId, userIds)));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  if (agencyIds.length) await db.delete(agencies).where(inArray(agencies.id, agencyIds));

  created.userIds.length = 0;
  created.agencyIds.length = 0;
  created.developerContexts.length = 0;
}

describeWithDb('S4 paid Launch Access disposable runtime', () => {
  beforeAll(() => {
    rememberEnvironment('BILLING_PROOF_STORAGE_ADAPTER', 'local');
    rememberEnvironment(
      'BILLING_PRIVATE_STORAGE_DIR',
      `/tmp/property-listify-s4-launch-${process.pid}`,
    );
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

  it('provisions the three first-class launch products without assuming exclusive plan inventory', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const launchRows = await db
      .select({ name: plans.name, segment: plans.segment })
      .from(plans)
      .where(inArray(plans.name, launchPlanNames));
    expect(launchRows.map(row => row.name).sort()).toEqual([
      'agency_launch_access',
      'agent_launch_access',
      'developer_launch_access',
    ]);

    const catalog = await getCommercialCatalog();
    const launchProducts = selectLaunchProducts(catalog.products);
    expect(launchProducts.map(product => product.productKey)).toEqual([
      'agency_launch_access',
      'agent_launch_access',
      'developer_launch_access',
    ]);
    expect(
      Object.fromEntries(
        launchProducts.map(product => [product.productKey, product.pricing.basePrice?.amountMinor]),
      ),
    ).toEqual({
      agent_launch_access: 49900,
      agency_launch_access: 99900,
      developer_launch_access: 149900,
    });
    expect(launchProducts.every(product => product.term.kind === 'paid_launch_access')).toBe(true);
    expect(launchProducts.every(product => product.term.durationDays === 90)).toBe(true);
    expect(launchProducts.every(product => product.pricing.billingInterval === 'once')).toBe(true);
    expect(
      launchProducts.find(product => product.productKey === 'agent_launch_access')?.limits,
    ).toEqual({
      max_active_listings: 50,
    });
    expect(
      launchProducts.find(product => product.productKey === 'agency_launch_access')?.limits,
    ).toEqual({
      max_active_listings: 500,
    });
    expect(
      launchProducts.find(product => product.productKey === 'developer_launch_access')?.limits,
    ).toMatchObject({
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
    const developerUserId = await insertUser({
      label: 's4-developer-primary',
      role: 'property_developer',
    });
    const developerOrganisationId = await insertDeveloper(developerUserId, 's4-developer-primary');
    const otherDeveloperUserId = await insertUser({
      label: 's4-developer-other',
      role: 'property_developer',
    });
    await insertDeveloper(otherDeveloperUserId, 's4-developer-other');
    const financeId = await insertUser({ label: 's4-finance', role: 'super_admin' });

    const runOwner = async (input: {
      ownerType: 'agent' | 'agency' | 'developer';
      ownerId: number;
      userId: number;
      otherUserId: number;
      planKey: 'agent_launch_access' | 'agency_launch_access' | 'developer_launch_access';
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
        role:
          input.ownerType === 'agent'
            ? 'agent'
            : input.ownerType === 'agency'
              ? 'agency_admin'
              : 'property_developer',
        agencyId: input.ownerType === 'agency' ? input.ownerId : null,
      };
      const otherUser = {
        id: input.otherUserId,
        role:
          input.ownerType === 'agent'
            ? 'agent'
            : input.ownerType === 'agency'
              ? 'agency_admin'
              : 'property_developer',
        agencyId: input.ownerType === 'agency' ? otherAgencyId : null,
      };

      const requested = await requestPaidLaunchAccessInvoice({
        user: ownerUser,
        planId: plan.id,
      });
      expect(requested).toMatchObject({ ownerType: input.ownerType, ownerId: input.ownerId });
      expect(requested.invoice.amountDue).toBe(input.expectedAmount);
      expect(requested.invoice.commercialTermKind).toBe('paid_launch_access');
      expect(requested.invoice.metadata).toMatchObject({
        requested_billing_cycle: 'once_off',
        commercial_term_duration_days: 90,
        entitlement_starts_on_verified_activation: true,
      });

      const retried = await requestPaidLaunchAccessInvoice({
        user: ownerUser,
        planId: plan.id,
      });
      expect(retried).toMatchObject({
        ownerType: input.ownerType,
        ownerId: input.ownerId,
        reused: true,
      });
      expect(retried.invoice.id).toBe(requested.invoice.id);
      expect(await ownerInvoiceCount(input.ownerType, input.ownerId)).toBe(1);

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
      if (input.ownerType === 'developer') {
        const financeQueue = await getAdminFinanceQueue({ status: 'under_review' });
        const queuedDeveloperPayment = financeQueue.payments.find(
          (row: any) => Number(row.payment.id) === proof.paymentId,
        );
        expect(queuedDeveloperPayment?.developerOrganisation).toMatchObject({
          id: input.ownerId,
          name: expect.stringContaining('s4-developer-primary'),
        });
      }
      const secondProof = await submitPaidLaunchAccessPaymentProof({
        user: ownerUser,
        ...proofFor(requested.invoice),
      });
      expect(secondProof.paymentId).not.toBe(proof.paymentId);
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

      const periodEndAfterFirstApproval = active?.subscription?.currentPeriodEnd;
      const secondApproval = await reviewManualPayment({
        actorUser: { id: financeId, role: 'super_admin' },
        paymentId: secondProof.paymentId,
        decision: 'approve',
        verifiedAmount: input.expectedAmount,
      });
      expect(secondApproval).toMatchObject({
        success: true,
        idempotent: true,
        invoiceStatus: 'paid',
        subscriptionStatus: 'active',
        activationOccurred: false,
      });
      const afterSecondApproval = await loadSubscription(input.ownerType, input.ownerId);
      expect(afterSecondApproval?.currentPeriodEnd).toBe(periodEndAfterFirstApproval);

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
        .set({
          currentPeriodEnd: new Date(Date.now() - 1000)
            .toISOString()
            .slice(0, 19)
            .replace('T', ' '),
        })
        .where(
          and(
            eq(subscriptions.ownerType, input.ownerType),
            eq(subscriptions.ownerId, input.ownerId),
          ),
        );
      const expired = await getPlanAccessProjectionForUserId(input.userId);
      expect(expired?.subscription?.status).toBe('expired');
      expect(isSubscriptionEntitled(expired?.subscription?.status)).toBe(false);
      expect(await ownerInvoiceCount(input.ownerType, input.ownerId)).toBe(
        invoiceCountBeforeExpiry,
      );
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
        has_commission_tracking: false,
        has_revenue_dashboard: false,
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
    await runOwner({
      ownerType: 'developer',
      ownerId: developerOrganisationId,
      userId: developerUserId,
      otherUserId: otherDeveloperUserId,
      planKey: 'developer_launch_access',
      expectedAmount: 149900,
      expectedLimit: 0,
      expectedFlags: {
        unlimited_development_portfolio: true,
      },
    });
  }, 60_000);

  it('returns a rejected Launch Access proof to the issued state so the owner can resubmit', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const agentId = await insertUser({ label: 's4-agent-reject', role: 'agent' });
    const financeId = await insertUser({ label: 's4-finance-reject', role: 'super_admin' });

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.name, 'agent_launch_access'))
      .limit(1);
    if (!plan) throw new Error('Missing agent_launch_access');

    const requested = await requestPaidLaunchAccessInvoice({
      user: { id: agentId, role: 'agent', agencyId: null },
      planId: plan.id,
    });
    expect(requested.invoice.status).toBe('issued');

    const proof = await submitPaidLaunchAccessPaymentProof({
      user: { id: agentId, role: 'agent', agencyId: null },
      ...proofFor(requested.invoice),
    });
    const [invoiceAfterProof] = await db
      .select({ status: billingInvoices.status })
      .from(billingInvoices)
      .where(eq(billingInvoices.id, requested.invoice.id))
      .limit(1);
    expect(invoiceAfterProof?.status).toBe('submitted');

    const rejected = await reviewManualPayment({
      actorUser: { id: financeId, role: 'super_admin' },
      paymentId: proof.paymentId,
      decision: 'reject',
      note: 'Amount does not match the invoice.',
    });
    expect(rejected).toMatchObject({
      success: true,
      invoiceStatus: 'issued',
      subscriptionStatus: 'pending_payment',
    });

    const [invoiceAfterRejection] = await db
      .select({ status: billingInvoices.status })
      .from(billingInvoices)
      .where(eq(billingInvoices.id, requested.invoice.id))
      .limit(1);
    expect(invoiceAfterRejection?.status).toBe('issued');

    // The canonical issued state accepts a replacement proof and returns the
    // payable to its normal under-review flow.
    const resubmitted = await submitPaidLaunchAccessPaymentProof({
      user: { id: agentId, role: 'agent', agencyId: null },
      ...proofFor(requested.invoice),
    });
    expect(resubmitted.paymentId).not.toBe(proof.paymentId);

    const approved = await reviewManualPayment({
      actorUser: { id: financeId, role: 'super_admin' },
      paymentId: resubmitted.paymentId,
      decision: 'approve',
      verifiedAmount: requested.invoice.amountDue,
    });
    expect(approved).toMatchObject({
      success: true,
      invoiceStatus: 'paid',
      subscriptionStatus: 'active',
    });

    const active = await getPlanAccessProjectionForUserId(agentId);
    expect(active?.subscription?.status).toBe('active');
    expect(isSubscriptionEntitled(active?.subscription?.status)).toBe(true);
  }, 60_000);
});
