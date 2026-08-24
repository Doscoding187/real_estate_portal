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
  planEntitlements,
  plans,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { appRouter } from '../routers';

const created = {
  userIds: [] as number[],
  agencyIds: [] as number[],
  planIds: [] as number[],
  subscriptionIds: [] as number[],
  leadIds: [] as number[],
};

async function insertId(result: any): Promise<number> {
  return Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
}

function caller(user: { id: number; role: string; agencyId?: number | null; email?: string }) {
  return appRouter.createCaller({
    req: { hostname: 'localhost', path: '/', method: 'POST', headers: { host: 'localhost:5000' } },
    res: { cookie: () => undefined },
    user,
  } as any);
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;
});

afterAll(async () => {
  if (!process.env.DATABASE_URL) return;
  for (const id of created.leadIds) await db.delete(leads).where(eq(leads.id, id)).catch(() => undefined);
  for (const id of created.subscriptionIds) await db.delete(subscriptions).where(eq(subscriptions.id, id)).catch(() => undefined);
  for (const id of created.planIds) {
    await db.delete(planEntitlements).where(eq(planEntitlements.planId, id)).catch(() => undefined);
    await db.delete(plans).where(eq(plans.id, id)).catch(() => undefined);
  }
  for (const id of created.agencyIds) await db.delete(agencies).where(eq(agencies.id, id)).catch(() => undefined);
  for (const id of created.userIds) await db.delete(users).where(eq(users.id, id)).catch(() => undefined);
});

async function seedAgency(input: { verified?: number; daysRemaining?: number | null }) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [agencyResult] = await db
    .insert(agencies)
    .values({
      name: `Operating ${suffix}`,
      slug: `operating-${suffix}`,
      email: `operating-${suffix}@example.test`,
      city: 'Johannesburg',
      province: 'Gauteng',
      isVerified: input.verified ?? 1,
    } as any);
  const agencyId = await insertId(agencyResult);

  await db.insert(agencyBranding).values({
    agencyId,
    companyName: 'Operating Agency',
    primaryColor: '#0a1f44',
    secondaryColor: '#f8fafc',
    isEnabled: 1,
  } as any);
  created.agencyIds.push(agencyId);

  const [userResult] = await db
    .insert(users)
    .values({
      email: `owner-${suffix}@example.test`,
      name: 'Owner',
      role: 'agency_admin',
      agencyId,
      emailVerified: 1,
    } as any);
  const ownerUserId = await insertId(userResult);
  created.userIds.push(ownerUserId);

  if (input.daysRemaining !== null && input.daysRemaining !== undefined) {
    const [planResult] = await db
      .insert(plans)
      .values({
        name: `operating-${suffix}`,
        displayName: 'Operating Plan',
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

    const periodEnd = new Date(Date.now() + input.daysRemaining * 86_400_000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
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
  }

  return { agencyId, ownerUserId };
}

describeWithDb('agency operating home brief', () => {
  it('ranks SLA breaches first and reports a clear queue when healthy', async () => {
    const { agencyId, ownerUserId } = await seedAgency({ verified: 1, daysRemaining: 60 });
    const caller = callerFor(ownerUserId, agencyId);

    // Overdue lead (created >15 min ago by backdating createdAt).
    const overdueCreated = new Date(Date.now() - 60 * 60_000).toISOString().slice(0, 19).replace('T', ' ');
    const [leadResult] = await db
      .insert(leads)
      .values({
        name: 'Overdue Buyer',
        email: `overdue-${randomUUID().slice(0, 8)}@example.test`,
        phone: '+27110000001',
        source: 'property_detail',
        status: 'new',
        agencyId,
        propertyType: 'residential',
        createdAt: overdueCreated,
        updatedAt: overdueCreated,
      } as any);
    created.leadIds.push(await insertId(leadResult));

    const home = await caller.agency.getOperatingHome();

    expect(home.ready).toBe(false);
    expect(home.brief.leads.firstResponseOverdueCount).toBe(1);
    expect(home.actions[0]).toMatchObject({
      code: 'respond_sla_breach',
      severity: 'critical',
      href: '/agency/leads',
    });
    expect(home.brief.publication.capacityMax).toBe(500);

    // Healthy comparison: a fresh agency with no signals renders a clear queue.
    const fresh = await seedAgency({ verified: 1, daysRemaining: 90 });
    const freshHome = await callerFor(fresh.ownerUserId, fresh.agencyId).agency.getOperatingHome();
    expect(freshHome.ready).toBe(true);
    expect(freshHome.actions).toHaveLength(0);
  });

  it('surfaces unverified agencies as the top critical action', async () => {
    const { agencyId, ownerUserId } = await seedAgency({ verified: 0, daysRemaining: 30 });
    const home = await callerFor(ownerUserId, agencyId).agency.getOperatingHome();

    expect(home.actions[0].code).toBe('resolve_publication_blocker');
    expect(home.actions[0].severity).toBe('critical');
    expect(home.brief.publication.verified).toBe(false);
  });
});

function callerFor(userId: number, agencyId?: number) {
  return appRouter.createCaller({
    req: { hostname: 'localhost', path: '/', method: 'POST', headers: { host: 'localhost:5000' } },
    res: { cookie: () => undefined },
    user: { id: userId, role: 'agency_admin', agencyId: agencyId ?? null },
  } as any);
}
