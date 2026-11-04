/** Founder-approved retirement of one duplicate Fordsburg Place identity. */
import {
  assertAuthorizedDatabaseOperation,
  B08_AZURE_TARGET_FINGERPRINT_HASH,
  type AuthorizedDatabaseOperation,
} from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../types';
import {
  queryRows,
  requireAcceptedMigrationHead,
  requireReferenceAdapterTarget,
  requireReleaseReferenceTarget,
  stableDigest,
} from './common';
import {
  PLACE_RELEASE_TABLES,
  PlaceReleaseFailure,
  loadPlaceReleaseCandidate,
} from './placeRelease';

export const FORDSBURG_RETIREMENT_VERSION = 'fordsburg-duplicate-retirement-v1' as const;
export const FORDSBURG_RETIRED_PLACE_ID = 'pl-place-01-99dcb8ba9d808741e35b258e' as const;
export const FORDSBURG_SURVIVING_PLACE_ID = 'pl-place-01-435b493de124264b676f708f' as const;
export const FORDSBURG_RETIREMENT_DECISION =
  'docs/architecture/fordsburg-duplicate-identity-review-2026-10-28.md' as const;

const GAUTENG_PLACE_ID = 'pl-place-01-503de72cc29aa712c0e5a597';
const columns = PLACE_RELEASE_TABLES;
const references = [
  ['listings', 'canonical_place_id'],
  ['properties', 'canonical_place_id'],
  ['saved_searches', 'place_id'],
  ['development_place_assignments', 'place_id'],
  ['explore_content', 'canonical_place_id'],
  ['land_parcels', 'canonical_place_id'],
  ['commercial_assets', 'canonical_place_id'],
  ['sl_places', 'canonical_place_id'],
  ['service_provider_locations', 'canonical_place_id'],
  ['service_leads', 'canonical_place_id'],
  ['demand_campaigns', 'canonical_place_id'],
  ['seller_prospects', 'canonical_place_id'],
  ['search_area_member', 'place_id'],
] as const;

const expectedLegacy = {
  place: [
    {
      place_id: FORDSBURG_RETIRED_PLACE_ID,
      place_type: 'locality',
      place_classification: 'statutory',
      verification_status: 'provisional',
      lifecycle_status: 'active',
      publication_eligible: 0,
      search_eligible: 1,
      search_scope: 'locality',
      licensing_classification: 'permissive_supported',
    },
  ],
  place_name: [
    {
      place_id: FORDSBURG_RETIRED_PLACE_ID,
      name: 'Fordsburg',
      normalized_name: 'fordsburg',
      name_role: 'preferred_public',
      name_state: 'active',
      is_searchable: 1,
      evidence_source: 'geonames+nga_gns',
      valid_from: null,
      valid_to: null,
    },
    {
      place_id: FORDSBURG_RETIRED_PLACE_ID,
      name: 'ZAFBG',
      normalized_name: 'zafbg',
      name_role: 'common',
      name_state: 'active',
      is_searchable: 0,
      evidence_source: 'geonames+nga_gns',
      valid_from: null,
      valid_to: null,
    },
  ],
  place_relationship: [
    {
      from_place_id: FORDSBURG_RETIRED_PLACE_ID,
      to_place_id: GAUTENG_PLACE_ID,
      relationship_type: 'administratively_contains',
      search_scope_authorized: 0,
      evidence_source: 'geoboundaries_administrative_context',
      valid_from: null,
      valid_to: null,
    },
  ],
  place_evidence: [
    {
      place_id: FORDSBURG_RETIRED_PLACE_ID,
      evidence_kind: 'source_record',
      evidence_state: 'under_review',
      subject: 'Fordsburg',
      provider: 'geonames+nga_gns',
      provider_record_id: 'sr:geonames:1004001',
      research_priority: 0,
      note: 'identity_admitted:single_source_identity;type=locality;licensing=permissive_supported;identity_confidence=moderate;type_state=provisional;spatial_confidence=supported;boundary_conflict=false;source_record_count=2;all_source_records=sr:geonames:1004001|sr:nga_gns:-1228611:-1798335:90891',
    },
  ],
  place_external_mapping: [
    {
      place_id: FORDSBURG_RETIRED_PLACE_ID,
      provider: 'geonames',
      provider_record_id: 'sr:geonames:1004001',
      provider_label: 'Fordsburg',
      normalized_alias: 'fordsburg',
      observed_at: '2026-09-25T12:37:17.000Z',
    },
    {
      place_id: FORDSBURG_RETIRED_PLACE_ID,
      provider: 'nga_gns',
      provider_record_id: 'sr:nga_gns:-1228611:-1798335:90891',
      provider_label: 'Fordsburg',
      normalized_alias: 'fordsburg',
      observed_at: '2026-09-25T12:56:38.000Z',
    },
  ],
} as const;

