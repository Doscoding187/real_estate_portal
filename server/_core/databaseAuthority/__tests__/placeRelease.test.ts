import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveDatabaseAuthority } from '../context';
import { authorizeDatabaseOperation, expectedDatabaseAcknowledgement } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';
import { loadPlaceAdmissionTerritoryRegistry } from '../../../../shared/placeAdmissionTerritories';
import {
  loadPlaceReleaseCandidate,
  PLACE_RELEASE_TABLES,
  reconcilePlaceRelease,
  releaseCanonicalPlaces,
  previewCanonicalPlaceRelease,
  type PlaceReleaseRows,
} from '../dataAdapters/placeRelease';

const controls = vi.hoisted(() => ({
  sourceVersion: 'source-1',
  physicalDrift: false,
  heldParent: false,
}));
vi.mock('../dataAdapters/canonicalPlaces', () => ({
  loadCanonicalPlacePackage: (root: string, ref: { territoryId: string }) => {
    const territoryIds = [
      'za-gp',
      'za-wc',
      'za-kzn',
      'za-ec',
      'za-fs',
      'za-mp',
      'za-li',
      'za-nw',
      'za-nc',
    ];
    const index = territoryIds.indexOf(ref.territoryId) + 1;
    const id = (n: number) => `pl-place-01-${String(index * 100 + n).padStart(24, '0')}`;
    const rootId = id(0),
      localId = id(1),
      heldId = id(2);
    const place = (place_id: string, province: boolean, held = false) => ({
      place_id,
      place_type: province ? 'province' : 'suburb',
      place_classification: 'residential',
      verification_status: 'provisional',
      lifecycle_status: 'active',
      publication_eligible: 0,
      search_eligible: 1,
      search_scope: province ? 'province' : 'locality',
      licensing_classification: held
        ? 'osm_only_odbl_provisional'
        : controls.sourceVersion === 'unlicensed'
          ? null
          : 'permissive_supported',
    });
    const places = [
      place(rootId, true, controls.heldParent),
      place(localId, false),
      ...(index === 1 ? [place(heldId, false, true)] : []),
    ];
    const names = places.map(p => ({
      place_id: p.place_id,
      name: p.place_id,
      normalized_name: p.place_id,
      name_role: 'preferred_public',
      name_state: 'active',
      is_searchable: 1,
      evidence_source: 'approved-source',
    }));
    const relationships = places
      .filter(p => p.place_id !== rootId)
      .map(p => ({
        from_place_id: p.place_id,
        to_place_id: rootId,
        relationship_type: 'administratively_contains',
        search_scope_authorized: 0,
        evidence_source: 'approved-source',
      }));
    const evidence = places.map(p => ({
      place_id: p.place_id,
      evidence_kind: 'source_record',
      evidence_state: 'accepted',
      subject: 'source',
      provider: 'geonames',
      provider_record_id: p.place_id,
    }));
    const external_mappings = places.map(p => ({
      place_id: p.place_id,
      provider: 'geonames',
      provider_record_id: p.place_id,
    }));
    return {
      territory: { territoryId: ref.territoryId, admissionVersion: 'reviewed-v1' },
      verifiedDigest: controls.sourceVersion,
      rows: { places, names, relationships, evidence, external_mappings },
    };
  },
}));
vi.mock('../schemaCongruency', async importOriginal => {
  const original = await importOriginal<typeof import('../schemaCongruency')>();
  return {
    ...original,
    normalizedPhysicalSchema: async (_c: unknown, _p: unknown, desired: unknown) =>
      controls.physicalDrift ? { tables: [] } : desired,
  };
});

const tables = Object.keys(PLACE_RELEASE_TABLES) as (keyof PlaceReleaseRows)[];
const empty = (): PlaceReleaseRows =>
  Object.fromEntries(tables.map(t => [t, []])) as PlaceReleaseRows;
