import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { COOKIE_NAME } from '../../shared/const';
import { billingRouter } from '../billingRouter';
import { router } from '../_core/trpc';
import {
  agencies,
  billingAuditEvents,
  billingInvoices,
  billingPaymentDocuments,
  billingPayments,
  billableAccounts,
  notifications,
  plans,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { createContext } from '../_core/context';
import { authService } from '../_core/auth';
import { getDb } from '../db-connection';
import { getCommercialCatalog } from '../services/commercialCatalogService';
import {
  initializeCommercialActivationPolicy,
  isCommercialActivationAvailable,
} from '../services/commercialActivationPolicy';
import { parseCanonicalCommercialTimestamp } from '../services/commercialTerm';
import { getBillingProofStorageStatus } from '../services/billingProofStorage';
import { DeveloperSubscriptionService } from '../services/developerSubscriptionService';
import {
  getPlanAccessProjectionForUserId,
  isSubscriptionEntitled,
} from '../services/planAccessService';
import {
  getAdminFinanceQueue,
  requestPaidLaunchAccessInvoice,
  requestAgencyCancellationAtPeriodEnd,
  restoreAgencySubscription,
  reviewManualPayment,
  startAgencyManualCheckout,
  submitAgencyPaymentProof,
  submitPaidLaunchAccessPaymentProof,
  updateSubscriptionLifecycle,
} from '../services/billingFoundationService';
import {
  createDeveloperTestContext,
  deleteDeveloperTestContext,
  type DeveloperTestContext,
} from '../test-utils/developerTestContext';

const proofStorageObjects = vi.hoisted(() => new Map<string, Uint8Array>());
const b03BillingRouter = router({ billing: billingRouter });

vi.mock('@aws-sdk/client-s3', () => {
  type ObjectCommandInput = {
    Bucket: string;
    Key: string;
    Body?: Uint8Array;
  };

  class PutObjectCommand {
    constructor(readonly input: ObjectCommandInput) {}
  }

  class GetObjectCommand {
    constructor(readonly input: ObjectCommandInput) {}
  }

  class S3Client {
    constructor(_configuration: unknown) {}

    async send(command: PutObjectCommand | GetObjectCommand) {
      const key = `${command.input.Bucket}/${command.input.Key}`;
      if (command instanceof PutObjectCommand) {
        if (!command.input.Body) throw new Error('Test S3 upload did not include a body.');
        proofStorageObjects.set(key, Uint8Array.from(command.input.Body));
        return {};
      }

      const body = proofStorageObjects.get(key);
      return { Body: body ? Buffer.from(body) : undefined };
    }
  }

  return { GetObjectCommand, PutObjectCommand, S3Client };
});

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe);

const created = {
  userIds: [] as number[],
  agencyIds: [] as number[],
  planIds: [] as number[],
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
  refreshFixtureAdmission();
  return userId;
}

async function createSessionCookie(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      sessionVersion: users.sessionVersion,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user?.email) throw new Error(`Missing session user ${userId}.`);
  const token = await authService.createSessionToken(
    Number(user.id),
    user.email,
    user.name || user.email,
    Number(user.sessionVersion),
  );
  return `${COOKIE_NAME}=${token}`;
}

async function createCallerFromSession(cookie: string) {
  const context = await createContext({
    req: { headers: { cookie }, requestId: `b03-session-${randomUUID()}` } as any,
    res: {} as any,
  } as any);
  return b03BillingRouter.createCaller(context as any);
}

function createCallerForFixtureUser(user: { id: number; role: string; agencyId?: number | null }) {
  return b03BillingRouter.createCaller({
    req: { headers: {}, ip: '127.0.0.1' },
    res: {},
    user,
    requestId: `b03-api-${randomUUID()}`,
  } as any);
}

async function invalidateUserSessionAndDemote(userId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  await db
    .update(users)
    .set({ role: 'visitor', sessionVersion: sql`${users.sessionVersion} + 1` })
    .where(eq(users.id, userId));
}

async function insertDeveloper(userId: number, label: string) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const context = await createDeveloperTestContext({
    userId,
    name: `${label} Developer ${suffix}`,
    email: `${label}-${suffix}@example.test`,
  });
  created.developerContexts.push(context);
  refreshFixtureAdmission();
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
  refreshFixtureAdmission();
  return agencyId;
}

