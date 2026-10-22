import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, isNull, type SQL } from 'drizzle-orm';
import {
  agents,
  agencies,
  distributionAgentAccess,
  distributionAgentTiers,
  distributionBrandPartnerships,
  distributionDevelopmentAccess,
  distributionIdentities,
  distributionPrograms,
  users,
} from '../../drizzle/schema';

export type DistributionPartnerActor = {
  userId: number;
  role: string;
};

type DbExecutor = any;
type CandidateProgram = {
  programId: number;
  developmentId: number;
  tierAccessPolicy: string | null;
};
type ActorProgramGrant = {
  programId: number;
  developmentId: number;
  minTierRequired: string;
  accessStatus: string;
};

const TIER_RANK: Record<string, number> = {
  tier_1: 1,
  tier_2: 2,
  tier_3: 3,
  tier_4: 4,
};

function boolFromTinyInt(value: unknown) {
  return Number(value || 0) === 1;
}

async function hasActiveReferrerIdentity(db: DbExecutor, userId: number) {
  const [identity] = await db
    .select({ id: distributionIdentities.id })
    .from(distributionIdentities)
    .where(
      and(
        eq(distributionIdentities.userId, userId),
        eq(distributionIdentities.identityType, 'referrer'),
        eq(distributionIdentities.active, 1),
      ),
    )
    .limit(1);
  return Boolean(identity?.id);
}

async function hasApprovedAgentIdentity(db: DbExecutor, userId: number) {
  const [agent] = await db
    .select({ id: agents.id })
    .from(agents)
    .innerJoin(users, eq(users.id, agents.userId))
    .where(
      and(
        eq(agents.userId, userId),
        eq(agents.status, 'approved'),
        eq(users.role, 'agent'),
      ),
    )
    .limit(1);
  return Boolean(agent?.id);
}

async function hasVerifiedAgencyAdminIdentity(db: DbExecutor, userId: number) {
  const [agencyAdmin] = await db
    .select({ agencyId: agencies.id })
    .from(users)
    .innerJoin(agencies, eq(agencies.id, users.agencyId))
    .where(
      and(
        eq(users.id, userId),
        eq(users.role, 'agency_admin'),
        eq(agencies.isVerified, 1),
      ),
    )
    .limit(1);
  return Boolean(agencyAdmin?.agencyId);
}

export async function assertDistributionPartnerIdentity(
  db: DbExecutor,
  actor: DistributionPartnerActor,
) {
  if (actor.role === 'super_admin') return;
  if (!(await hasActiveReferrerIdentity(db, actor.userId))) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'An active Distribution partner identity is required.',
    });
  }

  if (actor.role === 'agent' && (await hasApprovedAgentIdentity(db, actor.userId))) return;
  if (actor.role === 'agency_admin' && (await hasVerifiedAgencyAdminIdentity(db, actor.userId))) return;
  if (actor.role === 'referrer' || actor.role === 'manager') return;

  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'An active Distribution partner identity is required.',
  });
}

async function listCandidatePrograms(
  db: DbExecutor,
  requestedDevelopmentIds?: number[],
): Promise<CandidateProgram[]> {
  if (requestedDevelopmentIds && requestedDevelopmentIds.length === 0) return [];

  const conditions = [
    eq(distributionPrograms.isActive, 1),
    eq(distributionDevelopmentAccess.status, 'included'),
    eq(distributionDevelopmentAccess.excludedByMandate, 0),
    eq(distributionDevelopmentAccess.excludedByExclusivity, 0),
    eq(distributionBrandPartnerships.status, 'active'),
  ];
  if (requestedDevelopmentIds?.length) {
    conditions.push(inArray(distributionPrograms.developmentId, requestedDevelopmentIds) as SQL);
  }

  const rows = await db
    .select({
      programId: distributionPrograms.id,
      developmentId: distributionPrograms.developmentId,
      tierAccessPolicy: distributionPrograms.tierAccessPolicy,
    })
    .from(distributionPrograms)
    .innerJoin(
      distributionDevelopmentAccess,
      eq(distributionDevelopmentAccess.developmentId, distributionPrograms.developmentId),
    )
    .innerJoin(
      distributionBrandPartnerships,
      eq(distributionBrandPartnerships.id, distributionDevelopmentAccess.brandPartnershipId),
    )
    .where(and(...conditions));

  return rows.map((row: any) => ({
    programId: Number(row.programId),
    developmentId: Number(row.developmentId),
    tierAccessPolicy: row.tierAccessPolicy ? String(row.tierAccessPolicy) : null,
  }));
}

async function getActorProgramGrants(
  db: DbExecutor,
  actor: DistributionPartnerActor,
  programIds: number[],
): Promise<Map<number, ActorProgramGrant>> {
  if (!programIds.length) return new Map();
  const rows = await db
    .select({
      programId: distributionAgentAccess.programId,
      developmentId: distributionAgentAccess.developmentId,
      minTierRequired: distributionAgentAccess.minTierRequired,
      accessStatus: distributionAgentAccess.accessStatus,
    })
    .from(distributionAgentAccess)
    .where(
      and(
        eq(distributionAgentAccess.agentId, actor.userId),
        inArray(distributionAgentAccess.programId, programIds),
      ),
    );

  return new Map(
    rows.map((row: any) => [Number(row.programId), {
      programId: Number(row.programId),
      developmentId: Number(row.developmentId),
      minTierRequired: String(row.minTierRequired || 'tier_1'),
      accessStatus: String(row.accessStatus || ''),
    }]),
  );
}

