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
import { and, eq, inArray, ne } from 'drizzle-orm';
import { encodeCanonicalLocationId } from '../../shared/locationAuthority';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe);

import { db } from '../db';
import {
  agencies,
  agencyAgentMemberships,
  agents,
  billableAccounts,
  commissions,
  invitations,
  listingAnalytics,
  listings,
  leads,
  notifications,
  plans,
  properties,
  showings,
  suburbs,
  subscriptions,
  users,
} from '../../drizzle/schema';
import {
  listCurrentAgencyMembershipsForAgent,
  maintainAgencyAgentMembership,
} from '../services/agencyMembershipService';
import {
  findAgentsServingLocation,
  resolveCurrentAgencyAffiliation,
} from '../services/agentPublicProfileService';
import { agentOnboardingService } from '../services/agentOnboardingService';
import { agentProfileSchema } from '../routes/agentOnboarding';
import { createListing } from '../db';
import { requireAgencyAssignableAgent } from '../services/sellerProspectAccessService';

const created = {
  userIds: [] as number[],
  agencyIds: [] as number[],
  agentIds: [] as number[],
  invitationIds: [] as number[],
  listingIds: [] as number[],
  leadIds: [] as number[],
};

let acceptanceCallerFor: (user: {
  id: number;
  role: string;
  agencyId?: number | null;
  email?: string | null;
}) => { invitation: { accept: (input: { token: string }) => Promise<unknown> } };
let applicationCallerFor: (user: {
  id: number;
  role: string;
  agencyId?: number | null;
  email?: string | null;
}) => any;
let publicCallerFor: () => any;

/**
 * Acceptance mints a fresh session token through the real auth service.
 * CI provides DATABASE_URL but not JWT_SECRET, and server/_core/env
 * snapshots cookieSecret at module load — so the secret must exist BEFORE
 * the router chain is imported. Importing the app router here keeps the
 * whole production acceptance path real.
 */
async function ensureTestAuthEnvironmentAndRouter() {
  const { appRouter } = await import('../routers');
  const createApplicationCaller = (
    user: {
      id: number;
      role: string;
      agencyId?: number | null;
      email?: string | null;
    } | null,
  ) =>
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
  applicationCallerFor = user => createApplicationCaller(user);
  publicCallerFor = () => createApplicationCaller(null);
  acceptanceCallerFor = user => applicationCallerFor(user);
}

function acceptanceCaller(user: {
  id: number;
  role: string;
  agencyId?: number | null;
  email?: string | null;
}) {
  return acceptanceCallerFor!(user);
}

function applicationCaller(user: {
  id: number;
  role: string;
  agencyId?: number | null;
  email?: string | null;
}) {
  return applicationCallerFor!(user);
}

function publicCaller() {
  return publicCallerFor!();
}

async function insertId(result: any): Promise<number> {
  return Number(result?.[0]?.insertId ?? result?.insertId ?? 0);
}

