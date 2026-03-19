import { TRPCError } from '@trpc/server';
import { and, desc, eq, sql } from 'drizzle-orm';
import {
  distributionAgentAccess,
  distributionAgentTiers,
  distributionIdentities,
  distributionPrograms,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { assertDevelopmentSubmissionEligible } from './distributionAccessPolicy';

type DistributionTier = 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';

type EligibilityReasonCode =
  | 'PROGRAM_NOT_FOUND'
  | 'PROGRAM_INACTIVE'
  | 'REFERRALS_DISABLED'
  | 'PARTNER_ACCESS_REQUIRED'
  | 'PROGRAM_ACCESS_INACTIVE'
  | 'TIER_NOT_ELIGIBLE';

type EligibilityReason = {
  code: EligibilityReasonCode;
  message: string;
};

type SubmissionProgram = {
  programId: number;
  developmentId: number;
  isActive: boolean;
  isReferralEnabled: boolean;
  tierAccessPolicy: string | null;
};

type DbExecutor = any;

function boolFromTinyInt(value: unknown) {
  return Number(value || 0) === 1;
}

function isRolePartnerEligible(role: string) {
  return role === 'agent' || role === 'agency_admin' || role === 'super_admin';
}

function isTierEligible(agentTier: DistributionTier | null, minTier: DistributionTier) {
  const tierRank: Record<DistributionTier, number> = {
    tier_1: 1,
    tier_2: 2,
    tier_3: 3,
    tier_4: 4,
  };
  if (!agentTier) return false;
  return tierRank[agentTier] >= tierRank[minTier];
}

async function resolveDb(db?: DbExecutor) {
  if (db) return db;
  const connection = await getDb();
  if (!connection) throw new Error('Database not available');
  return connection;
}

async function hasActiveReferrerIdentity(db: DbExecutor, actorUserId: number) {
  const [identity] = await db
    .select({ id: distributionIdentities.id })
    .from(distributionIdentities)
    .where(
      and(
        eq(distributionIdentities.userId, actorUserId),
        eq(distributionIdentities.identityType, 'referrer'),
        eq(distributionIdentities.active, 1),
      ),
    )
    .limit(1);
  return Boolean(identity?.id);
}

async function getCurrentTierForAgent(
  db: DbExecutor,
  actorUserId: number,
): Promise<DistributionTier | null> {
  const [currentTier] = await db
    .select({
      tier: distributionAgentTiers.tier,
    })
    .from(distributionAgentTiers)
    .where(
      and(
        eq(distributionAgentTiers.agentId, actorUserId),
        sql`${distributionAgentTiers.effectiveTo} IS NULL`,
      ),
    )
    .orderBy(desc(distributionAgentTiers.id))
    .limit(1);

  if (currentTier?.tier) {
    return currentTier.tier as DistributionTier;
  }

  const [fallbackTier] = await db
    .select({
      tier: distributionAgentTiers.tier,
    })
    .from(distributionAgentTiers)
    .where(eq(distributionAgentTiers.agentId, actorUserId))
    .orderBy(desc(distributionAgentTiers.id))
    .limit(1);

  return fallbackTier?.tier ? (fallbackTier.tier as DistributionTier) : null;
}

function buildProgramNotEligibleError(reasons: EligibilityReason[]): never {
  const error = new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Program is not eligible for referral submission.',
  }) as TRPCError & {
    data?: {
      errorCode: 'PROGRAM_NOT_ELIGIBLE';
      reasons: EligibilityReason[];
    };
  };
  error.data = {
    errorCode: 'PROGRAM_NOT_ELIGIBLE',
    reasons,
  };
  throw error;
}

function buildForbiddenReferralAccessError(): never {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'You do not have partner access for referral submission.',
  });
}