export const FORDSBURG_RETIREMENT_DIGEST = stableDigest({
  version: FORDSBURG_RETIREMENT_VERSION,
  retiredPlaceId: FORDSBURG_RETIRED_PLACE_ID,
  survivingPlaceId: FORDSBURG_SURVIVING_PLACE_ID,
  decision: FORDSBURG_RETIREMENT_DECISION,
  expectedLegacy,
  references,
  action: 'remap-canonical-references-delete-exact-legacy-place-bundle',
  transaction: 'place-release-lock-explicit-commit-and-rollback-v1',
});

type Input = {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  expectedPlanDigest?: string;
};

const NUMERIC_COLUMNS = new Set([
  'publication_eligible',
  'search_eligible',
  'is_searchable',
  'search_scope_authorized',
  'research_priority',
]);

function normalize(table: keyof typeof columns, rows: readonly Record<string, unknown>[]) {
  return rows
    .map(row =>
      Object.fromEntries(
        columns[table].map(column => {
          let value = row[column] ?? null;
          if (NUMERIC_COLUMNS.has(column) && value !== null) value = Number(value);
          if (column === 'observed_at' && value !== null) {
            const date = value instanceof Date ? value : new Date(String(value));
            if (!Number.isFinite(date.getTime()))
              throw new Error('Fordsburg retirement refused: invalid mapping timestamp.');
            value = date.toISOString();
          }
          return [column, value];
        }),
      ),
    )
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

async function readRows(input: Input, table: keyof typeof columns, where: string, values: unknown[]) {
  return queryRows(
    input.connection,
    `SELECT ${columns[table].map(column => `\`${column}\``).join(', ')} FROM \`${table}\` WHERE ${where}`,
    values,
  );
}

async function readReferences(input: Input) {
  const found: Record<string, number> = {};
  for (const [table, column] of references) {
    const rows = await queryRows(
      input.connection,
      `SELECT COUNT(*) AS row_count FROM \`${table}\` WHERE \`${column}\` = ?`,
      [FORDSBURG_RETIRED_PLACE_ID],
    );
    found[`${table}.${column}`] = Number(rows[0]?.row_count ?? 0);
  }
  return found;
}

async function inspect(input: Input) {
  const candidate = loadPlaceReleaseCandidate(input.authority.context.repository.root);
  const survivorExpected = candidate.desired.place.find(
    row => row.place_id === FORDSBURG_SURVIVING_PLACE_ID,
  );
  if (!survivorExpected)
    throw new Error('Fordsburg retirement refused: surviving suburb is absent from the current package.');
  const [oldPlace, survivor, names, relationships, evidence, mappings, referenceCounts] =
    await Promise.all([
      readRows(input, 'place', '`place_id` = ?', [FORDSBURG_RETIRED_PLACE_ID]),
      readRows(input, 'place', '`place_id` = ?', [FORDSBURG_SURVIVING_PLACE_ID]),
      readRows(input, 'place_name', '`place_id` = ?', [FORDSBURG_RETIRED_PLACE_ID]),
      readRows(
        input,
        'place_relationship',
        '`from_place_id` = ? OR `to_place_id` = ?',
        [FORDSBURG_RETIRED_PLACE_ID, FORDSBURG_RETIRED_PLACE_ID],
      ),
      readRows(input, 'place_evidence', '`place_id` = ?', [FORDSBURG_RETIRED_PLACE_ID]),
      readRows(input, 'place_external_mapping', '`place_id` = ?', [FORDSBURG_RETIRED_PLACE_ID]),
      readReferences(input),
    ]);
  const oldBundle = {
    place: normalize('place', oldPlace),
    place_name: normalize('place_name', names),
    place_relationship: normalize('place_relationship', relationships),
    place_evidence: normalize('place_evidence', evidence),
    place_external_mapping: normalize('place_external_mapping', mappings),
  };
  const expectedBundle = Object.fromEntries(
    Object.entries(expectedLegacy).map(([table, rows]) => [
      table,
      normalize(table as keyof typeof columns, rows as readonly Record<string, unknown>[]),
    ]),
  );
  const oldPresent = oldPlace.length === 1;
  if (oldPresent)
    for (const table of Object.keys(expectedBundle) as (keyof typeof columns)[])
      if (JSON.stringify(
        table === 'place_external_mapping'
          ? oldBundle[table].map(({ observed_at: _observedAt, ...row }) => row)
          : oldBundle[table],
      ) !== JSON.stringify(
        table === 'place_external_mapping'
          ? expectedBundle[table].map(({ observed_at: _observedAt, ...row }) => row)
          : expectedBundle[table],
      ))
        throw new Error(`Fordsburg retirement refused: stored ${table} rows differ from the reviewed legacy bundle.`);
  if (!oldPresent && Object.values(oldBundle).some(rows => rows.length))
    throw new Error('Fordsburg retirement refused: orphaned legacy Place records remain.');
  if (!oldPresent && Object.values(referenceCounts).some(count => count !== 0))
    throw new Error('Fordsburg retirement refused: references remain without the legacy Place row.');
  if (survivor.length !== 1 ||
      JSON.stringify(normalize('place', survivor)) !==
        JSON.stringify(normalize('place', [survivorExpected])))
    throw new Error('Fordsburg retirement refused: surviving suburb row is missing or differs from the current package.');
  return {
    oldPresent,
    oldBundle,
    survivor: normalize('place', survivor),
    referenceCounts,
    planDigest: stableDigest({
      adapter: 'fordsburg-place-retirement',
      adapterDigest: FORDSBURG_RETIREMENT_DIGEST,
      targetFingerprintHash: input.authority.context.targetFingerprintHash,
      expectedHead: '0197_drop_seller_prospects_province.sql',
      retiredPlaceId: FORDSBURG_RETIRED_PLACE_ID,
      survivingPlaceId: FORDSBURG_SURVIVING_PLACE_ID,
      oldPresent,
      oldBundle,
      survivor: normalize('place', survivor),
      referenceCounts,
    }),
  };
}

