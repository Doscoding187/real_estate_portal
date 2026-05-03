import { TRPCError } from '@trpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import {
  dealRequirementStatuses,
  developments,
  distributionDeals,
  distributionManagerAssignments,
  distributionPrograms,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { evaluatePayoutMilestone } from './distributionPayoutMilestoneService';
import { assertDealIsMutable } from './distributionDealMutationGuards';
import { listDevelopmentRequiredDocumentsOrEmpty } from './distributionRequiredDocumentsService';
import type { DealChecklistPayload, DealDocumentStatus } from './distributionDealDocumentsService';
import { transitionDealRequirementStatus, type DealRequirementStatus } from './distributionDealRequirementStatusService';

type ChecklistOptions = {
  skipAssignmentCheck?: boolean;
};

function toNumberOrNull(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeCommissionModel(value: unknown) {
  const model = value ? String(value) : null;
  if (!model) return null;
  if (model === 'fixed_amount') return 'flat_amount';
  return model;
}

function formatUserDisplayName(row: { name?: string | null; firstName?: string | null; lastName?: string | null }) {
  if (row.name) return row.name;
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  return fullName || undefined;
}

function mapV2ToLegacyStatus(status: DealRequirementStatus): DealDocumentStatus {
  if (status === 'verified' || status === 'waived') return 'verified';
  if (status === 'uploaded' || status === 'pending_review') return 'received';
  if (status === 'rejected') return 'rejected';
  return 'pending';
}

function mapLegacyToV2Target(status: DealDocumentStatus): DealRequirementStatus {
  if (status === 'verified') return 'verified';
  if (status === 'received') return 'pending_review';
  if (status === 'rejected') return 'rejected';
  return 'missing';
}

async function assertAssignedManagerForDevelopment(
  db: any,
  input: {
    developmentId: number;
    actorUserId: number;
    dealManagerUserId?: number | null;
    skipAssignmentCheck?: boolean;
  },
) {
  if (input.skipAssignmentCheck) return;
  const [assignment] = await db
    .select({ id: distributionManagerAssignments.id })
    .from(distributionManagerAssignments)
    .where(
      and(
        eq(distributionManagerAssignments.developmentId, input.developmentId),
        eq(distributionManagerAssignments.managerUserId, input.actorUserId),
        eq(distributionManagerAssignments.isActive, 1),
      ),
    )
    .limit(1);

  if (!assignment) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You are not assigned as an active manager for this development.',
    });
  }

  if (typeof input.dealManagerUserId !== 'number' || input.dealManagerUserId !== input.actorUserId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'This deal is assigned to a different manager.',
    });
  }
}

async function getDealScope(db: any, dealId: number) {
  const [deal] = await db
    .select({
      dealId: distributionDeals.id,
      externalRef: distributionDeals.externalRef,
      buyerName: distributionDeals.buyerName,
      developmentId: distributionDeals.developmentId,
      developmentName: developments.name,
      currentStage: distributionDeals.currentStage,
      managerUserId: distributionDeals.managerUserId,
    })
    .from(distributionDeals)
    .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
    .where(eq(distributionDeals.id, dealId))
    .limit(1);

  if (!deal) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Distribution deal not found.' });
  }

  return {
    dealId: Number(deal.dealId),
    dealRef: String(deal.externalRef || `DEAL-${deal.dealId}`),
    buyerName: deal.buyerName || null,
    developmentId: Number(deal.developmentId),
    developmentName: String(deal.developmentName || `Development #${deal.developmentId}`),
    currentStage: deal.currentStage ? String(deal.currentStage) : null,
    managerUserId: deal.managerUserId ? Number(deal.managerUserId) : null,
  };
}

async function getRequirementIdByLegacyTemplateId(db: any, templateId: number): Promise<number | null> {
  const [rows] = await db.execute(
    `SELECT v2_requirement_id FROM distribution_docs_v2_requirement_map WHERE legacy_required_document_id = ? LIMIT 1`,
    [templateId],
  );
  const row = Array.isArray(rows) ? rows[0] : null;
  return row?.v2_requirement_id ? Number(row.v2_requirement_id) : null;
}

