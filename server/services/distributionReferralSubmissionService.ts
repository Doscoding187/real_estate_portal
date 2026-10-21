import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, sql, type SQL } from 'drizzle-orm';
import {
  distributionDealDocuments,
  distributionDealEvents,
  distributionDeals,
  distributionManagerAssignments,
  distributionPrograms,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { requireApprovedAffordabilityModel } from './affordabilityAssessmentService';
import { getDevelopmentSalesProjection } from './distributionDeveloperReadPort';
import {
  assertPartnerDevelopmentProgramAccess,
  assertPartnerDevelopmentReferralOpen,
} from './distributionPartnerProgramAccessService';
import {
  buildDistributionReferralTermsSnapshot,
  isValidDistributionReferralTermsSnapshot,
} from './distributionReferralTermsSnapshotService';
import { resolveDealRequirementSnapshots } from './distributionDealRequirementsSnapshotService';
import {
  getReferralWorkflowProgress,
  getReferralWorkflowProgressForDeals,
} from './distributionDealWorkflowProgressService';
import {
  buildReferralIntakeEvidenceSnapshot,
  getCompletePartnerReferralIntakeSession,
  markReferralIntakeSubmitted,
} from './distributionReferralIntakeWorkflowService';
import { parseDistributionDealDocumentReference } from './distributionReferralEvidenceStorage';
import {
  attachProspectCheckFitToDeal,
  readProspectCheckFitForSubmission,
} from './distributionProspectCheckFitService';

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

function toPartnerVisibleReferralTermsSnapshot(
  snapshot: Record<string, unknown> | null,
  expectedDigest: string | null | undefined,
): Record<string, unknown> | null {
  if (!snapshot || !isValidDistributionReferralTermsSnapshot(snapshot, expectedDigest)) return null;
  const program = parseJsonObject(snapshot.program);
  const developerSalesSnapshot = parseJsonObject(snapshot.developerSalesSnapshot);

  // Keep this as an allow-list: private intake evidence and policy internals
  // remain inside Distribution's referral workflow.
  return {
    version: snapshot.version,
    capturedAt: snapshot.capturedAt,
    developmentId: snapshot.developmentId,
    marketMode: snapshot.marketMode,
    developerProjectionRevision: snapshot.developerProjectionRevision,
    ...(developerSalesSnapshot ? { developerSalesSnapshot } : {}),
    ...(program
      ? {
          program: {
            referrerCommissionType: program.referrerCommissionType,
            referrerCommissionValue: program.referrerCommissionValue,
            referrerCommissionBasis: program.referrerCommissionBasis,
            currencyCode: program.currencyCode,
            payoutMilestone: program.payoutMilestone,
            payoutMilestoneNotes: program.payoutMilestoneNotes,
          },
        }
      : {}),
    requiredDocuments: Array.isArray(snapshot.requiredDocuments)
      ? snapshot.requiredDocuments.flatMap(value => {
          if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
          const document = value as Record<string, unknown>;
          return [
            {
              documentCode: document.documentCode,
              documentLabel: document.documentLabel,
              category: document.category,
              isRequired: document.isRequired,
              sortOrder: document.sortOrder,
            },
          ];
        })
      : [],
  };
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
      managerUserId: distributionManagerAssignments.managerUserId,
    })
    .from(distributionManagerAssignments)
    .where(
      and(
        eq(distributionManagerAssignments.developmentId, developmentId),
        eq(distributionManagerAssignments.isActive, 1),
        eq(distributionManagerAssignments.isPrimary, 1),
      ),
    )
    .orderBy(desc(distributionManagerAssignments.assignedAt))
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

