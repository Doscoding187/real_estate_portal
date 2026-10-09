import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runDatabaseAuthorityCommand } from '../../../../scripts/databaseAuthorityCli';
import {
  PlaceReleaseCommandFailure,
  type PlaceReleaseCommand,
} from '../../../../scripts/placeReleaseCommand';
import { PlaceReleaseFailure } from '../dataAdapters/placeRelease';

const mocks = vi.hoisted(() => ({
  operation: vi.fn(),
  end: vi.fn(),
  open: vi.fn(),
}));
vi.mock('../connectionAuthority', async original => ({
  ...(await original<typeof import('../connectionAuthority')>()),
  createAuthoritySqlConnection: (...args: unknown[]) => mocks.open(...args),
}));
vi.mock('../authorization', async original => ({
  ...(await original<typeof import('../authorization')>()),
  authorizeDatabaseOperation: () => ({ operation: 'test-boundary' }),
  protectedDatabaseApprovalFromEnvironment: () => undefined,
}));
vi.mock('../dataAdapters/placeRelease', async original => ({
  ...(await original<typeof import('../dataAdapters/placeRelease')>()),
  releaseCanonicalPlaces: (...args: unknown[]) => mocks.operation(...args),
  previewCanonicalPlaceRelease: (...args: unknown[]) => mocks.operation(...args),
}));
vi.mock('../dataAdapters/placeReleaseInspection', () => ({
  inspectPlaceReleaseTarget: (...args: unknown[]) => mocks.operation(...args),
}));
vi.mock('../context', () => ({
  resolveDatabaseAuthority: () => ({ context: { targetFingerprintHash: 'a'.repeat(64) } }),
}));

const secretError = (phase: string) =>
  Object.assign(new Error(`${phase}: mysql://user:PRIVATE_PASSWORD@host/db SQL PRIVATE_VALUE`), {
    sql: 'INSERT PRIVATE_VALUE',
    values: ['PRIVATE_VALUE'],
    credential: 'PRIVATE_PASSWORD',
  });
