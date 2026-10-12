import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildIsolatedCiGrantPlan } from '../../server/_core/databaseAuthority/isolatedCiCredentials';
import { B08_WORKER_IDENTITY } from '../../server/_core/databaseAuthority/authorization';
import {
  assertWorkerAdmissionEnvironment,
  inspectLaunchWorker,
  type WorkerAdmissionExpectation,
} from '../launchWorkerAdmissionCheck';

// This suite owns a mocked connection authority. Shared database setup must
// not initialize the runtime pool through these mocks before beforeEach runs.
const previousSkipDbInit = process.env.SKIP_DB_INIT;
process.env.SKIP_DB_INIT = '1';
afterAll(() => {
  if (previousSkipDbInit === undefined) delete process.env.SKIP_DB_INIT;
  else process.env.SKIP_DB_INIT = previousSkipDbInit;
});

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(),
  authorize: vi.fn(),
  approval: vi.fn(),
  createPool: vi.fn(),
  hostedConfiguration: vi.fn(),
  testConfiguration: vi.fn(),
}));
vi.mock('../../server/_core/databaseAuthority/context', () => ({
  resolveDatabaseAuthority: mocks.resolve,
}));
vi.mock('../../server/_core/databaseAuthority/connectionAuthority', () => ({
  createAuthorityRuntimePool: mocks.createPool,
}));
vi.mock('../../server/_core/databaseAuthority/authorization', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/_core/databaseAuthority/authorization')>()),
  authorizeDatabaseOperation: mocks.authorize,
  protectedDatabaseApprovalFromEnvironment: mocks.approval,
}));
vi.mock('../../server/_core/hostedRuntimeConfiguration', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/_core/hostedRuntimeConfiguration')>()),
  assertHostedRuntimeConfiguration: mocks.hostedConfiguration,
}));
vi.mock('../../server/_core/securityRuntimeConfiguration', () => ({
  assertNoDeployedTestConfiguration: mocks.testConfiguration,
}));

const now = Date.parse('2026-10-12T13:00:00Z');
const expected: WorkerAdmissionExpectation = {
  sha: 'a'.repeat(40),
  fingerprint: 'b'.repeat(64),
  projectId: '8cdd7515-ddd2-4252-bbee-df5a5c209d4b',
  environmentId: '63070d99-357a-40ba-99c3-6d1368f61652',
  serviceId: '59c0d8f8-abe2-4696-ad9c-de1037723b66',
  expiresAt: '2026-10-12T13:30:00Z',
};
const context = {
  targetClass: 'production',
  runtimeMode: 'production',
  credentialClass: 'worker',
  targetFingerprintHash: expected.fingerprint,
  databaseName: 'propertylistify_database',
  tls: { required: true, certificateVerificationRequired: true },
};
const expectedGrants = buildIsolatedCiGrantPlan({
  databaseName: context.databaseName,
  roleUsers: {
    runtime: 'propertylistify_app_runtime',
    worker: B08_WORKER_IDENTITY,
    'read-only': 'propertylistify_b08_inspector',
    migration: 'propertylistify_release_migrator',
  },
}).statementsByCredential.worker;
const denied = () =>
  Object.assign(new Error('private driver details'), {
    code: 'ER_TABLEACCESS_DENIED_ERROR',
    errno: 1142,
  });

