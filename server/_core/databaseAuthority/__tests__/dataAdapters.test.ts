import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { authorizeDatabaseOperation } from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import {
  CANONICAL_GEOGRAPHY_DIGEST,
  CANONICAL_GEOGRAPHY_EXPECTED_ROWS,
  prepareCanonicalGeography,
  verifyCanonicalGeography,
} from '../dataAdapters/canonicalGeography';
import {
  buildScenarioInsertStatement,
  SEARCH_TO_LEAD_SCENARIO_DIGEST,
  SEARCH_TO_LEAD_SCENARIO_VERSION,
  verifySearchToLeadScenario,
} from '../dataAdapters/searchToLeadScenario';
import {
  CANONICAL_COMMERCIAL_DIGEST,
  CANONICAL_COMMERCIAL_VERSION,
  CANONICAL_AGENT_LAUNCH_ACCESS,
  CANONICAL_DEVELOPER_LAUNCH_ACCESS,
  planCanonicalCommercialReferenceData,
  prepareCanonicalCommercialReferenceData,
  verifyCanonicalCommercialReference,
} from '../dataAdapters/canonicalCommercial';
import { requireReferenceAdapterTarget } from '../dataAdapters/common';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';

const ROOT = process.cwd();

function identity(branch = 'fix/database-authority-adapter-test') {
  return deriveGitWorktreeIdentity({
    repositoryRoot: ROOT,
    gitCommonDirectory: join(ROOT, '.git'),
    worktreePath: ROOT,
    branch,
    head: 'a'.repeat(40),
    originMainHead: 'b'.repeat(40),
    registered: true,
    clean: true,
  });
}

function authority(url: string, operation: 'verification' | 'reference-seed' | 'scenario-seed') {
  return resolveDatabaseAuthority({
    operation,
    cwd: ROOT,
    gitIdentity: identity(),
    explicitDatabaseUrl: url,
    credentialClass: operation === 'verification' ? 'read-only' : 'local-owner',
    processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
  });
}

function decision(operation: 'verification' | 'reference-seed' | 'scenario-seed') {
  return { operation } as any;
}

function disposableTestAuthority(operation: 'verification' | 'reference-seed') {
  const testIdentity = identity('fix/database-authority-disposable-test');
  return resolveDatabaseAuthority({
    operation,
    cwd: ROOT,
    gitIdentity: testIdentity,
    explicitDatabaseUrl: `mysql://test-owner:private@127.0.0.1:3307/listify_test_${testIdentity.ownershipKey.slice(0, 12)}`,
    credentialClass: 'test-owner',
    processEnv: { CI: 'true', NODE_ENV: 'test', APP_ENV: 'test' },
  });
}

function releaseAuthority(operation: 'release-reference-plan' | 'release-reference-verify') {
  return resolveDatabaseAuthority({
    operation,
    cwd: ROOT,
    gitIdentity: identity(),
    explicitDatabaseUrl: 'mysql://release-user:private@db.prod.example.com/listify_property_sa',
    credentialClass: 'read-only',
    processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
  });
}

function releaseDecision(authority: ReturnType<typeof releaseAuthority>) {
  return authorizeDatabaseOperation(authority, {
    root: ROOT,
    approval: {
      reference: 'CHANGE-456',
      actor: 'release-owner',
      operation: authority.context.operation,
      targetFingerprintHash: authority.context.targetFingerprintHash,
    },
  });
}

class ScriptedReleaseConnection implements AuthoritySqlConnection {
  constructor(private readonly plans: Array<Record<string, unknown>>) {}

  async execute(statement: string): Promise<unknown> {
    if (statement.includes('information_schema.tables')) {
      return [[{ table_name: 'sql_migration_history' }, { table_name: 'sql_migration_attempts' }]];
    }
    if (statement.includes('sql_migration_history')) {
      const manifest = loadAndValidateMigrationManifest({
        migrationsDirectory: join(ROOT, 'server/migrations'),
      });
      return [
        manifest.orderedMigrations.map(item => ({
          filename: item.filename,
          checksum: item.checksum,
        })),
      ];
    }
    if (statement.includes('sql_migration_attempts')) return [[]];
    if (statement.includes('SELECT * FROM plans WHERE name = ?')) return [this.plans];
    if (statement.includes('SELECT feature_key, value_json FROM plan_entitlements')) return [[]];
    throw new Error(`Unexpected release verification statement: ${statement}`);
  }

