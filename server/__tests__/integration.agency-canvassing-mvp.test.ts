import path from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import { afterEach, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';

import {
  agencies,
  agents,
  listingAnalytics,
  listingMedia,
  listings,
  locations,
  sellerProspectActivities,
  sellerMandateComparables,
  sellerMandateOperations,
  sellerProspects,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { appRouter } from '../routers';

dotenv.config({ path: path.resolve(process.cwd(), '.env.test'), override: true });

function isIsolatedTestDatabase(databaseUrl?: string) {
  if (!databaseUrl) return false;
  try {
    const parsed = new URL(databaseUrl);
    return parsed.pathname.replace(/^\//, '') === 'listify_test';
  } catch {
    return false;
  }
}

const hasIsolatedTestDb = isIsolatedTestDatabase(process.env.DATABASE_URL);
const describeWithTestDb: typeof describe = hasIsolatedTestDb
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL for listify_test)`, fn)) as typeof describe);

const created = {
  agencyIds: [] as number[],
  agentIds: [] as number[],
  userIds: [] as number[],
  sellerProspectIds: [] as number[],
  listingIds: [] as number[],
  locationIds: [] as number[],
};

function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

function createCaller(user: { id: number; role: 'agency_admin' | 'agent'; agencyId: number }) {
  return appRouter.createCaller({
    user,
    req: { headers: {} },
    res: {},
    requestId: `agency-canvassing-${Date.now()}`,
  } as any);
}

async function createUser(input: {
  agencyId: number;
  role: 'agency_admin' | 'agent';
  name: string;
  email: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(users).values({
    agencyId: input.agencyId,
    role: input.role,
    name: input.name,
    firstName: input.name.split(' ')[0],
    lastName: input.name.split(' ')[1] || 'User',
    email: input.email,
    phone: '+27115550000',
    emailVerified: 1,
    onboardingComplete: 1,
  } as any);
  const id = insertId(result);
  created.userIds.push(id);
  return id;
}

async function createAgent(input: { agencyId: number; userId: number; name: string; email: string }) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(agents).values({
    agencyId: input.agencyId,
    userId: input.userId,
    firstName: input.name.split(' ')[0],
    lastName: input.name.split(' ')[1] || 'Agent',
    displayName: input.name,
    email: input.email,
    phone: '+27115550000',
    whatsapp: '+27115550000',
    status: 'approved',
    isVerified: 1,
    isFeatured: 0,
  } as any);
  const id = insertId(result);
  created.agentIds.push(id);
  return id;
}

afterEach(async () => {
  if (!hasIsolatedTestDb) return;
  const db = await getDb();
  if (!db) return;

  for (const sellerProspectId of created.sellerProspectIds) {
    const [operation] = await db.select({ id: sellerMandateOperations.id }).from(sellerMandateOperations).where(eq(sellerMandateOperations.sellerProspectId, sellerProspectId));
    if (operation) await db.delete(sellerMandateComparables).where(eq(sellerMandateComparables.mandateOperationId, operation.id));
    await db.delete(sellerMandateOperations).where(eq(sellerMandateOperations.sellerProspectId, sellerProspectId));
    await db.delete(sellerProspectActivities).where(eq(sellerProspectActivities.sellerProspectId, sellerProspectId));
    await db.delete(sellerProspects).where(eq(sellerProspects.id, sellerProspectId));
  }
  for (const listingId of created.listingIds) {
    await db.delete(listingMedia).where(eq(listingMedia.listingId, listingId));
    await db.delete(listingAnalytics).where(eq(listingAnalytics.listingId, listingId));
    await db.delete(listings).where(eq(listings.id, listingId));
  }
  for (const locationId of created.locationIds) {
    await db.delete(locations).where(eq(locations.id, locationId));
  }
  for (const agentId of created.agentIds) {
    await db.delete(agents).where(eq(agents.id, agentId));
  }
  for (const userId of created.userIds) {
    await db.delete(users).where(eq(users.id, userId));
  }
  for (const agencyId of created.agencyIds) {
    await db.delete(agencies).where(eq(agencies.id, agencyId));
  }
  Object.assign(created, {
    agencyIds: [],
    agentIds: [],
    userIds: [],
    sellerProspectIds: [],
    listingIds: [],
    locationIds: [],
  });
});

describeWithTestDb('agency canvassing MVP integration', () => {
  it('keeps seller acquisition private, scoped, actionable, and traceably convertible', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');
    const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;

    const [agencyResult] = await db.insert(agencies).values({
      name: `Canvassing Agency ${suffix}`,
      slug: `canvassing-agency-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      email: `canvassing-${suffix}@example.com`,
      city: 'Johannesburg',
      province: 'Gauteng',
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
      isVerified: 1,
    } as any);
    const agencyId = insertId(agencyResult);
    created.agencyIds.push(agencyId);

    const [outsideAgencyResult] = await db.insert(agencies).values({
      name: `Outside Canvassing Agency ${suffix}`,
      slug: `outside-canvassing-agency-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      email: `outside-canvassing-${suffix}@example.com`,
      city: 'Cape Town',
      province: 'Western Cape',
      subscriptionPlan: 'premium',
      subscriptionStatus: 'active',
      isVerified: 1,
    } as any);
    const outsideAgencyId = insertId(outsideAgencyResult);
    created.agencyIds.push(outsideAgencyId);

    const [locationResult] = await db.insert(locations).values({
      name: `Canvassing Test Area ${suffix}`,
      slug: `canvassing-test-area-${suffix}`.replace(/[^a-z0-9-]/g, '-'),
      type: 'suburb',
      latitude: '-26.1342',
      longitude: '28.0401',
      propertyCount: 0,
    } as any);
    const locationId = insertId(locationResult);
    created.locationIds.push(locationId);

    const managerUserId = await createUser({
      agencyId,
      role: 'agency_admin',
      name: 'Canvassing Manager',
      email: `manager-${suffix}@example.com`,
    });
    const agentEmail = `agent-${suffix}@example.com`;
    const agentUserId = await createUser({
      agencyId,
      role: 'agent',
      name: 'Canvassing Agent',
      email: agentEmail,
    });
    const assignedAgentId = await createAgent({
      agencyId,
      userId: agentUserId,
      name: 'Canvassing Agent',
      email: agentEmail,
    });
    const unassignedAgentUserId = await createUser({
      agencyId,
      role: 'agent',
      name: 'Unassigned Agent',
      email: `unassigned-${suffix}@example.com`,
    });
    await createAgent({
      agencyId,
      userId: unassignedAgentUserId,
      name: 'Unassigned Agent',
      email: `unassigned-${suffix}@example.com`,
    });
    const outsideManagerUserId = await createUser({
      agencyId: outsideAgencyId,
      role: 'agency_admin',
      name: 'Outside Manager',
      email: `outside-manager-${suffix}@example.com`,
    });

    const manager = createCaller({ id: managerUserId, role: 'agency_admin', agencyId });
    const agent = createCaller({ id: agentUserId, role: 'agent', agencyId });
    const unassignedAgent = createCaller({ id: unassignedAgentUserId, role: 'agent', agencyId });
    const outsideManager = createCaller({
      id: outsideManagerUserId,
      role: 'agency_admin',
      agencyId: outsideAgencyId,
    });

    const privateInitialNote = 'Owner mentioned a private family timing consideration.';
    const ownerOnlyProspect = await manager.canvassing.create({
      ownerName: 'Owner-only seller opportunity',
      canvassingMethod: 'referral',
    });
    created.sellerProspectIds.push(ownerOnlyProspect.sellerProspectId);
    const [storedOwnerOnlyProspect] = await db
      .select()
      .from(sellerProspects)
      .where(eq(sellerProspects.id, ownerOnlyProspect.sellerProspectId))
      .limit(1);
    expect(storedOwnerOnlyProspect).toMatchObject({
      agencyId,
      ownerName: 'Owner-only seller opportunity',
      propertyAddress: null,
    });

    const createdProspect = await manager.canvassing.create({
      ownerName: 'Private Seller',
      phone: '+27115550123',
      email: `seller-${suffix}@example.com`,
      propertyAddress: '18 Mandate Avenue',
      suburb: 'Parkhurst',
      city: 'Johannesburg',
      province: 'Gauteng',
      propertyType: 'house',
      source: 'door-to-door',
      canvassingMethod: 'door_knocking',
      priority: 'high',
      assignedAgentId,
      initialNote: privateInitialNote,
    });
    created.sellerProspectIds.push(createdProspect.sellerProspectId);

    const [storedProspect] = await db
      .select()
      .from(sellerProspects)
      .where(eq(sellerProspects.id, createdProspect.sellerProspectId))
      .limit(1);
    expect(storedProspect).toMatchObject({
      agencyId,
      assignedAgentId,
      stage: 'new',
      propertyAddress: '18 Mandate Avenue',
      nextAction: 'Make first seller contact',
    });

    await agent.canvassing.recordContactAttempt({
      sellerProspectId: createdProspect.sellerProspectId,
      channel: 'call',
      outcome: 'reached',
      summary: 'Made first contact and agreed on a follow-up window.',
      nextAction: 'Confirm valuation appointment time',
    });
    const followUpAt = new Date(Date.now() + 86_400_000).toISOString();
    await agent.canvassing.setFollowUp({
      sellerProspectId: createdProspect.sellerProspectId,
      nextFollowUp: followUpAt,
      note: 'Confirm valuation appointment time.',
    });

    const agentQueue = await agent.canvassing.getFollowUpQueue({ limit: 20 });
    expect(agentQueue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createdProspect.sellerProspectId,
          agencyId,
          assignedAgentId,
          stage: 'follow_up_required',
        }),
      ]),
    );

    await expect(
      outsideManager.canvassing.getById({ sellerProspectId: createdProspect.sellerProspectId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });

    await manager.canvassing.updateStage({
      sellerProspectId: createdProspect.sellerProspectId,
      stage: 'qualified',
    });
    await expect(agent.canvassing.getListingPrefill({ sellerProspectId: createdProspect.sellerProspectId })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    const signedAt = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 90 * 86_400_000).toISOString();
    const mandateInput = {
      sellerProspectId: createdProspect.sellerProspectId,
      status: 'listing_ready' as const,
      mandateType: 'sole',
      signedAt,
      expiresAt,
      mandateStartAt: signedAt,
      sellerRequestedPrice: 2_900_000,
      recommendedPriceMin: 2_650_000,
      recommendedPriceMax: 2_800_000,
      agreedListingPrice: 2_750_000,
      pricingRationale: 'Private agent assessment from manually entered, unverified comparable references.',
      pricingDiscussedAt: signedAt,
      priceReviewAt: new Date(Date.now() + 30 * 86_400_000).toISOString(),
      sellerObjections: 'Seller wants to review activity after the first month.',
      documentStatus: 'signed' as const,
      documentName: 'private-mandate.pdf',
      privateStorageReference: `private/agency-${agencyId}/mandates/private-mandate.pdf`,
      documentDate: signedAt,
      requirements: {
        sellerIdentityRecorded: true, propertyAddressConfirmed: true, contactDetailsConfirmed: true,
        mandateTypeSelected: true, pricingDiscussionCompleted: true, agreedPriceRecorded: true,
        mandateDocumentRecorded: true, disclosureStatusRecorded: true, mediaPlanRecorded: true,
        accessArrangementsRecorded: true, responsibleAgentConfirmed: true, nextActionRecorded: true,
      },
      nextAction: 'Create and complete listing draft',
    };
    await expect(unassignedAgent.canvassing.saveMandateOperations(mandateInput)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(outsideManager.canvassing.saveMandateOperations(mandateInput)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await expect(manager.canvassing.saveMandateOperations({ ...mandateInput, privateStorageReference: 'https://public.example/mandate.pdf' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(manager.canvassing.saveMandateOperations({ ...mandateInput, privateStorageReference: `private/agency-${agencyId}/mandates/../other-agency/mandate.pdf` })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(manager.canvassing.saveMandateOperations({ ...mandateInput, recommendedPriceMin: 2_900_000, recommendedPriceMax: 2_800_000 })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(manager.canvassing.saveMandateOperations({ ...mandateInput, status: 'listing_ready', requirements: { ...mandateInput.requirements, mandateDocumentRecorded: false } })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await expect(manager.canvassing.saveMandateOperations({ ...mandateInput, expiresAt: new Date(Date.now() - 86_400_000).toISOString() })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    await manager.canvassing.saveMandateOperations(mandateInput);
    await manager.canvassing.saveMandateOperations({ ...mandateInput, nextAction: 'Open canonical listing draft' });
    const mandateState = await agent.canvassing.getMandateOperations({ sellerProspectId: createdProspect.sellerProspectId });
    expect(mandateState.readiness).toEqual({ ready: true, missing: [] });
    expect(mandateState.operation).toMatchObject({ status: 'listing_ready', sellerRequestedPrice: '2900000.00', agreedListingPrice: '2750000.00', privateStorageReference: `private/agency-${agencyId}/mandates/private-mandate.pdf` });
    await agent.canvassing.addMandateComparable({ sellerProspectId: createdProspect.sellerProspectId, reference: 'Private Parkhurst comparable', propertyType: 'house', area: 'Parkhurst', price: 2_720_000, priceKind: 'asking', notes: 'Manual, unverified comparable evidence.' });
    const persistedMandateState = await agent.canvassing.getMandateOperations({ sellerProspectId: createdProspect.sellerProspectId });
    expect(persistedMandateState.comparables).toEqual(expect.arrayContaining([expect.objectContaining({ reference: 'Private Parkhurst comparable', notes: 'Manual, unverified comparable evidence.' })]));
    const comparableId = persistedMandateState.comparables[0].id;
    await expect(outsideManager.canvassing.removeMandateComparable({ sellerProspectId: createdProspect.sellerProspectId, comparableId })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    await agent.canvassing.removeMandateComparable({ sellerProspectId: createdProspect.sellerProspectId, comparableId });
    expect((await agent.canvassing.getMandateOperations({ sellerProspectId: createdProspect.sellerProspectId })).comparables).toHaveLength(0);
    const mandateOperations = await db.select().from(sellerMandateOperations).where(eq(sellerMandateOperations.sellerProspectId, createdProspect.sellerProspectId));
    expect(mandateOperations).toHaveLength(1);
    const myDay = await agent.agency.getMyDay({ limit: 20 });
    expect(myDay.mandateWork).toEqual(expect.arrayContaining([expect.objectContaining({ sellerProspectId: createdProspect.sellerProspectId, type: 'listing_ready_not_started' })]));

    const mandateProspect = await agent.canvassing.getById({
      sellerProspectId: createdProspect.sellerProspectId,
    });
    expect(mandateProspect).toMatchObject({
      stage: 'mandate_won',
      mandateType: 'sole',
      nextAction: 'Open canonical listing draft',
    });
    expect(mandateProspect.firstContactedAt).toBeTruthy();
    expect(mandateProspect.activities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ activityType: 'contact_attempt' }),
        expect.objectContaining({ activityType: 'mandate_updated' }),
      ]),
    );

    const prefill = await agent.canvassing.getListingPrefill({
      sellerProspectId: createdProspect.sellerProspectId,
    });
    expect(prefill).toMatchObject({
      sellerProspectId: createdProspect.sellerProspectId,
      action: 'sell',
      propertyType: 'house',
      propertyLocation: { address: '18 Mandate Avenue', city: 'Johannesburg' },
    });
    expect(prefill).not.toHaveProperty('ownerName');
    expect(prefill).not.toHaveProperty('email');
    expect(prefill).not.toHaveProperty('phone');

    const listing = await agent.listing.create({
      sellerProspectId: createdProspect.sellerProspectId,
      action: 'sell',
      propertyType: 'house',
      title: `Parkhurst family home ${suffix}`,
      description:
        'A carefully prepared public property description with verified home features and location context.',
      pricing: { askingPrice: 2_750_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2 },
      location: {
        address: '18 Mandate Avenue',
        latitude: -26.1342,
        longitude: 28.0401,
        city: 'Johannesburg',
        suburb: 'Parkhurst',
        province: 'Gauteng',
        locationId,
      },
      mediaIds: [],
      media: [],
    });
    created.listingIds.push(listing.id);
    await expect(agent.canvassing.getListingPrefill({ sellerProspectId: createdProspect.sellerProspectId })).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    const [convertedProspect] = await db
      .select()
      .from(sellerProspects)
      .where(eq(sellerProspects.id, createdProspect.sellerProspectId))
      .limit(1);
    const [createdListing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listing.id))
      .limit(1);
    expect(convertedProspect).toMatchObject({
      stage: 'converted_to_listing',
      convertedListingId: listing.id,
      nextFollowUp: null,
    });
    expect(createdListing).toMatchObject({ agencyId, agentId: assignedAgentId, status: 'draft' });
    expect(createdListing.description).not.toContain(privateInitialNote);
    expect(createdListing.description).not.toContain('Private Seller');

    const conversionActivities = await db
      .select()
      .from(sellerProspectActivities)
      .where(eq(sellerProspectActivities.sellerProspectId, createdProspect.sellerProspectId));
    expect(conversionActivities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ activityType: 'conversion' }),
        expect.objectContaining({ activityType: 'follow_up_scheduled' }),
      ]),
    );

    await expect(
      agent.canvassing.setFollowUp({
        sellerProspectId: createdProspect.sellerProspectId,
        nextFollowUp: followUpAt,
      }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
});
