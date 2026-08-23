import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// server/_core/env snapshots cookieSecret from process.env at module load,
// and this suite's modules (db -> env) load before any hook can run.
// Seed a deterministic test secret before those imports execute.
const priorJwtSecret = vi.hoisted(() => {
  const prior = process.env.JWT_SECRET;
  if (!prior) process.env.JWT_SECRET = 'agency-membership-authority-test-secret';
  return prior;
});
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

let acceptanceCallerFor: (
  user: { id: number; role: string; agencyId?: number | null; email?: string | null },
) => { invitation: { accept: (input: { token: string }) => Promise<unknown> } };

/**
 * Acceptance mints a fresh session token through the real auth service.
 * CI provides DATABASE_URL but not JWT_SECRET, and server/_core/env
 * snapshots cookieSecret at module load — so the secret must exist BEFORE
 * the router chain is imported. Importing the app router here keeps the
 * whole production acceptance path real.
 */
async function ensureTestAuthEnvironmentAndRouter() {
  const { appRouter } = await import('../routers');
  acceptanceCallerFor = user =>
    appRouter.createCaller({
      req: {
        hostname: 'localhost',
        path: '/',
        method: 'POST',
        headers: { host: 'localhost:5000' },
        socket: { remoteAddress: '127.0.0.1' },
      },
      res: { cookie: () => undefined },
      user,
    } as any);
}

function acceptanceCaller(user: {
  id: number;
  role: string;
  agencyId?: number | null;
  email?: string | null;
}) {
  return acceptanceCallerFor!(user);
}

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

async function getUser(id: number) {
  const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return row;
}

async function insertAgentProfile(
  userId: number,
  agencyId: number | null,
  overrides: Record<string, unknown> = {},
) {
  const suffix = randomUUID().slice(0, 8);
  const [result] = await db
    .insert(agents)
    .values({
      userId,
      agencyId,
      firstName: 'Fixture',
      lastName: 'Agent',
      displayName: `Fixture Agent ${suffix}`,
      email: `agent-${suffix}@example.test`,
      role: 'agent',
      isVerified: 0,
      isFeatured: 0,
      status: 'approved',
      approvedAt: new Date(),
      profileCompletionScore: 60,
      ...overrides,
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
  await ensureTestAuthEnvironmentAndRouter();
});

afterAll(async () => {
  if (!process.env.DATABASE_URL) return;
  if (priorJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = priorJwtSecret;
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

describeWithDb('canonical membership maintenance (atomic unique-pair authority)', () => {
  it('mirrors an accepted agent affiliation and keeps maintenance idempotent', async () => {
    const agencyId = await insertAgency('Mirror');
    const agentUserId = await insertUser('Joiner', 'visitor');
    const agentId = await insertAgentProfile(agentUserId, agencyId);

    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });

    const rows = await db
      .select()
      .from(agencyAgentMemberships)
      .where(eq(agencyAgentMemberships.agentId, agentId));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('active');
    expect(rows[0].effectiveTo).toBeNull();

    const current = await listCurrentAgencyMembershipsForAgent(db, agentId);
    expect(current).toHaveLength(1);

    const affiliation = await resolveCurrentAgencyAffiliation(db, agentId);
    expect(affiliation?.name).toContain('Mirror Agency');
  });

  it('closes the window on suspension, stamps first closure only, and reopens freshly on reactivate', async () => {
    const agencyId = await insertAgency('Lifecycle');
    const agentUserId = await insertUser('Lifecycle', 'agent');
    const agentId = await insertAgentProfile(agentUserId, null);

    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'suspended' });

    let row = (
      await db
        .select()
        .from(agencyAgentMemberships)
        .where(eq(agencyAgentMemberships.agentId, agentId))
        .limit(1)
    )[0];
    const firstClosure = row.effectiveTo;
    expect(row.status).toBe('suspended');
    expect(firstClosure).not.toBeNull();
    expect(await listCurrentAgencyMembershipsForAgent(db, agentId)).toHaveLength(0);

    // Repeat suspension must keep the FIRST closure stamp.
    await new Promise(resolve => setTimeout(resolve, 1100));
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'suspended' });
    row = (
      await db
        .select()
        .from(agencyAgentMemberships)
        .where(eq(agencyAgentMemberships.agentId, agentId))
        .limit(1)
    )[0];
    expect(row.effectiveTo).toBe(firstClosure);

    // Reactivation starts a fresh window and clears closure.
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });
    row = (
      await db
        .select()
        .from(agencyAgentMemberships)
        .where(eq(agencyAgentMemberships.agentId, agentId))
        .limit(1)
    )[0];
    expect(row.status).toBe('active');
    expect(row.effectiveTo).toBeNull();
    expect(new Date(row.effectiveFrom as unknown as string).getTime()).toBeGreaterThan(
      new Date(firstClosure as unknown as string).getTime(),
    );
    expect(await listCurrentAgencyMembershipsForAgent(db, agentId)).toHaveLength(1);
  });

  it('converges racing maintenance calls onto a single canonical row', async () => {
    const agencyId = await insertAgency('Racing');
    const agentUserId = await insertUser('Racer', 'agent');
    const agentId = await insertAgentProfile(agentUserId, null);

    await Promise.all(
      Array.from({ length: 6 }, () =>
        maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' }),
      ),
    );

    const rows = await db
      .select()
      .from(agencyAgentMemberships)
      .where(eq(agencyAgentMemberships.agentId, agentId));
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('active');
    expect(await listCurrentAgencyMembershipsForAgent(db, agentId)).toHaveLength(1);
  });
});

