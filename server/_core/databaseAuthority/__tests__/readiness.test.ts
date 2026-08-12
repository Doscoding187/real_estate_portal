import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { afterEach, describe, expect, it } from 'vitest';
import { authorizeDatabaseOperation } from '../authorization';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { resolveDatabaseAuthority } from '../context';
import { assessAuthorizedDatabaseReadiness, assessRuntimeDatabaseReadiness } from '../readiness';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';

const roots: string[] = [];

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'listify-readiness-'));
  roots.push(root);
  const common = join(root, '.git-common');
  const worktree = join(root, 'worktree');
  const migrations = join(worktree, 'server', 'migrations');
  const schema = join(worktree, 'drizzle', 'schema');
  mkdirSync(common);
  mkdirSync(migrations, { recursive: true });
  mkdirSync(schema, { recursive: true });
  const identity = deriveGitWorktreeIdentity({
    repositoryRoot: worktree,
    gitCommonDirectory: common,
    worktreePath: worktree,
    branch: 'fix/readiness',
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    registered: true,
    clean: true,
  });
  const baselineSql = 'CREATE TABLE widgets (id int);';
  const checksum = createHash('sha256').update(baselineSql).digest('hex');
  const filename = '0000_canonical_launch_baseline.sql';
  writeFileSync(join(migrations, filename), baselineSql);
  writeFileSync(
    join(migrations, 'manifest.json'),
    `${JSON.stringify(
      {
        manifestVersion: 1,
        dialect: 'mysql',
        historyTable: 'sql_migration_history',
        attemptTable: 'sql_migration_attempts',
        lockName: 'readiness_fixture',
        expectedHead: filename,
        migrations: [
          {
            sequence: 0,
            filename,
            checksum,
            parent: null,
            parentChecksum: null,
            kind: 'establishment',
            statementPolicy: 'immutable-baseline',
            requiredReferenceDataVersion: null,
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  writeFileSync(
    join(schema, 'canonical-model-inventory.json'),
    `${JSON.stringify({ tables: ['widgets'] }, null, 2)}\n`,
  );
  const authority = resolveDatabaseAuthority({
    operation: 'readiness',
    cwd: worktree,
    gitIdentity: identity,
    explicitDatabaseUrl: `mysql://user:private@127.0.0.1:3307/${identity.expectedWorktreeDatabase}`,
    processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
  });
  const authorization = authorizeDatabaseOperation(authority, { root: process.cwd() });
  const manifest = loadAndValidateMigrationManifest({ migrationsDirectory: migrations });
  return { root: worktree, identity, authority, authorization, manifest, checksum, filename };
}

class ReadinessConnection implements AuthoritySqlConnection {
  selected: string;
  tables = new Set<string>();
  history: Array<{ filename: string; checksum: string }> = [];
  attempts: Array<{ attempt_id: string; migration_filename: string; state: string }> = [];
  throwOnQuery = false;

  constructor(selected: string) {
    this.selected = selected;
  }

  async execute(statement: string): Promise<unknown> {
    if (this.throwOnQuery) throw new Error('unreachable with private connection detail');
    if (statement.startsWith('SELECT DATABASE()')) return [[{ database_name: this.selected }]];
    if (statement.includes('information_schema.tables')) {
      return [[...this.tables].map(table_name => ({ table_name }))];
    }
    if (statement.startsWith('SELECT filename, checksum')) return [this.history];
    if (statement.startsWith('SELECT attempt_id')) return [this.attempts];
    return [[]];
  }

  async query(statement: string): Promise<unknown> {
    return this.execute(statement);
  }

  async end(): Promise<void> {}
}

afterEach(() => {
  while (roots.length) rmSync(roots.pop()!, { recursive: true, force: true });
});