export async function createReferralDeal(
  input: SubmissionActor & {
    developmentId: number;
    marketMode: 'sale' | 'rent';
    intakeSessionUuid: string;
    buyerName?: string | null;
    buyerPhone?: string | null;
    buyerEmail?: string | null;
    notes?: string | null;
    clientReference?: string | null;
    assessmentId?: string | null;
    checkFitId?: string | null;
  },
) {
  if (String(input.assessmentId || '').trim()) requireApprovedAffordabilityModel();

  const db = await resolveDb();
  await assertPartnerDevelopmentProgramAccess({
    db,
    actor: {
      userId: input.actorUserId,
      role: input.actorRole,
    },
    developmentId: input.developmentId,
  });
  await assertPartnerDevelopmentReferralOpen({ db, developmentId: input.developmentId });

  const checkFitId = String(input.checkFitId || '').trim();
  const checkFit = checkFitId
    ? await readProspectCheckFitForSubmission({
        db,
        actorUserId: input.actorUserId,
        checkFitId,
        developmentId: input.developmentId,
      })
    : null;

  const [distributionProgram] = await db
    .select({ programId: distributionPrograms.id })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, input.developmentId))
    .limit(1);
  const programId = Number(distributionProgram?.programId || 0);
  if (!programId) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This Distribution opportunity is no longer active.',
    });
  }
  const eligibility = { programId };

  // Confirm current Developer marketability through the Developer-owned
  // projection before reading referral evidence.
  const developerProjection = await getDevelopmentSalesProjection(input.developmentId);
  if (!developerProjection) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'Current availability for this opportunity could not be confirmed, so referral submission is temporarily unavailable.',
    });
  }

  const projectionMode = input.marketMode === 'sale' ? 'for_sale' : 'for_rent';
  const requestedMode = developerProjection.inventory.modes[projectionMode];
  if (
    developerProjection.campaign.visible !== true ||
    developerProjection.inventory.phaseScope === 'unscoped-hidden' ||
    !requestedMode ||
    !Number.isFinite(Number(requestedMode.availableCount)) ||
    Number(requestedMode.availableCount) <= 0 ||
    !Number.isFinite(Number(requestedMode.priceFrom)) ||
    Number(requestedMode.priceFrom) <= 0 ||
    !Number.isFinite(Number(requestedMode.priceTo)) ||
    Number(requestedMode.priceTo) < Number(requestedMode.priceFrom) ||
    requestedMode.priceBasis !== (input.marketMode === 'sale' ? 'purchase_price' : 'monthly_rent')
  ) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `The Developer Engine has no current marketable ${input.marketMode} inventory for this opportunity.`,
    });
  }

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

  const intakeSession = await getCompletePartnerReferralIntakeSession({
    sessionUuid: input.intakeSessionUuid,
    partnerUserId: input.actorUserId,
    developmentId: input.developmentId,
    db,
  });
  const intakeEvidenceSnapshot = buildReferralIntakeEvidenceSnapshot(intakeSession);

  const duplicateByBuyer = await findDuplicateByBuyerIdentity(db, {
    actorUserId: input.actorUserId,
    developmentId: input.developmentId,
    buyerEmail: input.buyerEmail,
    buyerPhone: input.buyerPhone,
  });

  if (duplicateByBuyer) {
    buildDuplicateReferralError(Number(duplicateByBuyer.dealId));
  }

  const referralTermsSnapshot = await buildDistributionReferralTermsSnapshot({
    db,
    developmentId: input.developmentId,
    developerProjection,
    marketMode: input.marketMode,
    intakeEvidenceSnapshot,
  });
  if (!referralTermsSnapshot) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Current Distribution referral terms could not be captured.',
    });
  }

  const managerUserId = await pickManagerForDevelopment(input.developmentId, { db });
  const buyerName = String(input.buyerName || '').trim() || 'Buyer Pending';
  const buyerPhone = String(input.buyerPhone || '').trim() || null;
  const buyerEmail = String(input.buyerEmail || '').trim() || null;
  const result = await db.transaction(async tx => {
    const [insertDealResult] = await tx.insert(distributionDeals).values({
      programId: eligibility.programId,
      developmentId: input.developmentId,
      agentId: input.actorUserId,
      managerUserId,
      externalRef: normalizedClientReference,
      buyerName,
      buyerPhone,
      buyerEmail,
      marketMode: input.marketMode,
      developerProjectionRevision: developerProjection.revision,
      developerProjectionObservedAt: toSqlDateTime(new Date(developerProjection.observedAt)),
      referralTermsSnapshotJson: referralTermsSnapshot as any,
      referralTermsSnapshotDigest: referralTermsSnapshot.digest,
      currentStage: 'referral_received',
      commissionStatus: 'not_ready',
      attributionLockedAt: sql`CURRENT_TIMESTAMP`,
      attributionLockedBy: input.actorUserId,
      ...(checkFit
        ? {
            prospectCheckFitId: checkFit.record.id,
            affordabilityPurchasePrice: checkFit.record.outputs.estimatedPurchasePrice,
            affordabilityAssumptionsJson: {
              policyVersion: checkFit.record.policyVersion,
              assumptions: checkFit.record.assumptions,
              outputs: checkFit.record.outputs,
              qualifiedDevelopmentCount: checkFit.record.outputs.qualifiedDevelopmentCount,
            } as any,
          }
        : {}),
    });

    const dealId = Number((insertDealResult as any).insertId || 0);
    if (!dealId) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to create referral deal.',
      });
    }

    if (checkFit) {
      const locked = await attachProspectCheckFitToDeal({
        tx,
        actorUserId: input.actorUserId,
        checkFitId: checkFit.record.id,
        dealId,
      });
      if (!locked) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'This check fit is already attached to a referral.',
        });
      }
    }

    await tx.insert(distributionDealEvents).values({
      dealId,
      fromStage: null,
      toStage: 'referral_received',
      eventType: 'system',
      actorUserId: input.actorUserId,
      metadata: {
        source: 'partner.submitReferral',
        programId: eligibility.programId,
        developmentId: input.developmentId,
        managerAssigned: managerUserId,
        marketMode: input.marketMode,
        developerProjectionRevision: developerProjection.revision,
        referralTermsSnapshotDigest: referralTermsSnapshot.digest,
        ...(checkFit
          ? {
              prospectCheckFitId: checkFit.record.id,
              prospectCheckFitPolicyVersion: checkFit.record.policyVersion,
              estimatedPurchasePrice: checkFit.record.outputs.estimatedPurchasePrice,
            }
          : {}),
      } as any,
      notes: input.notes ?? null,
    });

    await markReferralIntakeSubmitted({
      tx,
      sessionId: intakeSession.id,
      sessionUuid: input.intakeSessionUuid,
      developmentId: input.developmentId,
      partnerUserId: input.actorUserId,
      dealId,
      developerProjectionRevision: developerProjection.revision,
      referralTermsSnapshotDigest: referralTermsSnapshot.digest,
    });

    const templateIds = Array.isArray(referralTermsSnapshot.requiredDocuments)
      ? referralTermsSnapshot.requiredDocuments.map(document => Number(document.templateId))
      : [];
    if (templateIds.some(templateId => !Number.isInteger(templateId) || templateId <= 0)) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'The saved referral document requirements could not be confirmed.',
      });
    }
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
        marketMode: distributionDeals.marketMode,
        developerProjectionRevision: distributionDeals.developerProjectionRevision,
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
      marketMode: createdDeal?.marketMode || input.marketMode,
      developerProjectionRevision: createdDeal?.developerProjectionRevision || developerProjection.revision,
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

