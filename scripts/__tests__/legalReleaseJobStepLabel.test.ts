import { afterAll, describe, expect, it, vi } from 'vitest';

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

import {
  LEGAL_JOB_ENV,
  legalReleaseFailureLine,
  runLegalReleaseJob,
  type LegalReleaseJobDeps,
} from '../legalReleaseJob';

const env = {
  [LEGAL_JOB_ENV.mode]: 'plan',
  [LEGAL_JOB_ENV.effectiveAt]: '2026-11-08T10:00:00.000Z',
  [LEGAL_JOB_ENV.validUntil]: '2026-11-08T10:30:00.000Z',
  [LEGAL_JOB_ENV.previousBundle]: 'none',
};

function tagged(error: Error, step: string, extra: Record<string, unknown> = {}) {
  Object.assign(error, extra);
  Object.defineProperty(error, 'legalJobStep', { value: step, enumerable: false });
  return error;
}

async function failureFor(error: Error) {
  const deps = {
    preparePacket: () => ({ fake: true }),
    install: vi.fn(),
    root: '/tmp',
    runOperation: async () => {
      throw error;
    },
  } as unknown as LegalReleaseJobDeps;
  try {
    await runLegalReleaseJob(env, deps);
  } catch (caught) {
    return legalReleaseFailureLine(caught);
  }
  throw new Error('expected failure');
}

describe('legal release job failure step label', () => {
  it('prints step and library message for installer refusal', async () => {
    const line = await failureFor(
      tagged(new Error('Legal-release installer refused: dirty tree'), 'installer-identity'),
    );
    expect(line).toMatchObject({
      stage: 'plan',
      step: 'installer-identity',
      message: 'Legal-release installer refused: dirty tree',
      safeToReplay: false,
    });
  });

  it('prints code but never driver message', async () => {
    const line = await failureFor(
      tagged(
        new Error("SELECT command denied to user 'x'@'h' for table 'y'"),
        'run',
        { code: 'ER_TABLEACCESS_DENIED_ERROR', sqlState: '42000' },
      ),
    );
    expect(line.code).toBe('ER_TABLEACCESS_DENIED_ERROR');
    expect(line.step).toBe('run');
    expect(line).not.toHaveProperty('message');
    const text = JSON.stringify(line);
    expect(text).not.toContain("'x'");
    expect(text).not.toContain('for table');
  });

  it('drops codes with an invalid shape', async () => {
    const line = await failureFor(tagged(new Error('boom'), 'connect', { code: 'mysql://user:pw@h' }));
    expect(line).not.toHaveProperty('code');
    expect(JSON.stringify(line)).not.toContain('pw@h');
  });

  it('prints database operation refusals', async () => {
    const line = await failureFor(
      tagged(new Error('Database operation refused: approval missing'), 'authorize'),
    );
    expect(line).toMatchObject({
      step: 'authorize',
      message: 'Database operation refused: approval missing',
    });
  });

  it('driver errors never get a message even if text matches a safe prefix', async () => {
    const line = await failureFor(
      tagged(new Error('Database operation refused: x'), 'run', { code: 'ECONNREFUSED' }),
    );
    expect(line).not.toHaveProperty('message');
    expect(line.code).toBe('ECONNREFUSED');
  });
});
