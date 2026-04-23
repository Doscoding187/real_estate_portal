#!/usr/bin/env tsx
import mysql from 'mysql2/promise';
import { loadAppRuntimeEnv } from '../server/_core/runtimeBootstrap';

loadAppRuntimeEnv({ cwd: process.cwd() });

const DATABASE_URL = process.env.DATABASE_URL;

const REQUIRED_TABLES = [
  'distribution_brand_partnerships',
  'distribution_development_access',
  'distribution_programs',
  'development_manager_assignments',
  'development_required_documents',
] as const;

const REQUIRED_COLUMNS: Array<{ table: string; column: string }> = [
  { table: 'distribution_programs', column: 'tier_access_policy' },
  { table: 'distribution_programs', column: 'payout_milestone' },
  { table: 'distribution_programs', column: 'payout_milestone_notes' },
  { table: 'distribution_programs', column: 'currency_code' },
  { table: 'distribution_brand_partnerships', column: 'brand_profile_id' },
  { table: 'distribution_development_access', column: 'development_id' },
  { table: 'distribution_development_access', column: 'brand_partnership_id' },
  { table: 'distribution_development_access', column: 'submission_allowed' },
  { table: 'development_manager_assignments', column: 'manager_user_id' },
  { table: 'development_required_documents', column: 'category' },
];

async function main() {
  if (!DATABASE_URL) {
    console.error('[db:verify:distribution] DATABASE_URL is required');
    process.exit(1);
  }

  const connection = await mysql.createConnection(DATABASE_URL);
  const failures: string[] = [];

  try {
    for (const table of REQUIRED_TABLES) {
      const [rows] = await connection.query<any[]>('SHOW TABLES LIKE ?', [table]);
      if (rows.length === 0) {
        failures.push(`Missing table: ${table}`);
      }
    }

    for (const check of REQUIRED_COLUMNS) {
      const [rows] = await connection.query<any[]>(
        'SHOW COLUMNS FROM ?? LIKE ?',
        [check.table, check.column],
      );
      if (rows.length === 0) {
        failures.push(`Missing column: ${check.table}.${check.column}`);
      }
    }
  } finally {
    await connection.end();
  }

  if (failures.length > 0) {
    console.error('[db:verify:distribution] Schema verification failed:');
    for (const failure of failures) {
      console.error(` - ${failure}`);
    }
    process.exit(1);
  }

  console.log('[db:verify:distribution] OK');
}

main().catch(error => {
  console.error('[db:verify:distribution] Failed to verify distribution schema.', error);
  process.exit(1);
});