function isLocalSeed(input: Input) {
  return input.decision.operation === 'reference-seed' &&
    input.authority.context.targetClass === 'disposable-worktree';
}

async function acquireLock(input: Input, lockName: string) {
  const result = await queryRows(input.connection, 'SELECT GET_LOCK(?, 30) AS acquired, CONNECTION_ID() AS owner', [lockName]);
  if (Number(result[0]?.acquired) !== 1)
    throw new Error('Fordsburg retirement refused: Place release lock unavailable.');
  const lockOwner = Number(result[0]?.owner);
  const owner = await queryRows(input.connection, 'SELECT IS_USED_LOCK(?) AS owner, CONNECTION_ID() AS current_id', [lockName]);
  if (!Number.isSafeInteger(lockOwner) || lockOwner <= 0 || Number(owner[0]?.owner) !== lockOwner || Number(owner[0]?.current_id) !== lockOwner)
    throw new Error('Fordsburg retirement refused: lock/session mismatch.');
}

async function releaseLock(input: Input, lockName: string) {
  const rows = await queryRows(input.connection, 'SELECT RELEASE_LOCK(?) AS released', [lockName]);
  if (rows.length !== 1 || Number(rows[0]?.released) !== 1)
    throw new Error('Fordsburg retirement refused: release lock cleanup unsuccessful.');
}

