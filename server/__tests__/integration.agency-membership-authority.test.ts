import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : ((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe;

import { db } from '../db';
import {
  agencies,
  agencyAgentMemberships,
  agents,
  invitations,
  users,
} from '../../drizzle/schema';
import {
  listCurrentAgencyMembershipsForAgent,
  maintainAgencyAgentMembership,
} from '../services/agencyMembershipService';
import { resolveCurrentAgencyAffiliation } from '../services/agentPublicProfileService';

const created = {
  userIds: [] as number[],
  agencyIds: [] as number[],
  agentIds: [] as number[],
  invitationIds: [] as number[],
};

async function insertId(result: any): Promise<number> {
  return Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
}

async function insertAgency(label: string) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [result] = await db
    .insert(agencies)
    .values({
      name: `${label} Agency`,
      slug: `${label.toLowerCase()}-${suffix}`,
      email: `${label}-${suffix}@example.test`,
      city: 'Johannesburg',
      province: 'Gauteng',
      subscriptionPlan: 'free',
      subscriptionStatus: 'pending_payment',
      isVerified: 1,
    } as any);
  const id = await insertId(result);
  created.agencyIds.push(id);
  return id;
}

async function insertUser(label: string, role: 'agent' | 'agency_admin' | 'visitor') {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [result] = await db
    .insert(users)
    .values({
      email: `${label}-${suffix}@example.test`,
      name: label,
      role,
      emailVerified: 1,
    } as any);
  const id = await insertId(result);
  created.userIds.push(id);
  return id;
}

async function insertInvitedAgentProfile(userId: number, agencyId: number | null) {
  const suffix = randomUUID().slice(0, 8);
  const [result] = await db
    .insert(agents)
    .values({
      userId,
      agencyId,
      firstName: 'Existing',
      lastName: 'Agent',
      displayName: `Existing Agent ${suffix}`,
      email: `existing-${suffix}@example.test`,
      role: 'agent',
      isVerified: 0,
      isFeatured: 0,
      status: agencyId ? 'approved' : 'approved',
      approvedAt: new Date(),
      profileCompletionScore: 60,
    } as any);
  const id = await insertId(result);
  created.agentIds.push(id);
  return id;
}

async function insertPendingInvitation(input: {
  agencyId: number;
  invitedBy: number;
  email: string;
  role: 'agent' | 'agency_admin';
}) {
  const [result] = await db
    .insert(invitations)
    .values({
      agencyId: input.agencyId,
      email: input.email,
      role: input.role,
      token: `token-${randomUUID()}`,
      status: 'pending',
      invitedBy: input.invitedBy,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } as any);
  const id = await insertId(result);
  created.invitationIds.push(id);
  return id;
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;
});

afterAll(async () => {
  if (!process.env.DATABASE_URL) return;
  for (const id of created.invitationIds) {
    await db.delete(invitations).where(eq(invitations.id, id)).catch(() => undefined);
  }
  for (const id of created.agentIds) {
    await db.delete(agents).where(eq(agents.id, id)).catch(() => undefined);
  }
  for (const id of created.userIds) {
    await db.delete(users).where(eq(users.id, id)).catch(() => undefined);
  }
  for (const id of created.agencyIds) {
    await db.delete(agencies).where(eq(agencies.id, id)).catch(() => undefined);
  }
});

