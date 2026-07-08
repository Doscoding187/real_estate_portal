import { afterEach, beforeAll, afterAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'crypto';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { appRouter } from '../routers';
import { getDb } from '../db-connection';
import {
  agencies,
  agencyBranding,
  agencySubscriptions,
  billingAuditEvents,
  billingInvoices,
  billingPaymentDocuments,
  billingPayments,
  notifications,
  plans,
  subscriptions,
  users,
} from '../../drizzle/schema';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe;

const createdState = {
  agencyIds: [] as number[],
  userIds: [] as number[],
  planIds: [] as number[],
};

const originalEnv: Record<string, string | undefined> = {};

function rememberEnv(key: string, value: string) {
  if (!(key in originalEnv)) originalEnv[key] = process.env[key];
  process.env[key] = value;
}

function restoreEnv() {
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function createCaller(user: { id: number; role: string; agencyId?: number | null }) {
  return appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user,
  } as any);
}

function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

async function seedBillingAgency(label: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

  const [planInsert] = await db.insert(plans).values({
    name: `acceptance-${label}-${suffix}`,
    displayName: `Acceptance ${label} Plan`,
    description: 'Billing foundation acceptance test plan',
    segment: 'agency',
    price: 99000,
    priceMonthly: 99000,
    currency: 'ZAR',
    interval: 'month',
    trialDays: 0,
    metadata: {
      annual_discount_percent: 10,
      early_access_price_monthly: 99000,
      tax_treatment: 'not_applicable_test',
    },
    features: JSON.stringify(['Listings', 'Publishing']),
    limits: JSON.stringify({ listings: 50 }),
    isActive: 1,
    isPopular: 0,
    sortOrder: 990,
  } as any);
  const planId = insertId(planInsert);
  createdState.planIds.push(planId);

  const [agencyInsert] = await db.insert(agencies).values({
    name: `Acceptance Agency ${label} ${suffix}`,
    slug: `acceptance-agency-${label}-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
    email: `acceptance-agency-${label}-${suffix}@example.com`,
    city: 'Johannesburg',
    province: 'Gauteng',
    subscriptionPlan: 'free',
    subscriptionStatus: 'trial',
    isVerified: 1,
  } as any);
  const agencyId = insertId(agencyInsert);
  createdState.agencyIds.push(agencyId);

  await db.insert(agencyBranding).values({
    agencyId,
    companyName: `Acceptance Agency ${label}`,
    primaryColor: '#0f766e',
    secondaryColor: '#334155',
    isEnabled: 1,
  } as any);

  const [agencyUserInsert] = await db.insert(users).values({
    email: `billing-agency-${label}-${suffix}@example.com`,
    role: 'agency_admin',
    agencyId,
    firstName: 'Billing',
    lastName: 'Agency',
    name: 'Billing Agency',
    emailVerified: 1,
  } as any);
  const agencyUserId = insertId(agencyUserInsert);
  createdState.userIds.push(agencyUserId);

  const [outsideAgencyInsert] = await db.insert(agencies).values({
    name: `Outside Agency ${label} ${suffix}`,
    slug: `outside-agency-${label}-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
    email: `outside-agency-${label}-${suffix}@example.com`,
    city: 'Cape Town',
    province: 'Western Cape',
    subscriptionPlan: 'free',
    subscriptionStatus: 'trial',
    isVerified: 1,
  } as any);
  const outsideAgencyId = insertId(outsideAgencyInsert);
  createdState.agencyIds.push(outsideAgencyId);

  const [outsideUserInsert] = await db.insert(users).values({
    email: `billing-outside-${label}-${suffix}@example.com`,
    role: 'agency_admin',
    agencyId: outsideAgencyId,
    firstName: 'Outside',
    lastName: 'Agency',
    name: 'Outside Agency',
    emailVerified: 1,
  } as any);
  const outsideUserId = insertId(outsideUserInsert);
  createdState.userIds.push(outsideUserId);

  const [adminInsert] = await db.insert(users).values({
    email: `billing-admin-${label}-${suffix}@example.com`,
    role: 'super_admin',
    firstName: 'Finance',
    lastName: 'Admin',
    name: 'Finance Admin',
    emailVerified: 1,
  } as any);
  const adminUserId = insertId(adminInsert);
  createdState.userIds.push(adminUserId);

  return { planId, agencyId, agencyUserId, outsideAgencyId, outsideUserId, adminUserId };
}

