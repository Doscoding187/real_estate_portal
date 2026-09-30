import { createHash, randomUUID } from 'node:crypto';
import { and, asc, eq, inArray, lte, ne, sql } from 'drizzle-orm';
import {
  auditLogs, billableAccounts, billingAuditEvents, billingInvoices, developerOrganisationMemberships,
  invitations, notifications, plans, subscriptions, transactionalEmailAttempts, transactionalEmailDeliveries,
  users,
} from '../../drizzle/schema';
import { isPaidMvpLaunchAccessProductKey, type PaidMvpLaunchAccessProductKey } from '../../shared/commercialActivation';
import { getDb } from '../db';
import { buildAgencyInvitationUrl, hasEffectiveAgencyInvitationAccess } from './agencyInvitationDeliveryService';
import { requiredBillingEmailPurpose, renderLaunchEmail, type LaunchEmailPurpose } from './transactionalEmailPolicy';
import { sendViaResend, transactionalEmailPublicOrigin, type TransactionalEmailProvider } from './transactionalEmailProvider';

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type Delivery = typeof transactionalEmailDeliveries.$inferSelect;
const MAX_ATTEMPTS = 3;
const LEASE_MS = 10 * 60_000;
const DUE_EVENT_TYPES = ['invoice_issued', 'payment_request_correction', 'payment_reject',
  'payment_approved_subscription_activated', 'payment_partially_approved'] as const;

function utc(value: Date = new Date()): string {
  return `${value.toISOString().slice(0, 19).replace('T', ' ')}.${value.toISOString().slice(20, 23)}000`;
}

function mysqlTimestampMs(value: string | Date | null | undefined): number {
  if (!value) return Number.NaN;
  if (value instanceof Date) return value.getTime();
  return new Date(`${String(value).replace(' ', 'T').replace(/Z$/, '')}Z`).getTime();
}