describe('read-only worker admission', () => {
  let query: ReturnType<typeof vi.fn>;
  let release: ReturnType<typeof vi.fn>;
  let end: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    for (const [key, value] of Object.entries({
      APP_ENV: 'production',
      NODE_ENV: 'production',
      DATABASE_CREDENTIAL_CLASS: 'worker',
      BUILD_SHA: expected.sha,
      RAILWAY_GIT_COMMIT_SHA: expected.sha,
      RAILWAY_PROJECT_ID: expected.projectId,
      RAILWAY_ENVIRONMENT_ID: expected.environmentId,
      RAILWAY_SERVICE_ID: expected.serviceId,
      PAID_MVP_SALES_PAUSED: 'true',
      PAID_MVP_ENABLED_PRODUCT_KEYS: '',
      PAID_MVP_ADMITTED_OWNERS: '',
      PAID_MVP_SALES_OPEN_UNTIL: '',
    }))
      vi.stubEnv(key, value);
    mocks.resolve.mockReturnValue({ context });
    mocks.authorize.mockReturnValue({ operation: 'worker-connect' });
    mocks.approval.mockReturnValue({ reference: 'reviewed-private-reference' });
    mocks.hostedConfiguration.mockImplementation(() => {});
    mocks.testConfiguration.mockImplementation(() => {});
    query = vi.fn(async ({ sql }: { sql: string }) => {
      if (sql.startsWith('SELECT DATABASE()'))
        return [
          [
            {
              selected_database: context.databaseName,
              current_identity: `${B08_WORKER_IDENTITY}@%`,
              timezone: '+00:00',
            },
          ],
          [],
        ];
      if (sql.startsWith('SHOW SESSION')) return [[{ Value: 'TLSv1.3' }], []];
      if (sql === 'SHOW GRANTS') return [expectedGrants.map(value => ({ grant: value })), []];
      if (sql.includes('LIMIT 0')) throw denied();
      if (sql.includes('transactional_email_deliveries'))
        return [
          [
            { state: 'pending', total: '2' },
            { state: 'unknown', total: 1 },
          ],
          [],
        ];
      if (sql.includes('lead_deliveries')) return [[{ state: 'queued', total: 1 }], []];
      throw new Error('unexpected query');
    });
    release = vi.fn();
    end = vi.fn().mockResolvedValue(undefined);
    mocks.createPool.mockResolvedValue({
      pool: { getConnection: vi.fn().mockResolvedValue({ query, release }) },
      end,
    });
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });

  it('reports exact admission and aggregate counts without authorizing or performing delivery', async () => {
    const result = await inspectLaunchWorker(expected);
    expect(result).toMatchObject({
      ok: true,
      deliveryAuthorized: false,
      sourceSha: expected.sha,
      queues: { email: { pending: 2, unknown: 1 }, lead: { queued: 1 } },
      denials: { migrationLedgerRead: true, privatePaymentDocumentRead: true },
    });
    expect(mocks.resolve).toHaveBeenCalledWith({
      operation: 'worker-connect',
      credentialClass: 'worker',
    });
    expect(mocks.authorize).toHaveBeenCalledWith(
      { context },
      { approval: { reference: 'reviewed-private-reference' } },
    );
    expect(query.mock.calls.every(([options]) => /^(SELECT|SHOW) /.test(options.sql))).toBe(true);
    expect(query.mock.calls.every(([options]) => options.timeout === 10_000)).toBe(true);
    expect(JSON.stringify(result)).not.toMatch(/recipient|private driver|reference|token/i);
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it.each([
    ['DATABASE_CREDENTIAL_CLASS', 'runtime'],
    ['RAILWAY_GIT_COMMIT_SHA', 'c'.repeat(40)],
    ['BUILD_SHA', 'c'.repeat(40)],
    ['RAILWAY_SERVICE_ID', expected.projectId],
    ['PAID_MVP_SALES_PAUSED', 'false'],
    ['PAID_MVP_ENABLED_PRODUCT_KEYS', 'agent_launch_access'],
    ['PAID_MVP_ADMITTED_OWNERS', 'agency:1'],
    ['PAID_MVP_SALES_OPEN_UNTIL', expected.expiresAt],
  ])('refuses %s mismatch before any connection', async (key, value) => {
    vi.stubEnv(key, value);
    await expect(inspectLaunchWorker(expected)).rejects.toThrow();
    expect(mocks.createPool).not.toHaveBeenCalled();
  });

  it.each([
    '2026-10-12T13:00:00Z',
    '2026-10-12T13:30:01Z',
    '2026-10-12T15:15:00+02:00',
    '2026-02-30T13:15:00Z',
  ])('refuses expired, oversized or invalid window %s', expiresAt => {
    expect(() => assertWorkerAdmissionEnvironment({ ...expected, expiresAt })).toThrow(
      'admission-window-invalid',
    );
  });

  it('does not override hosted security or deployed-test refusals', async () => {
    mocks.testConfiguration.mockImplementation(() => {
      throw new Error('test selector');
    });
    await expect(inspectLaunchWorker(expected)).rejects.toThrow('test selector');
    expect(mocks.createPool).not.toHaveBeenCalled();
  });

  it('refuses target mismatch and missing protected approval before connecting', async () => {
    mocks.resolve.mockReturnValueOnce({
      context: { ...context, targetFingerprintHash: 'c'.repeat(64) },
    });
    await expect(inspectLaunchWorker(expected)).rejects.toThrow('admission-target-mismatch');
    mocks.authorize.mockImplementationOnce(() => {
      throw new Error('approval absent');
    });
    await expect(inspectLaunchWorker(expected)).rejects.toThrow('approval absent');
    expect(mocks.createPool).not.toHaveBeenCalled();
  });

  it('rejects privileged account grants and drains the connection', async () => {
    const original = query.getMockImplementation()!;
    query.mockImplementation(options =>
      options.sql === 'SHOW GRANTS'
        ? Promise.resolve([
            [
              ...expectedGrants.map(value => ({ grant: value })),
              {
                grant: `GRANT SELECT ON \`propertylistify_database\`.* TO '${B08_WORKER_IDENTITY}'@'%'`,
              },
            ],
            [],
          ])
        : original(options),
    );
    await expect(inspectLaunchWorker(expected)).rejects.toThrow('privilege allowlist');
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it.each([
    {
      selected_database: 'other_database',
      current_identity: `${B08_WORKER_IDENTITY}@%`,
      timezone: '+00:00',
    },
    {
      selected_database: context.databaseName,
      current_identity: 'propertylistify_app_runtime@%',
      timezone: '+00:00',
    },
    {
      selected_database: context.databaseName,
      current_identity: `${B08_WORKER_IDENTITY}@%`,
      timezone: 'SYSTEM',
    },
  ])('rejects an unexpected physical session before reading queues', async session => {
    query.mockResolvedValueOnce([[session], []]);
    await expect(inspectLaunchWorker(expected)).rejects.toThrow('admission-session-mismatch');
    expect(query).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it.each(['', 'TLSv1', 'TLSv1.1'])('rejects missing or obsolete actual TLS %s', async version => {
    const original = query.getMockImplementation()!;
    query.mockImplementation(options =>
      options.sql.startsWith('SHOW SESSION')
        ? Promise.resolve([[{ Value: version }], []])
        : original(options),
    );
    await expect(inspectLaunchWorker(expected)).rejects.toThrow('admission-tls-mismatch');
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it.each([
    { state: 'invented_state', total: 1 },
    { state: 'pending', total: 'NaN' },
    { state: 'pending', total: -1 },
  ])('fails visibly on malformed queue evidence', async row => {
    const original = query.getMockImplementation()!;
    query.mockImplementation(options =>
      options.sql.includes('GROUP BY') ? Promise.resolve([[row], []]) : original(options),
    );
    await expect(inspectLaunchWorker(expected)).rejects.toThrow('admission-queue-result-invalid');
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it.each([
    undefined,
    { code: 'ER_NO_SUCH_TABLE', errno: 1146 },
    { code: 'ER_ACCESS_DENIED_ERROR', errno: 1045 },
  ])('does not treat an allowed read or unrelated failure as denial evidence', async error => {
    const original = query.getMockImplementation()!;
    query.mockImplementation(options =>
      options.sql.includes('LIMIT 0')
        ? error
          ? Promise.reject(error)
          : Promise.resolve([[], []])
        : original(options),
    );
    await expect(inspectLaunchWorker(expected)).rejects.toBeDefined();
    expect(query.mock.calls.some(([options]) => options.sql.includes('GROUP BY'))).toBe(false);
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it('checks the window between reads and closes after expiry', async () => {
    const original = query.getMockImplementation()!;
    query.mockImplementationOnce(async options => {
      const result = await original(options);
      vi.setSystemTime(now + 30 * 60_000);
      return result;
    });
    await expect(inspectLaunchWorker(expected)).rejects.toThrow('admission-window-invalid');
    expect(query).toHaveBeenCalledOnce();
    expect(release).toHaveBeenCalledOnce();
    expect(end).toHaveBeenCalledOnce();
  });

  it('drains the pool even when leasing a connection fails', async () => {
    mocks.createPool.mockResolvedValueOnce({
      pool: { getConnection: vi.fn().mockRejectedValue(new Error('lease failed')) },
      end,
    });
    await expect(inspectLaunchWorker(expected)).rejects.toThrow('lease failed');
    expect(end).toHaveBeenCalledOnce();
  });
});
