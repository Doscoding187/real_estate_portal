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

import mysql from 'mysql2/promise';
import { config } from 'dotenv';
import { readdir } from 'fs/promises';
import { join } from 'path';

config();

// ============================================================================
// CONFIGURATION
// ============================================================================

const DATABASE_URL = process.env.DATABASE_URL;
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
    { name: 'parking', type: 'enum' },
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
};

const ENUM_VALUES = {
  'developments.status': ['launching-soon', 'selling', 'sold-out'],
  'developments.developmentType': ['residential', 'commercial', 'mixed_use', 'land'],
  'developments.dev_owner_type': ['platform', 'developer'], // snake_case in DB
  'unit_types.parking': ['none', '1', '2', 'carport', 'garage'],
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
};

// ============================================================================
// VERIFICATION FUNCTIONS
// ============================================================================

async function verifyTableExists(connection: mysql.Connection, tableName: string): Promise<void> {
  const [rows] = await connection.query<any[]>('SHOW TABLES LIKE ?', [tableName]);

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
  connection: mysql.Connection,
  tableName: string,
  expectedColumns: Array<{ name: string; type: string }>,
): Promise<void> {
  const [columns] = await connection.query<any[]>('SHOW COLUMNS FROM ??', [tableName]);

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
  connection: mysql.Connection,
  tableName: string,
  columnName: string,
  expectedValues: string[],
): Promise<void> {
  const [columns] = await connection.query<any[]>('SHOW COLUMNS FROM ?? WHERE Field = ?', [
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

async function verifyMigrations(connection: mysql.Connection): Promise<void> {
  try {
    // Check if migrations table exists
    const [tables] = await connection.query<any[]>("SHOW TABLES LIKE '__drizzle_migrations'");

    if (tables.length === 0) {
      results.push({
        name: 'Migrations: __drizzle_migrations table',
        passed: false,
        error: 'Migrations table does not exist. Run migrations first.',
      });
      return;
    }

    // Count applied migrations
    const [rows] = await connection.query<any[]>(
      'SELECT COUNT(*) as count FROM __drizzle_migrations',
    );

    const appliedCount = rows[0].count;

    // Count migration files
    const migrationsDir = join(process.cwd(), 'drizzle', 'migrations');
    let fileCount = 0;

    try {
      const files = await readdir(migrationsDir);
      fileCount = files.filter(f => f.endsWith('.sql')).length;
    } catch (err) {
      results.push({
        name: 'Migrations: File count',
        passed: false,
        error: `Could not read migrations directory: ${err}`,
      });
      return;
    }

    const passed = appliedCount >= fileCount;

    results.push({
      name: 'Migrations: Applied vs Files',
      passed,
      error: passed
        ? undefined
        : `Migration drift: ${appliedCount} applied, ${fileCount} files. Run migrations.`,
      details: {
        applied: appliedCount,
        files: fileCount,
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
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL not set in environment');
    process.exit(1);
  }

  let connection: mysql.Connection | null = null;

  try {
    connection = await mysql.createConnection(DATABASE_URL);

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

    // 4. Verify migrations
    await verifyMigrations(connection);

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

    process.exit(failed.length > 0 ? 1 : 0);
  } catch (err: any) {
    console.error('❌ Contract verification failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

main();
