import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  assertAuthorizedDatabaseOperation,
  type AuthorizedDatabaseOperation,
} from '../_core/databaseAuthority/authorization';
import {
  createAuthoritySqlConnection,
  type AuthoritySqlConnection,
} from '../_core/databaseAuthority/connectionAuthority';
import type { ResolvedDatabaseAuthority } from '../_core/databaseAuthority/types';
import { loadAndValidateMigrationManifest, migrationChecksum } from './migrationManifest';
import {
  acquireMigrationLock,
  assertRunnerConnectionTarget,
  queryMigrationRows,
  releaseMigrationLock,
} from './runSqlMigrations';

/**
 * This is intentionally a single, reviewed production recovery rather than a
 * generic repair framework. It can replace only the durable zero-statement
 * TiDB failure recorded for the original search-to-lead migration.
 */
export const REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY = Object.freeze({
  filename: '0001_public_search_to_lead_reliability.sql',
  checksum: 'adb04a6e5655e4812ddd594d2b85cb5b218c6f54cb2fc0c029ecdc76325da5a0',
  archivedPath:
    'server/migrations/_archived/rejected-zero-statement/0001_public_search_to_lead_reliability.sql',
  replacementFilename: '0001_public_search_to_lead_reliability_sequenced.sql',
  replacementChecksum: '510ae023e9c3bc04a7d92f7a533843939412f82d4f04cd1bf11c312fb89bc4a3',
  replacementApprovalReference: 'DBX-TIDB-0001-REPLACEMENT-2026-09-04-Edward',
  acceptedSuccessfulHead: '0000_canonical_launch_baseline.sql',
  attemptAcceptedOldHead: null,
  failedExpectedHead: '0065_auth_verification_token_cleanup.sql',
  expectedFailureClass: 'ER_KEY_COLUMN_DOES_NOT_EXITS',
  tableName: 'leads',
  absentColumns: [
    'capture_request_id',
    'consent_captured_at',
    'consent_version',
    'consent_source',
    'delivery_status',
    'delivery_attempts',
    'delivery_last_attempt_at',
    'delivery_next_attempt_at',
    'delivery_last_error',
    'delivery_provider_reference',
  ],
  uniqueIndexName: 'uq_leads_capture_request',
  replacementReason: 'tidb_same_alter_new_column_unique_index',
});

type AttemptEvidence = {
  attemptId: string;
  planDigest: string;
  targetFingerprintHash: string;
  migrationFilename: string;
  migrationChecksum: string;
  acceptedOldHead: string | null;
  expectedNewHead: string;
  state: string;
  completedStatementCount: number;
  lastStatementDigest: string | null;
  failureClass: string | null;
  failureDigest: string | null;
  applicationArtifact: string | null;
};

type PhysicalEvidence = {
  tableName: string;
  tablePresent: true;
  absentColumns: readonly string[];
  uniqueIndexName: string;
  uniqueIndexAbsent: true;
};

export type RejectedReleaseMigrationRecoveryPlan = {
  recoveryVersion: 1;
  planId: string;
  planDigest: string;
  status: 'pending' | 'already-applied';
  targetFingerprintHash: string;
  acceptedSuccessfulHead: string;
  canonicalHead: string;
  rejectedAttempt: AttemptEvidence;
  archivedEvidence: {
    path: string;
    checksum: string;
  };
  replacementMigration: {
    filename: string;
    checksum: string;
  };
  physicalEvidence: PhysicalEvidence;
  review: {
    reference: string;
    actor: string;
    reason: string;
  };
  recoveryAttemptId: string;
};

export type RejectedReleaseMigrationRecoveryOptions = {
  mode: 'plan' | 'apply';
  authority: ResolvedDatabaseAuthority;
  authorization: AuthorizedDatabaseOperation;
  attemptId: string;
  approvalReference: string;
  approvalActor: string;
  expectedPlanDigest?: string;
  connectionFactory?: (
    authority: ResolvedDatabaseAuthority,
    decision: AuthorizedDatabaseOperation,
  ) => Promise<AuthoritySqlConnection>;
};

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function rowValue(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
}

