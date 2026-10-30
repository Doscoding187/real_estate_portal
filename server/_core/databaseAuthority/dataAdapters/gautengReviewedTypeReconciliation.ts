/** Reviewed exact-set reconciliation for 48 Gauteng type corrections. */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
  PLACE_RELEASE_DIGEST,
  PLACE_RELEASE_TABLES,
  PlaceReleaseFailure,
  loadPlaceReleaseCandidate,
} from './placeRelease';

export const GAUTENG_TYPE_RECONCILIATION_VERSION =
  'gauteng-reviewed-type-reconciliation-v1' as const;
export const GAUTENG_TYPE_RECONCILIATION_DECISION =
  'docs/architecture/launch-readiness-and-product-convergence/64-location-model-and-licensing-decision-2026-10-20.md' as const;

const HISTORICAL_ADMISSION_PATH =
  'data/gauteng-place-admission-v0.1/gauteng_place_admission_v0.1.jsonl';
const HISTORICAL_EVIDENCE_PATH =
  'data/gauteng-place-admission-v0.1/gauteng_place_evidence_v0.1.jsonl';
const HISTORICAL_MANIFEST_PATH =
  'data/gauteng-place-admission-v0.1/gauteng_place_admission_manifest.v0.1.json';
const HISTORICAL_ADMISSION_SHA256 =
  '9473b4bfb07da81d58f1e88d55ad3bc9d847877144d36e58bb7be8e00ec01984';
const HISTORICAL_EVIDENCE_SHA256 =
  '68f7a9c0c25fe2d93a3a46c91a37fa956682ba819f9be905a0090b1606aeed41';
const REVIEWED_PLACE_ID_DIGEST =
  'f60cb17517291b41e8b81cb4ab053d3699d5d535e2c1286c7bc783652d023962';
const REVIEWED_PLACE_COUNT = 48;
const EXPECTED_TYPE_TRANSITIONS = { 'town->suburb': 41, 'town->locality': 7 } as const;
const PLACE_COLUMNS = PLACE_RELEASE_TABLES.place;
const EVIDENCE_COLUMNS = PLACE_RELEASE_TABLES.place_evidence;
const NUMERIC_COLUMNS = new Set([
  'publication_eligible',
  'search_eligible',
  'research_priority',
]);
const LOCK_NAME = 'property-listify:canonical-places:release';

type Row = Record<string, unknown>;
type Correction = {
  placeId: string;
  oldPlace: Row;
  newPlace: Row;
  oldEvidence: Row;
  newEvidence: Row;
};
type Input = {
  authority: ResolvedDatabaseAuthority;
  decision: AuthorizedDatabaseOperation;
  connection: AuthoritySqlConnection;
  expectedPlanDigest?: string;
};

function readJsonl(root: string, path: string): Row[] {
  return readFileSync(resolve(root, path), 'utf8')
    .split(/\r?\n/)
    .filter(line => line.trim().length > 0)
    .map(line => JSON.parse(line) as Row);
}

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function canonicalRow(columns: readonly string[], row: Row): Row {
  return Object.fromEntries(
    columns.map(column => {
      let value = row[column] ?? null;
      if (NUMERIC_COLUMNS.has(column) && value !== null) value = Number(value);
      return [column, value];
    }),
  );
}

function canonicalEvidence(rows: readonly Row[]): Row[] {
  return rows
    .map(row => canonicalRow(EVIDENCE_COLUMNS, row))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
}

function canonicalPlaces(rows: readonly Row[]): Row[] {
  return rows
    .map(row => canonicalRow(PLACE_COLUMNS, row))
    .sort((left, right) => String(left.place_id).localeCompare(String(right.place_id)));
}

function without(row: Row, keys: readonly string[]): Row {
  return Object.fromEntries(Object.entries(row).filter(([key]) => !keys.includes(key)));
}