function safeEmail(value: string | null | undefined): string | null {
  const email = String(value || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 320 ? email : null;
}

function sourceKey(sourceType: Delivery['sourceType'], sourceId: number, purpose: LaunchEmailPurpose,
  recipientIdentity: string, version?: string | null) {
  return createHash('sha256')
    .update(`${sourceType}:${sourceId}:${recipientIdentity}:${purpose}:${version || '1'}`).digest('hex');
}

async function databaseOrThrow(database?: Database): Promise<Database> {
  const selected = database || await getDb();
  if (!selected) throw new Error('Database unavailable for transactional email.');
  return selected;
}

async function queue(input: {
  database: Database;
  sourceType: Delivery['sourceType']; sourceId: number; sourceVersion?: string | null;
  purpose: LaunchEmailPurpose; recipientUserId: number | null; recipientEmail: string;
}): Promise<number> {
  const email = safeEmail(input.recipientEmail);
  if (!email) throw new Error('Transactional email recipient is invalid.');
  const deliveryKey = sourceKey(input.sourceType, input.sourceId, input.purpose,
    input.recipientUserId === null ? `email:${createHash('sha256').update(email).digest('hex')}` : `user:${input.recipientUserId}`,
    input.sourceVersion);
  await input.database.insert(transactionalEmailDeliveries).values({
    sourceType: input.sourceType, sourceId: input.sourceId, sourceVersion: input.sourceVersion || null,
    purpose: input.purpose, recipientUserId: input.recipientUserId, recipientEmail: email,
    deliveryKey, state: 'pending', attemptCount: 0, maxAttempts: MAX_ATTEMPTS,
    nextAttemptAt: utc(),
  }).onDuplicateKeyUpdate({ set: { deliveryKey } });
  const [row] = await input.database.select({ id: transactionalEmailDeliveries.id })
    .from(transactionalEmailDeliveries).where(eq(transactionalEmailDeliveries.deliveryKey, deliveryKey)).limit(1);
  if (!row) throw new Error('Transactional email intent could not be read.');
  return row.id;
}

async function recordRecipientAttention(db: Database, input: {
  sourceType: Delivery['sourceType']; sourceId: number; purpose: LaunchEmailPurpose; code: string;
}) {
  const deliveryKey = sourceKey(input.sourceType, input.sourceId, input.purpose, 'unresolved', 'unresolved');
  await db.insert(transactionalEmailDeliveries).values({
    sourceType: input.sourceType, sourceId: input.sourceId, purpose: input.purpose,
    recipientUserId: null, recipientEmail: '', deliveryKey,
    state: 'permanent_failed', attemptCount: 0, maxAttempts: MAX_ATTEMPTS,
    nextAttemptAt: utc(), lastErrorCode: input.code, lastError: 'Recipient requires operator review.',
  }).onDuplicateKeyUpdate({ set: { deliveryKey } });
}

async function canonicalBillingRecipient(db: Database, event: typeof billingAuditEvents.$inferSelect) {
  const [account] = await db.select().from(billableAccounts)
    .where(eq(billableAccounts.id, event.billableAccountId)).limit(1);
  if (!account || account.accountKind !== event.ownerType ||
    (event.ownerType === 'agent' && account.userId !== event.ownerId) ||
    (event.ownerType === 'agency' && account.agencyId !== event.ownerId) ||
    (event.ownerType === 'developer' && account.developerOrganisationId !== event.ownerId)) return null;

  if (event.ownerType === 'agent') {
    const [user] = await db.select({ id: users.id, email: users.email, verified: users.emailVerified })
      .from(users).where(eq(users.id, event.ownerId)).limit(1);
    return user?.verified && safeEmail(user.email) ? { id: user.id, email: safeEmail(user.email)! } : null;
  }
  if (event.ownerType === 'agency') {
    const [user] = await db.select({ id: users.id, email: users.email, verified: users.emailVerified })
      .from(users).where(and(eq(users.agencyId, event.ownerId), eq(users.role, 'agency_admin')))
      .orderBy(asc(users.id)).limit(1);
    return user?.verified && safeEmail(user.email) ? { id: user.id, email: safeEmail(user.email)! } : null;
  }
  if (event.ownerType === 'developer') {
    const owners = await db.select({ id: users.id, email: users.email, verified: users.emailVerified })
      .from(developerOrganisationMemberships)
      .innerJoin(users, eq(developerOrganisationMemberships.userId, users.id))
      .where(and(eq(developerOrganisationMemberships.organisationId, event.ownerId),
        eq(developerOrganisationMemberships.status, 'active'),
        eq(developerOrganisationMemberships.role, 'owner')))
      .orderBy(asc(users.id)).limit(2);
    if (owners.length !== 1) return null;
    const [owner] = owners;
    if (!owner?.verified || !safeEmail(owner.email)) return null;
    const memberships = await db.select({ organisationId: developerOrganisationMemberships.organisationId })
      .from(developerOrganisationMemberships)
      .where(and(eq(developerOrganisationMemberships.userId, owner.id),
        eq(developerOrganisationMemberships.status, 'active'))).limit(2);
    return memberships.length === 1 && memberships[0].organisationId === event.ownerId
      ? { id: owner.id, email: safeEmail(owner.email)! } : null;
  }
  return null;
}

async function validTermNoticeRecipient(db: Database, userId: number, data: Record<string, unknown>): Promise<boolean> {
  const ownerId = Number(data.ownerId);
  const subscriptionId = Number(data.subscriptionId);
  const ownerType = String(data.ownerType || '');
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0 || !Number.isSafeInteger(subscriptionId)) return false;
  const [term] = await db.select({ ownerType: subscriptions.ownerType, ownerId: subscriptions.ownerId,
    periodEnd: subscriptions.currentPeriodEnd, planName: plans.name })
    .from(subscriptions).innerJoin(plans, eq(subscriptions.planId, plans.id))
    .where(eq(subscriptions.id, subscriptionId)).limit(1);
  if (!term || term.ownerType !== ownerType || term.ownerId !== ownerId ||
    !isPaidMvpLaunchAccessProductKey(term.planName) ||
    term.planName !== `${ownerType}_launch_access` ||
    String(term.periodEnd || '').slice(0, 19) !== String(data.currentPeriodEnd || '').slice(0, 19)) return false;
  const [user] = await db.select({ id: users.id, role: users.role, agencyId: users.agencyId,
    verified: users.emailVerified }).from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.verified) return false;
  if (ownerType === 'agent') return user.id === ownerId;
  if (ownerType === 'agency') return user.role === 'agency_admin' && user.agencyId === ownerId;
  if (ownerType === 'developer') {
    const memberships = await db.select({ organisationId: developerOrganisationMemberships.organisationId,
      role: developerOrganisationMemberships.role })
      .from(developerOrganisationMemberships)
      .where(and(eq(developerOrganisationMemberships.userId, userId),
        eq(developerOrganisationMemberships.status, 'active'))).limit(2);
    return memberships.length === 1 && memberships[0].organisationId === ownerId && memberships[0].role === 'owner';
  }
  return false;
}

