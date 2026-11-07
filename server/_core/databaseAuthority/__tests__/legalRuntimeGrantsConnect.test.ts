import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ connect: vi.fn() }));

vi.mock('../connectionAuthority', async importOriginal => ({
  ...(await importOriginal<typeof import('../connectionAuthority')>()),
  createAuthoritySqlConnection: mocks.connect,
}));
vi.mock('../context', async importOriginal => ({
  ...(await importOriginal<typeof import('../context')>()),
  resolveDatabaseAuthority: () => ({
    context: {
      targetFingerprintHash: 'b23d640cdf242812e80a28d10bc4079a3ff0b48a05173a392b9af47853495ced',
      databaseName: 'propertylistify_database',
      operation: 'runtime-legal-grant',
      tls: { required: true, certificateVerificationRequired: true },
    },
  }),
}));
vi.mock('../authorization', async importOriginal => {
  const original = await importOriginal<typeof import('../authorization')>();
  return {
    ...original,
    protectedDatabaseApprovalFromEnvironment: () => ({
      runtimeGrantDigest: original.LEGAL_RUNTIME_GRANT_DIGEST,
    }),
    authorizeDatabaseOperation: () => ({}),
  };
});

import {
  applyLegalRuntimeGrants,
  legalRuntimeGrantAcknowledgement,
  legalRuntimeGrantExecutionPlan,
} from '../legalRuntimeGrants';

const SECRET = 'S3cr3t-Passw0rd';

describe('legal runtime grant connect failure', () => {
  it('reports failureStage connect without leaking the driver error or secret', async () => {
    mocks.connect.mockRejectedValueOnce(new Error(`ECONNREFUSED mysql://admin:${SECRET}@h`));
    const plan = legalRuntimeGrantExecutionPlan();
    const error = await applyLegalRuntimeGrants({
      mode: 'apply',
      adminDatabaseUrl: `mysql://admin:${SECRET}@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database`,
      planDigest: plan.planDigest,
      acknowledgement: legalRuntimeGrantAcknowledgement('apply', plan.planDigest),
      observe: vi.fn(),
    }).catch(e => e);
    expect(error).toMatchObject({
      name: 'LegalRuntimeGrantFailure',
      failureStage: 'connect',
      safeToReplay: false,
      progress: { outcome: 'not-started', completedStatements: 0 },
    });
    expect(error.message).not.toContain(SECRET);
    expect(mocks.connect).toHaveBeenCalledOnce();
  });
});
