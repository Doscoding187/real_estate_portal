import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
// Positive unit cases model the previously approved window; the live registration is revoked.
vi.mock(
  '../../../../docs/database-authority/disposable-rehearsal-authorization.json',
  async importOriginal => ({
    default: { ...(await importOriginal<any>()).default, status: 'approved' },
  }),
);
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));
});
const recordState = vi.hoisted(() => ({ revoked: false }));
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>();
  return {
    ...actual,
    readFileSync: (...args: any[]) => {
      const result = (actual.readFileSync as any)(...args);
      if (String(args[0]).endsWith('/disposable-rehearsal-authorization.json')) {
        return JSON.stringify({
          ...JSON.parse(String(result)),
          status: recordState.revoked ? 'revoked' : 'approved',
        });
      }
      return result;
    },
  };
});
import { resolveDatabaseAuthority } from '../context';
import { authorizeDatabaseOperation, expectedDatabaseAcknowledgement } from '../authorization';
import { REHEARSAL, REHEARSAL_RESOURCE_ID, assertRehearsalResource } from '../rehearsalAuthority';
import { compileRehearsalProbe } from '../rehearsalProbes';
import { createAuthoritySqlConnection, createAuthorityRuntimePool } from '../connectionAuthority';
import type { DatabaseOperation } from '../types';

const url = `mysql://fixture:fixture@${REHEARSAL.hostname}/${REHEARSAL.database}`;
const binding = { resourceId: REHEARSAL_RESOURCE_ID, purpose: REHEARSAL.purpose };
function resolve(
  overrides: Parameters<typeof resolveDatabaseAuthority>[0] = { operation: 'rehearsal-regression' },
) {
  return resolveDatabaseAuthority({
    explicitDatabaseUrl: url,
    rehearsal: binding,
    credentialClass: 'runtime',
    processEnv: { NODE_ENV: 'test', APP_ENV: 'test' },
    ...overrides,
  });
}
function approve(a: ReturnType<typeof resolve>) {
  return authorizeDatabaseOperation(a, {
    approval: {
      actor: 'Edward',
      reference: REHEARSAL.purpose,
      operation: a.context.operation,
      targetFingerprintHash: a.context.targetFingerprintHash,
    },
    acknowledgement: expectedDatabaseAcknowledgement(a.context),
  });
}
const resource = () => ({
  id: REHEARSAL_RESOURCE_ID,
  name: REHEARSAL.serverName,
  type: REHEARSAL.provider,
  location: 'southafricanorth',
  systemData: { createdAt: REHEARSAL.serverCreatedAt },
  properties: {
    fullyQualifiedDomainName: REHEARSAL.hostname,
    state: 'Ready',
    fullVersion: '8.4.8',
  },
});
afterEach(() => {
  vi.useRealTimers();
  recordState.revoked = false;
});

