import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { TRPCError } from '@trpc/server';
import { and, eq, inArray } from 'drizzle-orm';
import {
  distributionDealDocuments,
  distributionCommissionEntries,
  distributionDeals,
  distributionManagerAssignments,
  users,
} from '../../drizzle/schema';
import { DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES } from '../../shared/distributionReferralIntake';
import { getDb } from '../db';
import { evaluatePayoutMilestone } from './distributionPayoutMilestoneService';
import { assertDealIsMutable } from './distributionDealMutationGuards';
import { readFrozenPayoutTerms } from './distributionCommissionService';
import { resolveDealRequirementSnapshots } from './distributionDealRequirementsSnapshotService';
import {
  createDistributionDealDocumentReference,
  createDistributionDealDocumentStorageKey,
  deleteDistributionDealDocument,
  DistributionReferralEvidenceStorageError,
  parseDistributionDealDocumentReference,
  readDistributionDealDocument,
  storeDistributionDealDocument,
} from './distributionReferralEvidenceStorage';

export type DealDocumentStatus = 'pending' | 'received' | 'verified' | 'rejected' | 'unavailable';
type EditableDealDocumentStatus = Exclude<DealDocumentStatus, 'unavailable'>;

export const MAX_DEAL_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_DEAL_DOCUMENT_BASE64_CHARS = Math.ceil(MAX_DEAL_DOCUMENT_BYTES / 3) * 4;

export type DealDocumentFileInput = {
  fileName: string;
  mimeType: string;
  base64Content: string;
  byteSize: number;
};

type DecodedDealDocumentFile = {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
  byteSize: number;
};

const DEAL_DOCUMENT_MIME_BY_EXTENSION: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
};

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
  payoutMilestoneNotes: string | null;
  currencyCode: string | null;
  commissionSummary: {
    commissionModel: string | null;
    defaultCommissionPercent: number | null;
    defaultCommissionAmount: number | null;
    referrerCommissionType: 'flat' | 'percentage' | null;
    referrerCommissionValue: number | null;
    referrerCommissionBasis: 'sale_price' | 'base_price' | null;
    payoutBasisAmount: number | null;
    canRecordPayoutBasis: boolean;
  };
  requiredDocuments: Array<{
    templateId: number | null;
    documentCode: string;
    documentLabel: string;
    category: 'client_required_document';
    isRequired: boolean;
    sortOrder: number;
    isActive: boolean;
    status: DealDocumentStatus;
    receivedAt: string | null;
    verifiedAt: string | null;
    submittedAt: string | null;
    submittedFileName: string | null;
    hasFile: boolean;
    receivedBy: { userId: number; name?: string } | null;
    verifiedBy: { userId: number; name?: string } | null;
    submittedBy: { userId: number; name?: string } | null;
    notes: string | null;
  }>;
  computed: {
    requiredCount: number;
    verifiedRequiredCount: number;
    allRequiredVerified: boolean;
    payoutMilestoneSupported: boolean;
    payoutReady: boolean;
    blockers: string[];
  };
};

type UpsertDealDocumentStatusInput = {
  dealId: number;
  templateId: number;
  status: EditableDealDocumentStatus;
  notes?: string | null;
  file?: DealDocumentFileInput;
};

type PartnerDealDocumentUploadInput = {
  dealId: number;
  templateId: number;
  actorUserId: number;
  actorRole: string;
  notes?: string | null;
  file: DealDocumentFileInput;
};