async function insertAgency(label: string) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const [result] = await db.insert(agencies).values({
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
  const [result] = await db.insert(users).values({
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
  const [result] = await db.insert(agents).values({
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
  const [result] = await db.insert(invitations).values({
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

/**
 * Isolated paid-state fixture only. Invitation acceptance is intentionally
 * unavailable while an agency is in the normal pre-payment state; this
 * fixture establishes the canonical agency owner and live term needed to
 * exercise the post-activation membership path without invoking a payment
 * provider or enabling normal runtime activation.
 */
async function createActiveAgencyInvitationAccess(agencyId: number, actorUserId: number) {
  const [plan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.name, 'agency_launch_access'))
    .limit(1);
  if (!plan) throw new Error('Canonical agency Launch Access reference data is unavailable.');

  const [accountResult] = await db.insert(billableAccounts).values({
    accountKind: 'agency',
    agencyId,
  } as any);
  const accountId = await insertId(accountResult);
  if (!accountId) throw new Error('Could not create agency billable-account fixture.');

  const now = new Date();
  await db.insert(subscriptions).values({
    ownerType: 'agency',
    ownerId: agencyId,
    billableAccountId: accountId,
    planId: plan.id,
    status: 'active',
    currentPeriodStart: now,
    currentPeriodEnd: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
    cancelAtPeriodEnd: 0,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  } as any);
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
  if (created.leadIds.length) {
    await db
      .delete(leads)
      .where(inArray(leads.id, created.leadIds))
      .catch(() => undefined);
  }
  for (const id of created.listingIds) {
    await db
      .delete(listingAnalytics)
      .where(eq(listingAnalytics.listingId, id))
      .catch(() => undefined);
    await db
      .delete(listings)
      .where(eq(listings.id, id))
      .catch(() => undefined);
  }
  if (created.agencyIds.length) {
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.ownerType, 'agency'),
          inArray(subscriptions.ownerId, created.agencyIds),
        ),
      )
      .catch(() => undefined);
    await db
      .delete(billableAccounts)
      .where(inArray(billableAccounts.agencyId, created.agencyIds))
      .catch(() => undefined);
  }
  for (const id of created.invitationIds) {
    await db
      .delete(invitations)
      .where(eq(invitations.id, id))
      .catch(() => undefined);
  }
  for (const id of created.agentIds) {
    await db
      .delete(agencyAgentMemberships)
      .where(eq(agencyAgentMemberships.agentId, id))
      .catch(() => undefined);
    await db
      .delete(agents)
      .where(eq(agents.id, id))
      .catch(() => undefined);
  }
  for (const id of created.userIds) {
    await db
      .delete(notifications)
      .where(eq(notifications.userId, id))
      .catch(() => undefined);
    await db
      .delete(users)
      .where(eq(users.id, id))
      .catch(() => undefined);
  }
  for (const id of created.agencyIds) {
    await db
      .delete(agencies)
      .where(eq(agencies.id, id))
      .catch(() => undefined);
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

    // Reactivation clears closure while preserving the original tenure start.
    const originalStart = (
      await db
        .select()
        .from(agencyAgentMemberships)
        .where(eq(agencyAgentMemberships.agentId, agentId))
        .limit(1)
    )[0].effectiveFrom;

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
    expect(row.effectiveFrom).toBe(originalStart);
    expect(await listCurrentAgencyMembershipsForAgent(db, agentId)).toHaveLength(1);
  });

  it('establishing a new affiliation closes competing current memberships', async () => {
    const { establishCanonicalAgencyMembership } =
      await import('../services/agencyMembershipService');
    const agencyA = await insertAgency('CompeteA');
    const agencyB = await insertAgency('CompeteB');
    const agentUserId = await insertUser('Nomad', 'agent');
    const agentId = await insertAgentProfile(agentUserId, null);

    await maintainAgencyAgentMembership(db, { agencyId: agencyA, agentId, status: 'active' });
    expect(await listCurrentAgencyMembershipsForAgent(db, agentId)).toHaveLength(1);

    await establishCanonicalAgencyMembership({
      db,
      agencyId: agencyB,
      agentId,
      actorUserId: agentUserId,
    });

    const rows = await db
      .select()
      .from(agencyAgentMemberships)
      .where(eq(agencyAgentMemberships.agentId, agentId));
    expect(rows).toHaveLength(2);

    const aRow = rows.find(r => Number(r.agencyId) === agencyA)!;
    const bRow = rows.find(r => Number(r.agencyId) === agencyB)!;
    expect(aRow.status).toBe('left');
    expect(aRow.effectiveTo).not.toBeNull();
    expect(bRow.status).toBe('active');
    expect(bRow.effectiveTo).toBeNull();

    const currents = await listCurrentAgencyMembershipsForAgent(db, agentId);
    expect(currents.map(m => Number(m.agencyId))).toEqual([agencyB]);
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

  it('rejects profile-supplied agency affiliation and leaves direct service callers unaffiliated', async () => {
    const agencyId = await insertAgency('ForgedProfile');
    const userId = await insertUser('ForgedProfileAgent', 'agent');
    const agentId = await insertAgentProfile(userId, null);

    expect(
      agentProfileSchema.safeParse({
        displayName: 'Forged Profile Agent',
        phone: '+27110000000',
        agencyId,
      }).success,
    ).toBe(false);

    const result = await agentOnboardingService.saveProfile(userId, {
      displayName: 'Forged Profile Agent',
      phone: '+27110000000',
      agencyId,
    } as any);

    const [profile] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    expect(profile.agencyId).toBeNull();
    expect(result.profile?.agencyId).toBeNull();
    expect(await listCurrentAgencyMembershipsForAgent(db, agentId)).toHaveLength(0);
  });

  it('does not recommend a suspended member through retained agency profile affiliation', async () => {
    const agencyId = await insertAgency('PublicRecommendation');
    const memberUserId = await insertUser('PublicRecommendationMember', 'agent');
    const [location] = await db
      .select({ id: suburbs.id })
      .from(suburbs)
      .where(ne(suburbs.status, 'retired'))
      .limit(1);
    if (!location) throw new Error('Canonical active suburb reference data is required.');

    const agentId = await insertAgentProfile(memberUserId, agencyId, {
      areasServed: JSON.stringify([
        {
          canonicalLocationId: encodeCanonicalLocationId('suburb', Number(location.id)),
          label: 'Canonical public recommendation fixture',
        },
      ]),
    });
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });

    await expect(findAgentsServingLocation(db, 'suburb', Number(location.id))).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: agentId, agencyName: expect.stringContaining('Agency') }),
      ]),
    );

    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'suspended' });

    // Suspension deliberately retains historical projection fields. Public
    // recommendations must derive agency eligibility from current canonical
    // membership, just like public-property lead custody does.
    const [retainedProfile] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    expect(retainedProfile.agencyId).toBe(agencyId);

    const recommendations = await findAgentsServingLocation(db, 'suburb', Number(location.id));
    expect(recommendations.map(recommendation => recommendation.id)).not.toContain(agentId);
  });

  it('delivers a direct profile enquiry to a current unbadged agency member with agency Launch Access', async () => {
    const agencyId = await insertAgency('DirectProfileAgencyEntitlement');
    const ownerUserId = await insertUser('DirectProfileAgencyOwner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, ownerUserId));
    await createActiveAgencyInvitationAccess(agencyId, ownerUserId);

    const memberUserId = await insertUser('DirectProfileAgencyMember', 'agent');
    await db.update(users).set({ agencyId, isSubaccount: 1 }).where(eq(users.id, memberUserId));
    const agentId = await insertAgentProfile(memberUserId, agencyId, { isVerified: 0 });
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });
    expect(
      await db
        .select({ id: subscriptions.id })
        .from(subscriptions)
        .where(and(eq(subscriptions.ownerType, 'agent'), eq(subscriptions.ownerId, memberUserId))),
    ).toHaveLength(0);

    // This is the intended post-activation agency case: no optional badge
    // and no second personal purchase. Public eligibility comes from current
    // canonical membership plus the agency's own billable entitlement.
    const captured = await publicCaller().leads.create({
      agentId,
      name: 'Direct profile prospect',
      email: `direct-profile-${randomUUID()}@example.test`,
      message: 'Please contact me about your services.',
      source: 'agent_profile',
      sourceSurface: 'agent_profile_enquiry',
      leadSource: 'agent_profile',
      captureRequestId: `direct-profile-${randomUUID()}`,
      consent: {
        accepted: true,
        version: 'launch-privacy-1',
        source: 'agent_profile_enquiry',
      },
    });
    expect(captured).toMatchObject({
      success: true,
      delivered: true,
      deliveryStatus: 'delivered',
      deliveryMethod: 'crm_export',
      leadCustody: 'verified_customer_recipient',
      recipientType: 'agent',
      recipientId: agentId,
    });
    const leadId = Number(captured.leadId);
    created.leadIds.push(leadId);

    const [storedLead] = await db
      .select({
        agencyId: leads.agencyId,
        agentId: leads.agentId,
        captureRequestId: leads.captureRequestId,
      })
      .from(leads)
      .where(eq(leads.id, leadId))
      .limit(1);
    expect(storedLead).toMatchObject({ agencyId: null, agentId });
    expect(storedLead.captureRequestId).toMatch(/^direct-profile-/);

    // The profile's historical agency field remains set after a membership
    // suspension, but it can no longer use the agency commercial term to
    // receive a new public enquiry.
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'suspended' });
    const [retainedProfile] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    expect(retainedProfile.agencyId).toBe(agencyId);
    await expect(
      publicCaller().leads.create({
        agentId,
        name: 'Suspended membership prospect',
        email: `suspended-profile-${randomUUID()}@example.test`,
        message: 'Please contact me about your services.',
        source: 'agent_profile',
        sourceSurface: 'agent_profile_enquiry',
        leadSource: 'agent_profile',
        captureRequestId: `suspended-profile-${randomUUID()}`,
        consent: {
          accepted: true,
          version: 'launch-privacy-1',
          source: 'agent_profile_enquiry',
        },
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describeWithDb('team operations on canonical membership', () => {
  it('projects roster lifecycle from canonical memberships even when legacy profile state disagrees', async () => {
    const agencyId = await insertAgency('Roster');
    const ownerUserId = await insertUser('RosterOwner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, ownerUserId));

    const memberUserId = await insertUser('RosterMember', 'agent');
    const agentId = await insertAgentProfile(memberUserId, agencyId);
    await db
      .update(users)
      .set({ role: 'agent', agencyId, isSubaccount: 1 })
      .where(eq(users.id, memberUserId));

    await maintainAgencyAgentMembership(db, {
      agencyId,
      agentId,
      status: 'active',
      actorUserId: ownerUserId,
    });

    // Simulate drift: profile still approved while the canonical membership
    // was suspended behind the router's back.
    await maintainAgencyAgentMembership(db, {
      agencyId,
      agentId,
      status: 'suspended',
      actorUserId: ownerUserId,
    });

    const adminCaller = acceptanceCaller({
      id: ownerUserId,
      role: 'agency_admin',
      agencyId,
      email: (
        await db.select({ email: users.email }).from(users).where(eq(users.id, ownerUserId))
      )[0].email,
    });

    const roster = await adminCaller.agency.listAgents();
    const member = roster.find((m: { userId: number }) => m.userId === memberUserId);
    expect(member).toBeDefined();
    expect(member.membership.status).toBe('suspended');
    expect(member.membership.source).toBe('agency_agent_memberships');
    expect(member.permissions.canReceiveLeadAssignments).toBe(false);

    // Assignment dropdown excludes the lapsed member entirely.
    const assignable = await adminCaller.agency.listAssignableAgents();
    expect(assignable.map((a: { id: number }) => Number(a.id))).not.toContain(agentId);
  });

  it('does not let a retained agency profile outlive canonical seller-prospect or analytics authority', async () => {
    const agencyId = await insertAgency('PrivateWorkspace');
    const ownerUserId = await insertUser('PrivateWorkspaceOwner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, ownerUserId));

    const memberUserId = await insertUser('PrivateWorkspaceMember', 'agent');
    await db
      .update(users)
      .set({ agencyId, isSubaccount: 1 })
      .where(eq(users.id, memberUserId));
    const agentId = await insertAgentProfile(memberUserId, agencyId);
    await maintainAgencyAgentMembership(db, {
      agencyId,
      agentId,
      status: 'active',
      actorUserId: ownerUserId,
    });

    const managerCaller = applicationCaller({
      id: ownerUserId,
      role: 'agency_admin',
      agencyId,
    });
    const memberCaller = applicationCaller({
      id: memberUserId,
      role: 'agent',
      agencyId,
    });

    await expect(memberCaller.canvassing.getWorkspaceAccess()).resolves.toMatchObject({
      mode: 'agency_team',
      scope: 'agent',
      agencyId,
    });
    await expect(requireAgencyAssignableAgent(db, agencyId, agentId)).resolves.toMatchObject({
      id: agentId,
    });
    await expect(managerCaller.canvassing.listAssignableAgents()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: agentId })]),
    );

    await maintainAgencyAgentMembership(db, {
      agencyId,
      agentId,
      status: 'suspended',
      actorUserId: ownerUserId,
    });

    const [retainedUser] = await db.select().from(users).where(eq(users.id, memberUserId)).limit(1);
    const [retainedProfile] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    expect(retainedUser.agencyId).toBe(agencyId);
    expect(retainedProfile.agencyId).toBe(agencyId);

    await expect(memberCaller.canvassing.getWorkspaceAccess()).resolves.toMatchObject({
      mode: 'agency_profile_required',
    });
    await expect(memberCaller.canvassing.list({})).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(requireAgencyAssignableAgent(db, agencyId, agentId)).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(
      memberCaller.exploreApi.getAgencyAnalytics({ agencyId, dateRange: '7d' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(managerCaller.canvassing.listAssignableAgents()).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ id: agentId })]),
    );
  });

  it('keeps an unaffiliated former member draft private from their former agency', async () => {
    const agencyId = await insertAgency('Attribution');
    const ownerUserId = await insertUser('AttributionOwner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, ownerUserId));
    const memberUserId = await insertUser('AttrMember', 'agent');
    await db.update(users).set({ agencyId, isSubaccount: 1 }).where(eq(users.id, memberUserId));
    const agentId = await insertAgentProfile(memberUserId, agencyId);

    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });
    const agencyOwnedListingId = await createListing({
      userId: memberUserId,
      action: 'sell',
      propertyType: 'house',
      title: 'Agency-owned draft before membership suspension',
      description: 'This draft remains agency inventory after its author later leaves the team.',
      pricing: { askingPrice: 2_100_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 170 },
      address: '8 Membership Authority Road',
      city: 'Johannesburg',
      suburb: 'Sandton',
      province: 'Gauteng',
      slug: `active-membership-${randomUUID().slice(0, 8)}`,
      media: [],
    } as any);
    created.listingIds.push(agencyOwnedListingId);

    await maintainAgencyAgentMembership(db, {
      agencyId,
      agentId,
      status: 'suspended',
      actorUserId: memberUserId,
    });

    const listingId = await createListing({
      userId: memberUserId,
      action: 'sell',
      propertyType: 'house',
      title: 'Unaffiliated private draft after membership suspension',
      description: 'This draft proves stale profile affiliation cannot mint agency inventory.',
      pricing: { askingPrice: 1_900_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 160 },
      address: '10 Membership Authority Road',
      city: 'Johannesburg',
      suburb: 'Sandton',
      province: 'Gauteng',
      slug: `suspended-membership-${randomUUID().slice(0, 8)}`,
      media: [],
    } as any);
    created.listingIds.push(listingId);

    const [draft] = await db
      .select({
        agentId: listings.agentId,
        agencyId: listings.agencyId,
        status: listings.status,
      })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    expect(Number(draft.agentId)).toBe(agentId);
    expect(draft.agencyId).toBeNull();
    expect(draft.status).toBe('draft');

    const ownerCaller = applicationCaller({
      id: ownerUserId,
      role: 'agency_admin',
      agencyId,
    });
    const inventory = await ownerCaller.agency.getListingInventory();
    const visibleListingIds = inventory.listings.map((listing: { id: number }) => listing.id);
    expect(visibleListingIds).toContain(agencyOwnedListingId);
    expect(visibleListingIds).not.toContain(listingId);
    await expect(
      ownerCaller.agency.getListingDetail({ listingId: agencyOwnedListingId }),
    ).resolves.toMatchObject({ id: agencyOwnedListingId, agencyId });
    await expect(ownerCaller.agency.getListingDetail({ listingId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });
  });

  it('does not let a suspended member retain agency performance, commission, or daily-work access', async () => {
    const agencyId = await insertAgency('OperationalWorkspace');
    const ownerUserId = await insertUser('OperationalWorkspaceOwner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, ownerUserId));

    const memberUserId = await insertUser('OperationalWorkspaceMember', 'agent');
    await db.update(users).set({ agencyId, isSubaccount: 1 }).where(eq(users.id, memberUserId));
    const agentId = await insertAgentProfile(memberUserId, agencyId);
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });

    const listingId = await createListing({
      userId: memberUserId,
      action: 'sell',
      propertyType: 'house',
      title: 'Agency performance listing before membership suspension',
      description: 'This private inventory exercises agency operational workspace authority.',
      pricing: { askingPrice: 2_300_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 175 },
      address: '12 Operational Authority Road',
      city: 'Johannesburg',
      suburb: 'Sandton',
      province: 'Gauteng',
      slug: `operational-membership-${randomUUID().slice(0, 8)}`,
      media: [],
    } as any);
    created.listingIds.push(listingId);

    const memberCaller = applicationCaller({
      id: memberUserId,
      role: 'agent',
      agencyId,
    });
    await expect(memberCaller.agency.getListingPerformance({ listingId })).resolves.toMatchObject({
      listingId,
    });

    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'suspended' });

    // Suspension intentionally retains user/agent affiliation projections for
    // audit. Every private agency workspace must use the canonical membership
    // window instead of granting continuing access through those projections.
    const [retainedUser] = await db.select().from(users).where(eq(users.id, memberUserId)).limit(1);
    const [retainedProfile] = await db.select().from(agents).where(eq(agents.id, agentId)).limit(1);
    expect(retainedUser.agencyId).toBe(agencyId);
    expect(retainedProfile.agencyId).toBe(agencyId);

    await expect(memberCaller.agency.getListingPerformance({ listingId })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(memberCaller.agency.getListingPerformanceQueue()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(memberCaller.agency.getCommissionSettlements()).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
    await expect(memberCaller.agency.getMyDay({ limit: 1 })).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('does not let a suspended member retain Agent Home inventory, commission, or property-work authority', async () => {
    const agencyId = await insertAgency('AgentHomeWorkspace');
    const ownerUserId = await insertUser('AgentHomeWorkspaceOwner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, ownerUserId));

    const memberUserId = await insertUser('AgentHomeWorkspaceMember', 'agent');
    await db.update(users).set({ agencyId, isSubaccount: 1 }).where(eq(users.id, memberUserId));
    const agentId = await insertAgentProfile(memberUserId, agencyId);
    await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'active' });

    const [propertyInsert] = await db.insert(properties).values({
      title: 'Agent Home authority property',
      description: 'Private agency inventory used to prove current membership is required.',
      propertyType: 'house',
      listingType: 'sale',
      transactionType: 'sale',
      price: 2_650_000,
      bedrooms: 3,
      bathrooms: 2,
      area: 180,
      address: '27 Agent Home Authority Road',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'available',
      featured: 0,
      views: 0,
      enquiries: 0,
      ownerId: memberUserId,
      agentId,
    } as any);
    const propertyId = Number((propertyInsert as any).insertId);
    if (!propertyId) throw new Error('Expected Agent Home authority property');

    const scheduledAt = new Date();
    scheduledAt.setHours(12, 0, 0, 0);
    const [showingInsert] = await db.insert(showings).values({
      propertyId,
      agentId,
      scheduledAt: scheduledAt.toISOString().slice(0, 19).replace('T', ' '),
      status: 'confirmed',
      visitorName: 'Suspended member authority probe',
    } as any);
    const showingId = Number((showingInsert as any).insertId);

    const [commissionInsert] = await db.insert(commissions).values({
      agentId,
      propertyId,
      amount: 53_000,
      status: 'pending',
    } as any);
    const commissionId = Number((commissionInsert as any).insertId);

    try {
      const memberCaller = applicationCaller({
        id: memberUserId,
        role: 'agent',
        agencyId,
      });

      await expect(memberCaller.agent.getMyListings({ status: 'all' })).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: propertyId })]),
      );
      await expect(memberCaller.agent.getMyCommissions({ status: 'pending' })).resolves.toEqual(
        expect.arrayContaining([expect.objectContaining({ id: commissionId })]),
      );

      await maintainAgencyAgentMembership(db, { agencyId, agentId, status: 'suspended' });

      // Membership suspension deliberately retains these profile projections
      // for history. Agent Home must not treat them as present workspace authority.
      const [retainedUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, memberUserId))
        .limit(1);
      const [retainedProfile] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, agentId))
        .limit(1);
      expect(retainedUser.agencyId).toBe(agencyId);
      expect(retainedProfile.agencyId).toBe(agencyId);

      await expect(memberCaller.agent.getMyListings({ status: 'all' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      await expect(memberCaller.agent.getDashboardStats()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      await expect(memberCaller.agent.getShowingListingOptions()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
      await expect(
        memberCaller.agent.getMyCommissions({ status: 'pending' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(
        memberCaller.agent.exportCommissionsCSV({ status: 'pending' }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(
        memberCaller.agent.quickUpdateProperty({ propertyId, updates: { price: 2_700_000 } }),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(memberCaller.agent.archiveProperty({ id: propertyId })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });
    } finally {
      if (commissionId) await db.delete(commissions).where(eq(commissions.id, commissionId));
      if (showingId) await db.delete(showings).where(eq(showings.id, showingId));
      await db.delete(properties).where(eq(properties.id, propertyId));
    }
  });
});

describeWithDb('invitation acceptance (production path)', () => {
  it('requires a verified invitee before creating canonical agency membership', async () => {
    const agencyId = await insertAgency('Unverified invitee');
    const ownerUserId = await insertUser('UnverifiedOwner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, ownerUserId));

    const inviteeEmail = `unverified-joiner-${randomUUID().slice(0, 8)}@example.test`;
    const inviteeUserId = await insertUser('UnverifiedJoiner', 'visitor');
    await db
      .update(users)
      .set({ email: inviteeEmail, emailVerified: 0 })
      .where(eq(users.id, inviteeUserId));

    const invitationId = await insertPendingInvitation({
      agencyId,
      invitedBy: ownerUserId,
      email: inviteeEmail,
      role: 'agent',
    });
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);
    if (!invitation) throw new Error('Expected pending invitation');

    await expect(
      acceptanceCaller({
        id: inviteeUserId,
        role: 'visitor',
        agencyId: null,
        email: inviteeEmail,
      }).invitation.accept({ token: invitation.token }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    const [unchangedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, inviteeUserId))
      .limit(1);
    expect(unchangedUser).toMatchObject({
      role: 'visitor',
      agencyId: null,
      emailVerified: 0,
    });
    expect(await db.select().from(agents).where(eq(agents.userId, inviteeUserId))).toHaveLength(0);
    const [stillPending] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);
    expect(stillPending?.status).toBe('pending');
  });

  it('does not turn a queued pre-payment invitation into agency membership', async () => {
    const agencyId = await insertAgency('Queued pre-payment invitee');
    const ownerUserId = await insertUser('QueuedPrePaymentOwner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, ownerUserId));

    const inviteeEmail = `queued-joiner-${randomUUID().slice(0, 8)}@example.test`;
    const inviteeUserId = await insertUser('QueuedJoiner', 'visitor');
    await db.update(users).set({ email: inviteeEmail }).where(eq(users.id, inviteeUserId));
    const invitationId = await insertPendingInvitation({
      agencyId,
      invitedBy: ownerUserId,
      email: inviteeEmail,
      role: 'agent',
    });
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);
    if (!invitation) throw new Error('Expected queued invitation');

    await expect(
      acceptanceCaller({
        id: inviteeUserId,
        role: 'visitor',
        agencyId: null,
        email: inviteeEmail,
      }).invitation.accept({ token: invitation.token }),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    const [unchangedUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, inviteeUserId))
      .limit(1);
    expect(unchangedUser).toMatchObject({ role: 'visitor', agencyId: null, emailVerified: 1 });
    expect(await db.select().from(agents).where(eq(agents.userId, inviteeUserId))).toHaveLength(0);
    const [stillQueued] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.id, invitationId))
      .limit(1);
    expect(stillQueued?.status).toBe('pending');
  });

  it('accepting an agent invitation creates consistent identity, profile, and canonical membership', async () => {
    const agencyId = await insertAgency('Production');
    const ownerUserId = await insertUser('ProdOwner', 'agency_admin');
    await db.update(users).set({ agencyId }).where(eq(users.id, ownerUserId));
    await createActiveAgencyInvitationAccess(agencyId, ownerUserId);

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
    const [profile] = await db
      .select()
      .from(agents)
      .where(eq(agents.userId, inviteeUserId))
      .limit(1);
    expect(profile.status).toBe('approved');
    expect(Number(profile.agencyId)).toBe(agencyId);

    // Canonical membership row active with an open window.
    const membership = await db
      .select()
      .from(agencyAgentMemberships)
      .where(
        and(
          eq(agencyAgentMemberships.agencyId, agencyId),
          eq(agencyAgentMemberships.agentId, Number(profile.id)),
        ),
      )
      .limit(1);
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

    const listingId = await createListing({
      userId: inviteeUserId,
      action: 'sell',
      propertyType: 'house',
      title: 'Invited member canonical agency draft',
      description: 'An invited member can create a private draft through canonical membership.',
      pricing: { askingPrice: 2_100_000 },
      propertyDetails: { bedrooms: 3, bathrooms: 2, houseAreaM2: 180 },
      address: '11 Invitation Authority Road',
      city: 'Johannesburg',
      suburb: 'Sandton',
      province: 'Gauteng',
      slug: `invited-membership-${randomUUID().slice(0, 8)}`,
      media: [],
    } as any);
    created.listingIds.push(listingId);

    const [draft] = await db
      .select({ agencyId: listings.agencyId, agentId: listings.agentId })
      .from(listings)
      .where(eq(listings.id, listingId))
      .limit(1);
    expect(Number(draft.agencyId)).toBe(agencyId);
    expect(Number(draft.agentId)).toBe(Number(profile.id));
  });

  it('rejects principal conversion for an account carrying an agent identity with no partial writes', async () => {
    const targetAgencyId = await insertAgency('ConflationTarget');
    const ownerUserId = await insertUser('ConflOwner', 'agency_admin');
    await db.update(users).set({ agencyId: targetAgencyId }).where(eq(users.id, ownerUserId));
    await createActiveAgencyInvitationAccess(targetAgencyId, ownerUserId);

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
      profile: (await db.select().from(agents).where(eq(agents.id, originalProfileId)).limit(1))[0],
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
