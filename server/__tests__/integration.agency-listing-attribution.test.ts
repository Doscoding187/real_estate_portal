import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  agencies,
  leads,
  listingAnalytics,
  listingApprovalQueue,
  listingMedia,
  listings,
  properties,
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
};

function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
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
  if (created.userId) await db.delete(users).where(eq(users.id, created.userId));
  if (created.agencyId) await db.delete(agencies).where(eq(agencies.id, created.agencyId));

  Object.assign(created, { agencyId: 0, userId: 0, listingId: 0, propertyId: 0, leadId: 0 });
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
