import * as schema from '../../../drizzle/schema';
import {
  authorizeDatabaseOperation,
  B08_TIDB_SOURCE_READER_IDENTITY,
  B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH,
  protectedDatabaseApprovalFromEnvironment,
} from './authorization';
import { createAuthoritySqlConnection, type AuthoritySqlConnection } from './connectionAuthority';
import { resolveDatabaseAuthority } from './context';
import { readB08TidbReaderUrl } from './b08TidbV1Inventory';
import {
  compareNormalizedSchemas,
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
} from './schemaCongruency';
import { loadAndValidateMigrationManifest } from '../../migrations/migrationManifest';

async function rows(connection: AuthoritySqlConnection, statement: string, values?: readonly unknown[]): Promise<Record<string, unknown>[]> {
  const result = await connection.query(statement, values);
  return Array.isArray(result) && Array.isArray(result[0])
    ? result[0] as Record<string, unknown>[] : [];
}

export async function assessB08TidbV1ReadOnly(): Promise<Record<string, unknown>> {
  const authority = resolveDatabaseAuthority({
    operation: 'read-only-connect',
    explicitDatabaseUrl: readB08TidbReaderUrl(),
    credentialClass: 'read-only',
  });
  if (
    authority.context.targetFingerprintHash !== B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH ||
    authority.context.provider !== 'tidb' || authority.context.targetClass !== 'production' ||
    !authority.context.tls.required || !authority.context.tls.certificateVerificationRequired
  ) {
    throw new Error('B08 TiDB V1 assessment refused: target identity or TLS policy differs.');
  }
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  const connection = await createAuthoritySqlConnection(authority, decision);
  try {
    const identity = await rows(connection, 'SELECT VERSION() AS server_version, CURRENT_USER() AS authenticated_user, DATABASE() AS selected_database');
    const authenticatedIdentity = String(identity[0]?.authenticated_user ?? '').split('@')[0];
    if (authenticatedIdentity !== B08_TIDB_SOURCE_READER_IDENTITY || identity[0]?.selected_database !== 'listify_property_sa') {
      throw new Error('B08 TiDB V1 assessment refused: source reader identity differs.');
    }
    const tls = await rows(connection, "SHOW STATUS LIKE 'Ssl_cipher'");
    const tlsCipher = String(tls[0]?.Value ?? '');
    if (!tlsCipher) throw new Error('B08 TiDB V1 assessment refused: TLS is absent.');
    const build = await rows(connection, 'SELECT TIDB_VERSION() AS tidb_build');
    const expressionProof = await rows(connection,
      "SELECT JSON_UNQUOTE(JSON_EXTRACT(JSON_OBJECT('v', 7), '$.v')) AS json_value, MICROSECOND(CAST('2026-09-24 12:34:56.123456' AS DATETIME(6))) AS microseconds",
    );
    if (String(expressionProof[0]?.json_value) !== '7' || Number(expressionProof[0]?.microseconds) !== 123456) {
      throw new Error('B08 TiDB V1 assessment refused: JSON or microsecond expression differs.');
    }
    const variables: Record<string, string | null> = {};
    for (const name of [
      'tidb_enable_check_constraint', 'foreign_key_checks', 'tidb_txn_mode',
      'transaction_isolation', 'lower_case_table_names', 'sql_mode',
    ]) {
      const result = await rows(connection, `SHOW GLOBAL VARIABLES LIKE '${name}'`);
      variables[name] = result.length === 1 ? String(result[0].Value ?? '') : null;
    }
    const constraints = await rows(connection,
      'SELECT CONSTRAINT_TYPE AS constraint_type, COUNT(*) AS count FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? GROUP BY CONSTRAINT_TYPE ORDER BY CONSTRAINT_TYPE',
      ['listify_property_sa'],
    );
    const checkConstraints = await rows(connection,
      'SELECT TABLE_NAME AS table_name, CONSTRAINT_NAME AS constraint_name FROM information_schema.TIDB_CHECK_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = ? ORDER BY TABLE_NAME, CONSTRAINT_NAME',
      ['listify_property_sa'],
    );
    const representativeDdl: Array<{ table: string; checks: number; foreignKeys: number; invalidForeignKeys: number }> = [];
    for (const table of ['catalogue_publishers', 'land_claims', 'development_supersessions', 'location_provider_mappings']) {
      const ddlRows = await rows(connection, `SHOW CREATE TABLE \`${table}\``);
      const ddl = String(ddlRows[0]?.['Create Table'] ?? '');
      if (!ddl) throw new Error(`B08 TiDB V1 assessment refused: missing DDL for ${table}.`);
      representativeDdl.push({
        table,
        checks: (ddl.match(/\bCHECK\s*\(/g) ?? []).length,
        foreignKeys: (ddl.match(/\bFOREIGN KEY\s*\(/g) ?? []).length,
        invalidForeignKeys: (ddl.match(/FOREIGN KEY INVALID/g) ?? []).length,
      });
    }
    const ledger = await rows(connection,
      'SELECT numeric_version, filename, checksum FROM sql_migration_history ORDER BY numeric_version',
    );
    const attemptStates = await rows(connection,
      'SELECT state, COUNT(*) AS count FROM sql_migration_attempts GROUP BY state ORDER BY state',
    );
    const incomplete = await rows(connection,
      "SELECT migration_filename, state, completed_statement_count, failure_class FROM sql_migration_attempts WHERE state IN ('running','failed','blocked') ORDER BY started_at",
    );
    const manifest = loadAndValidateMigrationManifest();
    const expected = manifest.orderedMigrations.map(item => ({ filename: item.filename, checksum: item.checksum }));
    const actual = ledger.map(row => ({ filename: String(row.filename), checksum: String(row.checksum) }));
    const prefixMatches = actual.every((item, index) =>
      expected[index]?.filename === item.filename && expected[index]?.checksum === item.checksum,
    );
    const desired = normalizedDesiredSchema(schema);
    let congruency: Record<string, unknown>;
    try {
      const physical = await normalizedPhysicalSchema(connection, 'tidb', desired);
      const report = compareNormalizedSchemas(desired, physical);
      congruency = {
        congruent: report.congruent,
        desiredDigest: report.desiredDigest,
        actualDigest: report.actualDigest,
        differenceCount: report.differences.length,
        differenceSummary: report.differences.reduce<Record<string, number>>((totals, item) => {
          totals[item.category] = (totals[item.category] ?? 0) + 1;
          return totals;
        }, {}),
        firstDifferencePaths: report.differences.slice(0, 30).map(item => `${item.category}:${item.path}`),
      };
    } catch (error) {
      congruency = { error: error instanceof Error ? error.message : 'unknown physical-schema inspection failure' };
    }
    return {
      observedAt: new Date().toISOString(),
      targetFingerprintHash: B08_TIDB_SOURCE_TARGET_FINGERPRINT_HASH,
      authenticatedIdentity,
      selectedDatabase: identity[0].selected_database,
      tlsCipher,
      hostnameVerified: true,
      serverVersion: String(identity[0].server_version),
      tidbBuild: String(build[0]?.tidb_build ?? ''),
      readOnlyExpressions: { jsonExtract: '7', microseconds: 123456 },
      variables,
      constraints: constraints.map(row => ({ type: String(row.constraint_type), count: Number(row.count) })),
      checkConstraintCount: checkConstraints.length,
      representativeDdl,
      ledger: {
        count: actual.length,
        head: actual.length > 0 ? actual[actual.length - 1].filename : null,
        prefixMatchesCurrentManifest: prefixMatches,
        firstMismatch: actual.find((item, index) =>
          expected[index]?.filename !== item.filename || expected[index]?.checksum !== item.checksum,
        ) ?? null,
        expectedCurrentHead: manifest.document.expectedHead,
        expectedCurrentCount: expected.length,
      },
      attemptStates: attemptStates.map(row => ({ state: String(row.state), count: Number(row.count) })),
      incompleteAttempts: incomplete,
      congruency,
    };
  } finally {
    await connection.end();
  }
}
