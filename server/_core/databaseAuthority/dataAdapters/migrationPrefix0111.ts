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
  loadPlaceReleaseCandidate,
  PLACE_RELEASE_TABLES,
  type PlaceReleaseRows,
} from './placeRelease';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';
import {
  buildMigrationPlan,
  type AppliedMigration,
  type MigrationAttempt,
} from '../../../migrations/runSqlMigrations';

export const MIGRATION_PREFIX_0111_VERSION = 'migration-prefix-0111-oct10-source-v2' as const;
export const MIGRATION_PREFIX_0111_HEAD = '0111_properties_canonical_place_reference_fk.sql' as const;
export const MIGRATION_PREFIX_0111_FINAL_HEAD = '0197_drop_seller_prospects_province.sql' as const;
export const MIGRATION_PREFIX_0111_SOURCE_COMMIT =
  '49a48572c24d1b122fcf17b025a76e5ab77f03a8' as const;
export const MIGRATION_PREFIX_0111_SOURCE_DIGEST =
  '166de67c63d6db86acdd5c7c9dbe2fe50b4e16a7e2a070a31c51a2c6b29636d9' as const;
const OCT10_PLACE_ROWS_PATH =
  'data/migration-prefix-0111-oct10-place-rows-v1.jsonl' as const;
const OCT10_PLACE_ROWS_SHA256 =
  '0e538c03f1923120680dd9d3456fe2185d19998408986566b98261e99ef9df9a' as const;
const OCT10_PLACE_ROWS_COUNT = 2556;
const PLACE_ELIGIBILITY_MIGRATION_PATH =
  'server/migrations/0115_non_geographic_place_search_eligibility.sql' as const;
const PLACE_ELIGIBILITY_MIGRATION_SHA256 =
  '53c65883b900d639d1ea989041386a4d4fea28e7a9a7b35579a52c449e9d649c' as const;
export const GAUTENG_EVIDENCE_NOTE_MISMATCH_VERSION =
  'gauteng-evidence-note-mismatch-rehearsal-v1' as const;
export const GAUTENG_EVIDENCE_NOTE_MISMATCH_PLACE_ID =
  'pl-place-01-00dbe14e9aefa6f6a0425875' as const;
