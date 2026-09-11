import { and, eq, inArray } from 'drizzle-orm';
import { billingProviderEvents } from '../../drizzle/schema';
import { getDb } from '../db-connection';

function mysqlTimestamp(value = new Date()): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
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
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  try {
    const [result] = await db.insert(billingProviderEvents).values({
      provider: input.provider,
      providerEventId: input.providerEventId,
      eventType: input.eventType,
      payload: input.payload,
      occurredAt: input.occurredAt ?? null,
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
          eq(billingProviderEvents.provider, input.provider),
          eq(billingProviderEvents.providerEventId, input.providerEventId),
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
          inArray(billingProviderEvents.status, ['received', 'failed']),
        ),
      )
      .for('update')
      .limit(1);
    if (!event) return null;
    await tx
      .update(billingProviderEvents)
      .set({ status: 'processing', failureReason: null })
      .where(eq(billingProviderEvents.id, eventId));
    return { ...event, status: 'processing' as const };
  });
}

export async function completeBillingProviderEvent(eventId: number, status: 'applied' | 'ignored') {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db
    .update(billingProviderEvents)
    .set({ status, processedAt: mysqlTimestamp() })
    .where(and(eq(billingProviderEvents.id, eventId), eq(billingProviderEvents.status, 'processing')));
  if (Number(result[0]?.affectedRows ?? result.affectedRows ?? 0) !== 1) {
    throw new Error('Provider event is not owned by a processing worker');
  }
}

export async function failBillingProviderEvent(eventId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const result = await db
    .update(billingProviderEvents)
    .set({ status: 'failed', failureReason: reason.slice(0, 2000) })
    .where(and(eq(billingProviderEvents.id, eventId), eq(billingProviderEvents.status, 'processing')));
  if (Number(result[0]?.affectedRows ?? result.affectedRows ?? 0) !== 1) {
    throw new Error('Provider event is not owned by a processing worker');
  }
}
