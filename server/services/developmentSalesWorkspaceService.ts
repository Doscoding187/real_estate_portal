import { and, asc, count, eq, inArray, like, or, type SQL } from 'drizzle-orm';
import { getDb } from '../db-connection';
import { cataloguePublishers, developments, unitTypes } from '../../drizzle/schema';

/**
 * Administrative identity and setup facts for one development.
 *
 * `configuredActiveUnitTypeCount` is a setup metric only. It is deliberately
 * not an availability or marketability signal; consumers must use the
 * Developer sales projection for current sale/rent inventory.
 */
export interface DevelopmentSalesWorkspaceReference {
  developmentId: number;
  publisherId: number | null;
  publisherName: string | null;
  publisherAuthorityKind: 'platform_reference' | 'developer_first_party' | null;
  name: string;
  displayName: string;
  city: string;
  province: string;
  suburb: string | null;
  developmentType: string;
  lifecycle: 'launching-soon' | 'selling' | 'sold-out';
  isPublished: boolean;
  approvalStatus: 'draft' | 'pending' | 'approved' | 'rejected' | null;
  configuredTransactionType: 'for_sale' | 'for_rent' | 'auction';
  inventoryMode: 'aggregate' | 'itemized';
  configuredActiveUnitTypeCount: number;
  updatedAt: string;
}

export interface ListDevelopmentSalesWorkspaceReferencesInput {
  /** Required unless a bounded set of development IDs is supplied. */
  publisherId?: number;
  developmentIds?: number[];
  search?: string;
  limit?: number;
  offset?: number;
}

function positiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) > 0;
}

function boundedPageValue(value: unknown, fallback: number, maximum: number) {
  if (!Number.isSafeInteger(value) || Number(value) < 0) return fallback;
  return Math.min(Number(value), maximum);
}

/**
 * Server-only Developer-owned listing/scope read for admin setup and labels.
 * The caller must authorize the publisher or development scope before calling
 * this function. It returns no inventory item IDs, document URLs, or buyer
 * information. For publication eligibility, partner-visible contacts, and the
 * current marketability contract, use getDevelopmentSalesProjection.
 */
export async function listDevelopmentSalesWorkspaceReferences(
  input: ListDevelopmentSalesWorkspaceReferencesInput,
): Promise<DevelopmentSalesWorkspaceReference[]> {
  const developmentIds = [...new Set(input.developmentIds || [])];
  if (developmentIds.some(id => !positiveSafeInteger(id))) {
    throw new Error('Development scope IDs must be positive safe integers.');
  }
  if (developmentIds.length > 200) {
    throw new Error('Development scope is limited to 200 explicit IDs per request.');
  }
  if (input.publisherId !== undefined && !positiveSafeInteger(input.publisherId)) {
    throw new Error('Publisher scope must be a positive safe integer.');
  }
  if (input.publisherId === undefined && developmentIds.length === 0) {
    throw new Error('A publisher or explicit development scope is required.');
  }

  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const conditions: SQL[] = [];
  if (input.publisherId !== undefined) {
    conditions.push(eq(developments.cataloguePublisherId, input.publisherId));
  }
  if (developmentIds.length > 0) {
    conditions.push(inArray(developments.id, developmentIds));
  }

  const search = typeof input.search === 'string' ? input.search.trim().slice(0, 120) : '';
  if (search) {
    const term = `%${search}%`;
    conditions.push(
      or(
        like(developments.name, term),
        like(developments.marketingName, term),
        like(developments.city, term),
        like(developments.province, term),
        like(developments.suburb, term),
      )!,
    );
  }

  const limit = boundedPageValue(input.limit, 50, 100);
  const offset = boundedPageValue(input.offset, 0, 10_000);
  const rows = await db
    .select({
      developmentId: developments.id,
      publisherId: developments.cataloguePublisherId,
      publisherName: cataloguePublishers.name,
      publisherAuthorityKind: cataloguePublishers.authorityKind,
      name: developments.name,
      marketingName: developments.marketingName,
      city: developments.city,
      province: developments.province,
      suburb: developments.suburb,
      developmentType: developments.developmentType,
      lifecycle: developments.status,
      isPublished: developments.isPublished,
      approvalStatus: developments.approvalStatus,
      configuredTransactionType: developments.transactionType,
      inventoryMode: developments.inventoryMode,
      updatedAt: developments.updatedAt,
    })
    .from(developments)
    .leftJoin(cataloguePublishers, eq(developments.cataloguePublisherId, cataloguePublishers.id))
    .where(and(...conditions))
    .orderBy(asc(developments.name), asc(developments.id))
    .limit(limit)
    .offset(offset);

  if (rows.length === 0) return [];

  const ids = rows.map(row => Number(row.developmentId));
  const configuredTypeCounts = await db
    .select({ developmentId: unitTypes.developmentId, configuredCount: count() })
    .from(unitTypes)
    .where(and(inArray(unitTypes.developmentId, ids), eq(unitTypes.isActive, 1)))
    .groupBy(unitTypes.developmentId);
  const countByDevelopmentId = new Map(
    configuredTypeCounts.map(row => [Number(row.developmentId), Number(row.configuredCount)]),
  );

  return rows.map(row => ({
    developmentId: Number(row.developmentId),
    publisherId: row.publisherId === null ? null : Number(row.publisherId),
    publisherName: row.publisherName || null,
    publisherAuthorityKind: row.publisherAuthorityKind || null,
    name: String(row.name),
    displayName: String(row.marketingName || row.name),
    city: String(row.city),
    province: String(row.province),
    suburb: row.suburb || null,
    developmentType: String(row.developmentType),
    lifecycle: row.lifecycle,
    isPublished: Number(row.isPublished) === 1,
    approvalStatus: row.approvalStatus || null,
    configuredTransactionType: row.configuredTransactionType,
    inventoryMode: row.inventoryMode,
    configuredActiveUnitTypeCount: countByDevelopmentId.get(Number(row.developmentId)) || 0,
    updatedAt: String(row.updatedAt),
  }));
}

export async function getDevelopmentSalesWorkspaceReference(
  developmentId: number,
): Promise<DevelopmentSalesWorkspaceReference | null> {
  if (!positiveSafeInteger(developmentId)) {
    throw new Error('Development ID must be a positive safe integer.');
  }
  const [reference] = await listDevelopmentSalesWorkspaceReferences({
    developmentIds: [developmentId],
    limit: 1,
  });
  return reference || null;
}
