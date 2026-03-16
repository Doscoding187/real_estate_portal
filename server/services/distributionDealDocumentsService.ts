import { TRPCError } from '@trpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import {
  developments,
  distributionDealDocuments,
  distributionDeals,
  distributionManagerAssignments,
  distributionPrograms,
  users,
} from '../../drizzle/schema';
import { getDb } from '../db';
import { evaluatePayoutMilestone } from './distributionPayoutMilestoneService';
import { assertDealIsMutable } from './distributionDealMutationGuards';
import { listDevelopmentRequiredDocumentsOrEmpty } from './distributionRequiredDocumentsService';

export type DealDocumentStatus = 'pending' | 'received' | 'verified' | 'rejected';

type ChecklistOptions = {
  skipAssignmentCheck?: boolean;
};

export type DealChecklistPayload = {
  dealId: number;
  dealRef: string;
  buyerName: string | null;
  developmentId: number;
  developmentName: string;
  programId: number | null;
  payoutMilestone: string | null;
  currencyCode: string | null;
  commissionSummary: {
    commissionModel: string | null;
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
  };
  requiredDocuments: Array<{
    templateId: number;
    documentCode: string;
    documentLabel: string;
    category: 'developer_document' | 'client_required_document';
    isRequired: boolean;
    sortOrder: number;
    isActive: boolean;
    status: DealDocumentStatus;
    receivedAt: string | null;
    verifiedAt: string | null;
    receivedBy: { userId: number; name?: string } | null;
    verifiedBy: { userId: number; name?: string } | null;
    notes: string | null;
  }>;
  computed: {
    requiredCount: number;
    verifiedRequiredCount: number;
    allRequiredVerified: boolean;
    payoutReady: boolean;
    blockers: string[];
  };
};

type UpsertDealDocumentStatusInput = {
  dealId: number;
  templateId: number;
  status: DealDocumentStatus;
  notes?: string | null;
};

function boolFromTinyInt(value: unknown) {
  return Number(value || 0) === 1;
}

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

function sqlDateNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
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
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Distribution deal not found.',
    });
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

export async function getDealChecklist(
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
    template => template.isActive && template.category === 'client_required_document',
  );

  const templateIds = templates.map(template => Number(template.id));
  const persistedDealDocs = templateIds.length
    ? await db
        .select({
          id: distributionDealDocuments.id,
          developmentRequiredDocumentId: distributionDealDocuments.developmentRequiredDocumentId,
          status: distributionDealDocuments.status,
          receivedAt: distributionDealDocuments.receivedAt,
          verifiedAt: distributionDealDocuments.verifiedAt,
          receivedBy: distributionDealDocuments.receivedBy,
          verifiedBy: distributionDealDocuments.verifiedBy,
          notes: distributionDealDocuments.notes,
        })
        .from(distributionDealDocuments)
        .where(
          and(
            eq(distributionDealDocuments.dealId, dealScope.dealId),
            inArray(distributionDealDocuments.developmentRequiredDocumentId, templateIds),
          ),
        )
    : [];

  const persistedByTemplateId = new Map<number, (typeof persistedDealDocs)[number]>();
  const actorIds = new Set<number>();
  for (const row of persistedDealDocs) {
    persistedByTemplateId.set(Number(row.developmentRequiredDocumentId), row);
    if (row.receivedBy) actorIds.add(Number(row.receivedBy));
    if (row.verifiedBy) actorIds.add(Number(row.verifiedBy));
  }

  const actorDirectory = new Map<number, { name?: string }>();
  if (actorIds.size) {
    const actorRows = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(users)
      .where(inArray(users.id, Array.from(actorIds)));
    for (const row of actorRows) {
      actorDirectory.set(Number(row.id), { name: formatUserDisplayName(row) });
    }
  }

  const requiredDocuments: DealChecklistPayload['requiredDocuments'] = templates.map(template => {
    const templateId = Number(template.id);
    const persisted = persistedByTemplateId.get(templateId);
    const receivedById = persisted?.receivedBy ? Number(persisted.receivedBy) : null;
    const verifiedById = persisted?.verifiedBy ? Number(persisted.verifiedBy) : null;
    const status = (persisted?.status || 'pending') as DealDocumentStatus;

    return {
      templateId,
      documentCode: String(template.documentCode),
      documentLabel: String(template.documentLabel || ''),
      category: template.category,
      isRequired: Boolean(template.isRequired),
      sortOrder: Number(template.sortOrder || 0),
      isActive: Boolean(template.isActive),
      status,
      receivedAt: persisted?.receivedAt || null,
      verifiedAt: persisted?.verifiedAt || null,
      receivedBy: receivedById
        ? {
            userId: receivedById,
            name: actorDirectory.get(receivedById)?.name,
          }
        : null,
      verifiedBy: verifiedById
        ? {
            userId: verifiedById,
            name: actorDirectory.get(verifiedById)?.name,
          }
        : null,
      notes: persisted?.notes || null,
    };
  });

  const requiredOnly = requiredDocuments.filter(document => document.isRequired);
  const requiredCount = requiredOnly.length;
  const verifiedRequiredCount = requiredOnly.filter(document => document.status === 'verified').length;
  const allRequiredVerified = requiredCount > 0 && verifiedRequiredCount >= requiredCount;
  const payoutMilestone = program?.payoutMilestone ? String(program.payoutMilestone) : null;
  const payoutMilestoneEvaluation = evaluatePayoutMilestone({
    payoutMilestone,
    currentStage: dealScope.currentStage,
    documents: requiredDocuments.map(document => ({
      documentCode: document.documentCode,
      status: document.status,
    })),
  });
  const payoutMilestoneSatisfied = payoutMilestoneEvaluation.satisfied;
  const payoutReady = allRequiredVerified && payoutMilestoneSatisfied;
  const blockers: string[] = [];

  if (requiredCount === 0) {
    blockers.push('No required document templates are configured for this development.');
  } else if (!allRequiredVerified) {
    const remaining = requiredCount - verifiedRequiredCount;
    blockers.push(
      `${remaining} required document${remaining === 1 ? '' : 's'} still need verification.`,
    );
  }

  blockers.push(...payoutMilestoneEvaluation.blockers);

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
      payoutReady,
      blockers,
    },
  };
}

