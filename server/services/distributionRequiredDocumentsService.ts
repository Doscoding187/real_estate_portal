import { eq, sql } from 'drizzle-orm';
import { developmentRequiredDocuments } from '../../drizzle/schema';

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
  isRequired: boolean;
  sortOrder: number;
  isActive: boolean;
};

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
          sql<number>`COALESCE(SUM(CASE WHEN ${developmentRequiredDocuments.isActive} = 1 AND ${developmentRequiredDocuments.category} = 'client_required_document' THEN 1 ELSE 0 END), 0)`,
        requiredRequiredDocsCount:
          sql<number>`COALESCE(SUM(CASE WHEN ${developmentRequiredDocuments.isActive} = 1 AND ${developmentRequiredDocuments.category} = 'client_required_document' AND ${developmentRequiredDocuments.isRequired} = 1 THEN 1 ELSE 0 END), 0)`,
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
        isRequired: developmentRequiredDocuments.isRequired,
        sortOrder: developmentRequiredDocuments.sortOrder,
        isActive: developmentRequiredDocuments.isActive,
      })
      .from(developmentRequiredDocuments)
      .where(eq(developmentRequiredDocuments.developmentId, developmentId))
      .orderBy(developmentRequiredDocuments.sortOrder, developmentRequiredDocuments.id);

    return rows.map(row => ({
      id: Number(row.id),
      developmentId: Number(row.developmentId),
      documentCode: String(row.documentCode),
      documentLabel: String(row.documentLabel || ''),
      category:
        String(row.category || 'client_required_document') === 'developer_document'
          ? 'developer_document'
          : 'client_required_document',
      isRequired: Number(row.isRequired || 0) === 1,
      sortOrder: Number(row.sortOrder || 0),
      isActive: Number(row.isActive || 0) === 1,
    }));
  } catch (error) {
    if ((error as { code?: string } | null)?.code === 'ER_BAD_FIELD_ERROR') {
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

      return legacyRows.map(row => ({
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
    if (isMissingRequiredDocumentsSchemaError(error)) {
      return [];
    }
    throw error;
  }
}