function toNumberOrNull(value: unknown) {
  if (value === null || typeof value === 'undefined') return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function formatUserDisplayName(row: {
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
}) {
  if (row.name) return row.name;
  const fullName = [row.firstName, row.lastName].filter(Boolean).join(' ').trim();
  return fullName || undefined;
}

function sqlDateNow() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function dealDocumentBadRequest(message: string) {
  return new TRPCError({
    code: 'BAD_REQUEST',
    message,
  });
}

function normalizeDealDocumentFileName(fileName: string) {
  const base = path.posix
    .basename(String(fileName || '').replace(/\\/g, '/'))
    .split('')
    .filter(character => {
      const code = character.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim();
  if (!base || base === '.' || base === '..' || base.length > 255) {
    throw dealDocumentBadRequest('Choose a valid file name for the document.');
  }
  const extension = path.extname(base).toLowerCase();
  const expectedMimeType = DEAL_DOCUMENT_MIME_BY_EXTENSION[extension];
  if (!expectedMimeType) {
    throw dealDocumentBadRequest('Upload a PDF, JPEG, PNG, or WebP document.');
  }
  return { fileName: base, expectedMimeType };
}

function decodeDealDocumentFile(input: DealDocumentFileInput): DecodedDealDocumentFile {
  const { fileName, expectedMimeType } = normalizeDealDocumentFileName(input.fileName);
  const mimeType = String(input.mimeType || '').trim().toLowerCase();
  if (!(DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES as readonly string[]).includes(mimeType)) {
    throw dealDocumentBadRequest('Upload a PDF, JPEG, PNG, or WebP document.');
  }
  if (mimeType !== expectedMimeType) {
    throw dealDocumentBadRequest('The file extension does not match the selected file type.');
  }
  if (
    !Number.isSafeInteger(input.byteSize) ||
    input.byteSize < 1 ||
    input.byteSize > MAX_DEAL_DOCUMENT_BYTES
  ) {
    throw dealDocumentBadRequest('Documents must be between 1 byte and 10 MB.');
  }
  const base64Content = String(input.base64Content || '').trim();
  if (
    !base64Content ||
    base64Content.length > MAX_DEAL_DOCUMENT_BASE64_CHARS ||
    base64Content.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64Content)
  ) {
    throw dealDocumentBadRequest('The uploaded document could not be read.');
  }
  const buffer = Buffer.from(base64Content, 'base64');
  if (buffer.length !== input.byteSize || buffer.length > MAX_DEAL_DOCUMENT_BYTES) {
    throw dealDocumentBadRequest('The uploaded document could not be read.');
  }
  return { fileName, mimeType, buffer, byteSize: buffer.length };
}

function toDealDocumentStorageError(error: unknown): never {
  if (error instanceof DistributionReferralEvidenceStorageError) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: error.message,
    });
  }
  throw error;
}

function assertPartnerOwnsDeal(
  dealScope: { agentId: number | null },
  actorUserId: number,
  actorRole: string,
  action: 'update' | 'view' = 'update',
) {
  if (actorRole === 'super_admin') return;
  if (dealScope.agentId !== Number(actorUserId)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `You can only ${action} referrals you submitted.`,
    });
  }
}

