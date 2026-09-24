import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db-connection';
import {
  partners,
  serviceLeadEvents,
  serviceLeads,
  serviceProviderLocations,
  serviceProviderProfiles,
  serviceProviderServices,
  serviceProviderSubscriptions,
  users,
} from '../../drizzle/schema';
import { servicesEngineService } from '../services/servicesEngineService';

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeDatabase('services engine durable lead idempotency', () => {
  let requesterUserId = 0;
  let providerUserId = 0;
  let providerId = 0;

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    if (requesterUserId) {
      await db.delete(serviceLeads).where(eq(serviceLeads.requesterUserId, requesterUserId));
    }
    if (providerId) await db.delete(partners).where(eq(partners.id, providerId));
    if (providerUserId) await db.delete(users).where(eq(users.id, providerUserId));
    if (requesterUserId) await db.delete(users).where(eq(users.id, requesterUserId));
    requesterUserId = 0;
    providerUserId = 0;
    providerId = 0;
  });

  it('persists one selected-provider lead and one created event for concurrent retries', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = randomUUID();
    const [providerUserInsert] = await db.insert(users).values({
      email: `services-provider-${suffix}@invalid.example`,
      name: 'Services Idempotency Provider',
      role: 'service_provider',
      emailVerified: 1,
    } as any);
    providerUserId = Number(providerUserInsert.insertId);
    const [requesterInsert] = await db.insert(users).values({
      email: `services-requester-${suffix}@invalid.example`,
      name: 'Services Idempotency Requester',
      role: 'visitor',
      emailVerified: 1,
    } as any);
    requesterUserId = Number(requesterInsert.insertId);
    const [providerInsert] = await db.insert(partners).values({
      userId: providerUserId,
      companyName: `Services Provider ${suffix}`,
      verificationStatus: 'verified',
      isActive: 1,
    } as any);
    providerId = Number(providerInsert.insertId);
    await db.insert(serviceProviderProfiles).values({ providerId, directoryActive: 1 });
    await db.insert(serviceProviderSubscriptions).values({
      providerId,
      tier: 'directory',
      status: 'trial',
    });
    await db.insert(serviceProviderServices).values({
      providerId,
      serviceCategory: 'moving',
      serviceCode: 'removals',
      displayName: 'Removals',
      isActive: 1,
    });
    await db.insert(serviceProviderLocations).values({
      providerId,
      province: 'Gauteng',
      city: 'Johannesburg',
      suburb: 'Sandton',
    });

    const input = {
      requesterUserId,
      requesterRole: 'visitor',
      providerId,
      requestKey: randomUUID().replaceAll('-', ''),
      category: 'moving' as const,
      sourceSurface: 'directory' as const,
      intentStage: 'general' as const,
      serviceCode: 'removals',
      province: 'Gauteng',
      city: 'Johannesburg',
      suburb: 'Sandton',
      notes: 'Concurrent retry proof',
    };
    const [first, second] = await Promise.all([
      servicesEngineService.createLeadFromContext(input),
      servicesEngineService.createLeadFromContext(input),
    ]);
    expect(first.leadIds).toHaveLength(1);
    expect(second.leadIds).toEqual(first.leadIds);

    const rows = await db
      .select({
        id: serviceLeads.id,
        requestId: serviceLeads.requestId,
        providerId: serviceLeads.providerId,
        contextJson: serviceLeads.contextJson,
      })
      .from(serviceLeads)
      .where(eq(serviceLeads.requesterUserId, requesterUserId));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: first.leadId,
      providerId,
      requestId: expect.stringMatching(/^sv1:[a-f0-9]{64}$/),
      contextJson: expect.objectContaining({
        requestKey: input.requestKey,
        serviceCode: 'removals',
      }),
    });
    const events = await db
      .select({ id: serviceLeadEvents.id })
      .from(serviceLeadEvents)
      .where(
        and(eq(serviceLeadEvents.leadId, rows[0]!.id), eq(serviceLeadEvents.eventType, 'created')),
      );
    expect(events).toHaveLength(1);

    await expect(
      servicesEngineService.createLeadFromContext({ ...input, notes: 'Changed payload' }),
    ).rejects.toThrow('Request key has already been used');
  }, 20_000);
});
