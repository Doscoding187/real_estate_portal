import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb } from '../db-connection';
import * as dotenv from 'dotenv';
import path from 'path';

describe('Database Isolation', () => {
  it('should be connected to listify_test (or a test-specific DB)', async () => {
    const db = await getDb();
    const [rows]: any = await db.execute(sql`SELECT DATABASE() as db, @@hostname as host`);
    const dbName = rows[0].db;
    const host = rows[0].host;

    console.log(`[Database] Connected to: ${dbName} @ ${host}`);

    expect(dbName).not.toBe('listify_prod');
    expect(dbName).not.toBe('listify_staging');
    expect(dbName).toBe('listify_test');
  });
});
