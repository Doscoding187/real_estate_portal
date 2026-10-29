/** Exact pre-OSM production reference snapshot for the disposable 0111 rehearsal. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AuthorizedDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  assertOperation,
  queryRows,
  requireExactAdapterTarget,
  rowValue,
  stableDigest,
  withTransaction,
  type AdapterEvidence,
} from './common';
import {
  buildPlaceReleaseBatches,
  PLACE_RELEASE_TABLES,
  type PlaceReleaseRows,
} from './placeRelease';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';
import {
  buildMigrationPlan,
  type AppliedMigration,
  type MigrationAttempt,
} from '../../../migrations/runSqlMigrations';

export const MIGRATION_PREFIX_0111_VERSION = 'migration-prefix-0111-fordsburg-v1' as const;
export const MIGRATION_PREFIX_0111_HEAD = '0111_properties_canonical_place_reference_fk.sql' as const;
export const MIGRATION_PREFIX_0111_FINAL_HEAD = '0197_drop_seller_prospects_province.sql' as const;
export const MIGRATION_PREFIX_0111_SOURCE_DIGEST =
  '4235e111dd8db8b803cb8d35e06975f1f183bfea6ece7ee0e5d260ab397a7bcc' as const;
const RETIRED_PLACE_ID = 'pl-place-01-99dcb8ba9d808741e35b258e';
const LISTING_ID = 19960962;
const BASE_USER_ID = 19960961;
const ADDITIONAL_USER_IDS = [19961121, 19961122, 19961123, 19961124, 19961125] as const;

const HISTORICAL_PACKAGES = [
  { directory: 'data/gauteng-place-admission-v0.1', prefix: 'gauteng', manifest: 'gauteng_place_admission_manifest.v0.1.json' },
  { directory: 'data/za-ec-place-admission-v0.1', prefix: 'za_ec', manifest: 'za_ec_place_admission_manifest_v0.1.json' },
  { directory: 'data/za-fs-place-admission-v0.1', prefix: 'za_fs', manifest: 'za_fs_place_admission_manifest_v0.1.json' },
  { directory: 'data/za-kzn-place-admission-v0.1', prefix: 'za_kzn', manifest: 'za_kzn_place_admission_manifest_v0.1.json' },
  { directory: 'data/za-li-place-admission-v0.1', prefix: 'za_li', manifest: 'za_li_place_admission_manifest_v0.1.json' },
  { directory: 'data/za-mp-place-admission-v0.1', prefix: 'za_mp', manifest: 'za_mp_place_admission_manifest_v0.1.json' },
  { directory: 'data/za-nc-place-admission-v0.1', prefix: 'za_nc', manifest: 'za_nc_place_admission_manifest_v0.1.json' },
  { directory: 'data/za-nw-place-admission-v0.1', prefix: 'za_nw', manifest: 'za_nw_place_admission_manifest_v0.1.json' },
  { directory: 'data/za-wc-place-admission-v0.1', prefix: 'za_wc', manifest: 'za_wc_place_admission_manifest_v0.1.json' },
] as const;
const ARTIFACT_KEYS = ['places', 'names', 'relationships', 'evidence', 'external_mappings'] as const;
export const MIGRATION_PREFIX_0111_DIGEST = stableDigest({
  version: MIGRATION_PREFIX_0111_VERSION,
  seedHead: MIGRATION_PREFIX_0111_HEAD,
  finalHead: MIGRATION_PREFIX_0111_FINAL_HEAD,
  sourceDigest: MIGRATION_PREFIX_0111_SOURCE_DIGEST,
  retiredPlaceId: RETIRED_PLACE_ID,
  users: [BASE_USER_ID, ...ADDITIONAL_USER_IDS],
  listingId: LISTING_ID,
});

type Input = {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
};

export type MigrationPrefix0111Evidence = AdapterEvidence & {
  fixture: typeof MIGRATION_PREFIX_0111_VERSION;
  migrationHead: string;
  historicalPackageDigest: string;
  counts: { users: number; listings: number; developments: number; leads: number; places: number; nonOsmPlaces: number; osmOnlyPlaces: number; unclassifiedPlaces: number };
  listingPlaceId: string;
};

function requireFixtureTarget(input: Input, operation: string): AdapterEvidence {
  assertOperation(input.decision, [operation]);
  const evidence = requireExactAdapterTarget(input.authority);
  if (
    input.authority.context.targetClass !== 'disposable-worktree' ||
    !input.authority.context.local ||
    input.authority.context.provider !== 'mysql' ||
    input.authority.context.dialect !== 'mysql' ||
    !input.authority.context.worktree.registered ||
    !input.authority.context.worktree.ownershipMatches
  ) {
    throw new Error('Migration prefix fixture refused: target is not the exact owned local MySQL worktree.');
  }
  return {
    ...evidence,
    adapter: 'migration-prefix-0111-fordsburg',
    version: MIGRATION_PREFIX_0111_VERSION,
    digest: MIGRATION_PREFIX_0111_DIGEST,
  };
}

async function requireMigrationHead(input: Input, expectedHead: string, ancestor: boolean) {
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: resolve(input.authority.context.repository.root, 'server/migrations'),
  });
  const applied: AppliedMigration[] = (await queryRows(
    input.connection,
    `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
  )).map(row => ({ fileName: String(rowValue(row, 'filename') ?? ''), checksum: String(rowValue(row, 'checksum') ?? '') }));
  const incompleteAttempts: MigrationAttempt[] = (await queryRows(
    input.connection,
    `SELECT attempt_id, migration_filename, state FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
  )).map(row => ({
    attemptId: String(rowValue(row, 'attempt_id') ?? ''),
    fileName: String(rowValue(row, 'migration_filename') ?? ''),
    state: String(rowValue(row, 'state') ?? 'blocked') as MigrationAttempt['state'],
  }));
  const plan = buildMigrationPlan({
    manifest,
    targetFingerprintHash: input.authority.context.targetFingerprintHash,
    applied,
    incompleteAttempts,
    applicationTableCount: 1,
    ...(ancestor ? { ancestorHead: expectedHead } : { expectedNewHead: expectedHead }),
  });
  if (plan.pending.length || plan.acceptedOldHead !== expectedHead || plan.expectedNewHead !== expectedHead)
    throw new Error(`Migration prefix fixture refused: target is not at exact required head ${expectedHead}.`);
}

function readRows(root: string, path: string): Record<string, unknown>[] {
  return readFileSync(resolve(root, path), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line) as Record<string, unknown>);
}

function loadHistoricalPlaceRows(root: string): PlaceReleaseRows {
  const all: PlaceReleaseRows = { place: [], place_name: [], place_relationship: [], place_evidence: [], place_external_mapping: [] };
  const packageRows: Record<(typeof ARTIFACT_KEYS)[number], Record<string, unknown>[]> = {
    places: [], names: [], relationships: [], evidence: [], external_mappings: [],
  };
  for (const pkg of HISTORICAL_PACKAGES) {
    const manifestPath = `${pkg.directory}/${pkg.manifest}`;
    const manifest = JSON.parse(readFileSync(resolve(root, manifestPath), 'utf8')) as {
      admission_version: string;
      outputs: Record<string, string>;
    };
    if (manifest.admission_version !== (pkg.prefix === 'gauteng' ? 'gauteng-place-admission-v0.1' : `${pkg.prefix.replace('_', '-')}-place-admission-v0.1`))
      throw new Error('Migration prefix fixture refused: historical package version drift.');
    const fileSuffix: Record<(typeof ARTIFACT_KEYS)[number], string> = {
      places: 'place_admission_v0.1.jsonl',
      names: 'place_names_v0.1.jsonl',
      relationships: 'place_relationships_v0.1.jsonl',
      evidence: 'place_evidence_v0.1.jsonl',
      external_mappings: 'place_external_mappings_v0.1.jsonl',
    };
    for (const key of ARTIFACT_KEYS) {
      const expectedPath = `${pkg.directory}/${pkg.prefix}_${fileSuffix[key]}`;
      if (manifest.outputs[key] !== expectedPath)
        throw new Error('Migration prefix fixture refused: historical package artifact path drift.');
      packageRows[key].push(...readRows(root, expectedPath));
    }
  }
  if (stableDigest(packageRows) !== MIGRATION_PREFIX_0111_SOURCE_DIGEST)
    throw new Error('Migration prefix fixture refused: historical 0108 reference package digest drift.');
  const nonOsmIds = new Set(
    packageRows.places
      .filter(row => row.licensing_classification !== 'osm_only_odbl_provisional')
      .map(row => String(row.place_id)),
  );
  for (const row of packageRows.places)
    if (nonOsmIds.has(String(row.place_id))) all.place.push(row);
  for (const row of packageRows.names)
    if (nonOsmIds.has(String(row.place_id))) all.place_name.push(row);
  for (const row of packageRows.relationships)
    if (nonOsmIds.has(String(row.from_place_id)) && nonOsmIds.has(String(row.to_place_id)))
      all.place_relationship.push(row);
  for (const row of packageRows.evidence)
    if (row.place_id == null || nonOsmIds.has(String(row.place_id))) all.place_evidence.push(row);
  for (const row of packageRows.external_mappings)
    if (nonOsmIds.has(String(row.place_id))) all.place_external_mapping.push(row);
  if (all.place.length !== 16944 || all.place.some(row => row.place_id === ''))
    throw new Error('Migration prefix fixture refused: historical package does not contain 16,944 loaded Places.');
  return all;
}

type PrefixCounts = {
  users: number;
  listings: number;
  developments: number;
  leads: number;
  places: number;
  nonOsmPlaces: number;
  osmOnlyPlaces: number;
  unclassifiedPlaces: number;
};

async function readCounts(connection: AuthoritySqlConnection): Promise<PrefixCounts> {
  const tables = ['users', 'listings', 'developments', 'leads', 'place'] as const;
  const result: Record<string, number> = {};
  for (const table of tables) {
    const rows = await queryRows(connection, `SELECT COUNT(*) AS row_count FROM \`${table}\``);
    result[table] = Number(rows[0]?.row_count ?? 0);
  }
  const classification = await queryRows(
    connection,
    `SELECT SUM(CASE WHEN licensing_classification = 'osm_only_odbl_provisional' THEN 1 ELSE 0 END) AS osm_only, SUM(CASE WHEN licensing_classification IS NULL THEN 1 ELSE 0 END) AS unclassified FROM \`place\``,
  );
  return {
    users: result.users,
    listings: result.listings,
    developments: result.developments,
    leads: result.leads,
    places: result.place,
    nonOsmPlaces: result.place - Number(classification[0]?.osm_only ?? 0),
    osmOnlyPlaces: Number(classification[0]?.osm_only ?? 0),
    unclassifiedPlaces: Number(classification[0]?.unclassified ?? 0),
  };
}

export async function prepareMigrationPrefix0111(input: Input): Promise<MigrationPrefix0111Evidence> {
  const evidence = requireFixtureTarget(input, 'test-fixture');
  await requireMigrationHead(input, MIGRATION_PREFIX_0111_HEAD, true);
  const root = input.authority.context.repository.root;
  const referenceRows = loadHistoricalPlaceRows(root);
  const before = await readCounts(input.connection);
  if (before.users !== 0 || before.listings !== 0 || before.developments !== 0 || before.leads !== 0 || before.places !== 0)
    throw new Error('Migration prefix fixture refused: exact 0111 disposable target must have empty application and Place tables.');
  const reservedUsers = await queryRows(
    input.connection,
    `SELECT id FROM users WHERE id IN (${[BASE_USER_ID, ...ADDITIONAL_USER_IDS].map(() => '?').join(',')})`,
    [BASE_USER_ID, ...ADDITIONAL_USER_IDS],
  );
  const reservedListing = await queryRows(input.connection, 'SELECT id FROM listings WHERE id = ? OR slug = ?', [LISTING_ID, 'migration-rehearsal-listing-0111']);
  if (reservedUsers.length || reservedListing.length)
    throw new Error('Migration prefix fixture refused: reserved synthetic identities already exist.');
  await withTransaction(input.connection, async () => {
    for (const id of [BASE_USER_ID, ...ADDITIONAL_USER_IDS]) {
      await input.connection.execute(
        'INSERT INTO users (id, openId, email, name, role, loginMethod, emailVerified) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [id, `migration-rehearsal-0111-user-${id}`, `migration-rehearsal-0111-${id}@example.invalid`, `Migration Rehearsal User ${id}`, 'visitor', 'migration-rehearsal'],
      );
    }
    for (const table of Object.keys(PLACE_RELEASE_TABLES) as (keyof PlaceReleaseRows)[]) {
      for (const batch of buildPlaceReleaseBatches(table, referenceRows[table]))
        await input.connection.execute(batch.sql, batch.values);
    }
    await input.connection.execute(
      'INSERT INTO listings (id, ownerId, action, propertyType, title, description, address, latitude, longitude, city, suburb, province, slug, canonical_place_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [LISTING_ID, BASE_USER_ID, 'sell', 'house', 'Migration Rehearsal Listing 0111', 'Synthetic disposable migration rehearsal row for canonical Place retirement.', '1 Rehearsal Road', -26.2041, 28.0473, 'Johannesburg', 'Fordsburg', 'Gauteng', 'migration-rehearsal-listing-0111', RETIRED_PLACE_ID],
    );
  });
  const after = await readCounts(input.connection);
  const listing = await queryRows(
    input.connection,
    'SELECT id, canonical_place_id FROM listings WHERE id = ?',
    [LISTING_ID],
  );
  if (after.users !== 6 || after.listings !== 1 || after.developments !== 0 || after.leads !== 0 || after.places !== 16944 || after.nonOsmPlaces !== 16944 || after.osmOnlyPlaces !== 0 || after.unclassifiedPlaces !== 0 || listing.length !== 1 || String(listing[0]?.canonical_place_id) !== RETIRED_PLACE_ID)
    throw new Error('Migration prefix fixture refused: post-seed production-shape verification failed.');
  return {
    ...evidence,
    fixture: MIGRATION_PREFIX_0111_VERSION,
    migrationHead: MIGRATION_PREFIX_0111_HEAD,
    historicalPackageDigest: MIGRATION_PREFIX_0111_SOURCE_DIGEST,
    counts: after,
    listingPlaceId: String(listing[0].canonical_place_id),
  };
}

export async function verifyMigrationPrefix0111(input: Input): Promise<MigrationPrefix0111Evidence> {
  const evidence = requireFixtureTarget(input, 'verification');
  await requireMigrationHead(input, MIGRATION_PREFIX_0111_FINAL_HEAD, false);
  const counts = await readCounts(input.connection);
  const listing = await queryRows(
    input.connection,
    'SELECT id, canonical_place_id FROM listings WHERE id = ?',
    [LISTING_ID],
  );
  const userIds = await queryRows(
    input.connection,
    `SELECT id FROM users WHERE id IN (${[BASE_USER_ID, ...ADDITIONAL_USER_IDS].map(() => '?').join(',')}) ORDER BY id`,
    [BASE_USER_ID, ...ADDITIONAL_USER_IDS],
  );
  if (counts.users !== 6 || counts.listings !== 1 || counts.developments !== 0 || counts.leads !== 0 || counts.places !== 16944 || counts.nonOsmPlaces !== 16944 || counts.osmOnlyPlaces !== 0 || counts.unclassifiedPlaces !== 0 || listing.length !== 1 || String(listing[0]?.canonical_place_id) !== RETIRED_PLACE_ID || userIds.length !== 6)
    throw new Error('Migration prefix fixture verification refused: seeded production shape changed before Place retirement.');
  return {
    ...evidence,
    fixture: MIGRATION_PREFIX_0111_VERSION,
    migrationHead: MIGRATION_PREFIX_0111_FINAL_HEAD,
    historicalPackageDigest: MIGRATION_PREFIX_0111_SOURCE_DIGEST,
    counts,
    listingPlaceId: String(listing[0].canonical_place_id),
  };
}
