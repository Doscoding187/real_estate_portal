import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { TRPCError } from '@trpc/server';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/mysql-core';
import {
  cataloguePublishers,
  developerOrganisations,
  developments,
  distributionDealDocumentDeliveries,
  distributionDealDocuments,
  distributionCommissionEntries,
  distributionDeals,
  distributionManagerAssignments,
  users,
} from '../../drizzle/schema';
import { DISTRIBUTION_REFERRAL_EVIDENCE_MIME_TYPES } from '../../shared/distributionReferralIntake';
import { getDb } from '../db';
import { resolveDeveloperActorForUser } from './developerActorResolution';
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

export type DealDocumentDeliveryState = {
  deliveryId: number;
  deliveryVersion: number;
  deliveredAt: string;
  deliveredBy: { userId: number; name?: string } | null;
  acknowledgedAt: string | null;
  acknowledgedBy: { userId: number; name?: string } | null;
  acknowledgementNote: string | null;
  isCurrentFile: boolean;
};

export type DeveloperDealDocumentDelivery = {
  deliveryId: number;
  deliveryVersion: number;
  dealId: number;
  dealRef: string;
  buyerName: string | null;
  developmentId: number;
  developmentName: string;
  templateId: number;
  documentCode: string;
  documentLabel: string;
  fileName: string;
  deliveredAt: string;
  deliveredBy: { userId: number; name?: string } | null;
  acknowledgedAt: string | null;
  acknowledgedBy: { userId: number; name?: string } | null;
  acknowledgementNote: string | null;
};

function parseJsonObject(value: unknown): Record<string, unknown> | null {
  if (!value) return null;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
    } catch {
      return null;
    }
  }
  if (typeof value === 'object') return value as Record<string, unknown>;
  return null;
}

function buildQualificationSummary(dealScope: {
  prospectCheckFitId: string | null;
  affordabilityPurchasePrice: number | null;
  affordabilityAssumptionsJson: unknown;
}) {
  if (!dealScope.prospectCheckFitId) return null;
  const snapshot = parseJsonObject(dealScope.affordabilityAssumptionsJson);
  if (!snapshot) return null;
  const assumptions = parseJsonObject(snapshot.assumptions);
  const outputs = parseJsonObject(snapshot.outputs);
  return {
    checkFitId: dealScope.prospectCheckFitId,
    policyVersion: snapshot.policyVersion ? String(snapshot.policyVersion) : null,
    prospectName: snapshot.prospectName ? String(snapshot.prospectName) : null,
    coApplicantName: snapshot.coApplicantName ? String(snapshot.coApplicantName) : null,
    estimatedPurchasePrice: dealScope.affordabilityPurchasePrice,
    assumptions: assumptions as Record<string, unknown> | null,
    outputs: outputs as Record<string, unknown> | null,
  };
}

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
  qualification: {
    checkFitId: string | null;
    policyVersion: string | null;
    prospectName: string | null;
    coApplicantName: string | null;
    estimatedPurchasePrice: number | null;
    assumptions: Record<string, unknown> | null;
    outputs: Record<string, unknown> | null;
  } | null;
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
    delivery: DealDocumentDeliveryState | null;
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
      prospectCheckFitId: distributionDeals.prospectCheckFitId,
      affordabilityPurchasePrice: distributionDeals.affordabilityPurchasePrice,
      affordabilityAssumptionsJson: distributionDeals.affordabilityAssumptionsJson,
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
    prospectCheckFitId: deal.prospectCheckFitId ? String(deal.prospectCheckFitId) : null,
    affordabilityPurchasePrice: toNumberOrNull(deal.affordabilityPurchasePrice),
    affordabilityAssumptionsJson: deal.affordabilityAssumptionsJson,
  };
}

