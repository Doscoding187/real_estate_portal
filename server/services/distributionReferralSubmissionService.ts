import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import {
  applicationRequirements,
  dealRequirementStatuses,
  affordabilityAssessments,
  developmentManagerAssignments,
  developmentRequiredDocuments,
  developments,
  developmentDocuments,
  distributionDealDocuments,
  distributionDealEvents,
  distributionDeals,
  distributionPrograms,
  users,
} from '../../drizzle/schema';
import { ENV } from '../_core/env';
import { getDb } from '../db';
import { getAffordabilityMatches } from './affordabilityAssessmentService';
import { assertDevelopmentSubmissionEligible } from './distributionAccessPolicy';
import { getPartnerProgramTermsByDevelopmentId } from './distributionPartnerTermsService';
import { transitionDealRequirementStatus } from './distributionDealRequirementStatusService';

const DUPLICATE_WINDOW_DAYS = 30;

type SubmissionActor = {
  actorUserId: number;
  actorRole: string;
};

type DbExecutor = any;

function toNumberOrNull(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toSqlDateTime(input: Date) {
  return input.toISOString().slice(0, 19).replace('T', ' ');
}

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
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

type JourneyOwnerRole = 'referrer' | 'manager' | 'system' | 'none';

const STAGE_SLA_DAYS: Record<string, number> = {
  viewing_scheduled: 2,
  viewing_completed: 2,
  application_submitted: 3,
  contract_signed: 5,
  bond_approved: 7,
  commission_pending: 10,
  commission_paid: 0,
  cancelled: 0,
};

function parseSqlDate(value: unknown) {
  if (!value) return null;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function addDays(value: Date, days: number) {
  const next = new Date(value.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeStage(stage: unknown) {
  const value = String(stage || '').trim().toLowerCase();
  if (!value) return 'viewing_scheduled';
  if (value === 'submitted' || value === 'lead') return 'viewing_scheduled';
  return value;
}

function buildJourneyGuidance(input: {
  stage: unknown;
  docProgress?: {
    requiredCount: number;
    verifiedRequiredCount: number;
    verificationComplete?: boolean;
  };
  updatedAt?: unknown;
  createdAt?: unknown;
}) {
  const stage = normalizeStage(input.stage);
  const requiredCount = Number(input.docProgress?.requiredCount || 0);
  const verifiedRequiredCount = Number(input.docProgress?.verifiedRequiredCount || 0);
  const hasMissingDocs =
    input.docProgress && typeof input.docProgress.verificationComplete === 'boolean'
      ? !input.docProgress.verificationComplete
      : requiredCount > verifiedRequiredCount;

  let nextAction = 'Continue moving this referral to the next milestone.';
  let ownerRole: JourneyOwnerRole = 'referrer';
  let actionCode:
    | 'follow_up_viewing'
    | 'follow_up_docs'
    | 'follow_up_manager'
    | 'track_payout'
    | 'submit_next_referral'
    | 'review_outcome' = 'follow_up_viewing';

  if (stage === 'commission_paid') {
    nextAction = 'Commission paid. Archive this deal and submit the next referral.';
    ownerRole = 'system';
    actionCode = 'submit_next_referral';
  } else if (stage === 'commission_pending') {
    nextAction = 'Follow up on payout processing and payment confirmation.';
    ownerRole = 'manager';
    actionCode = 'track_payout';
  } else if (stage === 'bond_approved' || stage === 'contract_signed') {
    nextAction = 'Confirm final transfer milestones and payout readiness.';
    ownerRole = 'manager';
    actionCode = 'follow_up_manager';
  } else if (stage === 'application_submitted') {
    if (hasMissingDocs) {
      nextAction = 'Upload and verify missing required documents to prevent delays.';
      ownerRole = 'referrer';
      actionCode = 'follow_up_docs';
    } else {
      nextAction = 'Application is in review. Stay available for manager requests.';
      ownerRole = 'manager';
      actionCode = 'follow_up_manager';
    }
  } else if (stage === 'viewing_completed') {
    nextAction = 'Convert this buyer to application submission.';
    ownerRole = 'referrer';
    actionCode = 'follow_up_viewing';
  } else if (stage === 'viewing_scheduled') {
    nextAction = 'Confirm viewing attendance and prepare buyer application details.';
    ownerRole = 'referrer';
    actionCode = 'follow_up_viewing';
  } else if (stage === 'cancelled') {
    nextAction = 'Deal closed as cancelled. Review reason and focus on active deals.';
    ownerRole = 'none';
    actionCode = 'review_outcome';
  }

  const baseline = parseSqlDate(input.updatedAt) || parseSqlDate(input.createdAt) || new Date();
  const slaDays = STAGE_SLA_DAYS[stage] ?? 3;
  const slaDueAt = slaDays > 0 ? addDays(baseline, slaDays) : null;
  const atRisk =
    Boolean(slaDueAt) &&
    stage !== 'commission_paid' &&
    stage !== 'cancelled' &&
    Date.now() > Number(slaDueAt);

  return {
    nextAction,
    ownerRole,
    actionCode,
    slaDueAt: slaDueAt ? toSqlDateTime(slaDueAt) : null,
    atRisk,
  };
}

async function resolveDb(db?: DbExecutor) {
  if (db) return db;
  const connection = await getDb();
  if (!connection) throw new Error('Database not available');
  return connection;
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
      assessmentId: distributionDeals.affordabilityAssessmentId,
      matchSnapshotId: distributionDeals.affordabilityMatchSnapshotId,
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
        eq(developmentRequiredDocuments.isRequired, 1),
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
  const eligibility = await assertDevelopmentSubmissionEligible({
    db,
    developmentId: input.developmentId,
    actor: {
      role: input.actorRole === 'super_admin' ? 'admin' : 'referrer',
      userId: input.actorUserId,
    },
    channel: 'submission',
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
        assessmentId: existing.assessmentId ? String(existing.assessmentId) : null,
        matchSnapshotId: existing.matchSnapshotId ? String(existing.matchSnapshotId) : null,
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
  let assessmentAttachment:
    | {
        assessmentId: string;
        matchSnapshotId: string;
        purchasePrice: number;
        assumptionsSummary: {
          interestRateAnnual: number | null;
          termMonths: number | null;
          maxRepaymentRatio: number | null;
          calcVersion: string | null;
        };
      }
    | null = null;

  if (normalizedAssessmentId) {
    const assessmentConditions: SQL[] = [eq(affordabilityAssessments.id, normalizedAssessmentId)];
    if (input.actorRole !== 'super_admin') {
      assessmentConditions.push(eq(affordabilityAssessments.actorUserId, input.actorUserId));
    }

    const [assessment] = await db
      .select({
        id: affordabilityAssessments.id,
        assumptionsJson: affordabilityAssessments.assumptionsJson,
        lockedAt: affordabilityAssessments.lockedAt,
        lockedByDealId: affordabilityAssessments.lockedByDealId,
      })
      .from(affordabilityAssessments)
      .where(withConditions(assessmentConditions))
      .limit(1);

    if (!assessment?.id) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'assessmentId is invalid or not accessible for this actor.',
      });
    }

    if (assessment.lockedAt && Number(assessment.lockedByDealId || 0) > 0) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'This affordability assessment is already attached to another referral.',
      });
    }

    const snapshot = await getAffordabilityMatches({
      assessmentId: normalizedAssessmentId,
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      db,
    });
    const assumptionsJson = parseJsonObject(assessment.assumptionsJson) || {};
    assessmentAttachment = {
      assessmentId: normalizedAssessmentId,
      matchSnapshotId: String(snapshot.matchSnapshotId),
      purchasePrice: Math.max(0, Math.round(Number(snapshot.purchasePrice || 0))),
      assumptionsSummary: {
        interestRateAnnual: toNumberOrNull(assumptionsJson.interestRateAnnual),
        termMonths: toNumberOrNull(assumptionsJson.termMonths),
        maxRepaymentRatio: toNumberOrNull(assumptionsJson.maxRepaymentRatio),
        calcVersion: assumptionsJson.calcVersion ? String(assumptionsJson.calcVersion) : null,
      },
    };
  }

  const result = await db.transaction(async tx => {
    const [insertDealResult] = await tx.insert(distributionDeals).values({
      programId: eligibility.programId,
      developmentId: input.developmentId,
      agentId: input.actorUserId,
      managerUserId,
      affordabilityAssessmentId: assessmentAttachment?.assessmentId || null,
      affordabilityMatchSnapshotId: assessmentAttachment?.matchSnapshotId || null,
      affordabilityPurchasePrice: assessmentAttachment?.purchasePrice ?? null,
      commissionBaseAmount: assessmentAttachment?.purchasePrice ?? null,
      affordabilityAssumptionsJson: assessmentAttachment?.assumptionsSummary as any,
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
        assessmentId: assessmentAttachment?.assessmentId || null,
        matchSnapshotId: assessmentAttachment?.matchSnapshotId || null,
      } as any,
      notes: input.notes ?? null,
    });

    if (assessmentAttachment) {
      await tx
        .update(affordabilityAssessments)
        .set({
          lockedAt: toSqlDateTime(new Date()),
          lockedByDealId: dealId,
          lockedByUserId: input.actorUserId,
        })
        .where(eq(affordabilityAssessments.id, assessmentAttachment.assessmentId));

      await tx.insert(distributionDealEvents).values({
        dealId,
        fromStage: null,
        toStage: 'viewing_scheduled',
        eventType: 'note',
        actorUserId: input.actorUserId,
        metadata: {
          source: 'partner.attachAssessment',
          assessmentId: assessmentAttachment.assessmentId,
          matchSnapshotId: assessmentAttachment.matchSnapshotId,
          purchasePrice: assessmentAttachment.purchasePrice,
          assumptions: assessmentAttachment.assumptionsSummary,
        } as any,
        notes: 'Affordability Snapshot Attached',
      });
    }

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
      assessmentId: assessmentAttachment?.assessmentId || null,
      matchSnapshotId: assessmentAttachment?.matchSnapshotId || null,
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
  uploadedRequiredCount: number;
  verifiedRequiredCount: number;
  pendingReviewCount: number;
  rejectedCount: number;
  missingCount: number;
  uploadComplete: boolean;
  verificationComplete: boolean;
};

const EMPTY_REFERRAL_PROGRESS: ReferralProgress = {
  requiredCount: 0,
  uploadedRequiredCount: 0,
  verifiedRequiredCount: 0,
  pendingReviewCount: 0,
  rejectedCount: 0,
  missingCount: 0,
  uploadComplete: true,
  verificationComplete: true,
};

type PartnerDealDocumentStatus = 'pending' | 'received' | 'verified' | 'rejected';

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

  if (ENV.distributionDocsV2ReadsEnabled) {
    const requirementRows = await db
      .select({
        requirementId: applicationRequirements.id,
        developmentId: applicationRequirements.developmentId,
        linkedDevelopmentDocumentId: applicationRequirements.linkedDevelopmentDocumentId,
      })
      .from(applicationRequirements)
      .where(
        and(
          inArray(applicationRequirements.developmentId, developmentIds),
          eq(applicationRequirements.isActive, 1),
          eq(applicationRequirements.required, 1),
        ),
      );

    const requiredRequirementIdsByDevelopment = new Map<number, Set<number>>();
    const linkedDocIds = new Set<number>();
    for (const row of requirementRows) {
      const developmentId = Number(row.developmentId);
      const current = requiredRequirementIdsByDevelopment.get(developmentId) || new Set<number>();
      current.add(Number(row.requirementId));
      requiredRequirementIdsByDevelopment.set(developmentId, current);
      if (row.linkedDevelopmentDocumentId) linkedDocIds.add(Number(row.linkedDevelopmentDocumentId));
    }

    const activeLinkedDocIds = linkedDocIds.size
      ? new Set<number>(
          (
            await db
              .select({ id: developmentDocuments.id })
              .from(developmentDocuments)
              .where(
                and(
                  inArray(developmentDocuments.id, Array.from(linkedDocIds)),
                  eq(developmentDocuments.isActive, 1),
                ),
              )
          ).map((row: any) => Number(row.id)),
        )
      : new Set<number>();

    const requirementMetaById = new Map<number, { linkedDevelopmentDocumentId: number | null }>();
    for (const row of requirementRows) {
      requirementMetaById.set(Number(row.requirementId), {
        linkedDevelopmentDocumentId: row.linkedDevelopmentDocumentId
          ? Number(row.linkedDevelopmentDocumentId)
          : null,
      });
    }

    const allRequirementIds = Array.from(
      new Set(
        Array.from(requiredRequirementIdsByDevelopment.values()).flatMap(ids => Array.from(ids)),
      ),
    );

    const statusRows =
      dealIds.length && allRequirementIds.length
        ? await db
            .select({
              dealId: dealRequirementStatuses.dealId,
              requirementId: dealRequirementStatuses.requirementId,
              status: dealRequirementStatuses.status,
            })
            .from(dealRequirementStatuses)
            .where(
              and(
                inArray(dealRequirementStatuses.dealId, dealIds),
                inArray(dealRequirementStatuses.requirementId, allRequirementIds),
              ),
            )
        : [];

    const statusByDealRequirement = new Map<string, string>();
    statusRows.forEach((row: any) => {
      statusByDealRequirement.set(`${Number(row.dealId)}:${Number(row.requirementId)}`, String(row.status));
    });

    for (const row of input.dealRows) {
      const requiredIds =
        requiredRequirementIdsByDevelopment.get(Number(row.developmentId)) || new Set<number>();
      let uploadedRequiredCount = 0;
      let verifiedRequiredCount = 0;
      let pendingReviewCount = 0;
      let rejectedCount = 0;
      let missingCount = 0;

      for (const requirementId of requiredIds) {
        const key = `${Number(row.dealId)}:${Number(requirementId)}`;
        let status = statusByDealRequirement.get(key) || 'missing';
        const meta = requirementMetaById.get(requirementId);
        if (
          status === 'missing' &&
          meta?.linkedDevelopmentDocumentId &&
          activeLinkedDocIds.has(Number(meta.linkedDevelopmentDocumentId))
        ) {
          status = 'verified';
        }

        if (
          status === 'uploaded' ||
          status === 'pending_review' ||
          status === 'verified' ||
          status === 'waived' ||
          status === 'rejected'
        ) {
          uploadedRequiredCount += 1;
        }
        if (status === 'verified' || status === 'waived') verifiedRequiredCount += 1;
        if (status === 'pending_review') pendingReviewCount += 1;
        if (status === 'rejected') rejectedCount += 1;
        if (status === 'missing') missingCount += 1;
      }

      const requiredCount = requiredIds.size;
      progressMap.set(Number(row.dealId), {
        requiredCount,
        uploadedRequiredCount,
        verifiedRequiredCount,
        pendingReviewCount,
        rejectedCount,
        missingCount,
        uploadComplete: requiredCount === uploadedRequiredCount,
        verificationComplete: requiredCount === verifiedRequiredCount,
      });
    }

    return progressMap;
  }

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

  const statusRows =
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

  const statusSetByDeal = new Map<number, Map<number, string>>();
  for (const row of statusRows) {
    const dealId = Number(row.dealId);
    const dealMap = statusSetByDeal.get(dealId) || new Map<number, string>();
    dealMap.set(Number(row.developmentRequiredDocumentId), String(row.status));
    statusSetByDeal.set(dealId, dealMap);
  }

  for (const row of input.dealRows) {
    const requiredTemplates =
      requiredTemplateIdsByDevelopment.get(Number(row.developmentId)) || new Set<number>();
    const dealStatuses = statusSetByDeal.get(Number(row.dealId)) || new Map<number, string>();
    let uploadedRequiredCount = 0;
    let verifiedRequiredCount = 0;
    let pendingReviewCount = 0;
    let rejectedCount = 0;
    let missingCount = 0;

    for (const templateId of requiredTemplates) {
      const status = dealStatuses.get(templateId) || 'pending';
      if (status === 'received' || status === 'verified' || status === 'rejected') uploadedRequiredCount += 1;
      if (status === 'verified') verifiedRequiredCount += 1;
      if (status === 'received') pendingReviewCount += 1;
      if (status === 'rejected') rejectedCount += 1;
      if (status === 'pending') missingCount += 1;
    }

    const requiredCount = requiredTemplates.size;
    progressMap.set(Number(row.dealId), {
      requiredCount,
      uploadedRequiredCount,
      verifiedRequiredCount,
      pendingReviewCount,
      rejectedCount,
      missingCount,
      uploadComplete: requiredCount === uploadedRequiredCount,
      verificationComplete: requiredCount === verifiedRequiredCount,
    });
  }

  return progressMap;
}