async function readStoredDealDocument(
  db: any,
  input: {
    dealId: number;
    templateId: number;
  },
) {
  const [row] = await db
    .select({
      submittedFileUrl: distributionDealDocuments.submittedFileUrl,
      submittedFileName: distributionDealDocuments.submittedFileName,
    })
    .from(distributionDealDocuments)
    .where(
      and(
        eq(distributionDealDocuments.dealId, input.dealId),
        eq(distributionDealDocuments.developmentRequiredDocumentId, input.templateId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Document requirement record not found.',
    });
  }
  const reference = parseDistributionDealDocumentReference(row.submittedFileUrl);
  if (!reference) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'No secure file is attached to this document.',
    });
  }

  let buffer: Buffer;
  try {
    buffer = await readDistributionDealDocument(reference);
  } catch (error) {
    toDealDocumentStorageError(error);
  }

  const fileName = String(row.submittedFileName || '').trim() || `deal-document-${input.templateId}`;
  const mimeType =
    DEAL_DOCUMENT_MIME_BY_EXTENSION[path.extname(fileName).toLowerCase()] ||
    'application/octet-stream';
  return {
    dealId: input.dealId,
    templateId: input.templateId,
    fileName,
    mimeType,
    byteSize: buffer.length,
    base64Content: buffer.toString('base64'),
  };
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

  if (
    typeof input.dealManagerUserId !== 'number' ||
    input.dealManagerUserId !== input.actorUserId
  ) {
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
      agentId: distributionDeals.agentId,
      developmentId: distributionDeals.developmentId,
      programId: distributionDeals.programId,
      currentStage: distributionDeals.currentStage,
      managerUserId: distributionDeals.managerUserId,
      dealAmount: distributionDeals.dealAmount,
      commissionBaseAmount: distributionDeals.commissionBaseAmount,
      commissionTriggerStage: distributionDeals.commissionTriggerStage,
      commissionStatus: distributionDeals.commissionStatus,
      referralTermsSnapshotJson: distributionDeals.referralTermsSnapshotJson,
      referralTermsSnapshotDigest: distributionDeals.referralTermsSnapshotDigest,
    })
    .from(distributionDeals)
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
    agentId: deal.agentId ? Number(deal.agentId) : null,
    developmentId: Number(deal.developmentId),
    programId: Number(deal.programId),
    developmentName: `Development #${deal.developmentId}`,
    currentStage: deal.currentStage ? String(deal.currentStage) : null,
    managerUserId: deal.managerUserId ? Number(deal.managerUserId) : null,
    dealAmount: Number(deal.dealAmount ?? 0),
    commissionBaseAmount: toNumberOrNull(deal.commissionBaseAmount),
    commissionTriggerStage: deal.commissionTriggerStage
      ? String(deal.commissionTriggerStage)
      : null,
    commissionStatus: String(deal.commissionStatus || ''),
    referralTermsSnapshotJson: deal.referralTermsSnapshotJson,
    referralTermsSnapshotDigest: deal.referralTermsSnapshotDigest || null,
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

  const frozenPayoutTerms = readFrozenPayoutTerms(
    dealScope.referralTermsSnapshotJson,
    dealScope.referralTermsSnapshotDigest,
  );
  const [existingPayoutEntry] = await db
    .select({ id: distributionCommissionEntries.id })
    .from(distributionCommissionEntries)
    .where(eq(distributionCommissionEntries.dealId, dealScope.dealId))
    .limit(1);

  const requirementSnapshots = await resolveDealRequirementSnapshots(db, [
    {
      dealId: dealScope.dealId,
      developmentId: dealScope.developmentId,
      snapshotJson: dealScope.referralTermsSnapshotJson,
      snapshotDigest: dealScope.referralTermsSnapshotDigest,
    },
  ]);
  const requirementSnapshot = requirementSnapshots.get(dealScope.dealId);
  const savedRequirements =
    requirementSnapshot?.snapshotValid ? requirementSnapshot.requirements : [];
  const templateIds = Array.from(
    new Set(
      savedRequirements.flatMap(document =>
        document.templateId === null ? [] : [document.templateId],
      ),
    ),
  );
  const persistedDealDocs = templateIds.length
    ? await db
        .select({
          id: distributionDealDocuments.id,
          developmentRequiredDocumentId: distributionDealDocuments.developmentRequiredDocumentId,
          status: distributionDealDocuments.status,
          receivedAt: distributionDealDocuments.receivedAt,
          verifiedAt: distributionDealDocuments.verifiedAt,
          submittedAt: distributionDealDocuments.submittedAt,
          receivedBy: distributionDealDocuments.receivedBy,
          verifiedBy: distributionDealDocuments.verifiedBy,
          submittedBy: distributionDealDocuments.submittedBy,
          submittedFileUrl: distributionDealDocuments.submittedFileUrl,
          submittedFileName: distributionDealDocuments.submittedFileName,
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
    if (row.submittedBy) actorIds.add(Number(row.submittedBy));
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

  const requiredDocuments: DealChecklistPayload['requiredDocuments'] = savedRequirements.map(
    document => {
      const templateId = document.templateId;
      const persisted = templateId === null ? undefined : persistedByTemplateId.get(templateId);
      const receivedById = persisted?.receivedBy ? Number(persisted.receivedBy) : null;
      const verifiedById = persisted?.verifiedBy ? Number(persisted.verifiedBy) : null;
      const status = (persisted?.status || 'unavailable') as DealDocumentStatus;

      return {
        templateId,
        documentCode: document.documentCode,
        documentLabel: document.documentLabel,
        category: document.category,
        isRequired: true,
        sortOrder: document.sortOrder,
        isActive: document.isAvailable && Boolean(persisted),
        status,
        receivedAt: persisted?.receivedAt || null,
        verifiedAt: persisted?.verifiedAt || null,
        submittedAt: persisted?.submittedAt || null,
        submittedFileName: persisted?.submittedFileName || null,
        hasFile: Boolean(parseDistributionDealDocumentReference(persisted?.submittedFileUrl)),
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
        submittedBy: persisted?.submittedBy
          ? {
              userId: Number(persisted.submittedBy),
              name: actorDirectory.get(Number(persisted.submittedBy))?.name,
            }
          : null,
        notes: persisted?.notes || null,
      };
    },
  );

  const requiredOnly = requiredDocuments.filter(document => document.isRequired);
  const requiredCount = requiredOnly.length;
  const verifiedRequiredCount = requiredOnly.filter(
    document => document.status === 'verified',
  ).length;
  const allRequiredVerified = requiredCount > 0 && verifiedRequiredCount >= requiredCount;
  const payoutMilestone = frozenPayoutTerms?.payoutMilestone || null;
  const payoutMilestoneEvaluation = evaluatePayoutMilestone({
    payoutMilestone,
    currentStage: dealScope.currentStage,
    documents: requiredDocuments.map(document => ({
      documentCode: document.documentCode,
      status: document.status,
    })),
  });
  const payoutMilestoneSatisfied = payoutMilestoneEvaluation.satisfied;
  const payoutReady =
    allRequiredVerified && payoutMilestoneEvaluation.supported && payoutMilestoneSatisfied;
  const blockers: string[] = [];

  if (requiredCount === 0) {
    blockers.push(
      requirementSnapshot?.snapshotValid
        ? 'No required document templates were saved for this referral.'
        : 'The saved referral document requirements could not be validated.',
    );
  } else if (!allRequiredVerified) {
    const remaining = requiredCount - verifiedRequiredCount;
    blockers.push(
      `${remaining} required document${remaining === 1 ? '' : 's'} still need verification.`,
    );
  }
  if (requiredDocuments.some(document => document.status === 'unavailable')) {
    blockers.push('One or more saved document requirements cannot be resolved to a document record.');
  }

  blockers.push(...payoutMilestoneEvaluation.blockers);

  return {
    dealId: dealScope.dealId,
    dealRef: dealScope.dealRef,
    buyerName: dealScope.buyerName,
    developmentId: dealScope.developmentId,
    developmentName: dealScope.developmentName,
    programId: dealScope.programId,
    payoutMilestone,
    payoutMilestoneNotes: frozenPayoutTerms?.payoutMilestoneNotes || null,
    currencyCode: frozenPayoutTerms?.currencyCode || null,
    commissionSummary: {
      commissionModel: frozenPayoutTerms?.commissionModel || null,
      defaultCommissionPercent:
        frozenPayoutTerms?.referrerCommissionType === 'percentage'
          ? frozenPayoutTerms.referrerCommissionValue
          : null,
      defaultCommissionAmount:
        frozenPayoutTerms?.referrerCommissionType === 'flat'
          ? frozenPayoutTerms.referrerCommissionValue
          : null,
      referrerCommissionType:
        frozenPayoutTerms?.referrerCommissionType === 'flat' ||
        frozenPayoutTerms?.referrerCommissionType === 'percentage'
          ? frozenPayoutTerms.referrerCommissionType
          : null,
      referrerCommissionValue: frozenPayoutTerms?.referrerCommissionValue || null,
      referrerCommissionBasis:
        frozenPayoutTerms?.referrerCommissionBasis === 'sale_price' ||
        frozenPayoutTerms?.referrerCommissionBasis === 'base_price'
          ? frozenPayoutTerms.referrerCommissionBasis
          : null,
      payoutBasisAmount:
        frozenPayoutTerms?.referrerCommissionBasis === 'sale_price'
          ? dealScope.dealAmount > 0
            ? dealScope.dealAmount
            : null
          : frozenPayoutTerms?.referrerCommissionBasis === 'base_price'
            ? dealScope.commissionBaseAmount
            : null,
      canRecordPayoutBasis: (() => {
        const rank: Record<string, number> = {
          viewing_scheduled: 1,
          viewing_completed: 2,
          application_submitted: 3,
          contract_signed: 4,
          bond_approved: 5,
          commission_pending: 6,
          commission_paid: 7,
          cancelled: 99,
        };
        const triggerRank = dealScope.commissionTriggerStage
          ? rank[dealScope.commissionTriggerStage]
          : undefined;
        return Boolean(
          frozenPayoutTerms?.referrerCommissionType === 'percentage' &&
          triggerRank &&
          (rank[dealScope.currentStage || ''] || 0) < triggerRank &&
          !existingPayoutEntry &&
          dealScope.commissionStatus !== 'pending' &&
          dealScope.commissionStatus !== 'paid',
        );
      })(),
    },
    requiredDocuments,
    computed: {
      requiredCount,
      verifiedRequiredCount,
      allRequiredVerified,
      payoutMilestoneSupported: payoutMilestoneEvaluation.supported,
      payoutReady,
      blockers,
    },
  };
}

async function writeDealDocumentRecord(
  input: UpsertDealDocumentStatusInput,
  actorUserId: number,
) {
  const decodedFile = input.file ? decodeDealDocumentFile(input.file) : null;
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const dealScope = await getDealScope(db, input.dealId);
  assertDealIsMutable(dealScope.currentStage, 'update checklist documents');

  const requirementSnapshots = await resolveDealRequirementSnapshots(db, [
    {
      dealId: dealScope.dealId,
      developmentId: dealScope.developmentId,
      snapshotJson: dealScope.referralTermsSnapshotJson,
      snapshotDigest: dealScope.referralTermsSnapshotDigest,
    },
  ]);
  const requirementSnapshot = requirementSnapshots.get(dealScope.dealId);
  const savedRequirement = requirementSnapshot?.requirements.find(
    requirement => requirement.templateId === input.templateId && requirement.isAvailable,
  );

  if (!requirementSnapshot?.snapshotValid || !savedRequirement) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: 'Document is not part of this referral’s saved requirements.',
    });
  }

  let storedReference: string | null = null;
  try {
    await db.transaction(async tx => {
      const [existing] = await tx
        .select({
          id: distributionDealDocuments.id,
          status: distributionDealDocuments.status,
          receivedAt: distributionDealDocuments.receivedAt,
          verifiedAt: distributionDealDocuments.verifiedAt,
          submittedFileUrl: distributionDealDocuments.submittedFileUrl,
          submittedFileName: distributionDealDocuments.submittedFileName,
          submittedAt: distributionDealDocuments.submittedAt,
          receivedBy: distributionDealDocuments.receivedBy,
          verifiedBy: distributionDealDocuments.verifiedBy,
          submittedBy: distributionDealDocuments.submittedBy,
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

      if (!existing) {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'The saved document status record is unavailable for this referral.',
        });
      }

      if (decodedFile && existing.status === 'verified') {
        throw new TRPCError({
          code: 'PRECONDITION_FAILED',
          message: 'Verified documents cannot be replaced.',
        });
      }

      const now = sqlDateNow();
      let receivedAt = existing.receivedAt || null;
      let verifiedAt = existing.verifiedAt || null;
      let submittedAt = existing.submittedAt || null;
      let receivedBy = existing.receivedBy ? Number(existing.receivedBy) : null;
      let verifiedBy = existing.verifiedBy ? Number(existing.verifiedBy) : null;
      let submittedBy = existing.submittedBy ? Number(existing.submittedBy) : null;
      let submittedFileUrl = existing.submittedFileUrl ?? null;
      let submittedFileName = existing.submittedFileName ?? null;

      if (decodedFile) {
        const storageKey = createDistributionDealDocumentStorageKey(
          input.dealId,
          randomUUID(),
        );
        const stored = await storeDistributionDealDocument({
          storageKey,
          buffer: decodedFile.buffer,
          mimeType: decodedFile.mimeType,
        });
        storedReference = createDistributionDealDocumentReference({
          storageAdapter: stored.adapter,
          storageKey: stored.storageKey,
        });
        submittedFileUrl = storedReference;
        submittedFileName = decodedFile.fileName;
        submittedAt = now;
        submittedBy = actorUserId;
      }

      if (input.status === 'received') {
        receivedAt = receivedAt || now;
        receivedBy = actorUserId;
        if (submittedFileUrl) {
          submittedBy = actorUserId;
        }
      } else if (input.status === 'verified') {
        receivedAt = receivedAt || now;
        receivedBy = receivedBy || actorUserId;
        verifiedAt = verifiedAt || now;
        verifiedBy = actorUserId;
        if (submittedFileUrl) {
          submittedBy = submittedBy || actorUserId;
        }
      }

      const notes = typeof input.notes === 'undefined' ? (existing.notes ?? null) : input.notes;

      await tx
        .update(distributionDealDocuments)
        .set({
          status: input.status,
          receivedAt,
          verifiedAt,
          submittedFileUrl,
          submittedFileName,
          submittedAt,
          submittedBy,
          receivedBy,
          verifiedBy,
          notes,
        })
        .where(eq(distributionDealDocuments.id, Number(existing.id)));
    });
  } catch (error) {
    if (storedReference) {
      const reference = parseDistributionDealDocumentReference(storedReference);
      if (reference) {
        await deleteDistributionDealDocument(reference).catch(() => undefined);
      }
    }
    if (error instanceof DistributionReferralEvidenceStorageError) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: error.message,
      });
    }
    throw error;
  }

  return {
    dealId: dealScope.dealId,
    templateId: input.templateId,
    status: input.status,
    fileName: decodedFile?.fileName ?? null,
    submittedAt: input.file ? sqlDateNow() : null,
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
  await assertAssignedManagerForDevelopment(db, {
    developmentId: dealScope.developmentId,
    actorUserId,
    dealManagerUserId: dealScope.managerUserId,
    skipAssignmentCheck: options?.skipAssignmentCheck,
  });

  await writeDealDocumentRecord(input, actorUserId);
  return await getDealChecklist(input.dealId, actorUserId, options);
}

