import { randomUUID } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import express from 'express';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { and, eq, inArray } from 'drizzle-orm';

// The HTTP acceptance path imports auth before hooks run. CI does not supply a
// JWT secret, so provide a deterministic test-only value before that module
// graph is evaluated.
const priorJwtSecret = vi.hoisted(() => {
  const prior = process.env.JWT_SECRET;
  if (!prior) process.env.JWT_SECRET = 'agency-member-workspace-authority-test-secret';
  return prior;
});

import { COOKIE_NAME } from '../../shared/const';
import {
  agencies,
  agencyBranding,
  agents,
  billableAccounts,
  invitations,
  plans,
  subscriptions,
  users,
} from '../../drizzle/schema';
import { authService } from '../_core/auth';
import { db } from '../db';
import { appRouter } from '../routers';
import agentOnboardingRouter from '../routes/agentOnboarding';
import { agentOnboardingService } from '../services/agentOnboardingService';
import {
  endCanonicalAgencyMembership,
  establishCanonicalAgencyMembership,
} from '../services/agencyMembershipService';

const describeWithDb: typeof describe = process.env.DATABASE_URL
  ? describe
  : (((name: string, fn: Parameters<typeof describe>[1]) =>
      describe.skip(`${name} (requires DATABASE_URL disposable DB)`, fn)) as typeof describe);

type OnboardingStatus = {
  fullFeaturesUnlocked: boolean;
  recommendedNextStep: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  commercial: {
    ownerType: string;
    ownerId: number;
    ownerSource: string;
  };
  profile: { id: number; agencyId: number | null } | null;
  entitlements: {
    canReceiveLeads: boolean;
    canAccessExistingLeads: boolean;
  };
};

const created = {
  agencyIds: [] as number[],
  userIds: [] as number[],
  agentIds: [] as number[],
};

let server: Server | null = null;
let baseUrl = '';

function idOf(result: any): number {
  return Number(result?.insertId ?? result?.[0]?.insertId ?? 0);
}

function dbTimestamp(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}

function trpcCaller(user: { id: number; role: string; agencyId?: number | null; email?: string }) {
  return appRouter.createCaller({
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
  const agencyId = idOf(result);
  if (!agencyId) throw new Error('Could not create agency fixture.');
  created.agencyIds.push(agencyId);
  return agencyId;
}

async function insertUser(input: {
  label: string;
  role: 'visitor' | 'agent' | 'agency_admin';
  agencyId?: number | null;
}) {
  const suffix = `${Date.now()}-${randomUUID().slice(0, 8)}`;
  const email = `${input.label}-${suffix}@example.test`;
  const [result] = await db.insert(users).values({
    email,
    name: input.label,
    phone: '+27115550123',
    role: input.role,
    agencyId: input.agencyId ?? null,
    isSubaccount: input.agencyId ? 1 : 0,
    emailVerified: 1,
    sessionVersion: 1,
  } as any);
  const userId = idOf(result);
  if (!userId) throw new Error('Could not create user fixture.');
  created.userIds.push(userId);
  return { userId, email };
}

async function createActiveAgencyLaunchAccess(agencyId: number, actorUserId: number) {
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
  const accountId = idOf(accountResult);
  if (!accountId) throw new Error('Could not create agency billable-account fixture.');

  const now = new Date();
  await db.insert(subscriptions).values({
    ownerType: 'agency',
    ownerId: agencyId,
    billableAccountId: accountId,
    planId: plan.id,
    status: 'active',
    currentPeriodStart: dbTimestamp(now),
    currentPeriodEnd: dbTimestamp(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)),
    cancelAtPeriodEnd: 0,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  } as any);
  return Number(plan.id);
}

async function onboardingStatus(userId: number): Promise<OnboardingStatus> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user?.email) throw new Error('Missing user fixture for onboarding request.');
  const token = await authService.createSessionToken(
    Number(user.id),
    user.email,
    user.name || user.email,
    Number(user.sessionVersion),
  );
  const response = await fetch(`${baseUrl}/api/agent/onboarding-status`, {
    headers: { cookie: `${COOKIE_NAME}=${token}` },
  });
  expect(response.status).toBe(200);
  return (await response.json()) as OnboardingStatus;
}

async function cleanup() {
  const agencyIds = [...new Set(created.agencyIds)];
  const userIds = [...new Set(created.userIds)];
  const agentIds = [...new Set(created.agentIds)];

  if (agencyIds.length) {
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.ownerType, 'agency'), inArray(subscriptions.ownerId, agencyIds)));
  }
  if (userIds.length) {
    await db
      .delete(subscriptions)
      .where(and(eq(subscriptions.ownerType, 'agent'), inArray(subscriptions.ownerId, userIds)));
  }
  if (agencyIds.length) {
    await db.delete(billableAccounts).where(inArray(billableAccounts.agencyId, agencyIds));
  }
  if (userIds.length) {
    await db.delete(billableAccounts).where(inArray(billableAccounts.userId, userIds));
  }
  if (agencyIds.length) {
    await db.delete(invitations).where(inArray(invitations.agencyId, agencyIds));
  }
  if (agentIds.length) {
    await db.delete(agents).where(inArray(agents.id, agentIds));
  }
  if (userIds.length) {
    await db.delete(users).where(inArray(users.id, userIds));
  }
  if (agencyIds.length) {
    await db.delete(agencies).where(inArray(agencies.id, agencyIds));
  }
}

