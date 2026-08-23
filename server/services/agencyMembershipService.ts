import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { agencyAgentMemberships, agents, users } from '../../drizzle/schema';
import { getDb } from '../db';

export type AgencyMembershipRow = typeof agencyAgentMemberships.$inferSelect;

export type AgencyMembershipLifecycleStatus = 'active' | 'suspended' | 'left';

type DatabaseHandle = {
  select: (fields?: unknown) => any;
  insert: (table: unknown) => any;
  update: (table: unknown) => any;
};

/**
 * Canonical current-membership semantics for agency↔agent affiliation:
 * a membership is current only while it is `active` and its half-open
 * effective window `[effectiveFrom, effectiveTo)` contains the evaluated
 * time. This predicate is the single authority; discovery eligibility and
 * public web presence must not fork private copies of it.
 */
export function isCurrentActiveAgencyMembership(
  membership: {
    status: AgencyMembershipRow['status'] | string | null | undefined;
    effectiveFrom: string | Date | null | undefined;
    effectiveTo: string | Date | null | undefined;
  },
  evaluatedAt: Date = new Date(),
): boolean {
  if (membership.status !== 'active') return false;

  const now = evaluatedAt.getTime();
  const effectiveFrom = membership.effectiveFrom
    ? new Date(membership.effectiveFrom).getTime()
    : null;
  const effectiveTo = membership.effectiveTo ? new Date(membership.effectiveTo).getTime() : null;

  return (
    (effectiveFrom === null || (Number.isFinite(effectiveFrom) && effectiveFrom <= now)) &&
    (effectiveTo === null || (Number.isFinite(effectiveTo) && effectiveTo > now))
  );
}

export async function listCurrentAgencyMembershipsForAgent(
  db: DatabaseHandle,
  agentId: number,
  evaluatedAt: Date = new Date(),
): Promise<AgencyMembershipRow[]> {
  const rows = await db
    .select()
    .from(agencyAgentMemberships)
    .where(eq(agencyAgentMemberships.agentId, agentId));

  return rows.filter(row => isCurrentActiveAgencyMembership(row, evaluatedAt));
}

function toDbTimestamp(value: Date): string {
  return value.toISOString().slice(0, 19).replace('T', ' ');
}


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


/**
 * Maintain the authoritative membership row for an agency↔agent pair.
 *
 * Concurrency authority: the table's unique (agencyId, agentId) pair is the
 * arbiter. Maintenance is a single atomic INSERT … ON DUPLICATE KEY UPDATE
 * against that constraint, so repeated or racing calls converge on exactly
 * one canonical row instead of a second caller failing after losing an
 * exists-check race. Window semantics are evaluated by MySQL against the
 * row's current values inside the same statement:
 *
 * - activating: keep an already-open window, otherwise start a fresh one,
 *   and always clear any close date;
 * - suspending/leaving: keep the original start and stamp the close date
 *   only when it is not already set (first closure wins).
 *
 * Accepts a transaction handle so membership truth is written in the same
 * transaction as the user/profile changes that imply it.
 */
export async function maintainAgencyAgentMembership(
  db: DatabaseHandle,
  input: {
    agencyId: number;
    agentId: number;
    status: AgencyMembershipLifecycleStatus;
    role?: 'agent' | 'team_lead' | 'manager';
    actorUserId?: number | null;
  },
): Promise<void> {
  const nowTs = toDbTimestamp(new Date());

  const insertValues: typeof agencyAgentMemberships.$inferInsert = {
    agencyId: input.agencyId,
    agentId: input.agentId,
    status: input.status,
    role: input.role ?? 'agent',
    governanceMode: 'affiliated',
    effectiveFrom: input.status === 'active' ? nowTs : null,
    effectiveTo: input.status === 'active' ? null : nowTs,
    createdBy: input.actorUserId ?? null,
    updatedBy: input.actorUserId ?? null,
  };

  const duplicateSet =
    input.status === 'active'
      ? {
          status: input.status as AgencyMembershipLifecycleStatus,
          updatedBy: input.actorUserId ?? null,
          // Reactivation preserves the original tenure start when present
          // (matching main's established semantics) and always clears any
          // prior closure.
          effectiveFrom: sql`COALESCE(${agencyAgentMemberships.effectiveFrom}, ${nowTs})`,
          effectiveTo: sql`NULL`,
        }
      : {
          status: input.status as AgencyMembershipLifecycleStatus,
          updatedBy: input.actorUserId ?? null,
          effectiveTo: sql`COALESCE(${agencyAgentMemberships.effectiveTo}, ${nowTs})`,
        };

  await db
    .insert(agencyAgentMemberships)
    .values(insertValues)
    .onDuplicateKeyUpdate({ set: duplicateSet });
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

/**
 * Establish an active canonical affiliation for an agent, closing any
 * competing open memberships in other agencies first (single-affiliation
 * invariant), then delegating to the atomic unique-pair maintenance.
 */
export async function establishCanonicalAgencyMembership(
  input: EstablishCanonicalAgencyMembershipInput & { status?: AgencyMembershipLifecycleStatus },
): Promise<{ state: 'created' | 'reactivated' | 'maintained' }> {
  const role = input.role ?? 'agent';
  await closeCompetingCanonicalMemberships({
    db: input.db,
    agentId: input.agentId,
    keepAgencyId: input.agencyId,
    actorUserId: input.actorUserId,
  });

  const [existing] = await input.db
    .select({ id: agencyAgentMemberships.id })
    .from(agencyAgentMemberships)
    .where(
      and(
        eq(agencyAgentMemberships.agencyId, input.agencyId),
        eq(agencyAgentMemberships.agentId, input.agentId),
      ),
    )
    .limit(1);

  await maintainAgencyAgentMembership(input.db, {
    agencyId: input.agencyId,
    agentId: input.agentId,
    status: 'active',
    role,
    actorUserId: input.actorUserId,
  });

  return { state: existing ? 'reactivated' : 'created' };
}


export async function endCanonicalAgencyMembership(input: EndCanonicalAgencyMembershipInput): Promise<boolean> {
  await maintainAgencyAgentMembership(input.db, {
    agencyId: input.agencyId,
    agentId: input.agentId,
    status: input.terminalStatus,
    actorUserId: input.actorUserId,
  });
  return true;
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
    // Approved affiliation implies a maintained canonical membership row.
    await maintainAgencyAgentMembership(db as DatabaseHandle, {
      agencyId,
      agentId: existingAgent.id,
      status: 'active',
      actorUserId,
    });
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

  const agentId = Number(result.insertId || 0);
  if (agentId) {
    // Approved affiliation implies a maintained canonical membership row.
    await maintainAgencyAgentMembership(db as DatabaseHandle, {
      agencyId,
      agentId,
      status: 'active',
      actorUserId,
    });
  }
  return agentId;
}
