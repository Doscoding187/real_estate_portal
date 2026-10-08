/** Protected, additive release of admitted Places. No provider or legacy catalog writes. */
import { loadPlaceAdmissionTerritoryRegistry } from '../../../../shared/placeAdmissionTerritories';
import {
  assertAuthorizedDatabaseOperation,
  B08_AZURE_TARGET_FINGERPRINT_HASH,
  type AuthorizedDatabaseOperation,
} from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';
import { buildMigrationPlan, type MigrationAttempt } from '../../../migrations/runSqlMigrations';
import { loadCanonicalPlacePackage } from './canonicalPlaces';
import {
  queryRows,
  requireAcceptedMigrationHead,
  requireReleaseReferenceTarget,
  requireReferenceAdapterTarget,
  stableDigest,
} from './common';
import * as schemaExports from '../../../../drizzle/schema';
import {
  normalizedDesiredSchema,
  normalizedPhysicalSchema,
  compareNormalizedSchemas,
  summarizeCheckConstraintEnforcement,
} from '../schemaCongruency';

import {
  isOperationalPlaceCoverageSignal,
  PLACE_COVERAGE_SIGNAL_VERSION,
} from '../../../../shared/placeCoverageSignal';

export const PLACE_RELEASE_BATCH_LIMITS = {
  rows: 250,
  parameters: 4096,
  payloadBytes: 262144,
} as const;

export const PLACE_RELEASE_POLICY = 'admitted-national-non-osm-only-v1';
const ELIGIBLE_LICENSING = ['permissive_supported', 'mixed_odbl_supported'] as const;
export const PLACE_RELEASE_TABLES = {
  place: [
    'place_id',
    'place_type',
    'place_classification',
    'verification_status',
    'lifecycle_status',
    'publication_eligible',
    'search_eligible',
    'search_scope',
    'licensing_classification',
  ],
  place_name: [
    'place_id',
    'name',
    'normalized_name',
    'name_role',
    'name_state',
    'is_searchable',
    'evidence_source',
    'valid_from',
    'valid_to',
  ],
  place_relationship: [
    'from_place_id',
    'to_place_id',
    'relationship_type',
    'search_scope_authorized',
    'evidence_source',
    'valid_from',
    'valid_to',
  ],
  place_evidence: [
    'place_id',
    'evidence_kind',
    'evidence_state',
    'subject',
    'provider',
    'provider_record_id',
    'research_priority',
    'note',
  ],
  place_external_mapping: [
    'place_id',
    'provider',
    'provider_record_id',
    'provider_label',
    'normalized_alias',
    'observed_at',
  ],
} as const;
export const PLACE_RELEASE_DIGEST = stableDigest({
  policy: PLACE_RELEASE_POLICY,
  eligibleLicensing: ELIGIBLE_LICENSING,
  tables: PLACE_RELEASE_TABLES,
  coverageSignalVersion: PLACE_COVERAGE_SIGNAL_VERSION,
  batchLimits: PLACE_RELEASE_BATCH_LIMITS,
  transactionProtocol: 'explicit-commit-and-lock-outcomes-v2',
});
type Table = keyof typeof PLACE_RELEASE_TABLES;
type Row = Record<string, unknown>;
export type PlaceReleaseRows = Record<Table, Row[]>;
const tables = Object.keys(PLACE_RELEASE_TABLES) as Table[];
const keys: Record<Table, readonly string[]> = {
  place: ['place_id'],
  place_name: ['place_id', 'name_role', 'name'],
  place_relationship: ['from_place_id', 'to_place_id', 'relationship_type'],
  place_evidence: ['place_id', 'evidence_kind', 'subject', 'provider', 'provider_record_id'],
  place_external_mapping: ['provider', 'provider_record_id'],
};
const numeric = new Set([
  'publication_eligible',
  'search_eligible',
  'is_searchable',
  'search_scope_authorized',
  'research_priority',
]);
const emptyRows = (): PlaceReleaseRows => ({
  place: [],
  place_name: [],
  place_relationship: [],
  place_evidence: [],
  place_external_mapping: [],
});
const identity = (table: Table, row: Row) => JSON.stringify(keys[table].map(k => row[k] ?? null));
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
function canonicalRow(table: Table, row: Row): Row {
  return Object.fromEntries(
    PLACE_RELEASE_TABLES[table].map(column => {
      let value = row[column] ?? null;
      if (numeric.has(column) && value !== null) {
        if (typeof value !== 'number' && typeof value !== 'string')
          throw new Error('Place release refused: invalid boolean storage value.');
        if (value !== 0 && value !== 1 && value !== '0' && value !== '1')
          throw new Error('Place release refused: invalid boolean storage value.');
        value = Number(value);
      }
      if (column === 'observed_at' && value !== null) {
        const date = value instanceof Date ? value : new Date(String(value));
        if (!Number.isFinite(date.getTime()))
          throw new Error('Place release refused: invalid observation date.');
        value = date.toISOString();
      }
      return [column, value];
    }),
  );
}