async function resolveDeveloperRecipientForDevelopment(db: any, developmentId: number) {
  const [recipient] = await db
    .select({
      developmentId: developments.id,
      publisherId: cataloguePublishers.id,
      publisherName: cataloguePublishers.name,
      developerOrganisationId: developerOrganisations.id,
      organisationName: developerOrganisations.name,
      organisationStatus: developerOrganisations.status,
    })
    .from(developments)
    .innerJoin(
      cataloguePublishers,
      and(
        eq(developments.cataloguePublisherId, cataloguePublishers.id),
        eq(cataloguePublishers.authorityKind, 'developer_first_party'),
      ),
    )
    .innerJoin(
      developerOrganisations,
      eq(cataloguePublishers.developerOrganisationId, developerOrganisations.id),
    )
    .where(eq(developments.id, developmentId))
    .limit(1);

  if (!recipient) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message:
        'This development has no first-party Developer organisation recipient for document delivery.',
    });
  }
  if (recipient.organisationStatus !== 'approved') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Documents can only be delivered to an approved Developer organisation.',
    });
  }

  return {
    developmentId: Number(recipient.developmentId),
    publisherId: Number(recipient.publisherId),
    publisherName: String(recipient.publisherName),
    developerOrganisationId: Number(recipient.developerOrganisationId),
    organisationName: String(recipient.organisationName),
  };
}

async function resolveDeveloperDeliveryActor(db: any, actorUserId: number) {
  const actor = await resolveDeveloperActorForUser(db, actorUserId);
  if (!actor) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'An active Developer organisation membership is required.',
    });
  }
  return actor;
}

async function loadDeliveryActorDirectory(db: any, actorIds: number[]) {
  const ids = Array.from(
    new Set(actorIds.map(Number).filter(id => Number.isSafeInteger(id) && id > 0)),
  );
  const directory = new Map<number, { name?: string }>();
  if (!ids.length) return directory;

  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
    })
    .from(users)
    .where(inArray(users.id, ids));
  for (const row of rows) {
    directory.set(Number(row.id), { name: formatUserDisplayName(row) });
  }
  return directory;
}

function toDeliveryState(
  row: {
    id: number;
    deliveryVersion: number;
    documentFileName: string;
    documentSubmittedAt: string | null;
    documentFileUrl: string | null;
    deliveredAt: string;
    deliveredBy: number;
    acknowledgedAt: string | null;
    acknowledgedBy: number | null;
    acknowledgementNote: string | null;
  },
  directory: Map<number, { name?: string }>,
  currentFile: { fileUrl: string | null },
): DealDocumentDeliveryState {
  const deliveredById = Number(row.deliveredBy);
  const acknowledgedById = row.acknowledgedBy ? Number(row.acknowledgedBy) : null;
  return {
    deliveryId: Number(row.id),
    deliveryVersion: Number(row.deliveryVersion),
    deliveredAt: row.deliveredAt,
    deliveredBy: {
      userId: deliveredById,
      name: directory.get(deliveredById)?.name,
    },
    acknowledgedAt: row.acknowledgedAt || null,
    acknowledgedBy: acknowledgedById
      ? {
          userId: acknowledgedById,
          name: directory.get(acknowledgedById)?.name,
        }
      : null,
    acknowledgementNote: row.acknowledgementNote || null,
    isCurrentFile:
      Boolean(row.documentFileUrl) &&
      String(row.documentFileUrl) === String(currentFile.fileUrl || ''),
  };
}

