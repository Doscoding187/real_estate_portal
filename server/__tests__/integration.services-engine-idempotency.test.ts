import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db-connection';
import { partners, serviceLeadEvents, serviceLeads, users } from '../../drizzle/schema';
import { servicesEngineService } from '../services/servicesEngineService';

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeDatabase('services engine durable lead idempotency', () => {
  let userId = 0;
  let providerId = 0;
  let requestId = '';

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    if (requestId) await db.delete(serviceLeads).where(eq(serviceLeads.requestId, `${requestId}:${providerId}`));
    if (providerId) await db.delete(partners).where(eq(partners.id, providerId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
    userId = 0;
    providerId = 0;
    requestId = '';
  });

  it('returns one durable lead and one created event for concurrent retries', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = randomUUID();
    const [userInsert] = await db.insert(users).values({
      email: `services-idempotency-${suffix}@invalid.example`,
      name: 'Services Idempotency Provider',
      role: 'agent',
      emailVerified: 1,
    } as any);
    userId = Number(userInsert.insertId);
    const [providerInsert] = await db.insert(partners).values({
      userId,
      companyName: `Services Provider ${suffix}`,
      verificationStatus: 'verified',
      isActive: 1,
    } as any);
    providerId = Number(providerInsert.insertId);
    requestId = `services-retry-${suffix}`;

    const input = {
      requesterUserId: userId,
      providerId,
      requestId,
      category: 'moving' as const,
      sourceSurface: 'directory' as const,
      intentStage: 'general' as const,
      notes: 'Concurrent retry proof',
    };
    const [first, second] = await Promise.all([
      servicesEngineService.createLeadFromContext(input),
      servicesEngineService.createLeadFromContext(input),
    ]);
    expect(first.leadIds).toHaveLength(1);
    expect(second.leadIds).toEqual(first.leadIds);
    expect([first.idempotent, second.idempotent].sort()).toEqual([false, true]);

    const rows = await db
      .select({ id: serviceLeads.id })
      .from(serviceLeads)
      .where(eq(serviceLeads.requestId, `${requestId}:${providerId}`));
    expect(rows).toHaveLength(1);
    const events = await db
      .select({ id: serviceLeadEvents.id })
      .from(serviceLeadEvents)
      .where(and(eq(serviceLeadEvents.leadId, rows[0]!.id), eq(serviceLeadEvents.eventType, 'created')));
    expect(events).toHaveLength(1);
  }, 20_000);
});
