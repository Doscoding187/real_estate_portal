/** Bounded, read-only census before Place schema/data release. Never reads private addresses. */
import {
  assertAuthorizedDatabaseOperation,
  B08_AZURE_TARGET_FINGERPRINT_HASH,
  type AuthorizedDatabaseOperation,
} from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import { queryRows, requireReleaseReferenceTarget } from './common';

export async function inspectPlaceReleaseTarget(input: {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
}) {
  assertAuthorizedDatabaseOperation(input.authority, input.decision, ['release-reference-plan']);
  const target = requireReleaseReferenceTarget(input.authority);
  if (
    target.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH ||
    input.authority.context.credentialClass !== 'read-only'
  )
    throw new Error('Place release inspection refused: exact Azure read-only authority required.');
  const session = await queryRows(
    input.connection,
    'SELECT VERSION() AS version, DATABASE() AS selected_database, CURRENT_USER() AS current_identity',
  );
  if (
    session.length !== 1 ||
    session[0].selected_database !== 'propertylistify_database' ||
    !String(session[0].current_identity).startsWith('propertylistify_b08_inspector@')
  )
    throw new Error('Place release inspection refused: dedicated inspector identity required.');
  const grants = (await queryRows(input.connection, 'SHOW GRANTS'))
    .flatMap(r => Object.values(r))
    .map(String);
  if (
    grants.length !== 2 ||
    grants.filter(g => /^GRANT USAGE ON \*\.\*/i.test(g)).length !== 1 ||
    grants.filter(g => /^GRANT SELECT ON [`']?propertylistify_database[`']?\.\* TO /i.test(g))
      .length !== 1
  )
    throw new Error('Place release inspection refused: inspector SELECT-only grants differ.');
  const migrationHistory = await queryRows(
    input.connection,
    'SELECT filename, checksum FROM sql_migration_history ORDER BY numeric_version, filename',
  );
  const incompleteAttempts = await queryRows(
    input.connection,
    "SELECT attempt_id, migration_filename, state FROM sql_migration_attempts WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id",
  );
  const physicalTables = await queryRows(
    input.connection,
    "SELECT TABLE_NAME AS table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND TABLE_NAME IN ('place','place_name','place_relationship','place_evidence','place_external_mapping','search_area','search_area_member') ORDER BY TABLE_NAME",
  );
  const canonicalReferenceColumns = await queryRows(
    input.connection,
    "SELECT TABLE_NAME AS table_name, COLUMN_NAME AS column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND ((TABLE_NAME IN ('listings','properties') AND COLUMN_NAME = 'canonicalPlaceId') OR (TABLE_NAME = 'saved_searches' AND COLUMN_NAME = 'place_id')) ORDER BY TABLE_NAME, COLUMN_NAME",
  );
  const checks = await queryRows(
    input.connection,
    "SELECT TABLE_NAME AS table_name, CONSTRAINT_NAME AS constraint_name, ENFORCED AS enforced FROM information_schema.table_constraints WHERE table_schema = DATABASE() AND CONSTRAINT_TYPE = 'CHECK' ORDER BY TABLE_NAME, CONSTRAINT_NAME",
  );
  const legacyNorthRiding = await queryRows(
    input.connection,
    'SELECT c.id, c.name, c.slug, c.status, p.code AS province_code FROM cities c INNER JOIN provinces p ON p.id = c.provinceId WHERE c.name = ? OR c.slug = ? ORDER BY c.id',
    ['North Riding', 'north-riding'],
  );
  const legacySuburbNorthRiding = await queryRows(
    input.connection,
    'SELECT s.id, s.name, s.slug, s.status, c.name AS city_name, p.code AS province_code FROM suburbs s INNER JOIN cities c ON c.id = s.cityId INNER JOIN provinces p ON p.id = c.provinceId WHERE s.name = ? OR s.slug = ? ORDER BY s.id',
    ['North Riding', 'north-riding'],
  );
  // Metadata decides whether the new tables exist; this is release planning, never runtime schema guessing.
  const placeCounts: Record<string, number> = {};
  for (const table of physicalTables.map(r => String(r.table_name))) {
    const count = await queryRows(input.connection, `SELECT COUNT(*) AS total FROM \`${table}\``);
    placeCounts[table] = Number(count[0]?.total);
  }
  return {
    reportVersion: 1,
    operation: 'release-reference-plan',
    targetFingerprintHash: target.targetFingerprintHash,
    inspectedAt: new Date().toISOString(),
    serverVersion: session[0].version,
    inspectorIdentityVerified: true,
    selectOnlyGrantsVerified: true,
    migrationHistory,
    incompleteAttempts,
    physicalTables,
    canonicalReferenceColumns,
    checks,
    legacyNorthRiding,
    legacySuburbNorthRiding,
    placeCounts,
    databaseMutation: false,
  };
}
