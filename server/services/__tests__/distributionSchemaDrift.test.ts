import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import mysql from 'mysql2/promise';

const LEGACY_INDEX_NAMES = [
  'idx_distribution_program_active',
  'idx_distribution_deal_agent',
  'idx_distribution_deal_development',
  'idx_distribution_deal_stage',
  'idx_distribution_deal_commission_status',
  'ux_distribution_viewing_deal',
  'idx_distribution_viewing_program',
  'idx_distribution_viewing_development',
  'idx_distribution_viewing_agent',
  'idx_distribution_viewing_manager',
  'idx_distribution_viewing_start',
  'idx_distribution_viewing_status',
  'idx_distribution_commission_program',
  'idx_distribution_commission_agent',
  'idx_distribution_commission_status',
  'idx_distribution_manager_user',
  'idx_distribution_manager_development',
  'idx_distribution_manager_active',
  'idx_distribution_agent_tier_agent',
  'idx_distribution_agent_tier_level',
] as const;

const CANONICAL_INDEXES = [
  { table: 'distribution_programs', index: 'idx_distribution_programs_is_active' },
  { table: 'distribution_programs', index: 'idx_distribution_programs_referral_enabled' },
  { table: 'distribution_programs', index: 'idx_distribution_programs_updated_at' },
  { table: 'distribution_agent_tiers', index: 'idx_distribution_agent_tiers_agent' },
  { table: 'distribution_agent_tiers', index: 'idx_distribution_agent_tiers_tier' },
  { table: 'distribution_agent_tiers', index: 'idx_distribution_agent_tiers_effective_to' },
  {
    table: 'distribution_manager_assignments',
    index: 'ux_distribution_manager_assignment_program_manager',
  },
  {
    table: 'distribution_manager_assignments',
    index: 'idx_distribution_manager_assignments_manager',
  },
  {
    table: 'distribution_manager_assignments',
    index: 'idx_distribution_manager_assignments_development',
  },
  {
    table: 'distribution_manager_assignments',
    index: 'idx_distribution_manager_assignments_active',
  },
  { table: 'distribution_agent_access', index: 'idx_distribution_agent_access_agent' },
  { table: 'distribution_agent_access', index: 'idx_distribution_agent_access_updated_at' },
  { table: 'distribution_deals', index: 'idx_distribution_deals_program' },
  { table: 'distribution_deals', index: 'idx_distribution_deals_agent' },
  { table: 'distribution_deals', index: 'idx_distribution_deals_development' },
  { table: 'distribution_deals', index: 'idx_distribution_deals_manager' },
  { table: 'distribution_deals', index: 'idx_distribution_deals_current_stage' },
  { table: 'distribution_deals', index: 'idx_distribution_deals_commission_status' },
  { table: 'distribution_deals', index: 'idx_distribution_deals_submitted_at' },
  { table: 'distribution_deals', index: 'idx_distribution_deals_deal_amount' },
  { table: 'distribution_deals', index: 'idx_distribution_deals_platform_amount' },
  { table: 'distribution_deal_events', index: 'idx_distribution_deal_events_deal' },
  { table: 'distribution_deal_events', index: 'idx_distribution_deal_events_event_type' },
  { table: 'distribution_viewings', index: 'ux_distribution_viewings_deal' },
  { table: 'distribution_viewings', index: 'idx_distribution_viewings_program' },
  { table: 'distribution_viewings', index: 'idx_distribution_viewings_development' },
  { table: 'distribution_viewings', index: 'idx_distribution_viewings_agent' },
  { table: 'distribution_viewings', index: 'idx_distribution_viewings_manager' },
  { table: 'distribution_viewings', index: 'idx_distribution_viewings_start' },
  { table: 'distribution_viewings', index: 'idx_distribution_viewings_status' },
  {
    table: 'distribution_viewing_validations',
    index: 'idx_distribution_viewing_validations_deal',
  },
  {
    table: 'distribution_viewing_validations',
    index: 'idx_distribution_viewing_validations_status',
  },
  {
    table: 'distribution_viewing_validations',
    index: 'idx_distribution_viewing_validations_validated_at',
  },
  {
    table: 'distribution_commission_entries',
    index: 'idx_distribution_commission_entries_program',
  },
  {
    table: 'distribution_commission_entries',
    index: 'idx_distribution_commission_entries_agent',
  },
  {
    table: 'distribution_commission_entries',
    index: 'idx_distribution_commission_entries_development',
  },
  {
    table: 'distribution_commission_entries',
    index: 'idx_distribution_commission_entries_status',
  },
  {
    table: 'distribution_commission_entries',
    index: 'idx_distribution_commission_entries_updated_at',
  },
  {
    table: 'distribution_identities',
    index: 'idx_distribution_identities_type_active',
  },
  {
    table: 'distribution_commission_ledger',
    index: 'idx_distribution_commission_ledger_deal',
  },
  {
    table: 'distribution_commission_ledger',
    index: 'idx_distribution_commission_ledger_recipient',
  },
  {
    table: 'distribution_commission_ledger',
    index: 'idx_distribution_commission_ledger_role',
  },
  {
    table: 'distribution_commission_ledger',
    index: 'idx_distribution_commission_ledger_created_at',
  },
  {
    table: 'distribution_commission_ledger',
    index: 'ux_distribution_commission_ledger_hash',
  },
] as const;

