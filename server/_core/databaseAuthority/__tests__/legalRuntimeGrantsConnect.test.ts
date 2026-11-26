import { afterAll, describe, expect, it, vi } from 'vitest';
import { rmSync } from 'node:fs';
import { makeFrozen0197Root, MODEL_DIGEST_0197 } from './frozen0197Root';

// This file mocks the authorization module, which the global DB setup (vitest.setup.ts) also uses to open
// its connection. It needs no database, so opt out of that setup for this file only and restore afterwards.
const previousSkipDbInit = vi.hoisted(() => {
  const previous = process.env.SKIP_DB_INIT;
  process.env.SKIP_DB_INIT = '1';
  return previous;
});
afterAll(() => {
  if (previousSkipDbInit === undefined) delete process.env.SKIP_DB_INIT;
  else process.env.SKIP_DB_INIT = previousSkipDbInit;
});

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

// The live drizzle schema has moved past 0197; the frozen-root test needs the
// 0197 model digest, the closed-release refusal test needs the live one.
const model = vi.hoisted(() => ({ frozen: false }));
vi.mock('../schemaCongruency', async importOriginal => {
  const original = await importOriginal<typeof import('../schemaCongruency')>();
  return {
    ...original,
    normalizedDesiredSchema: (...args: Parameters<typeof original.normalizedDesiredSchema>) =>
      model.frozen ? { digest: MODEL_DIGEST_0197 } : original.normalizedDesiredSchema(...args),
  };
});

import {
  applyLegalRuntimeGrants,
  legalRuntimeGrantAcknowledgement,
  legalRuntimeGrantExecutionPlan,
} from '../legalRuntimeGrants';

const SECRET = 'S3cr3t-Passw0rd';
const frozenRoot = makeFrozen0197Root();
afterAll(() => rmSync(frozenRoot, { recursive: true, force: true }));

describe('legal runtime grant connect failure', () => {
  it('refuses on the live tree: the schema source has moved past the accepted 0197 state', async () => {
    model.frozen = false;
    const plan = legalRuntimeGrantExecutionPlan();
    await expect(
      applyLegalRuntimeGrants({
        mode: 'apply',
        adminDatabaseUrl: `mysql://admin:${SECRET}@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database`,
        planDigest: plan.planDigest,
        acknowledgement: legalRuntimeGrantAcknowledgement('apply', plan.planDigest),
        observe: vi.fn(),
      }),
    ).rejects.toThrow('accepted schema source changed');
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('reports failureStage connect without leaking the driver error or secret (frozen 0197 inputs)', async () => {
    model.frozen = true;
    mocks.connect.mockRejectedValueOnce(new Error(`ECONNREFUSED mysql://admin:${SECRET}@h`));
    const plan = legalRuntimeGrantExecutionPlan(frozenRoot);
    const error = await applyLegalRuntimeGrants({
      mode: 'apply',
      adminDatabaseUrl: `mysql://admin:${SECRET}@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database`,
      planDigest: plan.planDigest,
      acknowledgement: legalRuntimeGrantAcknowledgement('apply', plan.planDigest),
      root: frozenRoot,
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
