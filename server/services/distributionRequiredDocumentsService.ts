import { eq, sql } from 'drizzle-orm';
import { developmentRequiredDocuments } from '../../drizzle/schema';
import type {
  DistributionProgrammeParticipantType,
  DistributionProgrammeReviewOwner,
  DistributionProgrammeTemplateLane,
  DistributionReadinessRole,
} from './distributionProgrammeSemanticsService';

type DbHandle = any;
export type DevelopmentDocumentCategory = 'developer_document' | 'client_required_document';

export type DevelopmentRequiredDocumentSummary = {
  requiredDocsCount: number;
  requiredRequiredDocsCount: number;
};

export type DevelopmentRequiredDocumentRow = {
  id: number;
  developmentId: number;
  documentCode: string;
  documentLabel: string;
  category: DevelopmentDocumentCategory;
  transactionType: DistributionProgrammeTemplateLane;
  participantType: DistributionProgrammeParticipantType;
  readinessRole: DistributionReadinessRole;
  requiredForStage: string | null;
  blocksPayout: boolean;
  reviewOwner: DistributionProgrammeReviewOwner;
  publiclyShareable: boolean;
  programmeSpecific: boolean;
  templateFileUrl: string | null;
  templateFileName: string | null;
  templateUploadedAt: string | null;
  templateUploadedBy: number | null;
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
};

const TEMPLATE_LANES = new Set(['all', 'sale', 'rent', 'auction']);
const PARTICIPANT_TYPES = new Set(['buyer', 'renter', 'bidder', 'developer', 'manager', 'supporting']);
const READINESS_ROLES = new Set([
  'submission',
  'qualification',
  'lease',
  'auction_registration',
  'auction_terms',
  'payout',
  'supporting',
]);
const REVIEW_OWNERS = new Set(['manager', 'admin', 'developer', 'system']);

function boolFromTinyInt(value: unknown) {
  return Number(value || 0) === 1;
}

function normalizeTemplateLane(value: unknown): DistributionProgrammeTemplateLane {
  const normalized = String(value || '').trim().toLowerCase();
  return TEMPLATE_LANES.has(normalized) ? (normalized as DistributionProgrammeTemplateLane) : 'all';
}

function normalizeParticipantType(value: unknown): DistributionProgrammeParticipantType {
  const normalized = String(value || '').trim().toLowerCase();
  return PARTICIPANT_TYPES.has(normalized)
    ? (normalized as DistributionProgrammeParticipantType)
    : 'supporting';
}

function normalizeReadinessRole(value: unknown): DistributionReadinessRole {
  const normalized = String(value || '').trim().toLowerCase();
  return READINESS_ROLES.has(normalized) ? (normalized as DistributionReadinessRole) : 'supporting';
}

function normalizeReviewOwner(value: unknown): DistributionProgrammeReviewOwner {
  const normalized = String(value || '').trim().toLowerCase();
  return REVIEW_OWNERS.has(normalized) ? (normalized as DistributionProgrammeReviewOwner) : 'manager';
}

function normalizeRequiredDocumentRow(row: any): DevelopmentRequiredDocumentRow {
  return {
    id: Number(row.id),
    developmentId: Number(row.developmentId),
    documentCode: String(row.documentCode),
    documentLabel: String(row.documentLabel || ''),
    category:
      String(row.category || 'client_required_document') === 'developer_document'
        ? 'developer_document'
        : 'client_required_document',
    transactionType: normalizeTemplateLane(row.transactionType),
    participantType: normalizeParticipantType(row.participantType),
    readinessRole: normalizeReadinessRole(row.readinessRole),
    requiredForStage:
      typeof row.requiredForStage === 'string' && row.requiredForStage.trim()
        ? row.requiredForStage.trim()
        : null,
    blocksPayout: boolFromTinyInt(row.blocksPayout),
    reviewOwner: normalizeReviewOwner(row.reviewOwner),
    publiclyShareable: boolFromTinyInt(row.publiclyShareable),
    programmeSpecific:
      row.programmeSpecific === undefined ? true : boolFromTinyInt(row.programmeSpecific),
    templateFileUrl:
      typeof row.templateFileUrl === 'string' && row.templateFileUrl.trim()
        ? row.templateFileUrl.trim()
        : null,
    templateFileName:
      typeof row.templateFileName === 'string' && row.templateFileName.trim()
        ? row.templateFileName.trim()
        : null,
    templateUploadedAt: row.templateUploadedAt || null,
    templateUploadedBy:
      typeof row.templateUploadedBy === 'number' ? Number(row.templateUploadedBy) : null,
    isRequired: boolFromTinyInt(row.isRequired),
    sortOrder: Number(row.sortOrder || 0),
    isActive: boolFromTinyInt(row.isActive),
  };
}

