import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray, like, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

import { agencyRouter } from '../agencyRouter';
import { getDb } from '../db-connection';
import {
  agencies,
  agents,
  leadActivities,
  leads,
  listings,
  notifications,
  properties,
  showings,
  users,
} from '../../drizzle/schema';

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe;

const createdState = {
  agencyIds: [] as number[],
  userIds: [] as number[],
  agentIds: [] as number[],
  listingIds: [] as number[],
  propertyIds: [] as number[],
  leadIds: [] as number[],
  showingIds: [] as number[],
};

function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

function uniqueNumbers(values: number[]) {
  return Array.from(new Set(values.filter(Boolean)));
}

function createCaller(user: { id: number; role: string; agencyId: number }) {
  return agencyRouter.createCaller({
    user,
    req: { headers: {} },
    res: {},
    requestId: `agency-viewings-test-${Date.now()}`,
  } as any);
}

function futureIso(hoursFromNow: number) {
  return new Date(Date.now() + hoursFromNow * 60 * 60 * 1000).toISOString();
}

function agencyDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Johannesburg',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return `${parts.find(part => part.type === 'year')?.value}-${parts.find(part => part.type === 'month')?.value}-${parts.find(part => part.type === 'day')?.value}`;
}

function jhbIso(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}+02:00`).toISOString();
}

async function countNotificationDedupe(userId: number, dedupeKey: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, 'showing_scheduled'),
        like(notifications.data, `%"dedupeKey":"${dedupeKey}"%`),
      ),
    );
  return Number(row?.count || 0);
}

async function seedLead(input: {
  propertyId: number;
  agencyId: number;
  agentId: number;
  suffix: string;
  label: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [leadInsert] = await db.insert(leads).values({
    propertyId: input.propertyId,
    agencyId: input.agencyId,
    agentId: input.agentId,
    name: `Viewing Buyer ${input.label} ${input.suffix}`,
    email: `viewing-buyer-${input.label}-${input.suffix}@example.com`,
    phone: '+27110000000',
    message: 'Interested in booking a viewing',
    leadType: 'viewing_request',
    status: 'new',
    source: 'integration-test',
  } as any);
  const leadId = insertId(leadInsert);
  createdState.leadIds.push(leadId);
  return leadId;
}

async function seedAgencyFixture(label: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}-${label}`;

  const [agencyInsert] = await db.insert(agencies).values({
    name: `Viewing Agency ${suffix}`,
    slug: `viewing-agency-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
    email: `viewing-agency-${suffix}@example.com`,
    city: 'Johannesburg',
    province: 'Gauteng',
    subscriptionPlan: 'free',
    subscriptionStatus: 'trial',
    isVerified: 1,
  } as any);
  const agencyId = insertId(agencyInsert);
  createdState.agencyIds.push(agencyId);

  const [outsideAgencyInsert] = await db.insert(agencies).values({
    name: `Outside Viewing Agency ${suffix}`,
    slug: `outside-viewing-agency-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
    email: `outside-viewing-agency-${suffix}@example.com`,
    city: 'Cape Town',
    province: 'Western Cape',
    subscriptionPlan: 'free',
    subscriptionStatus: 'trial',
    isVerified: 1,
  } as any);
  const outsideAgencyId = insertId(outsideAgencyInsert);
  createdState.agencyIds.push(outsideAgencyId);

  async function createUser(role: 'agency_admin' | 'agent', agency: number, name: string) {
    const email = `${name.toLowerCase().replace(/\s+/g, '-')}-${suffix}@example.com`;
    const [userInsert] = await db.insert(users).values({
      email,
      role,
      agencyId: agency,
      firstName: name.split(' ')[0],
      lastName: name.split(' ')[1] || 'User',
      name,
      emailVerified: 1,
    } as any);
    const userId = insertId(userInsert);
    createdState.userIds.push(userId);
    return { userId, email };
  }

  async function createAgent(userId: number, agency: number, name: string, email: string) {
    const [agentInsert] = await db.insert(agents).values({
      userId,
      agencyId: agency,
      firstName: name.split(' ')[0],
      lastName: name.split(' ')[1] || 'Agent',
      displayName: name,
      email,
      phone: '+27112223333',
      whatsapp: '+27112223333',
      isVerified: 1,
      isFeatured: 0,
      status: 'approved',
    } as any);
    const agentId = insertId(agentInsert);
    createdState.agentIds.push(agentId);
    return agentId;
  }

  const admin = await createUser('agency_admin', agencyId, 'Viewing Admin');
  const agentUser = await createUser('agent', agencyId, 'Viewing Agent');
  const secondAgentUser = await createUser('agent', agencyId, 'Second Agent');
  const outsideAdmin = await createUser('agency_admin', outsideAgencyId, 'Outside Admin');
  const outsideAgentUser = await createUser('agent', outsideAgencyId, 'Outside Agent');

  const agentId = await createAgent(agentUser.userId, agencyId, 'Viewing Agent', agentUser.email);
  const secondAgentId = await createAgent(secondAgentUser.userId, agencyId, 'Second Agent', secondAgentUser.email);
  const outsideAgentId = await createAgent(
    outsideAgentUser.userId,
    outsideAgencyId,
    'Outside Agent',
    outsideAgentUser.email,
  );

  async function createInventory(input: {
    agency: number;
    ownerUserId: number;
    agent: number;
    inventoryLabel: string;
  }) {
    const [listingInsert] = await db.insert(listings).values({
      ownerId: input.ownerUserId,
      agencyId: input.agency,
      agentId: input.agent,
      action: 'sell',
      propertyType: 'house',
      title: `Viewing Listing ${input.inventoryLabel} ${suffix}`,
      description: 'Listing used by the agency viewings integration test',
      askingPrice: '2500000',
      address: '123 Viewing Street',
      latitude: '-26.1076000',
      longitude: '28.0567000',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'published',
      slug: `viewing-listing-${input.inventoryLabel}-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      readinessScore: 95,
      qualityScore: 95,
    } as any);
    const listingId = insertId(listingInsert);
    createdState.listingIds.push(listingId);

    const [propertyInsert] = await db.insert(properties).values({
      title: `Viewing Property ${input.inventoryLabel} ${suffix}`,
      description: 'Property used by the agency viewings integration test',
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 2500000,
      bedrooms: 3,
      bathrooms: 2,
      area: 180,
      address: '123 Viewing Street',
      city: 'Johannesburg',
      province: 'Gauteng',
      latitude: '-26.1076',
      longitude: '28.0567',
      status: 'available',
      featured: 0,
      views: 0,
      enquiries: 0,
      agentId: input.agent,
      ownerId: input.ownerUserId,
      sourceListingId: listingId,
    } as any);
    const propertyId = insertId(propertyInsert);
    createdState.propertyIds.push(propertyId);

    return { listingId, propertyId };
  }

  const inventory = await createInventory({
    agency: agencyId,
    ownerUserId: admin.userId,
    agent: agentId,
    inventoryLabel: 'primary',
  });
  const outsideInventory = await createInventory({
    agency: outsideAgencyId,
    ownerUserId: outsideAdmin.userId,
    agent: outsideAgentId,
    inventoryLabel: 'outside',
  });

  const leadId = await seedLead({
    propertyId: inventory.propertyId,
    agencyId,
    agentId,
    suffix,
    label: 'primary',
  });
  const secondaryLeadId = await seedLead({
    propertyId: inventory.propertyId,
    agencyId,
    agentId,
    suffix,
    label: 'secondary',
  });
  const tertiaryLeadId = await seedLead({
    propertyId: inventory.propertyId,
    agencyId,
    agentId,
    suffix,
    label: 'tertiary',
  });
  const outsideLeadId = await seedLead({
    propertyId: outsideInventory.propertyId,
    agencyId: outsideAgencyId,
    agentId: outsideAgentId,
    suffix,
    label: 'outside',
  });

  return {
    agencyId,
    outsideAgencyId,
    adminUserId: admin.userId,
    agentUserId: agentUser.userId,
    secondAgentUserId: secondAgentUser.userId,
    outsideAdminUserId: outsideAdmin.userId,
    outsideAgentUserId: outsideAgentUser.userId,
    agentId,
    secondAgentId,
    outsideAgentId,
    listingId: inventory.listingId,
    propertyId: inventory.propertyId,
    outsideListingId: outsideInventory.listingId,
    outsidePropertyId: outsideInventory.propertyId,
    leadId,
    secondaryLeadId,
    tertiaryLeadId,
    outsideLeadId,
  };
}

describeWithDb('agency viewings and My Day persisted workflow', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const showingIds = uniqueNumbers(createdState.showingIds);
    const leadIds = uniqueNumbers(createdState.leadIds);
    const propertyIds = uniqueNumbers(createdState.propertyIds);
    const listingIds = uniqueNumbers(createdState.listingIds);
    const agentIds = uniqueNumbers(createdState.agentIds);
    const userIds = uniqueNumbers(createdState.userIds);
    const agencyIds = uniqueNumbers(createdState.agencyIds);

    if (showingIds.length) await db.delete(showings).where(inArray(showings.id, showingIds));
    if (leadIds.length) await db.delete(leadActivities).where(inArray(leadActivities.leadId, leadIds));
    if (leadIds.length) await db.delete(leads).where(inArray(leads.id, leadIds));
    if (propertyIds.length) await db.delete(properties).where(inArray(properties.id, propertyIds));
    if (listingIds.length) await db.delete(listings).where(inArray(listings.id, listingIds));
    if (agentIds.length) await db.delete(agents).where(inArray(agents.id, agentIds));
    if (userIds.length) await db.delete(notifications).where(inArray(notifications.userId, userIds));
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    if (agencyIds.length) await db.delete(agencies).where(inArray(agencies.id, agencyIds));

    createdState.showingIds = [];
    createdState.leadIds = [];
    createdState.propertyIds = [];
    createdState.listingIds = [];
    createdState.agentIds = [];
    createdState.userIds = [];
    createdState.agencyIds = [];
  }, 30_000);

  it('creates canonical agency viewings, enforces tenancy, and allows same-agency agents to view them', async () => {
    const seed = await seedAgencyFixture('tenancy');
    const adminCaller = createCaller({
      id: seed.adminUserId,
      role: 'agency_admin',
      agencyId: seed.agencyId,
    });
    const agentCaller = createCaller({
      id: seed.agentUserId,
      role: 'agent',
      agencyId: seed.agencyId,
    });
    const outsideCaller = createCaller({
      id: seed.outsideAdminUserId,
      role: 'agency_admin',
      agencyId: seed.outsideAgencyId,
    });

    const created = await adminCaller.createViewing({
      leadId: seed.leadId,
      listingId: seed.listingId,
      agentId: seed.agentId,
      scheduledAt: futureIso(4),
      status: 'awaiting_confirmation',
      location: 'Show unit',
      notes: 'Bring FICA checklist',
    });
    createdState.showingIds.push(created.viewingId);

    const detail = await adminCaller.getViewingDetail({ viewingId: created.viewingId });
    expect(detail).toEqual(
      expect.objectContaining({
        id: created.viewingId,
        leadId: seed.leadId,
        listingId: seed.listingId,
        propertyId: seed.propertyId,
        createdByUserId: seed.adminUserId,
        location: 'Show unit',
      }),
    );
    expect(detail.creator).toEqual(expect.objectContaining({ id: seed.adminUserId }));

    const agentVisible = await agentCaller.getViewings({ status: 'all', limit: 20 });
    expect(agentVisible.viewings.map(viewing => viewing.id)).toContain(created.viewingId);

    const myDay = await adminCaller.getMyDay({
      date: agencyDateKey(new Date(detail.scheduledAt)),
      limit: 20,
    });
    const myDayIds = myDay.todayViewings.map(viewing => viewing.id);
    expect(myDayIds).toContain(created.viewingId);
    expect(new Set(myDayIds).size).toBe(myDayIds.length);

    await expect(outsideCaller.getViewingDetail({ viewingId: created.viewingId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
    await expect(
      adminCaller.createViewing({
        leadId: seed.secondaryLeadId,
        listingId: seed.outsideListingId,
        agentId: seed.agentId,
        scheduledAt: futureIso(5),
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  }, 30_000);

  it('enforces lifecycle transitions, reschedule history, idempotent notifications, reassignment permissions, and feedback follow-up', async () => {
    const seed = await seedAgencyFixture('lifecycle');
    const adminCaller = createCaller({
      id: seed.adminUserId,
      role: 'agency_admin',
      agencyId: seed.agencyId,
    });
    const agentCaller = createCaller({
      id: seed.agentUserId,
      role: 'agent',
      agencyId: seed.agencyId,
    });

    const created = await adminCaller.createViewing({
      leadId: seed.leadId,
      listingId: seed.listingId,
      agentId: seed.agentId,
      scheduledAt: futureIso(6),
      status: 'awaiting_confirmation',
    });
    createdState.showingIds.push(created.viewingId);

    await adminCaller.updateViewingStatus({ viewingId: created.viewingId, status: 'confirmed' });
    const confirmDedupe = `viewing:${created.viewingId}:status:confirmed`;
    expect(await countNotificationDedupe(seed.agentUserId, confirmDedupe)).toBe(1);
    const replayed = await adminCaller.updateViewingStatus({
      viewingId: created.viewingId,
      status: 'confirmed',
    });
    expect(replayed).toEqual({ success: true, idempotent: true });
    expect(await countNotificationDedupe(seed.agentUserId, confirmDedupe)).toBe(1);

    const rescheduledAt = futureIso(30);
    await adminCaller.rescheduleViewing({
      viewingId: created.viewingId,
      scheduledAt: rescheduledAt,
      note: 'Buyer moved the appointment',
    });
    const rescheduledDetail = await adminCaller.getViewingDetail({ viewingId: created.viewingId });
    expect(rescheduledDetail.status).toBe('rescheduled');
    expect(rescheduledDetail.rescheduleHistory).toHaveLength(1);
    expect(rescheduledDetail.rescheduleHistory[0]).toEqual(
      expect.objectContaining({
        previousStatus: 'confirmed',
        nextStatus: 'rescheduled',
        note: 'Buyer moved the appointment',
      }),
    );

    await adminCaller.updateViewingStatus({ viewingId: created.viewingId, status: 'confirmed' });
    await adminCaller.updateViewingStatus({ viewingId: created.viewingId, status: 'completed' });
    await expect(
      adminCaller.updateViewingStatus({ viewingId: created.viewingId, status: 'confirmed' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const followUpDate = futureIso(72);
    await adminCaller.submitViewingFeedback({
      viewingId: created.viewingId,
      feedback: {
        attended: true,
        interestLevel: 'high',
        recommendedNextAction: 'follow_up',
        followUpDate,
        notes: 'Buyer wants a second look with family.',
      },
    });
    const feedbackDetail = await adminCaller.getViewingDetail({ viewingId: created.viewingId });
    expect(feedbackDetail.feedbackStructured).toEqual(
      expect.objectContaining({
        attended: true,
        interestLevel: 'high',
        recommendedNextAction: 'follow_up',
      }),
    );

    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [leadAfterFeedback] = await db
      .select({ nextFollowUp: leads.nextFollowUp })
      .from(leads)
      .where(eq(leads.id, seed.leadId))
      .limit(1);
    expect(leadAfterFeedback?.nextFollowUp).toBeTruthy();

    const reassignment = await adminCaller.createViewing({
      leadId: seed.secondaryLeadId,
      listingId: seed.listingId,
      agentId: seed.agentId,
      scheduledAt: futureIso(8),
      status: 'confirmed',
    });
    createdState.showingIds.push(reassignment.viewingId);

    await expect(
      agentCaller.reassignViewing({
        viewingId: reassignment.viewingId,
        agentId: seed.secondAgentId,
      }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await adminCaller.reassignViewing({
      viewingId: reassignment.viewingId,
      agentId: seed.secondAgentId,
    });
    const reassignedDetail = await adminCaller.getViewingDetail({
      viewingId: reassignment.viewingId,
    });
    expect(reassignedDetail.agent?.id).toBe(seed.secondAgentId);
  }, 30_000);

  it('uses Africa/Johannesburg day boundaries for My Day', async () => {
    const seed = await seedAgencyFixture('timezone');
    const caller = createCaller({
      id: seed.adminUserId,
      role: 'agency_admin',
      agencyId: seed.agencyId,
    });

    const targetDate = new Date(Date.now() + 48 * 60 * 60 * 1000);
    const targetDay = agencyDateKey(targetDate);
    const followingDay = agencyDateKey(
      new Date(targetDate.getTime() + 24 * 60 * 60 * 1000),
    );
    const first = await caller.createViewing({
      leadId: seed.leadId,
      listingId: seed.listingId,
      agentId: seed.agentId,
      scheduledAt: jhbIso(targetDay, '00:30:00'),
      status: 'confirmed',
    });
    const second = await caller.createViewing({
      leadId: seed.secondaryLeadId,
      listingId: seed.listingId,
      agentId: seed.agentId,
      scheduledAt: jhbIso(targetDay, '23:30:00'),
      status: 'confirmed',
    });
    const nextDay = await caller.createViewing({
      leadId: seed.tertiaryLeadId,
      listingId: seed.listingId,
      agentId: seed.agentId,
      scheduledAt: jhbIso(followingDay, '00:30:00'),
      status: 'confirmed',
    });
    createdState.showingIds.push(first.viewingId, second.viewingId, nextDay.viewingId);

    const myDay = await caller.getMyDay({ date: targetDay, limit: 20 });
    const ids = myDay.todayViewings.map(viewing => viewing.id);
    expect(myDay.date).toBe(targetDay);
    expect(ids).toContain(first.viewingId);
    expect(ids).toContain(second.viewingId);
    expect(ids).not.toContain(nextDay.viewingId);
    expect(new Set(ids).size).toBe(ids.length);
  }, 30_000);

  it('escalates an ignored buyer lead then records a structured first response', async () => {
    const seed = await seedAgencyFixture('buyer-response');
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const agentCaller = createCaller({
      id: seed.agentUserId,
      role: 'agent',
      agencyId: seed.agencyId,
    });
    const outsideCaller = createCaller({
      id: seed.outsideAdminUserId,
      role: 'agency_admin',
      agencyId: seed.outsideAgencyId,
    });

    await db
      .update(leads)
      .set({ createdAt: sql`DATE_SUB(NOW(), INTERVAL 20 MINUTE)` } as any)
      .where(eq(leads.id, seed.leadId));

    const [ignoredLead] = await db
      .select({
        id: leads.id,
        status: leads.status,
        agentId: leads.agentId,
        createdAt: leads.createdAt,
        firstRespondedAt: leads.firstRespondedAt,
      })
      .from(leads)
      .where(eq(leads.id, seed.leadId));
    expect(ignoredLead).toMatchObject({
      id: seed.leadId,
      status: 'new',
      agentId: seed.agentId,
      firstRespondedAt: null,
    });

    const [matchingEscalation] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(leads)
      .leftJoin(agents, eq(leads.agentId, agents.id))
      .where(
        and(
          eq(leads.agencyId, seed.agencyId),
          eq(agents.userId, seed.agentUserId),
          inArray(leads.status, ['new', 'contacted', 'qualified', 'viewing_scheduled', 'offer_sent']),
          sql`${leads.firstRespondedAt} IS NULL`,
          sql`${leads.createdAt} <= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
        ),
      );
    expect(Number(matchingEscalation.count)).toBe(1);

    const beforeResponse = await agentCaller.getMyDay({ limit: 20 });
    expect(beforeResponse.counts.firstResponseOverdueLeads).toBeGreaterThanOrEqual(1);
    expect(beforeResponse.firstResponseOverdueLeads.map(lead => lead.id)).toContain(seed.leadId);
    expect(beforeResponse.firstResponseOverdueLeads.find(lead => lead.id === seed.leadId)).toMatchObject({
      firstResponseOverdue: true,
      nextAction: 'Make first buyer contact',
    });

    await agentCaller.recordLeadContactAttempt({
      leadId: seed.leadId,
      channel: 'whatsapp',
      outcome: 'follow_up_required',
      summary: 'Buyer replied and requested a call after work.',
      nextAction: 'Call buyer at 17:30',
      nextFollowUp: futureIso(2),
    });

    const detail = await agentCaller.getLeadDetail({ leadId: seed.leadId });
    expect(detail).toMatchObject({
      status: 'contacted',
      nextAction: 'Call buyer at 17:30',
      firstResponseOverdue: false,
    });
    expect(detail.firstRespondedAt).toBeTruthy();
    const [recordedResponseTiming] = await db
      .select({
        elapsedSeconds: sql<number>`TIMESTAMPDIFF(SECOND, ${leads.createdAt}, ${leads.firstRespondedAt})`,
      })
      .from(leads)
      .where(eq(leads.id, seed.leadId));
    expect(Number(recordedResponseTiming.elapsedSeconds)).toBeGreaterThanOrEqual(0);
    expect(detail.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'contact_attempt',
          description: 'Buyer replied and requested a call after work.',
          metadata: expect.objectContaining({ channel: 'whatsapp', outcome: 'follow_up_required' }),
        }),
      ]),
    );

    const afterResponse = await agentCaller.getMyDay({ limit: 20 });
    expect(afterResponse.firstResponseOverdueLeads.map(lead => lead.id)).not.toContain(seed.leadId);

    await expect(
      outsideCaller.recordLeadContactAttempt({
        leadId: seed.leadId,
        channel: 'call',
        outcome: 'reached',
        summary: 'Cross-agency attempt',
        nextAction: 'Never allowed',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  }, 30_000);
});
