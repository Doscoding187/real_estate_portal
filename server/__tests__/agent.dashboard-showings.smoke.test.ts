import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';

import { agentRouter } from '../agentRouter';
import { getDb } from '../db-connection';
import { showings } from '../../drizzle/schema';

describe('agent dashboard showings smoke', () => {
  let createdUserId: number | null = null;
  let createdAgentId: number | null = null;
  let createdPropertyId: number | null = null;
  let createdLeadId: number | null = null;
  let createdShowingId: number | null = null;
  let createdCommissionId: number | null = null;
  let createdOfferBuyerName: string | null = null;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  function toDbTimestamp(value: Date): string {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdPropertyId && createdOfferBuyerName) {
      await db.execute(sql`
        DELETE FROM offers
        WHERE propertyId = ${createdPropertyId}
          AND buyerName = ${createdOfferBuyerName}
      `);
      createdOfferBuyerName = null;
    }

    if (createdCommissionId) {
      await db.execute(sql`DELETE FROM commissions WHERE id = ${createdCommissionId}`);
      createdCommissionId = null;
    }

    if (createdShowingId) {
      await db.delete(showings).where(eq(showings.id, createdShowingId));
      createdShowingId = null;
    }

    if (createdLeadId) {
      await db.execute(sql`DELETE FROM leads WHERE id = ${createdLeadId}`);
      createdLeadId = null;
    }

    if (createdPropertyId) {
      await db.execute(sql`DELETE FROM properties WHERE id = ${createdPropertyId}`);
      createdPropertyId = null;
    }

    if (createdAgentId) {
      await db.execute(sql`DELETE FROM agents WHERE id = ${createdAgentId}`);
      createdAgentId = null;
    }

    if (createdUserId) {
      await db.execute(sql`DELETE FROM users WHERE id = ${createdUserId}`);
      createdUserId = null;
    }
  }, 30_000);

  it(
    'serves showings and dashboard stats against the migrated schema',
    async () => {
    const db = await getDb();
    expect(db).toBeTruthy();

    const suffix = Date.now();
    const email = `agent-dashboard-smoke-${suffix}@example.com`;
    const buyerEmail = `agent-dashboard-buyer-${suffix}@example.com`;
    const buyerName = `Smoke Buyer ${suffix}`;
    const scheduledAt = new Date();
    scheduledAt.setMinutes(scheduledAt.getMinutes() + 5);
    const showingNotes = 'Smoke-test showing for migrated schema';

    const [userInsert] = await db!.execute(sql`
      INSERT INTO users (email, name, role, emailVerified)
      VALUES (${email}, ${`Smoke Agent ${suffix}`}, ${'agent'}, ${1})
    `);
    createdUserId = Number((userInsert as any).insertId);

    const [agentInsert] = await db!.execute(sql`
      INSERT INTO agents (
        userId,
        firstName,
        lastName,
        displayName,
        email,
        phone,
        whatsapp,
        isVerified,
        isFeatured,
        status
      ) VALUES (
        ${createdUserId},
        ${'Smoke'},
        ${'Agent'},
        ${`Smoke Agent ${suffix}`},
        ${email},
        ${'+27110001111'},
        ${'+27110001111'},
        ${1},
        ${0},
        ${'approved'}
      )
    `);
    createdAgentId = Number((agentInsert as any).insertId);

    const [propertyInsert] = await db!.execute(sql`
      INSERT INTO properties (
        title,
        description,
        propertyType,
        listingType,
        transactionType,
        price,
        bedrooms,
        bathrooms,
        area,
        address,
        city,
        province,
        latitude,
        longitude,
        status,
        featured,
        views,
        enquiries,
        agentId,
        ownerId
      ) VALUES (
        ${`Agent Dashboard Property ${suffix}`},
        ${'Dashboard smoke test property'},
        ${'house'},
        ${'sale'},
        ${'sale'},
        ${2250000},
        ${3},
        ${2},
        ${180},
        ${'123 Smoke Test Street'},
        ${'Johannesburg'},
        ${'Gauteng'},
        ${'-26.1076'},
        ${'28.0567'},
        ${'available'},
        ${0},
        ${0},
        ${0},
        ${createdAgentId},
        ${createdUserId}
      )
    `);
    createdPropertyId = Number((propertyInsert as any).insertId);

    const [leadInsert] = await db!.execute(sql`
      INSERT INTO leads (
        propertyId,
        agentId,
        owner_type,
        visibility_scope,
        governance_mode,
        name,
        email,
        phone,
        message,
        status
      ) VALUES (
        ${createdPropertyId},
        ${createdAgentId},
        ${'agent'},
        ${'private'},
        ${'solo'},
        ${buyerName},
        ${buyerEmail},
        ${'+27112223333'},
        ${'Interested in viewing this property'},
        ${'new'}
      )
    `);
    createdLeadId = Number((leadInsert as any).insertId);

    const [showingInsert] = await db!.insert(showings).values({
      propertyId: createdPropertyId,
      leadId: createdLeadId,
      agentId: createdAgentId,
      scheduledAt: toDbTimestamp(scheduledAt),
      status: 'confirmed',
      notes: showingNotes,
      visitorName: buyerName,
    });
    createdShowingId = Number(showingInsert.insertId);

    createdOfferBuyerName = buyerName;
    await db!.execute(sql`
      INSERT INTO offers (
        propertyId,
        leadId,
        agentId,
        buyerName,
        buyerEmail,
        offerAmount,
        status
      ) VALUES (
        ${createdPropertyId},
        ${createdLeadId},
        ${createdAgentId},
        ${buyerName},
        ${buyerEmail},
        ${2150000},
        ${'pending'}
      )
    `);

    const [commissionInsert] = await db!.execute(sql`
      INSERT INTO commissions (
        agentId,
        propertyId,
        leadId,
        amount,
        status
      ) VALUES (
        ${createdAgentId},
        ${createdPropertyId},
        ${createdLeadId},
        ${45000},
        ${'pending'}
      )
    `);
    createdCommissionId = Number((commissionInsert as any).insertId);

    const caller = agentRouter.createCaller({
      user: {
        id: createdUserId,
        role: 'agent',
        email,
      },
      req: { headers: {} },
      res: {},
      requestId: `agent-dashboard-smoke-${suffix}`,
    } as any);

    const showingsResult = await caller.getMyShowings({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status: 'all',
    });

    expect(showingsResult).toHaveLength(1);
    expect(showingsResult[0]).toEqual(
      expect.objectContaining({
        id: createdShowingId,
        propertyId: createdPropertyId,
        leadId: createdLeadId,
        agentId: createdAgentId,
        status: 'scheduled',
        notes: showingNotes,
      }),
    );

    const stats = await caller.getDashboardStats();
    expect(stats).toEqual({
      activeListings: 1,
      newLeadsThisWeek: 1,
      showingsToday: 1,
      offersInProgress: 1,
      commissionsPending: 45000,
    });

    const updateResult = await caller.updateShowingStatus({
      showingId: createdShowingId,
      status: 'completed',
    });
    expect(updateResult).toEqual({ success: true });

    const [updatedShowing] = await db!
      .select({ status: showings.status })
      .from(showings)
      .where(eq(showings.id, createdShowingId))
      .limit(1);

    expect(updatedShowing?.status).toBe('completed');
    },
    30_000,
  );
});
