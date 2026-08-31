import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { authorizeDatabaseOperation } from '../../_core/databaseAuthority/authorization';
import { resolveDatabaseAuthority } from '../../_core/databaseAuthority/context';
import type { AuthoritySqlConnection } from '../../_core/databaseAuthority/connectionAuthority';
import { deriveGitWorktreeIdentity } from '../../_core/databaseAuthority/worktreeIdentity';
import type { MigrationManifestDocument, MigrationManifestEntry } from '../migrationManifest';
import {
  buildMigrationPlan,
  buildMysqlMigrationConnectionConfig,
  canonicalBaselineCutoverError,
  migrationChecksum,
  runSqlMigrations,
  sortMigrationFiles,
} from '../runSqlMigrations';

const temporaryRoots: string[] = [];
const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');

function fixtureIdentity() {
  const root = mkdtempSync(join(tmpdir(), 'listify-runner-worktree-'));
  const common = join(root, '.git-common');
  const worktree = join(root, 'listify-runner-fixture');
  mkdirSync(common);
  mkdirSync(worktree);
  temporaryRoots.push(root);
  return deriveGitWorktreeIdentity({
    repositoryRoot: worktree,
    gitCommonDirectory: common,
    worktreePath: worktree,
    branch: 'fix/runner-fixture',
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    registered: true,
    clean: true,
  });
}

function authorityFor(mode: 'plan' | 'apply') {
  const identity = fixtureIdentity();
  const authority = resolveDatabaseAuthority({
    operation: mode === 'plan' ? 'migration-plan' : 'migration-apply',
    cwd: identity.worktreePath,
    gitIdentity: identity,
    explicitDatabaseUrl: `mysql://listify_app:private@127.0.0.1:3307/${identity.expectedWorktreeDatabase}`,
    processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
  });
  const authorization = authorizeDatabaseOperation(authority, { root: process.cwd() });
  return { authority, authorization };
}

function entry(
  sequence: number,
  filename: string,
  sql: string,
  parent: MigrationManifestEntry | null,
): MigrationManifestEntry {
  return {
    sequence,
    filename,
    checksum: sha256(sql),
    parent: parent?.filename ?? null,
    parentChecksum: parent?.checksum ?? null,
    kind: sequence === 0 ? 'establishment' : 'ddl',
    statementPolicy: sequence === 0 ? 'immutable-baseline' : 'single-ddl',
    requiredReferenceDataVersion: null,
  };
}

