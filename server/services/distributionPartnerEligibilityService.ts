import { TRPCError } from '@trpc/server';
import { and, eq } from 'drizzle-orm';
import { distributionIdentities, distributionPrograms } from '../../drizzle/schema';
import { getDb } from '../db';

type EligibilityReasonCode =
  | 'PROGRAM_NOT_FOUND'
  | 'PROGRAM_INACTIVE'
  | 'REFERRALS_DISABLED';

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

  if (!hasPartnerAccess) {
    buildForbiddenReferralAccessError();
  }

  if (reasons.length) {
    buildProgramNotEligibleError(reasons);
  }

  return {
    ok: true as const,
    programId: program.programId,
    developmentId: program.developmentId,
    tierAccessPolicy: String(program.tierAccessPolicy || 'open'),
  };
}
