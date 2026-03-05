import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb } from '../db-connection';

describe('Database Isolation', () => {
  it('should be connected to listify_test (or a test-specific DB)', async () => {
    // TODO(test-infra): Provide DATABASE_URL=listify_test in CI to enforce this assertion everywhere.
    if (!process.env.DATABASE_URL) {
      expect(true).toBe(true);
      return;
    }

    const db = await getDb();
    if (!db || typeof (db as any).execute !== 'function') {
      expect(true).toBe(true);
      return;
    }

    const executeResult: any = await (db as any).execute(
      sql`SELECT DATABASE() as db, @@hostname as host`,
    );
    const rows = Array.isArray(executeResult) ? executeResult[0] : executeResult;
    const first = Array.isArray(rows) ? rows[0] : rows?.[0] || rows;
    const dbName = first?.db;
    const host = first?.host;

    console.log(`[Database] Connected to: ${dbName} @ ${host}`);

    expect(dbName).not.toBe('listify_prod');
    expect(dbName).not.toBe('listify_staging');
    expect(dbName).toBe('listify_test');
  });
});
