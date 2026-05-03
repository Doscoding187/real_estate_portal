#!/usr/bin/env tsx
import { and, eq, inArray } from 'drizzle-orm';
import {
  applicationRequirements,
  dealRequirementStatuses,
  developmentDocuments,
  developmentRequiredDocuments,
  distributionDealDocuments,
} from '../drizzle/schema';
import { getDb } from '../server/db';
import { loadAppRuntimeEnv } from '../server/_core/runtimeBootstrap';

loadAppRuntimeEnv({ cwd: process.cwd() });

type LegacyStatus = 'pending' | 'received' | 'verified' | 'rejected';
type V2Status = 'missing' | 'uploaded' | 'pending_review' | 'verified' | 'rejected' | 'waived';

const args = new Set(process.argv.slice(2));
const isDryRun = args.has('--dry-run');
const isStrict = args.has('--strict');

function mapStatus(status: LegacyStatus): V2Status {
  if (status === 'pending') return 'missing';
  if (status === 'received') return 'pending_review';
  if (status === 'verified') return 'verified';
  if (status === 'rejected') return 'rejected';
  return 'missing';
}

async function ensureMapTables(db: any) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS distribution_docs_v2_requirement_map (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      legacy_required_document_id INT NOT NULL,
      v2_requirement_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ux_dist_docs_v2_req_map (legacy_required_document_id),
      KEY idx_dist_docs_v2_req_map_v2 (v2_requirement_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS distribution_docs_v2_document_map (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      legacy_required_document_id INT NOT NULL,
      v2_document_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ux_dist_docs_v2_doc_map_legacy (legacy_required_document_id),
      KEY idx_dist_docs_v2_doc_map_v2 (v2_document_id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS distribution_docs_v2_deal_status_map (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      legacy_deal_document_id INT NOT NULL,
      v2_deal_requirement_status_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY ux_dist_docs_v2_status_map_legacy (legacy_deal_document_id),
      KEY idx_dist_docs_v2_status_map_v2 (v2_deal_requirement_status_id)
    )
  `);

  await db.execute(`
    ALTER TABLE distribution_docs_v2_requirement_map
      ADD COLUMN IF NOT EXISTS v2_requirement_id INT NOT NULL
  `);
  await db.execute(`
    ALTER TABLE distribution_docs_v2_document_map
      ADD COLUMN IF NOT EXISTS v2_document_id INT NOT NULL
  `);
  await db.execute(`
    ALTER TABLE distribution_docs_v2_deal_status_map
      ADD COLUMN IF NOT EXISTS v2_deal_requirement_status_id INT NOT NULL
  `);
}

async function main() {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  const legacyRequirements = await db.select().from(developmentRequiredDocuments);
  const legacyDeals = await db.select().from(distributionDealDocuments);

  console.log(`[backfill] legacy requirements: ${legacyRequirements.length}`);
  console.log(`[backfill] legacy deal docs: ${legacyDeals.length}`);

  if (isDryRun) {
    console.log('[backfill] dry-run mode; no writes will be performed');
  }

  if (!isDryRun) {
    await ensureMapTables(db);

    for (const row of legacyRequirements) {
      const [existingMap] = await db.execute(
        `SELECT v2_requirement_id FROM distribution_docs_v2_requirement_map WHERE legacy_required_document_id = ? LIMIT 1`,
        [Number(row.id)],
      );
      const mappedRequirementId = Array.isArray(existingMap) && existingMap[0]?.v2_requirement_id;
      if (mappedRequirementId) continue;

      let linkedDevelopmentDocumentId: number | null = null;
      if (row.category === 'developer_document' && (row.templateFileUrl || row.templateFileName)) {
        const insertedDocument = await db
          .insert(developmentDocuments)
          .values({
            developmentId: Number(row.developmentId),
            title: row.documentLabel || row.documentCode || 'Developer document',
            documentType: 'other',
            category: 'application_template',
            storageKey: null,
            fileUrl: row.templateFileUrl || null,
            mimeType: null,
            fileSizeBytes: null,
            visibility: 'manager',
            downloadable: 1,
            isActive: Number(row.isActive ?? 1) === 1 ? 1 : 0,
            version: 1,
            replacedByDocumentId: null,
            uploadedBy: row.updatedBy || row.createdBy || null,
            createdAt: row.createdAt || now,
            updatedAt: row.updatedAt || now,
          })
          .$returningId();

        linkedDevelopmentDocumentId = Number(insertedDocument[0]!.id);
        await db.execute(
          `INSERT INTO distribution_docs_v2_document_map (legacy_required_document_id, v2_document_id) VALUES (?, ?)`,
          [Number(row.id), linkedDevelopmentDocumentId],
        );
      }

      const insertedRequirement = await db
        .insert(applicationRequirements)
        .values({
          developmentId: Number(row.developmentId),
          label: row.documentLabel || row.documentCode || 'Required document',
          description: null,
          required: Number(row.isRequired ?? 1) === 1 ? 1 : 0,
          provider: row.category === 'developer_document' ? 'developer' : 'buyer',
          documentCode: row.documentCode || null,
          acceptedFileTypesJson: null,
          linkedDevelopmentDocumentId,
          sortOrder: Number(row.sortOrder ?? 0),
          isActive: Number(row.isActive ?? 1) === 1 ? 1 : 0,
          createdBy: row.createdBy || null,
          updatedBy: row.updatedBy || null,
          createdAt: row.createdAt || now,
          updatedAt: row.updatedAt || now,
        })
        .$returningId();

      const newRequirementId = Number(insertedRequirement[0]!.id);
      await db.execute(
        `INSERT INTO distribution_docs_v2_requirement_map (legacy_required_document_id, v2_requirement_id) VALUES (?, ?)`,
        [Number(row.id), newRequirementId],
      );
    }

    const mapRows = await db.execute(`SELECT legacy_required_document_id, v2_requirement_id FROM distribution_docs_v2_requirement_map`);
    const maps = Array.isArray(mapRows[0]) ? mapRows[0] : [];
    const requirementMap = new Map<number, number>();
    for (const m of maps as any[]) requirementMap.set(Number(m.legacy_required_document_id), Number(m.v2_requirement_id));

    for (const row of legacyDeals) {
      const [existingMap] = await db.execute(
        `SELECT v2_deal_requirement_status_id FROM distribution_docs_v2_deal_status_map WHERE legacy_deal_document_id = ? LIMIT 1`,
        [Number(row.id)],
      );
      const mapped = Array.isArray(existingMap) && existingMap[0]?.v2_deal_requirement_status_id;
      if (mapped) continue;

      const requirementId = requirementMap.get(Number(row.developmentRequiredDocumentId));
      if (!requirementId) continue;

      const insertedStatus = await db
        .insert(dealRequirementStatuses)
        .values({
          dealId: Number(row.dealId),
          requirementId,
          uploadedFileStorageKey: null,
          uploadedFileUrl: row.submittedFileUrl || null,
          uploadedFileName: row.submittedFileName || null,
          linkedDevelopmentDocumentId: null,
          status: mapStatus((row.status || 'pending') as LegacyStatus),
          submittedBy: row.submittedBy || null,
          submittedAt: row.submittedAt || null,
          reviewedBy: row.verifiedBy || row.receivedBy || null,
          reviewedAt: row.verifiedAt || row.receivedAt || null,
          rejectionReason: null,
          notes: row.notes || null,
          createdAt: row.createdAt || now,
          updatedAt: row.updatedAt || now,
        })
        .$returningId();

      await db.execute(
        `INSERT INTO distribution_docs_v2_deal_status_map (legacy_deal_document_id, v2_deal_requirement_status_id) VALUES (?, ?)`,
        [Number(row.id), Number(insertedStatus[0]!.id)],
      );
    }
  }

  const tableExists = async (tableName: string) => {
    const escapedTableName = String(tableName).replace(/'/g, "''");
    const [rows] = await db.execute(`SHOW TABLES LIKE '${escapedTableName}'`);
    return Array.isArray(rows) && rows.length > 0;
  };
  const countTable = async (tableName: string) => {
    const [rows] = await db.execute(`SELECT COUNT(*) as c FROM ${tableName}`);
    return Number((rows as any[])[0]?.c || 0);
  };

  const legacyRequirementsCount = await countTable('development_required_documents');
  const legacyDealDocsCount = await countTable('distribution_deal_documents');
  const v2RequirementMapCount = (await tableExists('distribution_docs_v2_requirement_map'))
    ? await countTable('distribution_docs_v2_requirement_map')
    : 0;
  const v2DealStatusMapCount = (await tableExists('distribution_docs_v2_deal_status_map'))
    ? await countTable('distribution_docs_v2_deal_status_map')
    : 0;

  const requirementCoverage = legacyRequirementsCount === 0 ? 100 : (v2RequirementMapCount / legacyRequirementsCount) * 100;
  const dealCoverage = legacyDealDocsCount === 0 ? 100 : (v2DealStatusMapCount / legacyDealDocsCount) * 100;

  console.log('[backfill] reconciliation summary');
  console.log(`  requirements: ${v2RequirementMapCount}/${legacyRequirementsCount} (${requirementCoverage.toFixed(2)}%)`);
  console.log(`  deal statuses: ${v2DealStatusMapCount}/${legacyDealDocsCount} (${dealCoverage.toFixed(2)}%)`);

  if (isStrict && (requirementCoverage < 100 || dealCoverage < 100)) {
    throw new Error('Strict reconciliation failed: backfill coverage is below 100%.');
  }

  console.log('[backfill] done');
  process.exit(0);
}

main().catch(error => {
  console.error('[backfill] failed', error);
  process.exit(1);
});
