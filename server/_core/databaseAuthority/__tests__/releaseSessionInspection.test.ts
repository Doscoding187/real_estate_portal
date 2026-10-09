import { describe, expect, it } from 'vitest';
import { inspectReleaseSessions, restrictSessionInspection, SESSION_INSPECTION_SQL } from '../releaseSessionInspection';
import type { AuthoritySqlConnection } from '../connectionAuthority';

describe('release session inspection', () => {
  function fixture(grant = 'GRANT PROCESS ON *.* TO operator', db = 'propertylistify_database', includeSelf = true) {
    const queries: string[] = [];
    const connection: AuthoritySqlConnection = {
      async execute() { throw new Error('No execute allowed'); }, async end() {},
      async query(sql) {
        queries.push(sql);
        switch (sql) {
          case SESSION_INSPECTION_SQL.identity: return [[{ identity: 'operator@%', connectionId: 10, databaseName: db }]];
          case SESSION_INSPECTION_SQL.grants: return [[{ grant }]];
          case SESSION_INSPECTION_SQL.sessions: return [includeSelf ? [{ id: 10, user: 'operator' }, { id: 11, user: 'worker' }] : []];
          case SESSION_INSPECTION_SQL.transactions: return [[{ connectionId: 11, state: 'RUNNING', rowsModified: 1 }]];
          default: throw new Error('Unexpected SQL');
        }
      },
    };
    return { connection, queries };
  }
  it('requires visibility, includes foreign sessions and never certifies a freeze from one snapshot', async () => {
    const f = fixture(); const report = await inspectReleaseSessions(f.connection);
    expect(report.sessions).toHaveLength(2); expect(report.transactions).toHaveLength(1);
    expect(report.frozen).toBe(false); expect(report.globalProcessPrivilegeVerified).toBe(true);
    expect(f.queries).toEqual(Object.values(SESSION_INSPECTION_SQL));
    expect(SESSION_INSPECTION_SQL.sessions).not.toContain('INFO AS');
  });
  it.each(['GRANT SELECT ON propertylistify_database.* TO inspector', 'GRANT PROCESS ON other.* TO operator', 'GRANT USAGE ON *.* TO inspector'])('rejects insufficient grants: %s', async grant => {
    const f = fixture(grant); await expect(inspectReleaseSessions(f.connection)).rejects.toThrow('PROCESS');
    expect(f.queries).toHaveLength(2);
  });
  it('rejects another database before inventory', async () => {
    const f = fixture(undefined, 'other'); await expect(inspectReleaseSessions(f.connection)).rejects.toThrow('target mismatch'); expect(f.queries).toHaveLength(1);
  });
  it('rejects incomplete inventory', async () => {
    await expect(inspectReleaseSessions(fixture(undefined, undefined, false).connection)).rejects.toThrow('Observer missing');
  });
});

it('blocks arbitrary reads, writes, parameters and execute on the observer connection', async () => {
  const connection: AuthoritySqlConnection = { async query() { return []; }, async execute() { return []; }, async end() {} };
  const limited = restrictSessionInspection(connection);
  for (const sql of ['SELECT * FROM users', 'KILL 42', 'GRANT PROCESS ON *.* TO somebody', 'UPDATE users SET id=1']) {
    expect(() => limited.query(sql)).toThrow('fixed metadata');
  }
  expect(() => limited.query(SESSION_INSPECTION_SQL.sessions, [1])).toThrow('fixed metadata');
  await expect(limited.execute(SESSION_INSPECTION_SQL.sessions)).rejects.toThrow('prohibited');
  await expect(limited.query(SESSION_INSPECTION_SQL.sessions)).resolves.toEqual([]);
});