describe('exact disposable Azure rehearsal authority', () => {
  it('permits only the explicit bound rehearsal regression operation', () => {
    const a = resolve();
    expect(a.context.targetClass).toBe('disposable-rehearsal');
    expect(approve(a).operation).toBe('rehearsal-regression');
    expect(() => assertRehearsalResource(resource())).not.toThrow();
    expect(
      compileRehearsalProbe('user.insert', [0], '12345678-1234-1234-1234-123456789abc').values[0],
    ).toBe(1900000000);
  });
  it.each([
    'mysql://fixture:fixture@propertylistify-mysql.mysql.database.azure.com/propertylistify_database',
    'mysql://fixture:fixture@gateway01.ap-northeast-1.prod.aws.tidbcloud.com/listify_property_sa',
    'mysql://fixture:fixture@another.mysql.database.azure.com/propertylistify_database',
    `mysql://fixture:fixture@${REHEARSAL.hostname}/another_database`,
    'mysql://fixture:fixture@unregistered.example.test/remote',
  ])('refuses other/protected identities: %s', explicitDatabaseUrl => {
    expect(() =>
      approve(resolve({ operation: 'rehearsal-regression', explicitDatabaseUrl })),
    ).toThrow();
  });
  it.each(['subscription', 'resource-group', 'purpose'])('refuses wrong %s binding', kind => {
    const rehearsal = { ...binding };
    if (kind === 'purpose') rehearsal.purpose = 'generic remote tests';
    else
      rehearsal.resourceId = rehearsal.resourceId.replace(
        kind === 'subscription' ? REHEARSAL.subscriptionId : REHEARSAL.resourceGroup,
        'wrong',
      );
    expect(() => approve(resolve({ operation: 'rehearsal-regression', rehearsal }))).toThrow();
  });
  it('requires an explicit URL, test mode, approval and acknowledgement', () => {
    const a = resolve();
    expect(() => authorizeDatabaseOperation(a)).toThrow();
    expect(() =>
      approve(
        resolve({
          operation: 'rehearsal-regression',
          processEnv: { NODE_ENV: 'production', APP_ENV: 'production' },
        }),
      ),
    ).toThrow();
    expect(() =>
      approve(
        resolve({
          operation: 'rehearsal-regression',
          explicitDatabaseUrl: undefined,
          processEnv: { NODE_ENV: 'test', APP_ENV: 'test', DATABASE_URL: url },
        }),
      ),
    ).toThrow();
  });
  it.each(['?ssl=false', '?sslaccept=insecure', '?rejectUnauthorized=false'])(
    'refuses unverified TLS %s',
    suffix => {
      expect(() =>
        approve(resolve({ operation: 'rehearsal-regression', explicitDatabaseUrl: url + suffix })),
      ).toThrow();
    },
  );
  it.each([
    'test-fixture',
    'runtime-connect',
    'migration-apply',
    'release-apply',
    'reference-seed',
    'reset',
    'database-dispose',
    'lifecycle-admin',
  ] as DatabaseOperation[])('refuses %s even for rehearsal', operation => {
    expect(() => approve(resolve({ operation }))).toThrow();
  });
  it('does not expose generic SQL or runtime factories with a rehearsal decision', async () => {
    const a = resolve(),
      decision = approve(a);
    await expect(createAuthoritySqlConnection(a, decision)).rejects.toThrow('authorization');
    await expect(createAuthorityRuntimePool(a, decision)).rejects.toThrow('authorization');
  });
  it('refuses a revoked registration without connecting', () => {
    recordState.revoked = true;
    expect(() => approve(resolve())).toThrow('expired, revoked or changed');
  });
  it('refuses expired authorization', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-05T00:00:00Z'));
    expect(() => approve(resolve())).toThrow('expired, revoked or changed');
  });
  it.each(['id', 'fqdn', 'createdAt', 'version', 'state'])('refuses unverifiable ARM %s', field => {
    const r = resource();
    if (field === 'id') r.id = r.id.replace(REHEARSAL.subscriptionId, 'wrong');
    if (field === 'fqdn')
      r.properties.fullyQualifiedDomainName = 'propertylistify-mysql.mysql.database.azure.com';
    if (field === 'createdAt') r.systemData.createdAt = '2026-09-29T00:00:00Z';
    if (field === 'version') r.properties.fullVersion = '5.7';
    if (field === 'state') r.properties.state = 'Updating';
    expect(() => assertRehearsalResource(r)).toThrow();
  });
  it('never compiles arbitrary DDL, SQL, identifiers or unbounded IDs', () => {
    for (const probe of [
      'DROP DATABASE propertylistify_database',
      'TRUNCATE users',
      'migration-apply',
      'SET GLOBAL sql_mode',
      'reference-seed',
    ]) {
      expect(() =>
        compileRehearsalProbe(probe as any, [], '12345678-1234-1234-1234-123456789abc'),
      ).toThrow();
    }
    for (const slot of [-1, 32, NaN, 1.5])
      expect(() =>
        compileRehearsalProbe('user.delete', [slot], '12345678-1234-1234-1234-123456789abc'),
      ).toThrow();
  });
});
