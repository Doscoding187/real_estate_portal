import { describe, expect, it } from 'vitest';
import { resolveDatabaseAuthority } from '../context';
import { authorizeDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { inspectPlaceReleaseTarget } from '../dataAdapters/placeReleaseInspection';

function fixture() {
  const authority = resolveDatabaseAuthority({
    operation: 'release-reference-plan',
    explicitDatabaseUrl:
      'mysql://propertylistify_b08_inspector:private@propertylistify-mysql.mysql.database.azure.com/propertylistify_database',
    credentialClass: 'read-only',
    processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
  });
  const decision = authorizeDatabaseOperation(authority, {
    approval: {
      actor: 'test',
      reference: 'TEST-READONLY-CENSUS',
      operation: 'release-reference-plan',
      targetFingerprintHash: authority.context.targetFingerprintHash,
    },
  });
  const statements: string[] = [];
  const flags = { wrongIdentity: false, mutationGrant: false };
  const connection: AuthoritySqlConnection = {
    async execute(sql) {
      statements.push(sql);
      if (sql.startsWith('SELECT VERSION'))
        return [
          [
            {
              version: '8.4.9-azure',
              selected_database: 'propertylistify_database',
              current_identity: flags.wrongIdentity
                ? 'app_runtime@%'
                : 'propertylistify_b08_inspector@%',
            },
          ],
        ];
      if (sql === 'SHOW GRANTS')
        return [
          [
            { grant: 'GRANT USAGE ON *.* TO inspector' },
            {
              grant: flags.mutationGrant
                ? 'GRANT SELECT, INSERT ON `propertylistify_database`.* TO inspector'
                : 'GRANT SELECT ON `propertylistify_database`.* TO inspector',
            },
          ],
        ];
      if (sql.includes('sql_migration_history'))
        return [[{ filename: '0096_user_founder_authority_unique.sql', checksum: 'accepted' }]];
      if (sql.includes('information_schema.columns')) {
        expect(sql).toContain("COLUMN_NAME = 'place_id'");
        return [[]];
      }
      if (sql.includes('FROM cities'))
        return [
          [
            {
              id: 211,
              name: 'North Riding',
              slug: 'north-riding',
              status: 'verified',
              province_code: 'GP',
            },
          ],
        ];
      if (sql.startsWith('SELECT')) return [[]];
      throw new Error('Unapproved query');
    },
    async query() {
      throw new Error('Control/write queries are forbidden for inspection');
    },
    async end() {},
  };
  return { authority, decision, connection, statements, flags };
}
describe('protected read-only Place release census', () => {
  it('reads ledger, schema and the bounded reported legacy locality without reading private listing data', async () => {
    const f = fixture();
    const report = await inspectPlaceReleaseTarget(f);
    expect(report.databaseMutation).toBe(false);
    expect(report.physicalTables).toEqual([]);
    expect(report.legacyNorthRiding[0].id).toBe(211);
    expect(f.statements.every(s => s.startsWith('SELECT') || s === 'SHOW GRANTS')).toBe(true);
    expect(
      f.statements.some(s => /FROM listings|FROM properties|privateAddress|GET_LOCK/.test(s)),
    ).toBe(false);
  });
  it.each(['wrongIdentity', 'mutationGrant'] as const)(
    'refuses %s before reading application data',
    async flag => {
      const f = fixture();
      f.flags[flag] = true;
      await expect(inspectPlaceReleaseTarget(f)).rejects.toThrow(/identity|grants/);
      expect(f.statements.some(s => s.includes('FROM cities'))).toBe(false);
    },
  );
  it('rejects cloned authorization before any database read', async () => {
    const f = fixture();
    await expect(
      inspectPlaceReleaseTarget({ ...f, decision: { ...f.decision } }),
    ).rejects.toThrow();
    expect(f.statements).toEqual([]);
  });
});
