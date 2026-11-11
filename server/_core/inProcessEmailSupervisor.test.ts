import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { startInProcessEmailSupervisor } from './inProcessEmailSupervisor';

const base = { NODE_ENV: 'production' } as NodeJS.ProcessEnv;

describe('production image boundary', () => {
  it.each(['inProcessEmailSupervisor.ts', 'emailWorkerLoop.ts'])(
    '%s does not import from scripts/',
    file => {
      const source = readFileSync(path.resolve(__dirname, file), 'utf8');
      expect(source).not.toMatch(/from\s+['"][^'"]*scripts\//);
    },
  );
});

describe('in-process email supervisor', () => {
  it('starts when configured and logs one start line', async () => {
    const log = vi.fn();
    const batch = vi.fn(async () => ({ ok: true }));
    const handle = startInProcessEmailSupervisor({ env: base, isConfigured: () => true, batch, log });
    expect(handle).not.toBeNull();
    expect(log).toHaveBeenCalledWith('[EmailSupervisor] in-process started pollMs=10000');
    await handle!.stop();
    expect(batch).toHaveBeenCalled();
  });

  it.each([
    ['opt-out', { ...base, EMAIL_WORKER_IN_PROCESS: 'false' }, () => true],
    ['unconfigured', base, () => false],
    ['test env', { NODE_ENV: 'test' } as NodeJS.ProcessEnv, () => true],
  ])('does not start: %s', (_name, env, isConfigured) => {
    const batch = vi.fn(async () => ({}));
    const log = vi.fn();
    expect(startInProcessEmailSupervisor({ env, isConfigured, batch, log })).toBeNull();
    expect(batch).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining('in-process disabled'));
  });

  it('logs a failing batch without secrets and keeps polling until aborted', async () => {
    vi.useFakeTimers();
    try {
      const log = vi.fn();
      const batch = vi
        .fn()
        .mockRejectedValueOnce(new Error('boom'))
        .mockResolvedValue({ ok: true });
      const handle = startInProcessEmailSupervisor({
        env: { ...base, EMAIL_WORKER_POLL_MS: '1000' },
        isConfigured: () => true,
        batch,
        log,
      })!;
      await vi.advanceTimersByTimeAsync(0);
      expect(log).toHaveBeenCalledWith('[EmailSupervisor] batch failed Error: boom');
      await vi.advanceTimersByTimeAsync(1000);
      expect(batch).toHaveBeenCalledTimes(2);
      await handle.stop();
      await vi.advanceTimersByTimeAsync(5000);
      expect(batch).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
