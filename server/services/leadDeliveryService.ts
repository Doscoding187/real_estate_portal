import { eq, sql } from 'drizzle-orm';
import { db } from '../db';
import { leads } from '../../drizzle/schema';
import type {
  PublicLeadCustody,
  PublicLeadRecipientType,
  PublicSupplyOrigin,
} from './publicLeadCustodyService';

export type LeadDeliveryStatus = 'pending' | 'delivered' | 'failed' | 'attention_required';
export type LeadDeliveryChannel = 'crm_export' | 'email' | 'manual' | 'none';
export type LeadDeliveryRecipientType = PublicLeadRecipientType | 'brand';

export interface LeadDeliveryAttemptRecord {
  id: string;
  deliveryKey: string;
  recipientType: LeadDeliveryRecipientType;
  recipientId: number | null;
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
}

type LeadDatabase = typeof db;
type LeadTransaction = any;

const DEFAULT_MAX_ATTEMPTS = 3;
const DELIVERY_CLAIM_TIMEOUT_MS = 10 * 60 * 1000;
const STALE_CLAIM_ERROR = 'Delivery claim expired before completion.';

/**
 * MySQL TIMESTAMP columns reject the ISO `T`/`Z` form when strict SQL mode is
 * enabled. Keep API-facing records as strings, but write database-compatible
 * UTC values at this persistence boundary.
 */
export function toMySqlDateTime(value: Date | string = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).replace('T', ' ').slice(0, 19);
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function createAttemptId(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `delivery_${Date.now()}_${random}`;
}

export function parseDeliveryAttempts(value: unknown): LeadDeliveryAttemptRecord[] {
  if (!Array.isArray(value)) return [];

  return value.filter((attempt): attempt is LeadDeliveryAttemptRecord => {
    if (!attempt || typeof attempt !== 'object') return false;
    const candidate = attempt as Record<string, unknown>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.deliveryKey === 'string' &&
      typeof candidate.channel === 'string' &&
      typeof candidate.status === 'string'
    );
  });
}

function summaryPatch(
  status: LeadDeliveryStatus,
  attempts: LeadDeliveryAttemptRecord[],
): Partial<typeof leads.$inferInsert> {
  const last = attempts[attempts.length - 1];
  return {
    deliveryStatus: status,
    deliveryAttempts: attempts as any,
    deliveryLastAttemptAt: last?.attemptedAt ? toMySqlDateTime(last.attemptedAt) : null,
    deliveryNextAttemptAt:
      status === 'failed' && last && last.attemptCount < last.maxAttempts
        ? toMySqlDateTime(new Date(Date.now() + 5 * 60 * 1000))
        : null,
    deliveryLastError: last?.lastError || null,
    deliveryProviderReference: last?.providerReference || null,
  };
}

async function lockLead(tx: LeadTransaction, leadId: number) {
  // The row lock is deliberately acquired before reading JSON attempt state.
  // No external provider call is made while this transaction is open.
  await tx.execute(sql`SELECT id FROM leads WHERE id = ${leadId} FOR UPDATE`);
  const [lead] = await tx
    .select({ deliveryAttempts: leads.deliveryAttempts })
    .from(leads)
    .where(eq(leads.id, leadId))
    .limit(1);
  return lead || null;
}

function isStaleClaim(attempt: LeadDeliveryAttemptRecord): boolean {
  if (attempt.status !== 'pending' || !attempt.attemptedAt) return false;
  const claimedAt = new Date(attempt.attemptedAt).getTime();
  return Number.isFinite(claimedAt) && Date.now() - claimedAt >= DELIVERY_CLAIM_TIMEOUT_MS;
}

export async function recordInitialLeadDeliveryAttempt(input: {
  leadId: number;
  deliveryKey: string;
  recipientType: LeadDeliveryRecipientType;
  recipientId?: number | null;
  channel: LeadDeliveryChannel;
  status: LeadDeliveryStatus;
  recipientAddress?: string | null;
  maxAttempts?: number;
  supplyOrigin?: PublicSupplyOrigin;
  leadCustody?: PublicLeadCustody;
  error?: string | null;
  database?: LeadDatabase;
}): Promise<LeadDeliveryAttemptRecord> {
  const database = input.database || db;

  return database.transaction(async (tx: LeadTransaction) => {
    const lead = await lockLead(tx, input.leadId);
    if (!lead) throw new Error(`Lead ${input.leadId} not found while recording delivery intent.`);

    const attempts = parseDeliveryAttempts(lead.deliveryAttempts);
    const existing = [...attempts]
      .reverse()
      .find(attempt => attempt.deliveryKey === input.deliveryKey);
    if (existing) return existing;

    const timestamp = toMySqlDateTime();
    const attempt: LeadDeliveryAttemptRecord = {
      id: createAttemptId(),
      deliveryKey: input.deliveryKey,
      recipientType: input.recipientType,
      recipientId: input.recipientId ?? null,
      channel: input.channel,
      status: input.status,
      attemptCount: 1,
      maxAttempts: input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      recipientAddress: input.recipientAddress ?? null,
      providerReference: null,
      lastError: input.error ?? null,
      attemptedAt: input.status === 'pending' ? null : timestamp,
      deliveredAt: input.status === 'delivered' ? timestamp : null,
      createdAt: timestamp,
      updatedAt: timestamp,
      supplyOrigin: input.supplyOrigin,
      leadCustody: input.leadCustody,
    };

    const nextAttempts = [...attempts, attempt];
    await tx
      .update(leads)
      .set(summaryPatch(input.status, nextAttempts))
      .where(eq(leads.id, input.leadId));

    return attempt;
  });
}