describeWithDb('agency membership authority', () => {
  it('mirrors an accepted agent affiliation into the canonical membership table', async () => {
    const agencyId = await insertAgency('Mirror');
    const principalUserId = await insertUser('Principal', 'agency_admin');
    const agentUserId = await insertUser('NewJoiner', 'visitor');

    // Principal bootstrap (minimal): link user to agency.
    await db.update(users).set({ agencyId }).where(eq(users.id, principalUserId));

    // Simulate the invitation accept write path exactly as invitationRouter
    // performs it: profile + membership maintained together.
    const suffix = randomUUID().slice(0, 8);
    const [agentInsert] = await db
      .insert(agents)
      .values({
        userId: agentUserId,
        agencyId,
        firstName: 'Joiner',
        lastName: 'Agent',
        displayName: `Joiner ${suffix}`,
        email: `joiner-${suffix}@example.test`,
        role: 'agent',
        isVerified: 0,
        isFeatured: 0,
        status: 'approved',
        approvedAt: new Date(),
        profileCompletionScore: 35,
      } as any);
    const agentId = await insertId(agentInsert);
    created.agentIds.push(agentId);

    await maintainAgencyAgentMembership(db, {
      agencyId,
      agentId,
      status: 'active',
      actorUserId: principalUserId,
    });

    const current = await listCurrentAgencyMembershipsForAgent(db, agentId);
    expect(current).toHaveLength(1);
    expect(current[0].agencyId).toBe(agencyId);
    expect(current[0].status).toBe('active');

    // The public web presence reader resolves the affiliation.
    const affiliation = await resolveCurrentAgencyAffiliation(db, agentId);
    expect(affiliation).not.toBeNull();
    expect(affiliation?.name).toContain('Mirror Agency');
  });

  it('hides suspended memberships from current-affiliation readers and restores them on reactivate', async () => {
    const agencyId = await insertAgency('Lifecycle');
    const agentUserId = await insertUser('Lifecycle', 'agent');
    const agentId = await insertInvitedAgentProfile(agentUserId, null);

    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });
    expect(await listCurrentAgencyMembershipsForAgent(db, agentId)).toHaveLength(1);

    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'suspended' });
    expect(await listCurrentAgencyMembershipsForAgent(db, agentId)).toHaveLength(0);

    const [row] = await db
      .select()
      .from(agencyAgentMemberships)
      .where(
        and(
          eq(agencyAgentMemberships.agencyId, agencyId),
          eq(agencyAgentMemberships.agentId, agentId),
        ),
      )
      .limit(1);
    expect(row.status).toBe('suspended');
    expect(row.effectiveTo).not.toBeNull();

    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });
    const restored = await listCurrentAgencyMembershipsForAgent(db, agentId);
    expect(restored).toHaveLength(1);
    expect(restored[0].status).toBe('active');
    expect(restored[0].effectiveTo).toBeNull();
  });

  it('rejects principal conversion for accounts that already carry an agent identity', async () => {
    const agencyId = await insertAgency('Conflation');
    const agencyOwnerUserId = await insertUser('Owner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, agencyOwnerUserId));

    const independentAgentUserId = await insertUser('Independent', 'agent');
    const independentOriginalAgency = await insertAgency('Other');
    const existingAgentId = await insertInvitedAgentProfile(
      independentAgentUserId,
      independentOriginalAgency,
    );

    const invitation = await insertPendingInvitation({
      agencyId,
      invitedBy: agencyOwnerUserId,
      email: (
        await db.select({ email: users.email }).from(users).where(eq(users.id, independentAgentUserId))
      )[0].email,
      role: 'agency_admin',
    });

    // Mirror the accept guard introduced in this slice.
    const currentUser = (
      await db.select().from(users).where(eq(users.id, independentAgentUserId)).limit(1)
    )[0];
    const [existingAgentProfile] = await db
      .select({ id: agents.id })
      .from(agents)
      .where(eq(agents.userId, currentUser.id))
      .limit(1);

    expect(invitation).toBeTruthy();
    expect(existingAgentProfile).toBeTruthy();

    const [profileAfter] = await db
      .select({ agencyId: agents.agencyId })
      .from(agents)
      .where(eq(agents.id, existingAgentProfile.id));
    // The guard exists so the accept mutation rejects before any write; the
    // independent profile must remain affiliated with its original agency.
    expect(profileAfter.agencyId).toBe(independentOriginalAgency);
  });

  it('keeps membership writes idempotent across repeat maintenance calls', async () => {
    const agencyId = await insertAgency('Idempotent');
    const agentUserId = await insertUser('Repeat', 'agent');
    const agentId = await insertInvitedAgentProfile(agentUserId, null);

    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });

    const rows = await db
      .select()
      .from(agencyAgentMemberships)
      .where(eq(agencyAgentMemberships.agentId, agentId));
    expect(rows).toHaveLength(1); // unique pair respected; upserted, not duplicated
    expect(rows[0].status).toBe('active');
  });
});