export async function consumeLaunchEmailEvents(input: { database?: Database; limit?: number } = {}) {
  const db = await databaseOrThrow(input.database);
  const limit = Math.min(Math.max(input.limit || 100, 1), 500);
  const auditRows = await db.select({ event: billingAuditEvents }).from(billingAuditEvents)
    .innerJoin(billingInvoices, eq(billingAuditEvents.invoiceId, billingInvoices.id))
    .innerJoin(plans, eq(billingInvoices.planId, plans.id))
    .where(and(inArray(billingAuditEvents.eventType, [...DUE_EVENT_TYPES]),
      inArray(plans.name, ['agent_launch_access', 'agency_launch_access', 'developer_launch_access']),
      sql`NOT EXISTS (SELECT 1 FROM transactional_email_deliveries d WHERE d.source_type = 'billing_audit' AND d.source_id = ${billingAuditEvents.id})`))
    .orderBy(asc(billingAuditEvents.id)).limit(limit);
  let queued = 0;
  let attention = 0;
  for (const { event } of auditRows) {
    const purpose = requiredBillingEmailPurpose(event.eventType);
    if (!purpose) continue;
    if (!event.invoiceId) {
      await recordRecipientAttention(db, { sourceType: 'billing_audit', sourceId: event.id,
        purpose, code: 'invoice_reference_missing' });
      attention += 1;
      continue;
    }
    const [invoice] = await db.select({ id: billingInvoices.id, ownerType: billingInvoices.ownerType,
      ownerId: billingInvoices.ownerId, planName: plans.name })
      .from(billingInvoices).innerJoin(plans, eq(billingInvoices.planId, plans.id))
      .where(eq(billingInvoices.id, event.invoiceId)).limit(1);
    if (!invoice || !isPaidMvpLaunchAccessProductKey(invoice.planName)) continue;
    if (invoice.ownerType !== event.ownerType || invoice.ownerId !== event.ownerId) {
      await recordRecipientAttention(db, { sourceType: 'billing_audit', sourceId: event.id,
        purpose, code: 'commercial_owner_mismatch' });
      attention += 1;
      continue;
    }
    const recipient = await canonicalBillingRecipient(db, event);
    if (!recipient) {
      await recordRecipientAttention(db, { sourceType: 'billing_audit', sourceId: event.id,
        purpose, code: 'canonical_recipient_unresolved' });
      attention += 1;
      continue;
    }
    await queue({ database: db, sourceType: 'billing_audit', sourceId: event.id,
      purpose, recipientUserId: recipient.id, recipientEmail: recipient.email });
    queued += 1;
  }

  const notices = await db.select().from(notifications)
    .where(sql`CASE WHEN json_valid(${notifications.data})
      THEN json_unquote(json_extract(${notifications.data}, '$.providerDelivery'))
      ELSE '' END = 'b10_notification_consumer'
      AND NOT EXISTS (SELECT 1 FROM transactional_email_deliveries d WHERE d.source_type = 'term_notice' AND d.source_id = ${notifications.id})`)
    .orderBy(asc(notifications.id)).limit(limit);
  for (const notice of notices) {
    let data: Record<string, unknown> = {};
    try { data = typeof notice.data === 'string' ? JSON.parse(notice.data) as Record<string, unknown> : {}; }
    catch { data = {}; }
    if (!['launch_access_expiry_notice', 'launch_access_expired'].includes(String(data.notificationType || '')) ||
      Number(data.recipientUserId) !== notice.userId ||
      !['agent', 'agency', 'developer'].includes(String(data.ownerType || ''))) {
      await recordRecipientAttention(db, { sourceType: 'term_notice', sourceId: notice.id,
        purpose: 'launch_access_expiry_notice', code: 'invalid_term_notice_intent' });
      attention += 1;
      continue;
    }
    const [user] = await db.select({ id: users.id, email: users.email, verified: users.emailVerified })
      .from(users).where(eq(users.id, notice.userId)).limit(1);
    if (!user?.verified || !safeEmail(user.email) ||
      !(await validTermNoticeRecipient(db, user.id, data))) {
      await recordRecipientAttention(db, { sourceType: 'term_notice', sourceId: notice.id,
        purpose: data.notificationType as LaunchEmailPurpose, code: 'term_recipient_unresolved' });
      attention += 1;
      continue;
    }
    await queue({ database: db, sourceType: 'term_notice', sourceId: notice.id,
      purpose: data.notificationType as LaunchEmailPurpose,
      recipientUserId: user.id, recipientEmail: safeEmail(user.email)! });
    queued += 1;
  }
  return { queued, attention };
}

