import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createConnection: vi.fn(),
  testActive: false,
  verifyAzure: vi.fn(),
  sourceBinding: vi.fn(),
}));
vi.mock('mysql2/promise', async importOriginal => {
  const actual = await importOriginal<typeof import('mysql2/promise')>();
  mocks.createConnection.mockImplementation((config: any) => {
    if (mocks.testActive) throw new Error('Rehearsal test attempted a MySQL connection.');
    return actual.default.createConnection(config);
  });
  return { default: { ...actual.default, createConnection: mocks.createConnection } };
});
vi.mock('../rehearsalAuthority', async importOriginal => ({
  ...(await importOriginal<any>()),
  assertRehearsalSourceBinding: mocks.sourceBinding,
  verifyRehearsalResource: mocks.verifyAzure,
}));

// Vitest's global setup runs before tests and must use its real disposable DB.
// During tests, turn the mock into a hard stop so no rehearsal socket can open.
beforeEach(() => {
  mocks.testActive = true;
  mocks.createConnection.mockClear();
});

import {
  createAuthorityRehearsalSession,
  createAuthoritySqlConnection,
} from '../connectionAuthority';
import { authorizeDatabaseOperation } from '../authorization';
import { resolveDatabaseAuthority } from '../context';
import { REHEARSAL, REHEARSAL_RESOURCE_ID } from '../rehearsalAuthority';
import type { AuthorizedDatabaseOperation } from '../authorization';

function authority() {
  return resolveDatabaseAuthority({
    operation: 'rehearsal-regression',
    explicitDatabaseUrl: `mysql://fixture:fixture@${REHEARSAL.hostname}/${REHEARSAL.database}`,
    credentialClass: 'runtime',
    processEnv: { NODE_ENV: 'test', APP_ENV: 'test' },
    rehearsal: { resourceId: REHEARSAL_RESOURCE_ID, purpose: REHEARSAL.purpose },
  });
}

describe('revoked disposable rehearsal connection boundary', () => {
  it('checks the source binding during exact target resolution', () => {
    const resolved = authority();
    expect(resolved.context.targetClass).toBe('disposable-rehearsal');
    expect(mocks.sourceBinding).toHaveBeenCalledTimes(1);
    expect(mocks.createConnection).not.toHaveBeenCalled();
  });

  it('fails target resolution before any connection when source binding mismatches', () => {
    mocks.sourceBinding.mockImplementationOnce(() => {
      throw new Error('guarded source digest mismatch');
    });
    expect(() => authority()).toThrow('guarded source digest mismatch');
    expect(mocks.createConnection).not.toHaveBeenCalled();
    expect(mocks.verifyAzure).not.toHaveBeenCalled();
  });

  it('refuses legacy regression authorization before Azure or MySQL access', async () => {
    const resolved = authority();
    expect(() =>
      authorizeDatabaseOperation(resolved, {
        approval: {
          actor: 'reviewer',
          reference: REHEARSAL.purpose,
          operation: resolved.context.operation,
          targetFingerprintHash: resolved.context.targetFingerprintHash,
        },
      }),
    ).toThrow('expired, revoked or changed');

    const forged = {
      decisionVersion: 1,
      decisionId: 'forged',
      contextId: resolved.context.contextId,
      operation: 'rehearsal-regression',
      targetFingerprintHash: resolved.context.targetFingerprintHash,
      targetClass: 'disposable-rehearsal',
      credentialClass: 'runtime',
      approvalReference: REHEARSAL.purpose,
      approvalActor: 'reviewer',
      evidenceRule: 'none',
    } as unknown as AuthorizedDatabaseOperation;
    await expect(createAuthorityRehearsalSession(resolved, forged)).rejects.toThrow(
      'authorization is absent or mismatched',
    );
    await expect(createAuthoritySqlConnection(resolved, forged)).rejects.toThrow(
      'authorization is absent or mismatched',
    );
    expect(mocks.verifyAzure).not.toHaveBeenCalled();
    expect(mocks.createConnection).not.toHaveBeenCalled();
  });
});
