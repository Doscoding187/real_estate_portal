import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import mysql from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  PROBE_ACCOUNT_SQL,
  PROBE_GRANTS_SQL,
  founderCountSql,
  probeTableSql,
  readFounderCounts,
} from '../_core/databaseAuthority/runtimeGrant0197ProbeSupport';

// Least-privileged CI identity: the isolated runtime role URL provisioned by db:ci:identities:bootstrap.
const url = process.env.DATABASE_RUNTIME_URL;
// In the CI DB step (S2_DB_TESTS=1) a missing URL must fail, never skip silently.
if (process.env.S2_DB_TESTS === '1' && !url)
  throw new Error('0197 probe SQL test: DATABASE_RUNTIME_URL is required when S2_DB_TESTS=1.');
const describeWithDb: typeof describe = url
  ? describe
  : (((name, fn) => describe.skip(`${name} (requires DATABASE_RUNTIME_URL)`, fn)) as typeof describe);

const inventory = JSON.parse(
  readFileSync(resolve(process.cwd(), 'drizzle/schema/canonical-model-inventory.json'), 'utf8'),
) as { tables: string[] };

describeWithDb('0197 probe SQL against MySQL 8.4', () => {
  let connection: mysql.Connection;
  let database = '';

  beforeAll(async () => {
    connection = await mysql.createConnection(url as string);
    const [rows] = await connection.query('SELECT DATABASE() AS db');
    database = String((rows as Array<Record<string, unknown>>)[0]?.db ?? '');
    expect(database).toMatch(/^[A-Za-z0-9_]+$/);
  });

  afterAll(async () => {
    await connection?.end();
  });

  it('runs the account statement and returns current_identity', async () => {
    const [rows] = await connection.query(PROBE_ACCOUNT_SQL);
    const identity = (rows as Array<Record<string, unknown>>)[0]?.current_identity;
    expect(typeof identity).toBe('string');
    expect(String(identity).length).toBeGreaterThan(0);
  });

  it('runs SHOW GRANTS with at least one row', async () => {
    const [rows] = await connection.query(PROBE_GRANTS_SQL);
    expect((rows as unknown[]).length).toBeGreaterThanOrEqual(1);
  });

  it('never fails to parse for any canonical table', async () => {
    expect(inventory.tables.length).toBeGreaterThan(0);
    const failures: string[] = [];
    for (const table of inventory.tables) {
      try {
        await connection.query(probeTableSql(database, table));
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code !== 'ER_TABLEACCESS_DENIED_ERROR') failures.push(`${table}:${code ?? 'UNCLASSIFIED'}`);
      }
    }
    expect(failures).toEqual([]);
  });

  it('runs the founder count with a fake email and returns numeric counts', async () => {
    expect(founderCountSql(database)).toContain('?');
    try {
      const counts = await readFounderCounts(
        {
          query: (sql: string, values?: readonly unknown[]) =>
            connection.query(sql.split('propertylistify_database').join(database), values as unknown[]),
        },
        'no-such-founder@example.invalid',
      );
      expect(typeof counts?.emailRows).toBe('number');
      expect(typeof counts?.superAdminRows).toBe('number');
      expect(typeof counts?.platformFounderRows).toBe('number');
    } catch (error) {
      expect((error as { code?: string }).code).toBe('ER_TABLEACCESS_DENIED_ERROR');
    }
  });
});
