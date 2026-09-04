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
 * This is a deliberately bounded production recovery for the one zero-statement
 * 0046 failure observed during the 2026-09-04 TiDB cutover. It does not execute
 * the rejected SQL or provide a general-purpose ledger repair mechanism.
 */
export const REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS = Object.freeze({
  attemptId: '198ffda9d58670ea351d733d-0046',
  failedPlanDigest: '198ffda9d58670ea351d733db048bb97a779db042facaf72bd8e632065b3ea05',
  filename: '0046_commercial_office_quote_terms.sql',
  checksum: 'db6a114745bf8295bfe33a0b2081596ac61f5efcb1e694fd2380ed3480fe5a72',
  archivedPath:
    'server/migrations/_archived/rejected-zero-statement/0046_commercial_office_quote_terms.sql',
  replacementFilename: '0046_commercial_office_quote_terms_sequenced.sql',
  replacementChecksum: '827c59f6e441fa0d9cbaacd0ff9411fa19eb525b8b7938856c3f14d1a5f1046c',
  replacementApprovalReference: 'DBX-TIDB-0046-QUOTE-TERMS-RECOVERY-2026-09-04-Edward',
  acceptedSuccessfulHead: '0045_commercial_space_positive_area_integrity.sql',
  attemptAcceptedOldHead: '0000_canonical_launch_baseline.sql',
  failedExpectedHead: '0065_auth_verification_token_cleanup.sql',
  expectedFailureClass: 'ER_BAD_FIELD_ERROR',
  expectedFailureDigest: '0d51d0c2713fc626086a93cf5c6a4e4faa56f8154ae3f931e4a1bdc973cb8a6d',
  tableName: 'commercial_availabilities',
  anchorColumnName: 'transaction_type',
  absentColumns: ['pricing_mode', 'vat_treatment'],
  replacementReason: 'tidb_after_reference_to_same_alter_column',
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
  anchorColumnName: string;
  anchorColumnPresent: true;
  absentColumns: readonly string[];
};

export type RejectedCommercialQuoteTermsRecoveryPlan = {
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

export type RejectedCommercialQuoteTermsRecoveryOptions = {
  mode: 'plan' | 'apply';
  authority: ResolvedDatabaseAuthority;
  authorization: AuthorizedDatabaseOperation;
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
    reason: REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.replacementReason,
    archivedChecksum: input.archivedChecksum,
    replacementChecksum: REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.replacementChecksum,
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
  if (reference !== REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.replacementApprovalReference) {
    throw new Error(
      'Release migration recovery refused: approval reference is not the exact reviewed 0046 replacement approval.',
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
  const rejected = REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS;
  if (!['failed', 'failed_replaced'].includes(attempt.state)) {
    throw new Error(
      `Release migration recovery refused: attempt state ${attempt.state} is not recoverable.`,
    );
  }
  if (
    attempt.attemptId !== rejected.attemptId ||
    attempt.planDigest !== rejected.failedPlanDigest ||
    attempt.targetFingerprintHash !== authority.context.targetFingerprintHash ||
    attempt.migrationFilename !== rejected.filename ||
    attempt.migrationChecksum !== rejected.checksum ||
    attempt.acceptedOldHead !== rejected.attemptAcceptedOldHead ||
    attempt.expectedNewHead !== rejected.failedExpectedHead ||
    attempt.completedStatementCount !== 0 ||
    attempt.lastStatementDigest !== null ||
    attempt.failureClass !== rejected.expectedFailureClass ||
    attempt.failureDigest !== rejected.expectedFailureDigest
  ) {
    throw new Error(
      'Release migration recovery refused: durable attempt evidence does not match the reviewed 0046 zero-statement failure.',
    );
  }
}

async function assertAcceptedSuccessfulHistory(
  connection: AuthoritySqlConnection,
  manifest: ReturnType<typeof loadAndValidateMigrationManifest>,
): Promise<void> {
  const acceptedIndex = manifest.orderedMigrations.findIndex(
    item => item.filename === REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.acceptedSuccessfulHead,
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
  const rejected = REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS;
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
  const successor = manifest.orderedMigrations.find(item => item.sequence === 47);
  if (
    !replacement ||
    replacement.sequence !== 46 ||
    replacement.checksum !== rejected.replacementChecksum ||
    replacement.kind !== 'exceptional' ||
    replacement.statementPolicy !== 'approved-exception' ||
    replacement.approvalReference !== rejected.replacementApprovalReference ||
    !successor ||
    successor.parent !== rejected.replacementFilename ||
    successor.parentChecksum !== rejected.replacementChecksum
  ) {
    throw new Error(
      'Release migration recovery refused: reviewed 0046 replacement lineage changed.',
    );
  }
}

async function inspectPhysicalAbsence(
  connection: AuthoritySqlConnection,
): Promise<PhysicalEvidence> {
  const rejected = REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS;
  const tableRows = await queryMigrationRows(
    connection,
    'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
    [rejected.tableName],
  );
  if (tableRows.length !== 1) {
    throw new Error(
      'Release migration recovery refused: commercial_availabilities table is absent.',
    );
  }
  const requestedColumns = [rejected.anchorColumnName, ...rejected.absentColumns];
  const placeholders = requestedColumns.map(() => '?').join(', ');
  const columnRows = await queryMigrationRows(
    connection,
    `SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name IN (${placeholders})`,
    [rejected.tableName, ...requestedColumns],
  );
  const presentNames = new Set(columnRows.map(row => String(rowValue(row, 'column_name') ?? '')));
  if (!presentNames.has(rejected.anchorColumnName)) {
    throw new Error(
      'Release migration recovery refused: the 0046 anchor column transaction_type is absent.',
    );
  }
  if (rejected.absentColumns.some(column => presentNames.has(column))) {
    throw new Error(
      'Release migration recovery refused: one or more 0046 columns already exist physically.',
    );
  }
  return Object.freeze({
    tableName: rejected.tableName,
    tablePresent: true as const,
    anchorColumnName: rejected.anchorColumnName,
    anchorColumnPresent: true as const,
    absentColumns: Object.freeze([...rejected.absentColumns]),
  });
}

async function buildRecoveryPlan(input: {
  connection: AuthoritySqlConnection;
  authority: ResolvedDatabaseAuthority;
  approvalReference: string;
  approvalActor: string;
}): Promise<RejectedCommercialQuoteTermsRecoveryPlan> {
  const { connection, authority } = input;
  const rejected = REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS;
  await assertRunnerConnectionTarget(connection, authority);
  const manifest = loadAndValidateMigrationManifest();
  assertReplacementLineage(manifest);
  await assertAcceptedSuccessfulHistory(connection, manifest);

  const attemptRows = await queryMigrationRows(
    connection,
    `SELECT attempt_id, plan_digest, target_fingerprint_hash, migration_filename, migration_checksum, accepted_old_head, expected_new_head, state, completed_statement_count, last_statement_digest, failure_class, failure_digest, application_artifact FROM \`${manifest.document.attemptTable}\` WHERE attempt_id = ?`,
    [rejected.attemptId],
  );
  if (attemptRows.length !== 1) {
    throw new Error(
      'Release migration recovery refused: exact 0046 failed attempt was not found once.',
    );
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
  const recoveryAttemptId = `release-0046-recovery-${planDigest.slice(0, 32)}`;
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
        'Release migration recovery refused: durable 0046 replacement evidence is inconsistent.',
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

export async function runRejectedReleaseCommercialQuoteTermsRecovery(
  options: RejectedCommercialQuoteTermsRecoveryOptions,
): Promise<{
  mode: 'plan' | 'apply';
  plan: RejectedCommercialQuoteTermsRecoveryPlan;
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
    const plan = await buildRecoveryPlan({
      connection,
      authority: options.authority,
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
        `UPDATE \`${manifest.document.attemptTable}\` SET state = 'failed_replaced' WHERE attempt_id = ? AND state = 'failed' AND plan_digest = ? AND target_fingerprint_hash = ? AND migration_filename = ? AND migration_checksum = ? AND accepted_old_head = ? AND expected_new_head = ? AND completed_statement_count = 0 AND last_statement_digest IS NULL AND failure_class = ? AND failure_digest = ?`,
        [
          plan.rejectedAttempt.attemptId,
          REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.failedPlanDigest,
          plan.targetFingerprintHash,
          REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.filename,
          REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.checksum,
          REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.attemptAcceptedOldHead,
          REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.failedExpectedHead,
          REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.expectedFailureClass,
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
          REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.filename,
          REJECTED_COMMERCIAL_OFFICE_QUOTE_TERMS.checksum,
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
        // Preserve any durable evidence if the transaction outcome is ambiguous.
      }
      throw error;
    }

    const appliedPlan = await buildRecoveryPlan({
      connection,
      authority: options.authority,
      approvalReference: options.approvalReference,
      approvalActor: options.approvalActor,
    });
    if (appliedPlan.planDigest !== plan.planDigest || appliedPlan.status !== 'already-applied') {
      throw new Error(
        'Release migration recovery failed closed: durable 0046 replacement evidence was not proven.',
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
