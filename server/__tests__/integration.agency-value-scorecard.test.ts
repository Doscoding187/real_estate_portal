import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe;

import { db } from '../db';
import {
  agencies,
  agencyBranding,
  leads,
  listings,
  planEntitlements,
  plans,
  properties,
  showings,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { getAgencyValueScorecard } from '../services/agencyPerformanceService';
import { appRouter } from '../routers';

const created = {
  userIds: [] as number[],
  agencyIds: [] as number[],
  planIds: [] as number[],
  subscriptionIds: [] as number[],
  listingIds: [] as number[],
  leadIds: [] as number[],
  showingIds: [] as number[],
  propertyIds: [] as number[],
};

async function insertId(result: any): Promise<number> {
  return Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
}

function suffix() {
  return `${Date.now()}-${randomUUID().slice(0, 8)}`;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;
});

afterAll(async () => {
  if (!process.env.DATABASE_URL) return;
  for (const id of created.showingIds)
    await db.delete(showings).where(eq(showings.id, id)).catch(() => undefined);
  for (const id of created.leadIds) await db.delete(leads).where(eq(leads.id, id)).catch(() => undefined);
  for (const id of created.listingIds)
    await db.delete(listings).where(eq(listings.id, id)).catch(() => undefined);
  for (const id of created.propertyIds)
    await db.delete(properties).where(eq(properties.id, id)).catch(() => undefined);
  for (const id of created.agencyIds) {
    await db.delete(agencyBranding).where(eq(agencyBranding.agencyId, id)).catch(() => undefined);
    await db.delete(agencies).where(eq(agencies.id, id)).catch(() => undefined);
  }
  for (const id of created.subscriptionIds)
    await db.delete(subscriptions).where(eq(subscriptions.id, id)).catch(() => undefined);
  for (const id of created.planIds) {
    await db.delete(planEntitlements).where(eq(planEntitlements.planId, id)).catch(() => undefined);
    await db.delete(plans).where(eq(plans.id, id)).catch(() => undefined);
  }
  for (const id of created.userIds) await db.delete(users).where(eq(users.id, id)).catch(() => undefined);
});

async function seedAgencyWithPublishedInventory(input: {
  mirrorViews: number;
  mirrorEnquiries: number;
}) {
  const s = suffix();
  const [agencyResult] = await db
    .insert(agencies)
    .values({
      name: `Scorecard ${s}`,
      slug: `scorecard-${s}`,
      email: `scorecard-${s}@example.test`,
      city: 'Johannesburg',
      province: 'Gauteng',
      isVerified: 1,
    } as any);
  const agencyId = await insertId(agencyResult);
  created.agencyIds.push(agencyId);

  await db.insert(agencyBranding).values({
    agencyId,
    companyName: 'Scorecard Agency',
    primaryColor: '#112233',
    secondaryColor: '#332211',
    isEnabled: 1,
  } as any);

  const [ownerResult] = await db
    .insert(users)
    .values({
      email: `owner-${s}@example.test`,
      name: 'Owner',
      role: 'agency_admin',
      agencyId,
      emailVerified: 1,
    } as any);
  const ownerUserId = await insertId(ownerResult);
  created.userIds.push(ownerUserId);

  const [planResult] = await db
    .insert(plans)
    .values({
      name: `perf-${s}`,
      displayName: 'Perf Plan',
      segment: 'agency',
      price: 99_900,
      currency: 'ZAR',
      interval: 'month',
      isPopular: 0,
      sortOrder: 100,
      isActive: 1,
    } as any);
  const planId = await insertId(planResult);
  created.planIds.push(planId);

  await db.insert(planEntitlements).values({
    planId,
    featureKey: 'max_active_listings',
    valueJson: '500',
  } as any);

  const periodEnd = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
  const [subResult] = await db
    .insert(subscriptions)
    .values({
      ownerType: 'agency',
      ownerId: agencyId,
      planId,
      status: 'active',
      currentPeriodEnd: periodEnd,
    } as any);
  created.subscriptionIds.push(await insertId(subResult));

  // Published listing + public mirror carrying engagement counters.
  const publishedAt = new Date(Date.now() - 20 * 86_400_000).toISOString().slice(0, 19).replace('T', ' ');
  const [listingResult] = await db
    .insert(listings)
    .values({
      ownerId: ownerUserId,
      agencyId,
      title: `Scorecard Listing ${s}`,
      slug: `scorecard-${s}`,
      description: 'Performance fixture',
      status: 'published',
      approvalStatus: 'approved',
      publishedAt,
      address: '1 Score St',
      city: 'Johannesburg',
      province: 'Gauteng',
      askingPrice: 1_250_000,
      listingType: 'sale',
      propertyType: 'house',
    } as any);
  const listingId = await insertId(listingResult);
  created.listingIds.push(listingId);

  const [propertyResult] = await db
    .insert(properties)
    .values({
      title: `Mirror ${s}`,
      description: 'Mirror fixture',
      sourceListingId: listingId,
      agencyId,
      agentId: null,
      ownerId: ownerUserId,
      views: input.mirrorViews,
      enquiries: input.mirrorEnquiries,
      status: 'available',
      featured: 0,
      address: '1 Score St',
      city: 'Johannesburg',
      province: 'Gauteng',
      price: 1_250_000,
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      area: 250,
      bedrooms: 3,
      bathrooms: 2,
    } as any);
  created.propertyIds.push(await insertId(propertyResult));

  return { agencyId, ownerUserId, listingId };
}

