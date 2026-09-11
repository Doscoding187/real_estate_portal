import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { billingProviderEvents } from '../../drizzle/schema';
import { getDb } from '../db-connection';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name, fn) => describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

describeWithDb('billing provider event identity', () => {
  it('rejects a duplicate provider and event identity', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const providerEventId = `p5-${randomUUID()}`;
    const [inserted] = await db.insert(billingProviderEvents).values({
      provider: 'test-provider',
      providerEventId,
      eventType: 'invoice.paid',
      payload: { providerEventId },
    });
    const id = Number(inserted.insertId);
    try {
      try {
        await db.insert(billingProviderEvents).values({
          provider: 'test-provider',
          providerEventId,
          eventType: 'invoice.paid',
          payload: { providerEventId },
        });
        throw new Error('duplicate provider event was accepted');
      } catch (error: any) {
        expect(`${error?.code ?? ''} ${error?.cause?.code ?? ''} ${error?.message ?? ''}`).toMatch(
          /ER_DUP_ENTRY|Duplicate entry/i,
        );
      }
    } finally {
      await db.delete(billingProviderEvents).where(eq(billingProviderEvents.id, id));
    }
  });
});