function optionalString(row: Record<string, unknown>, key: string): string | null {
  const candidate = rowValue(row, key);
  return candidate === null || candidate === undefined ? null : String(candidate);
}

function requiredReviewValue(input: string, label: string): string {
  const normalized = input.trim();
  if (!normalized || normalized.length > 80 || !/^[a-zA-Z0-9_.:@/-]+$/.test(normalized)) {
    throw new Error(`Release migration recovery refused: ${label} is missing or malformed.`);
  }
  return normalized;
}

function attemptFromRow(row: Record<string, unknown>): AttemptEvidence {
  return {
    attemptId: String(rowValue(row, 'attempt_id') ?? ''),
    planDigest: String(rowValue(row, 'plan_digest') ?? ''),
    targetFingerprintHash: String(rowValue(row, 'target_fingerprint_hash') ?? ''),
    migrationFilename: String(rowValue(row, 'migration_filename') ?? ''),
    migrationChecksum: String(rowValue(row, 'migration_checksum') ?? ''),
    acceptedOldHead: optionalString(row, 'accepted_old_head'),
    expectedNewHead: String(rowValue(row, 'expected_new_head') ?? ''),
    state: String(rowValue(row, 'state') ?? ''),
    completedStatementCount: Number(rowValue(row, 'completed_statement_count')),
    lastStatementDigest: optionalString(row, 'last_statement_digest'),
    failureClass: optionalString(row, 'failure_class'),
    failureDigest: optionalString(row, 'failure_digest'),
    applicationArtifact: optionalString(row, 'application_artifact'),
  };
}

function replacementFailureDigest(input: {
  archivedChecksum: string;
  physicalEvidence: PhysicalEvidence;
}): string {
  return sha256({
    reason: REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.replacementReason,
    archivedChecksum: input.archivedChecksum,
    replacementChecksum: REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.replacementChecksum,
    physicalEvidence: input.physicalEvidence,
  });
}

function assertReleaseTarget(authority: ResolvedDatabaseAuthority, mode: 'plan' | 'apply'): void {
  const expectedOperation = mode === 'plan' ? 'release-plan' : 'release-apply';
  if (authority.context.operation !== expectedOperation) {
    throw new Error(
      'Release migration recovery refused: resolved operation does not match recovery mode.',
    );
  }
  if (
    authority.context.local ||
    !['staging', 'production'].includes(authority.context.targetClass)
  ) {
    throw new Error(
      'Release migration recovery refused: only a protected hosted release target is eligible.',
    );
  }
}

function assertReviewMatchesProtectedAuthorization(
  authorization: AuthorizedDatabaseOperation,
  approvalReference: string,
  approvalActor: string,
): void {
  const reference = requiredReviewValue(approvalReference, 'approval reference');
  const actor = requiredReviewValue(approvalActor, 'approval actor');
  if (reference !== REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.replacementApprovalReference) {
    throw new Error(
      'Release migration recovery refused: approval reference is not the exact reviewed replacement approval.',
    );
  }
  if (authorization.approvalReference !== reference || authorization.approvalActor !== actor) {
    throw new Error(
      'Release migration recovery refused: review evidence must match the protected target approval.',
    );
  }
}

function assertExactFailedAttempt(
  attempt: AttemptEvidence,
  authority: ResolvedDatabaseAuthority,
): void {
  const rejected = REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY;
  if (!['failed', 'failed_replaced'].includes(attempt.state)) {
    throw new Error(
      `Release migration recovery refused: attempt state ${attempt.state} is not recoverable.`,
    );
  }
  if (
    attempt.targetFingerprintHash !== authority.context.targetFingerprintHash ||
    attempt.migrationFilename !== rejected.filename ||
    attempt.migrationChecksum !== rejected.checksum ||
    attempt.acceptedOldHead !== rejected.attemptAcceptedOldHead ||
    attempt.expectedNewHead !== rejected.failedExpectedHead ||
    attempt.completedStatementCount !== 0 ||
    attempt.lastStatementDigest !== null ||
    attempt.failureClass !== rejected.expectedFailureClass ||
    !attempt.failureDigest
  ) {
    throw new Error(
      'Release migration recovery refused: durable attempt evidence does not match the reviewed zero-statement failure.',
    );
  }
}