export const GAUTENG_EVIDENCE_NOTE_MISMATCH_DIGEST = stableDigest({
  version: GAUTENG_EVIDENCE_NOTE_MISMATCH_VERSION,
  sourceDigest: MIGRATION_PREFIX_0111_SOURCE_DIGEST,
  placeId: GAUTENG_EVIDENCE_NOTE_MISMATCH_PLACE_ID,
  mutation: 'append-rehearsal-only-evidence-note-mismatch-sentinel-v1',
});
const RETIRED_PLACE_ID = 'pl-place-01-99dcb8ba9d808741e35b258e';
const PRODUCTION_LISTING_PLACE_ID = 'pl-place-01-6a145c6d642ba208a2c12de7';
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
  sourceCommit: MIGRATION_PREFIX_0111_SOURCE_COMMIT,
  retiredPlaceId: RETIRED_PLACE_ID,
  users: [BASE_USER_ID, ...ADDITIONAL_USER_IDS],
  listingId: LISTING_ID,
  listingPlaceId: PRODUCTION_LISTING_PLACE_ID,
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

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
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
  // The v0.1 filenames were revised in place after the 2026-10-10 production load.
  // Restore the exact 0115 target rows from the pinned Oct 10 source commit, then
  // require the reconstructed package to match its full digest.
  const placeRowsPath = resolve(root, OCT10_PLACE_ROWS_PATH);
  const placeRowsBytes = readFileSync(placeRowsPath);
  if (sha256(placeRowsBytes) !== OCT10_PLACE_ROWS_SHA256)
    throw new Error('Migration prefix fixture refused: Oct 10 Place row fixture digest drift.');
  const oldPlaceRows = placeRowsBytes
    .toString('utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line) as Record<string, unknown>);
  const oldPlaceById = new Map<string, Record<string, unknown>>();
  for (const row of oldPlaceRows) {
    const placeId = String(row.place_id ?? '');
    if (
      !/^pl-place-01-[a-f0-9]{24}$/.test(placeId) ||
      oldPlaceById.has(placeId) ||
      ![0, 1].includes(Number(row.publication_eligible)) ||
      ![0, 1].includes(Number(row.search_eligible)) ||
      !['locality', 'metro_city'].includes(String(row.search_scope))
    ) {
      throw new Error('Migration prefix fixture refused: invalid Oct 10 Place source row.');
    }
    oldPlaceById.set(placeId, row);
  }
  const migrationPath = resolve(root, PLACE_ELIGIBILITY_MIGRATION_PATH);
  const migrationBytes = readFileSync(migrationPath);
  if (sha256(migrationBytes) !== PLACE_ELIGIBILITY_MIGRATION_SHA256)
    throw new Error('Migration prefix fixture refused: migration 0115 source drift.');
  const migrationIds = new Set(
    [...migrationBytes.toString('utf8').matchAll(/'(pl-place-01-[a-f0-9]{24})'/g)].map(match => match[1]),
  );
  if (
    oldPlaceById.size !== OCT10_PLACE_ROWS_COUNT ||
    migrationIds.size !== OCT10_PLACE_ROWS_COUNT ||
    [...migrationIds].some(placeId => !oldPlaceById.has(placeId))
  ) {
    throw new Error('Migration prefix fixture refused: Oct 10 Place set differs from migration 0115.');
  }
  const placeIndexById = new Map(packageRows.places.map((row, index) => [String(row.place_id), index]));
  for (const [placeId, old] of oldPlaceById) {
    const index = placeIndexById.get(placeId);
    const current = index === undefined ? undefined : packageRows.places[index];
    if (
      index === undefined ||
      !current ||
      current.publication_eligible !== 0 ||
      current.search_eligible !== 0 ||
      current.search_scope !== null
    ) {
      throw new Error(`Migration prefix fixture refused: current eligibility package state drift at ${placeId}.`);
    }
    packageRows.places[index] = old;
  }
  if (stableDigest(packageRows) !== MIGRATION_PREFIX_0111_SOURCE_DIGEST)
    throw new Error(`Migration prefix fixture refused: reconstructed Oct 10 source at ${MIGRATION_PREFIX_0111_SOURCE_COMMIT} digest drift.`);
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
      [LISTING_ID, BASE_USER_ID, 'sell', 'house', 'Migration Rehearsal Listing 0111', 'Synthetic disposable migration rehearsal row for canonical Place retirement.', '1 Rehearsal Road', -26.2041, 28.0473, 'Johannesburg', 'Sandton', 'Gauteng', 'migration-rehearsal-listing-0111', PRODUCTION_LISTING_PLACE_ID],
    );
  });
  const after = await readCounts(input.connection);
  const listing = await queryRows(
    input.connection,
    'SELECT id, canonical_place_id FROM listings WHERE id = ?',
    [LISTING_ID],
  );
  if (after.users !== 6 || after.listings !== 1 || after.developments !== 0 || after.leads !== 0 || after.places !== 16944 || after.nonOsmPlaces !== 16944 || after.osmOnlyPlaces !== 0 || after.unclassifiedPlaces !== 0 || listing.length !== 1 || String(listing[0]?.canonical_place_id) !== PRODUCTION_LISTING_PLACE_ID)
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
  if (counts.users !== 6 || counts.listings !== 1 || counts.developments !== 0 || counts.leads !== 0 || counts.places !== 16944 || counts.nonOsmPlaces !== 16944 || counts.osmOnlyPlaces !== 0 || counts.unclassifiedPlaces !== 0 || listing.length !== 1 || String(listing[0]?.canonical_place_id) !== PRODUCTION_LISTING_PLACE_ID || userIds.length !== 6)
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

type EvidenceNoteMismatchInput = {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
};

type GautengEvidenceNoteMismatchEvidence = AdapterEvidence & {
  placeId: typeof GAUTENG_EVIDENCE_NOTE_MISMATCH_PLACE_ID;
  evidenceRowCount: number;
  expectedOldNoteSha256: string;
  storedNoteSha256: string;
  placeType: 'town';
  searchScope: 'metro_city';
  seeded?: boolean;
  placeRowsUnchanged?: number;
  evidenceRowsUnchanged?: number;
  mismatchStillPresent?: boolean;
};

function noteSha256(note: string): string {
  return createHash('sha256').update(note, 'utf8').digest('hex');
}