describeWithDb('agency value scorecard', () => {
  it('derives response, engagement, inventory and pipeline truth from canonical tables', async () => {
    const { agencyId, ownerUserId, listingId } = await seedAgencyWithPublishedInventory({
      mirrorViews: 480,
      mirrorEnquiries: 12,
    });

    const now = new Date();
    const iso = (minutesAgo: number) =>
      new Date(now.getTime() - minutesAgo * 60_000).toISOString().slice(0, 19).replace('T', ' ');

    // Lead A: responded in 10 minutes.
    const [leadA] = await db
      .insert(leads)
      .values({
        name: 'Fast Buyer',
        email: `fast-${randomUUID().slice(0, 6)}@example.test`,
        phone: '+27110000001',
        source: 'property_detail',
        status: 'contacted',
        agencyId,
        agentId: null,
        propertyType: 'residential',
        createdAt: iso(40),
        firstRespondedAt: iso(30),
        lastContactedAt: iso(30),
      } as any);
    created.leadIds.push(await insertId(leadA));

    // Lead B: responded in 40 minutes.
    const [leadB] = await db
      .insert(leads)
      .values({
        name: 'Slow Buyer',
        email: `slow-${randomUUID().slice(0, 6)}@example.test`,
        phone: '+27110000002',
        source: 'property_detail',
        status: 'qualified',
        agencyId,
        agentId: null,
        propertyType: 'residential',
        createdAt: iso(120),
        firstRespondedAt: iso(80),
        lastContactedAt: iso(80),
      } as any);
    const leadBId = await insertId(leadB);
    created.leadIds.push(leadBId);

    // Viewing scheduled for lead A → viewing conversion signal.
    const [showing] = await db
      .insert(showings)
      .values({
        listingId,
        leadId: await (async () => created.leadIds[created.leadIds.length - 1])(),
        agentId: null,
        agencyId,
        scheduledAt: new Date(Date.now() + 86_400_000).toISOString().slice(0, 19).replace('T', ' '),
        status: 'confirmed',
      } as any);
    created.showingIds.push(await insertId(showing));

    void leadBId;

    const scorecard = await getAgencyValueScorecard(db, agencyId);

    expect(scorecard.response.respondedLeads).toBe(2);
    expect(scorecard.response.avgFirstResponseMinutes).toBe(25); // (10+40)/2
    expect(scorecard.response.withinFifteenMinutesPct).toBe(50);
    expect(scorecard.response.platformAvgFirstResponseMinutes).not.toBeNull();

    expect(scorecard.engagement.portfolioViews).toBe(480);
    expect(scorecard.engagement.portfolioEnquiries).toBe(12);
    expect(scorecard.engagement.conversionRate).toBe(2.5); // 12/480

    expect(scorecard.inventory.liveListings).toBeGreaterThanOrEqual(1);
    expect(scorecard.inventory.avgDaysLive).toBeGreaterThanOrEqual(19);

    expect(scorecard.pipeline.leadsWithViewings).toBe(1);
    expect(scorecard.pipeline.viewingConversionPct).toBe(50);
  });

  it('exposes the scorecard through the operating home endpoint', async () => {
    const { agencyId, ownerUserId } = await seedAgencyWithPublishedInventory({
      mirrorViews: 300,
      mirrorEnquiries: 5,
    });

    const caller = appRouter.createCaller({
      req: { hostname: 'localhost', path: '/', method: 'POST', headers: { host: 'localhost:5000' } },
      res: { cookie: () => undefined },
      user: { id: ownerUserId, role: 'agency_admin', agencyId },
    } as any);

    const home = await caller.agency.getOperatingHome();

    expect(home.brief.performance).toBeDefined();
    expect(home.brief.performance!.engagement.portfolioViews).toBeGreaterThanOrEqual(300);
    expect(home.brief.performance!.response).toBeDefined();
  });
});