/**
 * Claims a pending attempt under the lead row lock. The claim is committed
 * before any provider call, so concurrent workers cannot both notify a
 * recipient. A stale claim remains visible and can be advanced through the
 * bounded retry path.
 */
export async function claimLeadDeliveryAttempt(input: {
  leadId: number;
  attemptId: string;
  database?: LeadDatabase;
}): Promise<LeadDeliveryAttemptRecord | null> {
  const database = input.database || db;

  return database.transaction(async (tx: LeadTransaction) => {
    const lead = await lockLead(tx, input.leadId);
    if (!lead) return null;

    const attempts = parseDeliveryAttempts(lead.deliveryAttempts);
    const index = attempts.findIndex(attempt => attempt.id === input.attemptId);
    if (index < 0) return null;

    const current = attempts[index];
    if (current.status !== 'pending' || current.attemptedAt) return null;

    const timestamp = toMySqlDateTime();
    const claimed: LeadDeliveryAttemptRecord = {
      ...current,
      attemptedAt: timestamp,
      updatedAt: timestamp,
    };
    attempts[index] = claimed;

    await tx
      .update(leads)
      .set(summaryPatch('pending', attempts))
      .where(eq(leads.id, input.leadId));

    return claimed;
  });
}

export async function updateLeadDeliveryAttempt(input: {
  leadId: number;
  attemptId: string;
  status: LeadDeliveryStatus;
  providerReference?: string | null;
  error?: string | null;
  database?: LeadDatabase;
}): Promise<LeadDeliveryAttemptRecord | null> {
  const database = input.database || db;

  return database.transaction(async (tx: LeadTransaction) => {
    const lead = await lockLead(tx, input.leadId);
    if (!lead) return null;

    const attempts = parseDeliveryAttempts(lead.deliveryAttempts);
    const index = attempts.findIndex(attempt => attempt.id === input.attemptId);
    if (index < 0) return null;

    const current = attempts[index];
    if (current.status === 'delivered' || current.status === 'failed' || current.status === 'attention_required') {
      return current;
    }

    const timestamp = toMySqlDateTime();
    const next: LeadDeliveryAttemptRecord = {
      ...current,
      status: input.status,
      providerReference: input.providerReference ?? current.providerReference ?? null,
      lastError: input.error ?? (input.status === 'failed' ? current.lastError : null),
      attemptedAt: current.attemptedAt || timestamp,
      deliveredAt: input.status === 'delivered' ? timestamp : current.deliveredAt,
      updatedAt: timestamp,
    };
    attempts[index] = next;

    const latestStatus = attempts[attempts.length - 1]?.status || input.status;
    await tx
      .update(leads)
      .set(summaryPatch(latestStatus, attempts))
      .where(eq(leads.id, input.leadId));

    return next;
  });
}

export async function appendLeadDeliveryRetryAttempt(input: {
  leadId: number;
  deliveryKey: string;
  database?: LeadDatabase;
}): Promise<LeadDeliveryAttemptRecord | null> {
  const database = input.database || db;

  return database.transaction(async (tx: LeadTransaction) => {
    const lead = await lockLead(tx, input.leadId);
    if (!lead) return null;

    const attempts = parseDeliveryAttempts(lead.deliveryAttempts);
    const previousIndex = [...attempts]
      .map((attempt, index) => ({ attempt, index }))
      .reverse()
      .find(({ attempt }) => attempt.deliveryKey === input.deliveryKey)?.index;
    if (previousIndex === undefined) return null;

    const previous = attempts[previousIndex];
    if (previous.status === 'delivered' || previous.attemptCount >= previous.maxAttempts) {
      return null;
    }

    if (previous.status === 'pending') {
      if (!isStaleClaim(previous)) return null;
      const staleTimestamp = toMySqlDateTime();
      attempts[previousIndex] = {
        ...previous,
        status: 'failed',
        lastError: STALE_CLAIM_ERROR,
        updatedAt: staleTimestamp,
        attemptedAt: previous.attemptedAt || staleTimestamp,
      };
    } else if (previous.status !== 'failed') {
      return null;
    }

    const timestamp = toMySqlDateTime();
    const retry: LeadDeliveryAttemptRecord = {
      ...attempts[previousIndex],
      id: createAttemptId(),
      status: 'pending',
      attemptCount: previous.attemptCount + 1,
      providerReference: null,
      lastError: null,
      attemptedAt: null,
      deliveredAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    attempts.push(retry);

    await tx
      .update(leads)
      .set(summaryPatch('pending', attempts))
      .where(eq(leads.id, input.leadId));

    return retry;
  });
}

export const deliveryRecoveryConstants = {
  defaultMaxAttempts: DEFAULT_MAX_ATTEMPTS,
  claimTimeoutMs: DELIVERY_CLAIM_TIMEOUT_MS,
  staleClaimError: STALE_CLAIM_ERROR,
};
