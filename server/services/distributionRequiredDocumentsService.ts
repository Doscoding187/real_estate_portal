import { and, eq, inArray } from 'drizzle-orm';
import { developmentRequiredDocuments } from '../../drizzle/schema';

type DbHandle = any;
export type DevelopmentDocumentCategory = 'client_required_document';

export const DISTRIBUTION_PROCESS_DOCUMENT_CODES = [
  'id_document',
  'proof_of_address',
  'proof_of_income',
  'bank_statement',
  'pre_approval',
  'custom',
] as const;

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
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
};

export function isMissingRequiredDocumentsSchemaError(error: unknown): boolean {
  const candidate = error as { code?: string; errno?: number; cause?: unknown } | null;
  if (!candidate) return false;
  if (candidate.code === 'ER_NO_SUCH_TABLE' || candidate.code === 'ER_BAD_FIELD_ERROR') return true;
  if (candidate.errno === 1146 || candidate.errno === 1054) return true;
  return candidate.cause && candidate.cause !== error
    ? isMissingRequiredDocumentsSchemaError(candidate.cause)
    : false;
}

export async function getDevelopmentRequiredDocumentSummary(
  db: DbHandle,
  developmentId: number,
): Promise<DevelopmentRequiredDocumentSummary> {
  const rows = await db
    .select({
      isActive: developmentRequiredDocuments.isActive,
      isRequired: developmentRequiredDocuments.isRequired,
    })
    .from(developmentRequiredDocuments)
    .where(
      and(
        eq(developmentRequiredDocuments.developmentId, developmentId),
        eq(developmentRequiredDocuments.category, 'client_required_document'),
        inArray(developmentRequiredDocuments.documentCode, [...DISTRIBUTION_PROCESS_DOCUMENT_CODES]),
      ),
    );

  const activeRows = rows.filter(row => Number(row.isActive) === 1);

  return {
    requiredDocsCount: activeRows.length,
    requiredRequiredDocsCount: activeRows.filter(row => Number(row.isRequired) === 1).length,
  };
}

export async function listDevelopmentRequiredDocumentsOrEmpty(
  db: DbHandle,
  developmentId: number,
): Promise<DevelopmentRequiredDocumentRow[]> {
  const rows = await db
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
      .where(
        and(
          eq(developmentRequiredDocuments.developmentId, developmentId),
          eq(developmentRequiredDocuments.category, 'client_required_document'),
          inArray(developmentRequiredDocuments.documentCode, [...DISTRIBUTION_PROCESS_DOCUMENT_CODES]),
        ),
      )
      .orderBy(developmentRequiredDocuments.sortOrder, developmentRequiredDocuments.id);

  return rows.map(row => ({
      id: Number(row.id),
      developmentId: Number(row.developmentId),
      documentCode: String(row.documentCode),
      documentLabel: String(row.documentLabel || ''),
      category: 'client_required_document',
      isRequired: Number(row.isRequired || 0) === 1,
      sortOrder: Number(row.sortOrder || 0),
      isActive: Number(row.isActive || 0) === 1,
  }));
}