/** D3 is a fixed hold, with no release flag capable of clearing the founder gate. */
export function loadPlaceReleaseCandidate(root = process.cwd()) {
  const { registry, registrySha256 } = loadPlaceAdmissionTerritoryRegistry(root);
  const packages = registry.territories.map(t =>
    loadCanonicalPlacePackage(root, { territoryId: t.territoryId }),
  );
  const admitted = emptyRows();
  const mapping = {
    places: 'place',
    names: 'place_name',
    relationships: 'place_relationship',
    evidence: 'place_evidence',
    external_mappings: 'place_external_mapping',
  } as const;
  const pins = packages.map(p => ({
    territoryId: p.territory.territoryId,
    admissionVersion: p.territory.admissionVersion,
    verifiedDigest: p.verifiedDigest,
  }));
  if (packages.length !== 9)
    throw new Error('Place release refused: all nine registered provinces required.');
  for (const pkg of packages)
    for (const [artifact, table] of Object.entries(mapping))
      admitted[table].push(
        ...pkg.rows[artifact as keyof typeof mapping].map(row =>
          canonicalRow(table, table === 'place_evidence' ? { research_priority: 0, ...row } : row),
        ),
      );
  const admittedIds = new Set<string>();
  for (const p of admitted.place) {
    if (
      !/^pl-place-01-[a-f0-9]{24}$/.test(String(p.place_id)) ||
      admittedIds.has(String(p.place_id))
    )
      throw new Error('Place release refused: invalid/cross-territory Place identity.');
    admittedIds.add(String(p.place_id));
    if (
      ![...ELIGIBLE_LICENSING, 'osm_only_odbl_provisional'].includes(
        String(p.licensing_classification),
      )
    )
      throw new Error('Place release refused: unregistered licensing classification.');
  }
  const allowed = new Set(
    admitted.place
      .filter(p => p.licensing_classification !== 'osm_only_odbl_provisional')
      .map(p => String(p.place_id)),
  );
  const held = admitted.place
    .filter(p => !allowed.has(String(p.place_id)))
    .map(p => String(p.place_id))
    .sort(compare);
  const desired = emptyRows();
  for (const table of tables) {
    desired[table] = admitted[table].filter(row =>
      table === 'place_relationship'
        ? allowed.has(String(row.from_place_id)) && allowed.has(String(row.to_place_id))
        : row.place_id === null || allowed.has(String(row.place_id)),
    );
    desired[table].sort((a, b) => compare(identity(table, a), identity(table, b)));
    const seen = new Set<string>();
    for (const row of desired[table]) {
      const key = identity(table, row);
      if (seen.has(key))
        throw new Error(`Place release refused: duplicate admitted ${table} identity.`);
      seen.add(key);
    }
  }
  // A licensing hold may never leave an admitted child without its evidenced province chain.
  const parents = new Map<string, string>();
  for (const r of desired.place_relationship)
    if (r.relationship_type === 'administratively_contains') {
      if (parents.has(String(r.from_place_id)))
        throw new Error('Place release refused: ambiguous admitted parent.');
      parents.set(String(r.from_place_id), String(r.to_place_id));
    }
  const provinceIds = new Set(
    desired.place.filter(p => p.place_type === 'province').map(p => String(p.place_id)),
  );
  if (provinceIds.size !== 9)
    throw new Error('Place release refused: nine licensed province roots required.');
  for (const p of desired.place)
    if (p.place_type !== 'province') {
      const visited = new Set<string>();
      let cursor = String(p.place_id);
      while (!provinceIds.has(cursor)) {
        if (visited.has(cursor) || visited.size >= 8 || !parents.has(cursor))
          throw new Error(
            `Place release refused: ${p.place_id} lacks a bounded province parent after licensing hold.`,
          );
        visited.add(cursor);
        cursor = parents.get(cursor)!;
      }
    }
  return {
    policy: PLACE_RELEASE_POLICY,
    registrySha256,
    pins,
    desired,
    desiredDigest: stableDigest(desired),
    heldPlaceIds: held,
    heldDigest: stableDigest(held),
    heldRows: Object.fromEntries(tables.map(t => [t, admitted[t].length - desired[t].length])),
    provinceIds: desired.place.filter(p => p.place_type === 'province').map(p => p.place_id),
  };
}

