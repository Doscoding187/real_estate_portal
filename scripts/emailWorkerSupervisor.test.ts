import { describe, expect, it, vi } from 'vitest';
import { runEmailSupervisor, summarizeEmailWorkerBacklog } from './emailWorkerSupervisor';

describe('email worker backlog attention contract', () => {
  it('flags human-reconciliation states and stale claims for platform alerting', () => {
    expect(
      summarizeEmailWorkerBacklog([
        { state: 'pending', stale: false },
        { state: 'retryable_failed', stale: false },
        { state: 'claimed', stale: false },
      ]),
    ).toEqual({ pending: 1, retryable_failed: 1, claimed: 1, stale: 0, attention: false });
    expect(
      summarizeEmailWorkerBacklog([{ state: 'permanent_failed', stale: false }]),
    ).toMatchObject({ permanent_failed: 1, attention: true });
    expect(summarizeEmailWorkerBacklog([{ state: 'unknown', stale: false }])).toMatchObject({
      unknown: 1,
      attention: true,
    });
    expect(summarizeEmailWorkerBacklog([{ state: 'claimed', stale: true }])).toMatchObject({
      claimed: 1,
      stale: 1,
      attention: true,
    });
  });
});

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

  it('stops during the idle wait without starting another batch', async () => {
    const controller = new AbortController();
    const close = vi.fn(async () => {});
    let batches = 0;
    await runEmailSupervisor(controller.signal, {
      async batch() {
        batches += 1;
        setTimeout(() => controller.abort(), 10);
        return { delivered: batches };
      },
      close,
      log: vi.fn(),
      pollMs: 1_000,
    });
    expect(batches).toBe(1);
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