async function findProgramByDevelopmentId(
  db: DbExecutor,
  developmentId: number,
): Promise<SubmissionProgram | null> {
  const [program] = await db
    .select({
      programId: distributionPrograms.id,
      developmentId: distributionPrograms.developmentId,
      isActive: distributionPrograms.isActive,
      isReferralEnabled: distributionPrograms.isReferralEnabled,
      tierAccessPolicy: distributionPrograms.tierAccessPolicy,
    })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, developmentId))
    .limit(1);

  if (!program) return null;
  return {
    programId: Number(program.programId),
    developmentId: Number(program.developmentId),
    isActive: boolFromTinyInt(program.isActive),
    isReferralEnabled: boolFromTinyInt(program.isReferralEnabled),
    tierAccessPolicy: program.tierAccessPolicy ? String(program.tierAccessPolicy) : null,
  };
}

function normalizePolicy(value: string | null) {
  const policy = String(value || 'restricted').trim().toLowerCase();
  if (policy === 'open' || policy === 'restricted' || policy === 'invite_only') {
    return policy;
  }
  return 'restricted';
}

function mapActorRoleForSubmission(actorRole: string): 'admin' | 'referrer' {
  return actorRole === 'super_admin' ? 'admin' : 'referrer';
}

export async function validatePartnerSubmissionEligibility(
  input: {
    developmentId: number;
    actorUserId: number;
    actorRole: string;
    db?: DbExecutor;
  },
) {
  const db = await resolveDb(input.db);
  const reasons: EligibilityReason[] = [];

  const program = await findProgramByDevelopmentId(db, input.developmentId);
  if (!program) {
    reasons.push({
      code: 'PROGRAM_NOT_FOUND',
      message: 'No referral program is configured for this development.',
    });
    buildProgramNotEligibleError(reasons);
  }

  if (!program.isActive) {
    reasons.push({
      code: 'PROGRAM_INACTIVE',
      message: 'This referral program is inactive.',
    });
  }

  if (!program.isReferralEnabled) {
    reasons.push({
      code: 'REFERRALS_DISABLED',
      message: 'Referrals are currently disabled for this development.',
    });
  }

  const roleEligible = isRolePartnerEligible(input.actorRole);
  const hasReferrerIdentity = await hasActiveReferrerIdentity(db, input.actorUserId);
  const hasPartnerAccess = roleEligible || hasReferrerIdentity;
  const tierPolicy = normalizePolicy(program.tierAccessPolicy);

  if (!hasPartnerAccess) {
    buildForbiddenReferralAccessError();
  }

  if (tierPolicy === 'restricted' || tierPolicy === 'invite_only') {
    const [access] = await db
      .select({
        accessStatus: distributionAgentAccess.accessStatus,
        minTierRequired: distributionAgentAccess.minTierRequired,
      })
      .from(distributionAgentAccess)
      .where(
        and(
          eq(distributionAgentAccess.programId, program.programId),
          eq(distributionAgentAccess.agentId, input.actorUserId),
        ),
      )
      .limit(1);

    if (access && String(access.accessStatus) !== 'active') {
      reasons.push({
        code: 'PROGRAM_ACCESS_INACTIVE',
        message: 'Your access to this referral program is not active.',
      });
    }

    if (access && String(access.accessStatus) === 'active') {
      const minTierRequired = String(access.minTierRequired || '') as DistributionTier;
      if (minTierRequired) {
        const currentTier = await getCurrentTierForAgent(db, input.actorUserId);
        if (!isTierEligible(currentTier, minTierRequired)) {
          reasons.push({
            code: 'TIER_NOT_ELIGIBLE',
            message: `Your current tier does not meet the ${minTierRequired} requirement.`,
          });
        }
      }
    }
  }

  if (reasons.length) {
    buildProgramNotEligibleError(reasons);
  }

  await assertDevelopmentSubmissionEligible({
    db,
    developmentId: input.developmentId,
    actor: {
      role: mapActorRoleForSubmission(input.actorRole),
      userId: input.actorUserId,
    },
    channel: 'submission',
  });

  return {
    ok: true as const,
    programId: program.programId,
    developmentId: program.developmentId,
    tierAccessPolicy: tierPolicy,
  };
}
