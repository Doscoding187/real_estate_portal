import { randomUUID } from 'node:crypto';
import { and, asc, desc, eq, inArray, lte, ne, sql } from 'drizzle-orm';

import { leadDeliveries, leadDeliveryAttempts, leads } from '../../drizzle/schema';
import { db } from '../db';
import type {
  PublicLeadCustody,
  PublicLeadRecipientType,
  PublicSupplyOrigin,
} from './publicLeadCustodyService';

/** API compatibility labels for the lead-level delivery projection. */
export type LeadDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'attention_required';
export type LeadDeliveryChannel = 'crm_export' | 'email' | 'manual' | 'none';
export type LeadDeliveryRecipientType = PublicLeadRecipientType | 'brand';
export type LeadDeliveryPurpose = 'primary_custody' | 'notification' | 'platform_action';
export type LeadDeliveryState =
  | 'queued'
  | 'claimed'
  | 'accepted'
  | 'completed'
  | 'retryable_failed'
  | 'exhausted'
  | 'unknown'
  | 'cancelled'
  | 'superseded';
export type LeadDeliveryAttemptState =
  | 'queued'
  | 'claimed'
  | 'accepted'
  | 'completed'
  | 'retryable_failed'
  | 'exhausted'
  | 'unknown'
  | 'expired';

export interface LeadDeliveryAttemptRecord {
  /** String for existing API consumers; it is the relational attempt primary key. */
  id: string;
  leadId: number;
  deliveryId: number;
  deliveryKey: string;
  recipientType: LeadDeliveryRecipientType;
  recipientId: number | null;
  recipientPublisherId: number | null;
  channel: LeadDeliveryChannel;
  status: LeadDeliveryStatus;
  attemptCount: number;
  maxAttempts: number;
  recipientAddress?: string | null;
  providerReference?: string | null;
  lastError?: string | null;
  attemptedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
  supplyOrigin?: PublicSupplyOrigin;
  leadCustody?: PublicLeadCustody;
  leaseToken?: string | null;
  leaseGeneration?: number;
  routingRevision?: number;
  state?: LeadDeliveryAttemptState;
}

export interface LeadDeliveryRecord {
  id: number;
  leadId: number;
  purpose: LeadDeliveryPurpose;
  routingRevision: number;
  channel: LeadDeliveryChannel;
  recipientType: Exclude<LeadDeliveryRecipientType, 'brand'>;
  recipientId: number | null;
  recipientUserId: number | null;
  recipientAgentId: number | null;
  recipientAgencyId: number | null;
  recipientDeveloperOrganisationId: number | null;
  recipientPublisherId: number | null;
  destinationName: string | null;
  destinationAddress: string | null;
  destinationSnapshot: unknown;
  supplyOrigin: PublicSupplyOrigin;
  leadCustody: PublicLeadCustody;
  state: LeadDeliveryState;
  idempotencyKey: string;
  dueAt: string;
  maxAttempts: number;
  completedAt: string | null;
  supersededAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeadDeliverySnapshot {
  current: LeadDeliveryRecord | null;
  attempts: LeadDeliveryAttemptRecord[];
}

export interface CreateLeadDeliveryInput {
  leadId: number;
  purpose?: LeadDeliveryPurpose;
  routingRevision?: number;
  idempotencyKey: string;
  channel: LeadDeliveryChannel;
  recipientType: Exclude<LeadDeliveryRecipientType, 'brand'>;
  recipientUserId?: number | null;
  recipientAgentId?: number | null;
  recipientAgencyId?: number | null;
  recipientDeveloperOrganisationId?: number | null;
  recipientPublisherId?: number | null;
  destinationName?: string | null;
  destinationAddress?: string | null;
  destinationSnapshot?: unknown;
  supplyOrigin: PublicSupplyOrigin;
  leadCustody: PublicLeadCustody;
  initialStatus: LeadDeliveryStatus;
  dueAt?: string | Date;
  maxAttempts?: number;
  error?: string | null;
}

export interface ClaimedLeadDeliveryAttempt extends LeadDeliveryAttemptRecord {
  leaseToken: string;
  leaseGeneration: number;
  routingRevision: number;
}

type LeadDatabase = typeof db;
type LeadTransaction = any;
type DeliveryRow = typeof leadDeliveries.$inferSelect;
type AttemptRow = typeof leadDeliveryAttempts.$inferSelect;

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 5 * 60 * 1000;
const DELIVERY_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
const STALE_CLAIM_ERROR = 'Delivery claim expired before completion.';

function asNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : 0;
}

function positiveId(value: unknown): number | null {
  const parsed = asNumber(value);
  return parsed > 0 ? parsed : null;
}

/** UTC wire format accepted by MySQL timestamp(6) columns. */
export function toMySqlDateTime(value: Date | string = new Date()): string {
  // Values read from MySQL are UTC text without a zone suffix. Parse those
  // explicitly so a worker's host TZ cannot change a persisted deadline.
  const date = value instanceof Date ? value : parseMySqlUtcDateTime(value) || new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').replace('Z', '').slice(0, 26);
  const iso = date.toISOString();
  return `${iso.slice(0, 19).replace('T', ' ')}.${iso.slice(20, 23)}000`;
}

/**
 * MySQL returns timestamp text without a zone suffix.  Treat that text as UTC
 * rather than delegating it to the host process parser, whose interpretation
 * changes with TZ.  Microseconds are deliberately truncated to JavaScript's
 * millisecond precision only for comparisons; storage retains all six digits.
 */