async function readLatestDeliveriesByDocumentId(db: any, dealDocumentIds: number[]) {
  const ids = Array.from(
    new Set(dealDocumentIds.map(Number).filter(id => Number.isSafeInteger(id) && id > 0)),
  );
  if (!ids.length) return new Map<number, any>();

  const rows = await db
    .select({
      id: distributionDealDocumentDeliveries.id,
      dealDocumentId: distributionDealDocumentDeliveries.dealDocumentId,
      deliveryVersion: distributionDealDocumentDeliveries.deliveryVersion,
      documentFileName: distributionDealDocumentDeliveries.documentFileName,
      documentSubmittedAt: distributionDealDocumentDeliveries.documentSubmittedAt,
      documentFileUrl: distributionDealDocumentDeliveries.documentFileUrl,
      deliveredAt: distributionDealDocumentDeliveries.deliveredAt,
      deliveredBy: distributionDealDocumentDeliveries.deliveredBy,
      acknowledgedAt: distributionDealDocumentDeliveries.acknowledgedAt,
      acknowledgedBy: distributionDealDocumentDeliveries.acknowledgedBy,
      acknowledgementNote: distributionDealDocumentDeliveries.acknowledgementNote,
    })
    .from(distributionDealDocumentDeliveries)
    .where(inArray(distributionDealDocumentDeliveries.dealDocumentId, ids))
    .orderBy(desc(distributionDealDocumentDeliveries.deliveryVersion));

  const latest = new Map<number, (typeof rows)[number]>();
  for (const row of rows) {
    const documentId = Number(row.dealDocumentId);
    if (!latest.has(documentId)) latest.set(documentId, row);
  }
  return latest;
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

  const latestDeliveries = await readLatestDeliveriesByDocumentId(
    db,
    persistedDealDocs.map(row => Number(row.id)),
  );
  for (const row of latestDeliveries.values()) {
    actorIds.add(Number(row.deliveredBy));
    if (row.acknowledgedBy) actorIds.add(Number(row.acknowledgedBy));
  }
  const actorDirectory = await loadDeliveryActorDirectory(db, Array.from(actorIds));

  const requiredDocuments: DealChecklistPayload['requiredDocuments'] = savedRequirements.map(
    document => {
      const templateId = document.templateId;
      const persisted = templateId === null ? undefined : persistedByTemplateId.get(templateId);
      const receivedById = persisted?.receivedBy ? Number(persisted.receivedBy) : null;
      const verifiedById = persisted?.verifiedBy ? Number(persisted.verifiedBy) : null;
      const status = (persisted?.status || 'unavailable') as DealDocumentStatus;
      const delivery = persisted ? latestDeliveries.get(Number(persisted.id)) : null;

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
        delivery: delivery
          ? toDeliveryState(delivery, actorDirectory, {
              fileUrl: persisted?.submittedFileUrl || null,
            })
          : null,
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
    qualification: buildQualificationSummary(dealScope),
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
          referral_received: 1,
          viewing_scheduled: 2,
          viewing_completed: 3,
          application_submitted: 4,
          contract_signed: 5,
          bond_approved: 6,
          commission_pending: 7,
          commission_paid: 8,
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

export async function deliverDealDocumentToDeveloper(input: {
  dealId: number;
  templateId: number;
  actorUserId: number;
  skipAssignmentCheck?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const dealScope = await getDealScope(db, input.dealId);
  assertDealIsMutable(dealScope.currentStage, 'deliver checklist documents');
  await assertAssignedManagerForDevelopment(db, {
    developmentId: dealScope.developmentId,
    actorUserId: input.actorUserId,
    dealManagerUserId: dealScope.managerUserId,
    skipAssignmentCheck: input.skipAssignmentCheck,
  });

  const [documentRow] = await db
    .select({
      id: distributionDealDocuments.id,
      status: distributionDealDocuments.status,
      submittedAt: distributionDealDocuments.submittedAt,
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

  if (!documentRow) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Document requirement record not found.',
    });
  }
  if (documentRow.status !== 'verified') {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'Only verified documents can be delivered to the Developer.',
    });
  }
  const documentFileUrl = String(documentRow.submittedFileUrl || '').trim();
  if (!documentFileUrl || !parseDistributionDealDocumentReference(documentFileUrl)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'The verified document has no secure file to deliver.',
    });
  }

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
      code: 'PRECONDITION_FAILED',
      message: 'The saved document requirement cannot be resolved for delivery.',
    });
  }

  const recipient = await resolveDeveloperRecipientForDevelopment(db, dealScope.developmentId);
  const fileName = String(documentRow.submittedFileName || '').trim();
  if (!fileName) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'The verified document has no file name to deliver.',
    });
  }

  const delivery = await db.transaction(async tx => {
    await tx.execute(
      sql`SELECT id FROM distribution_deal_documents WHERE id = ${documentRow.id} FOR UPDATE`,
    );
    const [latest] = await tx
      .select({
        id: distributionDealDocumentDeliveries.id,
        deliveryVersion: distributionDealDocumentDeliveries.deliveryVersion,
        documentFileName: distributionDealDocumentDeliveries.documentFileName,
        documentSubmittedAt: distributionDealDocumentDeliveries.documentSubmittedAt,
        documentFileUrl: distributionDealDocumentDeliveries.documentFileUrl,
        deliveredAt: distributionDealDocumentDeliveries.deliveredAt,
        acknowledgedAt: distributionDealDocumentDeliveries.acknowledgedAt,
      })
      .from(distributionDealDocumentDeliveries)
      .where(eq(distributionDealDocumentDeliveries.dealDocumentId, Number(documentRow.id)))
      .orderBy(desc(distributionDealDocumentDeliveries.deliveryVersion))
      .limit(1);

    const sameFile =
      latest &&
      Boolean(latest.documentFileUrl) &&
      String(latest.documentFileUrl) === documentFileUrl;
    if (latest && sameFile) {
      return {
        deliveryId: Number(latest.id),
        deliveryVersion: Number(latest.deliveryVersion),
        deliveredAt: latest.deliveredAt,
        acknowledgedAt: latest.acknowledgedAt || null,
        developerOrganisationId: recipient.developerOrganisationId,
        organisationName: recipient.organisationName,
        documentCode: savedRequirement.documentCode,
        documentLabel: savedRequirement.documentLabel,
      };
    }

    const now = sqlDateNow();
    const deliveryVersion = latest ? Number(latest.deliveryVersion) + 1 : 1;
    const [insertResult] = await tx.insert(distributionDealDocumentDeliveries).values({
      dealDocumentId: Number(documentRow.id),
      dealId: dealScope.dealId,
      deliveryVersion,
      developerOrganisationId: recipient.developerOrganisationId,
      documentCode: savedRequirement.documentCode,
      documentLabel: savedRequirement.documentLabel,
      documentFileName: fileName,
      documentSubmittedAt: documentRow.submittedAt || null,
      documentFileUrl,
      deliveredBy: input.actorUserId,
      deliveredAt: now,
    });
    return {
      deliveryId: Number((insertResult as any).insertId || 0),
      deliveryVersion,
      deliveredAt: now,
      acknowledgedAt: null,
      developerOrganisationId: recipient.developerOrganisationId,
      organisationName: recipient.organisationName,
      documentCode: savedRequirement.documentCode,
      documentLabel: savedRequirement.documentLabel,
    };
  });

  return delivery;
}

