import { createHash, randomUUID } from 'node:crypto';
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

function serviceLeadRequestId(requesterUserId: number, requestKey: string) {
  return `sv1:${createHash('sha256').update(`${requesterUserId}:${requestKey}`).digest('hex')}`;
}

describeDatabase('services engine durable lead idempotency', () => {
  let userId = 0;
  let providerId = 0;
  let requestId = '';

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    if (requestId) await db.delete(serviceLeads).where(eq(serviceLeads.requestId, requestId));
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
    await db.insert(serviceProviderProfiles).values({
      providerId,
      headline: 'Services idempotency provider',
      bio: 'Provider profile for durable service lead retry verification.',
      directoryActive: 1,
      exploreCreatorActive: 1,
      dashboardActive: 1,
    });
    await db.insert(serviceProviderSubscriptions).values({
      providerId,
      tier: 'directory',
      status: 'trial',
    });
    await db.insert(serviceProviderServices).values({
      providerId,
      serviceCategory: 'moving',
      serviceCode: 'moving',
      displayName: 'Moving',
      currency: 'ZAR',
      isActive: 1,
    });
    await db.insert(serviceProviderLocations).values({
      providerId,
      countryCode: 'ZA',
      province: 'Gauteng',
      city: 'Johannesburg',
      suburb: 'Sandton',
      radiusKm: 25,
      isPrimary: 1,
    });
    const requestKey = `services-retry-${suffix}`;
    requestId = serviceLeadRequestId(userId, requestKey);

    const input = {
      requesterUserId: userId,
      providerId,
      requestKey,
      category: 'moving' as const,
      sourceSurface: 'directory' as const,
      intentStage: 'general' as const,
      serviceCode: 'moving',
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
    expect(second.leadId).toBe(first.leadId);

    const rows = await db
      .select({ id: serviceLeads.id })
      .from(serviceLeads)
      .where(eq(serviceLeads.requestId, requestId));

    expect(rows).toHaveLength(1);
    const events = await db
      .select({ id: serviceLeadEvents.id })
      .from(serviceLeadEvents)
      .where(
        and(eq(serviceLeadEvents.leadId, rows[0]!.id), eq(serviceLeadEvents.eventType, 'created')),
      );
    expect(events).toHaveLength(1);
  }, 20_000);
});