async function listDealApplicationDocuments(
  db: DbExecutor,
  input: {
    dealId: number;
    developmentId: number;
  },
) {
  const templates = (await db
    .select({
      templateId: developmentRequiredDocuments.id,
      documentCode: developmentRequiredDocuments.documentCode,
      documentLabel: developmentRequiredDocuments.documentLabel,
      category: developmentRequiredDocuments.category,
      templateFileUrl: developmentRequiredDocuments.templateFileUrl,
      templateFileName: developmentRequiredDocuments.templateFileName,
      isRequired: developmentRequiredDocuments.isRequired,
      sortOrder: developmentRequiredDocuments.sortOrder,
    })
    .from(developmentRequiredDocuments)
    .where(
      and(
        eq(developmentRequiredDocuments.developmentId, input.developmentId),
        eq(developmentRequiredDocuments.isActive, 1),
        eq(developmentRequiredDocuments.isRequired, 1),
      ),
    )
    .orderBy(developmentRequiredDocuments.sortOrder, developmentRequiredDocuments.id)) as Array<any>;

  if (!templates.length) return [];

  const persistedRows = await db
    .select({
      templateId: distributionDealDocuments.developmentRequiredDocumentId,
      status: distributionDealDocuments.status,
      submittedFileUrl: distributionDealDocuments.submittedFileUrl,
      submittedFileName: distributionDealDocuments.submittedFileName,
      submittedAt: distributionDealDocuments.submittedAt,
      receivedAt: distributionDealDocuments.receivedAt,
      verifiedAt: distributionDealDocuments.verifiedAt,
      notes: distributionDealDocuments.notes,
    })
    .from(distributionDealDocuments)
    .where(
      and(
        eq(distributionDealDocuments.dealId, input.dealId),
        inArray(
          distributionDealDocuments.developmentRequiredDocumentId,
          templates.map(template => Number(template.templateId)),
        ),
      ),
    );

  const persistedByTemplateId = new Map<number, any>();
  for (const row of persistedRows) {
    persistedByTemplateId.set(Number(row.templateId), row);
  }

  return templates.map(template => {
    const templateId = Number(template.templateId);
    const persisted = persistedByTemplateId.get(templateId);
    return {
      templateId,
      documentCode: String(template.documentCode),
      documentLabel: String(template.documentLabel || ''),
      category: template.category as 'developer_document' | 'client_required_document',
      templateFileUrl: template.templateFileUrl || null,
      templateFileName: template.templateFileName || null,
      isRequired: Boolean(template.isRequired),
      sortOrder: Number(template.sortOrder || 0),
      status: (persisted?.status || 'pending') as PartnerDealDocumentStatus,
      submittedFileUrl: persisted?.submittedFileUrl || null,
      submittedFileName: persisted?.submittedFileName || null,
      submittedAt: persisted?.submittedAt || null,
      receivedAt: persisted?.receivedAt || null,
      verifiedAt: persisted?.verifiedAt || null,
      notes: persisted?.notes || null,
    };
  });
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
      matchSnapshotId: distributionDeals.affordabilityMatchSnapshotId,
      affordabilityPurchasePrice: distributionDeals.affordabilityPurchasePrice,
      status: distributionDeals.currentStage,
      createdAt: distributionDeals.createdAt,
      updatedAt: distributionDeals.updatedAt,
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
      journey: buildJourneyGuidance({
        stage: row.status,
        docProgress: progressMap.get(Number(row.dealId)) || EMPTY_REFERRAL_PROGRESS,
        updatedAt: row.updatedAt,
        createdAt: row.createdAt,
      }),
      dealId: Number(row.dealId),
      development: {
        developmentId: Number(row.developmentId),
        name: String(row.developmentName || `Development #${row.developmentId}`),
      },
      status: String(row.status || 'viewing_scheduled'),
      assessmentId: row.assessmentId ? String(row.assessmentId) : null,
      matchSnapshotId: row.matchSnapshotId ? String(row.matchSnapshotId) : null,
      affordabilityPurchasePrice: toNumberOrNull(row.affordabilityPurchasePrice),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      docProgress: progressMap.get(Number(row.dealId)) || EMPTY_REFERRAL_PROGRESS,
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
      matchSnapshotId: distributionDeals.affordabilityMatchSnapshotId,
      affordabilityPurchasePrice: distributionDeals.affordabilityPurchasePrice,
      affordabilityAssumptionsJson: distributionDeals.affordabilityAssumptionsJson,
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
  const docProgress = progressMap.get(Number(deal.dealId)) || EMPTY_REFERRAL_PROGRESS;

  const events = await db
    .select({
      id: distributionDealEvents.id,
      at: distributionDealEvents.eventAt,
      event: distributionDealEvents.eventType,
      note: distributionDealEvents.notes,
      metadata: distributionDealEvents.metadata,
      actorRole: users.role,
    })
    .from(distributionDealEvents)
    .leftJoin(users, eq(distributionDealEvents.actorUserId, users.id))
    .where(eq(distributionDealEvents.dealId, input.dealId))
    .orderBy(desc(distributionDealEvents.eventAt), desc(distributionDealEvents.id))
    .limit(200);

  // TODO(snapshotting): store immutable terms at submission time when program-term versioning is introduced.
  const programTerms = await getPartnerProgramTermsByDevelopmentId(Number(deal.developmentId));
  const applicationDocuments = await listDealApplicationDocuments(db, {
    dealId: Number(deal.dealId),
    developmentId: Number(deal.developmentId),
  });

  return {
    journey: buildJourneyGuidance({
      stage: deal.status,
      docProgress,
      updatedAt: deal.updatedAt,
      createdAt: deal.createdAt,
    }),
    dealId: Number(deal.dealId),
    development: {
      developmentId: Number(deal.developmentId),
      name: String(deal.developmentName || `Development #${deal.developmentId}`),
      city: deal.city || null,
      province: deal.province || null,
    },
    status: String(deal.status || 'viewing_scheduled'),
    assessmentId: deal.assessmentId ? String(deal.assessmentId) : null,
    matchSnapshotId: deal.matchSnapshotId ? String(deal.matchSnapshotId) : null,
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
    affordability:
      deal.assessmentId && deal.matchSnapshotId
        ? {
            purchasePriceEstimate: toNumberOrNull(deal.affordabilityPurchasePrice),
            assumptions: parseJsonObject(deal.affordabilityAssumptionsJson),
          }
        : null,
    docProgress,
    applicationDocuments,
    programTerms,
    timeline: events.map(event => {
      const metadata = parseJsonObject(event.metadata);
      const isAssessmentAttachment = metadata?.source === 'partner.attachAssessment';
      return {
        at: event.at,
        event: isAssessmentAttachment ? 'Affordability Snapshot Attached' : String(event.event || 'system'),
        byRole: event.actorRole ? String(event.actorRole) : 'system',
        note: event.note || null,
        metadata,
      };
    }),
  };
}

