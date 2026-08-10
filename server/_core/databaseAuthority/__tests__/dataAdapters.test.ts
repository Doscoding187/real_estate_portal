import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolveDatabaseAuthority } from '../context';
import {
  CANONICAL_GEOGRAPHY_DIGEST,
  CANONICAL_GEOGRAPHY_EXPECTED_ROWS,
  verifyCanonicalGeography,
} from '../dataAdapters/canonicalGeography';
import {
  buildScenarioInsertStatement,
  SEARCH_TO_LEAD_SCENARIO_DIGEST,
  SEARCH_TO_LEAD_SCENARIO_VERSION,
  verifySearchToLeadScenario,
} from '../dataAdapters/searchToLeadScenario';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { deriveGitWorktreeIdentity } from '../worktreeIdentity';

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
