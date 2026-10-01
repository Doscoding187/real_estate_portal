import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { authorizeDatabaseOperation } from '../../_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../../_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../_core/databaseAuthority/context';
import { assertPrimaryKeyMigrationPreconditions } from '../runSqlMigrations';

const describeDatabase = process.env.DATABASE_URL ? describe : describe.skip;

function rows(result: unknown): Record<string, unknown>[] {
  return Array.isArray(result) && Array.isArray(result[0])
    ? result[0] as Record<string, unknown>[]
    : [];
}

describeDatabase('B08 primary-key migration physical preconditions', () => {
  let connection: AuthoritySqlConnection;

  beforeAll(async () => {
    const authority = resolveDatabaseAuthority({ operation: 'test-fixture' });
    const decision = authorizeDatabaseOperation(authority, { root: process.cwd() });
    connection = await createAuthoritySqlConnection(authority, decision);
  });

  afterAll(async () => {
    await connection?.end();
  });

  it.each([
    {
      table: 'user_onboarding_state',
      filename: '0093_user_onboarding_state_primary_key.sql',
      columns: '`user_id` int NULL',
      duplicateRows: '(41), (41)',
      nullRows: '(NULL)',
      cleanRows: '(41), (42)',
      identity: ['user_id'],
    },
    {
      table: 'content_topics',
      filename: '0094_content_topics_primary_key.sql',
      columns: '`content_id` int NULL, `topic_id` int NULL',
      duplicateRows: '(41, 51), (41, 51)',
      nullRows: '(NULL, 51)',
      cleanRows: '(41, 51), (41, 52)',
      identity: ['content_id', 'topic_id'],
    },
  ])('$table rejects conflicts and preserves clean rows', async fixture => {
    // This temporary table shadows the canonical table only on this connection.
    // It cannot change the persistent schema or the migration ledger.
    await connection.query(`CREATE TEMPORARY TABLE \`${fixture.table}\` (${fixture.columns})`);
    try {
      await connection.query(`INSERT INTO \`${fixture.table}\` VALUES ${fixture.duplicateRows}`);
      await expect(assertPrimaryKeyMigrationPreconditions(connection, fixture.filename))
        .rejects.toThrow('duplicate identity');

      await connection.query(`DELETE FROM \`${fixture.table}\``);
      await connection.query(`INSERT INTO \`${fixture.table}\` VALUES ${fixture.nullRows}`);
      await expect(assertPrimaryKeyMigrationPreconditions(connection, fixture.filename))
        .rejects.toThrow('null identity component');

      await connection.query(`DELETE FROM \`${fixture.table}\``);
      await connection.query(`INSERT INTO \`${fixture.table}\` VALUES ${fixture.cleanRows}`);
      await expect(assertPrimaryKeyMigrationPreconditions(connection, fixture.filename))
        .resolves.toBeUndefined();
      const migration = readFileSync(new URL(`../${fixture.filename}`, import.meta.url), 'utf8');
      await connection.query(migration);

      const primaryColumns = rows(await connection.query(`SHOW INDEX FROM \`${fixture.table}\``))
        .filter(row => row.Key_name === 'PRIMARY')
        .sort((a, b) => Number(a.Seq_in_index) - Number(b.Seq_in_index))
        .map(row => row.Column_name);
      expect(primaryColumns).toEqual(fixture.identity);
      expect(rows(await connection.query(`SELECT * FROM \`${fixture.table}\``))).toHaveLength(2);
    } finally {
      await connection.query(`DROP TEMPORARY TABLE IF EXISTS \`${fixture.table}\``);
    }
  });
});