export async function listDeveloperDocumentDeliveries(input: {
  actorUserId: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const actor = await resolveDeveloperDeliveryActor(db, input.actorUserId);
  const limit = Math.min(Math.max(Math.trunc(input.limit ?? 200), 1), 1000);
  const latestDelivery = alias(distributionDealDocumentDeliveries, 'latest_delivery');
  const rows = await db
    .select({
      deliveryId: distributionDealDocumentDeliveries.id,
      dealDocumentId: distributionDealDocumentDeliveries.dealDocumentId,
      deliveryVersion: distributionDealDocumentDeliveries.deliveryVersion,
      dealId: distributionDeals.id,
      externalRef: distributionDeals.externalRef,
      buyerName: distributionDeals.buyerName,
      developmentId: developments.id,
      developmentName: developments.name,
      templateId: distributionDealDocuments.developmentRequiredDocumentId,
      documentCode: distributionDealDocumentDeliveries.documentCode,
      documentLabel: distributionDealDocumentDeliveries.documentLabel,
      fileName: distributionDealDocumentDeliveries.documentFileName,
      deliveredAt: distributionDealDocumentDeliveries.deliveredAt,
      deliveredBy: distributionDealDocumentDeliveries.deliveredBy,
      acknowledgedAt: distributionDealDocumentDeliveries.acknowledgedAt,
      acknowledgedBy: distributionDealDocumentDeliveries.acknowledgedBy,
      acknowledgementNote: distributionDealDocumentDeliveries.acknowledgementNote,
    })
    .from(distributionDealDocumentDeliveries)
    .innerJoin(
      distributionDealDocuments,
      eq(distributionDealDocumentDeliveries.dealDocumentId, distributionDealDocuments.id),
    )
    .innerJoin(
      distributionDeals,
      eq(distributionDealDocumentDeliveries.dealId, distributionDeals.id),
    )
    .innerJoin(developments, eq(distributionDeals.developmentId, developments.id))
    .where(
      and(
        eq(distributionDealDocumentDeliveries.developerOrganisationId, actor.organisationId),
        sql`${distributionDealDocumentDeliveries.deliveryVersion} = (
          select max(${latestDelivery.deliveryVersion})
          from ${distributionDealDocumentDeliveries} as ${sql.identifier('latest_delivery')}
          where ${latestDelivery.dealDocumentId} = ${distributionDealDocumentDeliveries.dealDocumentId}
            and ${latestDelivery.developerOrganisationId} = ${actor.organisationId}
        )`,
      ),
    )
    .orderBy(
      desc(distributionDealDocumentDeliveries.deliveredAt),
      desc(distributionDealDocumentDeliveries.id),
    )
    .limit(limit);

  const latestRows: typeof rows = [];
  const seenDocumentIds = new Set<number>();
  for (const row of rows) {
    const documentId = Number(row.dealDocumentId);
    if (seenDocumentIds.has(documentId)) continue;
    seenDocumentIds.add(documentId);
    latestRows.push(row);
    if (latestRows.length >= limit) break;
  }

  const actorIds: number[] = [];
  for (const row of latestRows) {
    actorIds.push(Number(row.deliveredBy));
    if (row.acknowledgedBy) actorIds.push(Number(row.acknowledgedBy));
  }
  const actorDirectory = await loadDeliveryActorDirectory(db, actorIds);

  const deliveries: DeveloperDealDocumentDelivery[] = latestRows.map(row => {
    const deliveredById = Number(row.deliveredBy);
    const acknowledgedById = row.acknowledgedBy ? Number(row.acknowledgedBy) : null;
    return {
      deliveryId: Number(row.deliveryId),
      deliveryVersion: Number(row.deliveryVersion),
      dealId: Number(row.dealId),
      dealRef: String(row.externalRef || `DEAL-${row.dealId}`),
      buyerName: row.buyerName || null,
      developmentId: Number(row.developmentId),
      developmentName: String(row.developmentName),
      templateId: Number(row.templateId),
      documentCode: String(row.documentCode),
      documentLabel: String(row.documentLabel),
      fileName: String(row.fileName),
      deliveredAt: row.deliveredAt,
      deliveredBy: {
        userId: deliveredById,
        name: actorDirectory.get(deliveredById)?.name,
      },
      acknowledgedAt: row.acknowledgedAt || null,
      acknowledgedBy: acknowledgedById
        ? {
            userId: acknowledgedById,
            name: actorDirectory.get(acknowledgedById)?.name,
          }
        : null,
      acknowledgementNote: row.acknowledgementNote || null,
    };
  });

  return {
    deliveries,
    awaitingAcknowledgementCount: deliveries.filter(delivery => !delivery.acknowledgedAt).length,
    acknowledgedCount: deliveries.filter(delivery => Boolean(delivery.acknowledgedAt)).length,
  };
}

export async function readDeveloperDealDocument(input: {
  deliveryId: number;
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const actor = await resolveDeveloperDeliveryActor(db, input.actorUserId);
  const [delivery] = await db
    .select({
      deliveryId: distributionDealDocumentDeliveries.id,
      dealDocumentId: distributionDealDocumentDeliveries.dealDocumentId,
      deliveryVersion: distributionDealDocumentDeliveries.deliveryVersion,
      developerOrganisationId: distributionDealDocumentDeliveries.developerOrganisationId,
      documentFileUrl: distributionDealDocumentDeliveries.documentFileUrl,
      documentFileName: distributionDealDocumentDeliveries.documentFileName,
    })
    .from(distributionDealDocumentDeliveries)
    .where(eq(distributionDealDocumentDeliveries.id, input.deliveryId))
    .limit(1);

  if (!delivery || Number(delivery.developerOrganisationId) !== actor.organisationId) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'Developer document delivery not found.',
    });
  }

  const [latest] = await db
    .select({ id: distributionDealDocumentDeliveries.id })
    .from(distributionDealDocumentDeliveries)
    .where(eq(distributionDealDocumentDeliveries.dealDocumentId, Number(delivery.dealDocumentId)))
    .orderBy(desc(distributionDealDocumentDeliveries.deliveryVersion))
    .limit(1);
  if (Number(latest?.id || 0) !== Number(delivery.deliveryId)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'This document delivery has been superseded by a newer delivery.',
    });
  }

  const reference = parseDistributionDealDocumentReference(delivery.documentFileUrl);
  if (!reference) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'No secure file is attached to this delivery.',
    });
  }

  let buffer: Buffer;
  try {
    buffer = await readDistributionDealDocument(reference);
  } catch (error) {
    toDealDocumentStorageError(error);
  }

  const fileName =
    String(delivery.documentFileName || '').trim() || `developer-delivery-${input.deliveryId}`;
  const mimeType =
    DEAL_DOCUMENT_MIME_BY_EXTENSION[path.extname(fileName).toLowerCase()] ||
    'application/octet-stream';
  return {
    deliveryId: Number(delivery.deliveryId),
    fileName,
    mimeType,
    byteSize: buffer.length,
    base64Content: buffer.toString('base64'),
  };
}