async function insertUnsupportedPlan(input: {
  label: string;
  segment: 'agent' | 'agency' | 'developer';
  name?: string;
  isActive?: number;
  metadata: Record<string, unknown>;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const values: typeof plans.$inferInsert = {
    name: input.name || `b03-${input.label}-${input.segment}-${suffix}`,
    displayName: `B03 ${input.label} ${input.segment}`,
    description: 'B03 product containment test fixture',
    segment: input.segment,
    price: 99900,
    priceMonthly: 99900,
    currency: 'ZAR',
    interval: 'month',
    trialDays: 0,
    metadata: input.metadata,
    features: JSON.stringify([]),
    limits: JSON.stringify({}),
    isActive: input.isActive ?? 1,
    isPopular: 0,
    sortOrder: 990,
  };
  const [result] = await db.insert(plans).values(values);
  const planId = insertId(result);
  if (!planId) throw new Error(`Could not create ${input.label} test plan.`);
  created.planIds.push(planId);
  const [plan] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
  if (!plan) throw new Error(`Could not read ${input.label} test plan.`);
  return plan;
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

async function loadContainmentSnapshot(input: {
  ownerType: 'agent' | 'agency' | 'developer';
  ownerId: number;
  userId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(
      and(eq(subscriptions.ownerType, input.ownerType), eq(subscriptions.ownerId, input.ownerId)),
    )
    .limit(1);
  const ownerColumn =
    input.ownerType === 'agent'
      ? eq(billableAccounts.userId, input.ownerId)
      : input.ownerType === 'agency'
        ? eq(billableAccounts.agencyId, input.ownerId)
        : eq(billableAccounts.developerOrganisationId, input.ownerId);
  const [billableAccount] = await db
    .select()
    .from(billableAccounts)
    .where(and(eq(billableAccounts.accountKind, input.ownerType), ownerColumn))
    .limit(1);
  const [agencyShadow] =
    input.ownerType === 'agency'
      ? await db.select().from(agencies).where(eq(agencies.id, input.ownerId)).limit(1)
      : [];
  const invoices = await db
    .select()
    .from(billingInvoices)
    .where(
      and(
        eq(billingInvoices.ownerType, input.ownerType),
        eq(billingInvoices.ownerId, input.ownerId),
      ),
    );
  const payments = await db
    .select()
    .from(billingPayments)
    .where(
      and(
        eq(billingPayments.ownerType, input.ownerType),
        eq(billingPayments.ownerId, input.ownerId),
      ),
    );
  const documents = await db
    .select()
    .from(billingPaymentDocuments)
    .where(
      and(
        eq(billingPaymentDocuments.ownerType, input.ownerType),
        eq(billingPaymentDocuments.ownerId, input.ownerId),
      ),
    );
  const auditEvents = await db
    .select()
    .from(billingAuditEvents)
    .where(
      and(
        eq(billingAuditEvents.ownerType, input.ownerType),
        eq(billingAuditEvents.ownerId, input.ownerId),
      ),
    );
  const ownerNotifications = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, input.userId));
  const proofStorageFiles = Array.from(proofStorageObjects.keys()).sort();
  const byId = <T extends { id: number }>(rows: T[]) =>
    rows.sort((left, right) => left.id - right.id);
  return {
    billableAccount: billableAccount || null,
    subscription: subscription || null,
    agencyShadow: agencyShadow || null,
    invoices: byId(invoices),
    payments: byId(payments),
    documents: byId(documents),
    auditEvents: byId(auditEvents),
    notifications: byId(ownerNotifications),
    proofStorageFiles,
  };
}

async function withPaidMvpProductionRelease<T>(run: () => Promise<T>): Promise<T> {
  const keys = [
    'NODE_ENV',
    'APP_ENV',
    'PAID_MVP_ENABLED_PRODUCT_KEYS',
    'PAID_MVP_RELEASE_ID',
    'PAID_MVP_APPROVAL_REF',
    'PAID_MVP_SALES_PAUSED',
    'PAID_MVP_SALES_OPEN_UNTIL',
    'PAID_MVP_ADMITTED_OWNERS',
  ];
  const previous = new Map(keys.map(key => [key, process.env[key]]));
  try {
    setPaidMvpProductionRelease();
    return await run();
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    initializeCommercialActivationPolicy();
  }
}

function fixtureOwnerAdmission() {
  return [
    ...created.userIds.map(id => `agent:${id}`),
    ...created.agencyIds.map(id => `agency:${id}`),
    ...created.developerContexts.map(context => `developer:${context.organisationId}`),
  ].join(',');
}

function refreshFixtureAdmission() {
  if (process.env.NODE_ENV !== 'production') return;
  process.env.PAID_MVP_ADMITTED_OWNERS = fixtureOwnerAdmission();
  initializeCommercialActivationPolicy();
}

function setPaidMvpProductionRelease(salesPaused = false) {
  process.env.NODE_ENV = 'production';
  process.env.APP_ENV = 'production';
  process.env.PAID_MVP_ENABLED_PRODUCT_KEYS =
    'agent_launch_access,agency_launch_access,developer_launch_access';
  process.env.PAID_MVP_RELEASE_ID = 'b03-containment-rc-1';
  process.env.PAID_MVP_APPROVAL_REF = 'b03-review-1';
  const admission = fixtureOwnerAdmission();
  if (admission) process.env.PAID_MVP_ADMITTED_OWNERS = admission;
  else delete process.env.PAID_MVP_ADMITTED_OWNERS;
  process.env.PAID_MVP_SALES_PAUSED = String(salesPaused);
  process.env.PAID_MVP_SALES_OPEN_UNTIL = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const configuration = initializeCommercialActivationPolicy();
  if (configuration.mode !== 'paid_mvp_release') {
    throw new Error('B03 scenario did not resolve to a paid production release.');
  }
  return configuration;
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
  if (created.planIds.length) {
    await db.delete(plans).where(inArray(plans.id, Array.from(new Set(created.planIds))));
  }

  created.userIds.length = 0;
  created.agencyIds.length = 0;
  created.planIds.length = 0;
  created.developerContexts.length = 0;
}

describeWithDb('S4 paid Launch Access disposable runtime', () => {
  beforeAll(() => {
    rememberEnvironment('NODE_ENV', 'production');
    rememberEnvironment('APP_ENV', 'production');
    rememberEnvironment(
      'PAID_MVP_ENABLED_PRODUCT_KEYS',
      'agent_launch_access,agency_launch_access,developer_launch_access',
    );
    rememberEnvironment('PAID_MVP_RELEASE_ID', 'b03-containment-rc-1');
    rememberEnvironment('PAID_MVP_APPROVAL_REF', 'b03-review-1');
    rememberEnvironment('PAID_MVP_SALES_PAUSED', 'false');
    originalEnvironment.PAID_MVP_ADMITTED_OWNERS = process.env.PAID_MVP_ADMITTED_OWNERS;
    rememberEnvironment(
      'PAID_MVP_SALES_OPEN_UNTIL',
      new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    );
    rememberEnvironment('BILLING_PROOF_STORAGE_ADAPTER', 's3');
    rememberEnvironment('BILLING_PROOF_S3_BUCKET', `b03-proof-test-${process.pid}`);
    rememberEnvironment('BILLING_PROOF_S3_REGION', 'us-east-1');
    rememberEnvironment('BILLING_PROOF_AWS_ACCESS_KEY_ID', `b03-test-access-${process.pid}`);
    rememberEnvironment('BILLING_PROOF_AWS_SECRET_ACCESS_KEY', `b03-test-secret-${process.pid}`);
    rememberEnvironment('BILLING_EFT_ACCOUNT_NAME', 'LOCAL TEST EFT ACCOUNT - NOT PAYABLE');
    rememberEnvironment('BILLING_EFT_BANK_NAME', 'Local Test Bank');
    rememberEnvironment('BILLING_EFT_BRANCH_CODE', '000000');
    rememberEnvironment('BILLING_EFT_ACCOUNT_NUMBER', '0000000000');
    rememberEnvironment('BILLING_EFT_ACCOUNT_TYPE', 'Local test account');
    rememberEnvironment('BILLING_SUPPORT_EMAIL', 'billing-test@propertylistify.local');
    proofStorageObjects.clear();
  });

  beforeEach(() => {
    const configuration = setPaidMvpProductionRelease();
    expect(configuration).toMatchObject({
      mode: 'paid_mvp_release',
      enabledProductKeys: [
        'agent_launch_access',
        'agency_launch_access',
        'developer_launch_access',
      ],
      salesPaused: false,
    });
    expect(getBillingProofStorageStatus()).toMatchObject({
      adapter: 's3',
      configured: true,
      productionSafe: true,
    });
    proofStorageObjects.clear();
  });

  afterAll(async () => {
    await cleanup();
    proofStorageObjects.clear();
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

  it('rejects unsupported persisted product and owner pairs before commercial writes in production', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const financeId = await insertUser({ label: 'b03-containment-finance', role: 'super_admin' });
    const agentId = await insertUser({ label: 'b03-containment-agent', role: 'agent' });
    const agencyId = await insertAgency('b03-containment');
    const agencyUserId = await insertUser({
      label: 'b03-containment-agency-owner',
      role: 'agency_admin',
      agencyId,
    });
    const developerUserId = await insertUser({
      label: 'b03-containment-developer-owner',
      role: 'property_developer',
    });
    const developerId = await insertDeveloper(developerUserId, 'b03-containment');
    const planRows = await db.select().from(plans).where(inArray(plans.name, launchPlanNames));
    const productPlans = new Map(
      launchPlanNames.map(productKey => [
        productKey,
        planRows.find(plan => plan.name === productKey),
      ]),
    );
    expect(Array.from(productPlans.values()).every(Boolean)).toBe(true);

    const owners: Array<{
      ownerType: 'agent' | 'agency' | 'developer';
      ownerId: number;
      userId: number;
      user: { id: number; role: string; agencyId?: number | null };
      productKey: (typeof launchPlanNames)[number];
    }> = [
      {
        ownerType: 'agent',
        ownerId: agentId,
        userId: agentId,
        user: { id: agentId, role: 'agent' },
        productKey: 'agent_launch_access',
      },
      {
        ownerType: 'agency',
        ownerId: agencyId,
        userId: agencyUserId,
        user: { id: agencyUserId, role: 'agency_admin', agencyId },
        productKey: 'agency_launch_access',
      },
      {
        ownerType: 'developer',
        ownerId: developerId,
        userId: developerUserId,
        user: { id: developerUserId, role: 'property_developer' },
        productKey: 'developer_launch_access',
      },
    ];
    const persistedCases: Array<{
      owner: (typeof owners)[number];
      invoiceId: number;
      paymentId: number;
      subscriptionId: number;
      amountDue: number;
    }> = [];

    for (const owner of owners) {
      const productPlan = productPlans.get(owner.productKey);
      if (!productPlan) throw new Error(`Missing canonical ${owner.productKey} plan.`);
      const requested = await requestPaidLaunchAccessInvoice({
        user: owner.user,
        planId: productPlan.id,
      });
      const proof = await submitPaidLaunchAccessPaymentProof({
        user: owner.user,
        ...proofFor(requested.invoice),
      });
      const subscription = await loadSubscription(owner.ownerType, owner.ownerId);
      if (!subscription) throw new Error(`Missing ${owner.ownerType} billing subscription.`);
      persistedCases.push({
        owner,
        invoiceId: requested.invoice.id,
        paymentId: proof.paymentId,
        subscriptionId: subscription.id,
        amountDue: requested.invoice.amountDue,
      });
      await db
        .update(subscriptions)
        .set({
          status: 'active',
          currentPeriodStart: '2026-01-01 00:00:00',
          currentPeriodEnd: '2020-01-01 00:00:00',
          graceEndsAt: null,
        })
        .where(eq(subscriptions.id, subscription.id));
    }

    const canonicalAgencyMetadata = {
      commercial_product_key: 'agency_launch_access',
      commercial_term_kind: 'paid_launch_access',
      commercial_term_duration_days: 90,
      commercial_requires_verified_payment: true,
      commercial_auto_renews: false,
    };
    const unsupportedAgencyPlans = [
      await insertUnsupportedPlan({
        label: 'missing-product',
        segment: 'agency',
        name: 'agency_launch_access',
        metadata: {
          commercial_term_kind: 'paid_launch_access',
          commercial_term_duration_days: 90,
          commercial_requires_verified_payment: true,
          commercial_auto_renews: false,
        },
      }),
      await insertUnsupportedPlan({
        label: 'unknown-product',
        segment: 'agency',
        name: 'agency_launch_access',
        metadata: {
          commercial_product_key: 'b03_unapproved_product',
          commercial_term_kind: 'paid_launch_access',
          commercial_term_duration_days: 90,
          commercial_requires_verified_payment: true,
          commercial_auto_renews: false,
        },
      }),
      await insertUnsupportedPlan({
        label: 'recurring-product',
        segment: 'agency',
        metadata: {
          commercial_term_kind: 'recurring_subscription',
          commercial_requires_verified_payment: true,
          commercial_auto_renews: true,
        },
      }),
      await insertUnsupportedPlan({
        label: 'forged-invalid-product-key',
        segment: 'agency',
        name: 'agency_launch_access',
        metadata: {
          ...canonicalAgencyMetadata,
          commercial_product_key: 'FORGED INVALID',
        },
      }),
      await insertUnsupportedPlan({
        label: 'invalid-verified-payment-flag',
        segment: 'agency',
        name: 'agency_launch_access',
        metadata: {
          ...canonicalAgencyMetadata,
          commercial_requires_verified_payment: 'invalid',
        },
      }),
      await insertUnsupportedPlan({
        label: 'invalid-auto-renew-flag',
        segment: 'agency',
        name: 'agency_launch_access',
        metadata: {
          ...canonicalAgencyMetadata,
          commercial_auto_renews: 'invalid',
        },
      }),
      await insertUnsupportedPlan({
        label: 'invalid-term-duration',
        segment: 'agency',
        name: 'agency_launch_access',
        metadata: {
          ...canonicalAgencyMetadata,
          commercial_term_duration_days: '90',
        },
      }),
      await insertUnsupportedPlan({
        label: 'inactive-product',
        segment: 'agency',
        name: 'agency_launch_access',
        isActive: 0,
        metadata: canonicalAgencyMetadata,
      }),
      await insertUnsupportedPlan({
        label: 'wrong-segment-product',
        segment: 'agent',
        name: 'agency_launch_access',
        metadata: canonicalAgencyMetadata,
      }),
    ];

    await withPaidMvpProductionRelease(async () => {
      for (const persistedCase of persistedCases) {
        const { owner } = persistedCase;
        const matchingPlan = productPlans.get(owner.productKey);
        if (!matchingPlan) throw new Error(`Missing canonical ${owner.productKey} plan.`);
        const mismatchedPlans = Array.from(productPlans.entries())
          .filter(([productKey]) => productKey !== owner.productKey)
          .map(([, plan]) => plan);

        for (const mismatchedPlan of mismatchedPlans) {
          if (!mismatchedPlan) throw new Error('Missing mismatch fixture plan.');
          const beforeCheckout = await loadContainmentSnapshot(owner);
          await expect(
            requestPaidLaunchAccessInvoice({
              user: owner.user,
              planId: mismatchedPlan.id,
            }),
          ).rejects.toMatchObject({ code: 'NOT_FOUND' });
          expect(await loadContainmentSnapshot(owner)).toEqual(beforeCheckout);

          await db
            .update(billingInvoices)
            .set({ planId: mismatchedPlan.id })
            .where(eq(billingInvoices.id, persistedCase.invoiceId));
          const beforeProof = await loadContainmentSnapshot(owner);
          await expect(
            submitPaidLaunchAccessPaymentProof({
              user: owner.user,
              ...proofFor({ id: persistedCase.invoiceId, amountDue: persistedCase.amountDue }),
            }),
          ).rejects.toMatchObject({ code: 'CONFLICT' });
          expect(await loadContainmentSnapshot(owner)).toEqual(beforeProof);

          const beforeReview = await loadContainmentSnapshot(owner);
          await expect(
            reviewManualPayment({
              actorUser: { id: financeId, role: 'super_admin' },
              paymentId: persistedCase.paymentId,
              decision: 'approve',
              verifiedAmount: persistedCase.amountDue,
            }),
          ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
          expect(await loadContainmentSnapshot(owner)).toEqual(beforeReview);

          await db
            .update(billingInvoices)
            .set({ planId: matchingPlan.id })
            .where(eq(billingInvoices.id, persistedCase.invoiceId));
          await db
            .update(subscriptions)
            .set({ planId: mismatchedPlan.id })
            .where(eq(subscriptions.id, persistedCase.subscriptionId));
          const beforeLifecycle = await loadContainmentSnapshot(owner);
          await expect(
            updateSubscriptionLifecycle({
              actorUser: { id: financeId, role: 'super_admin' },
              subscriptionId: persistedCase.subscriptionId,
              status: 'expired',
              periodEnd: '2021-01-01 00:00:00',
              graceEndsAt: '2021-01-02 00:00:00',
              note: 'B03 mismatched product negative case',
            }),
          ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
          expect(await loadContainmentSnapshot(owner)).toEqual(beforeLifecycle);
          await db
            .update(subscriptions)
            .set({ planId: matchingPlan.id })
            .where(eq(subscriptions.id, persistedCase.subscriptionId));
        }
      }

      const agencyCase = persistedCases.find(testCase => testCase.owner.ownerType === 'agency');
      const agencyOwner = owners.find(owner => owner.ownerType === 'agency');
      const agentPlan = productPlans.get('agent_launch_access');
      const developerPlan = productPlans.get('developer_launch_access');
      const agencyPlan = productPlans.get('agency_launch_access');
      if (!agencyCase || !agencyOwner || !agentPlan || !developerPlan || !agencyPlan) {
        throw new Error('Missing Agency containment fixture.');
      }
      const invoiceId = agencyCase.invoiceId;
      const subscriptionId = agencyCase.subscriptionId;
      const paymentId = agencyCase.paymentId;

      for (const invalidPlan of [agentPlan, developerPlan, ...unsupportedAgencyPlans]) {
        await db
          .update(billingInvoices)
          .set({ planId: invalidPlan.id })
          .where(eq(billingInvoices.id, invoiceId));
        await db
          .update(subscriptions)
          .set({ planId: invalidPlan.id })
          .where(eq(subscriptions.id, subscriptionId));
        const before = await loadContainmentSnapshot(agencyOwner);

        await expect(
          requestPaidLaunchAccessInvoice({ user: agencyOwner.user, planId: invalidPlan.id }),
        ).rejects.toMatchObject({ code: 'NOT_FOUND' });
        expect(await loadContainmentSnapshot(agencyOwner)).toEqual(before);

        await expect(
          startAgencyManualCheckout({
            user: agencyOwner.user,
            planId: invalidPlan.id,
            billingCycle: 'monthly',
          }),
        ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
        expect(await loadContainmentSnapshot(agencyOwner)).toEqual(before);

        await expect(
          submitAgencyPaymentProof({
            user: agencyOwner.user,
            ...proofFor({ id: invoiceId, amountDue: agencyCase.amountDue }),
          }),
        ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
        expect(await loadContainmentSnapshot(agencyOwner)).toEqual(before);

        await expect(
          reviewManualPayment({
            actorUser: { id: financeId, role: 'super_admin' },
            paymentId,
            decision: 'approve',
            verifiedAmount: agencyCase.amountDue,
          }),
        ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
        expect(await loadContainmentSnapshot(agencyOwner)).toEqual(before);

        await expect(
          updateSubscriptionLifecycle({
            actorUser: { id: financeId, role: 'super_admin' },
            subscriptionId,
            status: 'expired',
            periodEnd: '2021-01-01 00:00:00',
            graceEndsAt: '2021-01-02 00:00:00',
          }),
        ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
        expect(await loadContainmentSnapshot(agencyOwner)).toEqual(before);

        await expect(requestAgencyCancellationAtPeriodEnd(agencyOwner.user)).rejects.toMatchObject({
          code: 'PRECONDITION_FAILED',
        });
        await expect(restoreAgencySubscription(agencyOwner.user)).rejects.toMatchObject({
          code: 'PRECONDITION_FAILED',
        });
        expect(await loadContainmentSnapshot(agencyOwner)).toEqual(before);
      }

      await db
        .update(billingInvoices)
        .set({ planId: agencyPlan.id })
        .where(eq(billingInvoices.id, invoiceId));
      await db
        .update(subscriptions)
        .set({ planId: agencyPlan.id })
        .where(eq(subscriptions.id, subscriptionId));
      const agencyCaller = createCallerForFixtureUser(agencyOwner.user);
      const beforeForgedClientProduct = await loadContainmentSnapshot(agencyOwner);
      await expect(
        agencyCaller.billing.requestLaunchAccessInvoice({
          planId: agentPlan.id,
          productKey: 'agency_launch_access',
        } as any),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(await loadContainmentSnapshot(agencyOwner)).toEqual(beforeForgedClientProduct);
      await expect(
        agencyCaller.billing.startManualEftCheckout({
          planId: agentPlan.id,
          billingCycle: 'monthly',
          productKey: 'agency_launch_access',
        } as any),
      ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
      expect(await loadContainmentSnapshot(agencyOwner)).toEqual(beforeForgedClientProduct);

      await db
        .update(billingInvoices)
        .set({ planId: null })
        .where(eq(billingInvoices.id, invoiceId));
      await db
        .update(subscriptions)
        .set({ planId: null })
        .where(eq(subscriptions.id, subscriptionId));
      const beforeMissingPlan = await loadContainmentSnapshot(agencyOwner);
      await expect(
        requestPaidLaunchAccessInvoice({
          user: agencyOwner.user,
          planId: Number.MAX_SAFE_INTEGER,
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(await loadContainmentSnapshot(agencyOwner)).toEqual(beforeMissingPlan);
      await expect(
        startAgencyManualCheckout({
          user: agencyOwner.user,
          planId: Number.MAX_SAFE_INTEGER,
          billingCycle: 'monthly',
        }),
      ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
      await expect(
        submitAgencyPaymentProof({
          user: agencyOwner.user,
          ...proofFor({ id: invoiceId, amountDue: agencyCase.amountDue }),
        }),
      ).rejects.toMatchObject({ code: 'NOT_FOUND' });
      await expect(
        reviewManualPayment({
          actorUser: { id: financeId, role: 'super_admin' },
          paymentId,
          decision: 'approve',
          verifiedAmount: agencyCase.amountDue,
        }),
      ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
      await expect(
        updateSubscriptionLifecycle({
          actorUser: { id: financeId, role: 'super_admin' },
          subscriptionId,
          status: 'expired',
          periodEnd: '2021-01-01 00:00:00',
          graceEndsAt: '2021-01-02 00:00:00',
        }),
      ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
      await expect(requestAgencyCancellationAtPeriodEnd(agencyOwner.user)).rejects.toMatchObject({
        code: 'PRECONDITION_FAILED',
      });
      await expect(restoreAgencySubscription(agencyOwner.user)).rejects.toMatchObject({
        code: 'PRECONDITION_FAILED',
      });
      expect(await loadContainmentSnapshot(agencyOwner)).toEqual(beforeMissingPlan);
      await db
        .update(billingInvoices)
        .set({ planId: agencyPlan.id })
        .where(eq(billingInvoices.id, invoiceId));
      await db
        .update(subscriptions)
        .set({ planId: agencyPlan.id })
        .where(eq(subscriptions.id, subscriptionId));
    }, 120_000);
  }, 120_000);

  it('rejects stale sessions before invoice, approval, and restore mutations in production', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const requestAgentId = await insertUser({ label: 'b03-stale-request-agent', role: 'agent' });
    const reviewAgentId = await insertUser({ label: 'b03-stale-review-agent', role: 'agent' });
    const agencyId = await insertAgency('b03-stale-restore');
    const agencyUserId = await insertUser({
      label: 'b03-stale-agency-admin',
      role: 'agency_admin',
      agencyId,
    });
    const staleFinanceId = await insertUser({ label: 'b03-stale-finance', role: 'super_admin' });
    const financeId = await insertUser({ label: 'b03-current-finance', role: 'super_admin' });
    const requestAgentCookie = await createSessionCookie(requestAgentId);
    const agencyAdminCookie = await createSessionCookie(agencyUserId);
    const financeCookie = await createSessionCookie(staleFinanceId);
    const agencyUser = { id: agencyUserId, role: 'agency_admin', agencyId };
    const [agencyPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.name, 'agency_launch_access'))
      .limit(1);
    const [agentPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.name, 'agent_launch_access'))
      .limit(1);
    if (!agencyPlan || !agentPlan) throw new Error('Missing canonical B03 plan fixtures.');

    const agencyInvoice = await requestPaidLaunchAccessInvoice({
      user: agencyUser,
      planId: agencyPlan.id,
    });
    const agencyProof = await submitPaidLaunchAccessPaymentProof({
      user: agencyUser,
      ...proofFor(agencyInvoice.invoice),
    });
    await reviewManualPayment({
      actorUser: { id: financeId, role: 'super_admin' },
      paymentId: agencyProof.paymentId,
      decision: 'approve',
      verifiedAmount: agencyInvoice.invoice.amountDue,
    });
    await requestAgencyCancellationAtPeriodEnd(agencyUser);
    const agencyOwner = { ownerType: 'agency' as const, ownerId: agencyId, userId: agencyUserId };

    const reviewInvoice = await requestPaidLaunchAccessInvoice({
      user: { id: reviewAgentId, role: 'agent' },
      planId: agentPlan.id,
    });
    const reviewProof = await submitPaidLaunchAccessPaymentProof({
      user: { id: reviewAgentId, role: 'agent' },
      ...proofFor(reviewInvoice.invoice),
    });
    const reviewOwner = {
      ownerType: 'agent' as const,
      ownerId: reviewAgentId,
      userId: reviewAgentId,
    };
    const beforeStaleApproval = await loadContainmentSnapshot(reviewOwner);
    const requestOwner = {
      ownerType: 'agent' as const,
      ownerId: requestAgentId,
      userId: requestAgentId,
    };
    const beforeStaleInvoice = await loadContainmentSnapshot(requestOwner);

    await invalidateUserSessionAndDemote(requestAgentId);
    const staleRequestCaller = await createCallerFromSession(requestAgentCookie);
    await expect(
      staleRequestCaller.billing.requestLaunchAccessInvoice({ planId: agentPlan.id }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(await loadContainmentSnapshot(requestOwner)).toEqual(beforeStaleInvoice);

    await invalidateUserSessionAndDemote(staleFinanceId);
    const staleFinanceCaller = await createCallerFromSession(financeCookie);
    await expect(
      staleFinanceCaller.billing.admin.reviewManualPayment({
        paymentId: reviewProof.paymentId,
        decision: 'approve',
        verifiedAmount: reviewInvoice.invoice.amountDue,
      }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(await loadContainmentSnapshot(reviewOwner)).toEqual(beforeStaleApproval);

    await invalidateUserSessionAndDemote(agencyUserId);
    const staleAgencyCaller = await createCallerFromSession(agencyAdminCookie);
    const beforeRestore = await loadContainmentSnapshot(agencyOwner);
    await expect(staleAgencyCaller.billing.reactivateSubscription()).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
    expect(await loadContainmentSnapshot(agencyOwner)).toEqual(beforeRestore);
  }, 60_000);

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
      await expect(
        reviewManualPayment({
          actorUser: { id: financeId, role: 'super_admin' },
          paymentId: secondProof.paymentId,
          decision: 'approve',
          verifiedAmount: input.expectedAmount,
        }),
      ).rejects.toThrow('An already-paid invoice cannot be approved again.');
      await expect(
        reviewManualPayment({
          actorUser: { id: financeId, role: 'super_admin' },
          paymentId: secondProof.paymentId,
          decision: 'duplicate',
        }),
      ).rejects.toThrow('Duplicate payment review requires a finance note.');
      const duplicateReview = await reviewManualPayment({
        actorUser: { id: financeId, role: 'super_admin' },
        paymentId: secondProof.paymentId,
        decision: 'duplicate',
        note: 'Same EFT proof submitted twice; manual duplicate-payment treatment recorded.',
      });
      expect(duplicateReview).toMatchObject({
        success: true,
        idempotent: true,
        invoiceStatus: 'paid',
        subscriptionStatus: 'active',
      });
      const [duplicatePayment] = await db
        .select({ state: billingPayments.state, reviewNote: billingPayments.reviewNote })
        .from(billingPayments)
        .where(eq(billingPayments.id, secondProof.paymentId));
      expect(duplicatePayment).toMatchObject({
        state: 'rejected',
        reviewNote: 'Same EFT proof submitted twice; manual duplicate-payment treatment recorded.',
      });
      const afterSecondApproval = await loadSubscription(input.ownerType, input.ownerId);
      expect(afterSecondApproval?.currentPeriodEnd).toBe(periodEndAfterFirstApproval);
      expect(
        parseCanonicalCommercialTimestamp(afterSecondApproval!.currentPeriodEnd)! -
          parseCanonicalCommercialTimestamp(afterSecondApproval!.currentPeriodStart)!,
      ).toBe(90 * 24 * 60 * 60 * 1000);

      const subscription = await loadSubscription(input.ownerType, input.ownerId);
      expect(subscription?.currentPeriodStart).toBeTruthy();
      expect(subscription?.currentPeriodEnd).toBeTruthy();
      const duration =
        parseCanonicalCommercialTimestamp(subscription!.currentPeriodEnd)! -
        parseCanonicalCommercialTimestamp(subscription!.currentPeriodStart)!;
      expect(duration).toBe(90 * 24 * 60 * 60 * 1000);
      expect(subscription?.cancelAtPeriodEnd).toBe(0);

      const renewal = await requestPaidLaunchAccessInvoice({ user: ownerUser, planId: plan.id });
      expect(renewal.invoice.id).not.toBe(requested.invoice.id);
      expect((await loadSubscription(input.ownerType, input.ownerId))?.currentPeriodEnd).toBe(
        subscription?.currentPeriodEnd,
      );
      const renewalProof = await submitPaidLaunchAccessPaymentProof({
        user: ownerUser,
        ...proofFor(renewal.invoice),
      });
      const renewalReviews = await Promise.all([
        reviewManualPayment({
          actorUser: { id: financeId, role: 'super_admin' },
          paymentId: renewalProof.paymentId,
          decision: 'approve',
          verifiedAmount: input.expectedAmount,
        }),
        reviewManualPayment({
          actorUser: { id: financeId, role: 'super_admin' },
          paymentId: renewalProof.paymentId,
          decision: 'approve',
          verifiedAmount: input.expectedAmount,
        }),
      ]);
      expect(renewalReviews.filter(result => result.activationOccurred)).toHaveLength(1);
      const renewed = await loadSubscription(input.ownerType, input.ownerId);
      const firstTermMs = 90 * 24 * 60 * 60 * 1000;
      expect(
        parseCanonicalCommercialTimestamp(renewed!.currentPeriodEnd)! -
          parseCanonicalCommercialTimestamp(subscription!.currentPeriodEnd)!,
      ).toBe(firstTermMs);
      expect(
        parseCanonicalCommercialTimestamp(renewed!.currentPeriodEnd)! -
          parseCanonicalCommercialTimestamp(renewed!.currentPeriodStart)!,
      ).toBe(firstTermMs * 2);
      expect(renewed?.metadata).toMatchObject({ renewal_preserved_paid_days: true });

      const nextRenewal = await requestPaidLaunchAccessInvoice({
        user: ownerUser,
        planId: plan.id,
      });
      const nextProof = await submitPaidLaunchAccessPaymentProof({
        user: ownerUser,
        ...proofFor(nextRenewal.invoice),
      });
      const nextApproval = await reviewManualPayment({
        actorUser: { id: financeId, role: 'super_admin' },
        paymentId: nextProof.paymentId,
        decision: 'approve',
        verifiedAmount: input.expectedAmount,
      });
      expect(nextApproval.activationOccurred).toBe(true);
      const twiceRenewed = await loadSubscription(input.ownerType, input.ownerId);
      expect(
        parseCanonicalCommercialTimestamp(twiceRenewed!.currentPeriodEnd)! -
          parseCanonicalCommercialTimestamp(renewed!.currentPeriodEnd)!,
      ).toBe(firstTermMs);
      expect(
        parseCanonicalCommercialTimestamp(twiceRenewed!.currentPeriodEnd)! -
          parseCanonicalCommercialTimestamp(subscription!.currentPeriodStart)!,
      ).toBe(firstTermMs * 3);
      expect(twiceRenewed!.currentPeriodStart).toBe(subscription!.currentPeriodStart);
      expect(twiceRenewed!.id).toBe(subscription!.id);
      if (input.ownerType === 'developer') {
        const developerSubscription = await new DeveloperSubscriptionService().getSubscription(
          input.ownerId,
        );
        expect(developerSubscription!.currentPeriodStart!.getTime()).toBe(
          parseCanonicalCommercialTimestamp(twiceRenewed!.currentPeriodStart),
        );
        expect(developerSubscription!.currentPeriodEnd!.getTime()).toBe(
          parseCanonicalCommercialTimestamp(twiceRenewed!.currentPeriodEnd),
        );
      }
      expect(twiceRenewed!.metadata).toMatchObject({
        paid_term_starts_at: renewed!.currentPeriodEnd,
        paid_term_ends_at: twiceRenewed!.currentPeriodEnd,
        renewal_preserved_paid_days: true,
      });
      const ownerSubscriptions = await db
        .select()
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.ownerType, input.ownerType),
            eq(subscriptions.ownerId, input.ownerId),
          ),
        );
      expect(ownerSubscriptions).toHaveLength(1);
      const ownerInvoices = await db
        .select()
        .from(billingInvoices)
        .where(
          and(
            eq(billingInvoices.ownerType, input.ownerType),
            eq(billingInvoices.ownerId, input.ownerId),
          ),
        );
      expect(ownerInvoices).toHaveLength(3);
      expect(
        ownerInvoices.every(
          row => row.status === 'paid' && row.subscriptionId === subscription!.id,
        ),
      ).toBe(true);
      const activations = await db
        .select()
        .from(billingAuditEvents)
        .where(
          and(
            eq(billingAuditEvents.ownerType, input.ownerType),
            eq(billingAuditEvents.ownerId, input.ownerId),
            eq(billingAuditEvents.eventType, 'payment_approved_subscription_activated'),
          ),
        );
      expect(activations).toHaveLength(3);
      expect(new Set(activations.map(row => row.invoiceId))).toEqual(
        new Set([requested.invoice.id, renewal.invoice.id, nextRenewal.invoice.id]),
      );
      await reviewManualPayment({
        actorUser: { id: financeId, role: 'super_admin' },
        paymentId: nextProof.paymentId,
        decision: 'approve',
      });
      expect((await loadSubscription(input.ownerType, input.ownerId))!.currentPeriodEnd).toBe(
        twiceRenewed!.currentPeriodEnd,
      );
      const afterReplay = await db
        .select()
        .from(billingAuditEvents)
        .where(
          and(
            eq(billingAuditEvents.ownerType, input.ownerType),
            eq(billingAuditEvents.ownerId, input.ownerId),
            eq(billingAuditEvents.eventType, 'payment_approved_subscription_activated'),
          ),
        );
      expect(afterReplay).toHaveLength(3);

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
      const restart = await requestPaidLaunchAccessInvoice({ user: ownerUser, planId: plan.id });
      const restartProof = await submitPaidLaunchAccessPaymentProof({
        user: ownerUser,
        ...proofFor(restart.invoice),
      });
      const beforeRestart = Date.now();
      await reviewManualPayment({
        actorUser: { id: financeId, role: 'super_admin' },
        paymentId: restartProof.paymentId,
        decision: 'approve',
        verifiedAmount: input.expectedAmount,
      });
      const restarted = await loadSubscription(input.ownerType, input.ownerId);
      expect(
        parseCanonicalCommercialTimestamp(restarted!.currentPeriodStart)!,
      ).toBeGreaterThanOrEqual(beforeRestart - 1000);
      expect(
        parseCanonicalCommercialTimestamp(restarted!.currentPeriodEnd)! -
          parseCanonicalCommercialTimestamp(restarted!.currentPeriodStart)!,
      ).toBe(90 * 24 * 60 * 60 * 1000);
      expect(restarted?.metadata).toMatchObject({ renewal_preserved_paid_days: false });
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

  it('admits resolved owner pairs and denies forged intake and finance activation without writes', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const agentId = await insertUser({ label: 'admitted-agent', role: 'agent' });
    const otherAgentId = await insertUser({ label: 'unlisted-agent', role: 'agent' });
    const agencyId = await insertAgency('admitted-agency');
    const agencyUserId = await insertUser({
      label: 'admitted-agency',
      role: 'agency_admin',
      agencyId,
    });
    const otherAgencyId = await insertAgency('unlisted-agency');
    const otherAgencyUserId = await insertUser({
      label: 'unlisted-agency',
      role: 'agency_admin',
      agencyId: otherAgencyId,
    });
    const developerUserId = await insertUser({
      label: 'admitted-developer',
      role: 'property_developer',
    });
    const developerId = await insertDeveloper(developerUserId, 'admitted-developer');
    const otherDeveloperUserId = await insertUser({
      label: 'unlisted-developer',
      role: 'property_developer',
    });
    const otherDeveloperId = await insertDeveloper(otherDeveloperUserId, 'unlisted-developer');
    const financeId = await insertUser({ label: 'admission-finance', role: 'super_admin' });
    const owners = [
      {
        ownerType: 'agent' as const,
        ownerId: agentId,
        userId: agentId,
        role: 'agent',
        otherId: otherAgentId,
        otherUserId: otherAgentId,
      },
      {
        ownerType: 'agency' as const,
        ownerId: agencyId,
        userId: agencyUserId,
        role: 'agency_admin',
        otherId: otherAgencyId,
        otherUserId: otherAgencyUserId,
      },
      {
        ownerType: 'developer' as const,
        ownerId: developerId,
        userId: developerUserId,
        role: 'property_developer',
        otherId: otherDeveloperId,
        otherUserId: otherDeveloperUserId,
      },
    ];
    // An invoice issued before removal must not be activated using an admitted actor or forged owner.
    const pending = await requestPaidLaunchAccessInvoice({
      user: { id: otherAgentId, role: 'agent' },
    });
    const pendingProof = await submitPaidLaunchAccessPaymentProof({
      user: { id: otherAgentId, role: 'agent' },
      ...proofFor(pending.invoice),
    });
    process.env.PAID_MVP_ADMITTED_OWNERS = owners
      .map(owner => `${owner.ownerType}:${owner.ownerId}`)
      .join(',');
    initializeCommercialActivationPolicy();
    for (const owner of owners) {
      const caller = createCallerForFixtureUser({
        id: owner.userId,
        role: owner.role,
        agencyId: owner.ownerType === 'agency' ? owner.ownerId : null,
      });
      const unlisted = createCallerForFixtureUser({
        id: owner.otherUserId,
        role: owner.role,
        agencyId: owner.ownerType === 'agency' ? owner.otherId : null,
      });
      const unlistedOwner = {
        ownerType: owner.ownerType,
        ownerId: owner.otherId,
        userId: owner.otherUserId,
      };
      const before = await loadContainmentSnapshot(unlistedOwner);
      await expect(
        unlisted.billing.requestLaunchAccessInvoice({
          ownerType: owner.ownerType,
          ownerId: owner.ownerId,
        } as any),
      ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
      if (owner.ownerType === 'developer') {
        await expect(unlisted.billing.requestDeveloperLaunchAccessInvoice()).rejects.toMatchObject({
          code: 'PRECONDITION_FAILED',
        });
      }
      const requested =
        owner.ownerType === 'developer'
          ? await caller.billing.requestDeveloperLaunchAccessInvoice()
          : await caller.billing.requestLaunchAccessInvoice();
      expect(requested).toMatchObject({ ownerType: owner.ownerType, ownerId: owner.ownerId });
      if (owner.ownerType === 'agency') {
        for (const route of ['startManualEftCheckout', 'createCheckoutSession'] as const) {
          await expect(
            unlisted.billing[route]({
              planId: requested.invoice.planId!,
              billingCycle: 'monthly',
              ownerType: 'agency',
              ownerId: agencyId,
            } as any),
          ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
          await expect(
            caller.billing[route]({ planId: requested.invoice.planId!, billingCycle: 'monthly' }),
          ).resolves.toMatchObject({ invoice: { id: requested.invoice.id } });
        }
      }
      expect(await loadContainmentSnapshot(unlistedOwner)).toEqual(before);
      const proof = await caller.billing.submitLaunchAccessPaymentProof(
        proofFor(requested.invoice),
      );
      const financeCaller = createCallerForFixtureUser({ id: financeId, role: 'super_admin' });
      await expect(
        financeCaller.billing.admin.reviewManualPayment({
          paymentId: proof.paymentId,
          decision: 'approve',
          verifiedAmount: requested.invoice.amountDue,
        }),
      ).resolves.toMatchObject({ success: true, subscriptionStatus: 'active' });
      expect((await getPlanAccessProjectionForUserId(owner.userId))?.subscription?.status).toBe(
        'active',
      );
    }
    const removedOwner = {
      ownerType: 'agent' as const,
      ownerId: otherAgentId,
      userId: otherAgentId,
    };
    const before = await loadContainmentSnapshot(removedOwner);
    const financeCaller = createCallerForFixtureUser({ id: financeId, role: 'super_admin' });
    await expect(
      financeCaller.billing.admin.reviewManualPayment({
        paymentId: pendingProof.paymentId,
        decision: 'approve',
        verifiedAmount: pending.invoice.amountDue,
        ownerType: 'agent',
        ownerId: agentId,
      } as any),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    expect(await loadContainmentSnapshot(removedOwner)).toEqual(before);
    expect(
      isSubscriptionEntitled(
        (await getPlanAccessProjectionForUserId(otherAgentId))?.subscription?.status,
      ),
    ).toBe(false);
    delete process.env.PAID_MVP_ADMITTED_OWNERS;
    initializeCommercialActivationPolicy();
    expect((await getPlanAccessProjectionForUserId(agentId))?.subscription?.status).toBe('active');
    await expect(
      createCallerForFixtureUser({
        id: agentId,
        role: 'agent',
      }).billing.requestLaunchAccessInvoice(),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
  }, 60_000);

  it('preserves existing paid access and blocks new sales while the production release is paused', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const agentId = await insertUser({ label: 'b03-paused-agent', role: 'agent' });
    const financeId = await insertUser({ label: 'b03-paused-finance', role: 'super_admin' });
    const ownerUser = { id: agentId, role: 'agent' as const };
    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.name, 'agent_launch_access'))
      .limit(1);
    if (!plan) throw new Error('Missing agent_launch_access');

    const firstInvoice = await requestPaidLaunchAccessInvoice({ user: ownerUser, planId: plan.id });
    const firstProof = await submitPaidLaunchAccessPaymentProof({
      user: ownerUser,
      ...proofFor(firstInvoice.invoice),
    });
    await reviewManualPayment({
      actorUser: { id: financeId, role: 'super_admin' },
      paymentId: firstProof.paymentId,
      decision: 'approve',
      verifiedAmount: firstInvoice.invoice.amountDue,
    });

    const renewalInvoice = await requestPaidLaunchAccessInvoice({
      user: ownerUser,
      planId: plan.id,
    });
    const renewalProof = await submitPaidLaunchAccessPaymentProof({
      user: ownerUser,
      ...proofFor(renewalInvoice.invoice),
    });
    const owner = { ownerType: 'agent' as const, ownerId: agentId, userId: agentId };
    const beforePause = await loadContainmentSnapshot(owner);

    const pausedConfiguration = setPaidMvpProductionRelease(true);
    expect(pausedConfiguration.salesPaused).toBe(true);
    expect(isCommercialActivationAvailable(process.env, 'agent_launch_access')).toBe(true);
    expect(await getPlanAccessProjectionForUserId(agentId)).toMatchObject({
      subscription: { status: 'active' },
    });
    await expect(
      requestPaidLaunchAccessInvoice({ user: ownerUser, planId: plan.id }),
    ).rejects.toThrow(/Invoice requests is paused/);
    expect(await loadContainmentSnapshot(owner)).toEqual(beforePause);
    await expect(
      reviewManualPayment({
        actorUser: { id: financeId, role: 'super_admin' },
        paymentId: renewalProof.paymentId,
        decision: 'approve',
        verifiedAmount: renewalInvoice.invoice.amountDue,
      }),
    ).rejects.toThrow(/Payment activation is paused/);
    expect(await loadContainmentSnapshot(owner)).toEqual(beforePause);

    setPaidMvpProductionRelease(false);
    const renewalApproval = await reviewManualPayment({
      actorUser: { id: financeId, role: 'super_admin' },
      paymentId: renewalProof.paymentId,
      decision: 'approve',
      verifiedAmount: renewalInvoice.invoice.amountDue,
    });
    expect(renewalApproval).toMatchObject({ activationOccurred: true, invoiceStatus: 'paid' });
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

    const agentNotifications = await db
      .select({ title: notifications.title, data: notifications.data })
      .from(notifications)
      .where(eq(notifications.userId, agentId));
    const notificationTypes = agentNotifications.map(row => {
      try {
        return String(JSON.parse(row.data || '{}').notificationType);
      } catch {
        return '';
      }
    });
    expect(notificationTypes).toContain('invoice_issued');
    expect(notificationTypes).toContain('proof_received');
    expect(notificationTypes).toContain('payment_rejected');

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

    const approvalNotifications = await db
      .select({ data: notifications.data })
      .from(notifications)
      .where(eq(notifications.userId, agentId));
    const approvedTypes = approvalNotifications.map(row => {
      try {
        return String(JSON.parse(row.data || '{}').notificationType);
      } catch {
        return '';
      }
    });
    expect(approvedTypes).toContain('payment_approved');
  }, 60_000);

  it('keeps an unreconciled overpayment under review without activating access', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const agentId = await insertUser({ label: 'b03-overpayment', role: 'agent' });
    const financeId = await insertUser({ label: 'b03-finance', role: 'super_admin' });
    const ownerUser = { id: agentId, role: 'agent' as const, agencyId: null };
    const requested = await requestPaidLaunchAccessInvoice({ user: ownerUser });
    const proof = await submitPaidLaunchAccessPaymentProof({
      user: ownerUser,
      ...proofFor(requested.invoice),
      amount: requested.invoice.amountDue + 10000,
    });

    for (const verifiedAmount of [undefined, 0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(
        reviewManualPayment({
          actorUser: { id: financeId, role: 'super_admin' },
          paymentId: proof.paymentId,
          decision: 'approve',
          verifiedAmount,
        }),
      ).rejects.toThrow('An explicit verified amount in positive integer cents is required.');
    }

    await expect(
      reviewManualPayment({
        actorUser: { id: financeId, role: 'super_admin' },
        paymentId: proof.paymentId,
        decision: 'approve',
        verifiedAmount: requested.invoice.amountDue + 10000,
      }),
    ).rejects.toThrow('Overpayment requires explicit reconciliation and a finance note.');

    const subscription = await loadSubscription('agent', agentId);
    expect(subscription?.status).toBe('payment_under_review');
    const [payment] = await db
      .select()
      .from(billingPayments)
      .where(eq(billingPayments.id, proof.paymentId));
    expect(payment.state).toBe('under_review');
    const [invoice] = await db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.id, requested.invoice.id));
    expect(invoice.status).toBe('submitted');
    expect(invoice.amountPaid).toBe(0);

    await expect(
      reviewManualPayment({
        actorUser: { id: financeId, role: 'super_admin' },
        paymentId: proof.paymentId,
        decision: 'approve',
        verifiedAmount: requested.invoice.amountDue + 10000,
        overpaymentReconciled: true,
      }),
    ).rejects.toThrow('Overpayment requires explicit reconciliation and a finance note.');

    const approved = await reviewManualPayment({
      actorUser: { id: financeId, role: 'super_admin' },
      paymentId: proof.paymentId,
      decision: 'approve',
      verifiedAmount: requested.invoice.amountDue + 10000,
      overpaymentReconciled: true,
      note: 'Simulated bank match; excess assigned for manual refund.',
    });
    expect(approved).toMatchObject({ activationOccurred: true, invoiceStatus: 'paid' });
    const [reconciled] = await db
      .select()
      .from(billingInvoices)
      .where(eq(billingInvoices.id, invoice.id));
    expect(reconciled.metadata).toMatchObject({
      overpayment_amount: 10000,
      overpayment_reconciled: true,
      amount_rule: 'reconciled_overpayment_activates',
    });
    const active = await loadSubscription('agent', agentId);
    await reviewManualPayment({
      actorUser: { id: financeId, role: 'super_admin' },
      paymentId: proof.paymentId,
      decision: 'approve',
      verifiedAmount: requested.invoice.amountDue + 10000,
    });
    expect((await loadSubscription('agent', agentId))?.currentPeriodEnd).toBe(
      active?.currentPeriodEnd,
    );
  }, 60_000);

  it('notifies an agent at every Launch Access billing milestone', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const agentId = await insertUser({ label: 's4-agent-notify', role: 'agent' });
    const financeId = await insertUser({ label: 's4-finance-notify', role: 'super_admin' });

    const [plan] = await db
      .select()
      .from(plans)
      .where(eq(plans.name, 'agent_launch_access'))
      .limit(1);
    if (!plan) throw new Error('Missing agent_launch_access');

    const ownerUser = { id: agentId, role: 'agent' as const, agencyId: null };
    const requested = await requestPaidLaunchAccessInvoice({ user: ownerUser, planId: plan.id });
    expect(requested.invoice.status).toBe('issued');

    const proof = await submitPaidLaunchAccessPaymentProof({
      user: ownerUser,
      ...proofFor(requested.invoice),
    });

    const approved = await reviewManualPayment({
      actorUser: { id: financeId, role: 'super_admin' },
      paymentId: proof.paymentId,
      decision: 'approve',
      verifiedAmount: requested.invoice.amountDue,
    });
    expect(approved).toMatchObject({ success: true, subscriptionStatus: 'active' });

    const rows = await db
      .select({ title: notifications.title })
      .from(notifications)
      .where(eq(notifications.userId, agentId));
    const titles = rows.map(row => row.title).sort();
    expect(titles).toEqual([
      'Launch Access activated',
      'Launch Access invoice issued',
      'Payment proof received',
    ]);
  }, 60_000);
});
