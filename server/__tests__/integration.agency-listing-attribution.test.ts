import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  agencies,
  agencyBranding,
  leads,
  listingAnalytics,
  listingApprovalQueue,
  listingMedia,
  listings,
  planEntitlements,
  plans,
  properties,
  subscriptions,
  users,
} from '../../drizzle/schema';
import {
  approveListing,
  createListing,
  getAgencyDashboardStats,
  getDb,
  submitListingForReview,
} from '../db';
import { capturePublicLead } from '../services/publicLeadCaptureService';

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
      describe.skip(`${name} (requires DATABASE_URL)`, fn)) as typeof describe);

const created = {
  agencyId: 0,
  userId: 0,
  listingId: 0,
  propertyId: 0,
  leadId: 0,
  brandingId: 0,
  planEntitlementId: 0,
  planId: 0,
  subscriptionId: 0,
};

function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

function toMySqlTimestamp(value: Date) {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

async function makeAgencyPublicationReady(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  agencyId: number,
  suffix: string,
) {
  const [brandingResult] = await db.insert(agencyBranding).values({
    agencyId,
    companyName: `Attribution Agency ${suffix}`,
    primaryColor: '#0f766e',
    secondaryColor: '#334155',
    isEnabled: 1,
  } as any);
  created.brandingId = insertId(brandingResult);

  const [planResult] = await db.insert(plans).values({
    name: `attribution-publication-${suffix}`,
    displayName: 'Attribution Publication Test Plan',
    description: 'Canonical agency publication fixture for attribution coverage.',
    segment: 'agency',
    price: 99_000,
    priceMonthly: 99_000,
    currency: 'ZAR',
    interval: 'month',
    trialDays: 0,
    features: JSON.stringify(['Listings', 'Publishing']),
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
    ownerType: 'agency',
    ownerId: agencyId,
    planId: created.planId,
    status: 'active',
    currentPeriodStart: toMySqlTimestamp(now),
    currentPeriodEnd: toMySqlTimestamp(new Date(now.getTime() + 86_400_000)),
    cancelAtPeriodEnd: 0,
  } as any);
  created.subscriptionId = insertId(subscriptionResult);
}

afterEach(async () => {
  if (!hasDb) return;
  const db = await getDb();
  if (!db) return;

  if (created.leadId) await db.delete(leads).where(eq(leads.id, created.leadId));
  if (created.propertyId) await db.delete(properties).where(eq(properties.id, created.propertyId));
  if (created.listingId) {
    await db.delete(listingMedia).where(eq(listingMedia.listingId, created.listingId));
    await db.delete(listingApprovalQueue).where(eq(listingApprovalQueue.listingId, created.listingId));
    await db.delete(listingAnalytics).where(eq(listingAnalytics.listingId, created.listingId));
    await db.delete(listings).where(eq(listings.id, created.listingId));
  }
  if (created.subscriptionId) {
    await db.delete(subscriptions).where(eq(subscriptions.id, created.subscriptionId));
  }
  if (created.planEntitlementId) {
    await db.delete(planEntitlements).where(eq(planEntitlements.id, created.planEntitlementId));
  }
  if (created.brandingId) {
    await db.delete(agencyBranding).where(eq(agencyBranding.id, created.brandingId));
  }
  if (created.userId) await db.delete(users).where(eq(users.id, created.userId));
  if (created.agencyId) await db.delete(agencies).where(eq(agencies.id, created.agencyId));
  if (created.planId) await db.delete(plans).where(eq(plans.id, created.planId));

  Object.assign(created, {
    agencyId: 0,
    userId: 0,
    listingId: 0,
    propertyId: 0,
    leadId: 0,
    brandingId: 0,
    planEntitlementId: 0,
    planId: 0,
    subscriptionId: 0,
  });
});

describeWithDb('agency principal listing attribution', () => {
  it('preserves agency ownership from draft creation through public lead capture', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

    const [agencyResult] = await db.insert(agencies).values({
      name: `Attribution Agency ${suffix}`,
      slug: `attribution-agency-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      email: `attribution-agency-${suffix}@example.com`,
      city: 'Johannesburg',
      province: 'Gauteng',
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
      isVerified: 1,
    } as any);
    created.agencyId = insertId(agencyResult);
    await makeAgencyPublicationReady(db, created.agencyId, suffix);

    const [userResult] = await db.insert(users).values({
      email: `principal-${suffix}@example.com`,
      name: 'Agency Principal',
      firstName: 'Agency',
      lastName: 'Principal',
      phone: '+27110000000',
      role: 'agency_admin',
      agencyId: created.agencyId,
      emailVerified: 1,
    } as any);
    created.userId = insertId(userResult);

    created.listingId = await createListing({
      userId: created.userId,
      action: 'sell',
      propertyType: 'house',
      title: `Agency-owned family home ${suffix}`,
      description: 'A complete principal-created listing used to verify agency attribution.',
      pricing: { askingPrice: 2_500_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 180 },
      address: '1 Agency Attribution Street',
      latitude: -26.1076,
      longitude: 28.0567,
      city: 'Johannesburg',
      province: 'Gauteng',
      postalCode: '2001',
      placeId: null,
      slug: `agency-owned-family-home-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      media: [],
    });

    const [draft] = await db
      .select({ agencyId: listings.agencyId, agentId: listings.agentId })
      .from(listings)
      .where(eq(listings.id, created.listingId))
      .limit(1);
    expect(draft).toMatchObject({ agencyId: created.agencyId, agentId: null });

    await submitListingForReview(created.listingId);
    await approveListing(created.listingId, created.userId, 'Attribution acceptance test');

    const [projection] = await db
      .select({ id: properties.id, sourceListingId: properties.sourceListingId, agentId: properties.agentId })
      .from(properties)
      .where(eq(properties.sourceListingId, created.listingId))
      .limit(1);
    created.propertyId = Number(projection?.id || 0);
    expect(projection).toMatchObject({ sourceListingId: created.listingId, agentId: null });

    const lead = await capturePublicLead({
      propertyId: created.propertyId,
      agencyId: 999_999,
      name: 'Prospective Buyer',
      email: `buyer-${suffix}@example.com`,
      phone: '+27112223333',
      leadSource: 'property_detail',
      sourceSurface: 'property_detail_contact_modal',
    });
    created.leadId = lead.leadId;

    const [storedLead] = await db
      .select({ agencyId: leads.agencyId, agentId: leads.agentId, propertyId: leads.propertyId })
      .from(leads)
      .where(eq(leads.id, created.leadId))
      .limit(1);
    expect(storedLead).toMatchObject({
      agencyId: created.agencyId,
      agentId: null,
      propertyId: created.propertyId,
    });

    const dashboard = await getAgencyDashboardStats(created.agencyId);
    expect(dashboard).toMatchObject({ totalListings: 1, activeListings: 1, totalLeads: 1 });
  });
});