export async function queueAgencyInvitationEmail(input: { database?: Database; invitation: typeof invitations.$inferSelect }): Promise<number | null> {
  const db = await databaseOrThrow(input.database);
  const invitation = input.invitation;
  if (!invitation || invitation.status !== 'pending' || !safeEmail(invitation.email)) return null;
  const version = createHash('sha256').update(invitation.token).digest('hex');
  await db.update(transactionalEmailDeliveries).set({ state: 'cancelled', lastErrorCode: 'invitation_rotated' })
    .where(and(eq(transactionalEmailDeliveries.sourceType, 'agency_invitation'),
      eq(transactionalEmailDeliveries.sourceId, invitation.id),
      ne(transactionalEmailDeliveries.sourceVersion, version),
      inArray(transactionalEmailDeliveries.state, ['pending', 'retryable_failed'])));
  return queue({ database: db, sourceType: 'agency_invitation', sourceId: invitation.id,
    sourceVersion: version, purpose: 'agency_invitation', recipientUserId: null,
    recipientEmail: invitation.email });
}

async function claim(db: Database, id: number): Promise<Delivery | null> {
  return db.transaction(async tx => {
    const [row] = await tx.select().from(transactionalEmailDeliveries)
      .where(eq(transactionalEmailDeliveries.id, id)).for('update').limit(1);
    if (!row || !['pending', 'retryable_failed'].includes(row.state) ||
      mysqlTimestampMs(row.nextAttemptAt) > Date.now()) return null;
    const token = randomUUID();
    const attemptNumber = row.attemptCount + 1;
    await tx.update(transactionalEmailDeliveries).set({ state: 'claimed', claimToken: token,
      claimExpiresAt: utc(new Date(Date.now() + LEASE_MS)), attemptCount: attemptNumber })
      .where(eq(transactionalEmailDeliveries.id, id));
    await tx.insert(transactionalEmailAttempts).values({ deliveryId: id, attemptNumber,
      claimToken: token, state: 'claimed', claimedAt: utc() });
    return { ...row, state: 'claimed' as const, claimToken: token, attemptCount: attemptNumber };
  });
}