export async function acknowledgeDeveloperDealDocument(input: {
  deliveryId: number;
  actorUserId: number;
  note?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const actor = await resolveDeveloperDeliveryActor(db, input.actorUserId);
  const note = input.note?.trim() || null;

  return await db.transaction(async tx => {
    await tx.execute(
      sql`SELECT id FROM distribution_deal_document_deliveries WHERE id = ${input.deliveryId} FOR UPDATE`,
    );
    const [delivery] = await tx
      .select({
        id: distributionDealDocumentDeliveries.id,
        dealDocumentId: distributionDealDocumentDeliveries.dealDocumentId,
        deliveryVersion: distributionDealDocumentDeliveries.deliveryVersion,
        developerOrganisationId: distributionDealDocumentDeliveries.developerOrganisationId,
        acknowledgedAt: distributionDealDocumentDeliveries.acknowledgedAt,
      })
      .from(distributionDealDocumentDeliveries)
      .where(eq(distributionDealDocumentDeliveries.id, input.deliveryId))
      .limit(1);

    if (!delivery || Number(delivery.developerOrganisationId) !== actor.organisationId) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Developer document delivery not found.',
      });
    }

    await tx.execute(
      sql`SELECT id FROM distribution_deal_documents WHERE id = ${delivery.dealDocumentId} FOR UPDATE`,
    );

    const [latest] = await tx
      .select({ id: distributionDealDocumentDeliveries.id })
      .from(distributionDealDocumentDeliveries)
      .where(eq(distributionDealDocumentDeliveries.dealDocumentId, Number(delivery.dealDocumentId)))
      .orderBy(desc(distributionDealDocumentDeliveries.deliveryVersion))
      .limit(1);
    if (Number(latest?.id || 0) !== Number(delivery.id)) {
      throw new TRPCError({
        code: 'PRECONDITION_FAILED',
        message: 'This document delivery has been superseded by a newer delivery.',
      });
    }

    if (delivery.acknowledgedAt) {
      return {
        deliveryId: Number(delivery.id),
        acknowledgedAt: delivery.acknowledgedAt,
        alreadyAcknowledged: true,
      };
    }

    const now = sqlDateNow();
    await tx
      .update(distributionDealDocumentDeliveries)
      .set({
        acknowledgedAt: now,
        acknowledgedBy: actor.userId,
        acknowledgementNote: note,
      })
      .where(eq(distributionDealDocumentDeliveries.id, input.deliveryId));

    return {
      deliveryId: Number(delivery.id),
      acknowledgedAt: now,
      alreadyAcknowledged: false,
    };
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