async function inspectGautengEvidenceNoteMismatch(input: EvidenceNoteMismatchInput) {
  const root = input.authority.context.repository.root;
  const expectedRows = loadHistoricalPlaceRows(root).place_evidence.filter(
    row => row.place_id === GAUTENG_EVIDENCE_NOTE_MISMATCH_PLACE_ID,
  );
  if (expectedRows.length !== 1)
    throw new Error('Gauteng note-mismatch fixture refused: pinned historical note is not unique.');
  const expectedNote = String(expectedRows[0].note ?? '');
  const injectedNote = `${expectedNote};rehearsal_mismatch=seeded`;
  const [placeRows, evidenceRows] = await Promise.all([
    queryRows(
      input.connection,
      'SELECT place_type, search_scope FROM `place` WHERE place_id = ?',
      [GAUTENG_EVIDENCE_NOTE_MISMATCH_PLACE_ID],
    ),
    queryRows(
      input.connection,
      'SELECT place_id, note FROM `place_evidence` WHERE place_id = ?',
      [GAUTENG_EVIDENCE_NOTE_MISMATCH_PLACE_ID],
    ),
  ]);
  if (
    placeRows.length !== 1 ||
    placeRows[0].place_type !== 'town' ||
    placeRows[0].search_scope !== 'metro_city' ||
    evidenceRows.length !== 1
  ) {
    throw new Error('Gauteng note-mismatch fixture refused: target row shape is not the expected 0111 source state.');
  }
  const storedNote = String(evidenceRows[0].note ?? '');
  const storedHash = noteSha256(storedNote);
  const expectedHash = noteSha256(expectedNote);
  const injectedHash = noteSha256(injectedNote);
  return {
    expectedNote,
    expectedHash,
    injectedNote,
    injectedHash,
    storedNote,
    storedHash,
    evidenceRowCount: evidenceRows.length,
  };
}

async function verifyGautengMismatchReconciliationMadeNoWrites(
  input: EvidenceNoteMismatchInput,
  injectedNote: string,
) {
  const root = input.authority.context.repository.root;
  const historicalPlaces = readRows(
    root,
    'data/gauteng-place-admission-v0.1/gauteng_place_admission_v0.1.jsonl',
  );
  const historicalEvidence = readRows(
    root,
    'data/gauteng-place-admission-v0.1/gauteng_place_evidence_v0.1.jsonl',
  );
  const candidate = loadPlaceReleaseCandidate(root);
  const candidatePlaces = new Map(candidate.desired.place.map(row => [String(row.place_id), row]));
  const corrections = historicalPlaces.filter(old => {
    const current = candidatePlaces.get(String(old.place_id));
    return current && (
      old.place_type !== current.place_type ||
      old.search_scope !== current.search_scope
    );
  });
  if (corrections.length !== 48)
    throw new Error('Gauteng note-mismatch fixture refused: reviewed Place set is not exactly 48 IDs.');
  const ids = corrections.map(row => String(row.place_id));
  const placeholders = ids.map(() => '?').join(', ');
  const [actualPlaces, actualEvidence] = await Promise.all([
    queryRows(
      input.connection,
      `SELECT place_id, place_type, search_scope FROM place WHERE place_id IN (${placeholders})`,
      ids,
    ),
    queryRows(
      input.connection,
      `SELECT place_id, note FROM place_evidence WHERE place_id IN (${placeholders})`,
      ids,
    ),
  ]);
  const oldPlaces = new Map(corrections.map(row => [String(row.place_id), row]));
  const oldNotes = new Map<string, string[]>();
  for (const row of historicalEvidence) {
    const placeId = String(row.place_id);
    if (!oldPlaces.has(placeId)) continue;
    oldNotes.set(placeId, [...(oldNotes.get(placeId) ?? []), String(row.note ?? '')]);
  }
  const actualNotes = new Map<string, string[]>();
  for (const row of actualEvidence) {
    const placeId = String(row.place_id);
    actualNotes.set(placeId, [...(actualNotes.get(placeId) ?? []), String(row.note ?? '')]);
  }
  const placeRowsUnchanged = actualPlaces.length === 48 && actualPlaces.every(row => {
    const old = oldPlaces.get(String(row.place_id));
    return old && row.place_type === old.place_type && row.search_scope === old.search_scope;
  });
  const evidenceRowsUnchanged = historicalEvidence
    .filter(row => oldPlaces.has(String(row.place_id)))
    .every(row => {
      const placeId = String(row.place_id);
      const expected = placeId === GAUTENG_EVIDENCE_NOTE_MISMATCH_PLACE_ID
        ? [injectedNote]
        : oldNotes.get(placeId) ?? [];
      return JSON.stringify(actualNotes.get(placeId) ?? []) === JSON.stringify(expected);
    });
  const expectedEvidenceRows = historicalEvidence.filter(row => oldPlaces.has(String(row.place_id))).length;
  if (
    actualEvidence.length !== expectedEvidenceRows ||
    !placeRowsUnchanged ||
    !evidenceRowsUnchanged
  ) {
    throw new Error('Gauteng note-mismatch fixture verification refused: reconciliation changed a reviewed row.');
  }
  return { placeRowsUnchanged: 48, evidenceRowsUnchanged: expectedEvidenceRows };
}

