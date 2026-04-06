#!/usr/bin/env tsx
import { config } from 'dotenv';
import mysql from 'mysql2/promise';

type DbRow = Record<string, unknown>;

function readField<T = unknown>(row: DbRow, ...keys: string[]): T | undefined {
  for (const key of keys) {
    if (key in row) return row[key] as T;
    const upper = key.toUpperCase();
    if (upper in row) return row[upper] as T;
    const lower = key.toLowerCase();
    if (lower in row) return row[lower] as T;
  }
  return undefined;
}

function loadEnv() {
  config();
  if (process.env.NODE_ENV === 'test') {
    config({ path: '.env.test', override: true });
  } else if (process.env.NODE_ENV === 'production') {
    config({ path: '.env.production', override: true });
  } else if (process.env.NODE_ENV === 'staging') {
    config({ path: '.env.staging', override: true });
  }
}

async function run() {
  loadEnv();

  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  try {
    const [columnRows] = await connection.query<Array<DbRow>>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'showings'
      `,
    );

    const [enumRows] = await connection.query<Array<DbRow>>(
      `
        SELECT column_type
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'showings'
          AND column_name = 'status'
      `,
    );

    const [indexRows] = await connection.query<Array<DbRow>>(
      `
        SELECT DISTINCT index_name
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'showings'
      `,
    );

    const [sanityRows] = await connection.query<Array<DbRow>>(
      `
        SELECT
          (SELECT COUNT(*) FROM showings) AS showings_count,
          (SELECT COUNT(*) FROM showings WHERE scheduledAt IS NULL) AS null_scheduled_at_count,
          (
            SELECT COUNT(*)
            FROM information_schema.columns
            WHERE table_schema = DATABASE()
              AND table_name = 'showings'
              AND column_name = 'scheduledTime'
          ) AS scheduled_time_column_count
      `,
    );

    const columns = new Set(
      columnRows
        .map(row => readField<string>(row, 'column_name'))
        .filter((value): value is string => Boolean(value)),
    );
    const indexes = new Set(
      indexRows
        .map(row => readField<string>(row, 'index_name'))
        .filter((value): value is string => Boolean(value)),
    );
    const statusEnum = String(readField(enumRows[0] || {}, 'column_type') || '');
    const sanityRow = sanityRows[0] || {};

    const requiredColumns = [
      'listingId',
      'propertyId',
      'leadId',
      'agentId',
      'visitorId',
      'visitorName',
      'scheduledAt',
      'durationMinutes',
      'status',
      'notes',
      'feedback',
    ];

    const requiredIndexes = [
      'idx_showings_agent_scheduled_at',
      'idx_showings_listing',
      'idx_showings_property',
    ];

    const errors: string[] = [];
    const warnings: string[] = [];

    for (const column of requiredColumns) {
      if (!columns.has(column)) {
        errors.push(`Missing column: ${column}`);
      }
    }

    for (const indexName of requiredIndexes) {
      if (!indexes.has(indexName)) {
        errors.push(`Missing index: ${indexName}`);
      }
    }

    if (columns.has('scheduledTime')) {
      errors.push('Legacy showings.scheduledTime column still exists');
    }

    if (!statusEnum.includes("'no_show'")) {
      errors.push('showings.status enum is missing no_show');
    }

    const showingsCount = Number(readField(sanityRow, 'showings_count') || 0);
    const nullScheduledAtCount = Number(readField(sanityRow, 'null_scheduled_at_count') || 0);
    const scheduledTimeColumnCount = Number(
      readField(sanityRow, 'scheduled_time_column_count') || 0,
    );

    if (nullScheduledAtCount > 0) {
      errors.push(`showings contains ${nullScheduledAtCount} row(s) with NULL scheduledAt`);
    }
    if (scheduledTimeColumnCount > 0) {
      errors.push('Legacy scheduledTime metadata still present');
    }
    if (showingsCount === 0) {
      warnings.push('showings table has no rows in this environment');
    }

    console.log('Showings verification');
    console.log(`- rows: ${showingsCount}`);
    console.log(`- status enum: ${statusEnum}`);
    console.log(`- scheduledTime present: ${columns.has('scheduledTime') ? 'yes' : 'no'}`);

    if (warnings.length > 0) {
      console.log('Warnings:');
      for (const warning of warnings) {
        console.log(`- ${warning}`);
      }
    }

    if (errors.length > 0) {
      console.error('Verification FAILED:');
      for (const error of errors) {
        console.error(`- ${error}`);
      }
      process.exit(1);
    }

    console.log('Verification PASSED.');
  } finally {
    await connection.end();
  }
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