async function settle(db: Database, row: Delivery, outcome: Awaited<ReturnType<TransactionalEmailProvider>>) {
  await db.transaction(async tx => {
    const [current] = await tx.select().from(transactionalEmailDeliveries)
      .where(eq(transactionalEmailDeliveries.id, row.id)).for('update').limit(1);
    if (!current || current.state !== 'claimed' || current.claimToken !== row.claimToken) return;
    const exhausted = outcome.kind === 'retryable' && current.attemptCount >= current.maxAttempts;
    const state = exhausted ? 'permanent_failed' : outcome.kind === 'retryable' ? 'retryable_failed' :
      outcome.kind === 'permanent' ? 'permanent_failed' : outcome.kind;
    const backoff = Math.min(60 * 60_000, 60_000 * 2 ** (current.attemptCount - 1));
    await tx.update(transactionalEmailDeliveries).set({ state,
      claimToken: null, claimExpiresAt: null,
      nextAttemptAt: utc(new Date(Date.now() + backoff)),
      providerReference: outcome.kind === 'accepted' ? outcome.reference : null,
      lastErrorCode: outcome.kind === 'accepted' ? null : outcome.code,
      lastError: outcome.kind === 'accepted' ? null : outcome.code,
      acceptedAt: outcome.kind === 'accepted' ? utc() : null,
    }).where(eq(transactionalEmailDeliveries.id, row.id));
    await tx.update(transactionalEmailAttempts).set({ state,
      providerReference: outcome.kind === 'accepted' ? outcome.reference : null,
      errorCode: outcome.kind === 'accepted' ? null : outcome.code, finishedAt: utc() })
      .where(eq(transactionalEmailAttempts.claimToken, row.claimToken!));
  });
}

export async function recoverExpiredEmailClaims(input: { database?: Database; limit?: number } = {}) {
  const db = await databaseOrThrow(input.database);
  const stale = await db.select({ id: transactionalEmailDeliveries.id }).from(transactionalEmailDeliveries)
    .where(and(eq(transactionalEmailDeliveries.state, 'claimed'), lte(transactionalEmailDeliveries.claimExpiresAt, utc())))
    .limit(Math.min(input.limit || 100, 500));
  let unknown = 0;
  for (const item of stale) {
    await db.transaction(async tx => {
      const [row] = await tx.select().from(transactionalEmailDeliveries)
        .where(eq(transactionalEmailDeliveries.id, item.id)).for('update').limit(1);
      if (!row || row.state !== 'claimed' || !row.claimToken ||
        !row.claimExpiresAt || mysqlTimestampMs(row.claimExpiresAt) > Date.now()) return;
      await tx.update(transactionalEmailDeliveries).set({ state: 'unknown', claimToken: null,
        claimExpiresAt: null, lastErrorCode: 'claim_expired', lastError: 'Provider outcome requires reconciliation.' })
        .where(eq(transactionalEmailDeliveries.id, row.id));
      await tx.update(transactionalEmailAttempts).set({ state: 'unknown', errorCode: 'claim_expired', finishedAt: utc() })
        .where(eq(transactionalEmailAttempts.claimToken, row.claimToken));
      unknown += 1;
    });
  }
  return unknown;
}

