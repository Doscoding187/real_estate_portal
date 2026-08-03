import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  classifyDatabaseTarget,
  loadAuthorityManifest,
  validateAuthorityManifest,
} from '../../scripts/databaseAuthorityStatus';
import { localBootstrapCommandSequence } from '../../scripts/databaseAuthorityBootstrapLocal';
import {
  assertFreshDisposableTestTarget,
  consumerContractCommandSequence,
} from '../../scripts/databaseAuthorityConsumerContract';

const ROOT = process.cwd();

describe('database authority agent entry contract', () => {
  it('keeps the authority manifest small, complete, and pointed at existing authorities', () => {
    const manifest = loadAuthorityManifest(ROOT);

    expect(() => validateAuthorityManifest(manifest, ROOT)).not.toThrow();
    expect(manifest.authorityVersion).toBe(3);
    expect(manifest.canonicalMigrationPath).toBe(
      'server/migrations/0000_canonical_launch_baseline.sql',
    );
    expect(manifest.activeMigrationDirectory).toBe('server/migrations');
    expect(manifest.archivedMigrationDirectory).toBe(
      'server/migrations/_archived/pre-canonical-baseline',
    );
    expect(manifest.approvedLocalDatabaseName).toBe('listify_local');
    expect(manifest.migrationLedger).toBe('sql_migration_history');
    expect(manifest.localEnvironmentTemplate).toBe('.env.local.example');
    expect(manifest.machineLocalEnvironmentRelativePath).toBe('.config/property-listify/local.env');
    expect(manifest.requiredLocalVariables).toContain('LOCAL_DEMO_AGENCY_PASSWORD');
    expect(manifest.approvedLocalCommands).toContain('db:worktree:create');
    expect(manifest.migrationManifest).toBe('server/migrations/manifest.json');
    expect(manifest.migrationAttemptLedger).toBe('sql_migration_attempts');
    expect(manifest.consumerContractEntrypoint).toBe(
      'scripts/databaseAuthorityConsumerContract.ts',
    );
    expect(manifest.residualUtilityAuthority).toBe(
      'docs/database-authority/residual-utility-authority.json',
    );
    expect(manifest.staticAuthorityCheck).toBe('scripts/databaseAuthorityCheck.ts');
    expect(manifest.databaseChangeProtocol).toBe(
      'docs/database-authority/database-change-protocol.md',
    );
  });

  it('classifies only exact approved local and test targets as safe', () => {
    const manifest = loadAuthorityManifest(ROOT);

    expect(
      classifyDatabaseTarget('mysql://user:password@127.0.0.1:3307/listify_local', manifest, {
        NODE_ENV: 'development',
      }),
    ).toMatchObject({ classification: 'local', approved: true, host: '127.0.0.1' });
    expect(
      classifyDatabaseTarget('mysql://user:password@127.0.0.1:3307/listify_test', manifest, {
        NODE_ENV: 'test',
      }),
    ).toMatchObject({ classification: 'test', approved: true });
    expect(
      classifyDatabaseTarget('mysql://user:password@remote.example/listify_local', manifest, {
        NODE_ENV: 'development',
      }),
    ).toMatchObject({ classification: 'unknown', approved: false });
    expect(
      classifyDatabaseTarget('mysql://user:password@127.0.0.1:3307/listify_property_sa', manifest, {
        NODE_ENV: 'development',
      }),
    ).toMatchObject({ classification: 'production', approved: false });
  });

  it('uses a non-destructive local bootstrap sequence and a fresh-schema consumer sequence', () => {
    expect(localBootstrapCommandSequence()).toEqual([
      ['pnpm', ['db:local:start']],
      ['pnpm', ['db:local:wait']],
      ['pnpm', ['db:worktree:create']],
      ['pnpm', ['db:migrate:plan']],
      ['pnpm', ['db:migrate:apply']],
      ['pnpm', ['db:schema:congruency']],
      ['pnpm', ['db:readiness']],
    ]);
    expect(consumerContractCommandSequence()).toEqual([
      ['pnpm', ['db:migrate:test']],
      ['pnpm', ['db:schema:congruency']],
      ['pnpm', ['db:verify:distribution']],
      ['pnpm', ['db:readiness']],
    ]);
  });

  it('refuses the fresh-schema contract outside the exact disposable test target', () => {
    const testEnvironment = { NODE_ENV: 'test', APP_ENV: 'test' };

    expect(() =>
      assertFreshDisposableTestTarget(
        'mysql://user:password@127.0.0.1:3306/listify_test',
        { ...testEnvironment, CI: 'true' },
      ),
    ).not.toThrow();
    expect(() =>
      assertFreshDisposableTestTarget(
        'mysql://user:password@remote.example/listify_test',
        testEnvironment,
      ),
    ).toThrow('owned worktree database or isolated CI test database');
    expect(() =>
      assertFreshDisposableTestTarget('mysql://user:password@127.0.0.1:3306/listify_test', {
        NODE_ENV: 'production',
        APP_ENV: 'production',
      }),
    ).toThrow('NODE_ENV and APP_ENV must both be exactly test');
  });

  it('publishes one concise operational entry contract and prevents a stale consumer from becoming schema authority', () => {
    const entry = readFileSync(
      resolve(ROOT, 'docs/database-authority/00-database-authority-agent-entry.md'),
      'utf8',
    );
    const index = readFileSync(resolve(ROOT, 'docs/database-authority/index.md'), 'utf8');
    const protocol = readFileSync(
      resolve(ROOT, 'docs/database-authority/database-change-protocol.md'),
      'utf8',
    );

    expect(entry.split('\n').length).toBeLessThanOrEqual(250);
    expect(entry).toContain(
      'A stale seed, fixture, test helper or runtime query must be reconciled to the canonical schema.',
    );
    expect(entry).toContain('pnpm db:authority:status');
    expect(entry).toContain('pnpm db:worktree:create');
    expect(entry).toContain('sql_migration_attempts');
    expect(entry).toContain('quarantined evidence');
    expect(index.indexOf('Agent Entry Contract')).toBeLessThan(index.indexOf('Machine Manifest'));
    expect(index).toContain('Database Change Protocol');
    expect(protocol).toContain('Exceptional repair/backfill contract');
    expect(protocol).toContain('Reopening criteria');
  });

  it('keeps full and fresh database verification layers in CI without exposing local values', () => {
    const ci = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf8');
    const status = readFileSync(resolve(ROOT, 'scripts/databaseAuthorityStatus.ts'), 'utf8');
    const aggregate = readFileSync(resolve(ROOT, 'scripts/databaseAuthorityCheck.ts'), 'utf8');
    const dbJobStart = ci.indexOf('  db-contract-verification:');
    const dbJobEnd = ci.indexOf('\n  lint-and-typecheck:');
    const dbJob = ci.slice(dbJobStart, dbJobEnd);

    expect(ci).toContain('pnpm db:verify:ci');
    expect(ci).toContain('pnpm db:authority:consumer-contract');
    expect(ci).toContain('pnpm db:authority:check');
    expect(dbJobStart).toBeGreaterThanOrEqual(0);
    expect(dbJobEnd).toBeGreaterThan(dbJobStart);
    expect(dbJob).toContain(
      "    env:\n      CI: 'true'\n      APP_ENV: test\n      NODE_ENV: test\n      DATABASE_CREDENTIAL_CLASS: test-owner",
    );
    expect(dbJob.match(/\n {6}CI:/g)).toHaveLength(1);
    expect(dbJob.match(/\n {6}APP_ENV:/g)).toHaveLength(1);
    expect(dbJob.match(/\n {6}NODE_ENV:/g)).toHaveLength(1);
    expect(dbJob.match(/\n {6}DATABASE_CREDENTIAL_CLASS:/g)).toHaveLength(1);
    expect(dbJob).toContain('MYSQL_DATABASE: listify_test');
    expect(dbJob).toContain('- 3306:3306');
    expect(aggregate).toContain("['test:db-authority:static']");
    expect(aggregate).toContain("['db:authority:utilities']");
    expect(aggregate).toContain("['schema:sanity']");
    expect(aggregate).toContain("['schema:inventory:check']");
    expect(aggregate).not.toMatch(/dotenv|mysql2|createConnection|db:migrate|db:seed|db:authority:status/);
    expect(status).toContain('Required Local Variables:');
    expect(status).not.toContain('console.log(process.env.DATABASE_URL)');
    expect(status).not.toContain('console.log(process.env.LOCAL_DEMO_AGENCY_PASSWORD)');
  });
});
