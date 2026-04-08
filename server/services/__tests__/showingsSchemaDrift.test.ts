import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mysql, { type Connection } from 'mysql2/promise';

import { showings } from '../../../drizzle/schema/leads';
import { isShowingsSchemaReady, type ShowingsSchemaDetails } from '../showingsSchemaCompatibility';

const CANONICAL_COLUMNS = [
  'id',
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
  'createdAt',
  'updatedAt',
] as const;

const CANONICAL_INDEXES = [
  'idx_showings_agent_scheduled_at',
  'idx_showings_listing',
  'idx_showings_property',
] as const;

function rowValue<T = unknown>(row: Record<string, unknown>, key: string): T | undefined {
  const lower = key.toLowerCase();
  const upper = key.toUpperCase();
  return (row[key] ?? row[lower] ?? row[upper]) as T | undefined;
}

describe('showings schema drift guard', () => {
  it('keeps the drizzle showings contract aligned with the canonical columns', () => {
    expect(showings).toHaveProperty('listingId');
    expect(showings).toHaveProperty('propertyId');
    expect(showings).toHaveProperty('leadId');
    expect(showings).toHaveProperty('agentId');
    expect(showings).toHaveProperty('visitorId');
    expect(showings).toHaveProperty('visitorName');
    expect(showings).toHaveProperty('scheduledAt');
    expect(showings).toHaveProperty('durationMinutes');
    expect(showings).toHaveProperty('status');
    expect(showings).toHaveProperty('notes');
    expect(showings).toHaveProperty('feedback');
  });

  let connection: Connection;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for showings schema drift tests');
    }
    connection = await mysql.createConnection(process.env.DATABASE_URL);
  });

  afterAll(async () => {
    await connection.end();
  });

  it('ensures canonical showings columns exist and scheduledTime has been removed', async () => {
    const [rows] = await connection.query<Array<Record<string, unknown>>>(
      `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'showings'
      `,
    );

    const columnNames = new Set(
      rows
        .map(row => rowValue<string>(row, 'column_name'))
        .filter((value): value is string => Boolean(value)),
    );

    expect(Array.from(columnNames)).toEqual(expect.arrayContaining([...CANONICAL_COLUMNS]));
    expect(columnNames.has('scheduledTime')).toBe(false);
  });

  it('ensures the canonical showings status enum is present', async () => {
    const [rows] = await connection.query<Array<Record<string, unknown>>>(
      `
        SELECT column_type
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'showings'
          AND column_name = 'status'
      `,
    );

    expect(rowValue(rows[0] ?? {}, 'column_type')).toBe(
      "enum('requested','confirmed','completed','cancelled','no_show')",
    );
  });

  it('ensures canonical showings indexes exist', async () => {
    const [rows] = await connection.query<Array<Record<string, unknown>>>(
      `
        SELECT DISTINCT index_name
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = 'showings'
      `,
    );

    const indexNames = new Set(
      rows
        .map(row => rowValue<string>(row, 'index_name'))
        .filter((value): value is string => Boolean(value)),
    );

    expect(Array.from(indexNames)).toEqual(expect.arrayContaining([...CANONICAL_INDEXES]));
  });

  it('ensures the canonical showings shape is runtime-ready', async () => {
    const readColumn = async (columnName: string) => {
      const [rows] = await connection.query<Array<Record<string, unknown>>>(
        `
          SELECT COUNT(*) AS count_value
          FROM information_schema.columns
          WHERE table_schema = DATABASE()
            AND table_name = 'showings'
            AND column_name = ?
        `,
        [columnName],
      );

      return Number(rowValue(rows[0] ?? {}, 'count_value') ?? 0) > 0;
    };

    const details: ShowingsSchemaDetails = {
      table: true,
      listingIdColumn: await readColumn('listingId'),
      propertyIdColumn: await readColumn('propertyId'),
      leadIdColumn: await readColumn('leadId'),
      agentIdColumn: await readColumn('agentId'),
      scheduledTimeColumn: await readColumn('scheduledTime'),
      scheduledAtColumn: await readColumn('scheduledAt'),
      statusColumn: await readColumn('status'),
      notesColumn: await readColumn('notes'),
    };

    expect(isShowingsSchemaReady(details)).toBe(true);
  });
});
