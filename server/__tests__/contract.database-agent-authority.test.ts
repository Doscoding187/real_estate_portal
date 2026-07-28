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
    expect(manifest.authorityVersion).toBe(2);
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
    expect(manifest.approvedLocalCommands).toContain('db:authority:bootstrap:local');
    expect(manifest.consumerContractEntrypoint).toBe(
      'scripts/databaseAuthorityConsumerContract.ts',
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
      ['pnpm', ['db:migrate:local']],
      ['pnpm', ['db:seed:local']],
      ['pnpm', ['db:verify:local']],
    ]);
    expect(consumerContractCommandSequence()).toEqual([
      ['pnpm', ['db:migrate:test']],
      ['pnpm', ['db:seed:test']],
      ['pnpm', ['db:verify:distribution']],
      ['pnpm', ['db:verify:test-demo']],
    ]);
  });

  it('refuses the fresh-schema contract outside the exact disposable test target', () => {
    const testEnvironment = { NODE_ENV: 'test', APP_ENV: 'test' };

    expect(() =>
      assertFreshDisposableTestTarget(
        'mysql://user:password@127.0.0.1:3307/listify_test',
        testEnvironment,
      ),
    ).not.toThrow();
    expect(() =>
      assertFreshDisposableTestTarget(
        'mysql://user:password@remote.example/listify_test',
        testEnvironment,
      ),
    ).toThrow('target must be a local listify_test MySQL database');
    expect(() =>
      assertFreshDisposableTestTarget('mysql://user:password@127.0.0.1:3307/listify_test', {
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

    expect(entry.split('\n').length).toBeLessThanOrEqual(250);
    expect(entry).toContain(
      'A stale seed, fixture, test helper or runtime query must be reconciled to the canonical schema.',
    );
    expect(entry).toContain('pnpm db:authority:status');
    expect(entry).toContain('pnpm db:authority:bootstrap:local');
    expect(entry).toContain('admin@listify.local');
    expect(entry).toContain('LOCAL_DEMO_AGENCY_PASSWORD');
    expect(index.indexOf('Agent Entry Contract')).toBeLessThan(index.indexOf('Machine Manifest'));
  });

  it('keeps full and fresh database verification layers in CI without exposing local values', () => {
    const ci = readFileSync(resolve(ROOT, '.github/workflows/ci.yml'), 'utf8');
    const status = readFileSync(resolve(ROOT, 'scripts/databaseAuthorityStatus.ts'), 'utf8');

    expect(ci).toContain('pnpm db:verify:ci');
    expect(ci).toContain('pnpm db:authority:consumer-contract');
    expect(status).toContain('Required Local Variables:');
    expect(status).not.toContain('console.log(process.env.DATABASE_URL)');
    expect(status).not.toContain('console.log(process.env.LOCAL_DEMO_AGENCY_PASSWORD)');
  });
});