export function isMissingRequiredDocumentsSchemaError(error: unknown): boolean {
  const candidate = error as { code?: string; errno?: number; cause?: unknown } | null;
  if (!candidate) return false;
  if (candidate.code === 'ER_NO_SUCH_TABLE' || candidate.code === 'ER_BAD_FIELD_ERROR') return true;
  if (candidate.errno === 1146 || candidate.errno === 1054) return true;
  if (candidate.cause && candidate.cause !== error) {
    return isMissingRequiredDocumentsSchemaError(candidate.cause);
  }
  return false;
}

export async function getDevelopmentRequiredDocumentSummary(
  db: DbHandle,
  developmentId: number,
): Promise<DevelopmentRequiredDocumentSummary> {
  try {
    const [docsRow] = await db
      .select({
        requiredDocsCount:
          sql<number>`COALESCE(SUM(CASE WHEN ${developmentRequiredDocuments.isActive} = 1 AND ${developmentRequiredDocuments.isRequired} = 1 THEN 1 ELSE 0 END), 0)`,
        requiredRequiredDocsCount:
          sql<number>`COALESCE(SUM(CASE WHEN ${developmentRequiredDocuments.isActive} = 1 AND ${developmentRequiredDocuments.isRequired} = 1 THEN 1 ELSE 0 END), 0)`,
      })
      .from(developmentRequiredDocuments)
      .where(eq(developmentRequiredDocuments.developmentId, developmentId));

    return {
      requiredDocsCount: Number(docsRow?.requiredDocsCount || 0),
      requiredRequiredDocsCount: Number(docsRow?.requiredRequiredDocsCount || 0),
    };
  } catch (error) {
    if ((error as { code?: string } | null)?.code === 'ER_BAD_FIELD_ERROR') {
      const [legacyDocsRow] = await db
        .select({
          requiredDocsCount:
            sql<number>`COALESCE(SUM(CASE WHEN ${developmentRequiredDocuments.isActive} = 1 THEN 1 ELSE 0 END), 0)`,
          requiredRequiredDocsCount:
            sql<number>`COALESCE(SUM(CASE WHEN ${developmentRequiredDocuments.isActive} = 1 AND ${developmentRequiredDocuments.isRequired} = 1 THEN 1 ELSE 0 END), 0)`,
        })
        .from(developmentRequiredDocuments)
        .where(eq(developmentRequiredDocuments.developmentId, developmentId));

      return {
        requiredDocsCount: Number(legacyDocsRow?.requiredDocsCount || 0),
        requiredRequiredDocsCount: Number(legacyDocsRow?.requiredRequiredDocsCount || 0),
      };
    }
    if (isMissingRequiredDocumentsSchemaError(error)) {
      return {
        requiredDocsCount: 0,
        requiredRequiredDocsCount: 0,
      };
    }
    throw error;
  }
}

