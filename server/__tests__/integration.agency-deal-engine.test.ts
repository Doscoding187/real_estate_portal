import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray, sql } from 'drizzle-orm';

import { agencyRouter } from '../agencyRouter';
import { getDb } from '../db-connection';
import {
  agencies,
  agencyDealOfferVersions,
  agencyDeals,
  agencyTransactionActivity,
  agencyTransactionConditions,
  agencyTransactionDocuments,
  agencyTransactionMilestones,
  agencyTransactionParties,
  agencyTransactions,
  agents,
  leadActivities,
  leads,
  listings,
  properties,
  showings,
  users,
} from '../../drizzle/schema';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

function isLocalAcceptanceDatabase(databaseUrl?: string) {
  if (!databaseUrl) return false;
  try {
    const parsed = new URL(databaseUrl);
    return (
      ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
      parsed.pathname.replace(/^\//, '') === 'listify_local'
    );
  } catch {
    return false;
  }
}

if (process.env.NODE_ENV === 'test' && isLocalAcceptanceDatabase(process.env.DATABASE_URL)) {
  process.env.NODE_ENV = 'development';
}

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL test DB)`, fn)) as typeof describe);

const createdState = {
  agencyIds: [] as number[],
  userIds: [] as number[],
  agentIds: [] as number[],
  listingIds: [] as number[],
  propertyIds: [] as number[],
  leadIds: [] as number[],
  showingIds: [] as number[],
  dealIds: [] as number[],
  offerVersionIds: [] as number[],
  transactionIds: [] as number[],
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
    requestId: `agency-deal-engine-test-${Date.now()}`,
  } as any);
}

function futureIso(daysFromNow: number, hours = 9) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
}

function toDbTimestamp(date: Date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function futureDbTimestamp(daysFromNow: number, hours = 9) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hours, 0, 0, 0);
  return toDbTimestamp(date);
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

function jhbIso(dateKey: string, time = '10:00:00') {
  return new Date(`${dateKey}T${time}+02:00`).toISOString();
}

async function countRows(table: any, where: any) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(table)
    .where(where);
  return Number(row?.count || 0);
}

async function seedAgencyFixture(label: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}-${label}`;

  const [agencyInsert] = await db.insert(agencies).values({
    name: `Deal Agency ${suffix}`,
    slug: `deal-agency-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
    email: `deal-agency-${suffix}@example.com`,
    city: 'Johannesburg',
    province: 'Gauteng',
    subscriptionPlan: 'free',
    subscriptionStatus: 'trial',
    isVerified: 1,
  } as any);
  const agencyId = insertId(agencyInsert);
  createdState.agencyIds.push(agencyId);

  const [outsideAgencyInsert] = await db.insert(agencies).values({
    name: `Outside Deal Agency ${suffix}`,
    slug: `outside-deal-agency-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
    email: `outside-deal-agency-${suffix}@example.com`,
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
      onboardingComplete: 1,
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
      title: `Deal Listing ${input.inventoryLabel} ${suffix}`,
      description: 'Listing used by the agency deal engine integration test',
      askingPrice: '2500000',
      address: '123 Offer Street',
      latitude: '-26.1076000',
      longitude: '28.0567000',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'published',
      slug: `deal-listing-${input.inventoryLabel}-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      readinessScore: 95,
      qualityScore: 95,
    } as any);
    const listingId = insertId(listingInsert);
    createdState.listingIds.push(listingId);

    const [propertyInsert] = await db.insert(properties).values({
      title: `Deal Property ${input.inventoryLabel} ${suffix}`,
      description: 'Property used by the agency deal engine integration test',
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 2500000,
      bedrooms: 3,
      bathrooms: 2,
      area: 180,
      address: '123 Offer Street',
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

  async function createLead(input: {
    propertyId: number;
    agency: number;
    agent: number;
    leadLabel: string;
  }) {
    const [leadInsert] = await db.insert(leads).values({
      propertyId: input.propertyId,
      agencyId: input.agency,
      agentId: input.agent,
      name: `Deal Buyer ${input.leadLabel} ${suffix}`,
      email: `deal-buyer-${input.leadLabel}-${suffix}@example.com`,
      phone: '+27110000000',
      message: 'Interested after completed viewing',
      leadType: 'viewing_request',
      status: 'qualified',
      source: 'integration-test',
      funnelStage: 'viewing',
    } as any);
    const leadId = insertId(leadInsert);
    createdState.leadIds.push(leadId);
    return leadId;
  }

  async function createCompletedViewing(input: {
    listingId: number;
    propertyId: number;
    leadId: number;
    agentId: number;
    createdByUserId: number;
    status?: 'completed' | 'confirmed';
  }) {
    const [showingInsert] = await db.insert(showings).values({
      listingId: input.listingId,
      propertyId: input.propertyId,
      leadId: input.leadId,
      agentId: input.agentId,
      createdByUserId: input.createdByUserId,
      scheduledAt: futureDbTimestamp(-1, 11),
      status: input.status || 'completed',
      visitorName: `Deal Buyer ${suffix}`,
      durationMinutes: 45,
      notes: 'Completed viewing for offer acceptance test',
    } as any);
    const showingId = insertId(showingInsert);
    createdState.showingIds.push(showingId);
    return showingId;
  }

  const admin = await createUser('agency_admin', agencyId, 'Deal Admin');
  const agentUser = await createUser('agent', agencyId, 'Deal Agent');
  const outsideAdmin = await createUser('agency_admin', outsideAgencyId, 'Outside Admin');
  const outsideAgentUser = await createUser('agent', outsideAgencyId, 'Outside Agent');

  const agentId = await createAgent(agentUser.userId, agencyId, 'Deal Agent', agentUser.email);
  const outsideAgentId = await createAgent(
    outsideAgentUser.userId,
    outsideAgencyId,
    'Outside Agent',
    outsideAgentUser.email,
  );

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

  const leadId = await createLead({
    propertyId: inventory.propertyId,
    agency: agencyId,
    agent: agentId,
    leadLabel: 'primary',
  });
  const invalidLifecycleLeadId = await createLead({
    propertyId: inventory.propertyId,
    agency: agencyId,
    agent: agentId,
    leadLabel: 'invalid-lifecycle',
  });
  const outsideLeadId = await createLead({
    propertyId: outsideInventory.propertyId,
    agency: outsideAgencyId,
    agent: outsideAgentId,
    leadLabel: 'outside',
  });

  const viewingId = await createCompletedViewing({
    listingId: inventory.listingId,
    propertyId: inventory.propertyId,
    leadId,
    agentId,
    createdByUserId: admin.userId,
  });
  const confirmedViewingId = await createCompletedViewing({
    listingId: inventory.listingId,
    propertyId: inventory.propertyId,
    leadId: invalidLifecycleLeadId,
    agentId,
    createdByUserId: admin.userId,
    status: 'confirmed',
  });

  return {
    agencyId,
    outsideAgencyId,
    adminUserId: admin.userId,
    outsideAdminUserId: outsideAdmin.userId,
    agentId,
    outsideAgentId,
    listingId: inventory.listingId,
    propertyId: inventory.propertyId,
    outsideListingId: outsideInventory.listingId,
    outsidePropertyId: outsideInventory.propertyId,
    leadId,
    invalidLifecycleLeadId,
    outsideLeadId,
    viewingId,
    confirmedViewingId,
  };
}

async function queryDealOfferRows(agencyId: number, dealId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  return await db
    .select()
    .from(agencyDealOfferVersions)
    .where(
      and(
        eq(agencyDealOfferVersions.agencyId, agencyId),
        eq(agencyDealOfferVersions.dealId, dealId),
      ),
    )
    .orderBy(agencyDealOfferVersions.versionNumber);
}

describeWithDb('agency deal engine persisted workflow', () => {
  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    const transactionIds = uniqueNumbers(createdState.transactionIds);
    const dealIds = uniqueNumbers(createdState.dealIds);
    const showingIds = uniqueNumbers(createdState.showingIds);
    const leadIds = uniqueNumbers(createdState.leadIds);
    const propertyIds = uniqueNumbers(createdState.propertyIds);
    const listingIds = uniqueNumbers(createdState.listingIds);
    const agentIds = uniqueNumbers(createdState.agentIds);
    const userIds = uniqueNumbers(createdState.userIds);
    const agencyIds = uniqueNumbers(createdState.agencyIds);

    if (transactionIds.length) {
      await db
        .delete(agencyTransactionDocuments)
        .where(inArray(agencyTransactionDocuments.transactionId, transactionIds));
      await db
        .delete(agencyTransactionConditions)
        .where(inArray(agencyTransactionConditions.transactionId, transactionIds));
      await db
        .delete(agencyTransactionMilestones)
        .where(inArray(agencyTransactionMilestones.transactionId, transactionIds));
      await db
        .delete(agencyTransactionParties)
        .where(inArray(agencyTransactionParties.transactionId, transactionIds));
      await db
        .delete(agencyTransactionActivity)
        .where(inArray(agencyTransactionActivity.transactionId, transactionIds));
      await db.delete(agencyTransactions).where(inArray(agencyTransactions.id, transactionIds));
    }
    if (dealIds.length)
      await db
        .delete(agencyDealOfferVersions)
        .where(inArray(agencyDealOfferVersions.dealId, dealIds));
    if (dealIds.length) await db.delete(agencyDeals).where(inArray(agencyDeals.id, dealIds));
    if (showingIds.length) await db.delete(showings).where(inArray(showings.id, showingIds));
    if (leadIds.length)
      await db.delete(leadActivities).where(inArray(leadActivities.leadId, leadIds));
    if (leadIds.length) await db.delete(leads).where(inArray(leads.id, leadIds));
    if (propertyIds.length) await db.delete(properties).where(inArray(properties.id, propertyIds));
    if (listingIds.length) await db.delete(listings).where(inArray(listings.id, listingIds));
    if (agentIds.length) await db.delete(agents).where(inArray(agents.id, agentIds));
    if (userIds.length) await db.delete(users).where(inArray(users.id, userIds));
    if (agencyIds.length) await db.delete(agencies).where(inArray(agencies.id, agencyIds));

    createdState.agencyIds = [];
    createdState.userIds = [];
    createdState.agentIds = [];
    createdState.listingIds = [];
    createdState.propertyIds = [];
    createdState.leadIds = [];
    createdState.showingIds = [];
    createdState.dealIds = [];
    createdState.offerVersionIds = [];
    createdState.transactionIds = [];
  }, 30_000);

  it('turns a completed viewing into one accepted transaction with immutable terms, deadlines, private documents, and commission', async () => {
    const seed = await seedAgencyFixture('happy-path');
    const caller = createCaller({
      id: seed.adminUserId,
      role: 'agency_admin',
      agencyId: seed.agencyId,
    });
    const outsideCaller = createCaller({
      id: seed.outsideAdminUserId,
      role: 'agency_admin',
      agencyId: seed.outsideAgencyId,
    });

    const createdDeal = await caller.createDeal({
      leadId: seed.leadId,
      sourceViewingId: seed.viewingId,
      listingId: seed.listingId,
      propertyId: seed.propertyId,
      responsibleAgentId: seed.agentId,
      transactionType: 'sale',
      interestStatus: 'wants_offer',
      terms: {
        amount: 1_850_000,
        depositAmount: 100_000,
        financeRequired: true,
        bondAmount: 1_500_000,
        offerExpiry: futureIso(1),
        conditionsSummary: 'Bond approval and signed offer document.',
      },
    });
    createdState.dealIds.push(createdDeal.dealId);
    if (createdDeal.offerVersionId) createdState.offerVersionIds.push(createdDeal.offerVersionId);

    await caller.submitOfferVersion({
      offerVersionId: Number(createdDeal.offerVersionId),
      note: 'Initial sale offer submitted.',
    });
    await expect(
      caller.submitOfferVersion({ offerVersionId: Number(createdDeal.offerVersionId) }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const sellerCounter = await caller.createOfferVersion({
      dealId: createdDeal.dealId,
      actor: 'seller',
      eventType: 'seller_counter',
      status: 'submitted',
      parentOfferVersionId: createdDeal.offerVersionId,
      terms: {
        amount: 1_950_000,
        offerExpiry: futureIso(2),
        specialConditions: 'Seller counters with earlier occupation.',
      },
    });
    createdState.offerVersionIds.push(sellerCounter.offerVersionId);

    const buyerFinal = await caller.createOfferVersion({
      dealId: createdDeal.dealId,
      actor: 'buyer',
      eventType: 'buyer_counter',
      status: 'submitted',
      parentOfferVersionId: sellerCounter.offerVersionId,
      terms: {
        amount: 1_900_000,
        depositAmount: 120_000,
        financeRequired: true,
        bondAmount: 1_450_000,
        offerExpiry: futureIso(3),
        specialConditions: 'Final offer subject to signed OTP and bond approval.',
      },
    });
    createdState.offerVersionIds.push(buyerFinal.offerVersionId);

    expect(
      (await queryDealOfferRows(seed.agencyId, createdDeal.dealId)).map(offer => ({
        versionNumber: offer.versionNumber,
        amount: Number(offer.amount),
        status: offer.status,
      })),
    ).toEqual([
      { versionNumber: 1, amount: 1_850_000, status: 'countered' },
      { versionNumber: 2, amount: 1_950_000, status: 'countered' },
      { versionNumber: 3, amount: 1_900_000, status: 'submitted' },
    ]);

    const accepted = await caller.acceptOfferVersion({
      offerVersionId: buyerFinal.offerVersionId,
      commissionBasis: 'percentage',
      commissionPercentage: 5,
      commissionVatTreatment: 'exclusive',
      agencySharePercentage: 60,
      referralSplit: 5_000,
      otherDeductions: 2_000,
      expectedPaymentDate: futureIso(91),
      transferDutyVatTreatment: 'transfer_duty',
      note: 'Final buyer response accepted.',
    });
    createdState.transactionIds.push(accepted.transactionId);
    expect(accepted).toEqual(
      expect.objectContaining({
        success: true,
        idempotent: false,
        dealId: createdDeal.dealId,
      }),
    );

    const replayedAcceptance = await caller.acceptOfferVersion({
      offerVersionId: buyerFinal.offerVersionId,
      commissionBasis: 'percentage',
      commissionPercentage: 5,
      commissionVatTreatment: 'exclusive',
      agencySharePercentage: 60,
      referralSplit: 5_000,
      otherDeductions: 2_000,
      transferDutyVatTreatment: 'transfer_duty',
    });
    expect(replayedAcceptance).toEqual(
      expect.objectContaining({
        success: true,
        idempotent: true,
        transactionId: accepted.transactionId,
      }),
    );

    await expect(
      caller.createOfferVersion({
        dealId: createdDeal.dealId,
        actor: 'seller',
        eventType: 'seller_counter',
        status: 'submitted',
        terms: { amount: 2_000_000 },
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const [transaction] = await db
      .select()
      .from(agencyTransactions)
      .where(eq(agencyTransactions.id, accepted.transactionId))
      .limit(1);

    expect(Number(transaction.acceptedAmount)).toBe(1_900_000);
    expect(transaction.acceptedOfferVersionId).toBe(buyerFinal.offerVersionId);
    expect(transaction.acceptedTermsSnapshot).toEqual(
      expect.objectContaining({
        amount: 1_900_000,
        depositAmount: 120_000,
        financeRequired: true,
        bondAmount: 1_450_000,
        specialConditions: 'Final offer subject to signed OTP and bond approval.',
      }),
    );
    expect(Number(transaction.grossCommission)).toBe(95_000);
    expect(Number(transaction.expectedCommission)).toBe(88_000);
    expect(Number(transaction.agencyShare)).toBe(52_800);
    expect(Number(transaction.agentShare)).toBe(35_200);
    expect(transaction.commissionStatus).toBe('estimated');

    expect(
      await countRows(
        agencyTransactions,
        and(
          eq(agencyTransactions.agencyId, seed.agencyId),
          eq(agencyTransactions.dealId, createdDeal.dealId),
        ),
      ),
    ).toBe(1);

    const milestones = await db
      .select()
      .from(agencyTransactionMilestones)
      .where(eq(agencyTransactionMilestones.transactionId, accepted.transactionId));
    const conditions = await db
      .select()
      .from(agencyTransactionConditions)
      .where(eq(agencyTransactionConditions.transactionId, accepted.transactionId));
    const parties = await db
      .select()
      .from(agencyTransactionParties)
      .where(eq(agencyTransactionParties.transactionId, accepted.transactionId));
    const activity = await db
      .select()
      .from(agencyTransactionActivity)
      .where(eq(agencyTransactionActivity.transactionId, accepted.transactionId));

    expect(milestones.map(milestone => milestone.title)).toContain('Deposit due');
    expect(conditions.map(condition => condition.title)).toContain('Signed offer document');
    expect(parties.map(party => party.role).sort()).toEqual(['buyer', 'listing_agent']);
    expect(activity.map(item => item.eventType)).toEqual(
      expect.arrayContaining(['offer_accepted', 'transaction_opened']),
    );

    const targetDay = agencyDateKey(new Date(Date.now() + 4 * 24 * 60 * 60 * 1000));
    const customCondition = await caller.addTransactionCondition({
      transactionId: accepted.transactionId,
      title: 'Acceptance proof deadline',
      responsibleParty: 'agency',
      dueAt: jhbIso(targetDay),
      description: 'Visible in My Day acceptance proof.',
    });
    const document = await caller.addTransactionDocument({
      transactionId: accepted.transactionId,
      conditionId: customCondition.conditionId,
      documentType: 'signed_offer',
      fileName: 'signed-offer-acceptance-proof.pdf',
      storageKey: `private/agency-${seed.agencyId}/transactions/${accepted.transactionId}/${randomUUID()}.pdf`,
      contentType: 'application/pdf',
      fileSize: 1024,
      notes: 'Local acceptance metadata only; private binary storage is not configured.',
    });
    expect(document.documentId).toBeGreaterThan(0);
    await expect(
      caller.addTransactionDocument({
        transactionId: accepted.transactionId,
        documentType: 'signed_offer',
        fileName: 'public-url-rejected.pdf',
        storageKey: 'https://public.example.invalid/signed-offer.pdf',
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const [storedDocument] = await db
      .select()
      .from(agencyTransactionDocuments)
      .where(eq(agencyTransactionDocuments.id, document.documentId))
      .limit(1);
    expect(storedDocument.visibilityScope).toBe('agency_private');
    expect(storedDocument.storageKey).toMatch(/^private\/agency-/);
    expect(storedDocument.storageKey).toContain(`/transactions/${accepted.transactionId}/`);

    const myDayBeforeConditionCompletion = await caller.getMyDay({ date: targetDay, limit: 30 });
    expect(
      myDayBeforeConditionCompletion.transactionDeadlines.map((deadline: any) => deadline.title),
    ).toContain(
      'Acceptance proof deadline',
    );
    expect(
      new Set(myDayBeforeConditionCompletion.transactionDeadlines.map((deadline: any) => deadline.id))
        .size,
    ).toBe(
      myDayBeforeConditionCompletion.transactionDeadlines.length,
    );

    const depositMilestone = milestones.find(milestone => milestone.title === 'Deposit due');
    expect(depositMilestone?.id).toBeTruthy();
    await caller.updateTransactionWorkItem({
      transactionId: accepted.transactionId,
      itemType: 'milestone',
      itemId: Number(depositMilestone?.id),
      status: 'completed',
      notes: 'Deposit milestone completed for reload persistence proof.',
    });
    await caller.updateTransactionWorkItem({
      transactionId: accepted.transactionId,
      itemType: 'condition',
      itemId: customCondition.conditionId,
      status: 'completed',
      notes: 'Acceptance proof condition completed for My Day proof.',
    });

    const myDayAfterConditionCompletion = await caller.getMyDay({ date: targetDay, limit: 30 });
    expect(
      myDayAfterConditionCompletion.transactionDeadlines.map((deadline: any) => deadline.title),
    ).not.toContain('Acceptance proof deadline');
    expect(
      new Set(myDayAfterConditionCompletion.transactionDeadlines.map((deadline: any) => deadline.id))
        .size,
    ).toBe(myDayAfterConditionCompletion.transactionDeadlines.length);

    await caller.updateTransaction({
      transactionId: accepted.transactionId,
      status: 'completed',
      commissionStatus: 'payable',
      note: 'Completion update should not alter expected commission snapshot.',
    });

    const workspace = await caller.getDealWorkspace({ dealId: createdDeal.dealId, limit: 10 });
    expect(workspace).toHaveLength(1);
    expect(workspace[0].offers).toHaveLength(3);
    expect(new Set(workspace[0].offers.map((offer: any) => offer.id)).size).toBe(3);
    expect(workspace[0].transaction?.id).toBe(accepted.transactionId);
    expect(workspace[0].transaction?.milestones?.length).toBeGreaterThan(0);
    expect(
      workspace[0].transaction?.conditions?.map((condition: any) => condition.title),
    ).toContain('Acceptance proof deadline');
    expect(workspace[0].transaction?.documents?.map((item: any) => item.fileName)).toContain(
      'signed-offer-acceptance-proof.pdf',
    );
    expect(
      workspace[0].transaction?.milestones?.find((item: any) => item.id === depositMilestone?.id)
        ?.status,
    ).toBe('completed');
    expect(
      workspace[0].transaction?.conditions?.find(
        (item: any) => item.id === customCondition.conditionId,
      )?.status,
    ).toBe('completed');
    expect(workspace[0].transaction?.activity?.map((item: any) => item.eventType)).toEqual(
      expect.arrayContaining([
        'offer_accepted',
        'transaction_opened',
        'document_added',
        'condition_added',
        'milestone_completed',
        'condition_completed',
        'transaction_updated',
      ]),
    );
    expect(Number(workspace[0].transaction?.expectedCommission || 0)).toBe(88_000);
    expect(workspace[0].transaction?.commissionStatus).toBe('payable');

    const reloadedWorkspace = await caller.getDealWorkspace({ dealId: createdDeal.dealId, limit: 10 });
    expect(reloadedWorkspace[0].transaction?.activity?.map((item: any) => item.eventType)).toEqual(
      workspace[0].transaction?.activity?.map((item: any) => item.eventType),
    );
    expect(Number(reloadedWorkspace[0].transaction?.expectedCommission || 0)).toBe(88_000);

    const invisibleFromOutsideAgency = await outsideCaller.getDealWorkspace({
      dealId: createdDeal.dealId,
      limit: 10,
    });
    expect(invisibleFromOutsideAgency).toEqual([]);
    await expect(
      outsideCaller.updateTransactionWorkItem({
        transactionId: accepted.transactionId,
        itemType: 'milestone',
        itemId: Number(depositMilestone?.id),
        status: 'completed',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      outsideCaller.updateTransactionWorkItem({
        transactionId: accepted.transactionId,
        itemType: 'condition',
        itemId: customCondition.conditionId,
        status: 'completed',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      outsideCaller.addTransactionCondition({
        transactionId: accepted.transactionId,
        title: 'Cross-agency condition',
        responsibleParty: 'agency',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      outsideCaller.addTransactionDocument({
        transactionId: accepted.transactionId,
        documentType: 'signed_offer',
        fileName: 'cross-agency.pdf',
        storageKey: `private/agency-${seed.outsideAgencyId}/transactions/${accepted.transactionId}/cross.pdf`,
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(
      outsideCaller.updateTransaction({
        transactionId: accepted.transactionId,
        status: 'cancelled',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    const finalOffers = await queryDealOfferRows(seed.agencyId, createdDeal.dealId);
    expect(
      finalOffers.map(offer => ({
        version: offer.versionNumber,
        amount: Number(offer.amount),
        status: offer.status,
      })),
    ).toEqual([
      { version: 1, amount: 1_850_000, status: 'superseded' },
      { version: 2, amount: 1_950_000, status: 'superseded' },
      { version: 3, amount: 1_900_000, status: 'accepted' },
    ]);
  }, 45_000);

  it('rejects invalid lifecycle transitions and cross-agency deal linkage', async () => {
    const seed = await seedAgencyFixture('invalid');
    const caller = createCaller({
      id: seed.adminUserId,
      role: 'agency_admin',
      agencyId: seed.agencyId,
    });

    await expect(
      caller.createDeal({
        leadId: seed.invalidLifecycleLeadId,
        sourceViewingId: seed.confirmedViewingId,
        listingId: seed.listingId,
        propertyId: seed.propertyId,
        responsibleAgentId: seed.agentId,
        transactionType: 'sale',
        interestStatus: 'wants_offer',
        terms: { amount: 1_800_000 },
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    await expect(
      caller.createDeal({
        leadId: seed.outsideLeadId,
        listingId: seed.outsideListingId,
        propertyId: seed.outsidePropertyId,
        responsibleAgentId: seed.outsideAgentId,
        transactionType: 'sale',
        interestStatus: 'wants_offer',
        terms: { amount: 1_800_000 },
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  }, 30_000);

  it('rolls back offer acceptance atomically when generated transaction work fails', async () => {
    const seed = await seedAgencyFixture('rollback');
    const caller = createCaller({
      id: seed.adminUserId,
      role: 'agency_admin',
      agencyId: seed.agencyId,
    });

    const createdDeal = await caller.createDeal({
      leadId: seed.leadId,
      sourceViewingId: seed.viewingId,
      listingId: seed.listingId,
      propertyId: seed.propertyId,
      responsibleAgentId: seed.agentId,
      transactionType: 'sale',
      interestStatus: 'wants_offer',
      terms: {
        amount: 1_750_000,
        offerExpiry: futureIso(1),
        conditionsSummary: 'Rollback test offer.',
      },
    });
    createdState.dealIds.push(createdDeal.dealId);
    if (createdDeal.offerVersionId) createdState.offerVersionIds.push(createdDeal.offerVersionId);
    await caller.submitOfferVersion({ offerVersionId: Number(createdDeal.offerVersionId) });

    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const indexName = `deal_atomic_${randomUUID().replace(/-/g, '').slice(0, 18)}`;

    await db.execute(
      sql.raw(`CREATE UNIQUE INDEX ${indexName} ON agency_transaction_milestones (transaction_id)`),
    );

    try {
      await expect(
        caller.acceptOfferVersion({
          offerVersionId: Number(createdDeal.offerVersionId),
          commissionBasis: 'percentage',
          commissionPercentage: 5,
          commissionVatTreatment: 'exclusive',
          agencySharePercentage: 50,
          transferDutyVatTreatment: 'transfer_duty',
        }),
      ).rejects.toThrow(/Duplicate entry|agency_transaction_milestones|transaction_id/i);
    } finally {
      await db.execute(sql.raw(`DROP INDEX ${indexName} ON agency_transaction_milestones`));
    }

    const [offerAfterFailure] = await db
      .select()
      .from(agencyDealOfferVersions)
      .where(eq(agencyDealOfferVersions.id, Number(createdDeal.offerVersionId)))
      .limit(1);
    const [dealAfterFailure] = await db
      .select()
      .from(agencyDeals)
      .where(eq(agencyDeals.id, createdDeal.dealId))
      .limit(1);

    expect(offerAfterFailure.status).toBe('submitted');
    expect(dealAfterFailure.stage).toBe('submitted');
    expect(dealAfterFailure.acceptedOfferVersionId).toBeNull();
    expect(
      await countRows(
        agencyTransactions,
        and(
          eq(agencyTransactions.agencyId, seed.agencyId),
          eq(agencyTransactions.dealId, createdDeal.dealId),
        ),
      ),
    ).toBe(0);
    expect(
      await countRows(
        agencyTransactionMilestones,
        and(eq(agencyTransactionMilestones.agencyId, seed.agencyId)),
      ),
    ).toBe(0);
  }, 45_000);
});
