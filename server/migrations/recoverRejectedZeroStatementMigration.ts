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

export type RejectedZeroStatementMigration = {
  filename: string;
  checksum: string;
  archivedPath: string;
  acceptedHead: string;
  failedExpectedHead: string;
  expectedFailureClass: string;
  rejectedObjectName: string;
  rejectedObjectType: 'trigger' | 'table';
  replacementFilename?: string;
  replacementChecksum?: string;
  replacementReason: string;
  allowFreshBatch?: boolean;
};

export const REJECTED_CATALOGUE_PUBLISHER_TRIGGER: RejectedZeroStatementMigration = Object.freeze({
  filename: '0019_catalogue_publisher_authority_immutability.sql',
  checksum: 'e251a0f99162c00a08437287092659e93685f06dda4a7feac43a547bde3bbf80',
  archivedPath:
    'server/migrations/_archived/rejected-zero-statement/0019_catalogue_publisher_authority_immutability.sql',
  acceptedHead: '0018_distribution_access_publisher_authority.sql',
  failedExpectedHead: '0019_catalogue_publisher_authority_immutability.sql',
  expectedFailureClass: 'ER_BINLOG_CREATE_ROUTINE_NEED_SUPER',
  rejectedObjectName: 'trg_catalogue_publishers_immutable_authority',
  rejectedObjectType: 'trigger',
  replacementReason: 'tidb_unsupported_trigger',
});

export const REJECTED_DISTRIBUTION_DELIVERY_TABLE: RejectedZeroStatementMigration = Object.freeze({
  filename: '0142_distribution_deal_document_deliveries.sql',
  checksum: '777fa93ad961eaa64b7c1b487539bf9905507ed08c887439aec22572313cba21',
  archivedPath:
    'server/migrations/_archived/rejected-zero-statement/0142_distribution_deal_document_deliveries.sql',
  acceptedHead: '0141_distribution_deal_required_document_fk_restrict.sql',
  failedExpectedHead: '0142_distribution_deal_document_deliveries.sql',
  expectedFailureClass: 'ER_TOO_LONG_IDENT',
  rejectedObjectName: 'distribution_deal_document_deliveries',
  rejectedObjectType: 'table',
  replacementFilename: '0142_distribution_deal_document_deliveries_sequenced.sql',
  replacementChecksum: 'f084627a2b0ed1924d0cb8e3b2bc2f769b2f3acc3e24101d664bb3b0cadea4c2',
  replacementReason: 'mysql_identifier_length_limit',
});

export const REJECTED_SERVICE_PROVIDER_REVIEW_REPORTS_TABLE: RejectedZeroStatementMigration =
  Object.freeze({
    filename: '0151_service_provider_review_reports.sql',
    checksum: '94f8afaf998469233e32480664c87be7af3259062364ba10e8cd858f96818733',
    archivedPath:
      'server/migrations/_archived/rejected-zero-statement/0151_service_provider_review_reports.sql',
    acceptedHead: '0150_service_provider_reviews_moderation_index.sql',
    failedExpectedHead: '0151_service_provider_review_reports.sql',
    expectedFailureClass: 'ER_TOO_LONG_IDENT',
    rejectedObjectName: 'service_provider_review_reports',
    rejectedObjectType: 'table',
    replacementFilename: '0151_service_provider_review_reports_sequenced.sql',
    replacementChecksum: 'd1272ddd283c0ce679b9244823c1aeb2dd2b810a41652f00eb81711769897b60',
    replacementReason: 'mysql_identifier_length_limit',
    allowFreshBatch: true,
  });

const REVIEWED_REJECTED_MIGRATIONS: readonly RejectedZeroStatementMigration[] = [
  REJECTED_CATALOGUE_PUBLISHER_TRIGGER,
  REJECTED_DISTRIBUTION_DELIVERY_TABLE,
  REJECTED_SERVICE_PROVIDER_REVIEW_REPORTS_TABLE,
];

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

export type RejectedMigrationRecoveryPlan = {
  recoveryVersion: 1;
  planId: string;
  planDigest: string;
  status: 'pending' | 'already-applied';
  targetFingerprintHash: string;
  canonicalHead: string;
  rejectedAttempt: AttemptEvidence;
  archivedEvidence: {
    path: string;
    checksum: string;
  };
  physicalEvidence: {
    rejectedObjectName: string;
    rejectedObjectType: 'trigger' | 'table';
    rejectedObjectAbsent: true;
  };
  review: {
    reference: string;
    actor: string;
    reason: string;
  };
  recoveryAttemptId: string;
};

