import { afterEach, describe, expect, it } from 'vitest';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import {
  agencies,
  agencyBranding,
  agents,
  listingApprovalQueue,
  listings,
  plans,
  properties,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { approveListing, getDb } from '../db';
import {
  assertListingPublicationEntitled,
  ListingPublicationEntitlementError,
} from '../services/listingPublicationEntitlementService';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe);

const created = {
  users: [] as number[],
  agencies: [] as number[],
  agents: [] as number[],
  subscriptions: [] as number[],
  listings: [] as number[],
};

function insertId(result: any) {
  return Number(result?.insertId || result?.[0]?.insertId || 0);
}

function timestampFromNow(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
}

async function insertUser(
  label: string,
  role: 'agent' | 'agency_admin',
  agencyId: number | null = null,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [result] = await db.insert(users).values({
    email: `${label}-${Date.now()}@example.test`,
    name: label,
    firstName: label,
    lastName: 'Capacity',
    role,
    agencyId,
    emailVerified: 1,
    onboardingComplete: 1,
  } as any);
  const id = insertId(result);
  created.users.push(id);
  return id;
}

async function insertAgency(label: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${label}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const [result] = await db.insert(agencies).values({
    name: `${label} Agency`,
    slug: `capacity-${suffix}`,
    email: `${suffix}@example.test`,
    city: 'Johannesburg',
    province: 'Gauteng',
    subscriptionPlan: 'manual_eft',
    subscriptionStatus: 'active',
    isVerified: 1,
  } as any);
  const id = insertId(result);
  created.agencies.push(id);
  await db.insert(agencyBranding).values({
    agencyId: id,
    companyName: `${label} Agency`,
    primaryColor: '#0f766e',
    secondaryColor: '#334155',
    isEnabled: 1,
  } as any);
  return id;
}

async function insertAgent(userId: number, agencyId: number | null, label: string) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const suffix = `${Date.now()}-${label}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  const [result] = await db.insert(agents).values({
    userId,
    agencyId,
    firstName: label,
    lastName: 'Capacity',
    displayName: label,
    slug: `capacity-${suffix}`,
    bio: 'Commercial capacity test agent',
    profileImage: 'capacity-profile',
    phone: '+27115550000',
    email: `${suffix}@example.test`,
    focus: 'sales',
    propertyTypes: 'house',
    areasServed: 'Johannesburg',
    isVerified: 1,
    isFeatured: 0,
    status: 'approved',
  } as any);
  const id = insertId(result);
  created.agents.push(id);
  return id;
}

async function attachCanonicalPlan(ownerType: 'agent' | 'agency', ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const planName = `${ownerType}_launch_access`;
  const [plan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.name, planName))
    .limit(1);
  if (!plan) throw new Error(`Canonical ${planName} plan is missing.`);
  const [subscriptionResult] = await db.insert(subscriptions).values({
    ownerType,
    ownerId,
    planId: plan.id,
    status: 'active',
    currentPeriodStart: timestampFromNow(-1),
    currentPeriodEnd: timestampFromNow(90),
    cancelAtPeriodEnd: 0,
  } as any);
  created.subscriptions.push(insertId(subscriptionResult));
}

async function insertListing(input: {
  ownerId: number;
  agentId: number | null;
  agencyId: number | null;
  label: string;
  status?: string;
  approvalStatus?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const slug = `capacity-${input.label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const [result] = await db.insert(listings).values({
    ownerId: input.ownerId,
    agentId: input.agentId,
    agencyId: input.agencyId,
    action: 'sell',
    propertyType: 'house',
    title: `Capacity ${input.label}`,
    description: 'Commercial capacity contract listing',
    askingPrice: '1000000.00',
    address: '1 Capacity Avenue',
    latitude: '-26.1076000',
    longitude: '28.0567000',
    city: 'Johannesburg',
    province: 'Gauteng',
    slug,
    status: input.status || 'draft',
    approvalStatus: input.approvalStatus || 'pending',
    readinessScore: 100,
    qualityScore: 100,
  } as any);
  const id = insertId(result);
  created.listings.push(id);
  return id;
}