function loadReviewedCorrections(root: string, candidate = loadPlaceReleaseCandidate(root)) {
  const admissionBytes = readFileSync(resolve(root, HISTORICAL_ADMISSION_PATH));
  const evidenceBytes = readFileSync(resolve(root, HISTORICAL_EVIDENCE_PATH));
  if (
    sha256(admissionBytes) !== HISTORICAL_ADMISSION_SHA256 ||
    sha256(evidenceBytes) !== HISTORICAL_EVIDENCE_SHA256
  ) {
    throw new Error('Gauteng type reconciliation refused: pinned 0111 source artifacts changed.');
  }
  const oldManifest = JSON.parse(
    readFileSync(resolve(root, HISTORICAL_MANIFEST_PATH), 'utf8'),
  ) as { admission_version?: string; outputs?: Record<string, string> };
  if (
    oldManifest.admission_version !== 'gauteng-place-admission-v0.1' ||
    oldManifest.outputs?.places !== HISTORICAL_ADMISSION_PATH ||
    oldManifest.outputs?.evidence !== HISTORICAL_EVIDENCE_PATH
  ) {
    throw new Error('Gauteng type reconciliation refused: historical package manifest changed.');
  }
  const currentTerritory = candidate.pins.find(pin => pin.territoryId === 'za-gp');
  if (currentTerritory?.admissionVersion !== 'gauteng-place-admission-v0.3') {
    throw new Error('Gauteng type reconciliation refused: reviewed current package version changed.');
  }

  const oldPlaces = new Map(
    readJsonl(root, HISTORICAL_ADMISSION_PATH).map(row => [
      String(row.place_id),
      canonicalRow(PLACE_COLUMNS, row),
    ]),
  );
  const oldEvidence = new Map<string, Row[]>();
  for (const row of readJsonl(root, HISTORICAL_EVIDENCE_PATH)) {
    const placeId = String(row.place_id);
    oldEvidence.set(placeId, [...(oldEvidence.get(placeId) ?? []), row]);
  }
  const newPlaces = new Map(
    candidate.desired.place.map(row => [String(row.place_id), canonicalRow(PLACE_COLUMNS, row)]),
  );
  const newEvidence = new Map<string, Row[]>();
  for (const row of candidate.desired.place_evidence) {
    const placeId = String(row.place_id);
    newEvidence.set(placeId, [...(newEvidence.get(placeId) ?? []), row]);
  }

  const placeIds = [...oldPlaces.keys()]
    .filter(placeId => {
      const oldPlace = oldPlaces.get(placeId)!;
      const newPlace = newPlaces.get(placeId);
      return newPlace && (
        oldPlace.place_type !== newPlace.place_type ||
        oldPlace.search_scope !== newPlace.search_scope
      );
    })
    .sort();
  if (
    placeIds.length !== REVIEWED_PLACE_COUNT ||
    stableDigest(placeIds) !== REVIEWED_PLACE_ID_DIGEST
  ) {
    throw new Error('Gauteng type reconciliation refused: reviewed 48-Place identity set changed.');
  }

  const transitions: Record<string, number> = {};
  const corrections = placeIds.map(placeId => {
    const oldPlace = oldPlaces.get(placeId)!;
    const newPlace = newPlaces.get(placeId)!;
    const transition = `${oldPlace.place_type}->${newPlace.place_type}`;
    transitions[transition] = (transitions[transition] ?? 0) + 1;
    if (
      oldPlace.place_type !== 'town' ||
      !['suburb', 'locality'].includes(String(newPlace.place_type)) ||
      oldPlace.search_scope !== 'metro_city' ||
      newPlace.search_scope !== 'locality' ||
      oldPlace.search_eligible !== newPlace.search_eligible ||
      oldPlace.publication_eligible !== newPlace.publication_eligible ||
      oldPlace.lifecycle_status !== newPlace.lifecycle_status ||
      oldPlace.verification_status !== newPlace.verification_status ||
      oldPlace.place_classification !== newPlace.place_classification ||
      oldPlace.licensing_classification !== newPlace.licensing_classification ||
      JSON.stringify(without(oldPlace, ['place_type', 'search_scope'])) !==
        JSON.stringify(without(newPlace, ['place_type', 'search_scope']))
    ) {
      throw new Error(`Gauteng type reconciliation refused: unexpected Place-field drift at ${placeId}.`);
    }
    const beforeEvidence = canonicalEvidence(oldEvidence.get(placeId) ?? []);
    const afterEvidence = canonicalEvidence(newEvidence.get(placeId) ?? []);
    if (
      beforeEvidence.length !== 1 ||
      afterEvidence.length !== 1 ||
      beforeEvidence[0].note === afterEvidence[0].note ||
      JSON.stringify(without(beforeEvidence[0], ['note'])) !==
        JSON.stringify(without(afterEvidence[0], ['note']))
    ) {
      throw new Error(`Gauteng type reconciliation refused: unexpected evidence-note drift at ${placeId}.`);
    }
    return {
      placeId,
      oldPlace,
      newPlace,
      oldEvidence: beforeEvidence[0],
      newEvidence: afterEvidence[0],
    } satisfies Correction;
  });
  if (
    transitions['town->suburb'] !== EXPECTED_TYPE_TRANSITIONS['town->suburb'] ||
    transitions['town->locality'] !== EXPECTED_TYPE_TRANSITIONS['town->locality'] ||
    Object.keys(transitions).length !== 2
  ) {
    throw new Error('Gauteng type reconciliation refused: reviewed type transition counts changed.');
  }
  return { candidate, corrections, transitions };
}

