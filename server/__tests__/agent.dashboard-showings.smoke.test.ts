import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { eq, sql } from 'drizzle-orm';

import { agentRouter } from '../agentRouter';
import { getDb } from '../db-connection';
import { leads, listings, offers, showings } from '../../drizzle/schema';

const describeWithDb = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: () => void) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe);

describeWithDb('agent dashboard showings smoke', () => {
  let createdUserId: number | null = null;
  let createdAgentId: number | null = null;
  let createdOtherUserId: number | null = null;
  let createdOtherAgentId: number | null = null;
  let createdBuyerUserId: number | null = null;
  let createdPropertyId: number | null = null;
  let createdListingId: number | null = null;
  let createdLeadId: number | null = null;
  let createdShowingId: number | null = null;
  let createdCommissionId: number | null = null;
  let createdOfferId: number | null = null;

  beforeEach(() => {
    process.env.NODE_ENV = 'test';
  });

  function toDbTimestamp(value: Date): string {
    return value.toISOString().slice(0, 19).replace('T', ' ');
  }

  async function getLeadColumnSet() {
    const db = await getDb();
    const [rows] = await db!.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'leads'
    `);

    return new Set(
      (Array.isArray(rows) ? rows : []).map((row: any) =>
        String(row.column_name ?? row.COLUMN_NAME),
      ),
    );
  }

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    if (createdOfferId) {
      await db.delete(offers).where(eq(offers.id, createdOfferId));
      createdOfferId = null;
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

    if (createdListingId) {
      await db.delete(listings).where(eq(listings.id, createdListingId));
      createdListingId = null;
    }

    if (createdPropertyId) {
      await db.execute(sql`DELETE FROM properties WHERE id = ${createdPropertyId}`);
      createdPropertyId = null;
    }

    if (createdAgentId) {
      await db.execute(sql`DELETE FROM agents WHERE id = ${createdAgentId}`);
      createdAgentId = null;
    }

    if (createdOtherAgentId) {
      await db.execute(sql`DELETE FROM agents WHERE id = ${createdOtherAgentId}`);
      createdOtherAgentId = null;
    }

    if (createdBuyerUserId) {
      await db.execute(sql`DELETE FROM users WHERE id = ${createdBuyerUserId}`);
      createdBuyerUserId = null;
    }

    if (createdUserId) {
      await db.execute(sql`DELETE FROM users WHERE id = ${createdUserId}`);
      createdUserId = null;
    }

    if (createdOtherUserId) {
      await db.execute(sql`DELETE FROM users WHERE id = ${createdOtherUserId}`);
      createdOtherUserId = null;
    }
  }, 30_000);

  it('serves agent dashboard, showings, and lead follow-ups against the migrated schema', async () => {
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

    const otherEmail = `agent-dashboard-other-${suffix}@example.com`;
    const [otherUserInsert] = await db!.execute(sql`
      INSERT INTO users (email, name, role, emailVerified)
      VALUES (${otherEmail}, ${`Other Smoke Agent ${suffix}`}, ${'agent'}, ${1})
    `);
    createdOtherUserId = Number((otherUserInsert as any).insertId);

    const [otherAgentInsert] = await db!.execute(sql`
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
        ${createdOtherUserId},
        ${'Other'},
        ${'Agent'},
        ${`Other Smoke Agent ${suffix}`},
        ${otherEmail},
        ${'+27110002222'},
        ${'+27110002222'},
        ${1},
        ${0},
        ${'approved'}
      )
    `);
    createdOtherAgentId = Number((otherAgentInsert as any).insertId);

    const [buyerUserInsert] = await db!.execute(sql`
      INSERT INTO users (email, name, role, emailVerified)
      VALUES (${buyerEmail}, ${buyerName}, ${'visitor'}, ${1})
    `);
    createdBuyerUserId = Number((buyerUserInsert as any).insertId);

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

    const [listingInsert] = await db!.insert(listings).values({
      ownerId: createdUserId,
      agentId: createdAgentId,
      action: 'sell',
      propertyType: 'house',
      title: `Agent Dashboard Listing ${suffix}`,
      description: 'Canonical offer smoke-test listing',
      askingPrice: '2250000.00',
      address: '123 Smoke Test Street',
      latitude: '-26.1076000',
      longitude: '28.0567000',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'published',
      approvalStatus: 'approved',
      slug: `agent-dashboard-listing-${suffix}`,
    });
    createdListingId = Number(listingInsert.insertId);

    const leadColumns = await getLeadColumnSet();
    const leadInsertColumns = [
      sql.identifier('propertyId'),
      sql.identifier('agentId'),
      sql.identifier('name'),
      sql.identifier('email'),
      sql.identifier('phone'),
      sql.identifier('message'),
      sql.identifier('status'),
    ];
    const leadInsertValues = [
      sql`${createdPropertyId}`,
      sql`${createdAgentId}`,
      sql`${buyerName}`,
      sql`${buyerEmail}`,
      sql`${'+27112223333'}`,
      sql`${'Interested in viewing this property'}`,
      sql`${'new'}`,
    ];

    if (leadColumns.has('owner_type')) {
      leadInsertColumns.push(sql.identifier('owner_type'));
      leadInsertValues.push(sql`${'agent'}`);
    }

    if (leadColumns.has('visibility_scope')) {
      leadInsertColumns.push(sql.identifier('visibility_scope'));
      leadInsertValues.push(sql`${'private'}`);
    }

    if (leadColumns.has('governance_mode')) {
      leadInsertColumns.push(sql.identifier('governance_mode'));
      leadInsertValues.push(sql`${'solo'}`);
    }

    const [leadInsert] = await db!.execute(sql`
      INSERT INTO leads (${sql.join(leadInsertColumns, sql`, `)})
      VALUES (${sql.join(leadInsertValues, sql`, `)})
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

    const [offerInsert] = await db!.insert(offers).values({
      listingId: createdListingId,
      buyerId: createdBuyerUserId,
      amount: '2150000.00',
      status: 'pending',
    });
    createdOfferId = Number(offerInsert.insertId);

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
    const otherCaller = agentRouter.createCaller({
      user: {
        id: createdOtherUserId,
        role: 'agent',
        email: otherEmail,
      },
      req: { headers: {} },
      res: {},
      requestId: `agent-dashboard-other-${suffix}`,
    } as any);

    const followUpAt = new Date(Date.now() + 60 * 60 * 1000);
    const scheduledFollowUp = await caller.setLeadFollowUp({
      leadId: createdLeadId,
      nextFollowUp: followUpAt.toISOString(),
      note: 'Call the buyer to confirm a viewing time.',
    });

    expect(scheduledFollowUp).toEqual({
      success: true,
      nextFollowUp: toDbTimestamp(followUpAt),
    });

    const followUps = await caller.getMyFollowUps({ limit: 10 });
    expect(followUps).toEqual([
      expect.objectContaining({
        id: createdLeadId,
        name: buyerName,
        status: 'new',
        nextFollowUp: toDbTimestamp(followUpAt),
        property: expect.objectContaining({ id: createdPropertyId }),
      }),
    ]);

    const [scheduledLead] = await db!
      .select({ nextFollowUp: leads.nextFollowUp })
      .from(leads)
      .where(eq(leads.id, createdLeadId))
      .limit(1);
    expect(scheduledLead?.nextFollowUp).toBe(toDbTimestamp(followUpAt));

    expect(await otherCaller.getMyFollowUps({ limit: 10 })).toEqual([]);
    await expect(
      otherCaller.setLeadFollowUp({
        leadId: createdLeadId,
        nextFollowUp: followUpAt.toISOString(),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(otherCaller.completeLeadFollowUp({ leadId: createdLeadId })).rejects.toMatchObject(
      {
        code: 'NOT_FOUND',
      },
    );

    await db!.update(leads).set({ status: 'converted' }).where(eq(leads.id, createdLeadId));
    expect(await caller.getMyFollowUps({ limit: 10 })).toEqual([]);
    await expect(
      caller.setLeadFollowUp({
        leadId: createdLeadId,
        nextFollowUp: followUpAt.toISOString(),
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(caller.completeLeadFollowUp({ leadId: createdLeadId })).rejects.toMatchObject({
      code: 'BAD_REQUEST',
    });
    await db!.update(leads).set({ status: 'new' }).where(eq(leads.id, createdLeadId));

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

    const completedFollowUp = await caller.completeLeadFollowUp({
      leadId: createdLeadId,
      note: 'Buyer called; viewing confirmed.',
    });
    expect(completedFollowUp).toEqual({ success: true });

    expect(await caller.getMyFollowUps({ limit: 10 })).toEqual([]);

    const [completedLead] = await db!
      .select({
        nextFollowUp: leads.nextFollowUp,
        lastContactedAt: leads.lastContactedAt,
      })
      .from(leads)
      .where(eq(leads.id, createdLeadId))
      .limit(1);
    expect(completedLead).toEqual(
      expect.objectContaining({
        nextFollowUp: null,
        lastContactedAt: expect.any(String),
      }),
    );

    const activities = await caller.getLeadActivities({ leadId: createdLeadId });
    expect(activities.map(activity => activity.description)).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Follow-up scheduled for'),
        expect.stringContaining('Call the buyer to confirm a viewing time.'),
        expect.stringContaining('Follow-up completed.'),
        expect.stringContaining('Buyer called; viewing confirmed.'),
      ]),
    );
  }, 30_000);
});
