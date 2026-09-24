import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import {
  agencies, agencyAgentMemberships, agents, auditLogs, billableAccounts, billingAuditEvents, billingInvoices,
  developerOrganisationMemberships, developerOrganisations, invitations, notifications, plans, subscriptions,
  transactionalEmailAttempts, transactionalEmailDeliveries, users,
} from '../../drizzle/schema';
import { getDb } from '../db';
import {
  consumeLaunchEmailEvents, recoverExpiredEmailClaims, runTransactionalEmailWorker,
  transactionalEmailBacklog, queueAgencyInvitationEmail, reconcileUnknownTransactionalEmail,
} from '../services/transactionalEmailDeliveryService';

const describeDb = process.env.DATABASE_URL ? describe : describe.skip;
type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
let db: Database;
let planId: number;
const made = { users: [] as number[], accounts: [] as number[], terms: [] as number[],
  invoices: [] as number[], audits: [] as number[], notices: [] as number[],
  agencies: [] as number[], invitations: [] as number[], organisations: [] as number[] };

async function fixture(eventType = 'invoice_issued') {
  const nonce = randomUUID().slice(0, 12);
  const [userId] = await db.insert(users).values({
    name: `B10 ${nonce}`, email: `b10-${nonce}@example.test`, role: 'agent', emailVerified: 1,
  }).$returningId();
  made.users.push(userId.id);
  const [accountId] = await db.insert(billableAccounts).values({
    accountKind: 'agent', userId: userId.id,
  }).$returningId();
  made.accounts.push(accountId.id);
  const periodEnd = new Date(Date.now() + 6 * 24 * 60 * 60_000).toISOString().slice(0, 19).replace('T', ' ');
  const [termId] = await db.insert(subscriptions).values({ ownerType: 'agent', ownerId: userId.id,
    billableAccountId: accountId.id, planId, status: 'active', currentPeriodEnd: periodEnd })
    .$returningId();
  made.terms.push(termId.id);
  const invoiceNumber = `B10-${nonce}`;
  const [invoiceId] = await db.insert(billingInvoices).values({ ownerType: 'agent', ownerId: userId.id,
    billableAccountId: accountId.id, subscriptionId: termId.id, planId,
    invoiceNumber, paymentReference: invoiceNumber, amountDue: 49900,
    commercialTermKind: 'paid_launch_access', status: 'issued' }).$returningId();
  made.invoices.push(invoiceId.id);
  const [auditId] = await db.insert(billingAuditEvents).values({ ownerType: 'agent', ownerId: userId.id,
    billableAccountId: accountId.id, subscriptionId: termId.id, invoiceId: invoiceId.id,
    eventType }).$returningId();
  made.audits.push(auditId.id);
  return { userId: userId.id, accountId: accountId.id, termId: termId.id,
    invoiceId: invoiceId.id, invoiceNumber, auditId: auditId.id, periodEnd };
}

async function jobFor(sourceId: number, sourceType: 'billing_audit' | 'term_notice') {
  const [job] = await db.select().from(transactionalEmailDeliveries)
    .where(and(eq(transactionalEmailDeliveries.sourceType, sourceType),
      eq(transactionalEmailDeliveries.sourceId, sourceId))).limit(1);
  if (!job) throw new Error('B10 test expected a durable job.');
  return job;
}