type DriftReport = {
  database: string | null;
  generatedAt: string;
  leadIdColumnCount: number;
  legacyIndexes: Array<{ table: string; index: string }>;
  missingCanonicalIndexes: Array<{ table: string; index: string }>;
};

function rowValue<T = unknown>(row: Record<string, unknown>, key: string): T | undefined {
  const lower = key.toLowerCase();
  const upper = key.toUpperCase();
  return (row[key] ?? row[lower] ?? row[upper]) as T | undefined;
}

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

describe('distribution schema drift contract', () => {
  if (!hasDatabaseUrl) {
    it('skips because DATABASE_URL is not configured', () => {
      expect(true).toBe(true);
    });
    return;
  }

  let connection: mysql.Connection;
  let report: DriftReport;

  beforeAll(async () => {
    connection = await mysql.createConnection(process.env.DATABASE_URL!);

    const [dbRows] = await connection.query<Array<{ db_name: string | null }>>(
      'SELECT DATABASE() as db_name',
    );

    const [leadRows] = await connection.query<Array<{ lead_count: number }>>(
      `
        SELECT COUNT(*) AS lead_count
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'distribution_deals'
          AND column_name = 'lead_id'
      `,
    );

    const [legacyRows] = await connection.query<Array<{ table_name: string; index_name: string }>>(
      `
        SELECT table_name, index_name
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND index_name IN (${LEGACY_INDEX_NAMES.map(() => '?').join(', ')})
        GROUP BY table_name, index_name
        ORDER BY table_name, index_name
      `,
      [...LEGACY_INDEX_NAMES],
    );

    const [canonicalRows] = await connection.query<Array<{ table_name: string; index_name: string }>>(
      `
        SELECT table_name, index_name
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND (
            ${CANONICAL_INDEXES.map(() => '(table_name = ? AND index_name = ?)').join(' OR ')}
          )
        GROUP BY table_name, index_name
      `,
      CANONICAL_INDEXES.flatMap(item => [item.table, item.index]),
    );

    const canonicalSet = new Set(
      canonicalRows.map(row => {
        const tableName = rowValue<string>(row as unknown as Record<string, unknown>, 'table_name');
        const indexName = rowValue<string>(row as unknown as Record<string, unknown>, 'index_name');
        return `${tableName ?? ''}:${indexName ?? ''}`;
      }),
    );
    const missingCanonicalIndexes = CANONICAL_INDEXES.filter(
      item => !canonicalSet.has(`${item.table}:${item.index}`),
    );

    report = {
      database: dbRows[0]?.db_name ?? null,
      generatedAt: new Date().toISOString(),
      leadIdColumnCount: Number(leadRows[0]?.lead_count ?? 0),
      legacyIndexes: legacyRows.map(row => ({
        table: rowValue<string>(row as unknown as Record<string, unknown>, 'table_name') ?? '',
        index: rowValue<string>(row as unknown as Record<string, unknown>, 'index_name') ?? '',
      })),
      missingCanonicalIndexes,
    };

    const outputDir = path.resolve('test-results/dominance');
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(
      path.join(outputDir, 'distribution-schema-drift-report.json'),
      `${JSON.stringify(report, null, 2)}\n`,
      'utf8',
    );
  });

  afterAll(async () => {
    await connection.end();
  });

  it('does not include legacy distribution_deals.lead_id column', () => {
    expect(report.leadIdColumnCount).toBe(0);
  });

  it('does not contain legacy distribution index names', () => {
    expect(report.legacyIndexes).toEqual([]);
  });

  it('contains all canonical distribution indexes', () => {
    expect(report.missingCanonicalIndexes).toEqual([]);
  });
});