async function messageForDelivery(db: Database, row: Delivery) {
  const publicOrigin = transactionalEmailPublicOrigin();
  let product: PaidMvpLaunchAccessProductKey;
  if (row.sourceType === 'agency_invitation') {
    const [invitation] = await db.select().from(invitations)
      .where(eq(invitations.id, row.sourceId)).limit(1);
    if (!invitation || invitation.status !== 'pending' ||
      createHash('sha256').update(invitation.token).digest('hex') !== row.sourceVersion ||
      safeEmail(invitation.email) !== row.recipientEmail ||
      new Date(invitation.expiresAt).getTime() <= Date.now() ||
      !(await hasEffectiveAgencyInvitationAccess(db, invitation.agencyId))) return null;
    product = 'agency_launch_access';
    return renderLaunchEmail({ purpose: 'agency_invitation', product, publicOrigin,
      invitationUrl: buildAgencyInvitationUrl(invitation.token, publicOrigin) });
  }
  if (row.sourceType === 'billing_audit') {
    const [event] = await db.select().from(billingAuditEvents)
      .where(eq(billingAuditEvents.id, row.sourceId)).limit(1);
    if (!event || !event.invoiceId || requiredBillingEmailPurpose(event.eventType) !== row.purpose) return null;
    const recipient = await canonicalBillingRecipient(db, event);
    if (!recipient || recipient.id !== row.recipientUserId || recipient.email !== row.recipientEmail) return null;
    const [invoice] = await db.select({ name: plans.name, ownerType: billingInvoices.ownerType,
      ownerId: billingInvoices.ownerId, invoiceNumber: billingInvoices.invoiceNumber,
      paymentReference: billingInvoices.paymentReference, amountDue: billingInvoices.amountDue,
      currency: billingInvoices.currency }).from(billingInvoices)
      .innerJoin(plans, eq(billingInvoices.planId, plans.id))
      .where(eq(billingInvoices.id, event.invoiceId)).limit(1);
    if (!invoice || invoice.ownerType !== event.ownerType || invoice.ownerId !== event.ownerId ||
      !isPaidMvpLaunchAccessProductKey(invoice.name)) return null;
    product = invoice.name;
    return renderLaunchEmail({ purpose: row.purpose as LaunchEmailPurpose, product, publicOrigin,
      ...(row.purpose === 'invoice_issued' ? { invoice: {
        invoiceNumber: invoice.invoiceNumber, paymentReference: invoice.paymentReference,
        amountDue: invoice.amountDue, currency: invoice.currency,
      } } : {}) });
  } else {
    const [notice] = await db.select().from(notifications)
      .where(eq(notifications.id, row.sourceId)).limit(1);
    if (!notice || notice.userId !== row.recipientUserId) return null;
    let data: Record<string, unknown>;
    try { data = typeof notice.data === 'string' ? JSON.parse(notice.data) as Record<string, unknown> : {}; }
    catch { return null; }
    if (data.providerDelivery !== 'b10_notification_consumer' || data.notificationType !== row.purpose) return null;
    product = data.ownerType === 'agency' ? 'agency_launch_access' :
      data.ownerType === 'developer' ? 'developer_launch_access' : 'agent_launch_access';
    const [user] = await db.select({ email: users.email, verified: users.emailVerified }).from(users)
      .where(eq(users.id, notice.userId)).limit(1);
    if (!user?.verified || safeEmail(user.email) !== row.recipientEmail ||
      !(await validTermNoticeRecipient(db, notice.userId, data))) return null;
  }
  return renderLaunchEmail({ purpose: row.purpose as LaunchEmailPurpose, product, publicOrigin });
}

export async function runTransactionalEmailWorker(input: {
  database?: Database; provider?: TransactionalEmailProvider; limit?: number; deliveryId?: number;
} = {}) {
  const db = await databaseOrThrow(input.database);
  const provider = input.provider || sendViaResend;
  transactionalEmailPublicOrigin();
  const recovered = await recoverExpiredEmailClaims({ database: db });
  const due = await db.select({ id: transactionalEmailDeliveries.id }).from(transactionalEmailDeliveries)
    .where(and(inArray(transactionalEmailDeliveries.state, ['pending', 'retryable_failed']),
      lte(transactionalEmailDeliveries.nextAttemptAt, utc()),
      ...(input.deliveryId ? [eq(transactionalEmailDeliveries.id, input.deliveryId)] : [])))
    .orderBy(asc(transactionalEmailDeliveries.nextAttemptAt), asc(transactionalEmailDeliveries.id))
    .limit(Math.min(input.limit || 25, 100));
  const result = { claimed: 0, accepted: 0, retryable: 0, permanent: 0, unknown: 0, recovered };
  for (const candidate of due) {
    const row = await claim(db, candidate.id);
    if (!row) continue;
    result.claimed += 1;
    const message = await messageForDelivery(db, row);
    let outcome: Awaited<ReturnType<TransactionalEmailProvider>>;
    if (!message) outcome = { kind: 'permanent', code: 'source_or_recipient_changed' };
    else {
      try {
        outcome = await provider({ to: row.recipientEmail, ...message,
          idempotencyKey: row.deliveryKey });
      } catch {
        outcome = { kind: 'unknown', code: 'provider_outcome_ambiguous' };
      }
    }
    await settle(db, row, outcome);
    if (outcome.kind === 'accepted') result.accepted += 1;
    else if (outcome.kind === 'retryable') result.retryable += 1;
    else if (outcome.kind === 'permanent') result.permanent += 1;
    else result.unknown += 1;
  }
  return result;
}

