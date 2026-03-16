import { describe, expect, it } from 'vitest';

import {
  distributionSchemaAssertions,
  parseSqlStatements,
  runSchemaAssertions,
  type SchemaAssertion,
} from '../runSqlMigrations';

describe('runSqlMigrations parser', () => {
  it('parses statements when file starts with line comments', () => {
    const sql = `
      -- first comment
      -- second comment
      ALTER TABLE users ADD COLUMN plan VARCHAR(16);
      ALTER TABLE agents ADD COLUMN slug VARCHAR(200);
    `;

    const statements = parseSqlStatements(sql);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain('ALTER TABLE users');
    expect(statements[1]).toContain('ALTER TABLE agents');
  });

  it('removes block comments before splitting statements', () => {
    const sql = `
      /* preamble
       multi-line block comment
      */
      ALTER TABLE users ADD COLUMN trialStatus VARCHAR(16);
      /* another comment */
      CREATE INDEX idx_agents_slug ON agents (slug);
    `;

    const statements = parseSqlStatements(sql);
    expect(statements).toHaveLength(2);
    expect(statements[0]).toContain('ALTER TABLE users');
    expect(statements[1]).toContain('CREATE INDEX idx_agents_slug');
  });
});

describe('runSchemaAssertions', () => {
  it('passes when required columns and indexes exist', async () => {
    const assertions: SchemaAssertion[] = [
      { kind: 'columns', table: 'users', columns: ['plan', 'trialStatus'] },
      { kind: 'indexes', table: 'agents', indexes: ['uq_agents_slug'] },
    ];

    const executor = {
      queryRows: async (statement: string): Promise<Array<Record<string, unknown>>> => {
        if (statement.includes('information_schema.columns')) {
          return [{ COLUMN_NAME: 'plan' }, { COLUMN_NAME: 'trialStatus' }];
        }
        if (statement.includes('information_schema.statistics')) {
          return [{ INDEX_NAME: 'uq_agents_slug' }];
        }
        return [];
      },
    };

    await expect(runSchemaAssertions(executor, assertions)).resolves.toBeUndefined();
  });

  it('fails loudly when required schema entries are missing', async () => {
    const assertions: SchemaAssertion[] = [
      { kind: 'columns', table: 'users', columns: ['plan', 'trialStatus'] },
      { kind: 'indexes', table: 'agents', indexes: ['uq_agents_slug', 'idx_agents_slug'] },
    ];

    const executor = {
      queryRows: async (statement: string): Promise<Array<Record<string, unknown>>> => {
        if (statement.includes('information_schema.columns')) {
          return [{ column_name: 'plan' }];
        }
        if (statement.includes('information_schema.statistics')) {
          return [{ index_name: 'uq_agents_slug' }];
        }
        return [];
      },
    };

    await expect(runSchemaAssertions(executor, assertions)).rejects.toThrow(
      /Missing columns in users: trialStatus[\s\S]*Missing indexes in agents: idx_agents_slug/,
    );
  });
});

describe('distributionSchemaAssertions', () => {
  it('covers the manager registration schema that blocked distribution admin', () => {
    expect(distributionSchemaAssertions).toContainEqual({
      kind: 'columns',
      table: 'platform_team_registrations',
      columns: expect.arrayContaining(['email', 'requested_area', 'status']),
    });

    expect(distributionSchemaAssertions).toContainEqual({
      kind: 'columns',
      table: 'distribution_identities',
      columns: expect.arrayContaining(['user_id', 'identity_type', 'active']),
    });
  });

  it('covers the canonical distribution ledger indexes used by drift checks', () => {
    expect(distributionSchemaAssertions).toContainEqual({
      kind: 'indexes',
      table: 'distribution_commission_ledger',
      indexes: expect.arrayContaining([
        'ux_distribution_commission_ledger_hash',
        'idx_distribution_commission_ledger_deal',
        'idx_distribution_commission_ledger_recipient',
      ]),
    });
  });
});
