import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { authorizeDatabaseOperation } from '../../_core/databaseAuthority/authorization';
import type { AuthoritySqlConnection } from '../../_core/databaseAuthority/connectionAuthority';
import { resolveDatabaseAuthority } from '../../_core/databaseAuthority/context';
import { deriveGitWorktreeIdentity } from '../../_core/databaseAuthority/worktreeIdentity';
import { loadAndValidateMigrationManifest } from '../migrationManifest';
import {
  REJECTED_CATALOGUE_PUBLISHER_TRIGGER,
  runRejectedZeroStatementRecovery,
} from '../recoverRejectedZeroStatementMigration';

vi.mock('../migrationManifest', async importOriginal => {
  const actual = await importOriginal<typeof import('../migrationManifest')>();
  const current = actual.loadAndValidateMigrationManifest();
  const acceptedHead = '0018_distribution_access_publisher_authority.sql';
  const acceptedIndex = current.orderedMigrations.findIndex(
    item => item.filename === acceptedHead,
  );
  const expectedHead = current.orderedMigrations[acceptedIndex];
  if (acceptedIndex < 0 || !expectedHead) {
    throw new Error(`Historical recovery fixture could not find ${acceptedHead}.`);
  }
  const orderedMigrations = current.orderedMigrations.slice(0, acceptedIndex + 1);
  const document = {
    ...current.document,
    expectedHead: acceptedHead,
    migrations: current.document.migrations.slice(0, acceptedIndex + 1),
  };

  return {
    ...actual,
    loadAndValidateMigrationManifest: () => ({
      ...current,
      document,
      orderedMigrations,
      expectedHead,
    }),
  };
});

const roots: string[] = [];

function fixtureIdentity() {
  const root = mkdtempSync(join(tmpdir(), 'listify-recovery-worktree-'));
  roots.push(root);
  const common = join(root, '.git-common');
  mkdirSync(common);
  return deriveGitWorktreeIdentity({
    repositoryRoot: process.cwd(),
    gitCommonDirectory: common,
    worktreePath: process.cwd(),
    branch: 'feat/recovery-test',
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    registered: true,
    clean: false,
  });
}

function authorityFor(mode: 'plan' | 'apply', identity = fixtureIdentity()) {
  const operation = mode === 'plan' ? 'migration-plan' : 'migration-apply';
  const authority = resolveDatabaseAuthority({
    operation,
    cwd: process.cwd(),
    gitIdentity: identity,
    explicitDatabaseUrl: `mysql://listify_app:private@127.0.0.1:3307/${identity.expectedWorktreeDatabase}`,
    processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
  });
  return {
    authority,
    authorization: authorizeDatabaseOperation(authority, { root: process.cwd() }),
  };
}

type Attempt = {
  attempt_id: string;
  plan_digest: string;
  target_fingerprint_hash: string;
  migration_filename: string;
  migration_checksum: string;
  accepted_old_head: string;
  expected_new_head: string;
  state: string;
  completed_statement_count: number;
  last_statement_digest: string | null;
  failure_class: string | null;
  failure_digest: string | null;
  application_artifact: string | null;
};

class RecoveryConnection implements AuthoritySqlConnection {
  readonly attempts = new Map<string, Attempt>();
  readonly history = loadAndValidateMigrationManifest().orderedMigrations.map(item => ({
    filename: item.filename,
    checksum: item.checksum,
  }));
  triggerExists = false;
  ended = false;
  mutationCount = 0;

