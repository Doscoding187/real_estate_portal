import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  runTidbCheckConstraintConvergence,
  TIDB_CANONICAL_CHECK_CONSTRAINTS,
  TIDB_CHECK_CONSTRAINT_CONVERGENCE,
} from '../recoverTidbCheckConstraintConvergence';

const roots: string[] = [];
const targetUrl =
  'mysql://release-user:private@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/listify_property_sa';
const review = {
  approvalReference: TIDB_CHECK_CONSTRAINT_CONVERGENCE.approvalReference,
  approvalActor: 'Edward',
};

function identity() {
  const root = mkdtempSync(join(tmpdir(), 'listify-tidb-check-convergence-'));
  roots.push(root);
  const common = join(root, '.git-common');
  mkdirSync(common);
  return deriveGitWorktreeIdentity({
    repositoryRoot: process.cwd(),
    gitCommonDirectory: common,
    worktreePath: process.cwd(),
    branch: 'fix/tidb-check-constraint-convergence',
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    registered: true,
    clean: false,
  });
}

function authorityFor(mode: 'plan' | 'apply', gitIdentity = identity()) {
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
    reference: review.approvalReference,
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

type RecoveryAttempt = {
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

function key(tableName: string, constraintName: string): string {
  return `${tableName}\0${constraintName}`;
}

class TidbCheckConstraintConnection implements AuthoritySqlConnection {
  readonly attempts = new Map<string, RecoveryAttempt>();
  readonly history = loadAndValidateMigrationManifest().orderedMigrations.map(item => ({
    filename: item.filename,
    checksum: item.checksum,
  }));
  readonly tables = new Set(TIDB_CANONICAL_CHECK_CONSTRAINTS.map(item => item.tableName));
  readonly constraints = new Map<
    string,
    { table_name: string; constraint_name: string; check_clause: string }
  >();
  readonly violations = new Map<string, number>();
  checkConstraintsEnabled = false;
  setGlobalCount = 0;
  alterCount = 0;
  ended = false;

  constructor(readonly databaseName: string) {}

  addConstraint(definition = TIDB_CANONICAL_CHECK_CONSTRAINTS[0]): void {
    this.constraints.set(key(definition.tableName, definition.constraintName), {
      table_name: definition.tableName,
      constraint_name: definition.constraintName,
      check_clause: definition.expression,
    });
  }

  async execute(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    if (statement.startsWith('SELECT DATABASE()')) {
      return [[{ database_name: this.databaseName }]];
    }
    if (statement.startsWith('SELECT filename, checksum')) return [this.history];
    if (statement.startsWith('SHOW GLOBAL VARIABLES LIKE')) {
      return [
        [
          {
            Variable_name: 'tidb_enable_check_constraint',
            Value: this.checkConstraintsEnabled ? 'ON' : 'OFF',
          },
        ],
      ];
    }
    if (statement.includes('information_schema.tables')) {
      const requested = new Set(values.map(value => String(value)));
      return [
        [...this.tables]
          .filter(tableName => requested.size === 0 || requested.has(tableName))
          .map(table_name => ({ table_name })),
      ];
    }
    if (statement.includes('information_schema.TIDB_CHECK_CONSTRAINTS')) {
      const requested = new Set(values.map(value => String(value)));
      return [
        [...this.constraints.values()].filter(
          row => requested.size === 0 || requested.has(row.constraint_name),
        ),
      ];
    }
    if (statement.startsWith('SELECT COUNT(*) AS violation_count FROM')) {
      const definition = TIDB_CANONICAL_CHECK_CONSTRAINTS.find(
        candidate =>
          statement.includes(`FROM \`${candidate.tableName}\``) &&
          statement.includes(candidate.expression),
      );
      if (!definition) throw new Error(`Unexpected CHECK preflight SQL: ${statement}`);
      return [
        [
          {
            violation_count:
              this.violations.get(key(definition.tableName, definition.constraintName)) ?? 0,
          },
        ],
      ];
    }
    if (statement.startsWith('SELECT attempt_id, plan_digest')) {
      const migrationFilename = String(values[0]);
      return [
        [...this.attempts.values()].filter(
          attempt => attempt.migration_filename === migrationFilename,
        ),
      ];
    }
    if (statement.startsWith('SELECT attempt_id, migration_filename, state')) {
      return [
        [...this.attempts.values()]
          .filter(attempt => ['running', 'failed', 'blocked'].includes(attempt.state))
          .map(attempt => ({
            attempt_id: attempt.attempt_id,
            migration_filename: attempt.migration_filename,
            state: attempt.state,
          })),
      ];
    }
    if (statement.startsWith('SELECT GET_LOCK')) return [[{ lock_status: 1 }]];
    if (statement.includes('CONNECTION_ID()') && statement.includes('IS_USED_LOCK')) {
      return [[{ connection_id: '81', lock_owner_connection_id: '81' }]];
    }
    if (statement.startsWith('SELECT RELEASE_LOCK')) return [[{ released: 1 }]];
    if (statement.startsWith('INSERT INTO `sql_migration_attempts`')) {
      this.attempts.set(String(values[0]), {
        attempt_id: String(values[0]),
        plan_digest: String(values[1]),
        target_fingerprint_hash: String(values[2]),
        migration_filename: String(values[3]),
        migration_checksum: String(values[4]),
        accepted_old_head: values[5] === null ? null : String(values[5]),
        expected_new_head: String(values[6]),
        state: 'running',
        completed_statement_count: 0,
        last_statement_digest: null,
        failure_class: null,
        failure_digest: null,
        application_artifact: String(values[7]),
      });
      return {};
    }
    if (statement.startsWith('UPDATE `sql_migration_attempts` SET completed_statement_count')) {
      const attempt = this.attempts.get(String(values[2]));
      if (!attempt) throw new Error('Recovery attempt was not created.');
      attempt.completed_statement_count = Number(values[0]);
      attempt.last_statement_digest = String(values[1]);
      return {};
    }
    if (statement.startsWith("UPDATE `sql_migration_attempts` SET state = 'succeeded'")) {
      const attempt = this.attempts.get(String(values[0]));
      if (!attempt) throw new Error('Recovery attempt was not created.');
      attempt.state = 'succeeded';
      return {};
    }
    if (statement.startsWith("UPDATE `sql_migration_attempts` SET state = 'failed'")) {
      const attempt = this.attempts.get(String(values[2]));
      if (attempt && attempt.state === 'running') {
        attempt.state = 'failed';
        attempt.failure_class = String(values[0]);
        attempt.failure_digest = String(values[1]);
      }
      return {};
    }
    throw new Error(`Unexpected TiDB convergence SQL: ${statement}`);
  }

  async query(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    if (statement === 'SET GLOBAL tidb_enable_check_constraint = ON') {
      this.checkConstraintsEnabled = true;
      this.setGlobalCount += 1;
      return {};
    }
    if (statement.startsWith('ALTER TABLE')) {
      const definition = TIDB_CANONICAL_CHECK_CONSTRAINTS.find(candidate =>
        statement.includes(`\`${candidate.constraintName}\``),
      );
      if (!definition || !this.checkConstraintsEnabled) {
        throw new Error(`Unexpected TiDB convergence DDL: ${statement}`);
      }
      this.constraints.set(key(definition.tableName, definition.constraintName), {
        table_name: definition.tableName,
        constraint_name: definition.constraintName,
        check_clause: definition.expression,
      });
      this.alterCount += 1;
      return {};
    }
    return this.execute(statement, values);
  }

  async end(): Promise<void> {
    this.ended = true;
  }
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('protected TiDB CHECK-constraint convergence', () => {
  it('plans the exact absent canonical checks without mutation', async () => {
    const context = authorityFor('plan');
    const connection = new TidbCheckConstraintConnection(context.authority.context.databaseName);

    const result = await runTidbCheckConstraintConvergence({
      mode: 'plan',
      ...context,
      ...review,
      connectionFactory: async () => connection,
    });

    expect(result).toMatchObject({
      mode: 'plan',
      applied: false,
      plan: {
        status: 'pending',
        capability: { variable: 'tidb_enable_check_constraint', value: 'OFF', enabled: false },
        violatingRowCount: 0,
      },
    });
    expect(result.plan.constraints).toHaveLength(TIDB_CANONICAL_CHECK_CONSTRAINTS.length);
    expect(result.plan.constraints.every(item => item.state === 'missing')).toBe(true);
    expect(connection.setGlobalCount).toBe(0);
    expect(connection.alterCount).toBe(0);
    expect(connection.attempts.size).toBe(0);
    expect(connection.ended).toBe(true);
  });

  it('binds apply to the reviewed plan, enables the capability, and records durable completion', async () => {
    const gitIdentity = identity();
    const plannedContext = authorityFor('plan', gitIdentity);
    const plannedConnection = new TidbCheckConstraintConnection(
      plannedContext.authority.context.databaseName,
    );
    const planned = await runTidbCheckConstraintConvergence({
      mode: 'plan',
      ...plannedContext,
      ...review,
      connectionFactory: async () => plannedConnection,
    });
    const applyContext = authorityFor('apply', gitIdentity);
    const applyConnection = new TidbCheckConstraintConnection(
      applyContext.authority.context.databaseName,
    );

    const applied = await runTidbCheckConstraintConvergence({
      mode: 'apply',
      ...applyContext,
      ...review,
      expectedPlanDigest: planned.plan.planDigest,
      connectionFactory: async () => applyConnection,
    });

    expect(applied).toMatchObject({
      mode: 'apply',
      applied: true,
      plan: { status: 'already-applied' },
    });
    expect(applyConnection.checkConstraintsEnabled).toBe(true);
    expect(applyConnection.setGlobalCount).toBe(1);
    expect(applyConnection.alterCount).toBe(TIDB_CANONICAL_CHECK_CONSTRAINTS.length);
    expect(applyConnection.constraints.size).toBe(TIDB_CANONICAL_CHECK_CONSTRAINTS.length);
    expect(applyConnection.attempts.get(applied.plan.recoveryAttemptId)).toMatchObject({
      state: 'succeeded',
      migration_filename: TIDB_CHECK_CONSTRAINT_CONVERGENCE.recoveryFilename,
      completed_statement_count: TIDB_CANONICAL_CHECK_CONSTRAINTS.length,
    });
    expect(applyConnection.ended).toBe(true);
  });

  it('refuses application when the data would violate a missing canonical check', async () => {
    const gitIdentity = identity();
    const plannedContext = authorityFor('plan', gitIdentity);
    const plannedConnection = new TidbCheckConstraintConnection(
      plannedContext.authority.context.databaseName,
    );
    const first = TIDB_CANONICAL_CHECK_CONSTRAINTS[0];
    plannedConnection.violations.set(key(first.tableName, first.constraintName), 1);
    const planned = await runTidbCheckConstraintConvergence({
      mode: 'plan',
      ...plannedContext,
      ...review,
      connectionFactory: async () => plannedConnection,
    });
    expect(planned.plan.violatingRowCount).toBe(1);

    const applyContext = authorityFor('apply', gitIdentity);
    const applyConnection = new TidbCheckConstraintConnection(
      applyContext.authority.context.databaseName,
    );
    applyConnection.violations.set(key(first.tableName, first.constraintName), 1);
    await expect(
      runTidbCheckConstraintConvergence({
        mode: 'apply',
        ...applyContext,
        ...review,
        expectedPlanDigest: planned.plan.planDigest,
        connectionFactory: async () => applyConnection,
      }),
    ).rejects.toThrow('1 existing row(s) violate the canonical checks');
    expect(applyConnection.checkConstraintsEnabled).toBe(false);
    expect(applyConnection.setGlobalCount).toBe(0);
    expect(applyConnection.alterCount).toBe(0);
    expect(applyConnection.attempts.size).toBe(0);
  });

  it('fails closed when a named check is already present without durable convergence evidence', async () => {
    const context = authorityFor('plan');
    const connection = new TidbCheckConstraintConnection(context.authority.context.databaseName);
    connection.addConstraint();

    await expect(
      runTidbCheckConstraintConvergence({
        mode: 'plan',
        ...context,
        ...review,
        connectionFactory: async () => connection,
      }),
    ).rejects.toThrow('partial or complete convergence state exists without durable evidence');
    expect(connection.setGlobalCount).toBe(0);
    expect(connection.alterCount).toBe(0);
  });

  it('fails closed when a canonical check name is attached to the wrong table', async () => {
    const context = authorityFor('plan');
    const connection = new TidbCheckConstraintConnection(context.authority.context.databaseName);
    const definition = TIDB_CANONICAL_CHECK_CONSTRAINTS[0];
    connection.constraints.set(key('unexpected_table', definition.constraintName), {
      table_name: 'unexpected_table',
      constraint_name: definition.constraintName,
      check_clause: definition.expression,
    });

    await expect(
      runTidbCheckConstraintConvergence({
        mode: 'plan',
        ...context,
        ...review,
        connectionFactory: async () => connection,
      }),
    ).rejects.toThrow(
      `existing ${definition.constraintName} belongs to unexpected_table, expected ${definition.tableName}`,
    );
  });

  it('does not accept durable success evidence when a later violation is observed', async () => {
    const gitIdentity = identity();
    const plannedContext = authorityFor('plan', gitIdentity);
    const plannedConnection = new TidbCheckConstraintConnection(
      plannedContext.authority.context.databaseName,
    );
    const planned = await runTidbCheckConstraintConvergence({
      mode: 'plan',
      ...plannedContext,
      ...review,
      connectionFactory: async () => plannedConnection,
    });
    const applyContext = authorityFor('apply', gitIdentity);
    const connection = new TidbCheckConstraintConnection(
      applyContext.authority.context.databaseName,
    );
    await runTidbCheckConstraintConvergence({
      mode: 'apply',
      ...applyContext,
      ...review,
      expectedPlanDigest: planned.plan.planDigest,
      connectionFactory: async () => connection,
    });

    const first = TIDB_CANONICAL_CHECK_CONSTRAINTS[0];
    connection.violations.set(key(first.tableName, first.constraintName), 1);
    const verifyContext = authorityFor('plan', gitIdentity);
    await expect(
      runTidbCheckConstraintConvergence({
        mode: 'plan',
        ...verifyContext,
        ...review,
        connectionFactory: async () => connection,
      }),
    ).rejects.toThrow('durable success evidence contradicts current physical state');
  });

  it('refuses a target with another incomplete migration attempt', async () => {
    const context = authorityFor('plan');
    const connection = new TidbCheckConstraintConnection(context.authority.context.databaseName);
    connection.attempts.set('unrelated-failed-attempt', {
      attempt_id: 'unrelated-failed-attempt',
      plan_digest: 'a'.repeat(64),
      target_fingerprint_hash: context.authority.context.targetFingerprintHash,
      migration_filename: 'future_migration.sql',
      migration_checksum: 'b'.repeat(64),
      accepted_old_head: '0065_auth_verification_token_cleanup.sql',
      expected_new_head: '0065_auth_verification_token_cleanup.sql',
      state: 'failed',
      completed_statement_count: 0,
      last_statement_digest: null,
      failure_class: 'synthetic_failure',
      failure_digest: 'c'.repeat(64),
      application_artifact: null,
    });

    await expect(
      runTidbCheckConstraintConvergence({
        mode: 'plan',
        ...context,
        ...review,
        connectionFactory: async () => connection,
      }),
    ).rejects.toThrow('incomplete migration attempt unrelated-failed-attempt');
    expect(connection.setGlobalCount).toBe(0);
    expect(connection.alterCount).toBe(0);
  });
});