async function insertActiveListings(input: {
  ownerId: number;
  agentId: number | null;
  agencyId: number | null;
  count: number;
  label: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const rows = Array.from({ length: input.count }, (_, index) => ({
    ownerId: input.ownerId,
    agentId: input.agentId,
    agencyId: input.agencyId,
    action: 'sell' as const,
    propertyType: 'house' as const,
    title: `Capacity ${input.label} ${index}`,
    description: 'Commercial capacity active listing',
    askingPrice: '1000000.00',
    address: '1 Capacity Avenue',
    latitude: '-26.1076000',
    longitude: '28.0567000',
    city: 'Johannesburg',
    province: 'Gauteng',
    slug: `capacity-${input.label}-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    status: 'published' as const,
    approvalStatus: 'approved' as const,
    readinessScore: 100,
    qualityScore: 100,
  }));
  await db.insert(listings).values(rows as any);
  const stored = await db
    .select({ id: listings.id })
    .from(listings)
    .where(
      and(
        eq(listings.ownerId, input.ownerId),
        input.agencyId === null ? isNull(listings.agencyId) : eq(listings.agencyId, input.agencyId),
        eq(listings.status, 'published'),
      ),
    );
  const ids = stored.map(row => Number(row.id));
  created.listings.push(...ids);
  return ids;
}

async function archiveOneActiveListing(ownerId: number, agencyId: number | null) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');
  const [row] = await db
    .select({ id: listings.id })
    .from(listings)
    .where(
      and(
        eq(listings.ownerId, ownerId),
        agencyId === null ? isNull(listings.agencyId) : eq(listings.agencyId, agencyId),
        eq(listings.status, 'published'),
      ),
    )
    .limit(1);
  if (!row) throw new Error('No active capacity fixture available to archive.');
  await db
    .update(listings)
    .set({ status: 'archived' } as any)
    .where(eq(listings.id, row.id));
}

afterEach(async () => {
  const db = await getDb();
  if (!db) return;
  if (created.listings.length) {
    await db.delete(properties).where(inArray(properties.sourceListingId, created.listings));
    await db
      .delete(listingApprovalQueue)
      .where(inArray(listingApprovalQueue.listingId, created.listings));
    await db.delete(listings).where(inArray(listings.id, created.listings));
  }
  if (created.subscriptions.length) {
    await db.delete(subscriptions).where(inArray(subscriptions.id, created.subscriptions));
  }
  if (created.agencies.length) {
    await db.delete(agencyBranding).where(inArray(agencyBranding.agencyId, created.agencies));
  }
  if (created.agents.length) {
    await db.delete(agents).where(inArray(agents.id, created.agents));
  }
  if (created.users.length) {
    await db.delete(users).where(inArray(users.id, created.users));
  }
  if (created.agencies.length) {
    await db.delete(agencies).where(inArray(agencies.id, created.agencies));
  }
  created.users.length = 0;
  created.agencies.length = 0;
  created.agents.length = 0;
  created.subscriptions.length = 0;
  created.listings.length = 0;
});

describeWithDb('commercial active-listing entitlement enforcement', () => {
  it('enforces Agent/Agency caps, ownership/status scope, and publication rollback', async () => {
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    const agentUserId = await insertUser('cap-agent', 'agent');
    const agentId = await insertAgent(agentUserId, null, 'Cap Agent');
    await attachCanonicalPlan('agent', agentUserId);
    const agentActive = await insertActiveListings({
      ownerId: agentUserId,
      agentId,
      agencyId: null,
      count: 50,
      label: 'agent-active',
    });
    const agentCandidateId = await insertListing({
      ownerId: agentUserId,
      agentId,
      agencyId: null,
      label: 'agent-candidate',
    });

    await expect(
      assertListingPublicationEntitled(db, {
        listingId: agentCandidateId,
        operation: 'submit',
      }),
    ).rejects.toMatchObject<ListingPublicationEntitlementError>({
      reason: 'listing_capacity_exhausted',
    });
    await archiveOneActiveListing(agentUserId, null);
    await expect(
      assertListingPublicationEntitled(db, {
        listingId: agentCandidateId,
        operation: 'submit',
      }),
    ).resolves.toMatchObject({ kind: 'independent_agent', userId: agentUserId });
    expect(agentActive.length).toBe(50);

    const agencyId = await insertAgency('cap-agency');
    const agencyUserId = await insertUser('cap-agency-admin', 'agency_admin', agencyId);
    await attachCanonicalPlan('agency', agencyId);
    await insertActiveListings({
      ownerId: agencyUserId,
      agentId: null,
      agencyId,
      count: 500,
      label: 'agency-active',
    });
    const agencyCandidateId = await insertListing({
      ownerId: agencyUserId,
      agentId: null,
      agencyId,
      label: 'agency-candidate',
      status: 'pending_review',
    });
    await db.insert(listingApprovalQueue).values({
      listingId: agencyCandidateId,
      submittedBy: agencyUserId,
      status: 'pending',
      priority: 'normal',
    } as any);

    await expect(
      assertListingPublicationEntitled(db, {
        listingId: agencyCandidateId,
        operation: 'admin_approval',
      }),
    ).rejects.toMatchObject<ListingPublicationEntitlementError>({
      reason: 'listing_capacity_exhausted',
    });
    await expect(approveListing(agencyCandidateId, agencyUserId)).rejects.toMatchObject({
      reason: 'listing_capacity_exhausted',
    });
    const [unchangedCandidate] = await db
      .select({ status: listings.status })
      .from(listings)
      .where(eq(listings.id, agencyCandidateId));
    const [unchangedQueue] = await db
      .select({ status: listingApprovalQueue.status })
      .from(listingApprovalQueue)
      .where(eq(listingApprovalQueue.listingId, agencyCandidateId));
    const publicProjection = await db
      .select({ id: properties.id })
      .from(properties)
      .where(eq(properties.sourceListingId, agencyCandidateId));
    expect(unchangedCandidate?.status).toBe('pending_review');
    expect(unchangedQueue?.status).toBe('pending');
    expect(publicProjection).toHaveLength(0);

    await archiveOneActiveListing(agencyUserId, agencyId);
    await expect(
      assertListingPublicationEntitled(db, {
        listingId: agencyCandidateId,
        operation: 'admin_approval',
      }),
    ).resolves.toMatchObject({ kind: 'agency', agencyId });

    const isolatedUserId = await insertUser('cap-isolated', 'agent');
    const isolatedAgentId = await insertAgent(isolatedUserId, null, 'Isolated Agent');
    await attachCanonicalPlan('agent', isolatedUserId);
    for (const [index, status] of (['draft', 'rejected', 'archived', 'sold'] as const).entries()) {
      await insertListing({
        ownerId: isolatedUserId,
        agentId: isolatedAgentId,
        agencyId: null,
        label: `isolated-${index}`,
        status,
        approvalStatus: status === 'rejected' ? 'rejected' : 'approved',
      });
    }
    const outsideUserId = await insertUser('cap-outside', 'agent');
    const outsideAgentId = await insertAgent(outsideUserId, null, 'Outside Agent');
    await attachCanonicalPlan('agent', outsideUserId);
    await insertActiveListings({
      ownerId: outsideUserId,
      agentId: outsideAgentId,
      agencyId: null,
      count: 1,
      label: 'outside-active',
    });
    const isolatedCandidateId = await insertListing({
      ownerId: isolatedUserId,
      agentId: isolatedAgentId,
      agencyId: null,
      label: 'isolated-candidate',
    });
    await expect(
      assertListingPublicationEntitled(db, {
        listingId: isolatedCandidateId,
        operation: 'submit',
      }),
    ).resolves.toMatchObject({ kind: 'independent_agent', userId: isolatedUserId });
  }, 60_000);
});