  constructor(
    readonly databaseName: string,
    targetFingerprintHash: string,
    readonly attemptId = 'reviewed-attempt-0019',
  ) {
    this.attempts.set(attemptId, {
      attempt_id: attemptId,
      plan_digest: 'a'.repeat(64),
      target_fingerprint_hash: targetFingerprintHash,
      migration_filename: REJECTED_CATALOGUE_PUBLISHER_TRIGGER.filename,
      migration_checksum: REJECTED_CATALOGUE_PUBLISHER_TRIGGER.checksum,
      accepted_old_head: REJECTED_CATALOGUE_PUBLISHER_TRIGGER.acceptedHead,
      expected_new_head: REJECTED_CATALOGUE_PUBLISHER_TRIGGER.failedExpectedHead,
      state: 'failed',
      completed_statement_count: 0,
      last_statement_digest: null,
      failure_class: REJECTED_CATALOGUE_PUBLISHER_TRIGGER.expectedFailureClass,
      failure_digest: 'b'.repeat(64),
      application_artifact: 'slice-1-candidate',
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
    if (statement.includes('information_schema.triggers')) {
      return [this.triggerExists ? [{ trigger_name: values[0] }] : []];
    }
    if (statement.includes('GET_LOCK')) return [[{ lock_status: 1 }]];
    if (statement.includes('CONNECTION_ID()') && statement.includes('IS_USED_LOCK')) {
      return [[{ connection_id: '41', lock_owner_connection_id: '41' }]];
    }
    if (statement.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
    if (
      statement.startsWith('START TRANSACTION') ||
      statement === 'COMMIT' ||
      statement === 'ROLLBACK'
    ) {
      return {};
    }
    if (statement.startsWith('UPDATE `sql_migration_attempts` SET state')) {
      const attempt = this.attempts.get(String(values[0]));
      if (attempt?.state === 'failed' && attempt.failure_class === values[1]) {
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
    throw new Error(`Unexpected recovery SQL: ${statement}`);
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

const review = {
  attemptId: 'reviewed-attempt-0019',
  approvalReference: 'S1-revised-final-correction-2026-08-14',
  approvalActor: 'Edward',
};

describe('reviewed zero-statement migration recovery', () => {
  it('plans from exact durable failure and archived checksum without mutation', async () => {
    const { authority, authorization } = authorityFor('plan');
    const connection = new RecoveryConnection(
      authority.context.databaseName,
      authority.context.targetFingerprintHash,
    );
    const result = await runRejectedZeroStatementRecovery({
      mode: 'plan',
      authority,
      authorization,
      ...review,
      connectionFactory: async () => connection,
    });

    expect(result.plan).toMatchObject({
      status: 'pending',
      canonicalHead: REJECTED_CATALOGUE_PUBLISHER_TRIGGER.acceptedHead,
      rejectedAttempt: {
        completedStatementCount: 0,
        failureClass: REJECTED_CATALOGUE_PUBLISHER_TRIGGER.expectedFailureClass,
      },
      physicalEvidence: { rejectedObjectAbsent: true },
    });
    expect(result.applied).toBe(false);
    expect(connection.mutationCount).toBe(0);
    expect(connection.ended).toBe(true);
  });

  it('binds apply to the exact plan and retains failed plus replacement evidence', async () => {
    const identity = fixtureIdentity();
    const planAuthority = authorityFor('plan', identity);
    const planConnection = new RecoveryConnection(
      planAuthority.authority.context.databaseName,
      planAuthority.authority.context.targetFingerprintHash,
    );
    const planned = await runRejectedZeroStatementRecovery({
      mode: 'plan',
      ...planAuthority,
      ...review,
      connectionFactory: async () => planConnection,
    });
    const applyAuthority = authorityFor('apply', identity);
    const applyConnection = new RecoveryConnection(
      applyAuthority.authority.context.databaseName,
      applyAuthority.authority.context.targetFingerprintHash,
    );
    const applied = await runRejectedZeroStatementRecovery({
      mode: 'apply',
      ...applyAuthority,
      ...review,
      expectedPlanDigest: planned.plan.planDigest,
      connectionFactory: async () => applyConnection,
    });
    expect(applied.applied).toBe(true);
    expect(applied.plan.status).toBe('already-applied');
    expect(applyConnection.attempts.get(review.attemptId)).toMatchObject({
      state: 'failed_replaced',
      completed_statement_count: 0,
      failure_class: REJECTED_CATALOGUE_PUBLISHER_TRIGGER.expectedFailureClass,
    });
    expect(applyConnection.attempts.get(applied.plan.recoveryAttemptId)).toMatchObject({
      state: 'reviewed_replacement',
      plan_digest: applied.plan.planDigest,
      completed_statement_count: 0,
    });
  });

  it('fails closed for statement progress, a physical trigger, or the wrong plan digest', async () => {
    const plannedAuthority = authorityFor('plan');
    const progressed = new RecoveryConnection(
      plannedAuthority.authority.context.databaseName,
      plannedAuthority.authority.context.targetFingerprintHash,
    );
    progressed.attempts.get(review.attemptId)!.completed_statement_count = 1;
    await expect(
      runRejectedZeroStatementRecovery({
        mode: 'plan',
        ...plannedAuthority,
        ...review,
        connectionFactory: async () => progressed,
      }),
    ).rejects.toThrow('does not match the reviewed zero-statement failure');

    const trigger = new RecoveryConnection(
      plannedAuthority.authority.context.databaseName,
      plannedAuthority.authority.context.targetFingerprintHash,
    );
    trigger.triggerExists = true;
    await expect(
      runRejectedZeroStatementRecovery({
        mode: 'plan',
        ...plannedAuthority,
        ...review,
        connectionFactory: async () => trigger,
      }),
    ).rejects.toThrow('rejected trigger exists physically');

    const applyAuthority = authorityFor('apply');
    const wrongDigest = new RecoveryConnection(
      applyAuthority.authority.context.databaseName,
      applyAuthority.authority.context.targetFingerprintHash,
    );
    await expect(
      runRejectedZeroStatementRecovery({
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
