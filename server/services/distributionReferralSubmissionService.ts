import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import {
  affordabilityAssessments,
  developmentManagerAssignments,
  developmentRequiredDocuments,
  developments,
  distributionAgentAccess,
  distributionAgentTiers,
  distributionDealDocuments,
  distributionDealEvents,
  distributionDeals,
  distributionIdentities,
  distributionPrograms,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { getPartnerProgramTermsByDevelopmentId } from './distributionPartnerTermsService';

const DUPLICATE_WINDOW_DAYS = 30;

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

type SubmissionActor = {
  actorUserId: number;
  actorRole: string;
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

function toNumberOrNull(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toSqlDateTime(input: Date) {
  return input.toISOString().slice(0, 19).replace('T', ' ');
}

function normalizePhone(value: string | null | undefined) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return null;
  return trimmed.replace(/[\s\-()]/g, '');
}

function withConditions(conditions: SQL[]) {
  if (!conditions.length) return sql`1 = 1`;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions) as SQL;
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

async function getCurrentTierForAgent(db: DbExecutor, actorUserId: number): Promise<DistributionTier | null> {
  const [currentTier] = await db
    .select({
      tier: distributionAgentTiers.tier,
    })
    .from(distributionAgentTiers)
    .where(
      and(eq(distributionAgentTiers.agentId, actorUserId), sql`${distributionAgentTiers.effectiveTo} IS NULL`),
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
      errorCode: 'PROGRAM_NOT_ELIGIBLE',
      reasons: EligibilityReason[];
    };
  };
  error.data = {
    errorCode: 'PROGRAM_NOT_ELIGIBLE',
    reasons,
  };
  throw error;
}

function buildDuplicateReferralError(existingDealId: number): never {
  const error = new TRPCError({
    code: 'BAD_REQUEST',
    message: 'A similar referral already exists for this development.',
  }) as TRPCError & {
    data?: {
      errorCode: 'DUPLICATE_REFERRAL';
      existingDealId: number;
    };
  };
  error.data = {
    errorCode: 'DUPLICATE_REFERRAL',
    existingDealId,
  };
  throw error;
}

function buildForbiddenReferralAccessError(): never {
  throw new TRPCError({
    code: 'FORBIDDEN',
    message: 'You do not have partner access for referral submission.',
  });
}

async function findProgramByDevelopmentId(db: DbExecutor, developmentId: number): Promise<SubmissionProgram | null> {
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

export async function validateProgramEligibilityForSubmission(
  input: {
    developmentId: number;
  } & SubmissionActor & {
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
    // TODO(invite_only): add explicit allowlist support when invite model is introduced.
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

  return {
    ok: true as const,
    programId: program.programId,
    developmentId: program.developmentId,
    tierAccessPolicy: tierPolicy,
  };
}

export async function pickManagerForDevelopment(
  developmentId: number,
  options?: {
    db?: DbExecutor;
  },
) {
  const db = await resolveDb(options?.db);
  const [primaryAssignment] = await db
    .select({
      managerUserId: developmentManagerAssignments.managerUserId,
    })
    .from(developmentManagerAssignments)
    .where(
      and(
        eq(developmentManagerAssignments.developmentId, developmentId),
        eq(developmentManagerAssignments.isActive, 1),
        eq(developmentManagerAssignments.isPrimary, 1),
      ),
    )
    .orderBy(desc(developmentManagerAssignments.assignedAt))
    .limit(1);

  return primaryAssignment?.managerUserId ? Number(primaryAssignment.managerUserId) : null;
}

async function findExistingByClientReference(
  db: DbExecutor,
  input: {
    clientReference: string;
  },
) {
  const [existing] = await db
    .select({
      dealId: distributionDeals.id,
      agentId: distributionDeals.agentId,
      developmentId: distributionDeals.developmentId,
      programId: distributionDeals.programId,
      managerUserId: distributionDeals.managerUserId,
      currentStage: distributionDeals.currentStage,
      createdAt: distributionDeals.createdAt,
    })
    .from(distributionDeals)
    .where(eq(distributionDeals.externalRef, input.clientReference))
    .limit(1);
  return existing || null;
}

async function findDuplicateByBuyerIdentity(
  db: DbExecutor,
  input: {
    actorUserId: number;
    developmentId: number;
    buyerEmail?: string | null;
    buyerPhone?: string | null;
  },
) {
  const trimmedEmail = String(input.buyerEmail || '').trim();
  const normalizedPhone = normalizePhone(input.buyerPhone);
  if (!trimmedEmail && !normalizedPhone) return null;

  const identityConditions: SQL[] = [];
  if (trimmedEmail) {
    identityConditions.push(
      sql`LOWER(${distributionDeals.buyerEmail}) = LOWER(${trimmedEmail})`,
    );
  }
  if (normalizedPhone) {
    identityConditions.push(
      sql`REPLACE(REPLACE(REPLACE(REPLACE(${distributionDeals.buyerPhone},' ',''),'-',''),'(',''),')','') = ${normalizedPhone}`,
    );
  }

  const windowStart = new Date(Date.now() - DUPLICATE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const [existing] = await db
    .select({
      dealId: distributionDeals.id,
    })
    .from(distributionDeals)
    .where(
      and(
        eq(distributionDeals.agentId, input.actorUserId),
        eq(distributionDeals.developmentId, input.developmentId),
        sql`${distributionDeals.currentStage} <> 'cancelled'`,
        sql`${distributionDeals.submittedAt} >= ${toSqlDateTime(windowStart)}`,
        sql`(${sql.join(identityConditions, sql` OR `)})`,
      ),
    )
    .orderBy(desc(distributionDeals.createdAt))
    .limit(1);

  return existing || null;
}

async function getRequiredTemplateIdsForDevelopment(db: DbExecutor, developmentId: number) {
  const rows = await db
    .select({
      id: developmentRequiredDocuments.id,
    })
    .from(developmentRequiredDocuments)
    .where(
      and(
        eq(developmentRequiredDocuments.developmentId, developmentId),
        eq(developmentRequiredDocuments.isActive, 1),
      ),
    );
  return rows.map(row => Number(row.id));
}

export async function createReferralDeal(
  input: SubmissionActor & {
    developmentId: number;
    buyerName?: string | null;
    buyerPhone?: string | null;
    buyerEmail?: string | null;
    notes?: string | null;
    clientReference?: string | null;
    assessmentId?: string | null;
  },
) {
  const db = await resolveDb();
  const eligibility = await validateProgramEligibilityForSubmission({
    developmentId: input.developmentId,
    actorUserId: input.actorUserId,
    actorRole: input.actorRole,
    db,
  });

  const normalizedClientReference = String(input.clientReference || '').trim() || null;
  if (normalizedClientReference) {
    const existing = await findExistingByClientReference(db, {
      clientReference: normalizedClientReference,
    });
    if (existing) {
      if (Number(existing.agentId) !== Number(input.actorUserId)) {
        buildDuplicateReferralError(Number(existing.dealId));
      }
      return {
        dealId: Number(existing.dealId),
        developmentId: Number(existing.developmentId),
        programId: Number(existing.programId),
        managerUserId: toNumberOrNull(existing.managerUserId),
        status: 'submitted',
        createdAt: String(existing.createdAt || ''),
        checklistSeededCount: 0,
        wasDuplicate: true,
      };
    }
  }

  const duplicateByBuyer = await findDuplicateByBuyerIdentity(db, {
    actorUserId: input.actorUserId,
    developmentId: input.developmentId,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone,
  });

  if (duplicateByBuyer) {
    buildDuplicateReferralError(Number(duplicateByBuyer.dealId));
  }

  const managerUserId = await pickManagerForDevelopment(input.developmentId, { db });
  const buyerName = String(input.buyerName || '').trim() || 'Buyer Pending';
  const buyerPhone = String(input.buyerPhone || '').trim() || null;
  const buyerEmail = String(input.buyerEmail || '').trim() || null;
  const normalizedAssessmentId = String(input.assessmentId || '').trim() || null;

  if (normalizedAssessmentId) {
    const [assessment] = await db
      .select({
        id: affordabilityAssessments.id,
      })
      .from(affordabilityAssessments)
      .where(
        and(
          eq(affordabilityAssessments.id, normalizedAssessmentId),
          eq(affordabilityAssessments.actorUserId, input.actorUserId),
        ),
      )
      .limit(1);

    if (!assessment?.id) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'assessmentId is invalid or not owned by this partner account.',
      });
    }
  }

  const result = await db.transaction(async tx => {
    const [insertDealResult] = await tx.insert(distributionDeals).values({
      programId: eligibility.programId,
      developmentId: input.developmentId,
      agentId: input.actorUserId,
      managerUserId,
      affordabilityAssessmentId: normalizedAssessmentId,
      externalRef: normalizedClientReference,
      buyerName,
      buyerPhone,
      buyerEmail,
      currentStage: 'viewing_scheduled',
      commissionStatus: 'not_ready',
      attributionLockedAt: sql`CURRENT_TIMESTAMP`,
      attributionLockedBy: input.actorUserId,
    });

    const dealId = Number((insertDealResult as any).insertId || 0);
    if (!dealId) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create referral deal.',
      });
    }

    await tx.insert(distributionDealEvents).values({
      dealId,
      fromStage: null,
      toStage: 'viewing_scheduled',
      eventType: 'system',
      actorUserId: input.actorUserId,
      metadata: {
        source: 'partner.submitReferral',
        programId: eligibility.programId,
        developmentId: input.developmentId,
        managerAssigned: managerUserId,
        assessmentId: normalizedAssessmentId,
      } as any,
      notes: input.notes ?? null,
    });

    const templateIds = await getRequiredTemplateIdsForDevelopment(tx, input.developmentId);
    if (templateIds.length) {
      await tx.insert(distributionDealDocuments).values(
        templateIds.map(templateId => ({
          dealId,
          developmentRequiredDocumentId: templateId,
          status: 'pending' as const,
        })),
      );
    }

    const [createdDeal] = await tx
      .select({
        dealId: distributionDeals.id,
        developmentId: distributionDeals.developmentId,
        programId: distributionDeals.programId,
        managerUserId: distributionDeals.managerUserId,
        createdAt: distributionDeals.createdAt,
      })
      .from(distributionDeals)
      .where(eq(distributionDeals.id, dealId))
      .limit(1);

    return {
      dealId,
      developmentId: Number(createdDeal?.developmentId || input.developmentId),
        programId: Number(createdDeal?.programId || eligibility.programId),
        managerUserId: toNumberOrNull(createdDeal?.managerUserId),
        assessmentId: normalizedAssessmentId,
        status: 'submitted',
        createdAt: String(createdDeal?.createdAt || ''),
      checklistSeededCount: templateIds.length,
      wasDuplicate: false,
    };
  });

  return result;
}