function authority(
  operation: 'release-reference-plan' | 'release-reference-apply' | 'release-reference-verify',
  host = 'propertylistify-mysql.mysql.database.azure.com',
) {
  const authority = resolveDatabaseAuthority({
    operation,
    explicitDatabaseUrl: `mysql://reader:private@${host}/propertylistify_database`,
    credentialClass: operation === 'release-reference-apply' ? 'migration' : 'read-only',
    processEnv: {
      NODE_ENV: 'production',
      APP_ENV: 'production',
      DATABASE_MIGRATION_URL: `mysql://migrator:separate@${host}/propertylistify_database`,
    },
  });
  const decision = authorizeDatabaseOperation(authority, {
    approval: {
      actor: 'test',
      reference: 'TEST-PLACE-RELEASE',
      operation,
      targetFingerprintHash: authority.context.targetFingerprintHash,
    },
    acknowledgement: expectedDatabaseAcknowledgement(authority.context),
  });
  return { authority, decision };
}
function fixture() {
  let snapshot = empty(),
    before = empty();
  const statements: string[] = [];
  const settings = {
    headCount: 112,
    physicalCount: 5,
    wrongOwner: false,
    failInsert: false,
    driftAfterInsert: false,
  };
  const connection: AuthoritySqlConnection = {
    async execute(sql, values = []) {
      statements.push(sql);
      if (sql.includes('information_schema.tables'))
        return [
          values.includes('sql_migration_history')
            ? [{ table_name: 'sql_migration_history' }, { table_name: 'sql_migration_attempts' }]
            : tables.slice(0, settings.physicalCount).map(table_name => ({ table_name })),
        ];
      if (sql.includes('sql_migration_history'))
        return [
          loadAndValidateMigrationManifest()
            .orderedMigrations.slice(0, settings.headCount)
            .map(m => ({ filename: m.filename, checksum: m.checksum })),
        ];
      if (sql.includes('sql_migration_attempts')) return [[]];
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1, owner: 77 }]];
      if (sql.includes('IS_USED_LOCK'))
        return [[{ owner: settings.wrongOwner ? 78 : 77, current_id: 77 }]];
      const read = /FROM `(place(?:_name|_relationship|_evidence|_external_mapping)?)`$/.exec(sql);
      if (read) return [structuredClone(snapshot[read[1] as keyof PlaceReleaseRows])];
      const insert = /^INSERT INTO `(.*?)` \((.*?)\) VALUES/.exec(sql);
      if (insert) {
        if (settings.failInsert) throw new Error('injected insert failure');
        const table = insert[1] as keyof PlaceReleaseRows;
        const columns = insert[2].replace(/`/g, '').split(', ');
        const row = Object.fromEntries(columns.map((c, i) => [c, values[i]]));
        if (settings.driftAfterInsert && table === 'place') row.search_eligible = 0;
        snapshot[table].push(row);
        return [{ insertId: snapshot[table].length }];
      }
      throw new Error(`Unexpected SQL ${sql}`);
    },
    async query(sql) {
      statements.push(sql);
      if (sql === 'START TRANSACTION') before = structuredClone(snapshot);
      else if (sql === 'ROLLBACK') snapshot = before;
      else if (sql !== 'COMMIT' && !sql.includes('RELEASE_LOCK'))
        throw new Error('Unexpected control SQL');
      return [[]];
    },
    async end() {},
  };
  return {
    connection,
    statements,
    settings,
    get snapshot() {
      return snapshot;
    },
  };
}
beforeEach(() => {
  controls.sourceVersion = 'source-1';
  controls.physicalDrift = false;
  controls.heldParent = false;
});
describe('governed national production Place reference release', () => {
  it('refuses an admitted package with unregistered licensing before target data reads or writes', async () => {
    const f = fixture();
    controls.sourceVersion = 'unlicensed';
    await expect(
      releaseCanonicalPlaces({ ...authority('release-reference-plan'), connection: f.connection }),
    ).rejects.toThrow(/unregistered licensing/);
    expect(f.statements).toEqual([]);
  });
  it('pins all provinces, holds OSM-only authority and dependent rows without altering admitted fields', () => {
    const p = loadPlaceReleaseCandidate();
    expect(p.pins.map(p => p.territoryId)).toEqual(
      loadPlaceAdmissionTerritoryRegistry(process.cwd()).registry.territories.map(
        t => t.territoryId,
      ),
    );
    expect(p.provinceIds).toHaveLength(9);
    expect(p.heldPlaceIds).toHaveLength(1);
    expect(p.heldRows).toEqual({
      place: 1,
      place_name: 1,
      place_relationship: 1,
      place_evidence: 1,
      place_external_mapping: 1,
    });
    expect(p.desired.place.every(p => p.publication_eligible === 0)).toBe(true);
    expect(p.desired.place_relationship.every(p => p.search_scope_authorized === 0)).toBe(true);
    controls.heldParent = true;
    expect(() => loadPlaceReleaseCandidate()).toThrow(/province roots|parent after licensing hold/);
  });
  it('plans only reads, atomically applies and verifies, then repeats with zero inserts', async () => {
    const f = fixture();
    const p = await releaseCanonicalPlaces({
      ...authority('release-reference-plan'),
      connection: f.connection,
    });
    expect(p.readyForDataRelease).toBe(true);
    expect(f.statements.every(s => s.startsWith('SELECT'))).toBe(true);
    const a = await releaseCanonicalPlaces({
      ...authority('release-reference-apply'),
      connection: f.connection,
      expectedPlanDigest: p.planDigest!,
    });
    expect(a.pendingRows).toBe(0);
    expect(f.snapshot.place).toHaveLength(18);
    const inserts = f.statements.filter(s => s.startsWith('INSERT')).length;
    const next = await releaseCanonicalPlaces({
      ...authority('release-reference-plan'),
      connection: f.connection,
    });
    await releaseCanonicalPlaces({
      ...authority('release-reference-apply'),
      connection: f.connection,
      expectedPlanDigest: next.planDigest!,
    });
    expect(f.statements.filter(s => s.startsWith('INSERT'))).toHaveLength(inserts);
    await expect(
      releaseCanonicalPlaces({
        ...authority('release-reference-verify'),
        connection: f.connection,
      }),
    ).resolves.toMatchObject({ pendingRows: 0 });
    expect(f.statements.some(s => /UPDATE|DELETE|ON DUPLICATE/.test(s))).toBe(false);
  });
  it('returns a prerequisite plan without an applicable digest when production lacks Place schema', async () => {
    const f = fixture();
    f.settings.headCount = 97;
    f.settings.physicalCount = 0;
    await expect(
      releaseCanonicalPlaces({ ...authority('release-reference-plan'), connection: f.connection }),
    ).resolves.toMatchObject({
      readyForDataRelease: false,
      head: '0096_user_founder_authority_unique.sql',
      planDigest: null,
    });
    expect(f.statements.every(s => s.startsWith('SELECT'))).toBe(true);
    await expect(
      releaseCanonicalPlaces({
        ...authority('release-reference-apply'),
        connection: f.connection,
        expectedPlanDigest: 'a'.repeat(64),
      }),
    ).rejects.toThrow(/migrations pending/);
    f.settings.physicalCount = 1;
    await expect(
      releaseCanonicalPlaces({ ...authority('release-reference-plan'), connection: f.connection }),
    ).rejects.toThrow(/partially materialised/);
  });
  it('refuses forged authority, other protected targets and physical constraint drift before writing', async () => {
    const f = fixture(),
      real = authority('release-reference-plan');
    await expect(
      releaseCanonicalPlaces({ ...real, decision: { ...real.decision }, connection: f.connection }),
    ).rejects.toThrow();
    await expect(
      previewCanonicalPlaceRelease({ ...real, connection: f.connection }),
    ).rejects.toThrow();
    expect(() => authority('release-reference-plan', 'other.example')).toThrow(/shared-remote/);
    controls.physicalDrift = true;
    await expect(releaseCanonicalPlaces({ ...real, connection: f.connection })).rejects.toThrow(
      /physical schema/,
    );
    expect(f.statements.some(s => s.startsWith('INSERT'))).toBe(false);
  });
  it('binds source pins and observed state; changed plans and lost lock ownership refuse before insertion', async () => {
    const f = fixture(),
      p = await releaseCanonicalPlaces({
        ...authority('release-reference-plan'),
        connection: f.connection,
      });
    controls.sourceVersion = 'source-2';
    await expect(
      releaseCanonicalPlaces({
        ...authority('release-reference-apply'),
        connection: f.connection,
        expectedPlanDigest: p.planDigest!,
      }),
    ).rejects.toThrow(/plan changed/);
    controls.sourceVersion = 'source-1';
    f.settings.wrongOwner = true;
    await expect(
      releaseCanonicalPlaces({
        ...authority('release-reference-apply'),
        connection: f.connection,
        expectedPlanDigest: p.planDigest!,
      }),
    ).rejects.toThrow(/lock\/session/);
    expect(f.snapshot).toEqual(empty());
  });
  it.each(['insert', 'post-write'])('rolls back %s failure before commit', async failure => {
    const f = fixture(),
      p = await releaseCanonicalPlaces({
        ...authority('release-reference-plan'),
        connection: f.connection,
      });
    if (failure === 'insert') f.settings.failInsert = true;
    else f.settings.driftAfterInsert = true;
    await expect(
      releaseCanonicalPlaces({
        ...authority('release-reference-apply'),
        connection: f.connection,
        expectedPlanDigest: p.planDigest!,
      }),
    ).rejects.toThrow();
    expect(f.snapshot).toEqual(empty());
    expect(f.statements).toContain('ROLLBACK');
    expect(f.statements).not.toContain('COMMIT');
  });
  it('refuses same-count identity/value drift and foreign evidence; verify refuses partial data', async () => {
    const p = loadPlaceReleaseCandidate(),
      stored = structuredClone(p.desired);
    stored.place[0].search_eligible = 0;
    expect(() => reconcilePlaceRelease(p.desired, stored)).toThrow(/values drift/);
    const foreign = structuredClone(p.desired);
    foreign.place[0].place_id = 'pl-place-01-ffffffffffffffffffffffff';
    expect(() => reconcilePlaceRelease(p.desired, foreign)).toThrow(/foreign/);
    const evidence = structuredClone(p.desired);
    evidence.place_evidence[0].provider_record_id = 'unreviewed-provider-record';
    expect(() => reconcilePlaceRelease(p.desired, evidence)).toThrow(/foreign/);
    await expect(
      releaseCanonicalPlaces({
        ...authority('release-reference-verify'),
        connection: fixture().connection,
      }),
    ).rejects.toThrow(/incomplete/);
  });
});
