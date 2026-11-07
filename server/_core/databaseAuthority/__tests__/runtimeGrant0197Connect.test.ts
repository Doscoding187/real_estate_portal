import { describe, expect, it, vi } from 'vitest';

vi.mock('../authorization', async importOriginal => ({
  ...(await importOriginal<typeof import('../authorization')>()),
  protectedDatabaseApprovalFromEnvironment: () => ({ runtimeGrantDigest: mockDigest.value }),
  authorizeDatabaseOperation: () => ({}),
  expectedDatabaseAcknowledgement: () => 'ack',
}));
vi.mock('../context', async importOriginal => ({
  ...(await importOriginal<typeof import('../context')>()),
  resolveDatabaseAuthority: () => ({
    context: {
      databaseName: 'propertylistify_database',
      tls: { required: true, certificateVerificationRequired: true },
    },
  }),
}));
vi.mock('../connectionAuthority', async importOriginal => ({
  ...(await importOriginal<typeof import('../connectionAuthority')>()),
  createAuthoritySqlConnection: vi.fn(async () => {
    throw new Error('ECONNREFUSED mysql://admin:S3cr3t-Passw0rd@host');
  }),
}));

const mockDigest = vi.hoisted(() => ({ value: '' }));

import {
  applyRuntimeGrant0197,
  runtimeGrant0197Acknowledgement,
  runtimeGrant0197ApplyPlan,
  Runtime0197GrantFailure,
} from '../runtimeGrant0197Apply';

describe('0197 runtime grant connect failure', () => {
  it('surfaces failureStage connect when the connection cannot be created', async () => {
    const plan = runtimeGrant0197ApplyPlan();
    mockDigest.value = plan.planDigest;
    const error = await applyRuntimeGrant0197({
      mode: 'apply',
      adminDatabaseUrl:
        'mysql://admin:S3cr3t-Passw0rd@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database',
      planDigest: plan.planDigest,
      acknowledgement: runtimeGrant0197Acknowledgement('apply', plan.planDigest),
      observe: vi.fn(),
    }).catch(e => e);
    expect(error).toBeInstanceOf(Runtime0197GrantFailure);
    expect(error.failureStage).toBe('connect');
    expect(error.progress.outcome).toBe('not-started');
    expect(error.message).not.toContain('S3cr3t');
  });
});