async function assertAcceptedSuccessfulHistory(
  connection: AuthoritySqlConnection,
  manifest: ReturnType<typeof loadAndValidateMigrationManifest>,
): Promise<void> {
  const acceptedIndex = manifest.orderedMigrations.findIndex(
    item => item.filename === REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.acceptedSuccessfulHead,
  );
  if (acceptedIndex < 0) {
    throw new Error('Release migration recovery refused: accepted successful head is absent.');
  }
  const expectedHistory = manifest.orderedMigrations.slice(0, acceptedIndex + 1);
  const rows = await queryMigrationRows(
    connection,
    `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
  );
  if (rows.length !== expectedHistory.length) {
    throw new Error(
      'Release migration recovery refused: successful history is not the exact accepted canonical prefix.',
    );
  }
  for (let index = 0; index < expectedHistory.length; index += 1) {
    const expected = expectedHistory[index];
    if (
      String(rowValue(rows[index], 'filename') ?? '') !== expected.filename ||
      String(rowValue(rows[index], 'checksum') ?? '') !== expected.checksum
    ) {
      throw new Error(
        'Release migration recovery refused: successful history differs from the accepted canonical prefix.',
      );
    }
  }
}

function assertReplacementLineage(
  manifest: ReturnType<typeof loadAndValidateMigrationManifest>,
): void {
  const rejected = REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY;
  if (manifest.document.expectedHead !== rejected.failedExpectedHead) {
    throw new Error(
      'Release migration recovery refused: active manifest head changed after review.',
    );
  }
  if (manifest.orderedMigrations.some(item => item.filename === rejected.filename)) {
    throw new Error('Release migration recovery refused: rejected SQL is still active.');
  }
  const replacement = manifest.orderedMigrations.find(
    item => item.filename === rejected.replacementFilename,
  );
  if (
    !replacement ||
    replacement.sequence !== 1 ||
    replacement.checksum !== rejected.replacementChecksum ||
    replacement.kind !== 'exceptional' ||
    replacement.statementPolicy !== 'approved-exception' ||
    replacement.approvalReference !== rejected.replacementApprovalReference
  ) {
    throw new Error('Release migration recovery refused: reviewed replacement lineage changed.');
  }
}

async function inspectPhysicalAbsence(
  connection: AuthoritySqlConnection,
): Promise<PhysicalEvidence> {
  const rejected = REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY;
  const tableRows = await queryMigrationRows(
    connection,
    'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [rejected.tableName],
  );
  if (tableRows.length !== 1) {
    throw new Error(
      'Release migration recovery refused: canonical baseline leads table is absent.',
    );
  }
  const placeholders = rejected.absentColumns.map(() => '?').join(', ');
  const columnRows = await queryMigrationRows(
    connection,
    `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name IN (${placeholders})`,
    [rejected.tableName, ...rejected.absentColumns],
  );
  if (columnRows.length !== 0) {
    throw new Error(
      'Release migration recovery refused: rejected migration columns already exist physically.',
    );
  }
  const indexRows = await queryMigrationRows(
    connection,
    'SELECT index_name FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
    [rejected.tableName, rejected.uniqueIndexName],
  );
  if (indexRows.length !== 0) {
    throw new Error(
      'Release migration recovery refused: rejected migration unique index already exists physically.',
    );
  }
  return Object.freeze({
    tableName: rejected.tableName,
    tablePresent: true as const,
    absentColumns: Object.freeze([...rejected.absentColumns]),
    uniqueIndexName: rejected.uniqueIndexName,
    uniqueIndexAbsent: true as const,
  });
}

async function buildReleaseRecoveryPlan(input: {
  connection: AuthoritySqlConnection;
  authority: ResolvedDatabaseAuthority;
  attemptId: string;
  approvalReference: string;
  approvalActor: string;
}): Promise<RejectedReleaseMigrationRecoveryPlan> {
  const { connection, authority } = input;
  const rejected = REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY;
  await assertRunnerConnectionTarget(connection, authority);
  const manifest = loadAndValidateMigrationManifest();
  assertReplacementLineage(manifest);
  await assertAcceptedSuccessfulHistory(connection, manifest);

  const attemptRows = await queryMigrationRows(
    connection,
    `SELECT attempt_id, plan_digest, target_fingerprint_hash, migration_filename, migration_checksum, accepted_old_head, expected_new_head, state, completed_statement_count, last_statement_digest, failure_class, failure_digest, application_artifact FROM \`${manifest.document.attemptTable}\` WHERE attempt_id = ?`,
    [input.attemptId],
  );
  if (attemptRows.length !== 1) {
    throw new Error('Release migration recovery refused: exact failed attempt was not found once.');
  }
  const attempt = attemptFromRow(attemptRows[0]);
  assertExactFailedAttempt(attempt, authority);

  const incompleteRows = await queryMigrationRows(
    connection,
    `SELECT attempt_id FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
  );
  if (
    (attempt.state === 'failed' &&
      (incompleteRows.length !== 1 ||
        String(rowValue(incompleteRows[0], 'attempt_id') ?? '') !== attempt.attemptId)) ||
    (attempt.state === 'failed_replaced' && incompleteRows.length !== 0)
  ) {
    throw new Error(
      'Release migration recovery refused: another incomplete migration attempt exists.',
    );
  }

  const archivedAbsolutePath = resolve(authority.context.repository.root, rejected.archivedPath);
  const archivedChecksum = migrationChecksum(readFileSync(archivedAbsolutePath, 'utf8'));
  if (archivedChecksum !== rejected.checksum) {
    throw new Error(
      'Release migration recovery refused: archived rejected SQL checksum differs from the attempt.',
    );
  }
  const physicalEvidence = await inspectPhysicalAbsence(connection);
  const reference = requiredReviewValue(input.approvalReference, 'approval reference');
  const actor = requiredReviewValue(input.approvalActor, 'approval actor');
  const digestMaterial = {
    recoveryVersion: 1,
    targetFingerprintHash: authority.context.targetFingerprintHash,
    manifestDigest: manifest.manifestDigest,
    acceptedSuccessfulHead: rejected.acceptedSuccessfulHead,
    canonicalHead: manifest.document.expectedHead,
    rejectedAttempt: { ...attempt, state: 'failed-or-reviewed' },
    archivedEvidence: { path: rejected.archivedPath, checksum: archivedChecksum },
    replacementMigration: {
      filename: rejected.replacementFilename,
      checksum: rejected.replacementChecksum,
    },
    physicalEvidence,
    review: { reference, actor, reason: rejected.replacementReason },
  };
  const planDigest = sha256(digestMaterial);
  const recoveryAttemptId = `release-recovery-${planDigest.slice(0, 32)}`;
  const recoveryRows = await queryMigrationRows(
    connection,
    `SELECT attempt_id, plan_digest, target_fingerprint_hash, migration_filename, migration_checksum, accepted_old_head, expected_new_head, state, completed_statement_count, last_statement_digest, failure_class, failure_digest, application_artifact FROM \`${manifest.document.attemptTable}\` WHERE attempt_id = ?`,
    [recoveryAttemptId],
  );
  const expectedArtifact = JSON.stringify({
    reference,
    actor,
    replaces: attempt.attemptId,
    replacement: rejected.replacementFilename,
  });
  if (expectedArtifact.length > 255) {
    throw new Error(
      'Release migration recovery refused: review evidence exceeds the durable artifact limit.',
    );
  }
  if (attempt.state === 'failed_replaced') {
    if (recoveryRows.length !== 1) {
      throw new Error(
        'Release migration recovery refused: replacement state lacks matching review evidence.',
      );
    }
    const recovery = attemptFromRow(recoveryRows[0]);
    if (
      recovery.state !== 'reviewed_replacement' ||
      recovery.planDigest !== planDigest ||
      recovery.targetFingerprintHash !== authority.context.targetFingerprintHash ||
      recovery.migrationFilename !== rejected.filename ||
      recovery.migrationChecksum !== rejected.checksum ||
      recovery.acceptedOldHead !== rejected.acceptedSuccessfulHead ||
      recovery.expectedNewHead !== manifest.document.expectedHead ||
      recovery.completedStatementCount !== 0 ||
      recovery.lastStatementDigest !== null ||
      recovery.failureClass !== 'reviewed_zero_statement_replacement' ||
      recovery.failureDigest !== replacementFailureDigest({ archivedChecksum, physicalEvidence }) ||
      recovery.applicationArtifact !== expectedArtifact
    ) {
      throw new Error(
        'Release migration recovery refused: durable replacement evidence is inconsistent.',
      );
    }
  } else if (recoveryRows.length !== 0) {
    throw new Error(
      'Release migration recovery refused: replacement evidence exists before failed-attempt review.',
    );
  }

  return Object.freeze({
    recoveryVersion: 1 as const,
    planId: planDigest.slice(0, 24),
    planDigest,
    status:
      attempt.state === 'failed_replaced' ? ('already-applied' as const) : ('pending' as const),
    targetFingerprintHash: authority.context.targetFingerprintHash,
    acceptedSuccessfulHead: rejected.acceptedSuccessfulHead,
    canonicalHead: manifest.document.expectedHead,
    rejectedAttempt: Object.freeze(attempt),
    archivedEvidence: Object.freeze({ path: rejected.archivedPath, checksum: archivedChecksum }),
    replacementMigration: Object.freeze({
      filename: rejected.replacementFilename,
      checksum: rejected.replacementChecksum,
    }),
    physicalEvidence,
    review: Object.freeze({ reference, actor, reason: rejected.replacementReason }),
    recoveryAttemptId,
  });
}

