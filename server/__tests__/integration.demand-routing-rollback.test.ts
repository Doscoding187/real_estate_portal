import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';

import { getDb } from '../db';
import {
  agencies,
  agencyAgentMemberships,
  agents,
  billableAccounts,
  demandCampaigns,
  demandLeadAssignments,
  demandLeadMatches,
  demandLeads,
  demandUnmatchedLeads,
  leads,
  notifications,
  plans,
  properties,
  subscriptions,
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
  billableAccountId: 0,
  subscriptionId: 0,
};

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;
    if (created.campaignId) {
      await db
        .delete(demandLeadAssignments)
        .where(eq(demandLeadAssignments.campaignId, created.campaignId));
      await db
        .delete(demandLeadMatches)
        .where(eq(demandLeadMatches.campaignId, created.campaignId));
      await db
        .delete(demandUnmatchedLeads)
        .where(eq(demandUnmatchedLeads.campaignId, created.campaignId));
      await db.delete(demandLeads).where(eq(demandLeads.campaignId, created.campaignId));
      await db.delete(demandCampaigns).where(eq(demandCampaigns.id, created.campaignId));
    }
    if (created.agentId) {
      await db
        .delete(leads)
        .where(and(eq(leads.source, 'demand'), eq(leads.agentId, created.agentId)));
    }
    if (created.propertyId) await db.delete(properties).where(eq(properties.id, created.propertyId));
    if (created.subscriptionId) {
      await db.delete(subscriptions).where(eq(subscriptions.id, created.subscriptionId));
    }
    if (created.billableAccountId) {
      await db.delete(billableAccounts).where(eq(billableAccounts.id, created.billableAccountId));
    }
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
    created.billableAccountId = 0;
    created.subscriptionId = 0;
  });

  it('rolls back the complete demand routing graph when the transaction fails after routing', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = randomUUID();
    const demandCity = `Demand City ${suffix}`;
    const demandProvince = `Demand Province ${suffix}`;

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

    const [launchPlan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(
        and(
          eq(plans.name, 'agency_launch_access'),
          eq(plans.segment, 'agency'),
          eq(plans.isActive, 1),
        ),
      )
      .limit(1);
    expect(launchPlan?.id).toBeTruthy();

    const [billableAccountInsert] = await db.insert(billableAccounts).values({
      accountKind: 'agency',
      agencyId: created.agencyId,
    } as any);
    created.billableAccountId = Number(billableAccountInsert.insertId);
    const activeAt = new Date();
    const activeUntil = new Date(activeAt.getTime() + 24 * 60 * 60 * 1000);
    const [subscriptionInsert] = await db.insert(subscriptions).values({
      ownerType: 'agency',
      ownerId: created.agencyId,
      billableAccountId: created.billableAccountId,
      planId: launchPlan!.id,
      status: 'active',
      currentPeriodStart: activeAt.toISOString().slice(0, 19).replace('T', ' '),
      currentPeriodEnd: activeUntil.toISOString().slice(0, 19).replace('T', ' '),
      cancelAtPeriodEnd: 0,
      billingCycleAnchor: activeUntil.toISOString().slice(0, 19).replace('T', ' '),
      createdBy: created.userId,
      updatedBy: created.userId,
    } as any);
    created.subscriptionId = Number(subscriptionInsert.insertId);

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
      city: demandCity,
      province: demandProvince,
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
      city: demandCity,
      province: demandProvince,
      propertyType: 'house',
    } as any);
    created.campaignId = Number(campaignInsert.insertId);

    let routedBeforeRollback: Awaited<ReturnType<typeof captureDemandLeadFromCampaign>> | null = null;
    const originalTransaction = db.transaction.bind(db);
    (db as any).transaction = async (run: (tx: any) => Promise<unknown>) =>
      originalTransaction(async (tx: any) => {
        routedBeforeRollback = (await run(tx)) as Awaited<
          ReturnType<typeof captureDemandLeadFromCampaign>
        >;
        throw new Error('injected demand routing failure');
      });

    try {
      await expect(
        captureDemandLeadFromCampaign({
          campaignId: created.campaignId,
          name: 'Rollback Buyer',
          email: `rollback-buyer-${suffix}@invalid.example`,
          message: 'This must not survive the failed routing transaction.',
          criteria: { city: demandCity, province: demandProvince, propertyType: 'house' },
        }),
      ).rejects.toThrow('injected demand routing failure');
    } finally {
      (db as any).transaction = originalTransaction;
    }

    // The active Agency term was sufficient to route before the injected
    // rollback. The original transactional assertions below prove none of
    // that temporary routing graph survived the failed transaction.
    expect(routedBeforeRollback?.leadIds).toHaveLength(1);
    expect(routedBeforeRollback?.assignedAgentIds).toEqual([created.agentId]);

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

    // Once the same Agency term expires, matching inventory remains retained
    // but must not create a fresh paid lead or assignment. The demand record
    // is preserved as unmatched operational history instead.
    await db
      .update(subscriptions)
      .set({ currentPeriodEnd: '2020-01-01 00:00:00' })
      .where(eq(subscriptions.id, created.subscriptionId));
    const expiredResult = await captureDemandLeadFromCampaign({
      campaignId: created.campaignId,
      name: 'Expired-term Buyer',
      email: `expired-demand-${suffix}@invalid.example`,
      message: 'This must not become a new paid enquiry after expiry.',
      criteria: { city: demandCity, province: demandProvince, propertyType: 'house' },
    });
    expect(expiredResult).toMatchObject({
      leadIds: [],
      assignedAgentIds: [],
      assignmentType: null,
      unmatched: true,
    });
    const expiredLeads = await db
      .select({ id: leads.id })
      .from(leads)
      .where(and(eq(leads.source, 'demand'), eq(leads.agentId, created.agentId)));
    expect(expiredLeads).toHaveLength(0);
  }, 30_000);
});