/** Compare every governed column; identity counts cannot prove correct stored authority. */
export function reconcilePlaceRelease(desired: PlaceReleaseRows, stored: PlaceReleaseRows) {
  const pending = emptyRows();
  const observed = emptyRows();
  let operationalSignals = 0;
  for (const table of tables) {
    const wants = new Map(
      desired[table].map(row => [identity(table, row), canonicalRow(table, row)]),
    );
    const seen = new Set<string>();
    for (const raw of stored[table]) {
      const row = canonicalRow(table, raw),
        key = identity(table, row),
        want = wants.get(key);
      if (!want && table === 'place_evidence' && isOperationalPlaceCoverageSignal(row)) {
        operationalSignals++;
        continue;
      }
      if (!want || seen.has(key))
        throw new Error(`Place release refused: foreign/duplicate ${table} identity.`);
      if (JSON.stringify(row) !== JSON.stringify(want))
        throw new Error(`Place release refused: ${table} admitted values drift.`);
      seen.add(key);
      observed[table].push(row);
    }
    observed[table].sort((a, b) => compare(identity(table, a), identity(table, b)));
    pending[table] = desired[table].filter(row => !seen.has(identity(table, row)));
  }
  return {
    pending,
    observed,
    operationalSignals,
    pendingRows: tables.reduce((n, t) => n + pending[t].length, 0),
  };
}

async function readSchema(input: {
  authority: ResolvedDatabaseAuthority;
  connection: AuthoritySqlConnection;
}) {
  const manifest = loadAndValidateMigrationManifest({
    migrationsDirectory: `${input.authority.context.repository.root}/server/migrations`,
  });
  const applied = (
    await queryRows(
      input.connection,
      `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
    )
  ).map(row => ({ fileName: String(row.filename), checksum: String(row.checksum) }));
  const attempts = (
    await queryRows(
      input.connection,
      `SELECT attempt_id, migration_filename, state FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
    )
  ).map(row => ({
    attemptId: String(row.attempt_id),
    fileName: String(row.migration_filename),
    state: String(row.state) as MigrationAttempt['state'],
  }));
  const plan = buildMigrationPlan({
    manifest,
    applied,
    incompleteAttempts: attempts,
    targetFingerprintHash: input.authority.context.targetFingerprintHash,
    applicationTableCount: 1,
  });
  const physical = await queryRows(
    input.connection,
    `SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (${tables.map(() => '?').join(',')})`,
    tables,
  );
  return {
    manifest,
    head: plan.acceptedOldHead,
    pendingMigrations: plan.pending,
    physicalTables: physical.map(r => String(r.table_name)).sort(compare),
  };
}