export const GAUTENG_TYPE_RECONCILIATION_DIGEST = stableDigest({
  version: GAUTENG_TYPE_RECONCILIATION_VERSION,
  decision: GAUTENG_TYPE_RECONCILIATION_DECISION,
  placeReleaseDigest: PLACE_RELEASE_DIGEST,
  oldAdmissionSha256: HISTORICAL_ADMISSION_SHA256,
  oldEvidenceSha256: HISTORICAL_EVIDENCE_SHA256,
  reviewedPlaceIdDigest: REVIEWED_PLACE_ID_DIGEST,
  placeCount: REVIEWED_PLACE_COUNT,
  transitions: EXPECTED_TYPE_TRANSITIONS,
  from: { place_type: 'town', search_scope: 'metro_city' },
  scopeTo: 'locality',
  changedFields: ['place.place_type', 'place.search_scope', 'place_evidence.note'],
  unchangedFields: ['place_id', 'search_eligible', 'publication_eligible', 'all other Place and evidence fields'],
  transaction: 'canonical-place-lock-exact-preflight-explicit-commit-and-rollback-v1',
});

function expectedPlaceRows(corrections: readonly Correction[], state: 'old' | 'new') {
  return canonicalPlaces(corrections.map(correction =>
    state === 'old' ? correction.oldPlace : correction.newPlace,
  ));
}

function expectedEvidenceRows(corrections: readonly Correction[], state: 'old' | 'new') {
  return canonicalEvidence(corrections.map(correction =>
    state === 'old' ? correction.oldEvidence : correction.newEvidence,
  ));
}

