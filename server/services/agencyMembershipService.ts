import { and, eq, sql } from 'drizzle-orm';
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
          effectiveFrom: sql`IF(${agencyAgentMemberships.effectiveFrom} IS NOT NULL AND (${agencyAgentMemberships.effectiveTo} IS NULL OR ${agencyAgentMemberships.effectiveTo} > ${nowTs}), ${agencyAgentMemberships.effectiveFrom}, ${nowTs})`,
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