type PlaceReleaseInput = {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  expectedPlanDigest?: string;
};

export async function releaseCanonicalPlaces(input: PlaceReleaseInput) {
  assertAuthorizedDatabaseOperation(input.authority, input.decision, [
    'release-reference-plan',
    'release-reference-apply',
    'release-reference-verify',
  ]);
  const target = requireReleaseReferenceTarget(input.authority);
  if (target.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH)
    throw new Error(
      'Place release refused: only the governed Azure production target is admitted.',
    );
  return runPlaceRelease(input, false);
}

/** The same protocol on an owned disposable target, never protected release authority. */
export async function previewCanonicalPlaceRelease(input: PlaceReleaseInput) {
  assertAuthorizedDatabaseOperation(input.authority, input.decision, [
    'reference-seed',
    'verification',
  ]);
  requireReferenceAdapterTarget(input.authority);
  return runPlaceRelease(input, true);
}

async function runPlaceRelease(input: PlaceReleaseInput, disposablePreview: boolean) {
  const target = input.authority.context;
  const apply =
    input.decision.operation === 'release-reference-apply' ||
    (disposablePreview && input.decision.operation === 'reference-seed');
  const candidate = loadPlaceReleaseCandidate(input.authority.context.repository.root);
  const schema = await readSchema(input);
  const prerequisites = {
    adapter: 'canonical-places-release',
    adapterDigest: PLACE_RELEASE_DIGEST,
    disposablePreview,
    policy: candidate.policy,
    targetFingerprintHash: target.targetFingerprintHash,
    head: schema.head,
    expectedHead: schema.manifest.document.expectedHead,
    manifestDigest: schema.manifest.manifestDigest,
    registrySha256: candidate.registrySha256,
    packagePins: candidate.pins,
    desiredDigest: candidate.desiredDigest,
    desiredRows: Object.fromEntries(tables.map(t => [t, candidate.desired[t].length])),
    heldPlaceIds: candidate.heldPlaceIds,
    heldDigest: candidate.heldDigest,
    heldRows: candidate.heldRows,
    holdReason: 'D3: founder production ODbL database-strategy gate remains uncleared',
    provinceIds: candidate.provinceIds,
    schemaMutation: false,
    providerWrites: false,
    batchLimits: PLACE_RELEASE_BATCH_LIMITS,
  };
  if (schema.pendingMigrations.length) {
    if (input.decision.operation !== 'release-reference-plan')
      throw new Error('Place release refused: schema migrations pending.');
    if (schema.physicalTables.length)
      throw new Error(
        'Place release refused: partially materialised Place schema requires schema review.',
      );
    return {
      ...prerequisites,
      readyForDataRelease: false,
      pendingMigrations: schema.pendingMigrations,
      physicalTables: [],
      planDigest: null,
      pendingRows: null,
    };
  }
  await requireAcceptedMigrationHead(input);
  if (schema.physicalTables.length !== tables.length)
    throw new Error('Place release refused: accepted head lacks required Place tables.');
  const desiredSchema = normalizedDesiredSchema(schemaExports);
  const physicalSchema = await normalizedPhysicalSchema(
    input.connection,
    input.authority.context.provider,
    desiredSchema,
  );
  const congruency = compareNormalizedSchemas(desiredSchema, physicalSchema);
  if (!congruency.congruent || !summarizeCheckConstraintEnforcement(physicalSchema).allEnforced)
    throw new Error(
      'Place release refused: canonical physical schema/constraint enforcement differs.',
    );
  const inspect = async () => {
    const stored = emptyRows();
    for (const table of tables)
      stored[table] = await queryRows(
        input.connection,
        `SELECT ${PLACE_RELEASE_TABLES[table].map(c => `\`${c}\``).join(', ')} FROM \`${table}\``,
      );
    const reconciliation = reconcilePlaceRelease(candidate.desired, stored);
    const binding = {
      ...prerequisites,
      observed: reconciliation.observed,
      pending: reconciliation.pending,
    };
    return {
      reconciliation,
      evidence: {
        ...prerequisites,
        readyForDataRelease: true,
        planDigest: stableDigest(binding),
        pendingRows: reconciliation.pendingRows,
        existingRows: tables.reduce((n, t) => n + reconciliation.observed[t].length, 0),
        operationalCoverageSignals: reconciliation.operationalSignals,
      },
    };
  };
  if (!apply) {
    const plan = await inspect();
    if (
      (input.decision.operation === 'release-reference-verify' || disposablePreview) &&
      plan.evidence.pendingRows
    )
      throw new Error('Place release verification refused: admitted reference rows incomplete.');
    return plan.evidence;
  }
  const expectedPlanDigest = disposablePreview
    ? (await inspect()).evidence.planDigest
    : input.expectedPlanDigest;
  if (!/^[a-f0-9]{64}$/.test(expectedPlanDigest ?? ''))
    throw new Error('Place release refused: reviewed exact plan digest required.');
  const lockName = 'property-listify:canonical-places:release';
  const lock = await queryRows(
    input.connection,
    'SELECT GET_LOCK(?, 30) AS acquired, CONNECTION_ID() AS owner',
    [lockName],
  );
  if (Number(lock[0]?.acquired) !== 1)
    throw new Error('Place release refused: release lock unavailable.');
  let transactionStarted = false;
  let commitAttempted = false;
  let committed = false;
  let operationFailed = false;
  let cleanupFailed = false;
  let rollbackFailed = false;
  let operationError: unknown;
  let rollbackError: unknown;
  let cleanupError: unknown;
  let result;
  const startedAt = performance.now();
  try {
    const owner = await queryRows(
      input.connection,
      'SELECT IS_USED_LOCK(?) AS owner, CONNECTION_ID() AS current_id',
      [lockName],
    );
    if (
      !Number.isSafeInteger(Number(lock[0]?.owner)) ||
      Number(lock[0]?.owner) <= 0 ||
      Number(owner[0]?.owner) !== Number(lock[0]?.owner) ||
      Number(owner[0]?.current_id) !== Number(lock[0]?.owner)
    )
      throw new Error('Place release refused: lock/session mismatch.');
    await input.connection.query('START TRANSACTION');
    transactionStarted = true;
    const plan = await inspect();
    if (plan.evidence.planDigest !== expectedPlanDigest)
      throw new Error('Place release refused: target/source plan changed; review fresh plan.');
    const insertStatementsByTable = Object.fromEntries(tables.map(t => [t, 0])) as Record<
      Table,
      number
    >;
    let maximumBatchRows = 0,
      maximumBatchParameters = 0,
      maximumEstimatedPayloadBytes = 0;
    for (const table of tables) {
      for (const batch of buildPlaceReleaseBatches(table, plan.reconciliation.pending[table])) {
        await input.connection.execute(batch.sql, batch.values);
        insertStatementsByTable[table]++;
        maximumBatchRows = Math.max(maximumBatchRows, batch.rows);
        maximumBatchParameters = Math.max(maximumBatchParameters, batch.values.length);
        maximumEstimatedPayloadBytes = Math.max(
          maximumEstimatedPayloadBytes,
          batch.estimatedPayloadBytes,
        );
      }
    }
    const verified = await inspect();
    if (verified.evidence.pendingRows)
      throw new Error('Place release refused: post-write verification incomplete.');
    commitAttempted = true;
    await input.connection.query('COMMIT');
    committed = true;
    result = {
      ...verified.evidence,
      acceptedPlanDigest: plan.evidence.planDigest,
      writtenRows: plan.evidence.pendingRows,
      insertStatementsByTable,
      insertStatements: Object.values(insertStatementsByTable).reduce((a, b) => a + b, 0),
      maximumBatchRows,
      maximumBatchParameters,
      maximumEstimatedPayloadBytes,
    };
  } catch (error) {
    operationFailed = true;
    operationError = error;
    if (transactionStarted && !commitAttempted) {
      try {
        await input.connection.query('ROLLBACK');
      } catch (error) {
        rollbackFailed = true;
        rollbackError = error;
      }
    }
  }
  try {
    const releaseResult = await input.connection.query('SELECT RELEASE_LOCK(?) AS released', [
      lockName,
    ]);
    const rows = (releaseResult as [unknown])[0] as Array<{ released: unknown }>;
    if (rows.length !== 1 || (rows[0]?.released !== 1 && rows[0]?.released !== '1'))
      throw new Error('Place release lock cleanup unsuccessful.');
  } catch (error) {
    cleanupFailed = true;
    cleanupError = error;
  }
  if (operationFailed || cleanupFailed) {
    const outcome = committed
      ? 'committed-cleanup-failed'
      : commitAttempted
        ? 'commit-uncertain'
        : rollbackFailed
          ? 'rollback-uncertain'
          : 'not-committed';
    throw new PlaceReleaseFailure(
      outcome,
      operationFailed ? operationError : cleanupError,
      cleanupError,
      rollbackError,
    );
  }
  return {
    ...result!,
    transactionOutcome: 'committed' as const,
    localOperationDurationMs: Math.round(performance.now() - startedAt),
  };
}