export async function transactionalEmailBacklog(database?: Database) {
  const db = await databaseOrThrow(database);
  const rows = await db.select({ id: transactionalEmailDeliveries.id,
    sourceType: transactionalEmailDeliveries.sourceType, sourceId: transactionalEmailDeliveries.sourceId,
    purpose: transactionalEmailDeliveries.purpose, recipientEmail: transactionalEmailDeliveries.recipientEmail,
    state: transactionalEmailDeliveries.state, attemptCount: transactionalEmailDeliveries.attemptCount,
    providerReference: transactionalEmailDeliveries.providerReference,
    lastErrorCode: transactionalEmailDeliveries.lastErrorCode,
    nextAttemptAt: transactionalEmailDeliveries.nextAttemptAt,
    claimExpiresAt: transactionalEmailDeliveries.claimExpiresAt,
    createdAt: transactionalEmailDeliveries.createdAt,
  }).from(transactionalEmailDeliveries)
    .where(inArray(transactionalEmailDeliveries.state,
      ['pending', 'claimed', 'retryable_failed', 'permanent_failed', 'unknown']))
    .orderBy(asc(transactionalEmailDeliveries.createdAt)).limit(200);
  return rows.map(row => ({ ...row,
    stale: row.state === 'claimed'
      ? mysqlTimestampMs(row.claimExpiresAt) <= Date.now()
      : ['pending', 'retryable_failed'].includes(row.state) &&
        mysqlTimestampMs(row.state === 'pending' ? row.createdAt : row.nextAttemptAt) <= Date.now() - 15 * 60_000,
    recipient: row.recipientEmail
      ? row.recipientEmail.replace(/(^.).*(@.*$)/, '$1***$2') : '[unresolved]',
    recipientEmail: undefined }));
}

/** Human reconciliation never calls the provider or creates another logical send. */
export async function reconcileUnknownTransactionalEmail(input: {
  deliveryId: number; actorUserId: number;
  outcome: 'accepted' | 'permanent_failed'; providerReference?: string; note: string;
  database?: Database;
}) {
  const db = await databaseOrThrow(input.database);
  const note = input.note.trim();
  const providerReference = String(input.providerReference || '').trim();
  const safeProviderReference = /^[A-Za-z0-9_-]{1,255}$/;
  if (!note || note.length > 500 ||
    /https?:\/\/|[?&](?:token|key|signature)=|\b[a-f0-9]{64}\b|[^\s@]+@[^\s@]+\.[^\s@]+/i.test(note) ||
    (providerReference && !safeProviderReference.test(providerReference)) ||
    (input.outcome === 'accepted' && (!providerReference || providerReference.length > 255))) {
    throw new Error('Reconciliation requires a bounded factual note and provider reference for acceptance.');
  }
  return db.transaction(async tx => {
    const [actor] = await tx.select({ id: users.id, role: users.role }).from(users)
      .where(eq(users.id, input.actorUserId)).limit(1);
    if (!actor || actor.role !== 'super_admin') throw new Error('Only a current super-admin may reconcile email.');
    const [row] = await tx.select().from(transactionalEmailDeliveries)
      .where(eq(transactionalEmailDeliveries.id, input.deliveryId)).for('update').limit(1);
    if (!row || row.state !== 'unknown') throw new Error('Only an unknown email outcome may be reconciled.');
    await tx.update(transactionalEmailDeliveries).set({ state: input.outcome,
      providerReference: input.outcome === 'accepted' ? providerReference : row.providerReference,
      acceptedAt: input.outcome === 'accepted' ? utc() : row.acceptedAt,
      lastErrorCode: input.outcome === 'permanent_failed' ? 'operator_reconciled_not_delivered' : null,
      lastError: input.outcome === 'permanent_failed' ? 'Operator reconciled as not delivered.' : null,
    }).where(eq(transactionalEmailDeliveries.id, row.id));
    await tx.insert(auditLogs).values({ userId: actor.id, action: 'transactional_email.reconcile',
      targetType: 'transactional_email_delivery', targetId: row.id,
      metadata: JSON.stringify({ outcome: input.outcome, providerReference: providerReference || null,
        note }), });
    return { id: row.id, state: input.outcome };
  });
}