type ReferralProgress = {
  requiredCount: number;
  verifiedRequiredCount: number;
};

async function computeDealDocumentProgressMap(
  db: DbExecutor,
  input: {
    dealRows: Array<{ dealId: number; developmentId: number }>;
  },
) {
  const progressMap = new Map<number, ReferralProgress>();
  if (!input.dealRows.length) return progressMap;

  const developmentIds = Array.from(new Set(input.dealRows.map(row => Number(row.developmentId))));
  const dealIds = input.dealRows.map(row => Number(row.dealId));

  const templateRows = await db
    .select({
      templateId: developmentRequiredDocuments.id,
      developmentId: developmentRequiredDocuments.developmentId,
    })
    .from(developmentRequiredDocuments)
    .where(
      and(
        inArray(developmentRequiredDocuments.developmentId, developmentIds),
        eq(developmentRequiredDocuments.isActive, 1),
        eq(developmentRequiredDocuments.isRequired, 1),
      ),
    );

  const requiredTemplateIdsByDevelopment = new Map<number, Set<number>>();
  for (const row of templateRows) {
    const developmentId = Number(row.developmentId);
    const current = requiredTemplateIdsByDevelopment.get(developmentId) || new Set<number>();
    current.add(Number(row.templateId));
    requiredTemplateIdsByDevelopment.set(developmentId, current);
  }

  const allRequiredTemplateIds = Array.from(
    new Set(
      Array.from(requiredTemplateIdsByDevelopment.values()).flatMap(templateIds =>
        Array.from(templateIds),
      ),
    ),
  );

  const verifiedRows =
    dealIds.length && allRequiredTemplateIds.length
      ? await db
          .select({
            dealId: distributionDealDocuments.dealId,
            developmentRequiredDocumentId: distributionDealDocuments.developmentRequiredDocumentId,
            status: distributionDealDocuments.status,
          })
          .from(distributionDealDocuments)
          .where(
            and(
              inArray(distributionDealDocuments.dealId, dealIds),
              inArray(distributionDealDocuments.developmentRequiredDocumentId, allRequiredTemplateIds),
            ),
          )
      : [];

  const verifiedSetByDeal = new Map<number, Set<number>>();
  for (const row of verifiedRows) {
    if (row.status !== 'verified') continue;
    const dealId = Number(row.dealId);
    const current = verifiedSetByDeal.get(dealId) || new Set<number>();
    current.add(Number(row.developmentRequiredDocumentId));
    verifiedSetByDeal.set(dealId, current);
  }

  for (const row of input.dealRows) {
    const requiredTemplates = requiredTemplateIdsByDevelopment.get(Number(row.developmentId)) || new Set<number>();
    const verifiedTemplates = verifiedSetByDeal.get(Number(row.dealId)) || new Set<number>();
    progressMap.set(Number(row.dealId), {
      requiredCount: requiredTemplates.size,
      verifiedRequiredCount: verifiedTemplates.size,
    });
  }

  return progressMap;
}