describeWithDb('invitation acceptance (production path)', () => {
  it('accepting an agent invitation creates consistent identity, profile, and canonical membership', async () => {
    const agencyId = await insertAgency('Production');
    const ownerUserId = await insertUser('ProdOwner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, ownerUserId));

    const inviteeEmail = `prod-joiner-${randomUUID().slice(0, 8)}@example.test`;
    const inviteeUserId = await insertUser('ProdJoiner', 'visitor');
    await db.update(users).set({ email: inviteeEmail }).where(eq(users.id, inviteeUserId));

    const invitationId = await insertPendingInvitation({
      agencyId,
      invitedBy: ownerUserId,
      email: inviteeEmail,
      role: 'agent',
    });
    const invitation = (
      await db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1)
    )[0];

    const caller = acceptanceCaller({
      id: inviteeUserId,
      role: 'visitor',
      agencyId: null,
      email: inviteeEmail,
    });

    await caller.invitation.accept({ token: invitation.token });

    // Identity projection updated.
    const updatedUser = await getUser(inviteeUserId);
    expect(updatedUser.role).toBe('agent');
    expect(Number(updatedUser.agencyId)).toBe(agencyId);
    expect(updatedUser.isSubaccount).toBe(1);

    // Agent profile approved and affiliated.
    const [profile] = await db.select().from(agents).where(eq(agents.userId, inviteeUserId)).limit(1);
    expect(profile.status).toBe('approved');
    expect(Number(profile.agencyId)).toBe(agencyId);

    // Canonical membership row active with an open window.
    const membership = (
      await db
        .select()
        .from(agencyAgentMemberships)
        .where(
          and(
            eq(agencyAgentMemberships.agencyId, agencyId),
            eq(agencyAgentMemberships.agentId, Number(profile.id)),
          ),
        )
        .limit(1)
    );
    expect(membership).toHaveLength(1);
    expect(membership[0].status).toBe('active');
    expect(membership[0].effectiveTo).toBeNull();

    // Invitation consumed.
    const [consumed] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);
    expect(consumed.status).toBe('accepted');

    // Public web presence resolves the new affiliation.
    const affiliation = await resolveCurrentAgencyAffiliation(db, Number(profile.id));
    expect(affiliation?.name).toContain('Production Agency');
  });

  it('rejects principal conversion for an account carrying an agent identity with no partial writes', async () => {
    const targetAgencyId = await insertAgency('ConflationTarget');
    const ownerUserId = await insertUser('ConflOwner', 'agency_admin');
    await db.update(users).set({ agencyId: targetAgencyId }).where(eq(users.id, ownerUserId));

    const otherAgencyId = await insertAgency('ConflationOther');

    const agentUserId = await insertUser('ConflAgent', 'agent');
    const originalProfileId = await insertAgentProfile(agentUserId, otherAgencyId);

    const inviteeEmail = (
      await db.select({ email: users.email }).from(users).where(eq(users.id, agentUserId))
    )[0].email;

    const invitationId = await insertPendingInvitation({
      agencyId: targetAgencyId,
      invitedBy: ownerUserId,
      email: inviteeEmail,
      role: 'agency_admin',
    });
    const invitation = (
      await db.select().from(invitations).where(eq(invitations.id, invitationId)).limit(1)
    )[0];

    const before = {
      user: await getUser(agentUserId),
      profile: (
        await db.select().from(agents).where(eq(agents.id, originalProfileId)).limit(1)
      )[0],
    };

    const caller = acceptanceCaller({
      id: agentUserId,
      role: 'agent',
      agencyId: null,
      email: inviteeEmail,
    });

    await expect(caller.invitation.accept({ token: invitation.token })).rejects.toThrow(
      /already carries an agent profile/i,
    );

    // No partial write anywhere.
    const afterUser = await getUser(agentUserId);
    expect(afterUser.role).toBe(before.user.role); // still 'agent'
    expect(afterUser.agencyId).toBeNull(); // never affiliated to target agency

    const afterProfile = (
      await db.select().from(agents).where(eq(agents.id, originalProfileId)).limit(1)
    )[0];
    expect(Number(afterProfile.agencyId)).toBe(otherAgencyId);
    expect(afterProfile.status).toBe(before.profile.status);

    const membershipsForTargetAgency = await db
      .select()
      .from(agencyAgentMemberships)
      .where(
        and(
          eq(agencyAgentMemberships.agencyId, targetAgencyId),
          eq(agencyAgentMemberships.agentId, originalProfileId),
        ),
      );
    expect(membershipsForTargetAgency).toHaveLength(0);

    const [stillPending] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);
    expect(stillPending.status).toBe('pending');
  });
});