function migrationFixture(includeIncrement = true) {
  const root = mkdtempSync(join(tmpdir(), 'listify-runner-manifest-'));
  temporaryRoots.push(root);
  const baselineSql = 'CREATE TABLE canonical_widget (id int);';
  const incrementSql = 'ALTER TABLE canonical_widget ADD name varchar(20);';
  const baseline = entry(0, '0000_canonical_launch_baseline.sql', baselineSql, null);
  const entries = [baseline];
  writeFileSync(join(root, baseline.filename), baselineSql);
  if (includeIncrement) {
    const increment = entry(1, '0001_add_widget_name.sql', incrementSql, baseline);
    entries.push(increment);
    writeFileSync(join(root, increment.filename), incrementSql);
  }
  const document: MigrationManifestDocument = {
    manifestVersion: 1,
    dialect: 'mysql',
    historyTable: 'sql_migration_history',
    attemptTable: 'sql_migration_attempts',
    lockName: 'fixture_migration_lock',
    expectedHead: entries.at(-1)!.filename,
    migrations: entries,
  };
  const manifestPath = join(root, 'manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(document, null, 2)}\n`);
  return { root, manifestPath, baselineSql, incrementSql, entries };
}

class FakeMigrationConnection implements AuthoritySqlConnection {
  calls: Array<{ statement: string; values: readonly unknown[] }> = [];
  queryCalls: Array<{ statement: string; values: readonly unknown[] }> = [];
  selectedDatabase: string;
  history = new Map<string, string>();
  attempts = new Map<
    string,
    { filename: string; state: string; completed: number; lockOwnerConnectionId?: string }
  >();
  historyTablePresent = false;
  attemptTablePresent = false;
  applicationTableCount: number | null = 0;
  failStatement?: RegExp;
  failFailureUpdate = false;
  rejectPreparedControlStatements = false;
  ended = false;
  connectionId = '314';
  lockOwnerConnectionId = '314';

  constructor(selectedDatabase: string) {
    this.selectedDatabase = selectedDatabase;
  }

  async execute(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    this.calls.push({ statement, values });
    if (
      this.rejectPreparedControlStatements &&
      /^(START TRANSACTION|COMMIT|ROLLBACK)$/i.test(statement.trim())
    ) {
      throw Object.assign(new Error('prepared transaction control is unsupported'), {
        code: 'ER_UNSUPPORTED_PS',
      });
    }
    if (statement.startsWith('SELECT DATABASE()')) {
      return [[{ database_name: this.selectedDatabase }]];
    }
    if (statement.includes('information_schema.tables') && statement.includes('table_name IN')) {
      const rows = [];
      if (this.historyTablePresent) rows.push({ table_name: 'sql_migration_history' });
      if (this.attemptTablePresent) rows.push({ table_name: 'sql_migration_attempts' });
      return [rows];
    }
    if (statement.startsWith('SELECT filename, checksum')) {
      return [[...this.history].map(([filename, checksum]) => ({ filename, checksum }))];
    }
    if (statement.startsWith('SELECT attempt_id')) {
      return [[...this.attempts].flatMap(([attempt_id, attempt]) =>
        ['running', 'failed', 'blocked'].includes(attempt.state)
          ? [{ attempt_id, migration_filename: attempt.filename, state: attempt.state }]
          : [],
      )];
    }
    if (statement.startsWith('SELECT COUNT(*)')) {
      return this.applicationTableCount === null
        ? [[]]
        : [[{ count_value: this.applicationTableCount }]];
    }
    if (statement.includes('GET_LOCK')) return [[{ lock_status: 1 }]];
    if (statement.includes('CONNECTION_ID()') && statement.includes('IS_USED_LOCK')) {
      return [[{
        connection_id: this.connectionId,
        lock_owner_connection_id: this.lockOwnerConnectionId,
      }]];
    }
    if (statement.includes('RELEASE_LOCK')) return [[{ released: 1 }]];
    if (statement.startsWith('CREATE TABLE IF NOT EXISTS `sql_migration_history`')) {
      this.historyTablePresent = true;
      return {};
    }
    if (statement.startsWith('CREATE TABLE IF NOT EXISTS `sql_migration_attempts`')) {
      this.attemptTablePresent = true;
      return {};
    }
    if (statement.startsWith('INSERT INTO `sql_migration_attempts`')) {
      this.attempts.set(String(values[0]), {
        filename: String(values[3]),
        state: 'running',
        completed: 0,
        lockOwnerConnectionId: String(values[9]),
      });
      return {};
    }
    if (statement.startsWith('UPDATE `sql_migration_attempts` SET completed_statement_count')) {
      const attempt = this.attempts.get(String(values[2]))!;
      attempt.completed = Number(values[0]);
      return {};
    }
    if (statement.includes("SET state = 'failed'")) {
      if (this.failFailureUpdate) throw new Error('lost failure evidence connection');
      this.attempts.get(String(values[2]))!.state = 'failed';
      return {};
    }
    if (statement.includes("SET state = 'succeeded'")) {
      this.attempts.get(String(values[0]))!.state = 'succeeded';
      return {};
    }
    if (statement.startsWith('INSERT INTO `sql_migration_history`')) {
      this.history.set(String(values[2]), String(values[3]));
      return {};
    }
    if (this.failStatement?.test(statement)) {
      throw Object.assign(new Error('intentional SQL failure containing private'), {
        code: 'ER_FIXTURE_FAILURE',
      });
    }
    return {};
  }

  async query(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    this.queryCalls.push({ statement, values });
    if (/^(START TRANSACTION|COMMIT|ROLLBACK)$/i.test(statement.trim())) return {};
    return this.execute(statement, values);
  }

  async end(): Promise<void> {
    this.ended = true;
  }
}

function transactionalMigrationFixture() {
  const root = mkdtempSync(join(tmpdir(), 'listify-runner-transactional-'));
  temporaryRoots.push(root);
  const baselineSql = 'CREATE TABLE canonical_widget (id int);';
  const seedSql = 'INSERT INTO canonical_widget (id) VALUES (1), (2);';
  const baseline = entry(0, '0000_canonical_launch_baseline.sql', baselineSql, null);
  const seed: MigrationManifestEntry = {
    sequence: 1,
    filename: '0001_seed_canonical_widget.sql',
    checksum: sha256(seedSql),
    parent: baseline.filename,
    parentChecksum: baseline.checksum,
    kind: 'transactional-data',
    statementPolicy: 'transactional-dml',
    requiredReferenceDataVersion: null,
  };
  writeFileSync(join(root, baseline.filename), baselineSql);
  writeFileSync(join(root, seed.filename), seedSql);
  const document: MigrationManifestDocument = {
    manifestVersion: 1,
    dialect: 'mysql',
    historyTable: 'sql_migration_history',
    attemptTable: 'sql_migration_attempts',
    lockName: 'fixture_migration_lock',
    expectedHead: seed.filename,
    migrations: [baseline, seed],
  };
  const manifestPath = join(root, 'manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(document, null, 2)}\n`);
  return { root, manifestPath, baseline, seed };
}

afterEach(() => {
  while (temporaryRoots.length) rmSync(temporaryRoots.pop()!, { recursive: true, force: true });
});

describe('migration connection security', () => {
  it('normalizes strict TLS and rejects insecure production settings', () => {
    expect(
      buildMysqlMigrationConnectionConfig(
        'mysql://user:pass@host:4000/db?ssl=true&rejectUnauthorized=true',
      ),
    ).toMatchObject({
      uri: 'mysql://user:pass@host:4000/db',
      ssl: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    });
    expect(() =>
      buildMysqlMigrationConnectionConfig(
        'mysql://user:pass@host:4000/listify_property_sa?rejectUnauthorized=false',
        'production',
      ),
    ).toThrow('Certificate verification cannot be disabled');
  });
});

describe('manifest migration planning and durable attempts', () => {
  it('plans explicit old and new heads without migration or control-table mutation', async () => {
    const fixture = migrationFixture();
    const { authority, authorization } = authorityFor('plan');
    const connection = new FakeMigrationConnection(authority.context.databaseName);
    connection.historyTablePresent = true;
    connection.attemptTablePresent = true;
    connection.history.set(fixture.entries[0].filename, fixture.entries[0].checksum);

    const result = await runSqlMigrations({
      mode: 'plan',
      migrationsDir: fixture.root,
      manifestPath: fixture.manifestPath,
      authority,
      authorization,
      acceptedOldHead: fixture.entries[0].filename,
      expectedNewHead: fixture.entries[1].filename,
      connectionFactory: async () => connection,
    });

    expect(result.plan.acceptedOldHead).toBe(fixture.entries[0].filename);
    expect(result.plan.pending.map(item => item.filename)).toEqual([fixture.entries[1].filename]);
    expect(result.plan.expectedNewHead).toBe(fixture.entries[1].filename);
    expect(connection.calls.some(call => /CREATE|INSERT|UPDATE|ALTER/.test(call.statement))).toBe(false);
  });

  it('applies a locked plan, records success history, and retains succeeded attempt evidence', async () => {
    const fixture = migrationFixture(false);
    const { authority, authorization } = authorityFor('apply');
    const connection = new FakeMigrationConnection(authority.context.databaseName);

    const result = await runSqlMigrations({
      mode: 'apply',
      migrationsDir: fixture.root,
      manifestPath: fixture.manifestPath,
      authority,
      authorization,
      acceptedOldHead: null,
      expectedNewHead: fixture.entries[0].filename,
      connectionFactory: async () => connection,
    });

    expect(result.applied).toEqual([fixture.entries[0].filename]);
    expect(result.lock).toEqual({
      lockName: 'fixture_migration_lock',
      ownerConnectionId: '314',
      ownershipVerified: true,
    });
    expect(connection.history.get(fixture.entries[0].filename)).toBe(
      migrationChecksum(fixture.baselineSql),
    );
    expect([...connection.attempts.values()]).toEqual([
      expect.objectContaining({
        filename: fixture.entries[0].filename,
        state: 'succeeded',
        completed: 1,
        lockOwnerConnectionId: '314',
      }),
    ]);
    expect(connection.historyTablePresent).toBe(true);
    expect(connection.attemptTablePresent).toBe(true);
  });

  it('uses the non-prepared query path for transactional control statements', async () => {
    const fixture = transactionalMigrationFixture();
    const { authority, authorization } = authorityFor('apply');
    const connection = new FakeMigrationConnection(authority.context.databaseName);
    connection.historyTablePresent = true;
    connection.attemptTablePresent = true;
    connection.history.set(fixture.baseline.filename, fixture.baseline.checksum);
    connection.rejectPreparedControlStatements = true;

    const result = await runSqlMigrations({
      mode: 'apply',
      migrationsDir: fixture.root,
      manifestPath: fixture.manifestPath,
      authority,
      authorization,
      acceptedOldHead: fixture.baseline.filename,
      expectedNewHead: fixture.seed.filename,
      connectionFactory: async () => connection,
    });

    expect(result.applied).toEqual([fixture.seed.filename]);
    expect(connection.queryCalls.map(call => call.statement)).toEqual([
      'START TRANSACTION',
      'COMMIT',
    ]);
    expect(
      connection.calls.some(call => /^(START TRANSACTION|COMMIT|ROLLBACK)$/i.test(call.statement)),
    ).toBe(false);
  });

  it.each([
    ['plan', true, false, 'successful history table'],
    ['apply', true, false, 'successful history table'],
    ['plan', false, true, 'attempt-state table'],
    ['apply', false, true, 'attempt-state table'],
  ] as const)(
    'blocks %s when migration control-table presence is incoherent',
    async (mode, historyTablePresent, attemptTablePresent, expectedDiagnostic) => {
      const fixture = migrationFixture();
      const { authority, authorization } = authorityFor(mode);
      const connection = new FakeMigrationConnection(authority.context.databaseName);
      connection.historyTablePresent = historyTablePresent;
      connection.attemptTablePresent = attemptTablePresent;
      if (historyTablePresent) {
        connection.history.set(fixture.entries[0].filename, fixture.entries[0].checksum);
        connection.applicationTableCount = 1;
      }

      await expect(
        runSqlMigrations({
          mode,
          migrationsDir: fixture.root,
          manifestPath: fixture.manifestPath,
          authority,
          authorization,
          acceptedOldHead: historyTablePresent ? fixture.entries[0].filename : null,
          expectedNewHead: fixture.entries[1].filename,
          connectionFactory: async () => connection,
        }),
      ).rejects.toThrow(expectedDiagnostic);

      expect(
        connection.calls.some(call =>
          /^(CREATE TABLE IF NOT EXISTS|INSERT INTO|UPDATE |ALTER TABLE|CREATE TABLE canonical_widget)/.test(
            call.statement,
          ),
        ),
      ).toBe(false);
      expect(connection.historyTablePresent).toBe(historyTablePresent);
      expect(connection.attemptTablePresent).toBe(attemptTablePresent);
    },
  );

  it.each([
    ['non-empty', 1, 'both control tables are absent'],
    ['ambiguous', null, 'freshness could not be proven'],
  ] as const)(
    'refuses %s targets with both control tables absent before establishment mutation',
    async (_label, applicationTableCount, expectedDiagnostic) => {
      const fixture = migrationFixture(false);
      const { authority, authorization } = authorityFor('apply');
      const connection = new FakeMigrationConnection(authority.context.databaseName);
      connection.applicationTableCount = applicationTableCount;

      await expect(
        runSqlMigrations({
          mode: 'apply',
          migrationsDir: fixture.root,
          manifestPath: fixture.manifestPath,
          authority,
          authorization,
          acceptedOldHead: null,
          expectedNewHead: fixture.entries[0].filename,
          connectionFactory: async () => connection,
        }),
      ).rejects.toThrow(expectedDiagnostic);

      expect(
        connection.calls.some(call =>
          /^(CREATE TABLE IF NOT EXISTS|INSERT INTO|UPDATE |CREATE TABLE canonical_widget)/.test(
            call.statement,
          ),
        ),
      ).toBe(false);
      expect(connection.historyTablePresent).toBe(false);
      expect(connection.attemptTablePresent).toBe(false);
    },
  );

  it('blocks ordinary apply when an incomplete attempt exists', async () => {
    const fixture = migrationFixture();
    const { authority, authorization } = authorityFor('apply');
    const connection = new FakeMigrationConnection(authority.context.databaseName);
    connection.historyTablePresent = true;
    connection.attemptTablePresent = true;
    connection.history.set(fixture.entries[0].filename, fixture.entries[0].checksum);
    connection.attempts.set('prior-failed-attempt', {
      filename: fixture.entries[1].filename,
      state: 'failed',
      completed: 1,
    });

    await expect(
      runSqlMigrations({
        mode: 'apply',
        migrationsDir: fixture.root,
        manifestPath: fixture.manifestPath,
        authority,
        authorization,
        acceptedOldHead: fixture.entries[0].filename,
        expectedNewHead: fixture.entries[1].filename,
        connectionFactory: async () => connection,
      }),
    ).rejects.toThrow('requires reviewed recovery');
    expect(connection.calls.some(call => call.statement.startsWith('ALTER TABLE'))).toBe(false);
  });

  it('refuses apply when named-lock ownership cannot be proven', async () => {
    const fixture = migrationFixture(false);
    const { authority, authorization } = authorityFor('apply');
    const connection = new FakeMigrationConnection(authority.context.databaseName);
    connection.lockOwnerConnectionId = '271';

    await expect(
      runSqlMigrations({
        mode: 'apply',
        migrationsDir: fixture.root,
        manifestPath: fixture.manifestPath,
        authority,
        authorization,
        acceptedOldHead: null,
        expectedNewHead: fixture.entries[0].filename,
        connectionFactory: async () => connection,
      }),
    ).rejects.toThrow('ownership could not be proven');
    expect(connection.calls.some(call => call.statement.startsWith('CREATE TABLE'))).toBe(false);
  });

  it('requires explicit accepted old and expected new heads before connecting', async () => {
    const fixture = migrationFixture(false);
    const { authority, authorization } = authorityFor('apply');
    let connected = false;
    await expect(
      runSqlMigrations({
        mode: 'apply',
        migrationsDir: fixture.root,
        manifestPath: fixture.manifestPath,
        authority,
        authorization,
        connectionFactory: async () => {
          connected = true;
          return new FakeMigrationConnection(authority.context.databaseName);
        },
      }),
    ).rejects.toThrow('accepted old head must be explicit');
    expect(connected).toBe(false);

    await expect(
      runSqlMigrations({
        mode: 'apply',
        migrationsDir: fixture.root,
        manifestPath: fixture.manifestPath,
        authority,
        authorization,
        acceptedOldHead: null,
        connectionFactory: async () => {
          connected = true;
          return new FakeMigrationConnection(authority.context.databaseName);
        },
      }),
    ).rejects.toThrow('expected new manifest head must be explicit');
    expect(connected).toBe(false);
  });

  it('preserves failed attempt evidence and never records partial DDL as success', async () => {
    const fixture = migrationFixture();
    const { authority, authorization } = authorityFor('apply');
    const connection = new FakeMigrationConnection(authority.context.databaseName);
    connection.historyTablePresent = true;
    connection.attemptTablePresent = true;
    connection.history.set(fixture.entries[0].filename, fixture.entries[0].checksum);
    connection.failStatement = /^ALTER TABLE canonical_widget/;

    await expect(
      runSqlMigrations({
        mode: 'apply',
        migrationsDir: fixture.root,
        manifestPath: fixture.manifestPath,
        authority,
        authorization,
        acceptedOldHead: fixture.entries[0].filename,
        expectedNewHead: fixture.entries[1].filename,
        connectionFactory: async () => connection,
      }),
    ).rejects.toThrow('durable attempt');

    expect(connection.history.has(fixture.entries[1].filename)).toBe(false);
    expect([...connection.attempts.values()]).toEqual([
      expect.objectContaining({ filename: fixture.entries[1].filename, state: 'failed' }),
    ]);
  });

  it('leaves a running blocker if connectivity is lost while recording failure', async () => {
    const fixture = migrationFixture();
    const { authority, authorization } = authorityFor('apply');
    const connection = new FakeMigrationConnection(authority.context.databaseName);
    connection.historyTablePresent = true;
    connection.attemptTablePresent = true;
    connection.history.set(fixture.entries[0].filename, fixture.entries[0].checksum);
    connection.failStatement = /^ALTER TABLE canonical_widget/;
    connection.failFailureUpdate = true;

    await expect(
      runSqlMigrations({
        mode: 'apply',
        migrationsDir: fixture.root,
        manifestPath: fixture.manifestPath,
        authority,
        authorization,
        acceptedOldHead: fixture.entries[0].filename,
        expectedNewHead: fixture.entries[1].filename,
        connectionFactory: async () => connection,
      }),
    ).rejects.toThrow('durable attempt');
    expect([...connection.attempts.values()][0].state).toBe('running');
  });

  it('rejects a supplied connection that points at a different database', async () => {
    const fixture = migrationFixture(false);
    const { authority, authorization } = authorityFor('plan');
    const connection = new FakeMigrationConnection('another_database');
    await expect(
      runSqlMigrations({
        mode: 'plan',
        migrationsDir: fixture.root,
        manifestPath: fixture.manifestPath,
        authority,
        authorization,
        connectionFactory: async () => connection,
      }),
    ).rejects.toThrow('supplied connection target is not the authorized target');
    expect(connection.calls).toHaveLength(1);
  });

  it('rejects a forged authorization before invoking a supplied connection factory', async () => {
    const fixture = migrationFixture(false);
    const { authority } = authorityFor('plan');
    let connected = false;
    await expect(
      runSqlMigrations({
        mode: 'plan',
        migrationsDir: fixture.root,
        manifestPath: fixture.manifestPath,
        authority,
        authorization: {
          decisionVersion: 1,
          decisionId: 'forged',
          contextId: authority.context.contextId,
          operation: 'migration-plan',
          targetFingerprintHash: authority.context.targetFingerprintHash,
          targetClass: authority.context.targetClass,
          credentialClass: authority.context.credentialClass,
          approvalReference: null,
          evidenceRule: 'forged',
        },
        connectionFactory: async () => {
          connected = true;
          return new FakeMigrationConnection(authority.context.databaseName);
        },
      }),
    ).rejects.toThrow('authorization is absent or mismatched');
    expect(connected).toBe(false);
  });

  it('rejects old-head mismatch, non-prefix history, checksum drift, and application tables without baseline', () => {
    const fixture = migrationFixture();
    const manifest = {
      document: {
        expectedHead: fixture.entries[1].filename,
      },
      manifestDigest: 'manifest',
      orderedMigrations: fixture.entries.map(item => ({ ...item, statementCount: 1 })),
    } as any;
    expect(() =>
      buildMigrationPlan({
        manifest,
        targetFingerprintHash: 'fingerprint',
        applied: [{ fileName: fixture.entries[0].filename, checksum: fixture.entries[0].checksum }],
        acceptedOldHead: null,
      }),
    ).toThrow('accepted old head');
    expect(() =>
      buildMigrationPlan({
        manifest,
        targetFingerprintHash: 'fingerprint',
        applied: [{ fileName: fixture.entries[1].filename, checksum: fixture.entries[1].checksum }],
      }),
    ).toThrow('not a contiguous manifest prefix');
    expect(() =>
      buildMigrationPlan({
        manifest,
        targetFingerprintHash: 'fingerprint',
        applied: [{ fileName: fixture.entries[0].filename, checksum: 'wrong' }],
      }),
    ).toThrow('checksum drift');
    expect(() =>
      buildMigrationPlan({
        manifest,
        targetFingerprintHash: 'fingerprint',
        applied: [],
        applicationTableCount: 2,
      }),
    ).toThrow('application tables exist');
  });
});

describe('legacy pure guards retained as compatibility adapters', () => {
  it('rejects missing baseline, orphaned ledger entries, duplicate numeric identities, and sorts uniquely', () => {
    expect(canonicalBaselineCutoverError(['0001_next.sql'], [], 0)).toContain('requires');
    expect(
      canonicalBaselineCutoverError(
        ['0000_canonical_launch_baseline.sql'],
        ['0001_orphaned.sql'],
        0,
      ),
    ).toContain('absent from the canonical manifest');
    expect(() => sortMigrationFiles(['0001_a.sql', '0001_b.sql'])).toThrow('Duplicate numeric');
    expect(
      sortMigrationFiles([
        '0002_second.sql',
        '0000_canonical_launch_baseline.sql',
        '0001_first.sql',
      ]),
    ).toEqual([
      '0000_canonical_launch_baseline.sql',
      '0001_first.sql',
      '0002_second.sql',
    ]);
  });
});