export async function listMyReferralDeals(
  input: SubmissionActor & {
    status?: string;
    developmentId?: number;
    limit?: number;
    cursor?: string;
  },
) {
  const db = await resolveDb();
  const normalizedLimit = Math.max(1, Math.min(100, Number(input.limit || 20)));
  const cursorId = Number(input.cursor || 0);

  const conditions: SQL[] = [eq(distributionDeals.agentId, input.actorUserId)];
  if (typeof input.developmentId === 'number') {
    conditions.push(eq(distributionDeals.developmentId, input.developmentId));
  }
  if (input.status) {
    conditions.push(eq(distributionDeals.currentStage, input.status as any));
  }
  if (Number.isFinite(cursorId) && cursorId > 0) {
    conditions.push(sql`${distributionDeals.id} < ${cursorId}`);
  }

  const rows = await db
    .select({
      dealId: distributionDeals.id,
      developmentId: distributionDeals.developmentId,
      developmentName: developments.name,
      programId: distributionDeals.programId,
      assessmentId: distributionDeals.affordabilityAssessmentId,
      status: distributionDeals.currentStage,
      createdAt: distributionDeals.createdAt,
    })
    .from(distributionDeals)
    .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
    .where(withConditions(conditions))
    .orderBy(desc(distributionDeals.id))
    .limit(normalizedLimit + 1);

  const hasMore = rows.length > normalizedLimit;
  const pageRows = hasMore ? rows.slice(0, normalizedLimit) : rows;

  const progressMap = await computeDealDocumentProgressMap(db, {
    dealRows: pageRows.map(row => ({
      dealId: Number(row.dealId),
      developmentId: Number(row.developmentId),
    })),
  });

  return {
    items: pageRows.map(row => ({
      dealId: Number(row.dealId),
      development: {
        developmentId: Number(row.developmentId),
        name: String(row.developmentName || `Development #${row.developmentId}`),
      },
      status: String(row.status || 'viewing_scheduled'),
      assessmentId: row.assessmentId ? String(row.assessmentId) : null,
      createdAt: row.createdAt,
      docProgress: progressMap.get(Number(row.dealId)) || {
        requiredCount: 0,
        verifiedRequiredCount: 0,
      },
    })),
    nextCursor: hasMore ? String(pageRows[pageRows.length - 1]?.dealId || '') : undefined,
  };
}