export type RejectedMigrationRecoveryOptions = {
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

function replacementFailureDigest(
  rejected: RejectedZeroStatementMigration,
  archivedChecksum: string,
): string {
  return sha256({
    reason: rejected.replacementReason,
    archivedChecksum,
    rejectedObjectAbsent: true,
    replacementFilename: rejected.replacementFilename,
    replacementChecksum: rejected.replacementChecksum,
  });
}

function value(row: Record<string, unknown>, key: string): unknown {
  return row[key] ?? row[key.toUpperCase()] ?? row[key.toLowerCase()];
}

function optionalString(row: Record<string, unknown>, key: string): string | null {
  const candidate = value(row, key);
  return candidate === null || candidate === undefined ? null : String(candidate);
}

function requiredReviewValue(input: string, label: string): string {
  const normalized = input.trim();
  if (!normalized || normalized.length > 80 || !/^[a-zA-Z0-9_.:@/-]+$/.test(normalized)) {
    throw new Error(`Migration recovery refused: ${label} is missing or malformed.`);
  }
  return normalized;
}

function attemptFromRow(row: Record<string, unknown>): AttemptEvidence {
  return {
    attemptId: String(value(row, 'attempt_id') ?? ''),
    planDigest: String(value(row, 'plan_digest') ?? ''),
    targetFingerprintHash: String(value(row, 'target_fingerprint_hash') ?? ''),
    migrationFilename: String(value(row, 'migration_filename') ?? ''),
    migrationChecksum: String(value(row, 'migration_checksum') ?? ''),
    acceptedOldHead: optionalString(row, 'accepted_old_head'),
    expectedNewHead: String(value(row, 'expected_new_head') ?? ''),
    state: String(value(row, 'state') ?? ''),
    completedStatementCount: Number(value(row, 'completed_statement_count')),
    lastStatementDigest: optionalString(row, 'last_statement_digest'),
    failureClass: optionalString(row, 'failure_class'),
    failureDigest: optionalString(row, 'failure_digest'),
    applicationArtifact: optionalString(row, 'application_artifact'),
  };
}

function assertExactFailedAttempt(
  attempt: AttemptEvidence,
  authority: ResolvedDatabaseAuthority,
  rejected: RejectedZeroStatementMigration,
): void {
  if (!['failed', 'failed_replaced'].includes(attempt.state)) {
    throw new Error(
      `Migration recovery refused: attempt state ${attempt.state} is not recoverable.`,
    );
  }
  if (
    attempt.targetFingerprintHash !== authority.context.targetFingerprintHash ||
    attempt.migrationFilename !== rejected.filename ||
    attempt.migrationChecksum !== rejected.checksum ||
    (attempt.acceptedOldHead !== rejected.acceptedHead &&
      !(rejected.allowFreshBatch && attempt.acceptedOldHead === null)) ||
    attempt.expectedNewHead !== rejected.failedExpectedHead ||
    attempt.completedStatementCount !== 0 ||
    attempt.lastStatementDigest !== null ||
    attempt.failureClass !== rejected.expectedFailureClass ||
    !attempt.failureDigest
  ) {
    throw new Error(
      'Migration recovery refused: durable attempt evidence does not match the reviewed zero-statement failure.',
    );
  }
}

async function assertCanonicalHead(
  connection: AuthoritySqlConnection,
  manifest: ReturnType<typeof loadAndValidateMigrationManifest>,
  acceptedHead: string,
): Promise<void> {
  const acceptedIndex = manifest.orderedMigrations.findIndex(
    item => item.filename === acceptedHead,
  );
  if (acceptedIndex < 0) {
    throw new Error(
      'Migration recovery refused: accepted canonical head is missing from the manifest.',
    );
  }
  const rows = await queryMigrationRows(
    connection,
    `SELECT filename, checksum FROM \`${manifest.document.historyTable}\` ORDER BY numeric_version, filename`,
  );
  if (rows.length !== acceptedIndex + 1) {
    throw new Error(
      'Migration recovery refused: successful history is not at the accepted canonical head.',
    );
  }
  for (let index = 0; index < rows.length; index += 1) {
    const expected = manifest.orderedMigrations[index];
    if (
      String(value(rows[index], 'filename') ?? '') !== expected.filename ||
      String(value(rows[index], 'checksum') ?? '') !== expected.checksum
    ) {
      throw new Error(
        'Migration recovery refused: successful history differs from canonical lineage.',
      );
    }
  }
}

function resolveReviewedRejectedMigration(
  attempt: AttemptEvidence,
): RejectedZeroStatementMigration {
  const rejected = REVIEWED_REJECTED_MIGRATIONS.find(
    item =>
      item.filename === attempt.migrationFilename && item.checksum === attempt.migrationChecksum,
  );
  if (!rejected) {
    throw new Error(
      'Migration recovery refused: durable attempt evidence does not match a reviewed zero-statement failure.',
    );
  }
  return rejected;
}

function assertReviewedManifest(
  manifest: ReturnType<typeof loadAndValidateMigrationManifest>,
  rejected: RejectedZeroStatementMigration,
): void {
  if (manifest.orderedMigrations.some(item => item.filename === rejected.filename)) {
    throw new Error('Migration recovery refused: the rejected migration is still runnable.');
  }
  if (!rejected.replacementFilename || !rejected.replacementChecksum) {
    if (manifest.document.expectedHead !== rejected.acceptedHead) {
      throw new Error(
        'Migration recovery refused: the rejected migration is still runnable or the accepted head changed.',
      );
    }
    return;
  }
  const replacement = manifest.orderedMigrations.find(
    item => item.filename === rejected.replacementFilename,
  );
  if (
    !replacement ||
    replacement.checksum !== rejected.replacementChecksum ||
    replacement.parent !== rejected.acceptedHead ||
    manifest.document.expectedHead !== rejected.replacementFilename
  ) {
    throw new Error(
      'Migration recovery refused: the reviewed replacement migration is not active authority.',
    );
  }
}

async function buildRecoveryPlan(input: {
  connection: AuthoritySqlConnection;
  authority: ResolvedDatabaseAuthority;
  attemptId: string;
  approvalReference: string;
  approvalActor: string;
}): Promise<RejectedMigrationRecoveryPlan> {
  const { connection, authority } = input;
  if (
    !authority.context.local ||
    !['disposable-worktree', 'disposable-test'].includes(authority.context.targetClass) ||
    !authority.context.worktree.ownershipMatches
  ) {
    throw new Error(
      'Migration recovery refused: only the exact-owned disposable local target is eligible.',
    );
  }
  await assertRunnerConnectionTarget(connection, authority);
  const manifest = loadAndValidateMigrationManifest();

  const attemptRows = await queryMigrationRows(
    connection,
    `SELECT attempt_id, plan_digest, target_fingerprint_hash, migration_filename, migration_checksum, accepted_old_head, expected_new_head, state, completed_statement_count, last_statement_digest, failure_class, failure_digest, application_artifact FROM \`${manifest.document.attemptTable}\` WHERE attempt_id = ?`,
    [input.attemptId],
  );
  if (attemptRows.length !== 1) {
    throw new Error('Migration recovery refused: exact failed attempt was not found once.');
  }
  const attempt = attemptFromRow(attemptRows[0]);
  const rejected = resolveReviewedRejectedMigration(attempt);
  assertExactFailedAttempt(attempt, authority, rejected);
  assertReviewedManifest(manifest, rejected);
  await assertCanonicalHead(connection, manifest, rejected.acceptedHead);
  const incompleteRows = await queryMigrationRows(
    connection,
    `SELECT attempt_id FROM \`${manifest.document.attemptTable}\` WHERE state IN ('running', 'failed', 'blocked') ORDER BY started_at, attempt_id`,
  );
  if (
    (attempt.state === 'failed' &&
      (incompleteRows.length !== 1 ||
        String(value(incompleteRows[0], 'attempt_id') ?? '') !== attempt.attemptId)) ||
    (attempt.state === 'failed_replaced' && incompleteRows.length !== 0)
  ) {
    throw new Error('Migration recovery refused: another incomplete migration attempt exists.');
  }

  const physicalRows =
    rejected.rejectedObjectType === 'trigger'
      ? await queryMigrationRows(
          connection,
          'SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = DATABASE() AND trigger_name = ?',
          [rejected.rejectedObjectName],
        )
      : await queryMigrationRows(
          connection,
          'SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
          [rejected.rejectedObjectName],
        );
  if (physicalRows.length !== 0) {
    throw new Error(
      `Migration recovery refused: rejected ${rejected.rejectedObjectType} exists physically.`,
    );
  }

  const archivedAbsolutePath = resolve(authority.context.repository.root, rejected.archivedPath);
  const archivedChecksum = migrationChecksum(readFileSync(archivedAbsolutePath, 'utf8'));
  if (archivedChecksum !== rejected.checksum) {
    throw new Error(
      'Migration recovery refused: archived rejected SQL checksum differs from the attempt.',
    );
  }

  const reference = requiredReviewValue(input.approvalReference, 'approval reference');
  const actor = requiredReviewValue(input.approvalActor, 'approval actor');
  const digestMaterial = {
    recoveryVersion: 1,
    targetFingerprintHash: authority.context.targetFingerprintHash,
    manifestDigest: manifest.manifestDigest,
    canonicalHead: manifest.document.expectedHead,
    rejectedAttempt: {
      ...attempt,
      state: 'failed-or-reviewed',
    },
    archivedEvidence: { path: rejected.archivedPath, checksum: archivedChecksum },
    replacementEvidence: rejected.replacementFilename
      ? {
          filename: rejected.replacementFilename,
          checksum: rejected.replacementChecksum,
        }
      : null,
    physicalEvidence: {
      rejectedObjectName: rejected.rejectedObjectName,
      rejectedObjectType: rejected.rejectedObjectType,
      rejectedObjectAbsent: true,
    },
    review: { reference, actor, reason: rejected.replacementReason },
  };
  const planDigest = sha256(digestMaterial);
  const recoveryAttemptId = `recovery-${planDigest.slice(0, 40)}`;
  const recoveryRows = await queryMigrationRows(
    connection,
    `SELECT attempt_id, plan_digest, target_fingerprint_hash, migration_filename, migration_checksum, accepted_old_head, expected_new_head, state, completed_statement_count, last_statement_digest, failure_class, failure_digest, application_artifact FROM \`${manifest.document.attemptTable}\` WHERE attempt_id = ?`,
    [recoveryAttemptId],
  );
  const expectedArtifact = JSON.stringify({
    reference,
    actor,
    replaces: attempt.attemptId,
  });
  if (expectedArtifact.length > 255) {
    throw new Error(
      'Migration recovery refused: review evidence exceeds the durable artifact limit.',
    );
  }
  if (attempt.state === 'failed_replaced') {
    if (recoveryRows.length !== 1) {
      throw new Error(
        'Migration recovery refused: replacement state lacks matching review evidence.',
      );
    }
    const recovery = attemptFromRow(recoveryRows[0]);
    if (
      recovery.state !== 'reviewed_replacement' ||
      recovery.planDigest !== planDigest ||
      recovery.targetFingerprintHash !== authority.context.targetFingerprintHash ||
      recovery.migrationFilename !== rejected.filename ||
      recovery.migrationChecksum !== rejected.checksum ||
      recovery.acceptedOldHead !== rejected.acceptedHead ||
      recovery.expectedNewHead !== manifest.document.expectedHead ||
      recovery.completedStatementCount !== 0 ||
      recovery.lastStatementDigest !== null ||
      recovery.failureClass !== 'reviewed_zero_statement_replacement' ||
      recovery.failureDigest !== replacementFailureDigest(rejected, archivedChecksum) ||
      recovery.applicationArtifact !== expectedArtifact
    ) {
      throw new Error('Migration recovery refused: durable replacement evidence is inconsistent.');
    }
  } else if (recoveryRows.length !== 0) {
    throw new Error(
      'Migration recovery refused: replacement evidence exists before failed-attempt review.',
    );
  }

  return Object.freeze({
    recoveryVersion: 1 as const,
    planId: planDigest.slice(0, 24),
    planDigest,
    status:
      attempt.state === 'failed_replaced' ? ('already-applied' as const) : ('pending' as const),
    targetFingerprintHash: authority.context.targetFingerprintHash,
    canonicalHead: manifest.document.expectedHead,
    rejectedAttempt: Object.freeze(attempt),
    archivedEvidence: Object.freeze({ path: rejected.archivedPath, checksum: archivedChecksum }),
    physicalEvidence: Object.freeze({
      rejectedObjectName: rejected.rejectedObjectName,
      rejectedObjectType: rejected.rejectedObjectType,
      rejectedObjectAbsent: true as const,
    }),
    review: Object.freeze({ reference, actor, reason: rejected.replacementReason }),
    recoveryAttemptId,
  });
}

export async function runRejectedZeroStatementRecovery(
  options: RejectedMigrationRecoveryOptions,
): Promise<{
  mode: 'plan' | 'apply';
  plan: RejectedMigrationRecoveryPlan;
  applied: boolean;
}> {
  const expectedOperation = options.mode === 'plan' ? 'migration-plan' : 'migration-apply';
  if (options.authority.context.operation !== expectedOperation) {
    throw new Error('Migration recovery refused: resolved operation does not match recovery mode.');
  }
  assertAuthorizedDatabaseOperation(options.authority, options.authorization, [expectedOperation]);
  if (options.mode === 'apply' && !options.expectedPlanDigest) {
    throw new Error('Migration recovery refused: apply requires the exact reviewed plan digest.');
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
      attemptId: options.attemptId,
      approvalReference: options.approvalReference,
      approvalActor: options.approvalActor,
    });
    if (options.mode === 'plan') return { mode: options.mode, plan, applied: false };
    if (plan.planDigest !== options.expectedPlanDigest) {
      throw new Error(
        'Migration recovery refused: reviewed plan digest does not match current evidence.',
      );
    }
    if (plan.status === 'already-applied') {
      return { mode: options.mode, plan, applied: false };
    }

    const rejected = resolveReviewedRejectedMigration(plan.rejectedAttempt);
    const reviewArtifact = JSON.stringify({
      reference: plan.review.reference,
      actor: plan.review.actor,
      replaces: plan.rejectedAttempt.attemptId,
    });
    const reviewFailureDigest = replacementFailureDigest(rejected, plan.archivedEvidence.checksum);
    try {
      // Transaction-control statements are portable SQL, but MySQL does not
      // accept START TRANSACTION through its prepared-statement protocol.
      await connection.query('START TRANSACTION');
      await connection.execute(
        `UPDATE \`${manifest.document.attemptTable}\` SET state = 'failed_replaced' WHERE attempt_id = ? AND state = 'failed' AND completed_statement_count = 0 AND last_statement_digest IS NULL AND failure_class = ?`,
        [plan.rejectedAttempt.attemptId, rejected.expectedFailureClass],
      );
      const changedRows = await queryMigrationRows(
        connection,
        `SELECT state, completed_statement_count, last_statement_digest, failure_class, failure_digest FROM \`${manifest.document.attemptTable}\` WHERE attempt_id = ?`,
        [plan.rejectedAttempt.attemptId],
      );
      if (
        changedRows.length !== 1 ||
        String(value(changedRows[0], 'state') ?? '') !== 'failed_replaced' ||
        Number(value(changedRows[0], 'completed_statement_count')) !== 0 ||
        optionalString(changedRows[0], 'last_statement_digest') !== null ||
        optionalString(changedRows[0], 'failure_class') !== plan.rejectedAttempt.failureClass ||
        optionalString(changedRows[0], 'failure_digest') !== plan.rejectedAttempt.failureDigest
      ) {
        throw new Error(
          'Migration recovery refused: failed-attempt evidence did not transition exactly.',
        );
      }
      await connection.execute(
        `INSERT INTO \`${manifest.document.attemptTable}\` (attempt_id, plan_digest, target_fingerprint_hash, migration_filename, migration_checksum, accepted_old_head, expected_new_head, state, completed_statement_count, last_statement_digest, failure_class, failure_digest, application_artifact, correlation_id, lock_owner_connection_id, finished_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'reviewed_replacement', 0, NULL, 'reviewed_zero_statement_replacement', ?, ?, ?, CONNECTION_ID(), CURRENT_TIMESTAMP(3))`,
        [
          plan.recoveryAttemptId,
          plan.planDigest,
          plan.targetFingerprintHash,
          plan.rejectedAttempt.migrationFilename,
          plan.rejectedAttempt.migrationChecksum,
          rejected.acceptedHead,
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

    const appliedPlan = await buildRecoveryPlan({
      connection,
      authority: options.authority,
      attemptId: options.attemptId,
      approvalReference: options.approvalReference,
      approvalActor: options.approvalActor,
    });
    if (appliedPlan.planDigest !== plan.planDigest || appliedPlan.status !== 'already-applied') {
      throw new Error(
        'Migration recovery failed closed: durable replacement evidence was not proven.',
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
