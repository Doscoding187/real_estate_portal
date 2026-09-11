import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { billingProviderEvents } from '../../drizzle/schema';
import { getDb } from '../db-connection';
import {
  claimBillingProviderEvent,
  completeBillingProviderEvent,
  failBillingProviderEvent,
  recordBillingProviderEvent,
} from '../services/billingProviderEventService';

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

  it('allows one processing claim and fences replay completion', async () => {
    const recorded = await recordBillingProviderEvent({
      provider: 'test-provider',
      providerEventId: `p5-lifecycle-${randomUUID()}`,
      eventType: 'invoice.paid',
      payload: { source: 'physical-test' },
    });
    try {
      const firstClaim = await claimBillingProviderEvent(Number(recorded.event.id));
      expect(firstClaim?.status).toBe('processing');
      await expect(claimBillingProviderEvent(Number(recorded.event.id))).resolves.toBeNull();
      await completeBillingProviderEvent(Number(recorded.event.id), 'applied');
      await expect(
        completeBillingProviderEvent(Number(recorded.event.id), 'ignored'),
      ).rejects.toThrow('not owned by a processing worker');
    } finally {
      const db = await getDb();
      await db?.delete(billingProviderEvents).where(eq(billingProviderEvents.id, recorded.event.id));
    }
  });

  it('reclaims a failed event and permits a bounded retry', async () => {
    const recorded = await recordBillingProviderEvent({
      provider: 'test-provider',
      providerEventId: `p5-retry-${randomUUID()}`,
      eventType: 'invoice.paid',
      payload: { source: 'physical-test' },
    });
    try {
      await expect(claimBillingProviderEvent(Number(recorded.event.id))).resolves.toMatchObject({
        status: 'processing',
      });
      await failBillingProviderEvent(Number(recorded.event.id), 'temporary provider timeout');
      await expect(claimBillingProviderEvent(Number(recorded.event.id))).resolves.toMatchObject({
        status: 'processing',
      });
      await completeBillingProviderEvent(Number(recorded.event.id), 'ignored');
      await expect(claimBillingProviderEvent(Number(recorded.event.id))).resolves.toBeNull();
    } finally {
      const db = await getDb();
      await db?.delete(billingProviderEvents).where(eq(billingProviderEvents.id, recorded.event.id));
    }
  });

  it('stops claiming after the configured retry budget is exhausted', async () => {
    const recorded = await recordBillingProviderEvent({
      provider: 'test-provider',
      providerEventId: `p5-exhausted-${randomUUID()}`,
      eventType: 'invoice.paid',
      payload: { source: 'physical-test' },
      maxAttempts: 2,
    });
    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        await expect(claimBillingProviderEvent(Number(recorded.event.id))).resolves.toMatchObject({
          status: 'processing',
          attemptCount: attempt + 1,
        });
        await failBillingProviderEvent(Number(recorded.event.id), `failure ${attempt + 1}`);
      }
      await expect(claimBillingProviderEvent(Number(recorded.event.id))).resolves.toBeNull();
    } finally {
      const db = await getDb();
      await db?.delete(billingProviderEvents).where(eq(billingProviderEvents.id, recorded.event.id));
    }
  });
});
