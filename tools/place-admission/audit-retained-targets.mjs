/**
 * Audit every database the governed local service holds for Place Authority
 * migrations under the OLD numbering.
 *
 * The reconciliation renumbers Place Authority from 0091-0099. Any target that
 * already applied the old numbering has a `sql_migration_history` naming files that
 * will no longer exist, so its workflow must be stopped rather than migrated
 * forward: its ledger records history that the reconciled manifest would rewrite.
 *
 * Read-only, and it goes through the connection authority rather than constructing
 * credentials. It reports; it never stops a target itself, because stopping
 * someone's target is an operator decision recorded with the finding.
 */

import { resolveDatabaseAuthority } from '../../server/_core/databaseAuthority/context.ts';
import { createAuthoritySqlConnection } from '../../server/_core/databaseAuthority/connectionAuthority.ts';
import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from '../../server/_core/databaseAuthority/authorization.ts';
import { queryRows } from '../../server/_core/databaseAuthority/dataAdapters/common.ts';

/**
 * The pre-reconciliation numbering, which is what this audit exists to detect.
 *
 * Deliberately NOT rewritten by the reconciliation. A tool that looked for the
 * current numbering would report every healthy target as a violation, and would go
 * quiet about exactly the stale targets it was written to catch.
 */
const OLD_PLACE_AUTHORITY = [
  '0091_place_authority_place.sql',
  '0092_place_authority_place_name.sql',
  '0093_place_authority_place_relationship.sql',
  '0094_place_authority_place_evidence.sql',
  '0095_place_authority_place_external_mapping.sql',
  '0096_place_authority_search_area.sql',
  '0097_place_authority_search_area_member.sql',
  '0098_saved_searches_canonical_place_reference.sql',
  '0099_saved_searches_canonical_place_reference_fk.sql',
];

/** The reconciled numbering, reported for contrast so the two are distinguishable. */
const RECONCILED_PLACE_AUTHORITY = [
  '0095_place_authority_place.sql',
  '0096_place_authority_place_name.sql',
  '0097_place_authority_place_relationship.sql',
  '0098_place_authority_place_evidence.sql',
  '0099_place_authority_place_external_mapping.sql',
  '0100_place_authority_search_area.sql',
  '0101_place_authority_search_area_member.sql',
  '0102_saved_searches_canonical_place_reference.sql',
  '0103_saved_searches_canonical_place_reference_fk.sql',
];

const authority = resolveDatabaseAuthority({
  operation: 'verification',
  credentialClass: 'read-only',
});
const decision = authorizeDatabaseOperation(authority, {
  approval: protectedDatabaseApprovalFromEnvironment(authority),
});
const connection = await createAuthoritySqlConnection(authority, decision);

try {
  const schemas = await queryRows(
    connection,
    `SELECT SCHEMA_NAME AS name FROM information_schema.SCHEMATA
      WHERE SCHEMA_NAME NOT IN ('information_schema','mysql','performance_schema','sys')
      ORDER BY SCHEMA_NAME`,
  );

  const findings = [];
  const quarantined = [];
  for (const { name } of schemas) {
    const hasHistory = await queryRows(
      connection,
      `SELECT COUNT(*) AS n FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sql_migration_history'`,
      [name],
    );
    if (!Number(hasHistory[0]?.n)) {
      findings.push({ database: name, placeAuthorityMigrations: [], head: null, note: 'no migration ledger' });
      continue;
    }
    let history;
    try {
      history = await queryRows(
        connection,
        `SELECT filename FROM \`${name}\`.\`sql_migration_history\` ORDER BY filename`,
      );
    } catch (error) {
      findings.push({
        database: name,
        placeAuthorityMigrations: [],
        head: null,
        note: `ledger unreadable: ${String(error.message).slice(0, 60)}`,
      });
      continue;
    }
    const filenames = history.map(row => String(row.filename));
    const old = filenames.filter(name_ => OLD_PLACE_AUTHORITY.includes(name_));
    const reconciled = filenames.filter(name_ => RECONCILED_PLACE_AUTHORITY.includes(name_));
    const head = filenames.length ? filenames[filenames.length - 1] : null;
    findings.push({
      database: name,
      migrationCount: filenames.length,
      placeAuthorityMigrations: old,
      reconciledPlaceAuthorityMigrations: reconciled,
      oldNumbering: old.length > 0,
      reconciledNumbering: reconciled.length > 0,
      head,
    });
    // The quarantined evidence database may legitimately carry history. It is
    // reported, never touched.
    if (name === 'listify_local') quarantined.push(name);
  }

  const carriers = findings.filter(f => f.oldNumbering);
  console.log(`retained-target-audit: ${schemas.length} databases on the governed local service`);
  for (const finding of findings) {
    const marker = finding.oldNumbering ? 'OLD NUMBERING' : finding.note ? 'no ledger' : 'clean';
    console.log(
      `  ${String(finding.database).padEnd(46)} ${marker.padEnd(14)} ` +
        `migrations=${String(finding.migrationCount ?? 0).padStart(3)}  head=${finding.head ?? '-'}`,
    );
    for (const migration of finding.placeAuthorityMigrations) console.log(`      ${migration}`);
  }
  console.log('');
  if (quarantined.length) {
    console.log(`  note: ${quarantined.join(', ')} is quarantined evidence; read-only diagnostics only, never mutated.`);
  }
  if (carriers.length) {
    console.log('');
    console.log(`STOP REQUIRED: ${carriers.length} target(s) carry the old Place Authority numbering:`);
    for (const carrier of carriers) {
      console.log(`  ${carrier.database}: ${carrier.placeAuthorityMigrations.length} old Place Authority migrations`);
    }
    console.log('  Their workflow stops here. Do not migrate them forward: their ledger records');
    console.log('  filenames the reconciled manifest will not contain, and rewriting that history');
    console.log('  is prohibited. They must be disposed and rebuilt from the reconciled schema.');
    process.exit(2);
  }
  console.log('  no retained target carries the old Place Authority numbering; nothing to stop.');
} finally {
  await connection.end();
}

process.exit(0);
