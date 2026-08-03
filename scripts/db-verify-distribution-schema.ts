#!/usr/bin/env tsx
import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from '../server/_core/databaseAuthority/authorization';
import { createAuthoritySqlConnection } from '../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';

const REQUIRED_TABLES = [
  'distribution_brand_partnerships',
  'distribution_development_access',
  'distribution_programs',
  'distribution_deals',
  'distribution_deal_documents',
  'distribution_deal_events',
  'development_manager_assignments',
  'development_required_documents',
  'development_documents',
  'application_requirements',
  'deal_requirement_statuses',
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
  { table: 'distribution_development_access', column: 'brochure_config_json' },
  { table: 'development_manager_assignments', column: 'manager_user_id' },
  { table: 'development_required_documents', column: 'category' },
  { table: 'distribution_deal_events', column: 'event_type' },
  { table: 'distribution_deal_events', column: 'metadata' },
  { table: 'development_documents', column: 'visibility' },
  { table: 'application_requirements', column: 'provider' },
  { table: 'application_requirements', column: 'linked_development_document_id' },
  { table: 'deal_requirement_statuses', column: 'status' },
  { table: 'deal_requirement_statuses', column: 'requirement_id' },
];

async function main() {
  const authority = resolveDatabaseAuthority({ operation: 'verification' });
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  const connection = await createAuthoritySqlConnection(authority, decision);
  console.log(
    '[db:verify:distribution] Authorized target:',
    authority.context.targetFingerprintHash.slice(0, 16),
  );
  const failures: string[] = [];

  try {
    for (const table of REQUIRED_TABLES) {
      const [rows] = (await connection.query('SHOW TABLES LIKE ?', [table])) as [any[]];
      if (rows.length === 0) {
        failures.push(`Missing table: ${table}`);
      }
    }

    for (const check of REQUIRED_COLUMNS) {
      const [rows] = (await connection.query(
        'SHOW COLUMNS FROM ?? LIKE ?',
        [check.table, check.column],
      )) as [any[]];
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
