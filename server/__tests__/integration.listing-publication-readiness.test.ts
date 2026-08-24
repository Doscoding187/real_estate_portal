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
  agencyAgentMemberships,
  agencyBranding,
  listings,
  planEntitlements,
  plans,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { evaluateAgencyPublicationReadiness } from '../services/listingPublicationEntitlementService';
import { maintainAgencyAgentMembership } from '../services/agencyMembershipService';

const created = {
  userIds: [] as number[],
  agencyIds: [] as number[],
  planIds: [] as number[],
  subscriptionIds: [] as number[],
  listingIds: [] as number[],
};

async function insertId(result: any): Promise<number> {
  return Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
}

async function insertAgency(input: { verified?: number; completeProfile?: boolean }) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [result] = await db
    .insert(agencies)
    .values({
      name: input.completeProfile ? `Ready Agency ${suffix}` : `Partial ${suffix}`,
      slug: `ready-${suffix}`,
      email: input.completeProfile ? `ready-${suffix}@example.test` : null,
      city: input.completeProfile ? 'Johannesburg' : null,
      province: input.completeProfile ? 'Gauteng' : null,
      subscriptionPlan: 'free',
      subscriptionStatus: 'pending_payment',
      isVerified: input.verified ?? 0,
    } as any);
  const id = await insertId(result);
  created.agencyIds.push(id);
  return id;
}

async function insertBranding(agencyId: number) {
  await db.insert(agencyBranding).values({
    agencyId,
    companyName: 'Ready Agency',
    primaryColor: '#123456',
    secondaryColor: '#654321',
    isEnabled: 1,
  } as any);
}

async function insertAgencyPlanWithCapacity(maxActiveListings: number) {
  const suffix = randomUUID().slice(0, 8);
  const [planResult] = await db
    .insert(plans)
    .values({
      name: `readiness-plan-${suffix}`,
      displayName: 'Readiness Plan',
      description: 'Fixture plan for publication readiness tests.',
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
    valueJson: String(maxActiveListings),
  } as any);

  return planId;
}

async function insertActiveSubscription(input: {
  agencyId: number;
  planId: number;
  daysRemaining: number;
}) {
  const periodEnd = new Date(Date.now() + input.daysRemaining * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace('T', ' ');
  const [result] = await db
    .insert(subscriptions)
    .values({
      ownerType: 'agency',
      ownerId: input.agencyId,
      planId: input.planId,
      status: 'active',
      currentPeriodStart: new Date().toISOString().slice(0, 19).replace('T', ' '),
      currentPeriodEnd: periodEnd,
    } as any);
  const id = await insertId(result);
  created.subscriptionIds.push(id);
  return id;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;
});

afterAll(async () => {
  if (!process.env.DATABASE_URL) return;
  for (const id of created.listingIds) {
    await db.delete(listings).where(eq(listings.id, id)).catch(() => undefined);
  }
  for (const id of created.subscriptionIds) {
    await db.delete(subscriptions).where(eq(subscriptions.id, id)).catch(() => undefined);
  }
  for (const id of created.agencyIds) {
    await db.delete(agencyBranding).where(eq(agencyBranding.agencyId, id)).catch(() => undefined);
    await db.delete(agencyAgentMemberships).where(eq(agencyAgentMemberships.agencyId, id)).catch(() => undefined);
    await db.delete(agencies).where(eq(agencies.id, id)).catch(() => undefined);
  }
  for (const id of created.planIds) {
    await db.delete(planEntitlements).where(eq(planEntitlements.planId, id)).catch(() => undefined);
    await db.delete(plans).where(eq(plans.id, id)).catch(() => undefined);
  }
});

describeWithDb('agency publication readiness enumeration', () => {
  it('enumerates every blocker at once instead of failing one at a time', async () => {
    const agencyId = await insertAgency({ verified: 0, completeProfile: false });

    const readiness = await evaluateAgencyPublicationReadiness(db, agencyId);
    const reasons = readiness.blockers.map(blocker => blocker.reason);

    expect(readiness.ready).toBe(false);
    expect(reasons).toContain('agency_unverified');
    expect(reasons).toContain('agency_profile_incomplete');
    expect(reasons).toContain('agency_branding_incomplete');
    expect(reasons).toContain('subscription_required');
    expect(readiness.facts.verified).toBe(false);

  });

  it('reports ready with capacity facts once verification, profile, branding and billing are satisfied', async () => {
    const agencyId = await insertAgency({ verified: 1, completeProfile: true });
    await insertBranding(agencyId);
    const planId = await insertAgencyPlanWithCapacity(500);
    await insertActiveSubscription({ agencyId, planId, daysRemaining: 90 });

    const readiness = await evaluateAgencyPublicationReadiness(db, agencyId);

    expect(readiness.ready).toBe(true);
    expect(readiness.blockers).toHaveLength(0);
    expect(readiness.facts.capacityMax).toBe(500);
    expect(readiness.facts.capacityUsed).toBe(0);
    expect(readiness.facts.daysRemaining).toBeGreaterThan(80);
  });

  it('counts active inventory against plan capacity and reports exhaustion', async () => {
    const agencyId = await insertAgency({ verified: 1, completeProfile: true });
    await insertBranding(agencyId);
    const planId = await insertAgencyPlanWithCapacity(1);
    await insertActiveSubscription({ agencyId, planId, daysRemaining: 30 });

    const ownerUserId = await insertAgencyOwnerUser(agencyId);
    const suffix = randomUUID().slice(0, 8);
    const [listingResult] = await db
      .insert(listings)
      .values({
        ownerId: ownerUserId,
        agencyId,
        title: `Occupying listing ${suffix}`,
        slug: `occupying-${suffix}`,
        description: 'Capacity fixture',
        askingPrice: 1_000_000,
        status: 'published',
        approvalStatus: 'approved',
        publishedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        address: '1 Test St',
        city: 'Johannesburg',
        province: 'Gauteng',
        price: 1_000_000,
        listingType: 'sale',
        propertyType: 'house',
      } as any);
    const listingId = await insertId(listingResult);
    created.listingIds.push(listingId);

    const readiness = await evaluateAgencyPublicationReadiness(db, agencyId);

    expect(readiness.facts.capacityUsed).toBe(1);
    expect(readiness.facts.capacityMax).toBe(1);
    expect(readiness.blockers.map(b => b.reason)).toContain('listing_capacity_exhausted');
  });
});

async function insertAgencyOwnerUser(agencyId: number): Promise<number> {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [result] = await db
    .insert(users)
    .values({
      email: `owner-${suffix}@example.test`,
      name: 'Agency Owner',
      role: 'agency_admin',
      agencyId,
      emailVerified: 1,
    } as any);
  const id = await insertId(result);
  created.userIds.push(id);
  return id;
}
