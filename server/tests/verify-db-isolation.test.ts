import { describe, it, expect } from 'vitest';
import { sql } from 'drizzle-orm';
import { getDb } from '../db-connection';
import { authorizeDatabaseOperation } from '../_core/databaseAuthority/authorization';
import { resolveDatabaseAuthority } from '../_core/databaseAuthority/context';

const describeWithDb = process.env.DATABASE_URL ? describe : describe.skip;

describeWithDb('Database Isolation', () => {
  it('uses the exact authorized disposable test target', async () => {
    const authority = resolveDatabaseAuthority({
      operation: 'runtime-connect',
      credentialClass: (process.env.DATABASE_CREDENTIAL_CLASS as any) ?? undefined,
    });
    expect(() => authorizeDatabaseOperation(authority)).not.toThrow();
    expect(authority.context.runtimeMode).toBe('test');
    expect(['disposable-worktree', 'disposable-test']).toContain(authority.context.targetClass);
    expect(authority.context.local).toBe(true);
    expect(authority.context.worktree.ownershipMatches).toBe(true);

    const db = await getDb();
    if (!db || typeof (db as any).execute !== 'function') throw new Error('DB execute unavailable');

    const executeResult: any = await (db as any).execute(
      sql`SELECT DATABASE() as db, @@hostname as host`,
    );
    const rows = Array.isArray(executeResult) ? executeResult[0] : executeResult;
    const first = Array.isArray(rows) ? rows[0] : rows?.[0] || rows;
    const dbName = first?.db;
    const host = first?.host;

    console.log(`[Database] Connected to: ${dbName} @ ${host}`);

    expect(dbName).toBe(authority.context.databaseName);
    expect(authority.context.targetFingerprintHash).toBe(
      process.env.DATABASE_AUTHORITY_PARENT_FINGERPRINT,
    );
  });
});
