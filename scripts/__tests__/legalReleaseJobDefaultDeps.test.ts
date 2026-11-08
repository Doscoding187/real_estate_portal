import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

// Opt out of the global DB setup for this file only; no database is needed.
const previousSkipDbInit = vi.hoisted(() => {
  const previous = process.env.SKIP_DB_INIT;
  process.env.SKIP_DB_INIT = '1';
  return previous;
});
afterAll(() => {
  if (previousSkipDbInit === undefined) delete process.env.SKIP_DB_INIT;
  else process.env.SKIP_DB_INIT = previousSkipDbInit;
});

const mocks = vi.hoisted(() => ({
  readIdentity: vi.fn(),
  resolveAuthority: vi.fn(),
  approvalFromEnv: vi.fn(),
  authorize: vi.fn(),
  connect: vi.fn(),
  complete: vi.fn(),
}));

vi.mock('../../server/_core/databaseAuthority/worktreeIdentity', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/_core/databaseAuthority/worktreeIdentity')>()),
  readInstallerWorktreeIdentity: mocks.readIdentity,
}));
vi.mock('../../server/_core/databaseAuthority/context', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/_core/databaseAuthority/context')>()),
  resolveDatabaseAuthority: mocks.resolveAuthority,
}));
vi.mock('../../server/_core/databaseAuthority/authorization', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/_core/databaseAuthority/authorization')>()),
  protectedDatabaseApprovalFromEnvironment: mocks.approvalFromEnv,
  authorizeDatabaseOperation: mocks.authorize,
  expectedDatabaseAcknowledgement: () => 'ack',
}));
vi.mock('../../server/_core/databaseAuthority/connectionAuthority', async importOriginal => ({
  ...(await importOriginal<typeof import('../../server/_core/databaseAuthority/connectionAuthority')>()),
  createAuthoritySqlConnection: mocks.connect,
}));
vi.mock('../legalReleaseCommand', async importOriginal => ({
  ...(await importOriginal<typeof import('../legalReleaseCommand')>()),
  completeLegalReleaseCommand: mocks.complete,
}));

import {
  LEGAL_JOB_ENV,
  defaultLegalReleaseJobDeps,
  legalReleaseFailureLine,
  runLegalReleaseJob,
} from '../legalReleaseJob';
import { LegalReleaseOutcomeUnknown } from '../../server/_core/databaseAuthority/legalReleaseInstallation';
import { stableDigest } from '../../server/_core/databaseAuthority/dataAdapters/common';

const packet = { fake: true };
const planEnv = {
  [LEGAL_JOB_ENV.mode]: 'plan',
  [LEGAL_JOB_ENV.effectiveAt]: '2026-11-08T10:00:00.000Z',
  [LEGAL_JOB_ENV.validUntil]: '2026-11-08T10:30:00.000Z',
  [LEGAL_JOB_ENV.previousBundle]: 'none',
};
const applyEnv = {
  ...planEnv,
  [LEGAL_JOB_ENV.mode]: 'apply',
  [LEGAL_JOB_ENV.packetDigest]: stableDigest(packet),
  [LEGAL_JOB_ENV.planDigest]: 'plan-digest',
  [LEGAL_JOB_ENV.ack]: 'the-ack',
};

async function lineFor(env: Record<string, string>) {
  const deps = {
    ...defaultLegalReleaseJobDeps(),
    preparePacket: () => packet,
  } as unknown as Parameters<typeof runLegalReleaseJob>[1];
  try {
    await runLegalReleaseJob(env, deps);
  } catch (caught) {
    return legalReleaseFailureLine(caught);
  }
  throw new Error('expected failure');
}

describe('step tagging through the real default job deps', () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
    mocks.readIdentity.mockReturnValue({ clean: true, head: 'a'.repeat(40) });
    mocks.resolveAuthority.mockReturnValue({ authority: true });
    mocks.approvalFromEnv.mockReturnValue({ approval: true });
    mocks.authorize.mockReturnValue({ decision: true });
    mocks.connect.mockResolvedValue({ connection: true });
  });

  it('tags installer-identity refusals and prints the message', async () => {
    const message = 'Legal-release installer refused: it must not run inside an app replica.';
    mocks.readIdentity.mockImplementation(() => {
      throw new Error(message);
    });
    expect(await lineFor(planEnv)).toMatchObject({ stage: 'plan', step: 'installer-identity', message });
  });

  it('tags authorize refusals', async () => {
    mocks.authorize.mockImplementation(() => {
      throw new Error('Database operation refused: x');
    });
    expect(await lineFor(planEnv)).toMatchObject({
      stage: 'plan',
      step: 'authorize',
      message: 'Database operation refused: x',
    });
  });

  it('tags connect driver errors with code and no message', async () => {
    mocks.connect.mockRejectedValue(
      Object.assign(new Error('connect ECONNREFUSED 10.0.0.1:3306'), { code: 'ECONNREFUSED' }),
    );
    const line = await lineFor(planEnv);
    expect(line).toMatchObject({ stage: 'plan', step: 'connect', code: 'ECONNREFUSED' });
    expect(line).not.toHaveProperty('message');
    expect(JSON.stringify(line)).not.toContain('10.0.0.1');
  });

  it('tags an unknown apply outcome at step run', async () => {
    mocks.complete.mockRejectedValue(new LegalReleaseOutcomeUnknown(new Error('lost')));
    const line = await lineFor(applyEnv);
    expect(line).toMatchObject({
      stage: 'apply',
      step: 'run',
      outcomeUnknown: true,
      safeToReplay: false,
    });
  });
});