let stdout: ReturnType<typeof vi.spyOn>, stderr: ReturnType<typeof vi.spyOn>;
let argv: string[];
beforeEach(() => {
  argv = process.argv;
  process.argv = [
    'node',
    'databaseAuthorityCli.ts',
    'command',
    '--adapter=places',
    `--plan-digest=${'a'.repeat(64)}`,
  ];
  stdout = vi.spyOn(console, 'log').mockImplementation(() => {});
  stderr = vi.spyOn(console, 'error').mockImplementation(() => {});
  mocks.open.mockResolvedValue({ end: mocks.end });
  mocks.end.mockResolvedValue(undefined);
  mocks.operation.mockResolvedValue({ transactionOutcome: 'committed', writtenRows: 1 });
});
// Restore arguments independently of Vitest's mock lifecycle.
import { afterEach } from 'vitest';
afterEach(() => {
  process.argv = argv;
});
async function failed(command: PlaceReleaseCommand = 'release-reference:apply') {
  let caught: unknown;
  try {
    await runDatabaseAuthorityCommand(command);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(PlaceReleaseCommandFailure);
  expect(stdout).not.toHaveBeenCalled();
  expect(stderr).toHaveBeenCalledTimes(1);
  const emitted = stderr.mock.calls[0][0] as string;
  expect(emitted).not.toMatch(/PRIVATE_PASSWORD|PRIVATE_VALUE|mysql:|INSERT|stack|credential/);
  const failure = caught as PlaceReleaseCommandFailure;
  expect(JSON.parse(emitted)).toEqual(failure.record);
  expect(failure.record.automaticRetryAllowed).toBe(false);
  expect(failure.record.nextAction).toBe('stop-and-inspect');
  return failure;
}
describe('actual Place release command boundary', () => {
  it('preserves primary operation and close causes without leaking either', async () => {
    const primary = secretError('operation'),
      close = secretError('close');
    mocks.operation.mockRejectedValue(primary);
    mocks.end.mockRejectedValue(close);
    const error = await failed();
    expect(error.cause).toBe(primary);
    expect(error.connectionCloseError).toBe(close);
    expect(error.record).toMatchObject({
      transactionOutcome: 'not-started',
      primaryFailure: 'operation',
      failures: { operation: true, rollback: false, lockCleanup: false, connectionClose: true },
    });
    expect(mocks.operation).toHaveBeenCalledTimes(1);
    expect(mocks.end).toHaveBeenCalledTimes(1);
  });
  it.each([
    'not-committed',
    'commit-uncertain',
    'rollback-uncertain',
    'committed-cleanup-failed',
  ] as const)('preserves %s and each failed phase when closure also fails', async outcome => {
    const primary = secretError('primary'),
      cleanup = secretError('lock'),
      rollback = secretError('rollback');
    const release = new PlaceReleaseFailure(
      outcome,
      primary,
      cleanup,
      outcome === 'rollback-uncertain' ? rollback : undefined,
    );
    mocks.operation.mockRejectedValue(release);
    mocks.end.mockRejectedValue(secretError('close'));
    const error = await failed();
    expect(error.cause).toBe(release);
    expect((error.cause as PlaceReleaseFailure).cause).toBe(primary);
    expect(error.record).toMatchObject({
      transactionOutcome: outcome,
      primaryFailure: outcome === 'committed-cleanup-failed' ? 'lock-cleanup' : 'operation',
      failures: {
        operation: outcome !== 'committed-cleanup-failed',
        rollback: outcome === 'rollback-uncertain',
        lockCleanup: true,
        connectionClose: true,
      },
    });
    expect(mocks.operation).toHaveBeenCalledTimes(1);
    expect(mocks.end).toHaveBeenCalledTimes(1);
  });
  it('retains committed after successful COMMIT but failed connection closure', async () => {
    mocks.end.mockRejectedValue(secretError('close'));
    const error = await failed();
    expect(error.record).toMatchObject({
      transactionOutcome: 'committed',
      primaryFailure: 'connection-close',
      failures: { operation: false, rollback: false, lockCleanup: false, connectionClose: true },
    });
  });
  it('emits no success while close is pending, then succeeds after its acknowledgement', async () => {
    let close!: () => void;
    mocks.end.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          close = resolve;
        }),
    );
    const command = runDatabaseAuthorityCommand('release-reference:apply');
    await vi.waitFor(() => expect(mocks.end).toHaveBeenCalledTimes(1));
    expect(stdout).not.toHaveBeenCalled();
    expect(stderr).not.toHaveBeenCalled();
    close();
    await command;
    expect(JSON.parse(stdout.mock.calls[0][0])).toMatchObject({
      transactionOutcome: 'committed',
      connectionClosed: true,
    });
    expect(stderr).not.toHaveBeenCalled();
  });
  it.each([
    'release-reference:plan',
    'release-reference:verify',
    'release-reference:inspect',
    'places:release-preview:prepare',
    'places:release-preview:verify',
  ] as const)('routes %s through required close before printing evidence', async command => {
    mocks.operation.mockResolvedValue({ databaseMutation: false });
    mocks.end.mockRejectedValue(secretError('close'));
    expect((await failed(command)).record.transactionOutcome).toBe('not-applicable');
  });
  it('reports open failure without attempting nonexistent connection cleanup', async () => {
    mocks.open.mockRejectedValue(secretError('open'));
    expect((await failed()).record).toMatchObject({
      transactionOutcome: 'not-started',
      failures: { operation: true, connectionClose: false },
    });
    expect(mocks.operation).not.toHaveBeenCalled();
    expect(mocks.end).not.toHaveBeenCalled();
  });
  it('reports invalid required Place options without leaking errors and closes the acquired connection', async () => {
    process.argv = process.argv.filter(a => !a.startsWith('--plan-digest='));
    await failed();
    expect(mocks.operation).not.toHaveBeenCalled();
    expect(mocks.end).toHaveBeenCalledTimes(1);
  });
  it('leaves non-Place command error reporting unchanged', async () => {
    process.argv = ['node', 'cli', 'release-reference:apply', '--adapter=geography'];
    const primary = secretError('open');
    mocks.open.mockRejectedValue(primary);
    await expect(runDatabaseAuthorityCommand('release-reference:apply')).rejects.toBe(primary);
    expect(stderr).not.toHaveBeenCalled();
  });
});

describe('release failures with acknowledged connection close', () => {
  it.each(['commit-uncertain', 'rollback-uncertain', 'committed-cleanup-failed'] as const)(
    'reports %s without inventing close failure',
    async outcome => {
      const original = new PlaceReleaseFailure(
        outcome,
        secretError('operation'),
        outcome === 'committed-cleanup-failed' ? secretError('lock') : undefined,
        outcome === 'rollback-uncertain' ? secretError('rollback') : undefined,
      );
      mocks.operation.mockRejectedValue(original);
      const error = await failed();
      expect(error.cause).toBe(original);
      expect(error.record.transactionOutcome).toBe(outcome);
      expect(error.record.failures.connectionClose).toBe(false);
      expect(error.record.failures.lockCleanup).toBe(outcome === 'committed-cleanup-failed');
    },
  );
});
