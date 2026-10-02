import { describe, expect, it } from 'vitest';
import { resolveDatabaseAuthority } from '../context';
import { authorizeDatabaseOperation, expectedDatabaseAcknowledgement } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { canonicalGeographyReleaseRows } from '../dataAdapters/canonicalGeography';
import {
  planGeographyRows,
  releaseCanonicalGeography,
  type GeographySnapshot,
} from '../dataAdapters/geographyRelease';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';

function authority(
  operation: 'release-reference-plan' | 'release-reference-apply' | 'release-reference-verify',
  host = 'propertylistify-mysql.mysql.database.azure.com',
) {
  const target = resolveDatabaseAuthority({
    operation,
    explicitDatabaseUrl: `mysql://reader:private@${host}/propertylistify_database`,
    credentialClass: operation === 'release-reference-apply' ? 'migration' : 'read-only',
    processEnv: {
      NODE_ENV: 'production',
      APP_ENV: 'production',
      DATABASE_MIGRATION_URL: `mysql://migrator:separate@${host}/propertylistify_database`,
    },
  });
  const decision = authorizeDatabaseOperation(target, {
    approval: {
      actor: 'test',
      reference: 'TEST-GEOGRAPHY',
      operation,
      targetFingerprintHash: target.context.targetFingerprintHash,
    },
    acknowledgement: expectedDatabaseAcknowledgement(target.context),
  });
  return { authority: target, decision };
}
function fixture() {
  let snapshot: GeographySnapshot = { provinces: [], cities: [], suburbs: [] };
  let saved: GeographySnapshot | undefined;
  const statements: string[] = [];
  let failInsert = false;
  let wrongOwner = false;
  const connection: AuthoritySqlConnection = {
    async execute(sql, values = []) {
      statements.push(sql);
      if (sql.includes('information_schema.tables'))
        return [
          [{ table_name: 'sql_migration_history' }, { table_name: 'sql_migration_attempts' }],
        ];
      if (sql.includes('sql_migration_history'))
        return [
          loadAndValidateMigrationManifest().orderedMigrations.map(m => ({
            filename: m.filename,
            checksum: m.checksum,
          })),
        ];
      if (sql.includes('sql_migration_attempts')) return [[]];
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1, owner: 77 }]];
      if (sql.includes('IS_USED_LOCK')) return [[{ owner: wrongOwner ? 78 : 77, current_id: 77 }]];
      const read = /^SELECT \* FROM (provinces|cities|suburbs) ORDER BY id$/.exec(sql);
      if (read) return [structuredClone(snapshot[read[1] as keyof GeographySnapshot])];
      const insert = /^INSERT INTO (provinces|cities|suburbs) \((.*?)\) VALUES/.exec(sql);
      if (insert) {
        if (failInsert) throw new Error('injected insert failure');
        const table = insert[1] as keyof GeographySnapshot;
        const columns = insert[2].replace(/`/g, '').split(', ');
        const id = snapshot[table].length + 100;
        snapshot[table].push({ id, ...Object.fromEntries(columns.map((c, i) => [c, values[i]])) });
        return [{ insertId: id }];
      }
      throw new Error(`Unexpected SQL ${sql}`);
    },
    async query(sql) {
      statements.push(sql);
      if (sql === 'START TRANSACTION') saved = structuredClone(snapshot);
      else if (sql === 'ROLLBACK') snapshot = saved!;
      else if (sql !== 'COMMIT' && !sql.includes('RELEASE_LOCK'))
        throw new Error('Unexpected control SQL');
      return [[]];
    },
    async end() {},
  };
  return {
    connection,
    statements,
    get snapshot() {
      return snapshot;
    },
    failInsert() {
      failInsert = true;
    },
    wrongOwner() {
      wrongOwner = true;
    },
  };
}

describe('catalog-bound protected geography release', () => {
  it('plans without writes and applies/repeats without replacing IDs', async () => {
    const f = fixture();
    const p = await releaseCanonicalGeography({
      ...authority('release-reference-plan'),
      connection: f.connection,
    });
    expect(p.pendingRows).toBe(canonicalGeographyReleaseRows().length);
    expect(f.statements.every(s => s.startsWith('SELECT'))).toBe(true);
    const applied = await releaseCanonicalGeography({
      ...authority('release-reference-apply'),
      connection: f.connection,
      expectedPlanDigest: p.planDigest,
    });
    expect(applied.pendingRows).toBe(0);
    const initial = structuredClone(f.snapshot);
    const inserts = f.statements.filter(s => s.startsWith('INSERT')).length;
    const again = await releaseCanonicalGeography({
      ...authority('release-reference-plan'),
      connection: f.connection,
    });
    await releaseCanonicalGeography({
      ...authority('release-reference-apply'),
      connection: f.connection,
      expectedPlanDigest: again.planDigest,
    });
    await releaseCanonicalGeography({
      ...authority('release-reference-verify'),
      connection: f.connection,
    });
    expect(f.snapshot).toEqual(initial);
    expect(f.statements.filter(s => s.startsWith('INSERT'))).toHaveLength(inserts);
    expect(f.statements.some(s => /^(UPDATE|DELETE|TRUNCATE|ALTER|DROP)/.test(s))).toBe(false);
  });
  it('preserves old identities when a catalog gains a new child', () => {
    const desired = canonicalGeographyReleaseRows();
    const province = desired.find(r => r.table === 'provinces')!;
    const snapshot = { provinces: [{ id: 321, ...province.values }], cities: [], suburbs: [] };
    const newCity = {
      table: 'cities' as const,
      key: `${province.key}/synthetic-test-city`,
      parentKey: province.key,
      values: {
        name: 'Synthetic test city',
        slug: 'synthetic-test-city',
        latitude: null,
        longitude: null,
        isMetro: 1,
        status: 'verified',
      },
    };
    const plan = planGeographyRows([province, newCity], snapshot);
    expect(plan.ids.get(province.key)).toBe(321);
    expect(plan.pending).toEqual([newCity]);
    expect(snapshot.provinces[0].id).toBe(321);
  });
  it.each(['unknown', 'duplicate', 'name', 'coordinate', 'status', 'orphan'] as const)(
    'rejects %s data before writes',
    kind => {
      const desired = canonicalGeographyReleaseRows();
      const p = desired.find(r => r.table === 'provinces')!;
      const snapshot: GeographySnapshot = {
        provinces: [{ id: 1, ...p.values }],
        cities: [],
        suburbs: [],
      };
      if (kind === 'unknown') snapshot.provinces[0].slug = 'unapproved';
      if (kind === 'duplicate') snapshot.provinces.push({ ...snapshot.provinces[0], id: 2 });
      if (kind === 'name') snapshot.provinces[0].name = 'changed';
      if (kind === 'coordinate') snapshot.provinces[0].latitude = 99;
      if (kind === 'status') snapshot.provinces[0].status = 'retired';
      if (kind === 'orphan') snapshot.cities.push({ id: 2, slug: 'orphan', provinceId: 99 });
      expect(() => planGeographyRows(desired, snapshot)).toThrow();
    },
  );
  it('rejects stale/missing plans and mismatched lock ownership without INSERT', async () => {
    for (const mode of ['missing', 'stale', 'owner']) {
      const f = fixture();
      if (mode === 'owner') f.wrongOwner();
      await expect(
        releaseCanonicalGeography({
          ...authority('release-reference-apply'),
          connection: f.connection,
          expectedPlanDigest: mode === 'missing' ? undefined : 'a'.repeat(64),
        }),
      ).rejects.toThrow();
      expect(f.statements.some(s => s.startsWith('INSERT'))).toBe(false);
    }
  });
  it('rolls back a failed insert and releases the lock', async () => {
    const f = fixture();
    const plan = await releaseCanonicalGeography({
      ...authority('release-reference-plan'),
      connection: f.connection,
    });
    f.failInsert();
    await expect(
      releaseCanonicalGeography({
        ...authority('release-reference-apply'),
        connection: f.connection,
        expectedPlanDigest: plan.planDigest,
      }),
    ).rejects.toThrow('injected');
    expect(f.statements).toContain('ROLLBACK');
    expect(f.statements.at(-1)).toContain('RELEASE_LOCK');
    expect(f.snapshot.provinces).toHaveLength(0);
  });
  it.each([
    'gateway01.ap-northeast-1.prod.aws.tidbcloud.com',
    'other.mysql.database.azure.com',
    'pl-azure84-rehearsal-20260928.mysql.database.azure.com',
  ])('refuses non-target %s', async host => {
    const f = fixture();
    await expect(
      (async () =>
        releaseCanonicalGeography({
          ...authority('release-reference-plan', host),
          connection: f.connection,
        }))(),
    ).rejects.toThrow();
    expect(f.statements).toHaveLength(0);
  });
  it('refuses fabricated decisions before SQL', async () => {
    const f = fixture(),
      a = authority('release-reference-plan');
    await expect(
      releaseCanonicalGeography({ ...a, decision: { ...a.decision }, connection: f.connection }),
    ).rejects.toThrow();
    expect(f.statements).toHaveLength(0);
  });
});