/** No automatic retry: retain the primary failure and independent cleanup evidence. */
export class PlaceReleaseFailure extends Error {
  constructor(
    public readonly outcome:
      | 'not-committed'
      | 'commit-uncertain'
      | 'rollback-uncertain'
      | 'committed-cleanup-failed',
    public readonly cause: unknown,
    public readonly cleanupError?: unknown,
    public readonly rollbackError?: unknown,
  ) {
    super(
      `${cause instanceof Error ? cause.message : String(cause)} [${outcome}]. Stop and inspect; do not retry automatically.`,
    );
    this.name = 'PlaceReleaseFailure';
  }
}

/** Prepared multi-row inserts. Payload budget conservatively includes SQL and JSON-encoded bind values,
 * plus 16 bytes per parameter for framing; it is an estimate, not a wire-packet measurement. */
export function* buildPlaceReleaseBatches(
  table: Table,
  rows: readonly Row[],
  limits: { rows: number; parameters: number; payloadBytes: number } = PLACE_RELEASE_BATCH_LIMITS,
) {
  if (!Object.values(limits).every(n => Number.isSafeInteger(n) && n > 0))
    throw new Error('Place release refused: invalid batch limits.');
  const columns = PLACE_RELEASE_TABLES[table];
  const prefix = `INSERT INTO \`${table}\` (${columns.map(c => `\`${c}\``).join(', ')}) VALUES `;
  const tuple = `(${columns.map(() => '?').join(', ')})`;
  let values: unknown[] = [],
    count = 0,
    bytes = Buffer.byteLength(prefix);
  const batch = () => ({
    sql: prefix + Array(count).fill(tuple).join(', '),
    values,
    rows: count,
    estimatedPayloadBytes: bytes,
  });
  for (const row of rows) {
    const parameters = columns.map(c =>
      c === 'observed_at' && row[c] !== null ? new Date(String(row[c])) : row[c],
    );
    const parameterBytes = parameters.reduce<number>(
      (n, value) => n + Buffer.byteLength(JSON.stringify(value) ?? 'null') + 16,
      0,
    );
    const rowBytes = Buffer.byteLength(tuple) + parameterBytes;
    if (
      columns.length > limits.parameters ||
      Buffer.byteLength(prefix) + rowBytes > limits.payloadBytes
    )
      throw new Error('Place release refused: single row exceeds batch budget.');
    if (
      count &&
      (count + 1 > limits.rows ||
        values.length + columns.length > limits.parameters ||
        bytes + 2 + rowBytes > limits.payloadBytes)
    ) {
      yield batch();
      values = [];
      count = 0;
      bytes = Buffer.byteLength(prefix);
    }
    bytes += rowBytes + (count ? 2 : 0);
    values.push(...parameters);
    count++;
  }
  if (count) yield batch();
}
