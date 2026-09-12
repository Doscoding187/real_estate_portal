import { and, eq, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { billingProviderEvents } from '../../drizzle/schema';
import { getDb } from '../db-connection';

function mysqlTimestamp(value = new Date()): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function normalizeIdentity(value: string, field: string, maxLength: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    throw new Error(`Invalid billing provider ${field}.`);
  }
  return normalized;
}

export type BillingProviderEventStatus =
  | 'received'
  | 'processing'
  | 'applied'
  | 'ignored'
  | 'failed';

export async function recordBillingProviderEvent(input: {
  provider: string;
  providerEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  occurredAt?: string | null;
  maxAttempts?: number;
}) {
  const provider = normalizeIdentity(input.provider, 'name', 40);
  const providerEventId = normalizeIdentity(input.providerEventId, 'event identity', 255);
  const eventType = normalizeIdentity(input.eventType, 'event type', 120);
  if (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) {
    throw new Error('Billing provider event payload must be an object.');
  }
  const maxAttempts = input.maxAttempts ?? 3;
  if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    throw new Error('Billing provider event max attempts must be between 1 and 10.');
  }
  let occurredAt: string | null = null;
  if (input.occurredAt != null) {
    const parsed = new Date(input.occurredAt);
    if (Number.isNaN(parsed.getTime())) throw new Error('Invalid billing provider event timestamp.');
    occurredAt = mysqlTimestamp(parsed);
  }
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  try {
    const [result] = await db.insert(billingProviderEvents).values({
      provider,
      providerEventId,
      eventType,
      payload: input.payload,
      occurredAt,
      maxAttempts,
    });
    const [event] = await db
      .select()
      .from(billingProviderEvents)
      .where(eq(billingProviderEvents.id, Number(result.insertId)))
      .limit(1);
    if (!event) throw new Error('Provider event could not be read after insertion');
    return { event, duplicate: false };
  } catch (error: any) {
    if (Number(error?.errno) !== 1062 && error?.code !== 'ER_DUP_ENTRY') throw error;
    const [event] = await db
      .select()
      .from(billingProviderEvents)
      .where(
        and(
          eq(billingProviderEvents.provider, provider),
          eq(billingProviderEvents.providerEventId, providerEventId),
        ),
      )
      .limit(1);
    if (!event) throw error;
    return { event, duplicate: true };
  }
}

/** Claims an event exactly once; failed events may be retried by a supervisor. */
export async function claimBillingProviderEvent(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return db.transaction(async tx => {
    const [event] = await tx
      .select()
      .from(billingProviderEvents)
      .where(
        and(
          eq(billingProviderEvents.id, eventId),
          sql`(
            (${billingProviderEvents.status} IN ('received', 'failed')
              AND ${billingProviderEvents.nextAttemptAt} <= UTC_TIMESTAMP())
            OR (${billingProviderEvents.status} = 'processing'
              AND ${billingProviderEvents.claimExpiresAt} IS NOT NULL
              AND ${billingProviderEvents.claimExpiresAt} <= UTC_TIMESTAMP())
          )`,
        ),
      )
      .for('update')
      .limit(1);
    if (!event || event.attemptCount >= event.maxAttempts) return null;
    const claimToken = randomUUID();
    const claimExpiresAt = new Date(Date.now() + 5 * 60_000);
    await tx
      .update(billingProviderEvents)
      .set({
        status: 'processing',
        attemptCount: sql`${billingProviderEvents.attemptCount} + 1`,
        failureReason: null,
        claimToken,
        claimExpiresAt: mysqlTimestamp(claimExpiresAt),
      })
      .where(eq(billingProviderEvents.id, eventId));
    return {
      ...event,
      attemptCount: event.attemptCount + 1,
      status: 'processing' as const,
      claimToken,
      claimExpiresAt: mysqlTimestamp(claimExpiresAt),
    };
  });
}

export async function completeBillingProviderEvent(
  eventId: number,
  claimToken: string,
  status: 'applied' | 'ignored',
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db
    .update(billingProviderEvents)
    .set({ status, processedAt: mysqlTimestamp(), claimToken: null, claimExpiresAt: null })
    .where(and(eq(billingProviderEvents.id, eventId), eq(billingProviderEvents.status, 'processing'), eq(billingProviderEvents.claimToken, claimToken)));
  if (Number(result[0]?.affectedRows ?? result.affectedRows ?? 0) !== 1) {
    throw new Error('Provider event is not owned by a processing worker');
  }
}

export async function failBillingProviderEvent(eventId: number, claimToken: string, reason: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db
    .update(billingProviderEvents)
    .set({
      status: 'failed',
      failureReason: reason.slice(0, 2000),
      claimToken: null,
      claimExpiresAt: null,
      nextAttemptAt: mysqlTimestamp(new Date(Date.now() + Math.min(60, 2 ** 1) * 60_000)),
    })
    .where(and(eq(billingProviderEvents.id, eventId), eq(billingProviderEvents.status, 'processing'), eq(billingProviderEvents.claimToken, claimToken)));
  if (Number(result[0]?.affectedRows ?? result.affectedRows ?? 0) !== 1) {
    throw new Error('Provider event is not owned by a processing worker');
  }
}