describeDb('B10 transactional email delivery authority', () => {
  beforeAll(async () => {
    const connected = await getDb();
    if (!connected) throw new Error('Owned disposable database unavailable.');
    db = connected;
    const [plan] = await db.select({ id: plans.id }).from(plans)
      .where(eq(plans.name, 'agent_launch_access')).limit(1);
    if (!plan) throw new Error('Canonical launch foundation is required.');
    planId = plan.id;
    process.env.APP_URL = 'https://www.propertylistifysa.co.za';
  });

  afterAll(async () => {
    if (!db) return;
    for (const auditId of made.audits) {
      const rows = await db.select({ id: transactionalEmailDeliveries.id })
        .from(transactionalEmailDeliveries)
        .where(and(eq(transactionalEmailDeliveries.sourceType, 'billing_audit'),
          eq(transactionalEmailDeliveries.sourceId, auditId)));
      for (const row of rows) await db.delete(auditLogs)
        .where(and(eq(auditLogs.targetType, 'transactional_email_delivery'),
          eq(auditLogs.targetId, row.id)));
    }
    for (const auditId of made.audits) {
      const rows = await db.select({ id: transactionalEmailDeliveries.id })
        .from(transactionalEmailDeliveries)
        .where(and(eq(transactionalEmailDeliveries.sourceType, 'billing_audit'),
          eq(transactionalEmailDeliveries.sourceId, auditId)));
      for (const row of rows) {
        await db.delete(transactionalEmailAttempts).where(eq(transactionalEmailAttempts.deliveryId, row.id));
        await db.delete(transactionalEmailDeliveries).where(eq(transactionalEmailDeliveries.id, row.id));
      }
    }
    for (const noticeId of made.notices) {
      const rows = await db.select({ id: transactionalEmailDeliveries.id })
        .from(transactionalEmailDeliveries)
        .where(and(eq(transactionalEmailDeliveries.sourceType, 'term_notice'),
          eq(transactionalEmailDeliveries.sourceId, noticeId)));
      for (const row of rows) {
        await db.delete(transactionalEmailAttempts).where(eq(transactionalEmailAttempts.deliveryId, row.id));
        await db.delete(transactionalEmailDeliveries).where(eq(transactionalEmailDeliveries.id, row.id));
      }
    }
    for (const invitationId of made.invitations) {
      const rows = await db.select({ id: transactionalEmailDeliveries.id })
        .from(transactionalEmailDeliveries)
        .where(and(eq(transactionalEmailDeliveries.sourceType, 'agency_invitation'),
          eq(transactionalEmailDeliveries.sourceId, invitationId)));
      for (const row of rows) {
        await db.delete(transactionalEmailAttempts).where(eq(transactionalEmailAttempts.deliveryId, row.id));
        await db.delete(transactionalEmailDeliveries).where(eq(transactionalEmailDeliveries.id, row.id));
      }
    }
    for (const id of made.invitations) await db.delete(invitations).where(eq(invitations.id, id));
    for (const id of made.notices) await db.delete(notifications).where(eq(notifications.id, id));
    for (const id of made.audits) await db.delete(billingAuditEvents).where(eq(billingAuditEvents.id, id));
    for (const id of made.invoices) await db.delete(billingInvoices).where(eq(billingInvoices.id, id));
    for (const id of made.terms) await db.delete(subscriptions).where(eq(subscriptions.id, id));
    for (const id of made.accounts) await db.delete(billableAccounts).where(eq(billableAccounts.id, id));
    for (const id of made.users) await db.delete(users).where(eq(users.id, id));
    for (const id of made.agencies) await db.delete(agencies).where(eq(agencies.id, id));
    for (const id of made.organisations) await db.delete(developerOrganisations).where(eq(developerOrganisations.id, id));
  });

  it('consumes one canonical invoice event once and fences two workers', async () => {
    const source = await fixture();
    await consumeLaunchEmailEvents({ database: db });
    await consumeLaunchEmailEvents({ database: db });
    const job = await jobFor(source.auditId, 'billing_audit');
    await db.update(transactionalEmailDeliveries).set({ createdAt: '2001-01-01 00:00:00.000000' })
      .where(eq(transactionalEmailDeliveries.id, job.id));
    expect((await transactionalEmailBacklog(db)).find(item => item.id === job.id)?.stale).toBe(true);
    const same = await db.select().from(transactionalEmailDeliveries)
      .where(eq(transactionalEmailDeliveries.deliveryKey, job.deliveryKey));
    expect(same).toHaveLength(1);
    let calls = 0;
    const provider = async (input: { idempotencyKey: string; text: string }) => {
      calls += 1;
      expect(input.idempotencyKey).toBe(job.deliveryKey);
      expect(input.text).toContain('R499 once-off for 90 days');
      expect(input.text).toContain(`EFT payment reference: ${source.invoiceNumber}`);
      await new Promise(resolve => setTimeout(resolve, 25));
      return { kind: 'accepted' as const, reference: 'resend-test-accepted' };
    };
    const outcomes = await Promise.all([
      runTransactionalEmailWorker({ database: db, provider, deliveryId: job.id }),
      runTransactionalEmailWorker({ database: db, provider, deliveryId: job.id }),
    ]);
    expect(calls).toBe(1);
    expect(outcomes.reduce((sum, outcome) => sum + outcome.accepted, 0)).toBe(1);
    const final = await jobFor(source.auditId, 'billing_audit');
    expect(final.state).toBe('accepted');
    expect(final.providerReference).toBe('resend-test-accepted');
    expect(final.attemptCount).toBe(1);
  });

  it('retries a definite transient rejection with the same key, then records acceptance', async () => {
    const source = await fixture();
    await consumeLaunchEmailEvents({ database: db });
    const job = await jobFor(source.auditId, 'billing_audit');
    await runTransactionalEmailWorker({ database: db, deliveryId: job.id,
      provider: async () => ({ kind: 'retryable', code: 'rate_limited' }) });
    let row = await jobFor(source.auditId, 'billing_audit');
    expect(row.state).toBe('retryable_failed');
    await db.update(transactionalEmailDeliveries).set({ nextAttemptAt: '2001-01-01 00:00:00.000000' })
      .where(eq(transactionalEmailDeliveries.id, job.id));
    await runTransactionalEmailWorker({ database: db, deliveryId: job.id,
      provider: async input => {
        expect(input.idempotencyKey).toBe(job.deliveryKey);
        return { kind: 'accepted', reference: 'resend-test-retry' };
      } });
    row = await jobFor(source.auditId, 'billing_audit');
    expect(row.state).toBe('accepted');
    expect(row.attemptCount).toBe(2);
    const attempts = await db.select().from(transactionalEmailAttempts)
      .where(eq(transactionalEmailAttempts.deliveryId, job.id));
    expect(attempts).toHaveLength(2);
  });

  it('stops after a hard rejection or the bounded retry limit', async () => {
    const rejected = await fixture();
    await consumeLaunchEmailEvents({ database: db });
    const hardJob = await jobFor(rejected.auditId, 'billing_audit');
    await runTransactionalEmailWorker({ database: db, deliveryId: hardJob.id,
      provider: async () => ({ kind: 'permanent', code: 'invalid_recipient' }) });
    expect((await jobFor(rejected.auditId, 'billing_audit')).state).toBe('permanent_failed');

    const transient = await fixture();
    await consumeLaunchEmailEvents({ database: db });
    const retryJob = await jobFor(transient.auditId, 'billing_audit');
    let calls = 0;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await db.update(transactionalEmailDeliveries)
        .set({ nextAttemptAt: '2001-01-01 00:00:00.000000' })
        .where(eq(transactionalEmailDeliveries.id, retryJob.id));
      await runTransactionalEmailWorker({ database: db, deliveryId: retryJob.id,
        provider: async () => { calls += 1; return { kind: 'retryable', code: 'rate_limited' }; } });
    }
    await runTransactionalEmailWorker({ database: db, deliveryId: retryJob.id,
      provider: async () => { calls += 1; return { kind: 'accepted', reference: null }; } });
    const final = await jobFor(transient.auditId, 'billing_audit');
    expect(calls).toBe(3);
    expect(final.attemptCount).toBe(3);
    expect(final.state).toBe('permanent_failed');
  });

  it('blocks delivery when a canonical customer email changes after event consumption', async () => {
    const source = await fixture();
    await consumeLaunchEmailEvents({ database: db });
    const job = await jobFor(source.auditId, 'billing_audit');
    await db.update(users).set({ email: `changed-${randomUUID().slice(0, 8)}@example.test` })
      .where(eq(users.id, source.userId));
    let sent = false;
    await runTransactionalEmailWorker({ database: db, deliveryId: job.id,
      provider: async () => { sent = true; return { kind: 'accepted', reference: null }; } });
    expect(sent).toBe(false);
    expect((await jobFor(source.auditId, 'billing_audit')).state).toBe('permanent_failed');
  });

  it('resolves a single active Developer owner and fails closed when owner authority is ambiguous', async () => {
    const nonce = randomUUID().slice(0, 10);
    const [organisationId] = await db.insert(developerOrganisations).values({
      name: `B10 Developer ${nonce}`, slug: `b10-developer-${nonce}`, status: 'approved', isVerified: 1,
    }).$returningId();
    made.organisations.push(organisationId.id);
    const [owner] = await db.insert(users).values({ name: `B10 Developer Owner ${nonce}`,
      email: `b10-developer-${nonce}@example.test`, role: 'property_developer', emailVerified: 1 }).$returningId();
    made.users.push(owner.id);
    await db.insert(developerOrganisationMemberships).values({
      organisationId: organisationId.id, userId: owner.id, role: 'owner', status: 'active',
    });
    const [account] = await db.insert(billableAccounts).values({
      accountKind: 'developer', developerOrganisationId: organisationId.id,
    }).$returningId();
    made.accounts.push(account.id);
    const [developerPlan] = await db.select({ id: plans.id }).from(plans)
      .where(eq(plans.name, 'developer_launch_access')).limit(1);
    const [term] = await db.insert(subscriptions).values({ ownerType: 'developer', ownerId: organisationId.id,
      billableAccountId: account.id, planId: developerPlan.id, status: 'active',
      currentPeriodEnd: new Date(Date.now() + 60 * 24 * 60 * 60_000).toISOString().slice(0, 19).replace('T', ' ') })
      .$returningId();
    made.terms.push(term.id);
    const [invoice] = await db.insert(billingInvoices).values({ ownerType: 'developer', ownerId: organisationId.id,
      billableAccountId: account.id, subscriptionId: term.id, planId: developerPlan.id,
      invoiceNumber: `B10-${nonce}`, paymentReference: `B10-${nonce}`, amountDue: 149900,
      commercialTermKind: 'paid_launch_access', status: 'issued' }).$returningId();
    made.invoices.push(invoice.id);
    const [event] = await db.insert(billingAuditEvents).values({ ownerType: 'developer', ownerId: organisationId.id,
      billableAccountId: account.id, subscriptionId: term.id, invoiceId: invoice.id,
      eventType: 'invoice_issued' }).$returningId();
    made.audits.push(event.id);
    await consumeLaunchEmailEvents({ database: db });
    const job = await jobFor(event.id, 'billing_audit');
    expect(job.recipientUserId).toBe(owner.id);
    expect(job.recipientEmail).toBe(`b10-developer-${nonce}@example.test`);

    const [secondOwner] = await db.insert(users).values({ name: `B10 Second Owner ${nonce}`,
      email: `b10-second-owner-${nonce}@example.test`, role: 'property_developer', emailVerified: 1 }).$returningId();
    made.users.push(secondOwner.id);
    await db.insert(developerOrganisationMemberships).values({
      organisationId: organisationId.id, userId: secondOwner.id, role: 'owner', status: 'active',
    });
    const [ambiguousEvent] = await db.insert(billingAuditEvents).values({ ownerType: 'developer',
      ownerId: organisationId.id, billableAccountId: account.id, subscriptionId: term.id,
      invoiceId: invoice.id, eventType: 'payment_reject' }).$returningId();
    made.audits.push(ambiguousEvent.id);
    await consumeLaunchEmailEvents({ database: db });
    const attention = await jobFor(ambiguousEvent.id, 'billing_audit');
    expect(attention.state).toBe('permanent_failed');
    expect(attention.lastErrorCode).toBe('canonical_recipient_unresolved');
    expect(attention.recipientEmail).toBe('');
  });

  it('keeps ambiguous provider and expired-lease outcomes visible without auto-resend', async () => {
    const source = await fixture();
    await consumeLaunchEmailEvents({ database: db });
    const job = await jobFor(source.auditId, 'billing_audit');
    await runTransactionalEmailWorker({ database: db, deliveryId: job.id,
      provider: async () => { throw new Error('timeout after simulated provider acceptance'); } });
    expect((await jobFor(source.auditId, 'billing_audit')).state).toBe('unknown');
    let retried = false;
    await runTransactionalEmailWorker({ database: db, deliveryId: job.id,
      provider: async () => { retried = true; return { kind: 'accepted', reference: null }; } });
    expect(retried).toBe(false);
    expect((await transactionalEmailBacklog(db)).some(item => item.id === job.id && item.state === 'unknown')).toBe(true);

    const beforeResponse = await fixture();
    await consumeLaunchEmailEvents({ database: db });
    const beforeResponseJob = await jobFor(beforeResponse.auditId, 'billing_audit');
    await runTransactionalEmailWorker({ database: db, deliveryId: beforeResponseJob.id,
      provider: async () => { throw new Error('connection reset before provider response'); } });
    expect((await jobFor(beforeResponse.auditId, 'billing_audit')).state).toBe('unknown');

    const second = await fixture();
    await consumeLaunchEmailEvents({ database: db });
    const claimed = await jobFor(second.auditId, 'billing_audit');
    await db.update(transactionalEmailDeliveries).set({ state: 'claimed', claimToken: 'crashed-worker-token',
      claimExpiresAt: '2001-01-01 00:00:00.000000', attemptCount: 1 })
      .where(eq(transactionalEmailDeliveries.id, claimed.id));
    await db.insert(transactionalEmailAttempts).values({ deliveryId: claimed.id,
      attemptNumber: 1, claimToken: 'crashed-worker-token', state: 'claimed' });
    expect(await recoverExpiredEmailClaims({ database: db })).toBeGreaterThanOrEqual(1);
    expect((await jobFor(second.auditId, 'billing_audit')).state).toBe('unknown');
  });

  it('consumes a B03 term notice separately from business-event state', async () => {
    const source = await fixture();
    const [noticeId] = await db.insert(notifications).values({ userId: source.userId,
      type: 'system_alert', title: 'Launch Access expires', content: 'Renew access', isRead: 0,
      data: JSON.stringify({ notificationType: 'launch_access_expiry_notice',
        providerDelivery: 'b10_notification_consumer', recipientUserId: source.userId,
        ownerType: 'agent', ownerId: source.userId, subscriptionId: source.termId,
        currentPeriodEnd: source.periodEnd }),
    }).$returningId();
    made.notices.push(noticeId.id);
    await consumeLaunchEmailEvents({ database: db });
    const job = await jobFor(noticeId.id, 'term_notice');
    expect(job.state).toBe('pending');
    expect(job.purpose).toBe('launch_access_expiry_notice');
  });

  it('allows only a super-admin to reconcile unknown provider evidence without resending', async () => {
    const source = await fixture();
    await consumeLaunchEmailEvents({ database: db });
    const job = await jobFor(source.auditId, 'billing_audit');
    await runTransactionalEmailWorker({ database: db, deliveryId: job.id,
      provider: async () => ({ kind: 'unknown', code: 'ambiguous_timeout' }) });
    await expect(reconcileUnknownTransactionalEmail({ database: db, deliveryId: job.id,
      actorUserId: source.userId, outcome: 'accepted', providerReference: 'provider-confirmed-id',
      note: 'Confirmed accepted in provider dashboard.' })).rejects.toThrow('super-admin');
    const [admin] = await db.insert(users).values({ name: 'B10 Operator', role: 'super_admin',
      email: `b10-operator-${randomUUID().slice(0, 8)}@example.test`, emailVerified: 1 })
      .$returningId();
    made.users.push(admin.id);
    await reconcileUnknownTransactionalEmail({ database: db, deliveryId: job.id,
      actorUserId: admin.id, outcome: 'accepted', providerReference: 'provider-confirmed-id',
      note: 'Confirmed accepted in provider dashboard.' });
    expect((await jobFor(source.auditId, 'billing_audit')).state).toBe('accepted');
    await expect(reconcileUnknownTransactionalEmail({ database: db, deliveryId: job.id,
      actorUserId: admin.id, outcome: 'accepted', providerReference: 'another-id',
      note: 'Repeat.' })).rejects.toThrow('Only an unknown');
    await expect(reconcileUnknownTransactionalEmail({ database: db, deliveryId: job.id,
      actorUserId: admin.id, outcome: 'accepted', providerReference: 'provider-id',
      note: 'https://provider.example.test/email?token=secret' })).rejects.toThrow('Reconciliation requires');
    const [audit] = await db.select().from(auditLogs)
      .where(and(eq(auditLogs.targetType, 'transactional_email_delivery'),
        eq(auditLogs.targetId, job.id))).limit(1);
    expect(audit?.userId).toBe(admin.id);
  });

  it('sends only a current pending Agency invitation token after rotation', async () => {
    const nonce = randomUUID().slice(0, 12);
    const [agency] = await db.insert(agencies).values({ name: `B10 ${nonce}`, slug: `b10-${nonce}`,
      isVerified: 1 }).$returningId();
    made.agencies.push(agency.id);
    const [owner] = await db.insert(users).values({ name: `B10 Agency ${nonce}`,
      email: `b10-agency-${nonce}@example.test`, role: 'agency_admin',
      agencyId: agency.id, emailVerified: 1 }).$returningId();
    made.users.push(owner.id);
    const [account] = await db.insert(billableAccounts).values({ accountKind: 'agency',
      agencyId: agency.id }).$returningId();
    made.accounts.push(account.id);
    const [agencyPlan] = await db.select({ id: plans.id }).from(plans)
      .where(eq(plans.name, 'agency_launch_access')).limit(1);
    const [term] = await db.insert(subscriptions).values({ ownerType: 'agency', ownerId: agency.id,
      billableAccountId: account.id, planId: agencyPlan.id, status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString().slice(0, 19).replace('T', ' ') })
      .$returningId();
    made.terms.push(term.id);
    const originalToken = 'a'.repeat(64);
    const [invitationId] = await db.insert(invitations).values({ agencyId: agency.id,
      invitedBy: owner.id, email: `invite-${nonce}@example.test`, token: originalToken,
      status: 'pending', expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60_000).toISOString().slice(0, 19).replace('T', ' ') })
      .$returningId();
    made.invitations.push(invitationId.id);
    const [initial] = await db.select().from(invitations)
      .where(eq(invitations.id, invitationId.id)).limit(1);
    const oldJob = await queueAgencyInvitationEmail({ database: db, invitation: initial });
    expect(oldJob).toBeTruthy();
    const rotatedToken = 'b'.repeat(64);
    await db.update(invitations).set({ token: rotatedToken })
      .where(eq(invitations.id, invitationId.id));
    let calls = 0;
    await runTransactionalEmailWorker({ database: db, deliveryId: oldJob!,
      provider: async () => { calls += 1; return { kind: 'accepted', reference: 'unexpected' }; } });
    expect(calls).toBe(0);
    const [rotated] = await db.select().from(invitations)
      .where(eq(invitations.id, invitationId.id)).limit(1);
    const newJob = await queueAgencyInvitationEmail({ database: db, invitation: rotated });
    expect(newJob).not.toBe(oldJob);
    await runTransactionalEmailWorker({ database: db, deliveryId: newJob!,
      provider: async input => {
        calls += 1;
        expect(input.text).toContain(rotatedToken);
        expect(input.text).not.toContain(originalToken);
        return { kind: 'accepted', reference: 'agency-invite-accepted' };
      } });
    expect(calls).toBe(1);
    expect((await db.select().from(transactionalEmailDeliveries)
      .where(eq(transactionalEmailDeliveries.id, newJob!)).limit(1))[0].state).toBe('accepted');

    const [expiredId] = await db.insert(invitations).values({ agencyId: agency.id, invitedBy: owner.id,
      email: `expired-${nonce}@example.test`, token: 'c'.repeat(64), status: 'pending',
      expiresAt: '2001-01-01 00:00:00' }).$returningId();
    made.invitations.push(expiredId.id);
    const [expiredInvitation] = await db.select().from(invitations)
      .where(eq(invitations.id, expiredId.id)).limit(1);
    const expiredJob = await queueAgencyInvitationEmail({ database: db, invitation: expiredInvitation });
    await runTransactionalEmailWorker({ database: db, deliveryId: expiredJob!,
      provider: async () => { calls += 1; return { kind: 'accepted', reference: 'must-not-send' }; } });
    expect(calls).toBe(1);
    expect((await db.select().from(transactionalEmailDeliveries)
      .where(eq(transactionalEmailDeliveries.id, expiredJob!)).limit(1))[0].state).toBe('permanent_failed');
  });

  it('uses the current Agency admin instead of an Agent with a historical left membership', async () => {
    const nonce = randomUUID().slice(0, 10);
    const [agency] = await db.insert(agencies).values({ name: `B10 Agency ${nonce}`,
      slug: `b10-agency-${nonce}`, isVerified: 1 }).$returningId();
    made.agencies.push(agency.id);
    const [admin] = await db.insert(users).values({ name: `B10 Current Admin ${nonce}`,
      email: `b10-current-${nonce}@example.test`, role: 'agency_admin',
      agencyId: agency.id, emailVerified: 1 }).$returningId();
    made.users.push(admin.id);
    const [removedUser] = await db.insert(users).values({ name: `B10 Removed Member ${nonce}`,
      email: `b10-removed-${nonce}@example.test`, role: 'agent', emailVerified: 1 }).$returningId();
    made.users.push(removedUser.id);
    const [agent] = await db.insert(agents).values({ userId: removedUser.id, firstName: 'Removed',
      lastName: 'Member', isVerified: 0, isFeatured: 0, status: 'suspended' }).$returningId();
    await db.insert(agencyAgentMemberships).values({ agencyId: agency.id, agentId: agent.id,
      status: 'left', effectiveTo: new Date().toISOString().slice(0, 19).replace('T', ' '), role: 'agent' });
    const [account] = await db.insert(billableAccounts).values({ accountKind: 'agency', agencyId: agency.id })
      .$returningId();
    made.accounts.push(account.id);
    const [agencyPlan] = await db.select({ id: plans.id }).from(plans)
      .where(eq(plans.name, 'agency_launch_access')).limit(1);
    const [term] = await db.insert(subscriptions).values({ ownerType: 'agency', ownerId: agency.id,
      billableAccountId: account.id, planId: agencyPlan.id, status: 'active',
      currentPeriodEnd: new Date(Date.now() + 60 * 24 * 60 * 60_000).toISOString().slice(0, 19).replace('T', ' ') })
      .$returningId();
    made.terms.push(term.id);
    const [invoice] = await db.insert(billingInvoices).values({ ownerType: 'agency', ownerId: agency.id,
      billableAccountId: account.id, subscriptionId: term.id, planId: agencyPlan.id,
      invoiceNumber: `B10-${nonce}`, paymentReference: `B10-${nonce}`, amountDue: 99900,
      commercialTermKind: 'paid_launch_access', status: 'issued' }).$returningId();
    made.invoices.push(invoice.id);
    const [event] = await db.insert(billingAuditEvents).values({ ownerType: 'agency', ownerId: agency.id,
      billableAccountId: account.id, subscriptionId: term.id, invoiceId: invoice.id,
      eventType: 'invoice_issued' }).$returningId();
    made.audits.push(event.id);
    await consumeLaunchEmailEvents({ database: db });
    const job = await jobFor(event.id, 'billing_audit');
    expect(job.recipientUserId).toBe(admin.id);
    expect(job.recipientEmail).toBe(`b10-current-${nonce}@example.test`);
    expect(job.recipientEmail).not.toBe(`b10-removed-${nonce}@example.test`);
  });
});
