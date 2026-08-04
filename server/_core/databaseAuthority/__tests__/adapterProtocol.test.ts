import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AuthoritySqlConnection } from '../connectionAuthority';
import { queryRows, withTransaction } from '../dataAdapters/common';

const ROOT = process.cwd();

type Call = {
  method: 'execute' | 'query';
  statement: string;
  values: readonly unknown[];
};

/**
 * Runtime contract for the mysql2 protocol boundary. The real driver rejects
 * transaction-control statements through execute(); this fake fails the same
 * way so adapter tests cannot silently regress to the prepared path.
 */
class ProtocolAwareConnection implements AuthoritySqlConnection {
  readonly calls: Call[] = [];

  async execute(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    this.calls.push({ method: 'execute', statement, values });
    if (/^(START TRANSACTION|COMMIT|ROLLBACK)$/i.test(statement.trim())) {
      throw new Error('mysql prepared-statement protocol rejects transaction control');
    }
    return [[{ id: 1 }], []];
  }

  async query(statement: string, values: readonly unknown[] = []): Promise<unknown> {
    this.calls.push({ method: 'query', statement, values });
    return [[], []];
  }

  async end(): Promise<void> {}
}

describe('Database Authority adapter MySQL protocol boundary', () => {
  it('uses the non-prepared query path for transaction control', async () => {
    const connection = new ProtocolAwareConnection();

    await expect(
      withTransaction(connection, async () => {
        await queryRows(connection, 'SELECT id FROM provinces WHERE slug = ?', ['gauteng']);
        return 'prepared-data-path';
      }),
    ).resolves.toBe('prepared-data-path');

    expect(connection.calls).toEqual([
      { method: 'query', statement: 'START TRANSACTION', values: [] },
      {
        method: 'execute',
        statement: 'SELECT id FROM provinces WHERE slug = ?',
        values: ['gauteng'],
      },
      { method: 'query', statement: 'COMMIT', values: [] },
    ]);
  });

  it('rolls back prepared data work through the compatible query path', async () => {
    const connection = new ProtocolAwareConnection();
    const failure = new Error('geography write failed');

    await expect(
      withTransaction(connection, async () => {
        await queryRows(connection, 'INSERT INTO provinces (name, code, slug) VALUES (?, ?, ?)', [
          'Gauteng',
          'GP',
          'gauteng',
        ]);
        throw failure;
      }),
    ).rejects.toBe(failure);

    expect(connection.calls).toEqual([
      { method: 'query', statement: 'START TRANSACTION', values: [] },
      {
        method: 'execute',
        statement: 'INSERT INTO provinces (name, code, slug) VALUES (?, ?, ?)',
        values: ['Gauteng', 'GP', 'gauteng'],
      },
      { method: 'query', statement: 'ROLLBACK', values: [] },
    ]);
  });

  it('keeps the scenario adapter on the shared transaction boundary', () => {
    const scenario = readFileSync(
      join(ROOT, 'server/_core/databaseAuthority/dataAdapters/searchToLeadScenario.ts'),
      'utf8',
    );

    expect(scenario).toContain('withTransaction(input.connection');
    expect(scenario).not.toMatch(
      /connection\.execute\(\s*['"`](?:START TRANSACTION|COMMIT|ROLLBACK)['"`]/i,
    );
  });
});