describe('truthful layered readiness', () => {
  it('keeps process liveness green while an unreachable database is red', async () => {
    const value = fixture();
    const report = await assessRuntimeDatabaseReadiness({
      authority: value.authority,
      authorization: value.authorization,
      root: value.root,
      connectionFactory: async () => {
        throw new Error('database unavailable with hidden URL');
      },
    });
    expect(report.layers.processLiveness.state).toBe('ready');
    expect(report.layers.targetConnectivity.code).toBe('database-unreachable');
    expect(report.applicationReady).toBe(false);
    expect(JSON.stringify(report)).not.toContain('hidden URL');
  });

  it('does not treat a configured client object as connectivity proof', async () => {
    const value = fixture();
    const connection = new ReadinessConnection(value.authority.context.databaseName);
    connection.throwOnQuery = true;
    const report = await assessRuntimeDatabaseReadiness({
      authority: value.authority,
      authorization: value.authorization,
      root: value.root,
      connectionFactory: async () => connection,
    });
    expect(report.layers.targetConnectivity.state).toBe('not-ready');
    expect(report.applicationReady).toBe(false);
  });

  it('returns structured red readiness when target authority is unresolved or denied', async () => {
    const value = fixture();
    const unresolved = await assessRuntimeDatabaseReadiness({ root: value.root });
    expect(unresolved.layers.processLiveness.state).toBe('ready');
    expect(unresolved.layers.targetConnectivity.code).toBe('authority-unresolved');
    expect(unresolved.applicationReady).toBe(false);

    const deniedAuthority = resolveDatabaseAuthority({
      operation: 'readiness',
      cwd: value.root,
      gitIdentity: value.identity,
      explicitDatabaseUrl: 'mysql://user:private@shared.example.com/listify_preview',
      credentialClass: 'read-only',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    const denied = await assessRuntimeDatabaseReadiness({
      authority: deniedAuthority,
      root: process.cwd(),
    });
    expect(denied.layers.targetConnectivity.code).toBe('authority-denied');
    expect(denied.applicationReady).toBe(false);
    expect(JSON.stringify(denied)).not.toContain('private');
  });

  it('distinguishes a wrong selected database from an unreachable database', async () => {
    const value = fixture();
    const connection = new ReadinessConnection('wrong_database');
    const report = await assessAuthorizedDatabaseReadiness({
      authority: value.authority,
      connection,
      manifest: value.manifest,
      root: value.root,
    });
    expect(report.layers.targetConnectivity.code).toBe('wrong-database');
    expect(report.layers.targetConnectivity.detail).toContain('wrong_database');
    expect(report.applicationReady).toBe(false);
  });

  it('fails wrong manifest head, incomplete attempts, and required schema independently', async () => {
    const value = fixture();
    const connection = new ReadinessConnection(value.authority.context.databaseName);
    connection.tables.add('sql_migration_history');
    connection.tables.add('sql_migration_attempts');
    connection.attempts.push({
      attempt_id: 'failed-attempt',
      migration_filename: value.filename,
      state: 'failed',
    });

    const report = await assessAuthorizedDatabaseReadiness({
      authority: value.authority,
      connection,
      manifest: value.manifest,
      root: value.root,
    });
    expect(report.layers.migrationHead.code).toBe('manifest-head-behind');
    expect(report.layers.incompleteAttemptState.code).toBe('incomplete-migration-attempt');
    expect(report.layers.structuralSchema.code).toBe('required-schema-missing');
    expect(report.applicationReady).toBe(false);
  });

  it('fails closed when attempt-state authority is missing despite exact head and schema', async () => {
    const value = fixture();
    const connection = new ReadinessConnection(value.authority.context.databaseName);
    connection.tables = new Set(['widgets', 'sql_migration_history']);
    connection.history.push({ filename: value.filename, checksum: value.checksum });

    const report = await assessAuthorizedDatabaseReadiness({
      authority: value.authority,
      connection,
      manifest: value.manifest,
      root: value.root,
    });
    expect(report.layers.processLiveness.state).toBe('ready');
    expect(report.layers.targetConnectivity.state).toBe('ready');
    expect(report.layers.migrationHead.code).toBe('manifest-head-ready');
    expect(report.layers.structuralSchema.state).toBe('ready');
    expect(report.layers.incompleteAttemptState).toMatchObject({
      state: 'not-ready',
      code: 'migration-attempt-authority-missing',
    });
    expect(report.layers.incompleteAttemptState.detail).toContain('sql_migration_attempts');
    expect(report.layers.incompleteAttemptState.detail).not.toContain(
      'No running, failed, or blocked migration attempt exists',
    );
    expect(report.layers.release).toMatchObject({
      state: 'not-ready',
      code: 'release-blocked-by-migration-attempt-authority',
    });
    expect(report.applicationReady).toBe(false);
  });

  it('reports attempt history without successful history as incoherent authority', async () => {
    const value = fixture();
    const connection = new ReadinessConnection(value.authority.context.databaseName);
    connection.tables = new Set(['widgets', 'sql_migration_attempts']);

    const report = await assessAuthorizedDatabaseReadiness({
      authority: value.authority,
      connection,
      manifest: value.manifest,
      root: value.root,
    });
    expect(report.layers.migrationHead.code).toBe('migration-ledger-missing');
    expect(report.layers.incompleteAttemptState).toMatchObject({
      state: 'not-ready',
      code: 'migration-control-authority-incoherent',
    });
    expect(report.layers.incompleteAttemptState.detail).toContain('sql_migration_history');
    expect(report.applicationReady).toBe(false);
  });

  it('does not claim application readiness without exact target ownership and schema congruency evidence', async () => {
    const value = fixture();
    const connection = new ReadinessConnection(value.authority.context.databaseName);
    connection.tables = new Set(['widgets', 'sql_migration_history', 'sql_migration_attempts']);
    connection.history.push({ filename: value.filename, checksum: value.checksum });

    const report = await assessAuthorizedDatabaseReadiness({
      authority: value.authority,
      connection,
      manifest: value.manifest,
      root: value.root,
    });
    expect(report.applicationReady).toBe(false);
    expect(report.layers.serviceAvailable.state).toBe('ready');
    expect(report.layers.targetOwned.state).toBe('not-ready');
    expect(report.layers.schemaMigrated.state).toBe('ready');
    expect(report.layers.schemaCongruent.state).toBe('not-evaluated');
    expect(report.layers.canonicalReferenceData.state).toBe('not-evaluated');
    expect(report.layers.acceptanceScenario.state).toBe('not-evaluated');
    expect(report.layers.application.state).toBe('not-ready');
    expect(report.layers.migrationHead.code).toBe('manifest-head-ready');
    expect(report.layers.incompleteAttemptState.state).toBe('ready');
    expect(report.layers.structuralSchema.state).toBe('ready');
    expect(report.layers.requiredData.state).toBe('not-required');
    expect(report.layers.consumerApi.state).toBe('not-evaluated');
    expect(report.layers.browserJourney.state).toBe('not-evaluated');
    expect(report.layers.release.state).toBe('not-evaluated');
    expect(report.layers.fullDiagnostics.state).toBe('not-evaluated');
  });

  it('recognizes an authorized disposable-test target without requiring a worktree profile', async () => {
    const value = fixture();
    const testAuthority = resolveDatabaseAuthority({
      operation: 'readiness',
      cwd: value.root,
      gitIdentity: value.identity,
      explicitDatabaseUrl: `mysql://test-owner:private@127.0.0.1:3307/listify_test_${value.identity.ownershipKey.slice(0, 12)}`,
      credentialClass: 'test-owner',
      processEnv: { CI: 'true', NODE_ENV: 'test', APP_ENV: 'test' },
    });
    const testAuthorization = authorizeDatabaseOperation(testAuthority, { root: process.cwd() });
    const report = await assessAuthorizedDatabaseReadiness({
      authority: testAuthority,
      authorization: testAuthorization,
      connection: new ReadinessConnection(testAuthority.context.databaseName),
      manifest: value.manifest,
      root: value.root,
    });

    expect(testAuthority.context.targetClass).toBe('disposable-test');
    expect(report.layers.targetOwned).toMatchObject({
      state: 'ready',
      code: 'authorized-disposable-test',
    });
  });
});
