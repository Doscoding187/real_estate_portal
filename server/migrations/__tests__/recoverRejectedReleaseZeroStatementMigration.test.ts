import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import {
  authorizeDatabaseOperation,
  expectedDatabaseAcknowledgement,
} from '../../_core/databaseAuthority/authorization';
import type { AuthoritySqlConnection } from '../../_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../_core/databaseAuthority/context';
import { deriveGitWorktreeIdentity } from '../../_core/databaseAuthority/worktreeIdentity';
import { loadAndValidateMigrationManifest } from '../migrationManifest';
import {
  REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY,
  runRejectedReleaseZeroStatementRecovery,
} from '../recoverRejectedReleaseZeroStatementMigration';

const roots: string[] = [];
const targetUrl =
  'mysql://release-user:private@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/listify_property_sa';
const attemptId = 'db69c20735ab9ad3865cc9a7-0001';
const review = {
  attemptId,
  approvalReference: 'DBX-TIDB-0001-REPLACEMENT-2026-09-04-Edward',
  approvalActor: 'Edward',
};

function identity() {
  const root = mkdtempSync(join(tmpdir(), 'listify-release-recovery-'));
  roots.push(root);
  const common = join(root, '.git-common');
  mkdirSync(common);
  return deriveGitWorktreeIdentity({
    repositoryRoot: process.cwd(),
    gitCommonDirectory: common,
    worktreePath: process.cwd(),
    branch: 'fix/database-tidb-migration-lineage',
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    registered: true,
    clean: false,
  });
}

function authorityFor(
  mode: 'plan' | 'apply',
  gitIdentity = identity(),
  approvalReference = review.approvalReference,
) {
  const operation = mode === 'plan' ? 'release-plan' : 'release-apply';
  const authority = resolveDatabaseAuthority({
    operation,
    cwd: process.cwd(),
    gitIdentity,
    explicitDatabaseUrl: targetUrl,
    credentialClass: mode === 'plan' ? 'read-only' : 'migration',
    processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
  });
  const approval = {
    reference: approvalReference,
    actor: review.approvalActor,
    operation: authority.context.operation,
    targetFingerprintHash: authority.context.targetFingerprintHash,
  };
  const authorization = authorizeDatabaseOperation(authority, {
    root: process.cwd(),
    approval,
    acknowledgement:
      mode === 'apply' ? expectedDatabaseAcknowledgement(authority.context) : undefined,
  });
  return { authority, authorization, gitIdentity };
}

type Attempt = {
  attempt_id: string;
  plan_digest: string;
  target_fingerprint_hash: string;
  migration_filename: string;
  migration_checksum: string;
  accepted_old_head: string | null;
  expected_new_head: string;
  state: string;
  completed_statement_count: number;
  last_statement_digest: string | null;
  failure_class: string | null;
  failure_digest: string | null;
  application_artifact: string | null;
};

class ReleaseRecoveryConnection implements AuthoritySqlConnection {
  readonly attempts = new Map<string, Attempt>();
  readonly history = [loadAndValidateMigrationManifest().orderedMigrations[0]].map(item => ({
    filename: item.filename,
    checksum: item.checksum,
  }));
  readonly columns = new Set<string>();
  uniqueIndexPresent = false;
  tablePresent = true;
  mutationCount = 0;
  ended = false;

  constructor(
    readonly databaseName: string,
    targetFingerprintHash: string,
  ) {
    this.attempts.set(attemptId, {
      attempt_id: attemptId,
      plan_digest: 'db69c20735ab9ad3865cc9a7831b601a0a801522cab34af99e70479815581653',
      target_fingerprint_hash: targetFingerprintHash,
      migration_filename: REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.filename,
      migration_checksum: REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.checksum,
      accepted_old_head: null,
      expected_new_head: REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.failedExpectedHead,
      state: 'failed',
      completed_statement_count: 0,
      last_statement_digest: null,
      failure_class: REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.expectedFailureClass,
      failure_digest: 'b'.repeat(64),
      application_artifact: 'railway-commit',
    });
  }