export async function getMyReferralDeal(
  input: SubmissionActor & {
    dealId: number;
  },
) {
  const db = await resolveDb();
  const [deal] = await db
    .select({
      dealId: distributionDeals.id,
      agentId: distributionDeals.agentId,
      programId: distributionDeals.programId,
      developmentId: distributionDeals.developmentId,
      developmentName: developments.name,
      city: developments.city,
      province: developments.province,
      buyerName: distributionDeals.buyerName,
      buyerEmail: distributionDeals.buyerEmail,
      buyerPhone: distributionDeals.buyerPhone,
      status: distributionDeals.currentStage,
      assessmentId: distributionDeals.affordabilityAssessmentId,
      managerUserId: distributionDeals.managerUserId,
      managerName: users.name,
      managerFirstName: users.firstName,
      managerLastName: users.lastName,
      managerEmail: users.email,
      createdAt: distributionDeals.createdAt,
      updatedAt: distributionDeals.updatedAt,
    })
    .from(distributionDeals)
    .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
    .leftJoin(users, eq(distributionDeals.managerUserId, users.id))
    .where(eq(distributionDeals.id, input.dealId))
    .limit(1);

  if (!deal) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Referral deal not found.',
    });
  }

  if (input.actorRole !== 'super_admin' && Number(deal.agentId) !== Number(input.actorUserId)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You can only view referrals you submitted.',
    });
  }

  const progressMap = await computeDealDocumentProgressMap(db, {
    dealRows: [
      {
        dealId: Number(deal.dealId),
        developmentId: Number(deal.developmentId),
      },
    ],
  });
  const docProgress = progressMap.get(Number(deal.dealId)) || {
    requiredCount: 0,
    verifiedRequiredCount: 0,
  };

  const events = await db
    .select({
      id: distributionDealEvents.id,
      at: distributionDealEvents.eventAt,
      event: distributionDealEvents.eventType,
      note: distributionDealEvents.notes,
      actorRole: users.role,
    })
    .from(distributionDealEvents)
    .leftJoin(users, eq(distributionDealEvents.actorUserId, users.id))
    .where(eq(distributionDealEvents.dealId, input.dealId))
    .orderBy(desc(distributionDealEvents.eventAt), desc(distributionDealEvents.id))
    .limit(200);

  // TODO(snapshotting): store immutable terms at submission time when program-term versioning is introduced.
  const programTerms = await getPartnerProgramTermsByDevelopmentId(Number(deal.developmentId));

  return {
    dealId: Number(deal.dealId),
    development: {
      developmentId: Number(deal.developmentId),
      name: String(deal.developmentName || `Development #${deal.developmentId}`),
      city: deal.city || null,
      province: deal.province || null,
    },
    status: String(deal.status || 'viewing_scheduled'),
    assessmentId: deal.assessmentId ? String(deal.assessmentId) : null,
    createdAt: deal.createdAt,
    updatedAt: deal.updatedAt,
    buyer: {
      name: deal.buyerName || null,
      phone: deal.buyerPhone || null,
      email: deal.buyerEmail || null,
    },
    manager:
      deal.managerUserId
        ? {
            userId: Number(deal.managerUserId),
            displayName:
              String(deal.managerName || '').trim() ||
              [deal.managerFirstName, deal.managerLastName].filter(Boolean).join(' ').trim() ||
              null,
            email: deal.managerEmail || null,
          }
        : null,
    docProgress,
    programTerms,
    timeline: events.map(event => ({
      at: event.at,
      event: String(event.event || 'system'),
      byRole: event.actorRole ? String(event.actorRole) : 'system',
      note: event.note || null,
    })),
  };
}
