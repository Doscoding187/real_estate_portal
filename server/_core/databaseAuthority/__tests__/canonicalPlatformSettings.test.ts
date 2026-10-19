import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { resolveDatabaseAuthority } from '../context';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';
import {
  CANONICAL_PLATFORM_SETTINGS,
  CANONICAL_PLATFORM_SETTINGS_DIGEST,
  CANONICAL_PLATFORM_SETTINGS_VERSION,
  prepareCanonicalPlatformSettings,
  verifyCanonicalPlatformSettings,
} from '../dataAdapters/canonicalPlatformSettings';

const ROOT = process.cwd();

type StoredRow = {
  id: number;
  setting_key: string;
  setting_value: string;
  description: string;
  category: string;
  isPublic: number;
};

function seedRow(overrides: Partial<StoredRow> = {}): StoredRow {
  return {
    id: 1,
    setting_key: 'sarb_prime_rate',
    setting_value: '10.50',
    description:
      'Current South African Reserve Bank Prime Lending Rate (updated when SARB announces changes)',
    category: 'pricing',
    isPublic: 1,
    ...overrides,
  };
}

function repoRow(overrides: Partial<StoredRow> = {}): StoredRow {
  return seedRow({
    id: 2,
    setting_key: 'sarb_repo_rate',
    setting_value: '7.00',
    description: 'Current South African Reserve Bank Repo Rate (base rate)',
    ...overrides,
  });
}

class SettingsConnection implements AuthoritySqlConnection {
  readonly calls: Array<{ method: 'execute' | 'query'; statement: string }> = [];
  private nextId = 1;

  constructor(public rows: StoredRow[] = []) {
    this.nextId = rows.reduce((max, row) => Math.max(max, row.id), 0) + 1;
  }

  private manifestRows() {
    return loadAndValidateMigrationManifest({
      migrationsDirectory: join(ROOT, 'server/migrations'),
    }).orderedMigrations.map(item => ({ filename: item.filename, checksum: item.checksum }));
  }

  async execute(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    this.calls.push({ method: 'execute', statement });
    if (statement.includes('information_schema.tables')) {
      return [[{ table_name: 'sql_migration_history' }, { table_name: 'sql_migration_attempts' }]];
    }
    if (statement.includes('sql_migration_history')) return [this.manifestRows()];
    if (statement.includes('sql_migration_attempts')) return [[]];
    if (/^SELECT .* FROM platform_settings/.test(statement.trim())) {
      const keys = values.map(value => String(value));
      return [this.rows.filter(row => keys.includes(row.setting_key))];
    }
    if (/^INSERT INTO platform_settings/.test(statement.trim())) {
      this.rows.push({
        id: this.nextId++,
        setting_key: String(values[0]),
        setting_value: String(values[1]),
        description: String(values[2]),
        category: String(values[3]),
        isPublic: Number(values[4]),
      });
      return [{ affectedRows: 1 }];
    }
    if (/^UPDATE platform_settings/.test(statement.trim())) {
      const target = this.rows.find(row => row.id === Number(values[4]));
      if (target) {
        target.setting_value = String(values[0]);
        target.description = String(values[1]);
        target.category = String(values[2]);
        target.isPublic = Number(values[3]);
      }
      return [{ affectedRows: target ? 1 : 0 }];
    }
    throw new Error(`Unexpected statement: ${statement}`);
  }

  async query(statement: string): Promise<unknown> {
    this.calls.push({ method: 'query', statement });
    return [[], []];
  }

  async end(): Promise<void> {}
}

class UnexpectedConnection implements AuthoritySqlConnection {
  calls = 0;
  async execute(): Promise<unknown> {
    this.calls += 1;
    throw new Error('connection must not be reached');
  }
  async query(): Promise<unknown> {
    this.calls += 1;
    throw new Error('connection must not be reached');
  }
  async end(): Promise<void> {}
}

function disposableTestAuthority(operation: 'reference-seed' | 'verification') {
  const testIdentity = deriveGitWorktreeIdentity({
    repositoryRoot: ROOT,
    gitCommonDirectory: join(ROOT, '.git'),
    worktreePath: ROOT,
    branch: 'fix/database-authority-platform-settings-test',
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    registered: true,
    clean: true,
  });
  return resolveDatabaseAuthority({
    operation,
    cwd: ROOT,
    gitIdentity: testIdentity,
    explicitDatabaseUrl: `mysql://test-owner:private@127.0.0.1:3307/listify_test_${testIdentity.ownershipKey.slice(0, 12)}`,
    credentialClass: operation === 'verification' ? 'read-only' : 'test-owner',
    processEnv: { CI: 'true', NODE_ENV: 'test', APP_ENV: 'test' },
  });
}

function decision(operation: 'reference-seed' | 'verification') {
  return { operation } as any;
}