  async execute(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    if (statement.startsWith('SELECT DATABASE()')) {
      return [[{ database_name: this.databaseName }]];
    }
    if (statement.startsWith('SELECT filename, checksum')) return [this.history];
    if (statement.startsWith('SELECT attempt_id, plan_digest')) {
      const attempt = this.attempts.get(String(values[0]));
      return [attempt ? [attempt] : []];
    }
    if (statement.startsWith('SELECT attempt_id FROM')) {
      return [
        [...this.attempts.values()]
          .filter(item => ['running', 'failed', 'blocked'].includes(item.state))
          .map(item => ({ attempt_id: item.attempt_id })),
      ];
    }
    if (statement.includes('information_schema.tables')) {
      return [this.tablePresent ? [{ table_name: 'leads' }] : []];
    }
    if (statement.includes('information_schema.columns')) {
      return [[...this.columns].map(column_name => ({ column_name }))];
    }
    if (statement.includes('information_schema.statistics')) {
      return [this.uniqueIndexPresent ? [{ index_name: 'uq_leads_capture_request' }] : []];
    }
    if (statement.includes('GET_LOCK')) return [[{ lock_status: 1 }]];
    if (statement.includes('CONNECTION_ID()') && statement.includes('IS_USED_LOCK')) {
      return [[{ connection_id: '41', lock_owner_connection_id: '41' }]];
    }
    if (statement.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
    if (statement === 'START TRANSACTION' || statement === 'COMMIT' || statement === 'ROLLBACK') {
      return {};
    }
    if (statement.startsWith('UPDATE `sql_migration_attempts` SET state')) {
      const attempt = this.attempts.get(String(values[0]));
      if (
        attempt &&
        attempt.state === 'failed' &&
        attempt.target_fingerprint_hash === values[1] &&
        attempt.migration_filename === values[2] &&
        attempt.migration_checksum === values[3] &&
        attempt.expected_new_head === values[4] &&
        attempt.failure_class === values[5] &&
        attempt.failure_digest === values[6]
      ) {
        attempt.state = 'failed_replaced';
        this.mutationCount += 1;
      }
      return {};
    }
    if (statement.startsWith('SELECT state, completed_statement_count')) {
      const attempt = this.attempts.get(String(values[0]));
      return [attempt ? [attempt] : []];
    }
    if (statement.startsWith('INSERT INTO `sql_migration_attempts`')) {
      this.attempts.set(String(values[0]), {
        attempt_id: String(values[0]),
        plan_digest: String(values[1]),
        target_fingerprint_hash: String(values[2]),
        migration_filename: String(values[3]),
        migration_checksum: String(values[4]),
        accepted_old_head: String(values[5]),
        expected_new_head: String(values[6]),
        state: 'reviewed_replacement',
        completed_statement_count: 0,
        last_statement_digest: null,
        failure_class: 'reviewed_zero_statement_replacement',
        failure_digest: String(values[7]),
        application_artifact: String(values[8]),
      });
      this.mutationCount += 1;
      return {};
    }
    throw new Error(`Unexpected release recovery SQL: ${statement}`);
  }

  query(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    return this.execute(statement, values);
  }

  async end(): Promise<void> {
    this.ended = true;
  }
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('protected release zero-statement migration recovery', () => {
  it('plans only from the exact production attempt and proves physical absence', async () => {
    const { authority, authorization } = authorityFor('plan');
    const connection = new ReleaseRecoveryConnection(
      authority.context.databaseName,
      authority.context.targetFingerprintHash,
    );
    const result = await runRejectedReleaseZeroStatementRecovery({
      mode: 'plan',
      authority,
      authorization,
      ...review,
      connectionFactory: async () => connection,
    });

    expect(result.plan).toMatchObject({
      status: 'pending',
      acceptedSuccessfulHead: '0000_canonical_launch_baseline.sql',
      canonicalHead: '0065_auth_verification_token_cleanup.sql',
      rejectedAttempt: {
        acceptedOldHead: null,
        completedStatementCount: 0,
        failureClass: REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.expectedFailureClass,
      },
      physicalEvidence: {
        tableName: 'leads',
        tablePresent: true,
        uniqueIndexAbsent: true,
      },
    });
    expect(result.applied).toBe(false);
    expect(connection.mutationCount).toBe(0);
    expect(connection.ended).toBe(true);
  });

  it('binds apply to the plan digest and retains the original plus review evidence', async () => {
    const gitIdentity = identity();
    const planAuthority = authorityFor('plan', gitIdentity);
    const planConnection = new ReleaseRecoveryConnection(
      planAuthority.authority.context.databaseName,
      planAuthority.authority.context.targetFingerprintHash,
    );
    const planned = await runRejectedReleaseZeroStatementRecovery({
      mode: 'plan',
      ...planAuthority,
      ...review,
      connectionFactory: async () => planConnection,
    });
    const applyAuthority = authorityFor('apply', gitIdentity);
    const applyConnection = new ReleaseRecoveryConnection(
      applyAuthority.authority.context.databaseName,
      applyAuthority.authority.context.targetFingerprintHash,
    );
    const applied = await runRejectedReleaseZeroStatementRecovery({
      mode: 'apply',
      ...applyAuthority,
      ...review,
      expectedPlanDigest: planned.plan.planDigest,
      connectionFactory: async () => applyConnection,
    });

    expect(applied.applied).toBe(true);
    expect(applied.plan.status).toBe('already-applied');
    expect(applyConnection.attempts.get(attemptId)).toMatchObject({
      state: 'failed_replaced',
      completed_statement_count: 0,
      failure_class: REJECTED_PUBLIC_SEARCH_TO_LEAD_RELIABILITY.expectedFailureClass,
    });
    expect(applyConnection.attempts.get(applied.plan.recoveryAttemptId)).toMatchObject({
      state: 'reviewed_replacement',
      plan_digest: applied.plan.planDigest,
      completed_statement_count: 0,
    });
    expect(applyConnection.mutationCount).toBe(2);
  });

  it('fails closed when the rejected physical shape is already present or the digest changes', async () => {
    const planAuthority = authorityFor('plan');
    const present = new ReleaseRecoveryConnection(
      planAuthority.authority.context.databaseName,
      planAuthority.authority.context.targetFingerprintHash,
    );
    present.columns.add('capture_request_id');
    await expect(
      runRejectedReleaseZeroStatementRecovery({
        mode: 'plan',
        ...planAuthority,
        ...review,
        connectionFactory: async () => present,
      }),
    ).rejects.toThrow('columns already exist physically');

    const mismatchedReview = new ReleaseRecoveryConnection(
      planAuthority.authority.context.databaseName,
      planAuthority.authority.context.targetFingerprintHash,
    );
    await expect(
      runRejectedReleaseZeroStatementRecovery({
        mode: 'plan',
        ...planAuthority,
        ...review,
        approvalActor: 'Unrelated-actor',
        connectionFactory: async () => mismatchedReview,
      }),
    ).rejects.toThrow('review evidence must match the protected target approval');
    expect(mismatchedReview.mutationCount).toBe(0);

    const unrelatedProtectedApproval = authorityFor('plan', identity(), 'UNRELATED-APPROVAL');
    const unrelatedProtectedConnection = new ReleaseRecoveryConnection(
      unrelatedProtectedApproval.authority.context.databaseName,
      unrelatedProtectedApproval.authority.context.targetFingerprintHash,
    );
    await expect(
      runRejectedReleaseZeroStatementRecovery({
        mode: 'plan',
        ...unrelatedProtectedApproval,
        ...review,
        approvalReference: 'UNRELATED-APPROVAL',
        connectionFactory: async () => unrelatedProtectedConnection,
      }),
    ).rejects.toThrow('not the exact reviewed replacement approval');
    expect(unrelatedProtectedConnection.mutationCount).toBe(0);

    const applyAuthority = authorityFor('apply');
    const wrongDigest = new ReleaseRecoveryConnection(
      applyAuthority.authority.context.databaseName,
      applyAuthority.authority.context.targetFingerprintHash,
    );
    await expect(
      runRejectedReleaseZeroStatementRecovery({
        mode: 'apply',
        ...applyAuthority,
        ...review,
        expectedPlanDigest: 'f'.repeat(64),
        connectionFactory: async () => wrongDigest,
      }),
    ).rejects.toThrow('reviewed plan digest does not match');
    expect(wrongDigest.mutationCount).toBe(0);
  });
});