async function inspect(input: Input) {
  const root = input.authority.context.repository.root;
  const { candidate, corrections, transitions } = loadReviewedCorrections(root);
  const ids = corrections.map(correction => correction.placeId);
  const placeholders = ids.map(() => '?').join(', ');
  const actualPlaces = canonicalPlaces(await queryRows(
    input.connection,
    `SELECT ${PLACE_COLUMNS.map(column => `\`${column}\``).join(', ')} FROM \`place\` WHERE \`place_id\` IN (${placeholders})`,
    ids,
  ));
  const actualEvidence = canonicalEvidence(await queryRows(
    input.connection,
    `SELECT ${EVIDENCE_COLUMNS.map(column => `\`${column}\``).join(', ')} FROM \`place_evidence\` WHERE \`place_id\` IN (${placeholders})`,
    ids,
  ));
  const oldState =
    JSON.stringify(actualPlaces) === JSON.stringify(expectedPlaceRows(corrections, 'old')) &&
    JSON.stringify(actualEvidence) === JSON.stringify(expectedEvidenceRows(corrections, 'old'));
  const reconciledState =
    JSON.stringify(actualPlaces) === JSON.stringify(expectedPlaceRows(corrections, 'new')) &&
    JSON.stringify(actualEvidence) === JSON.stringify(expectedEvidenceRows(corrections, 'new'));
  if (!oldState && !reconciledState) {
    throw new Error('Gauteng type reconciliation refused: rows are missing, mixed, or differ from both reviewed states.');
  }
  const state = oldState ? 'old' : 'reconciled';
  const planDigest = stableDigest({
    adapterDigest: GAUTENG_TYPE_RECONCILIATION_DIGEST,
    targetFingerprintHash: input.authority.context.targetFingerprintHash,
    candidateDigest: candidate.desiredDigest,
    correctionIds: ids,
    transitions,
    state,
    actualPlaces,
    actualEvidence,
  });
  return {
    candidate,
    corrections,
    transitions,
    state,
    planDigest,
    actualPlaces,
    actualEvidence,
  };
}

function isLocalApply(input: Input) {
  return input.decision.operation === 'reference-seed' &&
    input.authority.context.targetClass === 'disposable-worktree';
}

async function acquireLock(input: Input) {
  const lock = await queryRows(
    input.connection,
    'SELECT GET_LOCK(?, 30) AS acquired, CONNECTION_ID() AS owner',
    [LOCK_NAME],
  );
  if (Number(lock[0]?.acquired) !== 1)
    throw new Error('Gauteng type reconciliation refused: canonical Place release lock unavailable.');
  const owner = await queryRows(
    input.connection,
    'SELECT IS_USED_LOCK(?) AS owner, CONNECTION_ID() AS current_id',
    [LOCK_NAME],
  );
  if (
    !Number.isSafeInteger(Number(lock[0]?.owner)) ||
    Number(lock[0]?.owner) <= 0 ||
    Number(owner[0]?.owner) !== Number(lock[0]?.owner) ||
    Number(owner[0]?.current_id) !== Number(lock[0]?.owner)
  ) {
    throw new Error('Gauteng type reconciliation refused: release lock/session mismatch.');
  }
}

async function releaseLock(input: Input) {
  const rows = await queryRows(input.connection, 'SELECT RELEASE_LOCK(?) AS released', [LOCK_NAME]);
  if (rows.length !== 1 || Number(rows[0]?.released) !== 1)
    throw new Error('Gauteng type reconciliation refused: release lock cleanup unsuccessful.');
}

