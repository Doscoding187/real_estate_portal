import { and, eq, inArray, ne } from 'drizzle-orm';

import { agencyAgentMemberships, agents, users } from '../../drizzle/schema';
import { getDb } from '../db';

export type AgencyMembershipDb = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export type CanonicalMembershipRole = 'agent' | 'team_lead' | 'manager';

export interface EstablishCanonicalAgencyMembershipInput {
  db: AgencyMembershipDb;
  agencyId: number;
  agentId: number;
  actorUserId: number;
  role?: CanonicalMembershipRole;
}

export interface EndCanonicalAgencyMembershipInput {
  db: AgencyMembershipDb;
  agencyId: number;
  agentId: number;
  terminalStatus: 'suspended' | 'left';
  actorUserId: number;
}

export async function establishCanonicalAgencyMembership(
  input: EstablishCanonicalAgencyMembershipInput,
): Promise<{ state: 'created' | 'reactivated' }> {
  const { db, agencyId, agentId, actorUserId } = input;
  const role = input.role ?? 'agent';
  const now = new Date();

  await closeCompetingCanonicalMemberships({ db, agentId, keepAgencyId: agencyId, actorUserId });

  const [existing] = await db
    .select()
    .from(agencyAgentMemberships)
    .where(
      and(
        eq(agencyAgentMemberships.agencyId, agencyId),
        eq(agencyAgentMemberships.agentId, agentId),
      ),
    )
    .limit(1);

  if (existing) {
    const effectiveFrom = existing.effectiveFrom ? new Date(existing.effectiveFrom) : now;
    await db
      .update(agencyAgentMemberships)
      .set({
        status: 'active',
        governanceMode: existing.governanceMode ?? 'affiliated',
        role: existing.role ?? role,
        permissionsOverrides: existing.permissionsOverrides ?? null,
        effectiveFrom,
        effectiveTo: null,
        updatedBy: actorUserId,
        updatedAt: now,
      })
      .where(eq(agencyAgentMemberships.id, existing.id));
    return { state: 'reactivated' };
  }

  await db.insert(agencyAgentMemberships).values({
    agencyId,
    agentId,
    status: 'active',
    governanceMode: 'affiliated',
    role,
    effectiveFrom: now,
    createdBy: actorUserId,
    updatedBy: actorUserId,
  });
  return { state: 'created' };
}

export async function endCanonicalAgencyMembership(input: EndCanonicalAgencyMembershipInput): Promise<boolean> {
  const { db, agencyId, agentId, terminalStatus, actorUserId } = input;
  const now = new Date();

  const result = await db
    .update(agencyAgentMemberships)
    .set({
      status: terminalStatus,
      effectiveTo: now,
      updatedBy: actorUserId,
      updatedAt: now,
    })
    .where(
      and(
        eq(agencyAgentMemberships.agencyId, agencyId),
        eq(agencyAgentMemberships.agentId, agentId),
        inArray(agencyAgentMemberships.status, ['invited', 'active']),
      ),
    );

  return Array.isArray(result) ? result.length > 0 : true;
}

export async function closeCompetingCanonicalMemberships(input: {
  db: AgencyMembershipDb;
  agentId: number;
  keepAgencyId: number;
  actorUserId: number;
}): Promise<void> {
  await input.db
    .update(agencyAgentMemberships)
    .set({
      status: 'left',
      effectiveTo: new Date(),
      updatedBy: input.actorUserId,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(agencyAgentMemberships.agentId, input.agentId),
        ne(agencyAgentMemberships.agencyId, input.keepAgencyId),
        inArray(agencyAgentMemberships.status, ['invited', 'active']),
      ),
    );
}

function getNameParts(user: typeof users.$inferSelect, fallbackEmail: string) {
  const fromName = String(user.name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const emailStem = fallbackEmail.split('@')[0]?.replace(/[._-]+/g, ' ') || 'Agency agent';
  const fromEmail = emailStem.split(/\s+/).filter(Boolean);
  const parts = [String(user.firstName || '').trim(), String(user.lastName || '').trim()].filter(
    Boolean,
  );

  if (parts.length >= 2) {
    return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
  }

  const source = fromName.length >= 2 ? fromName : fromEmail;
  return {
    firstName: parts[0] || source[0] || 'Agency',
    lastName: parts[1] || source.slice(1).join(' ') || 'Agent',
  };
}

export async function ensureApprovedAgencyAgentProfile(input: {
  db: AgencyMembershipDb;
  user: typeof users.$inferSelect;
  agencyId: number;
  actorUserId: number;
}): Promise<number> {
  const { db, user, agencyId, actorUserId } = input;
  const [existingAgent] = await db
    .select()
    .from(agents)
    .where(eq(agents.userId, user.id))
    .limit(1);

  if (existingAgent) {
    if (existingAgent.agencyId !== agencyId || existingAgent.status !== 'approved') {
      await db
        .update(agents)
        .set({
          agencyId,
          status: 'approved',
          approvedBy: actorUserId,
          approvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(agents.id, existingAgent.id));
    }
    return existingAgent.id;
  }

  const { firstName, lastName } = getNameParts(user, user.email || 'agent@example.com');
  const displayName =
    String(user.name || '').trim() || [firstName, lastName].filter(Boolean).join(' ').trim();

  const [result] = await db.insert(agents).values({
    userId: user.id,
    agencyId,
    firstName,
    lastName,
    displayName,
    email: user.email,
    phone: user.phone,
    role: 'agent',
    isVerified: 0,
    isFeatured: 0,
    status: 'approved',
    approvedBy: actorUserId,
    approvedAt: new Date(),
    profileCompletionScore: 35,
  });

  return Number(result.insertId || 0);
}
