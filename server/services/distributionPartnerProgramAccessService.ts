import { TRPCError } from '@trpc/server';
import { and, eq, inArray, type SQL } from 'drizzle-orm';
import {
  distributionBrandPartnerships,
  distributionDevelopmentAccess,
  distributionIdentities,
  distributionPrograms,
} from '../../drizzle/schema';

export type DistributionPartnerActor = {
  userId: number;
  role: string;
};

type DbExecutor = any;
type CandidateProgram = {
  programId: number;
  developmentId: number;
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

async function assertPartnerIdentity(db: DbExecutor, actor: DistributionPartnerActor) {
  if (actor.role === 'super_admin') return;
  if (!(await hasActiveReferrerIdentity(db, actor.userId))) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'An active Distribution partner identity is required.',
    });
  }
}

/**
 * A candidate opportunity is an active, referral-enabled program whose
 * development is included in an active brand partnership. Availability is a
 * property of the published opportunity, not of a per-referrer approval:
 * Property Listify has retired individual opportunity access grants, so every
 * active referrer identity may act on every open program.
 */
async function listCandidatePrograms(
  db: DbExecutor,
  requestedDevelopmentIds?: number[],
): Promise<CandidateProgram[]> {
  if (requestedDevelopmentIds && requestedDevelopmentIds.length === 0) return [];

  const conditions = [
    eq(distributionPrograms.isActive, 1),
    eq(distributionPrograms.isReferralEnabled, 1),
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
  }));
}

export async function listPartnerAccessibleDevelopmentIds(input: {
  db: DbExecutor;
  actor: DistributionPartnerActor;
  requestedDevelopmentIds?: number[];
}) {
  await assertPartnerIdentity(input.db, input.actor);
  const candidates = await listCandidatePrograms(input.db, input.requestedDevelopmentIds);
  return [...new Set(candidates.map(candidate => candidate.developmentId))];
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
      message: 'This Distribution opportunity is not part of the active referral network.',
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
