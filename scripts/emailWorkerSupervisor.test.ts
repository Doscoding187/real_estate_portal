import { describe, expect, it, vi } from 'vitest';
import { runEmailSupervisor } from './emailWorkerSupervisor';

describe('email supervisor loop', () => {
  it('repeats batches and drains the current batch on shutdown', async () => {
    const controller = new AbortController();
    const close = vi.fn(async () => {});
    const log = vi.fn();
    let batches = 0;
    await runEmailSupervisor(controller.signal, {
      async batch() {
        batches += 1;
        if (batches === 2) controller.abort();
        return { delivered: batches };
      },
      close,
      log,
      pollMs: 1_000,
    });
    expect(batches).toBe(2);
    expect(log).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledOnce();
  });

  it('closes resources and propagates a failed batch for provider restart', async () => {
    const close = vi.fn(async () => {});
    await expect(runEmailSupervisor(new AbortController().signal, {
      batch: async () => { throw new Error('dependency unavailable'); },
      close,
      log: vi.fn(),
    })).rejects.toThrow('dependency unavailable');
    expect(close).toHaveBeenCalledOnce();
  });
});