export async function getDealChecklistV2(
  dealId: number,
  actorUserId: number,
  options?: ChecklistOptions,
): Promise<DealChecklistPayload> {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const dealScope = await getDealScope(db, dealId);
  await assertAssignedManagerForDevelopment(db, {
    developmentId: dealScope.developmentId,
    actorUserId,
    dealManagerUserId: dealScope.managerUserId,
    skipAssignmentCheck: options?.skipAssignmentCheck,
  });

  const [program] = await db
    .select({
      id: distributionPrograms.id,
      commissionModel: distributionPrograms.commissionModel,
      defaultCommissionPercent: distributionPrograms.defaultCommissionPercent,
      defaultCommissionAmount: distributionPrograms.defaultCommissionAmount,
      payoutMilestone: distributionPrograms.payoutMilestone,
      currencyCode: distributionPrograms.currencyCode,
    })
    .from(distributionPrograms)
    .where(eq(distributionPrograms.developmentId, dealScope.developmentId))
    .limit(1);

  const templates = (await listDevelopmentRequiredDocumentsOrEmpty(db, dealScope.developmentId)).filter(
    template => template.isActive && template.isRequired,
  );

  const templateToRequirement = new Map<number, number>();
  for (const template of templates) {
    const requirementId = await getRequirementIdByLegacyTemplateId(db, Number(template.id));
    if (requirementId) templateToRequirement.set(Number(template.id), requirementId);
  }

  const requirementIds = Array.from(templateToRequirement.values());
  const persisted = requirementIds.length
    ? await db
        .select({
          id: dealRequirementStatuses.id,
          requirementId: dealRequirementStatuses.requirementId,
          status: dealRequirementStatuses.status,
          submittedAt: dealRequirementStatuses.submittedAt,
          submittedBy: dealRequirementStatuses.submittedBy,
          reviewedAt: dealRequirementStatuses.reviewedAt,
          reviewedBy: dealRequirementStatuses.reviewedBy,
          uploadedFileUrl: dealRequirementStatuses.uploadedFileUrl,
          uploadedFileName: dealRequirementStatuses.uploadedFileName,
          notes: dealRequirementStatuses.notes,
        })
        .from(dealRequirementStatuses)
        .where(
          and(
            eq(dealRequirementStatuses.dealId, dealScope.dealId),
            inArray(dealRequirementStatuses.requirementId, requirementIds),
          ),
        )
    : [];

  const persistedByRequirementId = new Map<number, (typeof persisted)[number]>();
  const actorIds = new Set<number>();
  persisted.forEach(row => {
    persistedByRequirementId.set(Number(row.requirementId), row);
    if (row.submittedBy) actorIds.add(Number(row.submittedBy));
    if (row.reviewedBy) actorIds.add(Number(row.reviewedBy));
  });

  const actorDirectory = new Map<number, { name?: string }>();
  if (actorIds.size) {
    const actorRows = await db
      .select({ id: users.id, name: users.name, firstName: users.firstName, lastName: users.lastName })
      .from(users)
      .where(inArray(users.id, Array.from(actorIds)));
    actorRows.forEach(row => actorDirectory.set(Number(row.id), { name: formatUserDisplayName(row) }));
  }

  const requiredDocuments: DealChecklistPayload['requiredDocuments'] = templates.map(template => {
    const templateId = Number(template.id);
    const requirementId = templateToRequirement.get(templateId);
    const row = requirementId ? persistedByRequirementId.get(requirementId) : null;
    const v2Status = (row?.status || 'missing') as DealRequirementStatus;
    const legacyStatus = mapV2ToLegacyStatus(v2Status);
    const submittedById = row?.submittedBy ? Number(row.submittedBy) : null;
    const reviewedById = row?.reviewedBy ? Number(row.reviewedBy) : null;
    const receivedAt = row?.submittedAt || null;
    const verifiedAt = row?.reviewedAt || null;

    return {
      templateId,
      documentCode: String(template.documentCode),
      documentLabel: String(template.documentLabel || ''),
      category: template.category,
      templateFileUrl: template.templateFileUrl || null,
      templateFileName: template.templateFileName || null,
      templateUploadedAt: template.templateUploadedAt || null,
      isRequired: Boolean(template.isRequired),
      sortOrder: Number(template.sortOrder || 0),
      isActive: Boolean(template.isActive),
      status: legacyStatus,
      receivedAt,
      verifiedAt,
      submittedFileUrl: row?.uploadedFileUrl || null,
      submittedFileName: row?.uploadedFileName || null,
      submittedAt: row?.submittedAt || null,
      receivedBy: submittedById
        ? { userId: submittedById, name: actorDirectory.get(submittedById)?.name }
        : null,
      verifiedBy: reviewedById
        ? { userId: reviewedById, name: actorDirectory.get(reviewedById)?.name }
        : null,
      submittedBy: submittedById
        ? { userId: submittedById, name: actorDirectory.get(submittedById)?.name }
        : null,
      notes: row?.notes || null,
    };
  });

  const requiredOnly = requiredDocuments.filter(document => document.isRequired && document.isActive);
  const requiredCount = requiredOnly.length;
  const verifiedRequiredCount = requiredOnly.filter(document => document.status === 'verified').length;
  const allRequiredVerified = requiredCount > 0 ? verifiedRequiredCount === requiredCount : true;

  const payoutMilestone = program?.payoutMilestone ? String(program.payoutMilestone) : null;
  const payoutReadiness = evaluatePayoutMilestone({
    payoutMilestone,
    currentStage: dealScope.currentStage,
    requiredDocumentStatuses: requiredOnly.map(document => ({
      documentCode: document.documentCode,
      status: document.status,
      isRequired: document.isRequired,
    })),
  });

  return {
    dealId: dealScope.dealId,
    dealRef: dealScope.dealRef,
    buyerName: dealScope.buyerName,
    developmentId: dealScope.developmentId,
    developmentName: dealScope.developmentName,
    programId: program ? Number(program.id) : null,
    payoutMilestone,
    currencyCode: program?.currencyCode ? String(program.currencyCode) : null,
    commissionSummary: {
      commissionModel: normalizeCommissionModel(program?.commissionModel),
      defaultCommissionPercent: toNumberOrNull(program?.defaultCommissionPercent),
      defaultCommissionAmount: toNumberOrNull(program?.defaultCommissionAmount),
    },
    requiredDocuments,
    computed: {
      requiredCount,
      verifiedRequiredCount,
      allRequiredVerified,
      payoutReady: payoutReadiness.ready,
      blockers: payoutReadiness.blockers,
    },
  };
}