export async function listDevelopmentRequiredDocumentsOrEmpty(
  db: DbHandle,
  developmentId: number,
): Promise<DevelopmentRequiredDocumentRow[]> {
  try {
    const rows = await db
      .select({
        id: developmentRequiredDocuments.id,
        developmentId: developmentRequiredDocuments.developmentId,
        documentCode: developmentRequiredDocuments.documentCode,
        documentLabel: developmentRequiredDocuments.documentLabel,
        category: developmentRequiredDocuments.category,
        transactionType: developmentRequiredDocuments.transactionType,
        participantType: developmentRequiredDocuments.participantType,
        readinessRole: developmentRequiredDocuments.readinessRole,
        requiredForStage: developmentRequiredDocuments.requiredForStage,
        blocksPayout: developmentRequiredDocuments.blocksPayout,
        reviewOwner: developmentRequiredDocuments.reviewOwner,
        publiclyShareable: developmentRequiredDocuments.publiclyShareable,
        programmeSpecific: developmentRequiredDocuments.programmeSpecific,
        templateFileUrl: developmentRequiredDocuments.templateFileUrl,
        templateFileName: developmentRequiredDocuments.templateFileName,
        templateUploadedAt: developmentRequiredDocuments.templateUploadedAt,
        templateUploadedBy: developmentRequiredDocuments.templateUploadedBy,
        isRequired: developmentRequiredDocuments.isRequired,
        sortOrder: developmentRequiredDocuments.sortOrder,
        isActive: developmentRequiredDocuments.isActive,
      })
      .from(developmentRequiredDocuments)
      .where(eq(developmentRequiredDocuments.developmentId, developmentId))
      .orderBy(developmentRequiredDocuments.sortOrder, developmentRequiredDocuments.id);

    return rows.map(normalizeRequiredDocumentRow);
  } catch (error) {
    if ((error as { code?: string } | null)?.code === 'ER_BAD_FIELD_ERROR') {
      try {
        const metadataFallbackRows = await db
          .select({
            id: developmentRequiredDocuments.id,
            developmentId: developmentRequiredDocuments.developmentId,
            documentCode: developmentRequiredDocuments.documentCode,
            documentLabel: developmentRequiredDocuments.documentLabel,
            category: developmentRequiredDocuments.category,
            templateFileUrl: developmentRequiredDocuments.templateFileUrl,
            templateFileName: developmentRequiredDocuments.templateFileName,
            templateUploadedAt: developmentRequiredDocuments.templateUploadedAt,
            templateUploadedBy: developmentRequiredDocuments.templateUploadedBy,
            isRequired: developmentRequiredDocuments.isRequired,
            sortOrder: developmentRequiredDocuments.sortOrder,
            isActive: developmentRequiredDocuments.isActive,
          })
          .from(developmentRequiredDocuments)
          .where(eq(developmentRequiredDocuments.developmentId, developmentId))
          .orderBy(developmentRequiredDocuments.sortOrder, developmentRequiredDocuments.id);

        return metadataFallbackRows.map(row =>
          normalizeRequiredDocumentRow({
            ...row,
            transactionType: 'all',
            participantType: 'supporting',
            readinessRole: 'supporting',
            requiredForStage: null,
            blocksPayout: 0,
            reviewOwner: 'manager',
            publiclyShareable: 0,
            programmeSpecific: 1,
          }),
        );
      } catch (fallbackError) {
        if (!isMissingRequiredDocumentsSchemaError(fallbackError)) {
          throw fallbackError;
        }
      }

      const legacyRows = await db
        .select({
          id: developmentRequiredDocuments.id,
          developmentId: developmentRequiredDocuments.developmentId,
          documentCode: developmentRequiredDocuments.documentCode,
          documentLabel: developmentRequiredDocuments.documentLabel,
          isRequired: developmentRequiredDocuments.isRequired,
          sortOrder: developmentRequiredDocuments.sortOrder,
          isActive: developmentRequiredDocuments.isActive,
        })
        .from(developmentRequiredDocuments)
        .where(eq(developmentRequiredDocuments.developmentId, developmentId))
        .orderBy(developmentRequiredDocuments.sortOrder, developmentRequiredDocuments.id);

      return legacyRows.map(row =>
        normalizeRequiredDocumentRow({
          ...row,
          category: 'client_required_document',
          transactionType: 'all',
          participantType: 'supporting',
          readinessRole: 'supporting',
          requiredForStage: null,
          blocksPayout: 0,
          reviewOwner: 'manager',
          publiclyShareable: 0,
          programmeSpecific: 1,
          templateFileUrl: null,
          templateFileName: null,
          templateUploadedAt: null,
          templateUploadedBy: null,
        }),
      );
    }
    if (isMissingRequiredDocumentsSchemaError(error)) {
      return [];
    }
    throw error;
  }
}