export async function seedGautengEvidenceNoteMismatch(
  input: EvidenceNoteMismatchInput,
): Promise<GautengEvidenceNoteMismatchEvidence> {
  const authorityEvidence = requireFixtureTarget(input, 'test-fixture');
  await requireMigrationHead(input, MIGRATION_PREFIX_0111_FINAL_HEAD, false);
  const before = await inspectGautengEvidenceNoteMismatch(input);
  if (before.storedHash !== before.expectedHash)
    throw new Error('Gauteng note-mismatch fixture refused: seed requires the exact historical v0.1 note.');
  await withTransaction(input.connection, async () => {
    await input.connection.execute(
      'UPDATE `place_evidence` SET `note` = ? WHERE `place_id` = ? AND `note` = ?',
      [before.injectedNote, GAUTENG_EVIDENCE_NOTE_MISMATCH_PLACE_ID, before.expectedNote],
    );
    const after = await inspectGautengEvidenceNoteMismatch(input);
    if (after.storedHash !== before.injectedHash)
      throw new Error('Gauteng note-mismatch fixture refused: sentinel did not persist inside transaction.');
  });
  const result = await inspectGautengEvidenceNoteMismatch(input);
  if (result.storedHash !== result.injectedHash)
    throw new Error('Gauteng note-mismatch fixture refused: seeded sentinel did not verify after commit.');
  return {
    ...authorityEvidence,
    adapter: 'gauteng-evidence-note-mismatch-rehearsal',
    version: GAUTENG_EVIDENCE_NOTE_MISMATCH_VERSION,
    digest: GAUTENG_EVIDENCE_NOTE_MISMATCH_DIGEST,
    placeId: GAUTENG_EVIDENCE_NOTE_MISMATCH_PLACE_ID,
    evidenceRowCount: result.evidenceRowCount,
    expectedOldNoteSha256: result.expectedHash,
    storedNoteSha256: result.storedHash,
    placeType: 'town',
    searchScope: 'metro_city',
    seeded: result.storedHash === result.injectedHash,
  };
}

export async function verifyGautengEvidenceNoteMismatch(
  input: EvidenceNoteMismatchInput,
): Promise<GautengEvidenceNoteMismatchEvidence> {
  const authorityEvidence = requireFixtureTarget(input, 'verification');
  await requireMigrationHead(input, MIGRATION_PREFIX_0111_FINAL_HEAD, false);
  const result = await inspectGautengEvidenceNoteMismatch(input);
  if (result.evidenceRowCount !== 1 || result.storedHash !== result.injectedHash)
    throw new Error('Gauteng note-mismatch fixture verification refused: seeded mismatch was changed or disappeared.');
  const noWrites = await verifyGautengMismatchReconciliationMadeNoWrites(input, result.injectedNote);
  return {
    ...authorityEvidence,
    adapter: 'gauteng-evidence-note-mismatch-rehearsal',
    version: GAUTENG_EVIDENCE_NOTE_MISMATCH_VERSION,
    digest: GAUTENG_EVIDENCE_NOTE_MISMATCH_DIGEST,
    placeId: GAUTENG_EVIDENCE_NOTE_MISMATCH_PLACE_ID,
    evidenceRowCount: result.evidenceRowCount,
    expectedOldNoteSha256: result.expectedHash,
    storedNoteSha256: result.storedHash,
    placeType: 'town',
    searchScope: 'metro_city',
    ...noWrites,
    mismatchStillPresent: true,
  };
}