export async function upsertDealDocumentStatusV2(
  input: {
    dealId: number;
    templateId: number;
    status: DealDocumentStatus;
    notes?: string | null;
    submittedFileUrl?: string | null;
    submittedFileName?: string | null;
  },
  actorUserId: number,
  options?: ChecklistOptions,
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const dealScope = await getDealScope(db, input.dealId);
  assertDealIsMutable(dealScope.currentStage, 'update checklist documents');
  await assertAssignedManagerForDevelopment(db, {
    developmentId: dealScope.developmentId,
    actorUserId,
    dealManagerUserId: dealScope.managerUserId,
    skipAssignmentCheck: options?.skipAssignmentCheck,
  });

  const requirementId = await getRequirementIdByLegacyTemplateId(db, input.templateId);
  if (!requirementId) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'No V2 requirement mapping exists for this legacy template.',
    });
  }

  const [existing] = await db
    .select({ status: dealRequirementStatuses.status })
    .from(dealRequirementStatuses)
    .where(
      and(
        eq(dealRequirementStatuses.dealId, input.dealId),
        eq(dealRequirementStatuses.requirementId, requirementId),
      ),
    )
    .limit(1);

  const currentStatus = (existing?.status || 'missing') as DealRequirementStatus;
  const target = mapLegacyToV2Target(input.status);

  // Compatibility bridge with existing manager UX that allows direct jumps to verified/rejected.
  if (target === 'verified') {
    if (currentStatus === 'missing') {
      await transitionDealRequirementStatus({
        dealId: input.dealId,
        requirementId,
        toStatus: 'uploaded',
        actorUserId,
        actorRole: 'manager',
        uploadedFileUrl: input.submittedFileUrl,
        uploadedFileName: input.submittedFileName,
        notes: input.notes,
      });
      await transitionDealRequirementStatus({
        dealId: input.dealId,
        requirementId,
        toStatus: 'pending_review',
        actorUserId,
        actorRole: 'manager',
        notes: input.notes,
      });
    } else if (currentStatus === 'uploaded') {
      await transitionDealRequirementStatus({
        dealId: input.dealId,
        requirementId,
        toStatus: 'pending_review',
        actorUserId,
        actorRole: 'manager',
        notes: input.notes,
      });
    }
  }

  if (target === 'rejected' && currentStatus === 'missing') {
    await transitionDealRequirementStatus({
      dealId: input.dealId,
      requirementId,
      toStatus: 'uploaded',
      actorUserId,
      actorRole: 'manager',
      uploadedFileUrl: input.submittedFileUrl,
      uploadedFileName: input.submittedFileName,
      notes: input.notes,
    });
  }

  await transitionDealRequirementStatus({
    dealId: input.dealId,
    requirementId,
    toStatus: target,
    actorUserId,
    actorRole: 'manager',
    uploadedFileUrl: input.submittedFileUrl,
    uploadedFileName: input.submittedFileName,
    notes: input.notes,
  });

  return getDealChecklistV2(input.dealId, actorUserId, options);
}
