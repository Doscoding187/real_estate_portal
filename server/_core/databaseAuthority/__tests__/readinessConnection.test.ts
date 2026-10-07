import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeDatabaseOperation } from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import { createAuthoritySqlConnection } from '../connectionAuthority';

const previousSkipDbInit = process.env.SKIP_DB_INIT;
process.env.SKIP_DB_INIT = '1';
afterAll(() => {
  if (previousSkipDbInit === undefined) delete process.env.SKIP_DB_INIT;
  else process.env.SKIP_DB_INIT = previousSkipDbInit;
});
const driver = vi.hoisted(() => ({
  create: vi.fn(),
  execute: vi.fn(),
  query: vi.fn(),
  end: vi.fn(),
}));
vi.mock('mysql2/promise', () => ({ default: { createConnection: driver.create } }));

// Fictional credentials; every raw driver method is mocked, including setup.
function authorized(operation: 'readiness' | 'read-only-connect' | 'diagnostics' = 'readiness') {
  const authority = resolveDatabaseAuthority({
    operation,
    explicitDatabaseUrl:
      'mysql://unit:unit@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database',
    credentialClass: 'read-only',
    processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
  });
  const decision = authorizeDatabaseOperation(authority, {
    approval: {
      actor: 'unit-test',
      reference: 'readiness-connection-regression',
      operation,
      targetFingerprintHash: authority.context.targetFingerprintHash,
      credentialClass: 'read-only',
    },
  });
  return { authority, decision };
}

beforeEach(() => {
  const rows = [[{ database_name: 'propertylistify_database' }]];
  driver.execute.mockResolvedValue(rows);
  driver.query.mockResolvedValue(rows);
  driver.end.mockResolvedValue(undefined);
  driver.create.mockResolvedValue({
    execute: driver.execute,
    query: driver.query,
    end: driver.end,
  });
});

describe('authorized readiness connection transport', () => {
  it('avoids preparation for static reads and preserves UTC, TLS and selected-target verification', async () => {
    const { authority, decision } = authorized();
    const connection = await createAuthoritySqlConnection(authority, decision);
    expect(driver.query.mock.calls).toEqual([
      ["SET time_zone = '+00:00'"],
      ['SELECT DATABASE() AS database_name'],
    ]);
    expect(driver.create.mock.calls[0][0]).toMatchObject({
      timezone: 'Z',
      ssl: { rejectUnauthorized: true },
    });
    const rows = [[{ filename: '0094_content_topics_primary_key.sql', checksum: 'canonical' }]];
    driver.query.mockResolvedValue(rows);
    const sql =
      'SELECT filename, checksum FROM `sql_migration_history` ORDER BY numeric_version, filename';
    expect(await connection.execute(sql, [])).toBe(rows);
    expect(driver.query).toHaveBeenLastCalledWith(sql);
    expect(driver.execute).not.toHaveBeenCalled();
    await connection.end();
    expect(driver.end).toHaveBeenCalledOnce();
  });

  it('keeps bound values on the prepared path without interpolating or changing them', async () => {
    const { authority, decision } = authorized();
    const connection = await createAuthoritySqlConnection(authority, decision);
    driver.query.mockClear();
    const sql = 'SELECT * FROM plans WHERE name = ?';
    const values = ["quoted'); DROP TABLE plans; --"];
    const rows = [[{ id: 1, name: values[0] }]];
    driver.execute.mockResolvedValue(rows);
    expect(await connection.execute(sql, values)).toBe(rows);
    expect(driver.execute).toHaveBeenCalledOnce();
    expect(driver.execute).toHaveBeenLastCalledWith(sql, values);
    expect(driver.query).not.toHaveBeenCalled();
    await connection.end();
  });

  it.each(['read-only-connect', 'diagnostics'] as const)(
    'preserves prepared execution for the separate %s operation',
    async operation => {
      const { authority, decision } = authorized(operation);
      const connection = await createAuthoritySqlConnection(authority, decision);
      expect(driver.execute).toHaveBeenCalledWith("SET time_zone = '+00:00'", undefined);
      expect(driver.execute).toHaveBeenCalledWith('SELECT DATABASE() AS database_name', undefined);
      driver.execute.mockClear();
      driver.query.mockClear();
      await connection.execute('SELECT canonical_metadata', []);
      expect(driver.execute).toHaveBeenCalledOnce();
      expect(driver.execute).toHaveBeenLastCalledWith('SELECT canonical_metadata', []);
      expect(driver.query).not.toHaveBeenCalled();
      await connection.end();
    },
  );

  it('fails closed and closes the connection if direct target verification disagrees', async () => {
    const { authority, decision } = authorized();
    driver.query.mockResolvedValue([[{ database_name: 'different_database' }]]);
    await expect(createAuthoritySqlConnection(authority, decision)).rejects.toThrow(
      'selected database',
    );
    expect(driver.end).toHaveBeenCalledOnce();
    expect(driver.execute).not.toHaveBeenCalled();
  });

  it('propagates a failed assessment read without a retry through another protocol', async () => {
    const { authority, decision } = authorized();
    const connection = await createAuthoritySqlConnection(authority, decision);
    const error = new Error('read failed');
    driver.query.mockRejectedValue(error);
    await expect(connection.execute('SELECT canonical_metadata', [])).rejects.toBe(error);
    expect(driver.execute).not.toHaveBeenCalled();
    await connection.end();
  });

  it('rejects a copied authorization decision before opening a driver connection', async () => {
    const { authority, decision } = authorized();
    await expect(createAuthoritySqlConnection(authority, { ...decision })).rejects.toThrow(
      'authorization',
    );
    expect(driver.create).not.toHaveBeenCalled();
  });
});