export function parseMySqlUtcDateTime(value: Date | string | null | undefined): Date | null {
  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? new Date(value.getTime()) : null;
  }
  const text = String(value || '').trim();
  const matched = text.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?$/,
  );
  if (!matched) return null;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, fraction = ''] = matched;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  const milliseconds = Number(`${fraction}000`.slice(0, 3));
  const instant = Date.UTC(year, month - 1, day, hour, minute, second, milliseconds);
  const parsed = new Date(instant);
  if (
    !Number.isFinite(instant) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day ||
    parsed.getUTCHours() !== hour ||
    parsed.getUTCMinutes() !== minute ||
    parsed.getUTCSeconds() !== second
  ) {
    return null;
  }
  return parsed;
}

function timestampMilliseconds(value: Date | string | null | undefined): number {
  return parseMySqlUtcDateTime(value)?.getTime() ?? Number.NaN;
}

function boundedError(value: string | null | undefined): string | null {
  const normalized = value?.trim();
  return normalized ? normalized.slice(0, 1000) : null;
}

function currentTimestamp(): string {
  return toMySqlDateTime();
}

function retryDueAt(delayMs = DEFAULT_RETRY_DELAY_MS): string {
  return toMySqlDateTime(new Date(Date.now() + delayMs));
}

function recipientIdForDelivery(row: {
  recipientType: string;
  recipientUserId?: number | null;
  recipientAgentId?: number | null;
  recipientAgencyId?: number | null;
  recipientDeveloperOrganisationId?: number | null;
}): number | null {
  if (row.recipientType === 'agent') return positiveId(row.recipientAgentId);
  if (row.recipientType === 'agency') return positiveId(row.recipientAgencyId);
  if (row.recipientType === 'developer') return positiveId(row.recipientDeveloperOrganisationId);
  return positiveId(row.recipientUserId);
}

function assertRecipientShape(input: CreateLeadDeliveryInput): void {
  const user = positiveId(input.recipientUserId);
  const agent = positiveId(input.recipientAgentId);
  const agency = positiveId(input.recipientAgencyId);
  const developer = positiveId(input.recipientDeveloperOrganisationId);

  if (input.recipientType === 'agent') {
    if (!agent || user || agency || developer) {
      throw new Error('Lead delivery agent recipient must use exactly recipientAgentId.');
    }
    return;
  }
  if (input.recipientType === 'agency') {
    if (!agency || user || agent || developer) {
      throw new Error('Lead delivery agency recipient must use exactly recipientAgencyId.');
    }
    return;
  }
  if (input.recipientType === 'developer') {
    if (!developer || user || agent || agency) {
      throw new Error('Lead delivery developer recipient must use recipientDeveloperOrganisationId.');
    }
    return;
  }
  if (input.recipientType === 'manual') {
    if (agent || agency || developer) {
      throw new Error('Manual lead custody cannot carry an agent, agency, or developer recipient.');
    }
    return;
  }
  throw new Error('Lead delivery recipient type is invalid.');
}

function stateForInitialStatus(status: LeadDeliveryStatus): LeadDeliveryState {
  if (status === 'delivered') return 'completed';
  if (status === 'failed') return 'retryable_failed';
  return 'queued';
}

export function publicStatusForDelivery(
  delivery: Pick<LeadDeliveryRecord, 'state' | 'leadCustody'>,
): LeadDeliveryStatus {
  if (delivery.state === 'completed' || delivery.state === 'accepted') return 'delivered';
  if (delivery.state === 'retryable_failed') return 'failed';
  if (delivery.state === 'exhausted' || delivery.state === 'unknown') return 'attention_required';
  if (
    delivery.leadCustody === 'platform_managed' ||
    delivery.leadCustody === 'attention_required' ||
    delivery.state === 'cancelled' ||
    delivery.state === 'superseded'
  ) {
    return 'attention_required';
  }
  return 'pending';
}