async function countApprovalAuditEvents(paymentId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(billingAuditEvents)
    .where(
      and(
        eq(billingAuditEvents.paymentId, paymentId),
        eq(billingAuditEvents.eventType, 'payment_approved_subscription_activated'),
      ),
    );
  return Number(row?.count || 0);
}

async function loadBillingRows(agencyId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)))
    .limit(1);
  const invoiceRows = await db
    .select()
    .from(billingInvoices)
    .where(and(eq(billingInvoices.ownerType, 'agency'), eq(billingInvoices.ownerId, agencyId)));
  const paymentRows = await db
    .select()
    .from(billingPayments)
    .where(and(eq(billingPayments.ownerType, 'agency'), eq(billingPayments.ownerId, agencyId)));
  return { subscription, invoiceRows, paymentRows };
}

describeWithDb('billing foundation persisted acceptance', () => {
  beforeAll(() => {
    rememberEnv('BILLING_PROOF_STORAGE_ADAPTER', 'local');
    rememberEnv('BILLING_PRIVATE_STORAGE_DIR', `/tmp/property-listify-billing-proofs-${process.pid}`);
    rememberEnv('BILLING_EFT_ACCOUNT_NAME', 'LOCAL TEST EFT ACCOUNT - NOT PAYABLE');
    rememberEnv('BILLING_EFT_BANK_NAME', 'Local Test Bank');
    rememberEnv('BILLING_EFT_BRANCH_CODE', '000000');
    rememberEnv('BILLING_EFT_ACCOUNT_NUMBER', '0000000000');
    rememberEnv('BILLING_EFT_ACCOUNT_TYPE', 'Local test account');
    rememberEnv('BILLING_SUPPORT_EMAIL', 'billing-test@propertylistify.local');
  });

  afterAll(() => {
    restoreEnv();
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const agencyIds = uniqueNumbers(createdState.agencyIds);
    const userIds = uniqueNumbers(createdState.userIds);
    const planIds = uniqueNumbers(createdState.planIds);

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
      await db.delete(agencySubscriptions).where(inArray(agencySubscriptions.agencyId, agencyIds));
      await db.delete(agencyBranding).where(inArray(agencyBranding.agencyId, agencyIds));
    }

    if (userIds.length) {
      await db.delete(notifications).where(inArray(notifications.userId, userIds));
      await db.delete(users).where(inArray(users.id, userIds));
    }

    if (agencyIds.length) {
      await db.delete(agencies).where(inArray(agencies.id, agencyIds));
    }

    if (planIds.length) {
      await db.delete(plans).where(inArray(plans.id, planIds));
    }

    createdState.agencyIds = [];
    createdState.userIds = [];
    createdState.planIds = [];
  });

  it(
    'persists the agency EFT flow, protects proof documents, activates entitlements, and keeps duplicate approval idempotent',
    async () => {
      const seed = await seedBillingAgency('primary');
      const agencyCaller = createCaller({
        id: seed.agencyUserId,
        role: 'agency_admin',
        agencyId: seed.agencyId,
      });
      const outsideCaller = createCaller({
        id: seed.outsideUserId,
        role: 'agency_admin',
        agencyId: seed.outsideAgencyId,
      });
      const adminCaller = createCaller({ id: seed.adminUserId, role: 'super_admin' });

      const checkout = await agencyCaller.billing.startManualEftCheckout({
        planId: seed.planId,
        billingCycle: 'monthly',
      });

      expect(checkout.invoice.invoiceNumber).toMatch(/^PLI-/);
      expect(checkout.invoice.paymentReference).toMatch(/^PLAG/);
      expect(checkout.bankDetails.configured).toBe(true);
      expect(checkout.invoice.metadata.price_snapshot).toMatchObject({
        planId: seed.planId,
        billingCycle: 'monthly',
        currency: 'ZAR',
        baseAmount: 99000,
        totalDue: 99000,
      });

      const proofBuffer = Buffer.from('billing acceptance proof');
      const proof = await agencyCaller.billing.submitPaymentProof({
        invoiceId: checkout.invoice.id,
        amount: checkout.invoice.amountDue,
        bankReference: checkout.invoice.paymentReference,
        payerName: 'Acceptance Agency',
        paymentDate: new Date().toISOString().slice(0, 10),
        file: {
          filename: 'acceptance-proof.pdf',
          mimeType: 'application/pdf',
          sizeBytes: proofBuffer.length,
          contentBase64: proofBuffer.toString('base64'),
        },
      });

      const pendingAccess = await agencyCaller.agency.getAccessState();
      expect(pendingAccess.billingStatus).toBe('payment_under_review');
      expect(pendingAccess.workspaceAccess.publishing).toBe(false);

      const agencyDocument = await agencyCaller.billing.getProofDocument({
        documentId: proof.documentId,
      });
      expect(Buffer.from(agencyDocument.contentBase64, 'base64').toString()).toBe(
        'billing acceptance proof',
      );

      await expect(
        outsideCaller.billing.getProofDocument({ documentId: proof.documentId }),
      ).rejects.toThrow(/private|forbidden/i);

      await expect(
        agencyCaller.billing.admin.reviewManualPayment({
          paymentId: proof.paymentId,
          decision: 'approve',
        }),
      ).rejects.toThrow(/super admin|finance|privileges|forbidden/i);

      const queue = await adminCaller.billing.admin.financeQueue({ status: 'under_review' });
      expect(queue.payments.some((row: any) => Number(row.payment.id) === proof.paymentId)).toBe(true);

      const adminDocument = await adminCaller.billing.admin.proofDocument({
        documentId: proof.documentId,
      });
      expect(adminDocument.sha256Hash).toBeUndefined();
      expect(Buffer.from(adminDocument.contentBase64, 'base64').toString()).toBe(
        'billing acceptance proof',
      );

      const approved = await adminCaller.billing.admin.reviewManualPayment({
        paymentId: proof.paymentId,
        decision: 'approve',
        verifiedAmount: checkout.invoice.amountDue,
        note: 'Acceptance full payment verified.',
      });
      expect(approved).toMatchObject({
        success: true,
        idempotent: false,
        invoiceStatus: 'paid',
        subscriptionStatus: 'active',
      });

      const activeAccess = await agencyCaller.agency.getAccessState();
      expect(activeAccess.billingStatus).toBe('active');
      expect(activeAccess.planAccessSource).toBe('subscriptions');
      expect(activeAccess.workspaceAccess.publishing).toBe(true);

      const activeRows = await loadBillingRows(seed.agencyId);
      expect(activeRows.subscription.status).toBe('active');
      expect(activeRows.invoiceRows.find(row => row.id === checkout.invoice.id)?.status).toBe('paid');
      expect(activeRows.paymentRows.find(row => row.id === proof.paymentId)?.state).toBe('verified');

      await (await getDb())!.insert(agencySubscriptions).values({
        agencyId: seed.agencyId,
        planId: seed.planId,
        stripeCustomerId: `legacy-customer-${randomUUID()}`,
        status: 'unpaid',
        cancelAtPeriodEnd: 0,
      } as any);
      const accessWithLegacyConflict = await agencyCaller.agency.getAccessState();
      expect(accessWithLegacyConflict.billingStatus).toBe('active');
      expect(accessWithLegacyConflict.planAccessSource).toBe('subscriptions');

      const periodEndBeforeDuplicate = activeRows.subscription.currentPeriodEnd;
      const auditCountBeforeDuplicate = await countApprovalAuditEvents(proof.paymentId);
      const duplicateApproval = await adminCaller.billing.admin.reviewManualPayment({
        paymentId: proof.paymentId,
        decision: 'approve',
      });
      expect(duplicateApproval.idempotent).toBe(true);
      expect(await countApprovalAuditEvents(proof.paymentId)).toBe(auditCountBeforeDuplicate);

      const rowsAfterDuplicate = await loadBillingRows(seed.agencyId);
      expect(rowsAfterDuplicate.subscription.currentPeriodEnd).toBe(periodEndBeforeDuplicate);

      const renewal = await agencyCaller.billing.startManualEftCheckout({
        planId: seed.planId,
        billingCycle: 'monthly',
      });
      expect(renewal.invoice.metadata.period_policy).toBe('active_early_renewal');
      expect(renewal.invoice.periodStart).toBe(periodEndBeforeDuplicate);

      const renewalBuffer = Buffer.from('billing renewal proof');
      const renewalProof = await agencyCaller.billing.submitPaymentProof({
        invoiceId: renewal.invoice.id,
        amount: renewal.invoice.amountDue,
        bankReference: renewal.invoice.paymentReference,
        file: {
          filename: 'renewal-proof.pdf',
          mimeType: 'application/pdf',
          sizeBytes: renewalBuffer.length,
          contentBase64: renewalBuffer.toString('base64'),
        },
      });
      await adminCaller.billing.admin.reviewManualPayment({
        paymentId: renewalProof.paymentId,
        decision: 'approve',
        verifiedAmount: renewal.invoice.amountDue,
      });

      const renewedRows = await loadBillingRows(seed.agencyId);
      expect(renewedRows.subscription.currentPeriodStart).toBe(periodEndBeforeDuplicate);
      expect(new Date(renewedRows.subscription.currentPeriodEnd!).getTime()).toBeGreaterThan(
        new Date(periodEndBeforeDuplicate!).getTime(),
      );
    },
    45_000,
  );

  it('keeps rejection/correction and partial-payment paths non-activating until full verified payment', async () => {
    const seed = await seedBillingAgency('correction');
    const agencyCaller = createCaller({
      id: seed.agencyUserId,
      role: 'agency_admin',
      agencyId: seed.agencyId,
    });
    const adminCaller = createCaller({ id: seed.adminUserId, role: 'super_admin' });

    const checkout = await agencyCaller.billing.startManualEftCheckout({
      planId: seed.planId,
      billingCycle: 'monthly',
    });
    const badProofBuffer = Buffer.from('incorrect proof');
    const badProof = await agencyCaller.billing.submitPaymentProof({
      invoiceId: checkout.invoice.id,
      amount: checkout.invoice.amountDue,
      bankReference: 'WRONG-REFERENCE',
      file: {
        filename: 'wrong-proof.pdf',
        mimeType: 'application/pdf',
        sizeBytes: badProofBuffer.length,
        contentBase64: badProofBuffer.toString('base64'),
      },
    });

    await adminCaller.billing.admin.reviewManualPayment({
      paymentId: badProof.paymentId,
      decision: 'request_correction',
      note: 'Reference does not match invoice.',
    });

    const correctionAccess = await agencyCaller.agency.getAccessState();
    expect(correctionAccess.billingStatus).toBe('pending_payment');
    expect(correctionAccess.workspaceAccess.publishing).toBe(false);

    const partialBuffer = Buffer.from('partial proof');
    const partialProof = await agencyCaller.billing.submitPaymentProof({
      invoiceId: checkout.invoice.id,
      amount: Math.floor(checkout.invoice.amountDue / 2),
      bankReference: checkout.invoice.paymentReference,
      file: {
        filename: 'partial-proof.pdf',
        mimeType: 'application/pdf',
        sizeBytes: partialBuffer.length,
        contentBase64: partialBuffer.toString('base64'),
      },
    });

    const partial = await adminCaller.billing.admin.reviewManualPayment({
      paymentId: partialProof.paymentId,
      decision: 'approve',
      verifiedAmount: Math.floor(checkout.invoice.amountDue / 2),
      note: 'Partial received.',
    });
    expect(partial.invoiceStatus).toBe('partially_paid');
    expect(partial.subscriptionStatus).toBe('payment_under_review');

    const partialAccess = await agencyCaller.agency.getAccessState();
    expect(partialAccess.billingStatus).toBe('payment_under_review');
    expect(partialAccess.workspaceAccess.publishing).toBe(false);

    const balanceBuffer = Buffer.from('balance proof');
    const balanceProof = await agencyCaller.billing.submitPaymentProof({
      invoiceId: checkout.invoice.id,
      amount: Math.ceil(checkout.invoice.amountDue / 2),
      bankReference: checkout.invoice.paymentReference,
      file: {
        filename: 'balance-proof.pdf',
        mimeType: 'application/pdf',
        sizeBytes: balanceBuffer.length,
        contentBase64: balanceBuffer.toString('base64'),
      },
    });
    const finalApproval = await adminCaller.billing.admin.reviewManualPayment({
      paymentId: balanceProof.paymentId,
      decision: 'approve',
      verifiedAmount: Math.ceil(checkout.invoice.amountDue / 2),
    });
    expect(finalApproval.invoiceStatus).toBe('paid');
    expect(finalApproval.subscriptionStatus).toBe('active');

    const finalAccess = await agencyCaller.agency.getAccessState();
    expect(finalAccess.workspaceAccess.publishing).toBe(true);
  }, 45_000);
});