export async function upsertDealDocumentStatus(
  input: UpsertDealDocumentStatusInput,
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

  const template = (
    await listDevelopmentRequiredDocumentsOrEmpty(db, dealScope.developmentId)
  ).find(
    candidate =>
      candidate.id === input.templateId &&
      candidate.isActive &&
      candidate.category === 'client_required_document',
  );

  if (!template) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Document template is not available for this deal development.',
    });
  }

  await db.transaction(async tx => {
    const [existing] = await tx
      .select({
        id: distributionDealDocuments.id,
        status: distributionDealDocuments.status,
        receivedAt: distributionDealDocuments.receivedAt,
        verifiedAt: distributionDealDocuments.verifiedAt,
        receivedBy: distributionDealDocuments.receivedBy,
        verifiedBy: distributionDealDocuments.verifiedBy,
        notes: distributionDealDocuments.notes,
      })
      .from(distributionDealDocuments)
      .where(
        and(
          eq(distributionDealDocuments.dealId, input.dealId),
          eq(distributionDealDocuments.developmentRequiredDocumentId, input.templateId),
        ),
      )
      .limit(1);

    const now = sqlDateNow();
    let receivedAt = existing?.receivedAt || null;
    let verifiedAt = existing?.verifiedAt || null;
    let receivedBy = existing?.receivedBy ? Number(existing.receivedBy) : null;
    let verifiedBy = existing?.verifiedBy ? Number(existing.verifiedBy) : null;

    if (input.status === 'received') {
      receivedAt = receivedAt || now;
      receivedBy = actorUserId;
    } else if (input.status === 'verified') {
      receivedAt = receivedAt || now;
      receivedBy = receivedBy || actorUserId;
      verifiedAt = verifiedAt || now;
      verifiedBy = actorUserId;
    }

    const notes = typeof input.notes === 'undefined' ? (existing?.notes ?? null) : input.notes;

    if (existing) {
      await tx
        .update(distributionDealDocuments)
        .set({
          status: input.status,
          receivedAt,
          verifiedAt,
          receivedBy,
          verifiedBy,
          notes,
        })
        .where(eq(distributionDealDocuments.id, Number(existing.id)));
      return;
    }

    await tx.insert(distributionDealDocuments).values({
      dealId: input.dealId,
      developmentRequiredDocumentId: input.templateId,
      status: input.status,
      receivedAt,
      verifiedAt,
      receivedBy,
      verifiedBy,
      notes: notes ?? null,
    });
  });

  return await getDealChecklist(input.dealId, actorUserId, options);
}

export async function assertDealPayoutReady(
  dealId: number,
  actorUserId: number,
  options?: ChecklistOptions,
) {
  const checklist = await getDealChecklist(dealId, actorUserId, options);
  if (!checklist.computed.payoutReady) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Deal is not payout-ready: ${checklist.computed.blockers.join(', ') || 'unknown blockers'}.`,
    });
  }
  return checklist;
}
