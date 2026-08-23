import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { afterEach, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';

import {
  agents,
  cities,
  leads,
  listingAnalytics,
  listingApprovalQueue,
  listingMedia,
  listings,
  planEntitlements,
  plans,
  provinces,
  properties,
  subscriptions,
  suburbs,
  users,
} from '../../drizzle/schema';
import {
  approveListing,
  createListing,
  getDb,
  submitListingForReview,
} from '../db';
import { assertListingPublicationEntitled } from '../services/listingPublicationEntitlementService';
import { capturePublicLead } from '../services/publicLeadCaptureService';
import { findAgentsServingLocation } from '../services/agentPublicProfileService';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local'), override: false });

const hasDb = Boolean(process.env.DATABASE_URL);
const describeWithDb: typeof describe = hasDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

const created = {
  userId: 0,
  agentId: 0,
  listingId: 0,
  propertyId: 0,
  leadId: 0,
  planId: 0,
  planEntitlementId: 0,
  subscriptionId: 0,
};

function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

function toMySqlTimestamp(value: Date) {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

async function canonicalJourneyGeography(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
) {
  const [location] = await db
    .select({
      provinceId: provinces.id,
      cityId: cities.id,
      suburbId: suburbs.id,
    })
    .from(provinces)
    .innerJoin(cities, eq(cities.provinceId, provinces.id))
    .innerJoin(suburbs, eq(suburbs.cityId, cities.id))
    .where(
      and(
        eq(provinces.slug, 'gauteng'),
        eq(cities.slug, 'johannesburg'),
        eq(suburbs.slug, 'sandton'),
      ),
    )
    .limit(1);

  if (!location) {
    throw new Error('Canonical Gauteng/Johannesburg/Sandton geography is required by this fixture.');
  }
  return location;
}

afterEach(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (!db) return;

  if (created.leadId) await db.delete(leads).where(eq(leads.id, created.leadId));
  if (created.propertyId) await db.delete(properties).where(eq(properties.id, created.propertyId));
  if (created.listingId) {
    await db.delete(listingMedia).where(eq(listingMedia.listingId, created.listingId));
    await db
      .delete(listingApprovalQueue)
      .where(eq(listingApprovalQueue.listingId, created.listingId));
    await db.delete(listingAnalytics).where(eq(listingAnalytics.listingId, created.listingId));
    await db.delete(listings).where(eq(listings.id, created.listingId));
  }
  if (created.subscriptionId) {
    await db.delete(subscriptions).where(eq(subscriptions.id, created.subscriptionId));
  }
  if (created.planEntitlementId) {
    await db.delete(planEntitlements).where(eq(planEntitlements.id, created.planEntitlementId));
  }
  if (created.agentId) await db.delete(agents).where(eq(agents.id, created.agentId));
  if (created.userId) await db.delete(users).where(eq(users.id, created.userId));
  if (created.planId) await db.delete(plans).where(eq(plans.id, created.planId));

  Object.assign(created, {
    userId: 0,
    agentId: 0,
    listingId: 0,
    propertyId: 0,
    leadId: 0,
    planId: 0,
    planEntitlementId: 0,
    subscriptionId: 0,
  });
});

describeWithDb('independent agent launch journey (publish → receive)', () => {
  it('lets an approved, paid, badge-less solo agent publish inventory and receive the enquiry', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
    const location = await canonicalJourneyGeography(db);

    const [userResult] = await db.insert(users).values({
      email: `solo-agent-${suffix}@example.com`,
      name: 'Amina Journey',
      firstName: 'Amina',
      lastName: 'Journey',
      phone: '+27119990000',
      role: 'agent',
      emailVerified: 1,
    } as any);
    created.userId = insertId(userResult);
    expect(created.userId).toBeGreaterThan(0);

    const [agentResult] = await db.insert(agents).values({
      userId: created.userId,
      firstName: 'Amina',
      lastName: 'Journey',
      displayName: 'Amina Journey',
      email: `solo-agent-${suffix}@example.com`,
      phone: '+27119990000',
      whatsapp: '+27119990000',
      role: 'agent',
      // Deliberately unbadged: commercial entitlement alone must carry eligibility.
      isVerified: 0,
      isFeatured: 0,
      status: 'approved',
      approvedBy: created.userId,
      approvedAt: new Date(),
      areasServed: 'Sandton',
      slug: `amina-journey-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      bio: 'Launch journey fixture agent.',
      profileImage: 'https://cdn.example.com/journey-agent.jpg',
      focus: 'both',
      propertyTypes: 'house, apartment',
      profileCompletionScore: 85,
    } as any);
    created.agentId = insertId(agentResult);

    const [planResult] = await db.insert(plans).values({
      name: `agent-launch-journey-${suffix}`,
      displayName: 'Agent Launch Journey Test Plan',
      description: 'Canonical agent publication fixture.',
      segment: 'agent',
      price: 49_900,
      priceMonthly: 0,
      currency: 'ZAR',
      interval: 'month',
      trialDays: 0,
      features: JSON.stringify(['Agent listing management']),
      limits: JSON.stringify({ max_active_listings: 50 }),
      isActive: 1,
      isPopular: 0,
      sortOrder: 999,
    } as any);
    created.planId = insertId(planResult);

    const [entitlementResult] = await db.insert(planEntitlements).values({
      planId: created.planId,
      featureKey: 'max_active_listings',
      valueJson: 50,
    } as any);
    created.planEntitlementId = insertId(entitlementResult);

    const now = new Date();
    const [subscriptionResult] = await db.insert(subscriptions).values({
      ownerType: 'agent',
      ownerId: created.userId,
      planId: created.planId,
      status: 'active',
      currentPeriodStart: toMySqlTimestamp(now),
      currentPeriodEnd: toMySqlTimestamp(new Date(now.getTime() + 86_400_000)),
      cancelAtPeriodEnd: 0,
    } as any);
    created.subscriptionId = insertId(subscriptionResult);

    created.listingId = await createListing({
      userId: created.userId,
      action: 'sell',
      propertyType: 'house',
      title: `Solo agent journey home ${suffix}`,
      description: 'A complete solo-agent listing used to verify launch journey truth.',
      pricing: { askingPrice: 1_850_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 160 },
      address: '9 Solo Journey Street',
      latitude: -26.1076,
      longitude: 28.0567,
      city: 'Johannesburg',
      suburb: 'Sandton',
      province: 'Gauteng',
      postalCode: '2001',
      placeId: null,
      provinceId: location.provinceId,
      cityId: location.cityId,
      suburbId: location.suburbId,
      privateAddress: {
        streetNumber: '9',
        streetName: 'Solo Journey Street',
        postalCode: '2001',
      },
      coordinateSource: 'manual_confirmed',
      locationConfirmationState: 'confirmed',
      publicLocationPrecision: 'approximate',
      slug: `solo-agent-journey-home-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      media: [],
    });

    const [draft] = await db
      .select({ agentId: listings.agentId, agencyId: listings.agencyId })
      .from(listings)
      .where(eq(listings.id, created.listingId))
      .limit(1);
    expect(draft).toMatchObject({ agentId: created.agentId, agencyId: null });

    await expect(
      assertListingPublicationEntitled(db as never, {
        listingId: created.listingId,
        operation: 'submit',
        at: new Date(),
      }),
    ).resolves.toMatchObject({ kind: 'independent_agent', userId: created.userId });

    await submitListingForReview(created.listingId);
    await approveListing(created.listingId, created.userId, 'Agent launch journey acceptance');

    const [projection] = await db
      .select({ id: properties.id, agentId: properties.agentId })
      .from(properties)
      .where(eq(properties.sourceListingId, created.listingId))
      .limit(1);
    created.propertyId = Number(projection?.id || 0);
    expect(created.propertyId).toBeGreaterThan(0);
    expect(projection).toMatchObject({ agentId: created.agentId });

    const serving = await findAgentsServingLocation(db as never, 'suburb', location.suburbId);
    expect(serving.map(entry => entry.id)).toContain(created.agentId);

    const lead = await capturePublicLead({
      propertyId: created.propertyId,
      name: 'Journey Buyer',
      email: `buyer-${suffix}@example.com`,
      phone: '+27112223344',
      leadSource: 'property_detail',
      sourceSurface: 'property_detail_contact_modal',
      captureRequestId: `agent-launch-journey-${suffix}`,
      consent: {
        accepted: true,
        version: '2026-08-02',
        source: 'agent-launch-journey-test',
      },
    });
    created.leadId = lead.leadId;
    expect(created.leadId).toBeGreaterThan(0);

    const [storedLead] = await db
      .select({
        agentId: leads.agentId,
        agencyId: leads.agencyId,
        deliveryStatus: leads.deliveryStatus,
      })
      .from(leads)
      .where(eq(leads.id, created.leadId))
      .limit(1);
    expect(storedLead).toMatchObject({
      agentId: created.agentId,
      agencyId: null,
    });
    expect(['delivered', 'pending']).toContain(storedLead.deliveryStatus);

    // Continuity loop: the enquiry must raise agent awareness immediately.
    const [notification] = await db.execute(
      (await import('drizzle-orm')).sql`
        select n.type, n.title
        from notifications n
        where n.user_id = ${created.userId}
          and n.type = 'lead_assigned'
        order by n.id desc limit 1`,
    ).then((r: any) => (Array.isArray(r) ? r[0] : (r?.rows ?? [])[0]));
    expect(notification?.type).toBe('lead_assigned');
  }, 60_000);
});
