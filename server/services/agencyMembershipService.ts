import { and, eq } from 'drizzle-orm';
import { agencyAgentMemberships } from '../../drizzle/schema';

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

/**
 * Whether an existing membership row's effective window is open at the given
 * time: it has started and not ended.
 */
export function hasWindowOpenForStatus(
  membership: { effectiveFrom: string | Date | null; effectiveTo: string | Date | null },
  now: Date,
): boolean {
  const from = membership.effectiveFrom ? new Date(membership.effectiveFrom) : null;
  if (!from || Number.isNaN(from.getTime()) || from.getTime() > now.getTime()) return false;
  const to = membership.effectiveTo ? new Date(membership.effectiveTo) : null;
  return !to || Number.isNaN(to.getTime()) || to.getTime() > now.getTime();
}

/**
 * Pure transition for maintaining a membership row. Returns only the fields
 * that must change; omitted keys mean "leave as is".
 */
export function maintainMembershipUpdateSet(
  existing: { status: string; effectiveFrom: string | Date | null; effectiveTo: string | Date | null },
  nextStatus: AgencyMembershipLifecycleStatus,
  now: Date,
): Partial<typeof agencyAgentMemberships.$inferInsert> & { status: AgencyMembershipLifecycleStatus } {
  const updateSet: Partial<typeof agencyAgentMemberships.$inferInsert> & {
    status: AgencyMembershipLifecycleStatus;
  } = { status: nextStatus };

  if (nextStatus === 'active') {
    // Re-opening a membership starts a fresh effective window unless one is
    // already open.
    if (!hasWindowOpenForStatus(existing, now)) updateSet.effectiveFrom = toDbTimestamp(now);
    if (existing.effectiveTo !== null) updateSet.effectiveTo = null;
  } else if (existing.effectiveTo === null) {
    // Closing the window keeps historical rows auditable and immediately
    // removes public/eligibility visibility regardless of cached reads.
    updateSet.effectiveTo = toDbTimestamp(now);
  }

  return updateSet;
}

/**
 * Maintain the authoritative membership row for an agency↔agent pair so the
 * platform invariant holds: an approved agent profile affiliated to an agency
 * always has a matching membership row whose lifecycle status mirrors that
 * affiliation. Safe against repeat calls via the unique (agencyId, agentId)
 * pair; accepts a transaction handle so membership truth is written in the
 * same transaction as the user/profile changes that imply it.
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
  const now = new Date();
  const [existing] = await db
    .select()
    .from(agencyAgentMemberships)
    .where(
      and(
        eq(agencyAgentMemberships.agencyId, input.agencyId),
        eq(agencyAgentMemberships.agentId, input.agentId),
      ),
    )
    .limit(1);

  if (!existing) {
    await db.insert(agencyAgentMemberships).values({
      agencyId: input.agencyId,
      agentId: input.agentId,
      status: input.status,
      role: input.role ?? 'agent',
      governanceMode: 'affiliated',
      effectiveFrom: input.status === 'active' ? toDbTimestamp(now) : null,
      effectiveTo: input.status === 'active' ? null : toDbTimestamp(now),
      createdBy: input.actorUserId ?? null,
      updatedBy: input.actorUserId ?? null,
    });
    return;
  }

  await db
    .update(agencyAgentMemberships)
    .set(maintainMembershipUpdateSet(existing, input.status, now))
    .where(eq(agencyAgentMemberships.id, existing.id));
}