export async function submitReferralDealDocument(
  input: SubmissionActor & {
    dealId: number;
    templateId: number;
    submittedFileUrl: string;
    submittedFileName?: string | null;
    notes?: string | null;
  },
) {
  const db = await resolveDb();
  const [deal] = await db
    .select({
      dealId: distributionDeals.id,
      agentId: distributionDeals.agentId,
      developmentId: distributionDeals.developmentId,
    })
    .from(distributionDeals)
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
      message: 'You can only upload documents for referrals you submitted.',
    });
  }

  const [template] = await db
    .select({
      id: developmentRequiredDocuments.id,
    })
    .from(developmentRequiredDocuments)
    .where(
      and(
        eq(developmentRequiredDocuments.id, input.templateId),
        eq(developmentRequiredDocuments.developmentId, Number(deal.developmentId)),
        eq(developmentRequiredDocuments.isActive, 1),
        eq(developmentRequiredDocuments.isRequired, 1),
      ),
    )
    .limit(1);

  if (!template) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'This application document is not available for this referral.',
    });
  }

  await db
    .insert(distributionDealDocuments)
    .values({
      dealId: input.dealId,
      developmentRequiredDocumentId: input.templateId,
      status: 'received',
      receivedAt: sql`CURRENT_TIMESTAMP`,
      receivedBy: input.actorUserId,
      submittedFileUrl: input.submittedFileUrl,
      submittedFileName: input.submittedFileName || null,
      submittedAt: sql`CURRENT_TIMESTAMP`,
      submittedBy: input.actorUserId,
      notes: input.notes || null,
    })
    .onDuplicateKeyUpdate({
      set: {
        status: 'received',
        receivedAt: sql`CURRENT_TIMESTAMP`,
        receivedBy: input.actorUserId,
        verifiedAt: null,
        verifiedBy: null,
        submittedFileUrl: input.submittedFileUrl,
        submittedFileName: input.submittedFileName || null,
        submittedAt: sql`CURRENT_TIMESTAMP`,
        submittedBy: input.actorUserId,
        notes: input.notes || null,
      },
    });

  if (ENV.distributionDocsV2ReadsEnabled) {
    const [mapRows] = await db.execute(
      `SELECT v2_requirement_id FROM distribution_docs_v2_requirement_map WHERE legacy_required_document_id = ? LIMIT 1`,
      [input.templateId],
    );
    const mappedRequirementId = Array.isArray(mapRows) ? Number((mapRows[0] as any)?.v2_requirement_id || 0) : 0;
    if (mappedRequirementId > 0) {
      await transitionDealRequirementStatus({
        dealId: input.dealId,
        requirementId: mappedRequirementId,
        toStatus: 'uploaded',
        actorUserId: input.actorUserId,
        actorRole: input.actorRole === 'super_admin' ? 'developer_admin' : 'referrer',
        uploadedFileUrl: input.submittedFileUrl,
        uploadedFileName: input.submittedFileName || null,
        notes: input.notes || null,
      });
    }
  }

  return {
    success: true,
    applicationDocuments: await listDealApplicationDocuments(db, {
      dealId: Number(deal.dealId),
      developmentId: Number(deal.developmentId),
    }),
    docProgress:
      (
        await computeDealDocumentProgressMap(db, {
          dealRows: [
            {
              dealId: Number(deal.dealId),
              developmentId: Number(deal.developmentId),
            },
          ],
        })
      ).get(Number(deal.dealId)) || EMPTY_REFERRAL_PROGRESS,
  };
}
