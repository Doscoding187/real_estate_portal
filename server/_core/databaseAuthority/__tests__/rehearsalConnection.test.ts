import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// This suite owns a mocked connection boundary. Shared runtime initialization
// must not open a pool before its mocks are configured, including in CI.
const previousSkipDbInit = process.env.SKIP_DB_INIT;
process.env.SKIP_DB_INIT = '1';
afterAll(() => {
  if (previousSkipDbInit === undefined) delete process.env.SKIP_DB_INIT;
  else process.env.SKIP_DB_INIT = previousSkipDbInit;
});
// Positive unit cases model the previously approved window; the live registration is revoked.
vi.mock(
  '../../../../docs/database-authority/disposable-rehearsal-authorization.json',
  async importOriginal => ({
    default: { ...(await importOriginal<any>()).default, status: 'approved' },
  }),
);
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: (...args: any[]) => {
      const result = (actual.readFileSync as any)(...args);
      return String(args[0]).endsWith('/disposable-rehearsal-authorization.json')
        ? JSON.stringify({ ...JSON.parse(String(result)), status: 'approved' })
        : result;
    },
  };
});
const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  arm: vi.fn(),
  dirty: false,
  sqlVersion: '8.4.8-azure',
  selected: 'propertylistify_database',
  tls: 'TLS_AES_256_GCM_SHA384',
  queries: [] as string[],
}));
vi.mock('mysql2/promise', () => ({ default: { createConnection: mocks.create } }));
vi.mock('../rehearsalAuthority', async importOriginal => {
  const actual = await importOriginal<any>();
  const { loadAndValidateMigrationManifest } = await import('../../../migrations/migrationManifest');
  const manifest = loadAndValidateMigrationManifest();
  // Current-contract simulated admission only; the real revoked registration stays untouched.
  return {
    ...actual,
    REHEARSAL: { ...actual.REHEARSAL, expectedHead: manifest.expectedHead.filename, manifestDigest: manifest.manifestDigest },
    verifyRehearsalResource: mocks.arm,
  };
});
vi.mock('../schemaCongruency', () => ({
  normalizedDesiredSchema: () => ({
    digest: 'a8ca8cf34bb3627594eab1b722b85115c6460225a0165db7992228a8547798e9',
    tables: [{ name: 'users' }, { name: 'plans' }, { name: 'plan_entitlements' }],
  }),
  normalizedPhysicalSchema: async () => ({}),
  compareNormalizedSchemas: () => ({ congruent: true }),
}));
import { createAuthorityRehearsalSession } from '../connectionAuthority';
import { resolveDatabaseAuthority } from '../context';
import { authorizeDatabaseOperation, expectedDatabaseAcknowledgement } from '../authorization';
import { REHEARSAL, REHEARSAL_RESOURCE_ID } from '../rehearsalAuthority';
import { loadAndValidateMigrationManifest } from '../../../migrations/migrationManifest';
function authority() {
  const a = resolveDatabaseAuthority({
    operation: 'rehearsal-regression',
    explicitDatabaseUrl: `mysql://fixture:fixture@${REHEARSAL.hostname}/${REHEARSAL.database}`,
    credentialClass: 'runtime',
    processEnv: { NODE_ENV: 'test', APP_ENV: 'test' },
    rehearsal: { resourceId: REHEARSAL_RESOURCE_ID, purpose: REHEARSAL.purpose },
  });
  return {
    a,
    d: authorizeDatabaseOperation(a, {
      approval: {
        actor: 'Edward',
        reference: REHEARSAL.purpose,
        operation: a.context.operation,
        targetFingerprintHash: a.context.targetFingerprintHash,
      },
      acknowledgement: expectedDatabaseAcknowledgement(a.context),
    }),
  };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
  mocks.dirty = false;
  mocks.sqlVersion = '8.4.8-azure';
  mocks.selected = REHEARSAL.database;
  mocks.tls = 'TLS_AES_256_GCM_SHA384';
  mocks.queries = [];
  mocks.arm.mockResolvedValue(undefined);
  mocks.create.mockImplementation(async () => ({
    execute: async (sql: string) => {
      mocks.queries.push(sql);
      return [[{ database_name: mocks.selected }]];
    },
    query: async (sql: string) => {
      mocks.queries.push(sql);
      if (sql.includes('GET_LOCK')) return [[{ acquired: 1 }]];
      if (sql.includes('SELECT VERSION()'))
        return [[{ version: mocks.sqlVersion, time_zone: '+00:00' }]];
      if (sql.includes('Ssl_cipher')) return [[{ Value: mocks.tls }]];
      if (sql.includes('FROM sql_migration_history'))
        return [
          loadAndValidateMigrationManifest().orderedMigrations.map(m => ({
            filename: m.filename,
            checksum: m.checksum,
          })),
        ];
      if (sql.startsWith('SELECT 1 FROM')) return [mocks.dirty ? [{ one: 1 }] : []];
      return [[]];
    },
    end: vi.fn().mockResolvedValue(undefined),
  }));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe('rehearsal connection boundary (mock transport, no live DB)', () => {
  it('verifies ARM before connection, forces TLS, runs bounded probes and cleans up', async () => {
    const { a, d } = authority();
    const session = await createAuthorityRehearsalSession(a, d);
    expect(mocks.arm.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.create.mock.invocationCallOrder[0],
    );
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        host: REHEARSAL.hostname,
        database: REHEARSAL.database,
        multipleStatements: false,
        ssl: { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2' },
      }),
    );
    await session.run(0, 'transaction.begin');
    await session.run(0, 'user.insert', [0]);
    await session.run(1, 'onboarding.insert', [0]);
    await session.run(0, 'transaction.rollback');
    await session.end();
    expect(mocks.queries).toContain('INSERT INTO users (id,openId,email,name) VALUES (?,?,?,?)');
    expect(mocks.queries.some(q => /^(CREATE|ALTER|DROP|TRUNCATE|SET GLOBAL)/.test(q))).toBe(false);
    expect(
      mocks.queries.some(q =>
        /^(INSERT|UPDATE|DELETE).*\b(plans|plan_entitlements|sql_migration_history|sql_migration_attempts)\b/.test(
          q,
        ),
      ),
    ).toBe(false);
    await expect(session.run(0, 'user.insert', [0])).rejects.toThrow('closed');
  });
  it('preflight proves identity and closes without DML or transaction controls', async () => {
    const { a, d } = authority();
    const session = await createAuthorityRehearsalSession(a, d, 'preflight');
    expect(session.evidence.migrationCount).toBe(97);
    await session.run(0, 'read.identity');
    for (const probe of ['user.insert', 'transaction.begin', 'transaction.commit'] as const)
      await expect(session.run(0, probe, probe === 'user.insert' ? [0] : [])).rejects.toThrow(
        'Read-only',
      );
    await session.end();
    expect(mocks.queries.some(q => /^(INSERT|UPDATE|DELETE|START|COMMIT|ROLLBACK)/.test(q))).toBe(
      false,
    );
  });
  it('a regression session with no writes closes without cleanup DML', async () => {
    const { a, d } = authority();
    const session = await createAuthorityRehearsalSession(a, d);
    await session.end();
    expect(mocks.queries.some(q => /^(INSERT|UPDATE|DELETE)/.test(q))).toBe(false);
  });
  it('cannot connect when live ARM evidence is unavailable', async () => {
    mocks.arm.mockRejectedValue(new Error('ARM refused'));
    const { a, d } = authority();
    await expect(createAuthorityRehearsalSession(a, d)).rejects.toThrow('ARM refused');
    expect(mocks.create).not.toHaveBeenCalled();
  });
  it.each(['dirty', 'version', 'database', 'tls'])(
    'refuses %s before fixture mutation',
    async kind => {
      if (kind === 'dirty') mocks.dirty = true;
      if (kind === 'version') mocks.sqlVersion = '8.0.11-TiDB';
      if (kind === 'database') mocks.selected = 'listify_property_sa';
      if (kind === 'tls') mocks.tls = '';
      const { a, d } = authority();
      await expect(createAuthorityRehearsalSession(a, d)).rejects.toThrow();
      expect(mocks.queries.some(q => /^(INSERT|UPDATE|DELETE)/.test(q))).toBe(false);
    },
  );
  it('refuses statements after expiry even on an open session', async () => {
    const { a, d } = authority();
    const session = await createAuthorityRehearsalSession(a, d);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T00:00:00Z'));
    await expect(session.run(0, 'user.insert', [0])).rejects.toThrow('expired');
    await expect(session.end()).resolves.toBeUndefined();
    expect(mocks.queries.some(q => /^(INSERT|UPDATE|DELETE)/.test(q))).toBe(false);
  });
});