beforeAll(async () => {
  if (!process.env.DATABASE_URL) return;
  const app = express();
  app.use('/api/agent', agentOnboardingRouter);
  server = createServer(app);
  await new Promise<void>(resolve => server!.listen(0, '127.0.0.1', resolve));
  const address = server!.address();
  if (!address || typeof address === 'string')
    throw new Error('Test server did not expose a port.');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) =>
      server!.close(error => (error ? reject(error) : resolve())),
    );
  }
  if (process.env.DATABASE_URL) await cleanup();
  if (priorJwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = priorJwtSecret;
});

describeWithDb('agency member workspace authority', () => {
  it('inherits the current agency workspace through canonical membership and never opens individual billing', async () => {
    const agencyId = await insertAgency('Workspace Authority');
    const owner = await insertUser({
      label: 'WorkspaceOwner',
      role: 'agency_admin',
      agencyId,
    });
    await createActiveAgencyLaunchAccess(agencyId, owner.userId);
    await db.insert(agencyBranding).values({
      agencyId,
      companyName: 'Workspace Authority Agency',
      primaryColor: '#0f766e',
      secondaryColor: '#334155',
      isEnabled: 1,
    } as any);

    const member = await insertUser({ label: 'InvitedWorkspaceMember', role: 'visitor' });
    const invitationToken = `workspace-authority-${randomUUID()}`;
    await db.insert(invitations).values({
      agencyId,
      invitedBy: owner.userId,
      email: member.email,
      role: 'agent',
      token: invitationToken,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    } as any);

    // The production invitation mutation establishes the membership; the
    // later status assertion uses the mounted HTTP route and signed session.
    await expect(
      trpcCaller({ id: member.userId, role: 'visitor', email: member.email }).invitation.accept({
        token: invitationToken,
      }),
    ).resolves.toEqual({ success: true });

    const [memberAgent] = await db
      .select()
      .from(agents)
      .where(eq(agents.userId, member.userId))
      .limit(1);
    if (!memberAgent) throw new Error('Invitation acceptance did not create an agent profile.');
    created.agentIds.push(Number(memberAgent.id));

    // Complete professional setup through the application service. The agent
    // has no optional verification badge and no individual subscription.
    await agentOnboardingService.saveProfile(member.userId, {
      displayName: 'Invited Workspace Member',
      phone: '+27115550123',
      bio: 'A complete professional profile for agency workspace acceptance.',
      profileImage: 'https://example.test/member.jpg',
      areasServed: ['Sandton'],
      focus: 'sales',
      propertyTypes: ['house'],
    });

    const active = await onboardingStatus(member.userId);
    expect(active.commercial).toMatchObject({
      ownerType: 'agency',
      ownerId: agencyId,
      ownerSource: 'agency_membership',
    });
    expect(active.subscriptionTier).toBe('agency_launch_access');
    expect(active.subscriptionStatus).toBe('active');
    expect(active.fullFeaturesUnlocked).toBe(true);
    expect(active.recommendedNextStep).toBe('dashboard');
    expect(active.entitlements.canReceiveLeads).toBe(true);
    expect(active.entitlements.canAccessExistingLeads).toBe(true);
    expect(active.profile?.agencyId).toBe(agencyId);

    // A paid fixed term ends for both the agency owner and the member. The
    // member must not retain inherited commercial capability simply because
    // the stored subscription status was previously `active`.
    await db
      .update(subscriptions)
      .set({ currentPeriodEnd: dbTimestamp(new Date(Date.now() - 60_000)) })
      .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)));
    const expired = await onboardingStatus(member.userId);
    expect(expired.commercial).toMatchObject({
      ownerType: 'agency',
      ownerId: agencyId,
      ownerSource: 'agency_membership',
    });
    expect(expired.subscriptionStatus).toBe('expired');
    expect(expired.fullFeaturesUnlocked).toBe(false);
    expect(expired.recommendedNextStep).toBe('await_agency_activation');
    expect(expired.entitlements.canReceiveLeads).toBe(false);
    expect(expired.entitlements.canAccessExistingLeads).toBe(true);

    const ownerAfterExpiry = await trpcCaller({
      id: owner.userId,
      role: 'agency_admin',
      agencyId,
      email: owner.email,
    }).agency.getOnboardingStatus();
    expect(ownerAfterExpiry).toMatchObject({
      billingActivated: false,
      recommendedNextStep: 'renew_launch_access',
      accessState: {
        billingStatus: 'expired',
        workspaceAccess: { publishing: false, reporting: false },
      },
    });

    const [persistedExpiry] = await db
      .select({ status: subscriptions.status })
      .from(subscriptions)
      .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)))
      .limit(1);
    expect(persistedExpiry?.status).toBe('expired');

    // Restore the fixture only. This is not a payment or entitlement
    // activation path; the normal runtime remains preparation-only.
    await db
      .update(subscriptions)
      .set({
        status: 'active',
        currentPeriodEnd: dbTimestamp(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
      })
      .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)));

    // The authoritative agency subscription is sufficient: the member did
    // not receive an individual billable account or a second subscription.
    const individualAccounts = await db
      .select({ id: billableAccounts.id })
      .from(billableAccounts)
      .where(eq(billableAccounts.userId, member.userId));
    expect(individualAccounts).toEqual([]);
    await expect(
      trpcCaller({
        id: member.userId,
        role: 'agent',
        agencyId,
        email: member.email,
      }).billing.agentWorkspace(),
    ).rejects.toMatchObject({ code: 'PRECONDITION_FAILED' });

    // An agency payment/invoice state remains owned by the agency and must
    // not point the member to the individual payment route.
    await db
      .update(subscriptions)
      .set({ status: 'pending_payment' })
      .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)));
    const pending = await onboardingStatus(member.userId);
    expect(pending.commercial).toMatchObject({
      ownerType: 'agency',
      ownerId: agencyId,
      ownerSource: 'agency_membership',
    });
    expect(pending.subscriptionStatus).toBe('pending_payment');
    expect(pending.fullFeaturesUnlocked).toBe(false);
    expect(pending.recommendedNextStep).toBe('await_agency_activation');
    expect(pending.entitlements.canReceiveLeads).toBe(false);
    expect(pending.entitlements.canAccessExistingLeads).toBe(true);

    await db
      .update(subscriptions)
      .set({ status: 'active' })
      .where(and(eq(subscriptions.ownerType, 'agency'), eq(subscriptions.ownerId, agencyId)));

    // Membership suspension changes workspace authority even though legacy
    // user/profile agency claims remain. Reinstatement restores only the
    // canonical agency projection.
    await endCanonicalAgencyMembership({
      db,
      agencyId,
      agentId: Number(memberAgent.id),
      terminalStatus: 'suspended',
      actorUserId: owner.userId,
    });
    const suspended = await onboardingStatus(member.userId);
    expect(suspended.commercial).toMatchObject({
      ownerType: 'agent',
      ownerId: member.userId,
      ownerSource: 'individual_agent',
    });
    expect(suspended.subscriptionStatus).toBe('unassigned');
    expect(suspended.fullFeaturesUnlocked).toBe(false);
    expect(suspended.recommendedNextStep).toBe('select_package');
    expect(suspended.entitlements.canReceiveLeads).toBe(false);
    expect(suspended.entitlements.canAccessExistingLeads).toBe(false);
    expect(suspended.profile?.agencyId).toBeNull();

    await establishCanonicalAgencyMembership({
      db,
      agencyId,
      agentId: Number(memberAgent.id),
      actorUserId: owner.userId,
    });
    const restored = await onboardingStatus(member.userId);
    expect(restored.commercial).toMatchObject({
      ownerType: 'agency',
      ownerId: agencyId,
      ownerSource: 'agency_membership',
    });
    expect(restored.fullFeaturesUnlocked).toBe(true);
    expect(restored.entitlements.canReceiveLeads).toBe(true);
    expect(restored.entitlements.canAccessExistingLeads).toBe(true);

    // A separate agent holding stale user/profile agency IDs has no
    // canonical membership and cannot project the agency's workspace.
    const unrelated = await insertUser({
      label: 'UnrelatedStaleClaim',
      role: 'agent',
      agencyId,
    });
    const [unrelatedAgentResult] = await db.insert(agents).values({
      userId: unrelated.userId,
      agencyId,
      firstName: 'Unrelated',
      lastName: 'Claimant',
      displayName: 'Unrelated Claimant',
      email: unrelated.email,
      phone: '+27115550999',
      role: 'agent',
      status: 'approved',
      approvedBy: owner.userId,
      approvedAt: new Date(),
      isVerified: 0,
      isFeatured: 0,
      bio: 'Stale affiliation must not become commercial authority.',
      profileImage: 'https://example.test/unrelated.jpg',
      areasServed: 'Sandton',
      focus: 'sales',
      propertyTypes: 'house',
    } as any);
    created.agentIds.push(idOf(unrelatedAgentResult));

    const unrelatedStatus = await onboardingStatus(unrelated.userId);
    expect(unrelatedStatus.commercial).toMatchObject({
      ownerType: 'agent',
      ownerId: unrelated.userId,
      ownerSource: 'individual_agent',
    });
    expect(unrelatedStatus.subscriptionStatus).toBe('unassigned');
    expect(unrelatedStatus.entitlements.canReceiveLeads).toBe(false);
    expect(unrelatedStatus.entitlements.canAccessExistingLeads).toBe(false);
    expect(unrelatedStatus.profile?.agencyId).toBeNull();
  });
});
