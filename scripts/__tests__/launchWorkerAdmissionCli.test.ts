import { afterEach, expect, it, vi } from 'vitest';

const inspect = vi.hoisted(() => vi.fn());
vi.mock('../launchWorkerAdmissionCheck', () => ({ inspectLaunchWorker: inspect }));

afterEach(() => {
  vi.restoreAllMocks();
});

it('does not print a credential-bearing driver error on failure', async () => {
  const previousExitCode = process.exitCode;
  const previousArgs = process.argv;
  const log = vi.spyOn(console, 'log').mockImplementation(() => {});
  const error = vi.spyOn(console, 'error').mockImplementation(() => {});
  process.argv = ['node', 'launchWorkerAdmission.ts'];
  inspect.mockRejectedValueOnce(
    new Error('mysql://private-user:private-password@private-host/database'),
  );
  try {
    await import('../launchWorkerAdmission');
    expect(process.exitCode).toBe(2);
    expect(log).not.toHaveBeenCalled();
    expect(error).toHaveBeenCalledWith(
      JSON.stringify({
        kind: 'launch-worker-admission',
        ok: false,
        error: 'admission-refused-or-read-failed',
        deliveryAuthorized: false,
      }),
    );
    expect(JSON.stringify(error.mock.calls)).not.toMatch(
      /private-user|private-password|private-host/,
    );
  } finally {
    process.argv = previousArgs;
    process.exitCode = previousExitCode;
  }
});
