import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db';
import {
  agencies,
  agencyAgentMemberships,
  agents,
  demandCampaigns,
  demandLeadAssignments,
  demandLeadMatches,
  demandLeads,
  leads,
  notifications,
  properties,
  users,
} from '../../drizzle/schema';
import { captureDemandLeadFromCampaign } from '../services/demandEngineService';

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

describeDatabase('demand routing transaction rollback', () => {
  const created = {
    userId: 0,
    agencyId: 0,
    agentId: 0,
    propertyId: 0,
    campaignId: 0,
  };

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    if (created.campaignId) {
      await db.delete(demandLeads).where(eq(demandLeads.campaignId, created.campaignId));
      await db.delete(demandCampaigns).where(eq(demandCampaigns.id, created.campaignId));
    }
    if (created.propertyId) await db.delete(properties).where(eq(properties.id, created.propertyId));
    if (created.agentId) {
      await db.delete(agencyAgentMemberships).where(eq(agencyAgentMemberships.agentId, created.agentId));
      await db.delete(agents).where(eq(agents.id, created.agentId));
    }
    if (created.agencyId) await db.delete(agencies).where(eq(agencies.id, created.agencyId));
    if (created.userId) await db.delete(users).where(eq(users.id, created.userId));
    created.userId = 0;
    created.agencyId = 0;
    created.agentId = 0;
    created.propertyId = 0;
    created.campaignId = 0;
  });

  it('rolls back the complete demand routing graph when the transaction fails after routing', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = randomUUID();

    const [userInsert] = await db.insert(users).values({
      email: `demand-rollback-${suffix}@invalid.example`,
      name: 'Demand Rollback Agent',
      role: 'agent',
      emailVerified: 1,
    } as any);
    created.userId = Number(userInsert.insertId);

    const [agencyInsert] = await db.insert(agencies).values({
      name: `Demand Rollback Agency ${suffix}`,
      slug: `demand-rollback-${suffix}`,
      isVerified: 1,
    } as any);
    created.agencyId = Number(agencyInsert.insertId);

    const [agentInsert] = await db.insert(agents).values({
      userId: created.userId,
      agencyId: created.agencyId,
      firstName: 'Demand',
      lastName: 'Rollback',
      displayName: 'Demand Rollback',
      email: `demand-agent-${suffix}@invalid.example`,
      isVerified: 1,
      isFeatured: 0,
      status: 'approved',
    } as any);
    created.agentId = Number(agentInsert.insertId);

    await db.insert(agencyAgentMemberships).values({
      agencyId: created.agencyId,
      agentId: created.agentId,
      status: 'active',
      governanceMode: 'affiliated',
      role: 'agent',
      createdBy: created.userId,
      updatedBy: created.userId,
    } as any);

    const [propertyInsert] = await db.insert(properties).values({
      title: `Demand Rollback Property ${suffix}`,
      description: 'Physical transaction rollback fixture',
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 1500000,
      bedrooms: 3,
      bathrooms: 2,
      area: 140,
      address: '1 Rollback Street',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'available',
      featured: 0,
      views: 0,
      enquiries: 0,
      agentId: created.agentId,
      ownerId: created.userId,
    } as any);
    created.propertyId = Number(propertyInsert.insertId);

    const [campaignInsert] = await db.insert(demandCampaigns).values({
      ownerType: 'agency',
      ownerId: created.agencyId,
      createdBy: created.userId,
      name: `Demand Rollback Campaign ${suffix}`,
      status: 'active',
      sourceChannel: 'manual',
      distributionMode: 'exclusive',
      sharedRecipientCount: 1,
      city: 'Johannesburg',
      province: 'Gauteng',
      propertyType: 'house',
    } as any);
    created.campaignId = Number(campaignInsert.insertId);

    const originalTransaction = db.transaction.bind(db);
    (db as any).transaction = async (run: (tx: any) => Promise<unknown>) =>
      originalTransaction(async (tx: any) => {
        await run(tx);
        throw new Error('injected demand routing failure');
      });

    try {
      await expect(
        captureDemandLeadFromCampaign({
          campaignId: created.campaignId,
          name: 'Rollback Buyer',
          email: `rollback-buyer-${suffix}@invalid.example`,
          message: 'This must not survive the failed routing transaction.',
          criteria: { city: 'Johannesburg', province: 'Gauteng', propertyType: 'house' },
        }),
      ).rejects.toThrow('injected demand routing failure');
    } finally {
      (db as any).transaction = originalTransaction;
    }

    const survivingDemandLeads = await db
      .select({ id: demandLeads.id })
      .from(demandLeads)
      .where(eq(demandLeads.campaignId, created.campaignId));
    expect(survivingDemandLeads).toHaveLength(0);

    const survivingAssignments = await db
      .select({ id: demandLeadAssignments.id })
      .from(demandLeadAssignments)
      .where(eq(demandLeadAssignments.campaignId, created.campaignId));
    expect(survivingAssignments).toHaveLength(0);

    const survivingMatches = await db
      .select({ id: demandLeadMatches.id })
      .from(demandLeadMatches)
      .where(eq(demandLeadMatches.campaignId, created.campaignId));
    expect(survivingMatches).toHaveLength(0);

    const survivingLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.source, 'demand'), eq(leads.agentId, created.agentId)));
    expect(survivingLeads).toHaveLength(0);

    const survivingNotifications = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(eq(notifications.userId, created.userId));
    expect(survivingNotifications).toHaveLength(0);
  }, 30_000);
});