export async function runRejectedReleaseZeroStatementRecovery(
  options: RejectedReleaseMigrationRecoveryOptions,
): Promise<{
  mode: 'plan' | 'apply';
  plan: RejectedReleaseMigrationRecoveryPlan;
  applied: boolean;
}> {
  assertReleaseTarget(options.authority, options.mode);
  const expectedOperation = options.mode === 'plan' ? 'release-plan' : 'release-apply';
  assertAuthorizedDatabaseOperation(options.authority, options.authorization, [expectedOperation]);
  assertReviewMatchesProtectedAuthorization(
    options.authorization,
    options.approvalReference,
    options.approvalActor,
  );
  if (options.mode === 'apply' && !options.expectedPlanDigest) {
    throw new Error(
      'Release migration recovery refused: apply requires the exact reviewed plan digest.',
    );
  }

  const connection = await (options.connectionFactory ?? createAuthoritySqlConnection)(
    options.authority,
    options.authorization,
  );
  const manifest = loadAndValidateMigrationManifest();
  let lockAcquired = false;
  try {
    if (options.mode === 'apply') {
      await acquireMigrationLock(connection, manifest.document.lockName);
      lockAcquired = true;
    }
    const plan = await buildReleaseRecoveryPlan({
      connection,
      authority: options.authority,
      attemptId: options.attemptId,
      approvalReference: options.approvalReference,
      approvalActor: options.approvalActor,
    });
    if (options.mode === 'plan') return { mode: options.mode, plan, applied: false };
    if (plan.planDigest !== options.expectedPlanDigest) {
      throw new Error(
        'Release migration recovery refused: reviewed plan digest does not match current evidence.',
      );
    }
    if (plan.status === 'already-applied') {
      return { mode: options.mode, plan, applied: false };
    }

    const reviewArtifact = JSON.stringify({
      reference: plan.review.reference,
      actor: plan.review.actor,
      replaces: plan.rejectedAttempt.attemptId,
      replacement: plan.replacementMigration.filename,
    });
    const reviewFailureDigest = replacementFailureDigest({
      archivedChecksum: plan.archivedEvidence.checksum,
      physicalEvidence: plan.physicalEvidence,
    });
    try {
      await connection.query('START TRANSACTION');
      await connection.execute(
        `UPDATE \`${manifest.document.attemptTable}\` SET state = 'failed_replaced' WHERE attempt_id = ? AND state = 'failed' AND target_fingerprint_hash = ? AND migration_filename = ? AND migration_checksum = ? AND accepted_old_head IS NULL AND expected_new_head = ? AND completed_statement_count = 0 AND last_statement_digest IS NULL AND failure_class = ? AND failure_digest = ?`,
        [
          plan.rejectedAttempt.attemptId,
          plan.targetFingerprintHash,
          REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.filename,
          REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.checksum,
          REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.failedExpectedHead,
          REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.expectedFailureClass,
          plan.rejectedAttempt.failureDigest,
        ],
      );
      const changedRows = await queryMigrationRows(
        connection,
        `SELECT state, completed_statement_count, last_statement_digest, failure_class, failure_digest FROM \`${manifest.document.attemptTable}\` WHERE attempt_id = ?`,
        [plan.rejectedAttempt.attemptId],
      );
      if (
        changedRows.length !== 1 ||
        String(rowValue(changedRows[0], 'state') ?? '') !== 'failed_replaced' ||
        Number(rowValue(changedRows[0], 'completed_statement_count')) !== 0 ||
        optionalString(changedRows[0], 'last_statement_digest') !== null ||
        optionalString(changedRows[0], 'failure_class') !== plan.rejectedAttempt.failureClass ||
        optionalString(changedRows[0], 'failure_digest') !== plan.rejectedAttempt.failureDigest
      ) {
        throw new Error(
          'Release migration recovery refused: failed-attempt evidence did not transition exactly.',
        );
      }
      await connection.execute(
        `INSERT INTO \`${manifest.document.attemptTable}\` (attempt_id, plan_digest, target_fingerprint_hash, migration_filename, migration_checksum, accepted_old_head, expected_new_head, state, completed_statement_count, last_statement_digest, failure_class, failure_digest, application_artifact, correlation_id, lock_owner_connection_id, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'reviewed_replacement', 0, NULL, 'reviewed_zero_statement_replacement', ?, ?, ?, CONNECTION_ID(), CURRENT_TIMESTAMP(3))`,
        [
          plan.recoveryAttemptId,
          plan.planDigest,
          plan.targetFingerprintHash,
          REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.filename,
          REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.checksum,
          plan.acceptedSuccessfulHead,
          plan.canonicalHead,
          reviewFailureDigest,
          reviewArtifact,
          options.authority.context.correlationId,
        ],
      );
      await connection.query('COMMIT');
    } catch (error) {
      try {
        await connection.query('ROLLBACK');
      } catch {
        // The unchanged or partially recorded attempt remains blocking evidence.
      }
      throw error;
    }

    const appliedPlan = await buildReleaseRecoveryPlan({
      connection,
      authority: options.authority,
      attemptId: options.attemptId,
      approvalReference: options.approvalReference,
      approvalActor: options.approvalActor,
    });
    if (appliedPlan.planDigest !== plan.planDigest || appliedPlan.status !== 'already-applied') {
      throw new Error(
        'Release migration recovery failed closed: durable replacement evidence was not proven.',
      );
    }
    return { mode: options.mode, plan: appliedPlan, applied: true };
  } finally {
    if (lockAcquired) {
      await releaseMigrationLock(connection, manifest.document.lockName);
    }
    await connection.end();
  }
}
