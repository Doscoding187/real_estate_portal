import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mysql, { type Connection } from 'mysql2/promise';

import { showings } from '../../../drizzle/schema/leads';

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

  const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;
  let connection: Connection | undefined;

  beforeAll(async () => {
    if (process.env.DATABASE_URL) {
      connection = await mysql.createConnection(process.env.DATABASE_URL);
    }
  });

  afterAll(async () => {
    await connection?.end();
  });

  describeWithDb('database-backed drift checks', () => {
    it('ensures canonical showings columns exist and scheduledTime has been removed', async () => {
      const [rows] = await connection!.query<Array<Record<string, unknown>>>(
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
      const [rows] = await connection!.query<Array<Record<string, unknown>>>(
        `
        SELECT column_type
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = 'showings'
          AND column_name = 'status'
      `,
      );

      expect(rowValue(rows[0] ?? {}, 'column_type')).toBe(
        "enum('requested','awaiting_confirmation','confirmed','completed','cancelled','no_show','rescheduled')",
      );
    });

    it('ensures canonical showings indexes exist', async () => {
      const [rows] = await connection!.query<Array<Record<string, unknown>>>(
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


  });
});