function mapDelivery(row: DeliveryRow): LeadDeliveryRecord {
  return {
    id: asNumber(row.id),
    leadId: asNumber(row.leadId),
    purpose: row.purpose as LeadDeliveryPurpose,
    routingRevision: asNumber(row.routingRevision),
    channel: row.channel as LeadDeliveryChannel,
    recipientType: row.recipientType as Exclude<LeadDeliveryRecipientType, 'brand'>,
    recipientId: recipientIdForDelivery(row),
    recipientUserId: positiveId(row.recipientUserId),
    recipientAgentId: positiveId(row.recipientAgentId),
    recipientAgencyId: positiveId(row.recipientAgencyId),
    recipientDeveloperOrganisationId: positiveId(row.recipientDeveloperOrganisationId),
    recipientPublisherId: positiveId(row.recipientPublisherId),
    destinationName: row.destinationName || null,
    destinationAddress: row.destinationAddress || null,
    destinationSnapshot: row.destinationSnapshot ?? null,
    supplyOrigin: row.supplyOrigin as PublicSupplyOrigin,
    leadCustody: row.leadCustody as PublicLeadCustody,
    state: row.state as LeadDeliveryState,
    idempotencyKey: row.idempotencyKey,
    dueAt: String(row.dueAt),
    maxAttempts: asNumber(row.maxAttempts),
    completedAt: row.completedAt ? String(row.completedAt) : null,
    supersededAt: row.supersededAt ? String(row.supersededAt) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

function mapAttempt(row: AttemptRow, delivery: LeadDeliveryRecord): LeadDeliveryAttemptRecord {
  return {
    id: String(row.id),
    leadId: delivery.leadId,
    deliveryId: delivery.id,
    deliveryKey: delivery.idempotencyKey,
    recipientType: delivery.recipientType,
    recipientId: delivery.recipientId,
    recipientPublisherId: delivery.recipientPublisherId,
    channel: delivery.channel,
    status:
      row.state === 'completed' || row.state === 'accepted'
        ? 'delivered'
        : row.state === 'retryable_failed' || row.state === 'expired'
          ? 'failed'
          : row.state === 'unknown' || row.state === 'exhausted'
            ? 'attention_required'
            : 'pending',
    attemptCount: asNumber(row.attemptNumber),
    maxAttempts: delivery.maxAttempts,
    recipientAddress: delivery.destinationAddress,
    providerReference: row.providerReference || null,
    lastError: row.errorMessage || null,
    attemptedAt: row.claimedAt ? String(row.claimedAt) : null,
    deliveredAt: row.completedAt ? String(row.completedAt) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    supplyOrigin: delivery.supplyOrigin,
    leadCustody: delivery.leadCustody,
    leaseToken: row.leaseToken || null,
    leaseGeneration: asNumber(row.leaseGeneration),
    routingRevision: delivery.routingRevision,
    state: row.state as LeadDeliveryAttemptState,
  };
}

async function lockLead(tx: LeadTransaction, leadId: number): Promise<void> {
  await tx.execute(sql`SELECT id FROM leads WHERE id = ${leadId} FOR UPDATE`);
}

/** Locking reads are required after a transaction has established a snapshot.
 * InnoDB's ordinary SELECT can otherwise return the pre-lock version of a row
 * even after a competing worker has committed a state transition. */
async function selectDeliveryForUpdate(
  database: LeadTransaction,
  deliveryId: number,
): Promise<LeadDeliveryRecord | null> {
  const [row] = await database
    .select()
    .from(leadDeliveries)
    .where(eq(leadDeliveries.id, deliveryId))
    .limit(1)
    .for('update');
  return row ? mapDelivery(row) : null;
}

async function selectDeliveryByKeyForUpdate(
  database: LeadTransaction,
  idempotencyKey: string,
): Promise<LeadDeliveryRecord | null> {
  const [row] = await database
    .select()
    .from(leadDeliveries)
    .where(eq(leadDeliveries.idempotencyKey, idempotencyKey))
    .limit(1)
    .for('update');
  return row ? mapDelivery(row) : null;
}

async function selectAttemptForUpdate(
  database: LeadTransaction,
  attemptId: number,
): Promise<AttemptRow | null> {
  const [row] = await database
    .select()
    .from(leadDeliveryAttempts)
    .where(eq(leadDeliveryAttempts.id, attemptId))
    .limit(1)
    .for('update');
  return row || null;
}

async function selectAttempts(
  database: LeadTransaction,
  delivery: LeadDeliveryRecord,
): Promise<LeadDeliveryAttemptRecord[]> {
  const rows = await database
    .select()
    .from(leadDeliveryAttempts)
    .where(eq(leadDeliveryAttempts.deliveryId, delivery.id))
    .orderBy(asc(leadDeliveryAttempts.attemptNumber), asc(leadDeliveryAttempts.id));
  return rows.map(row => mapAttempt(row, delivery));
}

/**
 * Loads the current primary obligation and its append-only history for a set
 * of leads in two bounded queries.  Readers must use this boundary instead of
 * selecting or interpreting a lead-level JSON field.  Rows are sorted by
 * revision first so the first row retained for each lead is authoritative.
 */
export async function getLeadDeliverySnapshotsForLeadIds(input: {
  leadIds: number[];
  database?: LeadDatabase;
}): Promise<Map<number, LeadDeliverySnapshot>> {
  const database = input.database || db;
  const ids = Array.from(
    new Set(input.leadIds.map(value => asNumber(value)).filter(value => value > 0)),
  );
  const snapshots = new Map<number, LeadDeliverySnapshot>();
  if (!ids.length) return snapshots;

  const deliveryRows = await database
    .select()
    .from(leadDeliveries)
    .where(
      and(
        inArray(leadDeliveries.leadId, ids),
        eq(leadDeliveries.purpose, 'primary_custody'),
        ne(leadDeliveries.state, 'superseded'),
        ne(leadDeliveries.state, 'cancelled'),
      ),
    )
    .orderBy(desc(leadDeliveries.routingRevision), desc(leadDeliveries.id));

  const currentByLead = new Map<number, LeadDeliveryRecord>();
  for (const row of deliveryRows) {
    const delivery = mapDelivery(row);
    if (!currentByLead.has(delivery.leadId)) currentByLead.set(delivery.leadId, delivery);
  }

  for (const leadId of ids) {
    const current = currentByLead.get(leadId) || null;
    snapshots.set(leadId, { current, attempts: [] });
  }
  if (!currentByLead.size) return snapshots;

  const deliveryIds = Array.from(currentByLead.values()).map(delivery => delivery.id);
  const attemptRows = await database
    .select()
    .from(leadDeliveryAttempts)
    .where(inArray(leadDeliveryAttempts.deliveryId, deliveryIds))
    .orderBy(asc(leadDeliveryAttempts.attemptNumber), asc(leadDeliveryAttempts.id));
  const attemptsByDelivery = new Map<number, LeadDeliveryAttemptRecord[]>();
  for (const row of attemptRows) {
    const delivery = currentByLead.get(asNumber(row.deliveryId));
    if (!delivery) continue;
    const attempts = attemptsByDelivery.get(delivery.id) || [];
    attempts.push(mapAttempt(row, delivery));
    attemptsByDelivery.set(delivery.id, attempts);
  }
  for (const [leadId, snapshot] of snapshots) {
    if (snapshot.current) {
      snapshot.attempts = attemptsByDelivery.get(snapshot.current.id) || [];
    }
    snapshots.set(leadId, snapshot);
  }
  return snapshots;
}

async function selectLatestAttemptForUpdate(
  database: LeadTransaction,
  delivery: LeadDeliveryRecord,
): Promise<LeadDeliveryAttemptRecord | null> {
  const [row] = await database
    .select()
    .from(leadDeliveryAttempts)
    .where(eq(leadDeliveryAttempts.deliveryId, delivery.id))
    .orderBy(desc(leadDeliveryAttempts.attemptNumber), desc(leadDeliveryAttempts.id))
    .limit(1)
    .for('update');
  return row ? mapAttempt(row, delivery) : null;
}

export async function getCurrentPrimaryDeliveryForUpdateInTransaction(
  tx: LeadTransaction,
  leadId: number,
): Promise<LeadDeliveryRecord | null> {
  const [row] = await tx
    .select()
    .from(leadDeliveries)
    .where(
      and(
        eq(leadDeliveries.leadId, leadId),
        eq(leadDeliveries.purpose, 'primary_custody'),
        ne(leadDeliveries.state, 'superseded'),
        ne(leadDeliveries.state, 'cancelled'),
      ),
    )
    .orderBy(desc(leadDeliveries.routingRevision), desc(leadDeliveries.id))
    .limit(1)
    .for('update');
  return row ? mapDelivery(row) : null;
}

async function selectCompletedAttemptByProviderReference(
  database: LeadTransaction,
  delivery: LeadDeliveryRecord,
  providerReference: string,
): Promise<LeadDeliveryAttemptRecord | null> {
  const [row] = await database
    .select()
    .from(leadDeliveryAttempts)
    .where(
      and(
        eq(leadDeliveryAttempts.deliveryId, delivery.id),
        eq(leadDeliveryAttempts.providerReference, providerReference),
        eq(leadDeliveryAttempts.state, 'completed'),
      ),
    )
    .orderBy(desc(leadDeliveryAttempts.attemptNumber), desc(leadDeliveryAttempts.id))
    .limit(1)
    .for('update');
  return row ? mapAttempt(row, delivery) : null;
}

async function updateLeadSummary(
  tx: LeadTransaction,
  delivery: LeadDeliveryRecord,
  latestAttempt?: LeadDeliveryAttemptRecord | null,
): Promise<void> {
  // `leads` is only a read projection of the current primary custody
  // obligation. Notification and platform-action attempts must never replace
  // the customer-facing custody result for the same lead.
  if (delivery.purpose !== 'primary_custody') return;
  const status = publicStatusForDelivery(delivery);
  await tx
    .update(leads)
    .set({
      deliveryStatus: status,
      deliveryLastAttemptAt: latestAttempt?.attemptedAt || null,
      deliveryNextAttemptAt:
        delivery.state === 'queued' || delivery.state === 'retryable_failed' ? delivery.dueAt : null,
      deliveryLastError: latestAttempt?.lastError || null,
      deliveryProviderReference: latestAttempt?.providerReference || null,
    })
    .where(eq(leads.id, delivery.leadId));
}

function insertValuesForDelivery(input: CreateLeadDeliveryInput, state: LeadDeliveryState) {
  return {
    leadId: input.leadId,
    purpose: input.purpose || 'primary_custody',
    routingRevision: input.routingRevision || 1,
    channel: input.channel,
    recipientType: input.recipientType,
    recipientUserId: positiveId(input.recipientUserId),
    recipientAgentId: positiveId(input.recipientAgentId),
    recipientAgencyId: positiveId(input.recipientAgencyId),
    recipientDeveloperOrganisationId: positiveId(input.recipientDeveloperOrganisationId),
    recipientPublisherId: positiveId(input.recipientPublisherId),
    destinationName: input.destinationName?.trim() || null,
    destinationAddress: input.destinationAddress?.trim() || null,
    destinationSnapshot: input.destinationSnapshot ?? null,
    supplyOrigin: input.supplyOrigin,
    leadCustody: input.leadCustody,
    state,
    idempotencyKey: input.idempotencyKey,
    dueAt: toMySqlDateTime(input.dueAt || new Date()),
    maxAttempts: Math.min(Math.max(Math.floor(input.maxAttempts || DEFAULT_MAX_ATTEMPTS), 1), 20),
    completedAt: state === 'completed' ? currentTimestamp() : null,
  };
}

/** Inserts a delivery in the caller's existing transaction. */
export async function createLeadDeliveryInTransaction(
  tx: LeadTransaction,
  input: CreateLeadDeliveryInput,
): Promise<{ delivery: LeadDeliveryRecord; attempt: LeadDeliveryAttemptRecord | null; duplicate: boolean }> {
  assertRecipientShape(input);
  const existing = await selectDeliveryByKeyForUpdate(tx, input.idempotencyKey);
  if (existing) {
    return { delivery: existing, attempt: await selectLatestAttemptForUpdate(tx, existing), duplicate: true };
  }

  const state = stateForInitialStatus(input.initialStatus);
  const values = insertValuesForDelivery(input, state);
  const [result] = await tx.insert(leadDeliveries).values(values as any);
  const deliveryId = asNumber((result as any)?.insertId);
  if (!deliveryId) throw new Error('Lead delivery insert did not return a durable identifier.');
  const delivery = (await selectDeliveryForUpdate(tx, deliveryId)) || ({
    id: deliveryId,
    ...values,
    recipientId: recipientIdForDelivery(values),
    completedAt: values.completedAt,
    supersededAt: null,
    createdAt: currentTimestamp(),
    updatedAt: currentTimestamp(),
  } as LeadDeliveryRecord);

  let attempt: LeadDeliveryAttemptRecord | null = null;
  if (state === 'completed' || state === 'retryable_failed') {
    const timestamp = currentTimestamp();
    const attemptState: LeadDeliveryAttemptState = state === 'completed' ? 'completed' : 'retryable_failed';
    const [attemptResult] = await tx.insert(leadDeliveryAttempts).values({
      deliveryId,
      attemptNumber: 1,
      state: attemptState,
      acceptedAt: state === 'completed' ? timestamp : null,
      completedAt: state === 'completed' ? timestamp : null,
      errorMessage: state === 'retryable_failed' ? boundedError(input.error) : null,
    } as any);
    const attemptId = asNumber((attemptResult as any)?.insertId);
    const [attemptRow] = attemptId
      ? await tx.select().from(leadDeliveryAttempts).where(eq(leadDeliveryAttempts.id, attemptId)).limit(1)
      : [];
    if (attemptRow) attempt = mapAttempt(attemptRow, delivery);
  }

  await updateLeadSummary(tx, delivery, attempt);
  return { delivery, attempt, duplicate: false };
}

export async function recordInitialLeadDelivery(input: CreateLeadDeliveryInput & { database?: LeadDatabase }) {
  const database = input.database || db;
  return database.transaction(async (tx: LeadTransaction) => {
    await lockLead(tx, input.leadId);
    return createLeadDeliveryInTransaction(tx, input);
  });
}

async function ensureQueuedAttemptInTransaction(
  tx: LeadTransaction,
  delivery: LeadDeliveryRecord,
): Promise<LeadDeliveryAttemptRecord | null> {
  const latest = await selectLatestAttemptForUpdate(tx, delivery);
  if (latest?.state === 'queued') return latest;
  if (latest?.state === 'claimed') return null;
  if (latest && latest.attemptCount >= delivery.maxAttempts) {
    const exhausted = { ...delivery, state: 'exhausted' as const };
    await tx.update(leadDeliveries).set({ state: 'exhausted' }).where(eq(leadDeliveries.id, delivery.id));
    await updateLeadSummary(tx, exhausted, latest);
    return null;
  }

  const attemptNumber = (latest?.attemptCount || 0) + 1;
  const [result] = await tx.insert(leadDeliveryAttempts).values({
    deliveryId: delivery.id, attemptNumber, state: 'queued',
  } as any);
  const attemptId = asNumber((result as any)?.insertId);
  const [row] = attemptId
    ? await tx.select().from(leadDeliveryAttempts).where(eq(leadDeliveryAttempts.id, attemptId)).limit(1)
    : [];
  return row ? mapAttempt(row, delivery) : null;
}

/** Claims one due delivery attempt and commits the lease before provider work. */
export async function claimLeadDeliveryAttempt(input: {
  leadId?: number;
  deliveryId?: number;
  attemptId?: string | number;
  database?: LeadDatabase;
  leaseTimeoutMs?: number;
}): Promise<ClaimedLeadDeliveryAttempt | null> {
  const database = input.database || db;
  return database.transaction(async (tx: LeadTransaction) => {
    let delivery: LeadDeliveryRecord | null = input.deliveryId ? await selectDeliveryForUpdate(tx, input.deliveryId) : null;
    if (!delivery && input.attemptId) {
      const [attempt] = await tx.select({ deliveryId: leadDeliveryAttempts.deliveryId }).from(leadDeliveryAttempts)
        .where(eq(leadDeliveryAttempts.id, asNumber(input.attemptId))).limit(1);
      if (attempt) delivery = await selectDeliveryForUpdate(tx, asNumber(attempt.deliveryId));
    }
    if (!delivery && input.leadId) delivery = await getCurrentPrimaryDeliveryForUpdateInTransaction(tx, input.leadId);
    if (!delivery || delivery.state !== 'queued') return null;

    // `delivery` came from a locking read above. Re-read through the same
    // current-read path after any preliminary lookup to avoid a stale snapshot.
    delivery = await selectDeliveryForUpdate(tx, delivery.id);
    const dueAtMs = delivery ? timestampMilliseconds(delivery.dueAt) : Number.NaN;
    if (!delivery || delivery.state !== 'queued' || !Number.isFinite(dueAtMs) || dueAtMs > Date.now()) return null;

    let attempt: LeadDeliveryAttemptRecord | null = null;
    if (input.attemptId) {
      const row = await selectAttemptForUpdate(tx, asNumber(input.attemptId));
      attempt = row && asNumber(row.deliveryId) === delivery.id ? mapAttempt(row, delivery) : null;
    }
    if (!attempt) attempt = await ensureQueuedAttemptInTransaction(tx, delivery);
    if (!attempt || attempt.state !== 'queued') return null;

    const timestamp = currentTimestamp();
    const leaseToken = randomUUID();
    const leaseGeneration = (attempt.leaseGeneration || 0) + 1;
    const leaseExpiresAt = toMySqlDateTime(new Date(Date.now() + Math.max(1_000, input.leaseTimeoutMs || DELIVERY_CLAIM_TIMEOUT_MS)));
    await tx.update(leadDeliveryAttempts).set({
      state: 'claimed', leaseToken, leaseGeneration, claimedAt: timestamp, leaseExpiresAt,
      errorCode: null, errorMessage: null,
    }).where(and(eq(leadDeliveryAttempts.id, asNumber(attempt.id)), eq(leadDeliveryAttempts.state, 'queued')));
    await tx.update(leadDeliveries).set({ state: 'claimed' })
      .where(and(eq(leadDeliveries.id, delivery.id), eq(leadDeliveries.state, 'queued')));

    const claimedDelivery = { ...delivery, state: 'claimed' as const };
    const claimedRow = await selectAttemptForUpdate(tx, asNumber(attempt.id));
    if (!claimedRow || claimedRow.leaseToken !== leaseToken) return null;
    const claimed = mapAttempt(claimedRow, claimedDelivery) as ClaimedLeadDeliveryAttempt;
    if (!claimed.leaseToken) return null;
    await updateLeadSummary(tx, claimedDelivery, claimed);
    return claimed;
  });
}

function resultStateForLegacyStatus(status: LeadDeliveryStatus): LeadDeliveryAttemptState {
  if (status === 'delivered') return 'completed';
  if (status === 'failed') return 'retryable_failed';
  if (status === 'attention_required') return 'unknown';
  return 'accepted';
}

/** Fenced completion: the active attempt, lease token, and routing revision must still match. */
export async function updateLeadDeliveryAttempt(input: {
  leadId?: number;
  deliveryId?: number;
  attemptId: string | number;
  status: LeadDeliveryStatus;
  leaseToken?: string;
  routingRevision?: number;
  providerReference?: string | null;
  error?: string | null;
  database?: LeadDatabase;
}): Promise<LeadDeliveryAttemptRecord | null> {
  const database = input.database || db;
  return database.transaction(async (tx: LeadTransaction) => {
    const attemptId = asNumber(input.attemptId);
    const [attemptRow] = await tx.select().from(leadDeliveryAttempts).where(eq(leadDeliveryAttempts.id, attemptId)).limit(1);
    if (!attemptRow) return null;
    const delivery = await selectDeliveryForUpdate(tx, asNumber(attemptRow.deliveryId));
    if (!delivery || (input.deliveryId && delivery.id !== input.deliveryId) || (input.leadId && delivery.leadId !== input.leadId)) return null;

    const lockedAttempt = await selectAttemptForUpdate(tx, attemptId);
    const lockedDelivery = await selectDeliveryForUpdate(tx, delivery.id);
    if (!lockedAttempt || !lockedDelivery || lockedDelivery.state !== 'claimed') return null;
    if (input.routingRevision !== undefined && lockedDelivery.routingRevision !== input.routingRevision) return null;
    if (lockedAttempt.state !== 'claimed' || !lockedAttempt.leaseToken || !input.leaseToken || lockedAttempt.leaseToken !== input.leaseToken) return null;
    const leaseExpiry = timestampMilliseconds(lockedAttempt.leaseExpiresAt);
    if (!Number.isFinite(leaseExpiry) || leaseExpiry <= Date.now()) return null;

    const attemptState = resultStateForLegacyStatus(input.status);
    const timestamp = currentTimestamp();
    const attemptNumber = asNumber(lockedAttempt.attemptNumber);
    const exhausted = attemptState === 'retryable_failed' && attemptNumber >= lockedDelivery.maxAttempts;
    const deliveryState: LeadDeliveryState = attemptState === 'completed' ? 'completed'
      : attemptState === 'accepted' ? 'accepted'
      : attemptState === 'retryable_failed' ? (exhausted ? 'exhausted' : 'queued')
      : 'unknown';
    const dueAt = attemptState === 'retryable_failed' && !exhausted ? retryDueAt() : lockedDelivery.dueAt;
    await tx.update(leadDeliveryAttempts).set({
      state: attemptState,
      acceptedAt: attemptState === 'accepted' || attemptState === 'completed' ? timestamp : null,
      completedAt: attemptState === 'completed' ? timestamp : null,
      providerReference: input.providerReference ?? lockedAttempt.providerReference ?? null,
      errorCode: attemptState === 'retryable_failed'
        ? exhausted
          ? 'retry_budget_exhausted'
          : 'provider_rejected'
        : attemptState === 'unknown'
          ? 'provider_unknown'
          : null,
      errorMessage: boundedError(input.error),
    }).where(and(eq(leadDeliveryAttempts.id, attemptId), eq(leadDeliveryAttempts.leaseToken, input.leaseToken)));
    await tx.update(leadDeliveries).set({
      state: deliveryState, dueAt, completedAt: deliveryState === 'completed' ? timestamp : null,
    }).where(and(eq(leadDeliveries.id, lockedDelivery.id), eq(leadDeliveries.state, 'claimed')));

    const nextDelivery = { ...lockedDelivery, state: deliveryState, dueAt,
      completedAt: deliveryState === 'completed' ? timestamp : lockedDelivery.completedAt };
    const nextAttemptRow = await selectAttemptForUpdate(tx, attemptId);
    if (!nextAttemptRow) return null;
    const nextAttempt = mapAttempt(nextAttemptRow, nextDelivery);
    await updateLeadSummary(tx, nextDelivery, nextAttempt);
    return nextAttempt;
  });
}

/** Queues the next bounded retry after a failed or expired attempt. */
export async function appendLeadDeliveryRetryAttempt(input: {
  leadId?: number;
  deliveryId?: number;
  deliveryKey?: string;
  dueAt?: string | Date;
  database?: LeadDatabase;
}): Promise<LeadDeliveryAttemptRecord | null> {
  const database = input.database || db;
  return database.transaction(async (tx: LeadTransaction) => {
    let delivery: LeadDeliveryRecord | null = input.deliveryId ? await selectDeliveryForUpdate(tx, input.deliveryId) : null;
    if (!delivery && input.deliveryKey) delivery = await selectDeliveryByKeyForUpdate(tx, input.deliveryKey);
    if (!delivery && input.leadId) delivery = await getCurrentPrimaryDeliveryForUpdateInTransaction(tx, input.leadId);
    if (!delivery) return null;
    delivery = await selectDeliveryForUpdate(tx, delivery.id);
    if (!delivery || ['completed', 'accepted', 'cancelled', 'superseded', 'unknown', 'exhausted'].includes(delivery.state)) return null;
    const latest = await selectLatestAttemptForUpdate(tx, delivery);
    if (latest?.state === 'claimed') return null;
    if (latest && !['retryable_failed', 'expired'].includes(latest.state || '')) return null;
    if (latest && latest.attemptCount >= delivery.maxAttempts) {
      const exhausted = { ...delivery, state: 'exhausted' as const };
      await tx.update(leadDeliveries).set({ state: 'exhausted' }).where(eq(leadDeliveries.id, delivery.id));
      await updateLeadSummary(tx, exhausted, latest);
      return null;
    }
    const dueAt = toMySqlDateTime(input.dueAt || new Date());
    const queued = { ...delivery, state: 'queued' as const, dueAt };
    await tx.update(leadDeliveries).set({ state: 'queued', dueAt }).where(eq(leadDeliveries.id, delivery.id));
    const attempt = await ensureQueuedAttemptInTransaction(tx, queued);
    await updateLeadSummary(tx, queued, latest);
    return attempt;
  });
}

/** An expired claim has an ambiguous provider outcome and requires reconciliation. */
export async function recoverExpiredLeadDeliveryAttempts(input: {
  database?: LeadDatabase;
  limit?: number;
  now?: Date;
} = {}): Promise<{ recovered: number; unknown: number }> {
  const database = input.database || db;
  const now = input.now || new Date();
  const rows = await database.select({ id: leadDeliveryAttempts.id, deliveryId: leadDeliveryAttempts.deliveryId }).from(leadDeliveryAttempts)
    .where(and(eq(leadDeliveryAttempts.state, 'claimed'), lte(leadDeliveryAttempts.leaseExpiresAt, toMySqlDateTime(now))))
    .orderBy(asc(leadDeliveryAttempts.leaseExpiresAt), asc(leadDeliveryAttempts.id))
    .limit(Math.min(Math.max(input.limit || 50, 1), 250));

  let recovered = 0;
  let unknown = 0;
  for (const candidate of rows) {
    const outcome = await database.transaction(async (tx: LeadTransaction) => {
      const delivery = await selectDeliveryForUpdate(tx, asNumber(candidate.deliveryId));
      if (!delivery) return 'none' as const;
      const lockedAttempt = await selectAttemptForUpdate(tx, asNumber(candidate.id));
      const lockedDelivery = await selectDeliveryForUpdate(tx, delivery.id);
      const leaseExpiry = lockedAttempt ? timestampMilliseconds(lockedAttempt.leaseExpiresAt) : Number.NaN;
      if (!lockedAttempt || !lockedDelivery || lockedDelivery.state !== 'claimed' || lockedAttempt.state !== 'claimed' || !Number.isFinite(leaseExpiry) || leaseExpiry > now.getTime()) return 'none' as const;

      // A process may have died after provider acceptance. Lease expiry alone
      // never authorizes another external invocation.
      await tx.update(leadDeliveryAttempts).set({
        state: 'unknown', errorCode: 'lease_expired_outcome_unknown', errorMessage: STALE_CLAIM_ERROR,
      }).where(eq(leadDeliveryAttempts.id, asNumber(candidate.id)));
      const uncertainDelivery = { ...lockedDelivery, state: 'unknown' as const };
      const uncertainAttempt = mapAttempt({ ...lockedAttempt, state: 'unknown', errorMessage: STALE_CLAIM_ERROR } as AttemptRow, uncertainDelivery);
      await tx.update(leadDeliveries).set({ state: 'unknown' }).where(eq(leadDeliveries.id, lockedDelivery.id));
      await updateLeadSummary(tx, uncertainDelivery, uncertainAttempt);
      return 'unknown' as const;
    });
    if (outcome === 'unknown') { recovered += 1; unknown += 1; }
  }
  return { recovered, unknown };
}

export type LeadDeliveryDispatcher = (claim: ClaimedLeadDeliveryAttempt) => Promise<
  | { status: 'delivered' | 'pending'; providerReference?: string | null }
  | { status: 'failed' | 'attention_required'; error: string; providerReference?: string | null }
>;

/** Runnable worker primitive: recover, claim, call provider outside tx, fence completion. */
export async function runLeadDeliveryWorker(input: {
  dispatcher: LeadDeliveryDispatcher;
  database?: LeadDatabase;
  limit?: number;
  leadId?: number;
}): Promise<{ claimed: number; completed: number; failed: number; unknown: number; recovered: number }> {
  const database = input.database || db;
  const limit = Math.min(Math.max(input.limit || 25, 1), 100);
  const recovery = await recoverExpiredLeadDeliveryAttempts({ database, limit });
  const due = await database.select({ id: leadDeliveries.id }).from(leadDeliveries)
    .where(and(
      eq(leadDeliveries.state, 'queued'),
      lte(leadDeliveries.dueAt, currentTimestamp()),
      ...(input.leadId === undefined ? [] : [eq(leadDeliveries.leadId, input.leadId)]),
    ))
    .orderBy(asc(leadDeliveries.dueAt), asc(leadDeliveries.id)).limit(limit);
  let claimed = 0;
  let completed = 0;
  let failed = 0;
  let unknown = recovery.unknown;
  for (const row of due) {
    const claim = await claimLeadDeliveryAttempt({ database, deliveryId: asNumber(row.id) });
    if (!claim) continue;
    claimed += 1;
    try {
      const result = await input.dispatcher(claim);
      const updated = await updateLeadDeliveryAttempt({
        database, deliveryId: claim.deliveryId, attemptId: claim.id, leaseToken: claim.leaseToken,
        routingRevision: claim.routingRevision, status: result.status, providerReference: result.providerReference,
        error: 'error' in result ? result.error : null,
      });
      if (updated?.status === 'delivered') completed += 1;
      else if (updated?.status === 'failed') failed += 1;
      else unknown += 1;
    } catch (error) {
      const updated = await updateLeadDeliveryAttempt({
        database, deliveryId: claim.deliveryId, attemptId: claim.id, leaseToken: claim.leaseToken,
        routingRevision: claim.routingRevision, status: 'attention_required',
        error: error instanceof Error ? error.message : 'Provider outcome is unknown.',
      });
      if (updated) unknown += 1;
    }
  }
  return { claimed, completed, failed, unknown, recovered: recovery.recovered };
}

export async function getCurrentPrimaryDeliveryInTransaction(
  tx: LeadTransaction,
  leadId: number,
): Promise<LeadDeliveryRecord | null> {
  const [row] = await tx.select().from(leadDeliveries).where(and(
    eq(leadDeliveries.leadId, leadId), eq(leadDeliveries.purpose, 'primary_custody'),
    ne(leadDeliveries.state, 'superseded'), ne(leadDeliveries.state, 'cancelled'),
  )).orderBy(desc(leadDeliveries.routingRevision), desc(leadDeliveries.id)).limit(1);
  return row ? mapDelivery(row) : null;
}

export async function getLeadDeliverySnapshot(input: {
  leadId: number;
  database?: LeadDatabase;
}): Promise<LeadDeliverySnapshot> {
  const database = input.database || db;
  const current = await getCurrentPrimaryDeliveryInTransaction(database, input.leadId);
  if (!current) return { current: null, attempts: [] };
  return { current, attempts: await selectAttempts(database, current) };
}

/** Supersedes current custody and creates one new routing revision atomically. */
export async function supersedePrimaryDeliveryInTransaction(
  tx: LeadTransaction,
  input: Omit<CreateLeadDeliveryInput, 'purpose' | 'routingRevision'>,
): Promise<{ delivery: LeadDeliveryRecord; attempt: LeadDeliveryAttemptRecord | null; duplicate: boolean }> {
  await lockLead(tx, input.leadId);
  const existing = await selectDeliveryByKeyForUpdate(tx, input.idempotencyKey);
  if (existing) return { delivery: existing, attempt: await selectLatestAttemptForUpdate(tx, existing), duplicate: true };
  const current = await getCurrentPrimaryDeliveryForUpdateInTransaction(tx, input.leadId);
  if (current) {
    await tx.update(leadDeliveries).set({ state: 'superseded', supersededAt: currentTimestamp() })
      .where(eq(leadDeliveries.id, current.id));
  }
  return createLeadDeliveryInTransaction(tx, {
    ...input, purpose: 'primary_custody', routingRevision: (current?.routingRevision || 0) + 1,
  });
}

/** Records an operations action as a completed attempt on current platform custody. */
export async function completePlatformDeliveryInTransaction(
  tx: LeadTransaction,
  input: { leadId: number; actionKey: string },
): Promise<{ delivery: LeadDeliveryRecord; attempt: LeadDeliveryAttemptRecord; duplicate: boolean }> {
  await lockLead(tx, input.leadId);
  const delivery = await getCurrentPrimaryDeliveryForUpdateInTransaction(tx, input.leadId);
  if (!delivery || delivery.recipientType !== 'manual' || delivery.leadCustody !== 'platform_managed') {
    throw new Error('Only current platform-managed custody may be completed by operations.');
  }
  const lockedDelivery = await selectDeliveryForUpdate(tx, delivery.id);
  if (!lockedDelivery) throw new Error('Current platform delivery disappeared during completion.');
  const latest = await selectLatestAttemptForUpdate(tx, lockedDelivery);
  const priorAction = await selectCompletedAttemptByProviderReference(tx, lockedDelivery, input.actionKey);
  if (priorAction) return { delivery: lockedDelivery, attempt: priorAction, duplicate: true };
  const attemptNumber = (latest?.attemptCount || 0) + 1;
  const timestamp = currentTimestamp();
  const [result] = await tx.insert(leadDeliveryAttempts).values({
    deliveryId: lockedDelivery.id, attemptNumber, state: 'completed', acceptedAt: timestamp,
    completedAt: timestamp, providerReference: input.actionKey,
  } as any);
  const attemptId = asNumber((result as any)?.insertId);
  const [attemptRow] = await tx.select().from(leadDeliveryAttempts).where(eq(leadDeliveryAttempts.id, attemptId)).limit(1);
  if (!attemptRow) throw new Error('Platform action attempt was not persisted.');
  const completedDelivery = { ...lockedDelivery, state: 'completed' as const, completedAt: timestamp };
  await tx.update(leadDeliveries).set({ state: 'completed', completedAt: timestamp }).where(eq(leadDeliveries.id, lockedDelivery.id));
  const attempt = mapAttempt(attemptRow, completedDelivery);
  await updateLeadSummary(tx, completedDelivery, attempt);
  return { delivery: completedDelivery, attempt, duplicate: false };
}

export const deliveryRecoveryConstants = {
  defaultMaxAttempts: DEFAULT_MAX_ATTEMPTS,
  claimTimeoutMs: DELIVERY_CLAIM_TIMEOUT_MS,
  staleClaimError: STALE_CLAIM_ERROR,
};