export async function submitPartnerDealDocument(input: PartnerDealDocumentUploadInput) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const dealScope = await getDealScope(db, input.dealId);
  assertPartnerOwnsDeal(dealScope, input.actorUserId, input.actorRole);
  assertDealIsMutable(dealScope.currentStage, 'upload checklist documents');

  return await writeDealDocumentRecord(
    {
      dealId: input.dealId,
      templateId: input.templateId,
      status: 'received',
      notes: input.notes,
      file: input.file,
    },
    input.actorUserId,
  );
}

export async function readManagerDealDocument(input: {
  dealId: number;
  templateId: number;
  actorUserId: number;
  skipAssignmentCheck?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const dealScope = await getDealScope(db, input.dealId);
  await assertAssignedManagerForDevelopment(db, {
    developmentId: dealScope.developmentId,
    actorUserId: input.actorUserId,
    dealManagerUserId: dealScope.managerUserId,
    skipAssignmentCheck: input.skipAssignmentCheck,
  });
  return await readStoredDealDocument(db, {
    dealId: input.dealId,
    templateId: input.templateId,
  });
}

export async function readPartnerDealDocument(input: {
  dealId: number;
  templateId: number;
  actorUserId: number;
  actorRole: string;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const dealScope = await getDealScope(db, input.dealId);
  assertPartnerOwnsDeal(dealScope, input.actorUserId, input.actorRole, 'view');
  return await readStoredDealDocument(db, {
    dealId: input.dealId,
    templateId: input.templateId,
  });
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
