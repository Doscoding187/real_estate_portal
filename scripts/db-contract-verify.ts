#!/usr/bin/env tsx
/**
 * DB Contract Verification Script
 *
 * Verifies that TiDB schema matches Drizzle schema expectations.
 * Prevents "wizard + DB desync" by failing fast on schema drift.
 *
 * Usage:
 *   pnpm db:verify              # Human-readable output
 *   pnpm db:verify --format=json # CI-friendly JSON output
 */

import {
  authorizeDatabaseOperation,
  protectedDatabaseApprovalFromEnvironment,
} from '../server/_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../server/_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../server/_core/databaseAuthority/context';
import { loadAndValidateMigrationManifest } from '../server/migrations/migrationManifest';
import { databaseDefaultMatches } from './db-contract-default-normalization.js';

// ============================================================================
// CONFIGURATION
// ============================================================================

const FORMAT = process.argv.includes('--format=json') ? 'json' : 'human';

interface ContractCheck {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: ContractCheck[] = [];

// ============================================================================
// EXPECTED SCHEMA (Source of Truth: Drizzle Schema)
// ============================================================================

const REQUIRED_TABLES = [
  'developments',
  'unit_types',
  'developers',
  'agent_memory',
  'agent_tasks',
  'agent_knowledge',
  'development_drafts',
  'agency_agent_memberships',
];

const REQUIRED_COLUMNS = {
  developments: [
    { name: 'id', type: 'int' },
    { name: 'name', type: 'varchar' },
    { name: 'slug', type: 'varchar' },
    { name: 'developmentType', type: 'enum' },
    { name: 'status', type: 'enum' },
    { name: 'city', type: 'varchar' },
    { name: 'province', type: 'varchar' },
    { name: 'dev_owner_type', type: 'enum' }, // snake_case in DB
    { name: 'isPublished', type: 'int' },
    { name: 'approval_status', type: 'enum' }, // snake_case in DB
  ],
  unit_types: [
    { name: 'id', type: 'varchar' },
    { name: 'development_id', type: 'int' }, // snake_case in DB
    { name: 'name', type: 'varchar' },
    { name: 'bedrooms', type: 'int' },
    { name: 'bathrooms', type: 'decimal' },
    { name: 'parking_type', type: 'varchar' }, // snake_case in DB
    { name: 'parking_bays', type: 'int' }, // snake_case in DB
    { name: 'ownership_type', type: 'enum' }, // snake_case in DB
    { name: 'structural_type', type: 'enum' }, // snake_case in DB
    { name: 'base_price_from', type: 'decimal' }, // snake_case in DB
  ],
  agent_memory: [
    { name: 'id', type: 'int' },
    { name: 'session_id', type: 'varchar' },
    { name: 'conversation_id', type: 'varchar' },
    { name: 'user_id', type: 'int' },
    { name: 'user_input', type: 'text' },
    { name: 'agent_response', type: 'text' },
  ],
  agent_tasks: [
    { name: 'id', type: 'int' },
    { name: 'task_id', type: 'varchar' },
    { name: 'session_id', type: 'varchar' },
    { name: 'user_id', type: 'int' },
    { name: 'task_type', type: 'varchar' },
    { name: 'status', type: 'enum' },
  ],
  agent_knowledge: [
    { name: 'id', type: 'int' },
    { name: 'category', type: 'varchar' },
    { name: 'content', type: 'text' },
  ],
  agency_agent_memberships: [
    { name: 'id', type: 'int' },
    { name: 'agency_id', type: 'int' },
    { name: 'agent_id', type: 'int' },
    { name: 'status', type: 'enum' },
    { name: 'governance_mode', type: 'enum' },
    { name: 'role', type: 'enum' },
    { name: 'permissions_overrides', type: 'json' },
    { name: 'effective_from', type: 'timestamp' },
    { name: 'effective_to', type: 'timestamp' },
    { name: 'created_by', type: 'int' },
    { name: 'updated_by', type: 'int' },
    { name: 'created_at', type: 'timestamp' },
    { name: 'updated_at', type: 'timestamp' },
  ],
};

const ENUM_VALUES = {
  'developments.status': ['launching-soon', 'selling', 'sold-out'],
  'developments.developmentType': ['residential', 'commercial', 'mixed_use', 'land'],
  'developments.dev_owner_type': ['platform', 'developer'], // snake_case in DB
  'unit_types.ownership_type': ['full-title', 'sectional-title', 'leasehold', 'life-rights'], // snake_case in DB
  'unit_types.structural_type': [
    // snake_case in DB
    'apartment',
    'freestanding-house',
    'simplex',
    'duplex',
    'penthouse',
    'plot-and-plan',
    'townhouse',
    'studio',
  ],
  'agent_tasks.status': ['pending', 'running', 'completed', 'failed'], // DB uses 'running' not 'in_progress'
  'agency_agent_memberships.status': ['invited', 'active', 'suspended', 'left'],
  'agency_agent_memberships.governance_mode': ['affiliated', 'managed'],
  'agency_agent_memberships.role': ['agent', 'team_lead', 'manager'],
};

const AGENCY_AGENT_MEMBERSHIP_COLUMN_SHAPES = [
  { name: 'id', nullable: false },
  { name: 'agency_id', nullable: false },
  { name: 'agent_id', nullable: false },
  { name: 'status', nullable: false, defaultValue: 'invited' },
  { name: 'governance_mode', nullable: false, defaultValue: 'affiliated' },
  { name: 'role', nullable: false, defaultValue: 'agent' },
  { name: 'permissions_overrides', nullable: true, defaultValue: null },
  { name: 'effective_from', nullable: true, defaultValue: null },
  { name: 'effective_to', nullable: true, defaultValue: null },
  { name: 'created_by', nullable: true, defaultValue: null },
  { name: 'updated_by', nullable: true, defaultValue: null },
  {
    name: 'created_at',
    nullable: false,
    defaultValues: ['CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP()'],
  },
  {
    name: 'updated_at',
    nullable: false,
    defaultValues: ['CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP()'],
    extraIncludes: 'on update current_timestamp',
  },
];

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

async function queryRows(
  connection: AuthoritySqlConnection,
  statement: string,
  values: readonly unknown[] = [],
): Promise<any[]> {
  const result: any = await connection.query(statement, values);
  return Array.isArray(result?.[0]) ? result[0] : Array.isArray(result?.rows) ? result.rows : [];
}

async function verifyTableExists(connection: AuthoritySqlConnection, tableName: string): Promise<void> {
  const rows = await queryRows(connection, 'SHOW TABLES LIKE ?', [tableName]);

  if (rows.length === 0) {
    results.push({
      name: `Table: ${tableName}`,
      passed: false,
      error: `Table '${tableName}' does not exist`,
    });
  } else {
    results.push({
      name: `Table: ${tableName}`,
      passed: true,
    });
  }
}

async function verifyColumns(
  connection: AuthoritySqlConnection,
  tableName: string,
  expectedColumns: Array<{ name: string; type: string }>,
): Promise<void> {
  const columns = await queryRows(connection, 'SHOW COLUMNS FROM ??', [tableName]);

  const columnMap = new Map(columns.map((col: any) => [col.Field, col.Type]));

  for (const expected of expectedColumns) {
    const actualType = columnMap.get(expected.name);

    if (!actualType) {
      results.push({
        name: `Column: ${tableName}.${expected.name}`,
        passed: false,
        error: `Column '${expected.name}' does not exist in table '${tableName}'`,
      });
    } else {
      // Loose type matching (enum, varchar, int, decimal, text)
      const typeMatch = actualType.toLowerCase().includes(expected.type.toLowerCase());

      results.push({
        name: `Column: ${tableName}.${expected.name}`,
        passed: typeMatch,
        error: typeMatch
          ? undefined
          : `Type mismatch: expected '${expected.type}', got '${actualType}'`,
        details: { expected: expected.type, actual: actualType },
      });
    }
  }
}

async function verifyEnumValues(
  connection: AuthoritySqlConnection,
  tableName: string,
  columnName: string,
  expectedValues: string[],
): Promise<void> {
  const columns = await queryRows(connection, 'SHOW COLUMNS FROM ?? WHERE Field = ?', [
    tableName,
    columnName,
  ]);

  if (columns.length === 0) {
    results.push({
      name: `Enum: ${tableName}.${columnName}`,
      passed: false,
      error: `Column '${columnName}' not found in table '${tableName}'`,
    });
    return;
  }

  const columnType = columns[0].Type;

  // Extract enum values from type definition: enum('value1','value2')
  const enumMatch = columnType.match(/enum\((.*)\)/i);

  if (!enumMatch) {
    results.push({
      name: `Enum: ${tableName}.${columnName}`,
      passed: false,
      error: `Column '${columnName}' is not an enum type (got: ${columnType})`,
    });
    return;
  }

  const actualValues = enumMatch[1].split(',').map((v: string) => v.trim().replace(/^'|'$/g, ''));

  const expectedSet = new Set(expectedValues);
  const actualSet = new Set(actualValues);

  const missing = expectedValues.filter(v => !actualSet.has(v));
  const extra = actualValues.filter(v => !expectedSet.has(v));

  const passed = missing.length === 0 && extra.length === 0;

  results.push({
    name: `Enum: ${tableName}.${columnName}`,
    passed,
    error: passed
      ? undefined
      : `Enum mismatch: missing [${missing.join(', ')}], extra [${extra.join(', ')}]`,
    details: {
      expected: expectedValues,
      actual: actualValues,
      missing,
      extra,
    },
  });
}

async function verifyColumnShapes(
  connection: AuthoritySqlConnection,
  tableName: string,
  expectedColumns: Array<{
    name: string;
    nullable: boolean;
    defaultValue?: string | null;
    defaultValues?: Array<string | null>;
    extraIncludes?: string;
  }>,
): Promise<void> {
  const columns = await queryRows(connection, 'SHOW COLUMNS FROM ??', [tableName]);
  const columnMap = new Map(columns.map((column: any) => [column.Field, column]));

  for (const expected of expectedColumns) {
    const actual = columnMap.get(expected.name);
    const nullableMatches = actual && (actual.Null === 'YES') === expected.nullable;
    const defaultMatches =
      actual &&
      (!Object.prototype.hasOwnProperty.call(expected, 'defaultValue') ||
        databaseDefaultMatches(actual.Default, expected.defaultValue)) &&
      (!expected.defaultValues ||
        expected.defaultValues.some(expectedDefault =>
          databaseDefaultMatches(actual.Default, expectedDefault),
        ));
    const extraMatches =
      actual &&
      (!expected.extraIncludes ||
        String(actual.Extra).toLowerCase().includes(expected.extraIncludes));
    const passed = Boolean(actual && nullableMatches && defaultMatches && extraMatches);

    results.push({
      name: `Column shape: ${tableName}.${expected.name}`,
      passed,
      error: passed
        ? undefined
        : actual
          ? `Expected nullable=${expected.nullable}${Object.prototype.hasOwnProperty.call(expected, 'defaultValue') ? `, default=${expected.defaultValue}` : expected.defaultValues ? `, default one of ${expected.defaultValues.join(', ')}` : ''}${expected.extraIncludes ? `, extra containing ${expected.extraIncludes}` : ''}; got nullable=${actual.Null === 'YES'}, default=${actual.Default}, extra=${actual.Extra}`
          : `Column '${expected.name}' does not exist in table '${tableName}'`,
      details: actual
        ? {
            expected: {
              nullable: expected.nullable,
              defaultValue: expected.defaultValue,
              defaultValues: expected.defaultValues,
              extraIncludes: expected.extraIncludes,
            },
            actual: {
              nullable: actual.Null === 'YES',
              defaultValue: actual.Default,
              extra: actual.Extra,
            },
          }
        : undefined,
    });
  }
}

async function verifyIndex(
  connection: AuthoritySqlConnection,
  tableName: string,
  expectedColumns: string[],
  unique: boolean,
  label: string,
): Promise<void> {
  const rows = await queryRows(
    connection,
    `SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
     ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
    [tableName],
  );
  const indexes = new Map<string, any[]>();
  for (const row of rows) {
    indexes.set(row.INDEX_NAME, [...(indexes.get(row.INDEX_NAME) ?? []), row]);
  }

  const matchingIndex = [...indexes.entries()].find(([, columns]) => {
    const orderedColumns = columns.map(column => column.COLUMN_NAME);
    return (
      columns[0]?.NON_UNIQUE === (unique ? 0 : 1) &&
      orderedColumns.length === expectedColumns.length &&
      orderedColumns.every((column, index) => column === expectedColumns[index])
    );
  });

  results.push({
    name: `Index: ${tableName}.${label}`,
    passed: Boolean(matchingIndex),
    error: matchingIndex
      ? undefined
      : `Missing ${unique ? 'unique ' : ''}index with ordered columns (${expectedColumns.join(', ')})`,
    details: matchingIndex
      ? { indexName: matchingIndex[0], columns: expectedColumns, unique }
      : {
          expectedColumns,
          unique,
        },
  });
}

async function verifyPrimaryKey(
  connection: AuthoritySqlConnection,
  tableName: string,
  columnName: string,
): Promise<void> {
  const rows = await queryRows(
    connection,
    `SELECT INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = 'PRIMARY'
     ORDER BY SEQ_IN_INDEX`,
    [tableName],
  );
  const passed =
    rows.length === 1 &&
    rows[0].INDEX_NAME === 'PRIMARY' &&
    rows[0].NON_UNIQUE === 0 &&
    rows[0].SEQ_IN_INDEX === 1 &&
    rows[0].COLUMN_NAME === columnName;

  results.push({
    name: `Primary key: ${tableName}.${columnName}`,
    passed,
    error: passed
      ? undefined
      : `Missing or incorrect PRIMARY key: expected exactly (${columnName})`,
    details: passed ? rows[0] : { expectedColumns: [columnName], actual: rows },
  });
}

async function verifyAutoIncrement(
  connection: AuthoritySqlConnection,
  tableName: string,
  columnName: string,
): Promise<void> {
  const rows = await queryRows(
    connection,
    `SELECT EXTRA
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );
  const extra = rows[0]?.EXTRA;
  const passed = rows.length === 1 && String(extra).toLowerCase().includes('auto_increment');

  results.push({
    name: `Identity: ${tableName}.${columnName}`,
    passed,
    error: passed ? undefined : `Column '${columnName}' must be AUTO_INCREMENT`,
    details: rows.length === 1 ? { extra } : { expected: 'auto_increment', actual: rows },
  });
}

async function verifyForeignKey(
  connection: AuthoritySqlConnection,
  tableName: string,
  columnName: string,
  referencedTable: string,
  deleteRule: string,
): Promise<void> {
  const rows = await queryRows(
    connection,
    `SELECT kcu.CONSTRAINT_NAME, kcu.REFERENCED_TABLE_NAME, kcu.REFERENCED_COLUMN_NAME, rc.DELETE_RULE
     FROM information_schema.KEY_COLUMN_USAGE kcu
     JOIN information_schema.REFERENTIAL_CONSTRAINTS rc
       ON rc.CONSTRAINT_SCHEMA = kcu.CONSTRAINT_SCHEMA
      AND rc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
      AND rc.TABLE_NAME = kcu.TABLE_NAME
     WHERE kcu.CONSTRAINT_SCHEMA = DATABASE()
       AND kcu.TABLE_NAME = ?
       AND kcu.COLUMN_NAME = ?
       AND kcu.REFERENCED_TABLE_NAME IS NOT NULL`,
    [tableName, columnName],
  );
  const matchingForeignKey = rows.find(
    row =>
      row.REFERENCED_TABLE_NAME === referencedTable &&
      row.REFERENCED_COLUMN_NAME === 'id' &&
      row.DELETE_RULE === deleteRule,
  );

  results.push({
    name: `Foreign key: ${tableName}.${columnName}`,
    passed: Boolean(matchingForeignKey),
    error: matchingForeignKey
      ? undefined
      : `Missing foreign key to ${referencedTable}.id with ON DELETE ${deleteRule}`,
    details: matchingForeignKey ?? {
      expectedTable: referencedTable,
      expectedDeleteRule: deleteRule,
    },
  });
}

async function verifyMigrations(
  connection: AuthoritySqlConnection,
  authorityContextFingerprintHash: string,
): Promise<void> {
  try {
    const manifest = loadAndValidateMigrationManifest();
    const activeFiles = manifest.orderedMigrations.map(entry => entry.filename);
    const historyTables = await queryRows(
      connection,
      `SHOW TABLES LIKE '${manifest.document.historyTable}'`,
    );

    if (historyTables.length === 0) {
      results.push({
        name: 'Migrations: Canonical SQL ledger',
        passed: false,
        error:
          'sql_migration_history does not exist. ' +
          'Run the canonical SQL migrations first.',
      });
      return;
    }

    const ledgerRows = await queryRows(
      connection,
      `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
    );
    const incompleteAttempts = await queryRows(
      connection,
      `SELECT attempt_id, migration_filename, state FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
    );
    const successfulAttempts = await queryRows(
      connection,
      `SELECT attempt_id, migration_filename, target_fingerprint_hash, lock_owner_connection_id, completed_statement_count FROM \`${manifest.document.attemptTable}\` WHERE state = 'succeeded' ORDER BY started_at, attempt_id`,
    );

    const ledger = new Map<string, string>(
      ledgerRows.map(row => [
        String(row.filename),
        String(row.checksum),
      ]),
    );

    const activeFileSet = new Set(activeFiles);

    const missingLedgerFiles = activeFiles.filter(
      file => !ledger.has(file),
    );

    const retiredLedgerFiles = ledgerRows
      .map(row => String(row.filename))
      .filter(file => !activeFileSet.has(file));

    const checksumMismatches: Array<{
      filename: string;
      expected: string;
      recorded: string;
    }> = [];

    for (const entry of manifest.orderedMigrations) {
      const recordedChecksum = ledger.get(entry.filename);
      if (!recordedChecksum) continue;
      if (recordedChecksum !== entry.checksum) {
        checksumMismatches.push({
          filename: entry.filename,
          expected: entry.checksum,
          recorded: recordedChecksum,
        });
      }
    }
    const successfulByMigration = new Map(
      successfulAttempts.map(row => [String(row.migration_filename), row]),
    );
    const missingSuccessfulAttemptEvidence = ledgerRows
      .map(row => String(row.filename))
      .filter(file => !successfulByMigration.has(file));
    const invalidSuccessfulAttemptEvidence = successfulAttempts
      .filter(
        row =>
          String(row.target_fingerprint_hash) !== authorityContextFingerprintHash ||
          !String(row.lock_owner_connection_id ?? '').trim() ||
          Number(row.completed_statement_count ?? 0) < 1,
      )
      .map(row => String(row.attempt_id));

    const passed =
      missingLedgerFiles.length === 0 &&
      retiredLedgerFiles.length === 0 &&
      checksumMismatches.length === 0 &&
      incompleteAttempts.length === 0 &&
      missingSuccessfulAttemptEvidence.length === 0 &&
      invalidSuccessfulAttemptEvidence.length === 0;

    const findings = [
      missingLedgerFiles.length
        ? `missing ledger files: ${missingLedgerFiles.join(', ')}`
        : null,
      retiredLedgerFiles.length
        ? `retired ledger files: ${retiredLedgerFiles.join(', ')}`
        : null,
      checksumMismatches.length
        ? `checksum mismatches: ${checksumMismatches
            .map(item => item.filename)
            .join(', ')}`
        : null,
      incompleteAttempts.length
        ? `incomplete migration attempts: ${incompleteAttempts.map(row => row.attempt_id).join(', ')}`
        : null,
      missingSuccessfulAttemptEvidence.length
        ? `missing successful attempt evidence: ${missingSuccessfulAttemptEvidence.join(', ')}`
        : null,
      invalidSuccessfulAttemptEvidence.length
        ? `invalid successful attempt evidence: ${invalidSuccessfulAttemptEvidence.join(', ')}`
        : null,
    ].filter(Boolean);

    results.push({
      name: 'Migrations: Canonical SQL ledger',
      passed,
      error: passed
        ? undefined
        : `Canonical migration drift: ${findings.join('; ')}.`,
      details: {
        activeFiles,
        expectedHead: manifest.document.expectedHead,
        manifestDigest: manifest.manifestDigest,
        appliedFiles: ledgerRows.map(
          row => String(row.filename),
        ),
        missingLedgerFiles,
        retiredLedgerFiles,
        checksumMismatches,
        incompleteAttempts,
        successfulAttempts: successfulAttempts.map(row => ({
          attemptId: String(row.attempt_id),
          migrationFilename: String(row.migration_filename),
          targetFingerprintHash: String(row.target_fingerprint_hash),
          lockOwnerConnectionId: String(row.lock_owner_connection_id),
          completedStatementCount: Number(row.completed_statement_count),
        })),
        missingSuccessfulAttemptEvidence,
        invalidSuccessfulAttemptEvidence,
      },
    });
  } catch (err: any) {
    results.push({
      name: 'Migrations: Verification',
      passed: false,
      error: `Migration check failed: ${err.message}`,
    });
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const authority = resolveDatabaseAuthority({ operation: 'verification' });
  const decision = authorizeDatabaseOperation(authority, {
    approval: protectedDatabaseApprovalFromEnvironment(authority),
  });
  if (FORMAT === 'human') {
    console.log('[db:verify] Authorized target:', authority.context.targetFingerprintHash.slice(0, 16));
  }

  let connection: AuthoritySqlConnection | null = null;

  try {
    connection = await createAuthoritySqlConnection(authority, decision);

    // 1. Verify tables exist
    for (const table of REQUIRED_TABLES) {
      await verifyTableExists(connection, table);
    }

    // 2. Verify columns
    for (const [table, columns] of Object.entries(REQUIRED_COLUMNS)) {
      await verifyColumns(connection, table, columns);
    }

    // 3. Verify enum values
    for (const [key, values] of Object.entries(ENUM_VALUES)) {
      const [table, column] = key.split('.');
      await verifyEnumValues(connection, table, column, values);
    }

    // 4. Verify canonical agency membership shape and relational contract.
    await verifyColumnShapes(
      connection,
      'agency_agent_memberships',
      AGENCY_AGENT_MEMBERSHIP_COLUMN_SHAPES,
    );
    await verifyPrimaryKey(connection, 'agency_agent_memberships', 'id');
    await verifyAutoIncrement(connection, 'agency_agent_memberships', 'id');
    await verifyIndex(
      connection,
      'agency_agent_memberships',
      ['agency_id', 'agent_id'],
      true,
      'unique agency/agent pair',
    );
    await verifyIndex(
      connection,
      'agency_agent_memberships',
      ['agency_id', 'status'],
      false,
      'agency/status',
    );
    await verifyIndex(
      connection,
      'agency_agent_memberships',
      ['agent_id', 'status'],
      false,
      'agent/status',
    );
    await verifyForeignKey(
      connection,
      'agency_agent_memberships',
      'agency_id',
      'agencies',
      'CASCADE',
    );
    await verifyForeignKey(connection, 'agency_agent_memberships', 'agent_id', 'agents', 'CASCADE');
    await verifyForeignKey(
      connection,
      'agency_agent_memberships',
      'created_by',
      'users',
      'SET NULL',
    );
    await verifyForeignKey(
      connection,
      'agency_agent_memberships',
      'updated_by',
      'users',
      'SET NULL',
    );

    // 5. Verify migrations
    await verifyMigrations(connection, authority.context.targetFingerprintHash);

    // ========================================================================
    // OUTPUT
    // ========================================================================

    const failed = results.filter(r => !r.passed);
    const passed = results.filter(r => r.passed);

    if (FORMAT === 'json') {
      console.log(
        JSON.stringify(
          {
            success: failed.length === 0,
            targetFingerprintHash: authority.context.targetFingerprintHash,
            targetClass: authority.context.targetClass,
            total: results.length,
            passed: passed.length,
            failed: failed.length,
            checks: results,
          },
          null,
          2,
        ),
      );
    } else {
      console.log('\n🔍 DB Contract Verification\n');
      console.log(`Total Checks: ${results.length}`);
      console.log(`✅ Passed: ${passed.length}`);
      console.log(`❌ Failed: ${failed.length}\n`);

      if (failed.length > 0) {
        console.log('Failed Checks:\n');
        failed.forEach(check => {
          console.log(`  ❌ ${check.name}`);
          console.log(`     ${check.error}`);
          if (check.details) {
            console.log(`     Details: ${JSON.stringify(check.details, null, 2)}`);
          }
          console.log('');
        });
      } else {
        console.log('✅ All contract checks passed!\n');
      }
    }

    process.exitCode = failed.length > 0 ? 1 : 0;
  } catch (err: any) {
    console.error('❌ Contract verification failed:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
