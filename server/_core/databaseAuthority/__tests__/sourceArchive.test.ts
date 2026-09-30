import { describe, expect, it } from 'vitest';
import { randomBytes } from 'node:crypto';
import {
  openSourceArchive,
  sealSourceArchive,
  sourceArchiveCell,
  capturePreliminaryTiDbArchive,
} from '../sourceArchive';
import { resolveDatabaseAuthority } from '../context';
import { authorizeDatabaseOperation } from '../authorization';

describe('encrypted TiDB archival boundary', () => {
  it('preserves exact payload bytes and authenticates key/ciphertext', () => {
    const key = randomBytes(32),
      payload = Buffer.from('private\n2026-09-30 01:02:03.123456\n9007199254740993');
    const sealed = sealSourceArchive(payload, key);
    expect(sealed.includes(Buffer.from('private'))).toBe(false);
    expect(openSourceArchive(sealed, key)).toEqual(payload);
    expect(() => openSourceArchive(sealed, randomBytes(32))).toThrow();
    sealed[sealed.length - 1] ^= 1;
    expect(() => openSourceArchive(sealed, key)).toThrow();
  });
  it('preserves binary and precise string values while refusing lossy representations', () => {
    expect(sourceArchiveCell(Buffer.from([0, 255]))).toEqual({ encoding: 'base64', value: 'AP8=' });
    expect(sourceArchiveCell('9007199254740993')).toBe('9007199254740993');
    expect(sourceArchiveCell('2026-09-30 01:02:03.123456')).toContain('.123456');
    for (const value of [new Date(), NaN, Infinity, 9007199254740992, {}])
      expect(() => sourceArchiveCell(value)).toThrow();
  });
  it('refuses the Azure target before a connection or data capture', async () => {
    const a = resolveDatabaseAuthority({
      operation: 'read-only-connect',
      credentialClass: 'read-only',
      explicitDatabaseUrl:
        'mysql://reader:private@propertylistify-mysql.mysql.database.azure.com/propertylistify_database',
      processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
    });
    const d = authorizeDatabaseOperation(a, {
      approval: {
        actor: 'test',
        reference: 'test',
        operation: a.context.operation,
        targetFingerprintHash: a.context.targetFingerprintHash,
      },
    });
    await expect(
      capturePreliminaryTiDbArchive({ authority: a, decision: d, key: randomBytes(32) }),
    ).rejects.toThrow('Exact read-only TiDB');
  });
});

// Exercise the complete capture without contacting a protected database.
vi.mock('../connectionAuthority', () => ({ createAuthoritySqlConnection: vi.fn() }));
import { vi, beforeEach } from 'vitest';
import { createAuthoritySqlConnection } from '../connectionAuthority';

function sourceAuthority() {
  const authority = resolveDatabaseAuthority({
    operation: 'read-only-connect',
    credentialClass: 'read-only',
    explicitDatabaseUrl:
      'mysql://reader:private@gateway01.ap-northeast-1.prod.aws.tidbcloud.com:4000/listify_property_sa',
    processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
  });
  const decision = authorizeDatabaseOperation(authority, {
    approval: {
      actor: 'test',
      reference: 'archive-test',
      operation: authority.context.operation,
      targetFingerprintHash: authority.context.targetFingerprintHash,
    },
  });
  return { authority, decision, key: randomBytes(32) };
}

describe('preliminary source capture', () => {
  beforeEach(() => vi.clearAllMocks());
  function connection(
    row: Record<string, unknown> = {
      id: '9007199254740993',
      json: '{"n":9007199254740993}',
      binary: Buffer.from([255]),
      at: '2026-09-30 01:02:03.123456',
    },
  ) {
    const query = vi.fn(async (sql: string): Promise<unknown> => {
      if (sql.startsWith('SELECT VERSION'))
        return [
          [{ version: '8.0-TiDB', selected_database: 'listify_property_sa', time_zone: '+00:00' }],
          [],
        ];
      if (sql.includes('information_schema.TABLES'))
        return [[{ TABLE_NAME: 'source_table', TABLE_TYPE: 'BASE TABLE' }], []];
      if (sql.startsWith('SHOW CREATE'))
        return [
          [{ Table: 'source_table', 'Create Table': 'CREATE TABLE source_table (id BIGINT)' }],
          [],
        ];
      if (sql.startsWith('SELECT *')) return [[row], []];
      return [[], []];
    });
    const c = { query, execute: vi.fn(), end: vi.fn(async () => {}) };
    vi.mocked(createAuthoritySqlConnection).mockResolvedValue(c);
    return c;
  }
  it('captures schema and exact values, authenticates them, and closes the snapshot', async () => {
    const c = connection(),
      input = sourceAuthority();
    const result = await capturePreliminaryTiDbArchive(input);
    const frames = openSourceArchive(result.encrypted, input.key)
      .toString()
      .trim()
      .split('\n')
      .map(line => JSON.parse(line));
    expect(frames[2].cells).toEqual({
      id: '9007199254740993',
      json: '{"n":9007199254740993}',
      binary: { encoding: 'base64', value: '/w==' },
      at: '2026-09-30 01:02:03.123456',
    });
    expect(result.evidence).toMatchObject({
      totalRows: 1,
      tableCount: 1,
      frozen: false,
      authenticatedReadback: true,
    });
    expect(c.query).toHaveBeenCalledWith('ROLLBACK');
    expect(c.end).toHaveBeenCalledOnce();
    expect(c.execute).not.toHaveBeenCalled();
  });
  it('rolls back and closes after a lossy value without producing an archive', async () => {
    const c = connection({ id: 9007199254740992 });
    await expect(capturePreliminaryTiDbArchive(sourceAuthority())).rejects.toThrow(
      'precision loss',
    );
    expect(c.query).toHaveBeenCalledWith('ROLLBACK');
    expect(c.end).toHaveBeenCalledOnce();
  });
  it('rejects malformed driver results and closes the connection', async () => {
    const c = connection();
    c.query.mockResolvedValueOnce({ rows: [] });
    await expect(capturePreliminaryTiDbArchive(sourceAuthority())).rejects.toThrow(
      'invalid query result',
    );
    expect(c.end).toHaveBeenCalledOnce();
  });
});
