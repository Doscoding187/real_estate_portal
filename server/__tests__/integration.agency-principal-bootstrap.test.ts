import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import dotenv from 'dotenv';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';

import { appRouter } from '../routers';
import { authService } from '../_core/auth';
import { getDb } from '../db';
import { createListing } from '../db';
import { assertListingPublicationEntitled } from '../services/listingPublicationEntitlementService';
import {
  agencies,
  agencyAgentMemberships,
  agencyBranding,
  agents,
  billingAuditEvents,
  billingInvoices,
  billingPaymentDocuments,
  billingPayments,
  invitations,
  listingApprovalQueue,
  listingMedia,
  listings,
  notifications,
  planEntitlements,
  plans,
  subscriptions,
  users,
} from '../../drizzle/schema';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

function usesListifyTest(url?: string) {
  try {
    return new URL(url || '').pathname.replace(/^\//, '') === 'listify_test';
  } catch {
    return false;
  }
}

const hasTestDb = usesListifyTest(process.env.DATABASE_URL);
const guardedDescribe: typeof describe = hasTestDb
  ? describe
  : ((name, fn) => describe.skip(`${name} (requires listify_test)`, fn)) as typeof describe;

const created = {
  agencyIds: [] as number[],
  userIds: [] as number[],
  agentIds: [] as number[],
  planIds: [] as number[],
  listingIds: [] as number[],
};

const originalEnv: Record<string, string | undefined> = {};
const idOf = (result: any) => Number(result?.insertId || result?.[0]?.insertId || 0);
const caller = (user: { id: number; role: string; agencyId?: number | null; email?: string | null }) =>
  appRouter.createCaller({ req: { headers: {} }, res: {}, user } as any);

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

async function createPlan(input: {
  suffix: string;
  segment?: 'agency' | 'agent' | 'developer' | 'enterprise';
  active?: number;
  price?: number;
  capacity?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [inserted] = await db.insert(plans).values({
    name: `bootstrap-${input.segment || 'agency'}-${input.suffix}`,
    displayName: 'Bootstrap test plan',
    description: 'Guarded agency principal bootstrap fixture.',
    segment: input.segment || 'agency',
    price: input.price ?? 99_000,
    priceMonthly: input.price ?? 99_000,
    currency: 'ZAR',
    interval: 'month',
    trialDays: 7,
    isActive: input.active ?? 1,
    isPopular: 0,
    sortOrder: 999,
  } as any);
  const planId = idOf(inserted);
  created.planIds.push(planId);
  await db.insert(planEntitlements).values({
    planId,
    featureKey: 'max_active_listings',
    valueJson: input.capacity ?? 5,
  } as any);
  return planId;
}

function onboardingInput(suffix: string, planId: number, teamEmails = [`agent-${suffix}@example.test`]) {
  return {
    basicInfo: {
      name: `Bootstrap Realty ${suffix}`,
      description: 'A production-like agency bootstrap acceptance fixture.',
      email: `agency-${suffix}@example.test`,
      phone: '+27115550123',
      website: 'https://bootstrap.example.test',
      address: '1 Bootstrap Avenue',
      city: 'Johannesburg',
      province: 'Gauteng',
    },
    branding: {
      companyName: `Bootstrap Realty ${suffix}`,
      primaryColor: '#0f766e',
      secondaryColor: '#334155',
    },
    teamEmails,
    planId,
  };
}

async function registerPrincipal(suffix: string) {
  const email = `principal-${suffix}@example.test`;
  const result = await authService.register(email, 'StrongPassword1!', 'Bootstrap Principal', 'agency_admin');
  created.userIds.push(result.userId);
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [unverified] = await db.select().from(users).where(eq(users.id, result.userId)).limit(1);
  if (!unverified?.emailVerificationToken) throw new Error('Expected verification token');
  return { user: unverified, verificationToken: unverified.emailVerificationToken, email };
}

beforeAll(() => {
  rememberEnv('BILLING_PROOF_STORAGE_ADAPTER', 'local');
  rememberEnv('BILLING_PRIVATE_STORAGE_DIR', `/tmp/property-listify-bootstrap-proofs-${process.pid}`);
  rememberEnv('BILLING_EFT_ACCOUNT_NAME', 'LOCAL TEST EFT ACCOUNT - NOT PAYABLE');
  rememberEnv('BILLING_EFT_BANK_NAME', 'Local Test Bank');
  rememberEnv('BILLING_EFT_BRANCH_CODE', '000000');
  rememberEnv('BILLING_EFT_ACCOUNT_NUMBER', '0000000000');
  rememberEnv('BILLING_EFT_ACCOUNT_TYPE', 'Local test account');
  rememberEnv('BILLING_SUPPORT_EMAIL', 'billing-test@propertylistify.local');
});

afterAll(restoreEnv);

afterEach(async () => {
  if (!hasTestDb) return;
  const db = await getDb();
  if (!db) return;
  const agencyIds = [...new Set(created.agencyIds)];
  const userIds = [...new Set(created.userIds)];
  const agentIds = [...new Set(created.agentIds)];
  const planIds = [...new Set(created.planIds)];
  const listingIds = [...new Set(created.listingIds)];
  if (listingIds.length) {
    await db.delete(listingMedia).where(inArray(listingMedia.listingId, listingIds));
    await db
      .delete(listingApprovalQueue)
      .where(inArray(listingApprovalQueue.listingId, listingIds));
    await db.delete(listings).where(inArray(listings.id, listingIds));
  }
  if (agencyIds.length) {
    await db.delete(billingAuditEvents).where(and(eq(billingAuditEvents.ownerType, 'agency'), inArray(billingAuditEvents.ownerId, agencyIds)));
    await db.delete(billingPaymentDocuments).where(and(eq(billingPaymentDocuments.ownerType, 'agency'), inArray(billingPaymentDocuments.ownerId, agencyIds)));
    await db.delete(billingPayments).where(and(eq(billingPayments.ownerType, 'agency'), inArray(billingPayments.ownerId, agencyIds)));
    await db.delete(billingInvoices).where(and(eq(billingInvoices.ownerType, 'agency'), inArray(billingInvoices.ownerId, agencyIds)));
    await db.delete(invitations).where(inArray(invitations.agencyId, agencyIds));
    await db.delete(subscriptions).where(and(eq(subscriptions.ownerType, 'agency'), inArray(subscriptions.ownerId, agencyIds)));
    await db.delete(agencyBranding).where(inArray(agencyBranding.agencyId, agencyIds));
  }
  if (agentIds.length) await db.delete(agencyAgentMemberships).where(inArray(agencyAgentMemberships.agentId, agentIds));
  if (agentIds.length) await db.delete(agents).where(inArray(agents.id, agentIds));
  if (userIds.length) {
    await db.delete(notifications).where(inArray(notifications.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  if (agencyIds.length) await db.delete(agencies).where(inArray(agencies.id, agencyIds));
  if (planIds.length) await db.delete(plans).where(inArray(plans.id, planIds));
  Object.assign(created, { agencyIds: [], userIds: [], agentIds: [], planIds: [], listingIds: [] });
});

guardedDescribe('agency principal bootstrap persisted acceptance', () => {
  it('resumes checkout from the server-owned onboarding result without reviving the legacy wizard', () => {
    const page = readFileSync(
      path.resolve(process.cwd(), 'client/src/pages/AgencyOnboarding.tsx'),
      'utf8',
    );

    expect(page).toContain('planId: agency.alreadyCreated ? agency.planId : planSelection.selectedPlanId');
    expect(page).toContain("toast.info('Resuming agency setup'");
    expect(page).toContain('error instanceof Error\n            ? error.message');
    expect(page).not.toContain('AgencySetupWizard');
  });

  it('registers, verifies, bootstraps once, reuses EFT checkout, and activates canonical access', async () => {
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const planId = await createPlan({ suffix });
    const principal = await registerPrincipal(suffix);

    await expect(caller({ id: principal.user.id, role: 'agency_admin', email: principal.email }).agency.createOnboarding(onboardingInput(suffix, planId))).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    const verified = await authService.verifyEmail(principal.verificationToken);
    expect(verified).toMatchObject({ id: principal.user.id, role: 'agency_admin', emailVerified: 1 });

    const principalCaller = caller({ id: principal.user.id, role: 'agency_admin', email: principal.email });
    await expect(
      principalCaller.agency.createOnboarding(
        onboardingInput(`${suffix}-malformed`, planId, ['not-an-email']),
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(
      principalCaller.agency.createOnboarding(
        onboardingInput(`${suffix}-blank`, planId, ['   ']),
      ),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    const createdOnboarding = await principalCaller.agency.createOnboarding(
      onboardingInput(suffix, planId, [`Agent-${suffix}@example.test`, ` agent-${suffix}@example.test `, principal.email]),
    );
    created.agencyIds.push(createdOnboarding.agencyId);
    expect(createdOnboarding.alreadyCreated).toBe(false);

    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [[agency], [branding], [subscription], invitationRows] = await Promise.all([
      db.select().from(agencies).where(eq(agencies.id, createdOnboarding.agencyId)).limit(1),
      db.select().from(agencyBranding).where(eq(agencyBranding.agencyId, createdOnboarding.agencyId)).limit(1),
      db.select().from(subscriptions).where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, createdOnboarding.agencyId))).limit(1),
      db.select().from(invitations).where(eq(invitations.agencyId, createdOnboarding.agencyId)),
    ]);
    expect(agency).toBeTruthy();
    expect(branding).toMatchObject({ companyName: `Bootstrap Realty ${suffix}` });
    expect(subscription).toMatchObject({ ownerType: 'agency', ownerId: createdOnboarding.agencyId, planId, status: 'trial' });
    expect(invitationRows).toHaveLength(1);
    expect(invitationRows[0]?.email).toBe(`agent-${suffix}@example.test`);

    const attachedCaller = caller({ id: principal.user.id, role: 'agency_admin', agencyId: createdOnboarding.agencyId, email: principal.email });
    expect((await attachedCaller.agency.getAccessState()).workspaceAccess.publishing).toBe(false);
    const [checkout, concurrentCheckout] = await Promise.all([
      attachedCaller.billing.startManualEftCheckout({ planId, billingCycle: 'monthly' }),
      attachedCaller.billing.startManualEftCheckout({ planId, billingCycle: 'monthly' }),
    ]);
    expect(concurrentCheckout.invoice.id).toBe(checkout.invoice.id);
    expect(concurrentCheckout.paymentReference).toBe(checkout.paymentReference);
    expect(
      await db
        .select()
        .from(billingInvoices)
        .where(and(eq(billingInvoices.ownerType, 'agency'), eq(billingInvoices.ownerId, createdOnboarding.agencyId))),
    ).toHaveLength(1);
    const checkoutRetry = await attachedCaller.billing.startManualEftCheckout({ planId, billingCycle: 'monthly' });
    expect(checkoutRetry.invoice.id).toBe(checkout.invoice.id);
    expect(checkoutRetry.paymentReference).toBe(checkout.paymentReference);
    await expect(attachedCaller.billing.startManualEftCheckout({ planId, billingCycle: 'annual' })).rejects.toMatchObject({ code: 'CONFLICT' });

    const [adminInsert] = await db.insert(users).values({ email: `finance-${suffix}@example.test`, name: 'Finance Admin', role: 'super_admin', emailVerified: 1 } as any);
    const adminId = idOf(adminInsert); created.userIds.push(adminId);
    const proof = await attachedCaller.billing.submitPaymentProof({
      invoiceId: checkout.invoice.id,
      amount: checkout.invoice.amountDue,
      bankReference: checkout.paymentReference,
      payerName: 'Bootstrap Principal',
      paymentDate: new Date().toISOString().slice(0, 10),
      file: { filename: 'proof.pdf', mimeType: 'application/pdf', sizeBytes: 3, contentBase64: Buffer.from('pdf').toString('base64') },
    });
    const adminCaller = caller({ id: adminId, role: 'super_admin' });
    let releaseConcurrentStart: (() => void) | undefined;
    const concurrentStart = new Promise<void>(resolve => {
      releaseConcurrentStart = resolve;
    });
    const approvalPromise = concurrentStart.then(() =>
      adminCaller.billing.admin.reviewManualPayment({
        paymentId: proof.paymentId,
        decision: 'approve',
        verifiedAmount: checkout.invoice.amountDue,
      }),
    );
    const checkoutDuringApprovalPromise = concurrentStart.then(() =>
      attachedCaller.billing.startManualEftCheckout({ planId, billingCycle: 'monthly' }),
    );
    releaseConcurrentStart?.();
    const [approvalResult, checkoutDuringApprovalResult] = await Promise.allSettled([
      approvalPromise,
      checkoutDuringApprovalPromise,
    ]);
    expect(approvalResult.status).toBe('fulfilled');
    if (approvalResult.status !== 'fulfilled') throw approvalResult.reason;
    const approval = approvalResult.value;
    expect(approval.success).toBe(true);
    if (checkoutDuringApprovalResult.status === 'fulfilled') {
      expect(checkoutDuringApprovalResult.value.invoice.id).toBe(checkout.invoice.id);
      expect(checkoutDuringApprovalResult.value.paymentReference).toBe(checkout.paymentReference);
    } else {
      expect(checkoutDuringApprovalResult.reason).toMatchObject({ code: 'PRECONDITION_FAILED' });
    }
    const concurrentInvoices = await db
      .select()
      .from(billingInvoices)
      .where(and(eq(billingInvoices.ownerType, 'agency'), eq(billingInvoices.ownerId, createdOnboarding.agencyId)));
    expect(concurrentInvoices).toHaveLength(1);
    expect(concurrentInvoices.filter(invoice => ['issued', 'submitted', 'partially_paid', 'overdue'].includes(invoice.status))).toHaveLength(0);
    expect(concurrentInvoices.map(invoice => invoice.paymentReference)).toEqual([checkout.paymentReference]);
    expect(
      await db
        .select()
        .from(billingAuditEvents)
        .where(and(eq(billingAuditEvents.ownerType, 'agency'), eq(billingAuditEvents.ownerId, createdOnboarding.agencyId), eq(billingAuditEvents.eventType, 'payment_approved_subscription_activated'))),
    ).toHaveLength(1);
    expect((await attachedCaller.agency.getAccessState()).workspaceAccess.publishing).toBe(true);
    expect((await adminCaller.billing.admin.reviewManualPayment({ paymentId: proof.paymentId, decision: 'approve' })).idempotent).toBe(true);
    const postPaymentCheckout = await attachedCaller.billing.startManualEftCheckout({ planId, billingCycle: 'monthly' });
    expect(postPaymentCheckout.invoice.id).not.toBe(checkout.invoice.id);
    expect(postPaymentCheckout.reused).toBe(false);

    const retry = await principalCaller.agency.createOnboarding(onboardingInput(`${suffix}-ignored`, planId + 100));
    expect(retry).toMatchObject({ agencyId: createdOnboarding.agencyId, planId, alreadyCreated: true });
    expect(await db.select().from(agencies).where(eq(agencies.id, createdOnboarding.agencyId))).toHaveLength(1);
    expect(await db.select().from(invitations).where(eq(invitations.agencyId, createdOnboarding.agencyId))).toHaveLength(1);
  });

  it('denies incompatible principals and plans, and serializes concurrent bootstrap calls', async () => {
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const validPlanId = await createPlan({ suffix });
    const agencyPrincipal = await registerPrincipal(`${suffix}-concurrent`);
    await authService.verifyEmail(agencyPrincipal.verificationToken);
    const concurrentCaller = caller({ id: agencyPrincipal.user.id, role: 'agency_admin', email: agencyPrincipal.email });
    const [first, second] = await Promise.all([
      concurrentCaller.agency.createOnboarding(onboardingInput(`${suffix}-concurrent`, validPlanId)),
      concurrentCaller.agency.createOnboarding(onboardingInput(`${suffix}-concurrent`, validPlanId)),
    ]);
    created.agencyIds.push(first.agencyId);
    expect(second.agencyId).toBe(first.agencyId);
    expect([first.alreadyCreated, second.alreadyCreated]).toContain(false);
    expect([first.alreadyCreated, second.alreadyCreated]).toContain(true);

    const db = await getDb(); if (!db) throw new Error('Database not available');
    const [concurrentAgencies, concurrentBranding, concurrentSubscriptions, concurrentInvitations, concurrentPrincipal] = await Promise.all([
      db.select().from(agencies).where(eq(agencies.id, first.agencyId)),
      db.select().from(agencyBranding).where(eq(agencyBranding.agencyId, first.agencyId)),
      db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, first.agencyId))),
      db.select().from(invitations).where(eq(invitations.agencyId, first.agencyId)),
      db.select().from(users).where(eq(users.id, agencyPrincipal.user.id)).limit(1),
    ]);
    expect(concurrentAgencies).toHaveLength(1);
    expect(concurrentBranding).toHaveLength(1);
    expect(concurrentSubscriptions).toHaveLength(1);
    expect(concurrentInvitations).toHaveLength(1);
    expect(concurrentPrincipal[0]).toMatchObject({ agencyId: first.agencyId, role: 'agency_admin' });
    await expect(
      (appRouter.createCaller({ req: { headers: {} }, res: {} } as any) as any).agency.createOnboarding(
        onboardingInput(`${suffix}-anonymous`, validPlanId),
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const [prospectInsert] = await db.insert(users).values({ email: `prospect-${suffix}@example.test`, role: 'visitor', emailVerified: 1 } as any);
    const prospectId = idOf(prospectInsert); created.userIds.push(prospectId);
    await expect(caller({ id: prospectId, role: 'visitor' }).agency.createOnboarding(onboardingInput(`${suffix}-prospect`, validPlanId))).rejects.toMatchObject({ code: 'FORBIDDEN' });

    for (const role of ['agent', 'property_developer', 'super_admin'] as const) {
      const [result] = await db.insert(users).values({ email: `${role}-${suffix}@example.test`, role, emailVerified: 1 } as any);
      const userId = idOf(result); created.userIds.push(userId);
      await expect(caller({ id: userId, role }).agency.createOnboarding(onboardingInput(`${suffix}-${role}`, validPlanId))).rejects.toMatchObject({ code: 'FORBIDDEN' });
    }

    const [partialAgencyResult] = await db.insert(agencies).values({ name: `Partial ${suffix}`, slug: `partial-${suffix}`.replace(/[^a-z0-9-]/g, '-'), email: `partial-${suffix}@example.test`, subscriptionPlan: 'free', subscriptionStatus: 'trial', isVerified: 0 } as any);
    const partialAgencyId = idOf(partialAgencyResult); created.agencyIds.push(partialAgencyId);
    const [partialPrincipalResult] = await db.insert(users).values({ email: `partial-principal-${suffix}@example.test`, role: 'agency_admin', agencyId: partialAgencyId, emailVerified: 1 } as any);
    const partialPrincipalId = idOf(partialPrincipalResult); created.userIds.push(partialPrincipalId);
    await expect(caller({ id: partialPrincipalId, role: 'agency_admin', agencyId: partialAgencyId }).agency.createOnboarding(onboardingInput(`${suffix}-partial`, validPlanId))).rejects.toMatchObject({ code: 'CONFLICT' });

    const [contradictoryResult] = await db.insert(users).values({ email: `contradictory-${suffix}@example.test`, role: 'agency_admin', emailVerified: 1 } as any);
    const contradictoryId = idOf(contradictoryResult); created.userIds.push(contradictoryId);
    const [agentResult] = await db.insert(agents).values({ userId: contradictoryId, firstName: 'Contradictory', lastName: 'Agent', email: `contradictory-agent-${suffix}@example.test`, status: 'approved', isVerified: 1, isFeatured: 0 } as any);
    created.agentIds.push(idOf(agentResult));
    await expect(caller({ id: contradictoryId, role: 'agency_admin' }).agency.createOnboarding(onboardingInput(`${suffix}-contradictory`, validPlanId))).rejects.toMatchObject({ code: 'CONFLICT' });

    const membershipPrincipal = await registerPrincipal(`${suffix}-membership`);
    await authService.verifyEmail(membershipPrincipal.verificationToken);
    const [membershipAgencyResult] = await db.insert(agencies).values({
      name: `Membership ${suffix}`,
      slug: `membership-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      email: `membership-${suffix}@example.test`,
      subscriptionPlan: 'free',
      subscriptionStatus: 'trial',
      isVerified: 0,
    } as any);
    const membershipAgencyId = idOf(membershipAgencyResult);
    created.agencyIds.push(membershipAgencyId);
    const [membershipAgentResult] = await db.insert(agents).values({
      userId: membershipPrincipal.user.id,
      firstName: 'Membership',
      lastName: 'Agent',
      email: `membership-agent-${suffix}@example.test`,
      status: 'approved',
      isVerified: 1,
      isFeatured: 0,
    } as any);
    const membershipAgentId = idOf(membershipAgentResult);
    created.agentIds.push(membershipAgentId);
    await db.insert(agencyAgentMemberships).values({
      agencyId: membershipAgencyId,
      agentId: membershipAgentId,
      status: 'active',
      createdBy: membershipPrincipal.user.id,
      updatedBy: membershipPrincipal.user.id,
    });
    await expect(
      caller({ id: membershipPrincipal.user.id, role: 'agency_admin', email: membershipPrincipal.email }).agency.createOnboarding(
        onboardingInput(`${suffix}-membership`, validPlanId),
      ),
    ).rejects.toMatchObject({ code: 'CONFLICT' });

    for (const [segment, active, price, capacity] of [
      ['agent', 1, 99_000, 5], ['developer', 1, 99_000, 5], ['enterprise', 1, 99_000, 5], ['agency', 0, 99_000, 5], ['agency', 1, 0, 5], ['agency', 1, 99_000, 0],
    ] as const) {
      const planId = await createPlan({ suffix: `${suffix}-${segment}-${price}-${capacity}`, segment, active, price, capacity });
      const candidate = await registerPrincipal(`${suffix}-${segment}-${price}-${capacity}`);
      await authService.verifyEmail(candidate.verificationToken);
      await expect(caller({ id: candidate.user.id, role: 'agency_admin', email: candidate.email }).agency.createOnboarding(onboardingInput(`${suffix}-${segment}-${price}-${capacity}`, planId))).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });
    }
  });

  it('rolls back a mid-bootstrap database failure and permits a clean retry', async () => {
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const planId = await createPlan({ suffix });
    const principal = await registerPrincipal(`${suffix}-rollback`);
    await authService.verifyEmail(principal.verificationToken);
    const principalCaller = caller({ id: principal.user.id, role: 'agency_admin', email: principal.email });
    const failedInput = onboardingInput(`${suffix}-rollback`, planId);
    failedInput.branding.companyName = 'x'.repeat(300);

    await expect(principalCaller.agency.createOnboarding(failedInput)).rejects.toBeDefined();

    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [[persistedPrincipal], failedAgencies, failedBranding, failedSubscriptions, failedInvitations] = await Promise.all([
      db.select().from(users).where(eq(users.id, principal.user.id)).limit(1),
      db.select().from(agencies).where(eq(agencies.email, failedInput.basicInfo.email)),
      db.select().from(agencyBranding).where(eq(agencyBranding.companyName, failedInput.branding.companyName)),
      db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.planId, planId))),
      db.select().from(invitations).where(eq(invitations.invitedBy, principal.user.id)),
    ]);
    expect(persistedPrincipal?.agencyId).toBeNull();
    expect(failedAgencies).toHaveLength(0);
    expect(failedBranding).toHaveLength(0);
    expect(failedSubscriptions).toHaveLength(0);
    expect(failedInvitations).toHaveLength(0);

    const retried = await principalCaller.agency.createOnboarding(onboardingInput(`${suffix}-retry`, planId));
    created.agencyIds.push(retried.agencyId);
    expect(retried.alreadyCreated).toBe(false);
  });
});