export async function retireFordsburgDuplicate(input: Input) {
  assertAuthorizedDatabaseOperation(input.authority, input.decision, [
    'reference-seed',
    'verification',
    'release-reference-plan',
    'release-reference-apply',
    'release-reference-verify',
  ]);
  const operation = input.decision.operation;
  if (isLocalSeed(input)) requireReferenceAdapterTarget(input.authority);
  else if (operation === 'release-reference-plan' || operation === 'release-reference-apply' || operation === 'release-reference-verify') {
    const target = requireReleaseReferenceTarget(input.authority);
    if (target.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH)
      throw new Error('Fordsburg retirement refused: only the governed Azure release target is admitted.');
  } else if (input.authority.context.targetClass !== 'disposable-worktree') {
    throw new Error('Fordsburg retirement refused: verification target is not disposable.');
  }

  await requireAcceptedMigrationHead(input);
  const before = await inspect(input);
  const baseEvidence = {
    adapter: 'fordsburg-place-retirement',
    version: FORDSBURG_RETIREMENT_VERSION,
    digest: FORDSBURG_RETIREMENT_DIGEST,
    decision: FORDSBURG_RETIREMENT_DECISION,
    targetFingerprintHash: input.authority.context.targetFingerprintHash,
    databaseName: input.authority.context.databaseName,
    retiredPlaceId: FORDSBURG_RETIRED_PLACE_ID,
    survivingPlaceId: FORDSBURG_SURVIVING_PLACE_ID,
    referenceCounts: before.referenceCounts,
    legacyRows: Object.fromEntries(Object.entries(before.oldBundle).map(([table, rows]) => [table, rows.length])),
    planDigest: before.planDigest,
  };
  if (operation === 'release-reference-plan')
    return { ...baseEvidence, ready: true, alreadyRetired: !before.oldPresent };
  if (operation === 'verification' || operation === 'release-reference-verify') {
    if (before.oldPresent)
      throw new Error('Fordsburg retirement verification refused: legacy Place identity is still present.');
    return { ...baseEvidence, verified: true, alreadyRetired: true };
  }
  if (operation !== 'release-reference-apply' && !isLocalSeed(input))
    throw new Error('Fordsburg retirement refused: mutation operation is not authorized.');
  if (operation === 'release-reference-apply' && input.expectedPlanDigest !== before.planDigest)
    throw new Error('Fordsburg retirement refused: exact reviewed plan digest is required.');
  if (!before.oldPresent)
    return { ...baseEvidence, alreadyRetired: true, transactionOutcome: 'not-applicable' as const };

  const lockName = 'property-listify:canonical-places:release';
  let transactionStarted = false;
  let commitAttempted = false;
  let committed = false;
  let operationError: unknown;
  let cleanupError: unknown;
  let rollbackError: unknown;
  let rollbackFailed = false;
  let operationFailed = false;
  let cleanupFailed = false;
  let result: Record<string, unknown> | undefined;
  try {
    await acquireLock(input, lockName);
    await input.connection.query('START TRANSACTION');
    transactionStarted = true;
    const locked = await inspect(input);
    if (locked.planDigest !== before.planDigest)
      throw new Error('Fordsburg retirement refused: target state changed after inspection. Review a fresh plan.');
    for (const [table, column] of references)
      await input.connection.execute(
        `UPDATE \`${table}\` SET \`${column}\` = ? WHERE \`${column}\` = ?`,
        [FORDSBURG_SURVIVING_PLACE_ID, FORDSBURG_RETIRED_PLACE_ID],
      );
    await input.connection.execute('DELETE FROM `place_external_mapping` WHERE `place_id` = ?', [FORDSBURG_RETIRED_PLACE_ID]);
    await input.connection.execute('DELETE FROM `place_evidence` WHERE `place_id` = ?', [FORDSBURG_RETIRED_PLACE_ID]);
    await input.connection.execute(
      'DELETE FROM `place_relationship` WHERE `from_place_id` = ? OR `to_place_id` = ?',
      [FORDSBURG_RETIRED_PLACE_ID, FORDSBURG_RETIRED_PLACE_ID],
    );
    await input.connection.execute('DELETE FROM `place_name` WHERE `place_id` = ?', [FORDSBURG_RETIRED_PLACE_ID]);
    await input.connection.execute('DELETE FROM `place` WHERE `place_id` = ?', [FORDSBURG_RETIRED_PLACE_ID]);
    const after = await inspect(input);
    if (after.oldPresent || Object.values(after.referenceCounts).some(count => count !== 0))
      throw new Error('Fordsburg retirement refused: post-delete verification found a remaining identity or reference.');
    commitAttempted = true;
    await input.connection.query('COMMIT');
    committed = true;
    result = {
      ...baseEvidence,
      referenceRowsRemapped: Object.values(before.referenceCounts).reduce((sum, count) => sum + count, 0),
      deletedRows: Object.fromEntries(Object.entries(before.oldBundle).map(([table, rows]) => [table, rows.length])),
      postReferenceCounts: after.referenceCounts,
      transactionOutcome: 'committed',
    };
  } catch (error) {
    operationFailed = true;
    operationError = error;
    if (transactionStarted && !commitAttempted) {
      try { await input.connection.query('ROLLBACK'); }
      catch (rollback) { rollbackFailed = true; rollbackError = rollback; }
    }
  }
  try { await releaseLock(input, lockName); }
  catch (error) { cleanupFailed = true; cleanupError = error; }
  if (operationFailed || cleanupFailed) {
    const outcome = committed ? 'committed-cleanup-failed' : commitAttempted ? 'commit-uncertain' : rollbackFailed ? 'rollback-uncertain' : 'not-committed';
    throw new PlaceReleaseFailure(outcome, operationFailed ? operationError : cleanupError, cleanupError, rollbackError);
  }
  return result!;
}
