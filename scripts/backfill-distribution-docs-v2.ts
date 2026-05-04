#!/usr/bin/env tsx
import mysql from 'mysql2/promise';
import { loadAppRuntimeEnv } from '../server/_core/runtimeBootstrap';

loadAppRuntimeEnv({ cwd: process.cwd() });

const DATABASE_URL = process.env.DATABASE_URL;

type StatusMap = 'missing' | 'uploaded' | 'pending_review' | 'verified' | 'rejected' | 'waived';

function mapLegacyStatus(status: unknown): StatusMap {
  const value = String(status || '').toLowerCase();
  if (value === 'verified') return 'verified';
  if (value === 'rejected') return 'rejected';
  if (value === 'received') return 'pending_review';
  if (value === 'waived') return 'waived';
  if (value === 'uploaded') return 'uploaded';
  return 'missing';
}

function parseArgs() {
  const args = new Set(process.argv.slice(2));
  return {
    dryRun: args.has('--dry-run'),
    strict: args.has('--strict'),
  };
}

async function ensureMapTables(connection: mysql.Connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS distribution_docs_v2_requirement_map (
      legacy_required_document_id INT NOT NULL,
      application_requirement_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (legacy_required_document_id),
      KEY idx_distribution_docs_v2_req_map_new (application_requirement_id)
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS distribution_docs_v2_document_map (
      legacy_required_document_id INT NOT NULL,
      development_document_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (legacy_required_document_id),
      KEY idx_distribution_docs_v2_doc_map_new (development_document_id)
    )
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS distribution_docs_v2_deal_status_map (
      legacy_deal_document_id INT NOT NULL,
      deal_requirement_status_id INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (legacy_deal_document_id),
      KEY idx_distribution_docs_v2_deal_status_map_new (deal_requirement_status_id)
    )
  `);
}

async function run() {
  const { dryRun, strict } = parseArgs();

  if (!DATABASE_URL) {
    console.error('[backfill:distribution-docs-v2] DATABASE_URL is required');
    process.exit(1);
  }

  const connection = await mysql.createConnection(DATABASE_URL);
  const summary = {
    legacyRequiredDocuments: 0,
    applicationRequirementsMapped: 0,
    developmentDocumentsMapped: 0,
    legacyDealDocuments: 0,
    dealStatusesMapped: 0,
    missingRequirementMappings: 0,
  };

  try {
    await ensureMapTables(connection);

    if (!dryRun) await connection.beginTransaction();

    const [legacyRequiredRows] = await connection.query<any[]>(
      `
      SELECT
        id,
        development_id,
        document_code,
        document_label,
        category,
        template_file_url,
        template_file_name,
        is_required,
        sort_order,
        is_active
      FROM development_required_documents
      ORDER BY id ASC
      `,
    );
    summary.legacyRequiredDocuments = legacyRequiredRows.length;

    for (const row of legacyRequiredRows) {
      const [existingMapRows] = await connection.query<any[]>(
        `
        SELECT application_requirement_id
        FROM distribution_docs_v2_requirement_map
        WHERE legacy_required_document_id = ?
        LIMIT 1
        `,
        [row.id],
      );

      let applicationRequirementId: number;

      if (existingMapRows.length > 0) {
        applicationRequirementId = Number(existingMapRows[0].application_requirement_id);
      } else {
        const provider =
          String(row.category) === 'developer_document'
            ? 'developer'
            : 'buyer';

        const [insertResult] = await connection.query<any>(
          `
          INSERT INTO application_requirements (
            development_id,
            label,
            description,
            required,
            provider,
            document_code,
            accepted_file_types_json,
            linked_development_document_id,
            sort_order,
            is_active,
            created_at,
            updated_at
          )
          VALUES (?, ?, NULL, ?, ?, ?, NULL, NULL, ?, ?, NOW(), NOW())
          `,
          [
            row.development_id,
            row.document_label,
            Number(row.is_required || 0),
            provider,
            row.document_code ? String(row.document_code) : null,
            Number(row.sort_order || 0),
            Number(row.is_active || 0),
          ],
        );
        applicationRequirementId = Number(insertResult.insertId);

        await connection.query(
          `
          INSERT INTO distribution_docs_v2_requirement_map (
            legacy_required_document_id,
            application_requirement_id
          ) VALUES (?, ?)
          `,
          [row.id, applicationRequirementId],
        );
      }

      summary.applicationRequirementsMapped += 1;

      const shouldCreateDevelopmentDocument =
        String(row.category) === 'developer_document' &&
        (String(row.template_file_url || '').trim() || String(row.template_file_name || '').trim());

      if (shouldCreateDevelopmentDocument) {
        const [existingDocMapRows] = await connection.query<any[]>(
          `
          SELECT development_document_id
          FROM distribution_docs_v2_document_map
          WHERE legacy_required_document_id = ?
          LIMIT 1
          `,
          [row.id],
        );

        let developmentDocumentId: number;
        if (existingDocMapRows.length > 0) {
          developmentDocumentId = Number(existingDocMapRows[0].development_document_id);
        } else {
          const [insertDocResult] = await connection.query<any>(
            `
            INSERT INTO development_documents (
              development_id,
              title,
              document_type,
              category,
              storage_key,
              file_url,
              mime_type,
              file_size_bytes,
              visibility,
              downloadable,
              is_active,
              version,
              replaced_by_document_id,
              uploaded_by,
              created_at,
              updated_at
            )
            VALUES (?, ?, 'other', 'application_template', NULL, ?, NULL, NULL, 'referrer', 1, ?, 1, NULL, NULL, NOW(), NOW())
            `,
            [
              row.development_id,
              String(row.document_label || row.template_file_name || 'Application template'),
              String(row.template_file_url || '').trim() || null,
              Number(row.is_active || 0),
            ],
          );
          developmentDocumentId = Number(insertDocResult.insertId);

          await connection.query(
            `
            INSERT INTO distribution_docs_v2_document_map (
              legacy_required_document_id,
              development_document_id
            ) VALUES (?, ?)
            `,
            [row.id, developmentDocumentId],
          );
        }

        await connection.query(
          `
          UPDATE application_requirements
          SET linked_development_document_id = ?
          WHERE id = ? AND (linked_development_document_id IS NULL OR linked_development_document_id = 0)
          `,
          [developmentDocumentId, applicationRequirementId],
        );

        summary.developmentDocumentsMapped += 1;
      }
    }

    const [legacyDealDocumentRows] = await connection.query<any[]>(
      `
      SELECT
        id,
        deal_id,
        development_required_document_id,
        status,
        submitted_file_url,
        submitted_file_name,
        submitted_by,
        submitted_at,
        verified_by,
        verified_at,
        notes
      FROM distribution_deal_documents
      ORDER BY id ASC
      `,
    );
    summary.legacyDealDocuments = legacyDealDocumentRows.length;

    for (const row of legacyDealDocumentRows) {
      const [dealMapRows] = await connection.query<any[]>(
        `
        SELECT deal_requirement_status_id
        FROM distribution_docs_v2_deal_status_map
        WHERE legacy_deal_document_id = ?
        LIMIT 1
        `,
        [row.id],
      );
      if (dealMapRows.length > 0) {
        summary.dealStatusesMapped += 1;
        continue;
      }

      const [reqMapRows] = await connection.query<any[]>(
        `
        SELECT application_requirement_id
        FROM distribution_docs_v2_requirement_map
        WHERE legacy_required_document_id = ?
        LIMIT 1
        `,
        [row.development_required_document_id],
      );

      if (!reqMapRows.length) {
        summary.missingRequirementMappings += 1;
        continue;
      }

      const requirementId = Number(reqMapRows[0].application_requirement_id);
      const status = mapLegacyStatus(row.status);

      const [insertDealStatusResult] = await connection.query<any>(
        `
        INSERT INTO deal_requirement_statuses (
          deal_id,
          requirement_id,
          uploaded_file_storage_key,
          uploaded_file_url,
          uploaded_file_name,
          linked_development_document_id,
          status,
          submitted_by,
          submitted_at,
          reviewed_by,
          reviewed_at,
          rejection_reason,
          notes,
          created_at,
          updated_at
        )
        VALUES (?, ?, NULL, ?, ?, NULL, ?, ?, ?, ?, ?, NULL, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          uploaded_file_url = VALUES(uploaded_file_url),
          uploaded_file_name = VALUES(uploaded_file_name),
          status = VALUES(status),
          submitted_by = VALUES(submitted_by),
          submitted_at = VALUES(submitted_at),
          reviewed_by = VALUES(reviewed_by),
          reviewed_at = VALUES(reviewed_at),
          notes = VALUES(notes),
          updated_at = NOW()
        `,
        [
          row.deal_id,
          requirementId,
          row.submitted_file_url || null,
          row.submitted_file_name || null,
          status,
          row.submitted_by || null,
          row.submitted_at || null,
          row.verified_by || null,
          row.verified_at || null,
          row.notes || null,
        ],
      );

      let dealRequirementStatusId = Number(insertDealStatusResult.insertId || 0);
      if (!dealRequirementStatusId) {
        const [existingRows] = await connection.query<any[]>(
          `
          SELECT id
          FROM deal_requirement_statuses
          WHERE deal_id = ? AND requirement_id = ?
          LIMIT 1
          `,
          [row.deal_id, requirementId],
        );
        dealRequirementStatusId = Number(existingRows[0]?.id || 0);
      }

      if (dealRequirementStatusId > 0) {
        await connection.query(
          `
          INSERT INTO distribution_docs_v2_deal_status_map (
            legacy_deal_document_id,
            deal_requirement_status_id
          ) VALUES (?, ?)
          `,
          [row.id, dealRequirementStatusId],
        );
        summary.dealStatusesMapped += 1;
      }
    }

    const [reqMapCountRows] = await connection.query<any[]>(
      `SELECT COUNT(*) AS count FROM distribution_docs_v2_requirement_map`,
    );
    const [docMapCountRows] = await connection.query<any[]>(
      `SELECT COUNT(*) AS count FROM distribution_docs_v2_document_map`,
    );
    const [dealMapCountRows] = await connection.query<any[]>(
      `SELECT COUNT(*) AS count FROM distribution_docs_v2_deal_status_map`,
    );

    const reconciliation = {
      requirementMapCount: Number(reqMapCountRows[0]?.count || 0),
      documentMapCount: Number(docMapCountRows[0]?.count || 0),
      dealStatusMapCount: Number(dealMapCountRows[0]?.count || 0),
      requirementCoverage:
        summary.legacyRequiredDocuments === 0
          ? 100
          : Math.round((Number(reqMapCountRows[0]?.count || 0) / summary.legacyRequiredDocuments) * 10000) /
            100,
      dealStatusCoverage:
        summary.legacyDealDocuments === 0
          ? 100
          : Math.round((Number(dealMapCountRows[0]?.count || 0) / summary.legacyDealDocuments) * 10000) / 100,
    };

    if (!dryRun) {
      if (strict && (reconciliation.requirementCoverage < 100 || reconciliation.dealStatusCoverage < 100)) {
        throw new Error(
          `Strict mode failed: requirementCoverage=${reconciliation.requirementCoverage}% dealStatusCoverage=${reconciliation.dealStatusCoverage}%`,
        );
      }
      await connection.commit();
    } else {
      console.log('[backfill:distribution-docs-v2] Dry run complete. No changes committed.');
    }

    console.log(
      JSON.stringify(
        {
          dryRun,
          strict,
          summary,
          reconciliation,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    if (!dryRun) {
      try {
        await connection.rollback();
      } catch {}
    }
    console.error('[backfill:distribution-docs-v2] Failed', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

run();
