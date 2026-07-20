import { and, eq, sql } from 'drizzle-orm';
import {
  distributionAgentAccess,
  distributionIdentities,
  distributionPrograms,
} from '../../drizzle/schema';
import type { getDb } from '../db';

export type DevelopmentHomeDistribution = {
  status: 'enabled' | 'disabled' | 'not_configured';
  eligiblePartnerCount: number | null;
  manageHref: null;
};

type DistributionProgramRow = {
  id: number;
  isActive: number;
  isReferralEnabled: number;
};

type DbExecutor = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export function deriveDevelopmentHomeDistribution(
  program: DistributionProgramRow | null,
  eligiblePartnerCount: number | null = null,
): DevelopmentHomeDistribution {
  if (!program) {
    return { status: 'not_configured', eligiblePartnerCount: null, manageHref: null };
  }
  if (Number(program.isActive) !== 1 || Number(program.isReferralEnabled) !== 1) {
    return { status: 'disabled', eligiblePartnerCount: null, manageHref: null };
  }
  return {
    status: 'enabled',
    eligiblePartnerCount,
    manageHref: null,
  };
}

/**
 * The Home route establishes development ownership before this read. This
 * helper only reads the canonical program plus the same active-access and
 * active-referrer-identity eligibility authority used by developer settings.
 * There is no development-scoped management route, so V1 returns no action.
 */
export async function getDevelopmentHomeDistribution(params: {
  db: DbExecutor;
  developmentId: number;
}): Promise<DevelopmentHomeDistribution> {
  const [program] = (await params.db
    .select({
      id: distributionPrograms.id,
      isActive: distributionPrograms.isActive,
      isReferralEnabled: distributionPrograms.isReferralEnabled,
    })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, params.developmentId))
    .limit(1)) as DistributionProgramRow[];

  if (!program) {
    return deriveDevelopmentHomeDistribution(null);
  }

  const enabled = Number(program.isActive) === 1 && Number(program.isReferralEnabled) === 1;
  if (!enabled) {
    return deriveDevelopmentHomeDistribution(program);
  }

  const [eligible] = await params.db
    .select({ count: sql<number>`COUNT(DISTINCT ${distributionAgentAccess.agentId})` })
    .from(distributionAgentAccess)
    .innerJoin(
      distributionIdentities,
      and(
        eq(distributionIdentities.userId, distributionAgentAccess.agentId),
        eq(distributionIdentities.identityType, 'referrer'),
        eq(distributionIdentities.active, 1),
      ),
    )
    .where(
      and(
        eq(distributionAgentAccess.developmentId, params.developmentId),
        eq(distributionAgentAccess.accessStatus, 'active'),
      ),
    );

  return deriveDevelopmentHomeDistribution(program, Number(eligible?.count ?? 0));
}