type PartnerDealDocumentStatus = 'pending' | 'received' | 'verified' | 'rejected' | 'unavailable';

async function computeDealDocumentProgressMap(
  db: DbExecutor,
  input: {
    dealRows: Array<{ dealId: number; developmentId: number }>;
  },
) {
  const progressMap = new Map<number, ReferralProgress>();
  if (!input.dealRows.length) return progressMap;

  const dealIds = input.dealRows.map(row => Number(row.dealId));

  const dealSnapshots = await db
    .select({
      dealId: distributionDeals.id,
      developmentId: distributionDeals.developmentId,
      referralTermsSnapshotJson: distributionDeals.referralTermsSnapshotJson,
      referralTermsSnapshotDigest: distributionDeals.referralTermsSnapshotDigest,
    })
    .from(distributionDeals)
    .where(inArray(distributionDeals.id, dealIds));

  const resolvedRequirements = await resolveDealRequirementSnapshots(
    db,
    dealSnapshots.map(row => ({
      dealId: Number(row.dealId),
      developmentId: Number(row.developmentId),
      snapshotJson: row.referralTermsSnapshotJson,
      snapshotDigest: row.referralTermsSnapshotDigest,
    })),
  );
  const templateIds = Array.from(
    new Set(
      Array.from(resolvedRequirements.values()).flatMap(snapshot =>
        snapshot.requirements.flatMap(document =>
          document.templateId === null ? [] : [document.templateId],
        ),
      ),
    ),
  );
  const persistedRows = templateIds.length
    ? await db
        .select({
          dealId: distributionDealDocuments.dealId,
          templateId: distributionDealDocuments.developmentRequiredDocumentId,
          status: distributionDealDocuments.status,
        })
        .from(distributionDealDocuments)
        .where(
          and(
            inArray(distributionDealDocuments.dealId, dealIds),
            inArray(distributionDealDocuments.developmentRequiredDocumentId, templateIds),
          ),
        )
    : [];

  const verifiedTemplateIdsByDeal = new Map<number, Set<number>>();
  for (const row of persistedRows) {
    if (row.status !== 'verified') continue;
    const dealId = Number(row.dealId);
    const current = verifiedTemplateIdsByDeal.get(dealId) || new Set<number>();
    current.add(Number(row.templateId));
    verifiedTemplateIdsByDeal.set(dealId, current);
  }

  for (const row of input.dealRows) {
    const snapshot = resolvedRequirements.get(Number(row.dealId));
    const requirements = snapshot?.snapshotValid ? snapshot.requirements : [];
    const verifiedTemplateIds =
      verifiedTemplateIdsByDeal.get(Number(row.dealId)) || new Set<number>();
    progressMap.set(Number(row.dealId), {
      requiredCount: requirements.length,
      verifiedRequiredCount: requirements.filter(
        document => document.templateId !== null && verifiedTemplateIds.has(document.templateId),
      ).length,
    });
  }

  return progressMap;
}