  async query(): Promise<unknown> {
    throw new Error('Release plan test should not mutate or acquire a lock.');
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

describe('bounded Database Authority data adapters', () => {
  it('publishes deterministic versions and the required geography minimum', () => {
    expect(CANONICAL_GEOGRAPHY_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    expect(CANONICAL_GEOGRAPHY_EXPECTED_ROWS).toEqual({
      provinces: 9,
      cities: 10,
      suburbs: 10,
    });
    expect(SEARCH_TO_LEAD_SCENARIO_VERSION).toBe('search-to-lead-v1');
    expect(SEARCH_TO_LEAD_SCENARIO_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    expect(CANONICAL_COMMERCIAL_VERSION).toBe('canonical-commercial-v1');
    expect(CANONICAL_COMMERCIAL_DIGEST).toMatch(/^[a-f0-9]{64}$/);
    expect(CANONICAL_DEVELOPER_LAUNCH_ACCESS).toMatchObject({
      name: 'developer_launch_access',
      segment: 'developer',
      trialDays: 0,
      price: 149900,
      priceMonthly: 0,
    });
    expect(CANONICAL_DEVELOPER_LAUNCH_ACCESS.metadata).toMatchObject({
      commercial_term_kind: 'paid_launch_access',
      commercial_term_duration_days: 90,
      commercial_requires_verified_payment: true,
      commercial_auto_renews: false,
      commercial_pricing_mode: 'fixed',
      commercial_price_configured: true,
      commercial_launch_fee_minor: 149900,
      commercial_billing_interval: 'once_off',
    });
  });

  it.each([
    'mysql://listify_app:private@127.0.0.1:3307/listify_local',
    'mysql://listify_app:private@127.0.0.1:3307/listify_other',
    'mysql://listify_app:private@remote.example/listify_wt_other_deadbeef1234',
  ])('refuses non-exact owned adapter target %s before SQL', async url => {
    const operation = url.includes('remote') ? 'verification' : 'reference-seed';
    const target = authority(url, operation);
    const connection = new UnexpectedConnection();
    await expect(
      verifyCanonicalGeography({
        authority: target,
        decision: decision('verification'),
        connection,
      }),
    ).rejects.toThrow(/exact owned disposable worktree|fails closed|not the exact/);
    expect(connection.calls).toBe(0);
  });

  it('keeps worktree profile strict while routing authorized disposable-test reference adapters', async () => {
    const worktreeIdentity = identity();
    const worktree = authority(
      `mysql://listify_app:private@127.0.0.1:3307/${worktreeIdentity.expectedWorktreeDatabase}`,
      'reference-seed',
    );
    expect(() => requireReferenceAdapterTarget(worktree)).toThrow(
      'exact owned worktree database profile is absent',
    );

    const prepareTarget = disposableTestAuthority('reference-seed');
    expect(requireReferenceAdapterTarget(prepareTarget)).toMatchObject({
      adapter: 'database-authority-disposable-test-adapter',
      databaseName: prepareTarget.context.databaseName,
    });

    const prepareConnection = new UnexpectedConnection();
    await expect(
      prepareCanonicalGeography({
        authority: prepareTarget,
        decision: decision('reference-seed'),
        connection: prepareConnection,
      }),
    ).rejects.toThrow('connection must not be reached');

    await expect(
      prepareCanonicalCommercialReferenceData({
        authority: prepareTarget,
        decision: decision('reference-seed'),
        connection: prepareConnection,
      }),
    ).rejects.toThrow('connection must not be reached');

    const verifyTarget = disposableTestAuthority('verification');
    const verifyConnection = new UnexpectedConnection();
    await expect(
      verifyCanonicalGeography({
        authority: verifyTarget,
        decision: decision('verification'),
        connection: verifyConnection,
      }),
    ).rejects.toThrow('connection must not be reached');

    await expect(
      verifyCanonicalCommercialReference({
        authority: verifyTarget,
        decision: decision('verification'),
        connection: verifyConnection,
      }),
    ).rejects.toThrow('connection must not be reached');
    expect(prepareConnection.calls).toBeGreaterThan(0);
    expect(verifyConnection.calls).toBeGreaterThan(0);
  });

  it('rejects test-shaped targets outside test authority and rejects protected targets on the ordinary path', async () => {
    const testIdentity = identity('fix/database-authority-non-test-target');
    const developmentTarget = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: ROOT,
      gitIdentity: testIdentity,
      explicitDatabaseUrl: `mysql://test-owner:private@127.0.0.1:3307/listify_test_${testIdentity.ownershipKey.slice(0, 12)}`,
      credentialClass: 'test-owner',
      processEnv: { NODE_ENV: 'development', APP_ENV: 'development' },
    });
    expect(developmentTarget.context.targetClass).toBe('unknown');
    expect(() => requireReferenceAdapterTarget(developmentTarget)).toThrow(
      'authorized isolated disposable-test target',
    );

    const productionTarget = resolveDatabaseAuthority({
      operation: 'verification',
      cwd: ROOT,
      gitIdentity: testIdentity,
      explicitDatabaseUrl: 'mysql://release-user:private@db.prod.example.com/listify_property_sa',
      credentialClass: 'read-only',
      processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
    });
    const connection = new UnexpectedConnection();
    await expect(
      verifyCanonicalCommercialReference({
        authority: productionTarget,
        decision: decision('verification'),
        connection,
      }),
    ).rejects.toThrow('release-reference authority');
    expect(connection.calls).toBe(0);
  });

  it('refuses scenario preparation on an arbitrary explicit target before SQL', async () => {
    const target = authority(
      'mysql://listify_app:private@127.0.0.1:3307/listify_arbitrary',
      'scenario-seed',
    );
    const connection = new UnexpectedConnection();
    await expect(
      verifySearchToLeadScenario({
        authority: target,
        decision: decision('verification'),
        connection,
      }),
    ).rejects.toThrow('exact owned disposable worktree');
    expect(connection.calls).toBe(0);
  });

  it('plans missing commercial release rows only after accepted-head verification', async () => {
    const target = releaseAuthority('release-reference-plan');
    const plan = await planCanonicalCommercialReferenceData({
      authority: target,
      decision: releaseDecision(target),
      connection: new ScriptedReleaseConnection([]),
    });

    expect(plan.status).toBe('pending');
    expect(plan.expectedProductKeys).toEqual([
      'agent_launch_access',
      'agency_launch_access',
      'developer_launch_access',
    ]);
    expect(plan.products.every(product => product.state === 'missing')).toBe(true);
    expect(plan.pending.filter(item => item.action === 'insert_plan')).toHaveLength(3);
    expect(plan.migrationHead).toBe('0007_paid_launch_access_invoice_term.sql');
  });

  it('fails closed when a protected commercial row conflicts with canonical authority', async () => {
    const target = releaseAuthority('release-reference-verify');
    const connection = new ScriptedReleaseConnection([
      { name: CANONICAL_AGENT_LAUNCH_ACCESS.name, price: 1 },
    ]);

    await expect(
      verifyCanonicalCommercialReference({
        authority: target,
        decision: releaseDecision(target),
        connection,
      }),
    ).rejects.toThrow('conflicts with approved reference data');
  });

  it('keeps legacy locations out of geography authority and contains delivery providers', () => {
    const geography = readFileSync(
      join(ROOT, 'server/_core/databaseAuthority/dataAdapters/canonicalGeography.ts'),
      'utf8',
    );
    const scenario = readFileSync(
      join(ROOT, 'server/_core/databaseAuthority/dataAdapters/searchToLeadScenario.ts'),
      'utf8',
    );
    expect(geography).not.toMatch(/INSERT\s+INTO\s+locations/i);
    expect(geography).not.toMatch(/UPDATE\s+locations/i);
    expect(scenario).toContain("deliveryMethod !== 'crm_export'");
    expect(scenario).toContain("RESEND_API_KEY: ''");
    expect(scenario).toContain("WHATSAPP_ACCESS_TOKEN: ''");
    expect(scenario).not.toContain('resend.emails.send');
    expect(scenario).not.toContain('twilio');
  });

  it('constructs every scenario insert with one parameter per declared column', () => {
    const contracts = [
      ['users', ['id', 'email', 'name', 'firstName', 'lastName', 'role', 'emailVerified']],
      ['users', ['id', 'email', 'name', 'firstName', 'lastName', 'role', 'emailVerified']],
      ['agencies', ['id', 'name', 'slug', 'email', 'isVerified']],
      [
        'agents',
        [
          'id',
          'userId',
          'agencyId',
          'firstName',
          'lastName',
          'displayName',
          'slug',
          'email',
          'role',
          'isVerified',
          'isFeatured',
          'status',
        ],
      ],
      ['developers', ['id', 'userId', 'name', 'isVerified', 'status', 'slug']],
      [
        'developments',
        [
          'id',
          'developer_id',
          'name',
          'developmentType',
          'city',
          'province',
          'suburb',
          'slug',
          'isPublished',
          'approval_status',
          'dev_owner_type',
          'status',
          'transaction_type',
          'totalUnits',
          'availableUnits',
          'priceFrom',
        ],
      ],
      [
        'unit_types',
        [
          'id',
          'development_id',
          'name',
          'bedrooms',
          'bathrooms',
          'base_price_from',
          'is_active',
          'total_units',
          'available_units',
          'structural_type',
          'display_order',
        ],
      ],
      [
        'properties',
        [
          'id',
          'title',
          'description',
          'propertyType',
          'listingType',
          'transactionType',
          'price',
          'bedrooms',
          'bathrooms',
          'area',
          'address',
          'city',
          'province',
          'provinceId',
          'cityId',
          'suburbId',
          'status',
          'featured',
          'views',
          'enquiries',
          'agentId',
          'ownerId',
          'latitude',
          'longitude',
        ],
      ],
    ] as const;

    for (const [table, columns] of contracts) {
      const values = columns.map((_, index) => `value-${index}`);
      const statement = buildScenarioInsertStatement(table, columns, values);
      expect(statement.match(/\?/g)).toHaveLength(columns.length);
      expect(statement).not.toContain('value-');
    }

    expect(() => buildScenarioInsertStatement('properties', ['id', 'title'], [1])).toThrow(
      'properties has 2 columns but 1 values',
    );
  });

  it('routes all deterministic scenario rows through the bounded insert builder', () => {
    const scenario = readFileSync(
      join(ROOT, 'server/_core/databaseAuthority/dataAdapters/searchToLeadScenario.ts'),
      'utf8',
    );
    expect(scenario.match(/insertColumns:\s*\[/g)).toHaveLength(8);
    expect(scenario).not.toContain('insertStatement:');
    expect(scenario).toContain('const insertStatement = buildScenarioInsertStatement(');
    expect(scenario).toContain('    input.table,');
  });
});
