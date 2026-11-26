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
  rmSync(frozenRoot, { recursive: true, force: true });
});

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
// The live drizzle schema has moved past 0197; the frozen-root test needs the
// 0197 model digest, the closed-release refusal test needs the live one.
const model = vi.hoisted(() => ({ frozen: false, digest: '' }));
vi.mock('../schemaCongruency', async importOriginal => {
  const original = await importOriginal<typeof import('../schemaCongruency')>();
  return {
    ...original,
    normalizedDesiredSchema: (...args: Parameters<typeof original.normalizedDesiredSchema>) =>
      model.frozen ? { digest: model.digest } : original.normalizedDesiredSchema(...args),
  };
});

const mockDigest = vi.hoisted(() => ({ value: '' }));
const frozenRoot = makeFrozen0197Root();

import {
  applyRuntimeGrant0197,
  runtimeGrant0197Acknowledgement,
  runtimeGrant0197ApplyPlan,
  Runtime0197GrantFailure,
} from '../runtimeGrant0197Apply';

const ADMIN_URL =
  'mysql://admin:S3cr3t-Passw0rd@propertylistify-mysql.mysql.database.azure.com:3306/propertylistify_database';

describe('0197 runtime grant connect failure', () => {
  it('surfaces failureStage connect when the connection cannot be created (frozen 0197 inputs)', async () => {
    model.frozen = true;
    model.digest = MODEL_DIGEST_0197;
    const plan = runtimeGrant0197ApplyPlan(frozenRoot);
    mockDigest.value = plan.planDigest;
    const error = await applyRuntimeGrant0197({
      mode: 'apply',
      adminDatabaseUrl: ADMIN_URL,
      planDigest: plan.planDigest,
      acknowledgement: runtimeGrant0197Acknowledgement('apply', plan.planDigest),
      root: frozenRoot,
      observe: vi.fn(),
    }).catch(e => e);
    expect(error).toBeInstanceOf(Runtime0197GrantFailure);
    expect(error.failureStage).toBe('connect');
    expect(error.progress.outcome).toBe('not-started');
    expect(error.message).not.toContain('S3cr3t');
  });

  it('refuses on the live tree: the 0197 grants are already applied and the schema source has moved on', async () => {
    model.frozen = false;
    const plan = runtimeGrant0197ApplyPlan();
    mockDigest.value = plan.planDigest;
    await expect(
      applyRuntimeGrant0197({
        mode: 'apply',
        adminDatabaseUrl: ADMIN_URL,
        planDigest: plan.planDigest,
        acknowledgement: runtimeGrant0197Acknowledgement('apply', plan.planDigest),
        observe: vi.fn(),
      }),
    ).rejects.toThrow('accepted schema source changed');
  });

  it('still catches live schema drift: the live model digest equals the current 0200 pin', async () => {
    const actual = await vi.importActual<typeof import('../schemaCongruency')>('../schemaCongruency');
    const schema = await import('../../../../drizzle/schema');
    const { runtimeGrant0200Plan } = await import('../runtimeGrant0200Plan');
    const live = actual.normalizedDesiredSchema(schema).digest;
    expect(live).toBe(runtimeGrant0200Plan().expectedModelDigest);
    expect(live).not.toBe(MODEL_DIGEST_0197);
  });
});