async function listDealApplicationDocuments(
  db: DbExecutor,
  input: {
    dealId: number;
    requiredDocuments: Array<{
      templateId: number | null;
      documentCode: string;
      documentLabel: string;
      sortOrder: number;
      isAvailable: boolean;
    }>;
  },
) {
  const requiredDocuments = input.requiredDocuments;
  if (!requiredDocuments.length) return [];

  const templateIds = Array.from(
    new Set(
      requiredDocuments.flatMap(document =>
        document.templateId === null ? [] : [document.templateId],
      ),
    ),
  );
  const persistedRows = templateIds.length
    ? await db
        .select({
          templateId: distributionDealDocuments.developmentRequiredDocumentId,
          status: distributionDealDocuments.status,
          submittedAt: distributionDealDocuments.submittedAt,
          submittedFileUrl: distributionDealDocuments.submittedFileUrl,
          submittedFileName: distributionDealDocuments.submittedFileName,
          receivedAt: distributionDealDocuments.receivedAt,
          verifiedAt: distributionDealDocuments.verifiedAt,
          notes: distributionDealDocuments.notes,
        })
        .from(distributionDealDocuments)
        .where(
          and(
            eq(distributionDealDocuments.dealId, input.dealId),
            inArray(distributionDealDocuments.developmentRequiredDocumentId, templateIds),
          ),
        )
    : [];

  const persistedByTemplateId = new Map<number, any>();
  for (const row of persistedRows) {
    persistedByTemplateId.set(Number(row.templateId), row);
  }

  return requiredDocuments.map(document => {
    const persisted = document.templateId === null
      ? null
      : persistedByTemplateId.get(document.templateId);
    if (!document.isAvailable || !persisted) {
      return {
        templateId: document.templateId,
        documentCode: document.documentCode,
        documentLabel: document.documentLabel,
        category: 'client_required_document' as const,
        isRequired: true,
        sortOrder: document.sortOrder,
        status: 'unavailable' as const,
        submittedAt: null,
        submittedFileName: null,
        hasFile: false,
        receivedAt: null,
        verifiedAt: null,
        notes: null,
      };
    }
    return {
      templateId: document.templateId,
      documentCode: document.documentCode,
      documentLabel: document.documentLabel,
      category: 'client_required_document' as const,
      isRequired: true,
      sortOrder: document.sortOrder,
      status: (persisted?.status || 'pending') as PartnerDealDocumentStatus,
      submittedAt: persisted?.submittedAt || null,
      submittedFileName: persisted?.submittedFileName || null,
      hasFile: Boolean(parseDistributionDealDocumentReference(persisted?.submittedFileUrl)),
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
      programId: distributionDeals.programId,
      marketMode: distributionDeals.marketMode,
      developerProjectionRevision: distributionDeals.developerProjectionRevision,
      developerProjectionObservedAt: distributionDeals.developerProjectionObservedAt,
      referralTermsSnapshotJson: distributionDeals.referralTermsSnapshotJson,
      referralTermsSnapshotDigest: distributionDeals.referralTermsSnapshotDigest,
      status: distributionDeals.currentStage,
      managerUserId: distributionDeals.managerUserId,
      managerName: users.name,
      managerFirstName: users.firstName,
      managerLastName: users.lastName,
      managerEmail: users.email,
      createdAt: distributionDeals.createdAt,
      updatedAt: distributionDeals.updatedAt,
    })
    .from(distributionDeals)
    .leftJoin(users, eq(distributionDeals.managerUserId, users.id))
    .where(withConditions(conditions))
    .orderBy(desc(distributionDeals.id))
    .limit(normalizedLimit + 1);

  const hasMore = rows.length > normalizedLimit;
  const pageRows = hasMore ? rows.slice(0, normalizedLimit) : rows;

  const [progressMap, workflowProgressMap] = await Promise.all([
    computeDealDocumentProgressMap(db, {
      dealRows: pageRows.map(row => ({
        dealId: Number(row.dealId),
        developmentId: Number(row.developmentId),
      })),
    }),
    getReferralWorkflowProgressForDeals(
      db,
      pageRows.map(row => ({
        dealId: Number(row.dealId),
        referralTermsSnapshotJson: row.referralTermsSnapshotJson,
        referralTermsSnapshotDigest: row.referralTermsSnapshotDigest,
      })),
    ),
  ]);

  return {
    items: pageRows.map(row => {
      const snapshot = parseJsonObject(row.referralTermsSnapshotJson);
      const salesSnapshot = parseJsonObject(snapshot?.developerSalesSnapshot);
      const campaign = parseJsonObject(salesSnapshot?.campaign);
      const docProgress = progressMap.get(Number(row.dealId)) || {
        requiredCount: 0,
        verifiedRequiredCount: 0,
      };
      return {
        dealId: Number(row.dealId),
        development: {
          developmentId: Number(row.developmentId),
          name: String(campaign?.name || `Development #${row.developmentId}`),
        },
        status: String(row.status || 'submitted'),
        marketMode: row.marketMode || null,
        developerProjectionRevision: row.developerProjectionRevision || null,
        developerProjectionObservedAt: row.developerProjectionObservedAt || null,
        referralTermsSnapshotDigest: row.referralTermsSnapshotDigest || null,
        manager: row.managerUserId
          ? {
              userId: Number(row.managerUserId),
              displayName:
                String(row.managerName || '').trim() ||
                [row.managerFirstName, row.managerLastName].filter(Boolean).join(' ').trim() ||
                null,
              email: row.managerEmail || null,
            }
          : null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        docProgress,
        workflowProgress: workflowProgressMap.get(Number(row.dealId)) || null,
      };
    }),
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
      buyerName: distributionDeals.buyerName,
      buyerEmail: distributionDeals.buyerEmail,
      buyerPhone: distributionDeals.buyerPhone,
      status: distributionDeals.currentStage,
      marketMode: distributionDeals.marketMode,
      developerProjectionRevision: distributionDeals.developerProjectionRevision,
      developerProjectionObservedAt: distributionDeals.developerProjectionObservedAt,
      referralTermsSnapshotJson: distributionDeals.referralTermsSnapshotJson,
      referralTermsSnapshotDigest: distributionDeals.referralTermsSnapshotDigest,
      managerUserId: distributionDeals.managerUserId,
      managerName: users.name,
      managerFirstName: users.firstName,
      managerLastName: users.lastName,
      managerEmail: users.email,
      createdAt: distributionDeals.createdAt,
      updatedAt: distributionDeals.updatedAt,
    })
    .from(distributionDeals)
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
      metadata: distributionDealEvents.metadata,
      actorRole: users.role,
    })
    .from(distributionDealEvents)
    .leftJoin(users, eq(distributionDealEvents.actorUserId, users.id))
    .where(eq(distributionDealEvents.dealId, input.dealId))
    .orderBy(desc(distributionDealEvents.eventAt), desc(distributionDealEvents.id))
    .limit(200);

  const programTermsSnapshot = parseJsonObject(deal.referralTermsSnapshotJson);
  const partnerVisibleTermsSnapshot = toPartnerVisibleReferralTermsSnapshot(
    programTermsSnapshot,
    deal.referralTermsSnapshotDigest,
  );
  const salesSnapshot = partnerVisibleTermsSnapshot
    ? parseJsonObject(programTermsSnapshot?.developerSalesSnapshot)
    : null;
  const snapshotCampaign = parseJsonObject(salesSnapshot?.campaign);
  const savedWorkflowProgress = await getReferralWorkflowProgress(db, Number(deal.dealId));
  const workflowProgress = savedWorkflowProgress.verified ? savedWorkflowProgress : null;
  const resolvedRequirementSnapshots = await resolveDealRequirementSnapshots(db, [
    {
      dealId: Number(deal.dealId),
      developmentId: Number(deal.developmentId),
      snapshotJson: deal.referralTermsSnapshotJson,
      snapshotDigest: deal.referralTermsSnapshotDigest,
    },
  ]);
  const resolvedRequirementSnapshot = resolvedRequirementSnapshots.get(Number(deal.dealId));
  const applicationDocuments = await listDealApplicationDocuments(db, {
    dealId: Number(deal.dealId),
    requiredDocuments:
      resolvedRequirementSnapshot?.snapshotValid ? resolvedRequirementSnapshot.requirements : [],
  });

  return {
    dealId: Number(deal.dealId),
    development: {
      developmentId: Number(deal.developmentId),
      name: String(snapshotCampaign?.name || `Development #${deal.developmentId}`),
      city: snapshotCampaign?.city ? String(snapshotCampaign.city) : null,
      province: snapshotCampaign?.province ? String(snapshotCampaign.province) : null,
    },
    status: String(deal.status || 'submitted'),
    marketMode: deal.marketMode || null,
    developerProjectionRevision: deal.developerProjectionRevision || null,
    developerProjectionObservedAt: deal.developerProjectionObservedAt || null,
    referralTermsSnapshotDigest: deal.referralTermsSnapshotDigest || null,
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
    applicationDocuments,
    programTermsSnapshot: partnerVisibleTermsSnapshot,
    workflowProgress,
    timeline: events.flatMap(event => {
      const metadata = parseJsonObject(event.metadata);
      if (metadata?.source === 'manager.updateReferralWorkflowStep') return [];
      const isAssessmentAttachment = metadata?.source === 'partner.attachAssessment';
      return [{
        at: event.at,
        event: isAssessmentAttachment ? 'Affordability Snapshot Attached' : String(event.event || 'system'),
        byRole: event.actorRole ? String(event.actorRole) : 'system',
        note: event.note || null,
      }];
    }),
  };
}