describe('canonical platform settings reference adapter', () => {
  it('publishes a deterministic version and digest for the SARB rate seed', () => {
    expect(CANONICAL_PLATFORM_SETTINGS_VERSION).toBe('canonical-platform-settings-v1');
    expect(CANONICAL_PLATFORM_SETTINGS_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    expect(CANONICAL_PLATFORM_SETTINGS.map(setting => setting.settingKey)).toEqual([
      'sarb_prime_rate',
      'sarb_repo_rate',
    ]);
    expect(CANONICAL_PLATFORM_SETTINGS.every(setting => setting.category === 'pricing')).toBe(
      true,
    );
  });

  it('inserts both rate rows on an empty target and re-verifies them in the same run', async () => {
    const connection = new SettingsConnection();
    const evidence = await prepareCanonicalPlatformSettings({
      authority: disposableTestAuthority('reference-seed'),
      decision: decision('reference-seed'),
      connection,
    });

    expect(evidence.adapter).toBe('canonical-platform-settings');
    expect(evidence.actions).toEqual([
      { settingKey: 'sarb_prime_rate', action: 'inserted' },
      { settingKey: 'sarb_repo_rate', action: 'inserted' },
    ]);
    expect(evidence.verified).toMatchObject({
      rowCount: 2,
      primeRatePresent: true,
      repoRatePresent: true,
      values: { sarb_prime_rate: '10.50', sarb_repo_rate: '7.00' },
    });
    expect(connection.rows).toHaveLength(2);
  });

  it('replays idempotently and converges a drifted row without duplicating keys', async () => {
    const connection = new SettingsConnection([seedRow()]);
    const first = await prepareCanonicalPlatformSettings({
      authority: disposableTestAuthority('reference-seed'),
      decision: decision('reference-seed'),
      connection,
    });
    expect(first.actions).toEqual([
      { settingKey: 'sarb_prime_rate', action: 'unchanged' },
      { settingKey: 'sarb_repo_rate', action: 'inserted' },
    ]);

    connection.rows[0].setting_value = '9.75';
    connection.rows[0].category = 'other';
    const converged = await prepareCanonicalPlatformSettings({
      authority: disposableTestAuthority('reference-seed'),
      decision: decision('reference-seed'),
      connection,
    });
    expect(converged.actions).toEqual([
      { settingKey: 'sarb_prime_rate', action: 'converged' },
      { settingKey: 'sarb_repo_rate', action: 'unchanged' },
    ]);
    expect(connection.rows).toHaveLength(2);
    expect(connection.rows[0]).toMatchObject({
      setting_value: '10.50',
      category: 'pricing',
    });
  });

  it('refuses duplicate rows for one setting key instead of guessing', async () => {
    const connection = new SettingsConnection([
      seedRow(),
      seedRow({ id: 3 }),
      repoRow({ id: 4 }),
    ]);
    await expect(
      prepareCanonicalPlatformSettings({
        authority: disposableTestAuthority('reference-seed'),
        decision: decision('reference-seed'),
        connection,
      }),
    ).rejects.toThrow('2 rows for sarb_prime_rate');
  });

  it('verifies prepared rows and fails closed on missing or mismatched data', async () => {
    const prepared = new SettingsConnection([seedRow(), repoRow()]);
    const verified = await verifyCanonicalPlatformSettings({
      authority: disposableTestAuthority('verification'),
      decision: decision('verification'),
      connection: prepared,
    });
    expect(verified.verified.rowCount).toBe(2);
    expect(verified.actions.every(action => action.action === 'reused')).toBe(true);

    const missing = new SettingsConnection([seedRow()]);
    await expect(
      verifyCanonicalPlatformSettings({
        authority: disposableTestAuthority('verification'),
        decision: decision('verification'),
        connection: missing,
      }),
    ).rejects.toThrow('sarb_repo_rate is missing');

    const mismatched = new SettingsConnection([seedRow({ isPublic: 0 }), repoRow()]);
    await expect(
      verifyCanonicalPlatformSettings({
        authority: disposableTestAuthority('verification'),
        decision: decision('verification'),
        connection: mismatched,
      }),
    ).rejects.toThrow('isPublic 0 != 1');
  });

  it('refuses the wrong operation and an unauthorized target before SQL', async () => {
    const connection = new UnexpectedConnection();
    await expect(
      prepareCanonicalPlatformSettings({
        authority: disposableTestAuthority('reference-seed'),
        decision: decision('verification'),
        connection,
      }),
    ).rejects.toThrow('operation verification is not approved');
    expect(connection.calls).toBe(0);

    const arbitrary = resolveDatabaseAuthority({
      operation: 'reference-seed',
      cwd: ROOT,
      explicitDatabaseUrl: 'mysql://listify_app:private@127.0.0.1:3307/listify_arbitrary',
      credentialClass: 'local-owner',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    await expect(
      prepareCanonicalPlatformSettings({
        authority: arbitrary,
        decision: decision('reference-seed'),
        connection,
      }),
    ).rejects.toThrow('owned disposable worktree');
    expect(connection.calls).toBe(0);
  });

  it('keeps the adapter on the bounded transaction boundary and free of schema DDL', () => {
    const adapter = readFileSync(
      join(ROOT, 'server/_core/databaseAuthority/dataAdapters/canonicalPlatformSettings.ts'),
      'utf8',
    );
    expect(adapter).toContain('withTransaction(input.connection');
    expect(adapter).not.toMatch(
      /(?:mysql2\/promise|createConnection|createPool|CREATE\s+TABLE|ALTER\s+TABLE|DROP\s+TABLE|TRUNCATE\s+TABLE)/i,
    );
    expect(adapter).not.toMatch(
      /connection\.execute\(\s*['"`](?:START TRANSACTION|COMMIT|ROLLBACK)['"`]/i,
    );
  });
});