export async function reconcileGautengReviewedTypes(input: Input) {
  const allowed = [
    'reference-seed',
    'verification',
    'release-reference-plan',
    'release-reference-apply',
    'release-reference-verify',
  ] as const;
  assertAuthorizedDatabaseOperation(input.authority, input.decision, allowed);
  const operation = input.decision.operation;
  if (isLocalApply(input)) requireReferenceAdapterTarget(input.authority);
  else if (operation.startsWith('release-reference-')) {
    const target = requireReleaseReferenceTarget(input.authority);
    if (target.targetFingerprintHash !== B08_AZURE_TARGET_FINGERPRINT_HASH)
      throw new Error('Gauteng type reconciliation refused: only the governed Azure target is admitted.');
  } else if (input.authority.context.targetClass !== 'disposable-worktree') {
    throw new Error('Gauteng type reconciliation refused: verification target is not disposable.');
  }

  await requireAcceptedMigrationHead(input);
  const before = await inspect(input);
  const baseEvidence = {
    adapter: 'gauteng-reviewed-type-reconciliation',
    version: GAUTENG_TYPE_RECONCILIATION_VERSION,
    digest: GAUTENG_TYPE_RECONCILIATION_DIGEST,
    decision: GAUTENG_TYPE_RECONCILIATION_DECISION,
    targetFingerprintHash: input.authority.context.targetFingerprintHash,
    databaseName: input.authority.context.databaseName,
    placeIds: before.corrections.map(correction => correction.placeId),
    correctionCount: before.corrections.length,
    typeTransitions: before.transitions,
    scopeTransitions: { 'metro_city->locality': before.corrections.length },
    evidenceNotesChanged: before.corrections.length,
    searchEligibilityChanges: 0,
    publicationEligibilityChanges: 0,
    planDigest: before.planDigest,
    state: before.state,
  };
  if (operation === 'release-reference-plan')
    return { ...baseEvidence, ready: true, alreadyReconciled: before.state === 'reconciled' };
  if (operation === 'verification' || operation === 'release-reference-verify') {
    if (before.state !== 'reconciled')
      throw new Error('Gauteng type reconciliation verification refused: old values remain.');
    return { ...baseEvidence, verified: true, alreadyReconciled: true };
  }
  if (operation !== 'release-reference-apply' && !isLocalApply(input))
    throw new Error('Gauteng type reconciliation refused: mutation operation is not authorized.');
  if (operation === 'release-reference-apply' && input.expectedPlanDigest !== before.planDigest)
    throw new Error('Gauteng type reconciliation refused: exact reviewed plan digest required.');
  if (before.state === 'reconciled')
    return { ...baseEvidence, alreadyReconciled: true, transactionOutcome: 'not-applicable' as const };

  let transactionStarted = false;
  let commitAttempted = false;
  let committed = false;
  let operationFailed = false;
  let cleanupFailed = false;
  let rollbackFailed = false;
  let operationError: unknown;
  let cleanupError: unknown;
  let rollbackError: unknown;
  let result: Record<string, unknown> | undefined;
  try {
    await acquireLock(input);
    await input.connection.query('START TRANSACTION');
    transactionStarted = true;
    const locked = await inspect(input);
    if (locked.state !== 'old' || locked.planDigest !== before.planDigest)
      throw new Error('Gauteng type reconciliation refused: target changed after review; inspect again.');
    for (const correction of locked.corrections) {
      await input.connection.execute(
        'UPDATE `place` SET `place_type` = ?, `search_scope` = ? WHERE `place_id` = ? AND `place_type` = ? AND `search_scope` = ?',
        [
          correction.newPlace.place_type,
          correction.newPlace.search_scope,
          correction.placeId,
          correction.oldPlace.place_type,
          correction.oldPlace.search_scope,
        ],
      );
      await input.connection.execute(
        'UPDATE `place_evidence` SET `note` = ? WHERE `place_id` = ? AND `evidence_kind` = ? AND `subject` = ? AND `provider` = ? AND `provider_record_id` = ? AND `note` = ?',
        [
          correction.newEvidence.note,
          correction.placeId,
          correction.oldEvidence.evidence_kind,
          correction.oldEvidence.subject,
          correction.oldEvidence.provider,
          correction.oldEvidence.provider_record_id,
          correction.oldEvidence.note,
        ],
      );
    }
    const after = await inspect(input);
    if (after.state !== 'reconciled')
      throw new Error('Gauteng type reconciliation refused: post-update verification did not match the reviewed values.');
    commitAttempted = true;
    await input.connection.query('COMMIT');
    committed = true;
    result = {
      ...baseEvidence,
      planDigest: locked.planDigest,
      state: after.state,
      rowsUpdated: { place: REVIEWED_PLACE_COUNT, place_evidence: REVIEWED_PLACE_COUNT },
      transactionOutcome: 'committed',
    };
  } catch (error) {
    operationFailed = true;
    operationError = error;
    if (transactionStarted && !commitAttempted) {
      try {
        await input.connection.query('ROLLBACK');
      } catch (rollback) {
        rollbackFailed = true;
        rollbackError = rollback;
      }
    }
  }
  try {
    await releaseLock(input);
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
  return result!;
}