async function getCurrentTier(db: DbExecutor, userId: number) {
  const [row] = await db
    .select({ tier: distributionAgentTiers.tier })
    .from(distributionAgentTiers)
    .where(and(eq(distributionAgentTiers.agentId, userId), isNull(distributionAgentTiers.effectiveTo)))
    .orderBy(desc(distributionAgentTiers.id))
    .limit(1);
  return row?.tier ? String(row.tier) : null;
}

function grantMeetsTier(grant: ActorProgramGrant, currentTier: string | null) {
  const requiredRank = TIER_RANK[grant.minTierRequired];
  const currentRank = currentTier ? TIER_RANK[currentTier] : undefined;
  return requiredRank !== undefined && currentRank !== undefined && currentRank >= requiredRank;
}

function canAccessProgram(input: {
  actor: DistributionPartnerActor;
  candidate: CandidateProgram;
  grant: ActorProgramGrant | undefined;
  currentTier: string | null;
}) {
  const { actor, candidate, grant, currentTier } = input;

  // An explicit pause or revocation wins over an otherwise open program.
  if (grant && grant.accessStatus !== 'active') return false;

  if (candidate.tierAccessPolicy === 'open') {
    return true;
  }

  // Restricted and invite-only programs require a current user-specific grant.
  // Agency administrators must also receive their own grant; agency membership does not inherit
  // another user's opportunity access.
  if (!grant || grant.developmentId !== candidate.developmentId) return false;
  if (actor.role === 'agent') return grantMeetsTier(grant, currentTier);
  return true;
}

export async function listPartnerAccessibleDevelopmentIds(input: {
  db: DbExecutor;
  actor: DistributionPartnerActor;
  requestedDevelopmentIds?: number[];
}) {
  await assertDistributionPartnerIdentity(input.db, input.actor);
  const candidates = await listCandidatePrograms(input.db, input.requestedDevelopmentIds);
  if (!candidates.length) return [];

  const grants = await getActorProgramGrants(
    input.db,
    input.actor,
    candidates.map(candidate => candidate.programId),
  );
  const currentTier =
    input.actor.role === 'agent' && Array.from(grants.values()).some(grant => grant.accessStatus === 'active')
      ? await getCurrentTier(input.db, input.actor.userId)
      : null;

  return candidates
    .filter(candidate =>
      canAccessProgram({
        actor: input.actor,
        candidate,
        grant: grants.get(candidate.programId),
        currentTier,
      }),
    )
    .map(candidate => candidate.developmentId);
}

export async function assertPartnerDevelopmentProgramAccess(input: {
  db: DbExecutor;
  actor: DistributionPartnerActor;
  developmentId: number;
}) {
  const accessibleIds = await listPartnerAccessibleDevelopmentIds({
    db: input.db,
    actor: input.actor,
    requestedDevelopmentIds: [input.developmentId],
  });
  if (!accessibleIds.includes(input.developmentId)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have access to this Distribution opportunity.',
    });
  }
}

export async function assertPartnerDevelopmentReferralOpen(input: {
  db: DbExecutor;
  developmentId: number;
}) {
  const [program] = await input.db
    .select({
      isActive: distributionPrograms.isActive,
      isReferralEnabled: distributionPrograms.isReferralEnabled,
      accessStatus: distributionDevelopmentAccess.status,
      submissionAllowed: distributionDevelopmentAccess.submissionAllowed,
      excludedByMandate: distributionDevelopmentAccess.excludedByMandate,
      excludedByExclusivity: distributionDevelopmentAccess.excludedByExclusivity,
      partnershipStatus: distributionBrandPartnerships.status,
    })
    .from(distributionPrograms)
    .innerJoin(
      distributionDevelopmentAccess,
      eq(distributionDevelopmentAccess.developmentId, distributionPrograms.developmentId),
    )
    .innerJoin(
      distributionBrandPartnerships,
      eq(distributionBrandPartnerships.id, distributionDevelopmentAccess.brandPartnershipId),
    )
    .where(eq(distributionPrograms.developmentId, input.developmentId))
    .limit(1);

  if (
    !program ||
    !boolFromTinyInt(program.isActive) ||
    !boolFromTinyInt(program.isReferralEnabled) ||
    !boolFromTinyInt(program.submissionAllowed) ||
    program.accessStatus !== 'included' ||
    boolFromTinyInt(program.excludedByMandate) ||
    boolFromTinyInt(program.excludedByExclusivity) ||
    program.partnershipStatus !== 'active'
  ) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This Distribution opportunity is not currently open for referrals.',
    });
  }
}

