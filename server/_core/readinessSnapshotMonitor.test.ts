import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ReadinessSnapshotMonitor, type ReadinessMonitorEvent } from './readinessSnapshotMonitor';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
type Report = { ready: boolean; target: string };
const green: Report = { ready: true, target: 'azure-a' };

describe('bounded readiness snapshots', () => {
  let monitor: ReadinessSnapshotMonitor<Report>;
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });
  afterEach(async () => {
    await monitor?.stop();
    vi.useRealTimers();
  });
  function create(
    read: () => Promise<Report>,
    contextKey = () => 'azure-a',
    observe?: (event: ReadinessMonitorEvent) => void,
  ) {
    monitor = new ReadinessSnapshotMonitor({
      read,
      observe,
      classify: value => (value.ready ? 'ready' : 'not-ready'),
      contextKey,
      maxAgeMs: 30_000,
      refreshDelayMs: 5_000,
    });
    return monitor;
  }

  it('answers immediately while one slow strict assessment serves concurrent probes', async () => {
    const work = deferred<Report>();
    const read = vi.fn(() => work.promise);
    create(read);
    for (let i = 0; i < 100; i++) expect(monitor.getSnapshot()).toBeNull();
    await vi.advanceTimersByTimeAsync(12_000);
    expect(read).toHaveBeenCalledTimes(1);
    expect(monitor.getSnapshot()).toBeNull();
    work.resolve(green);
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getSnapshot()).toEqual(green);
  });

  it('refreshes in the background and replaces a positive result with a negative verdict', async () => {
    const refresh = deferred<Report>();
    const read = vi.fn().mockResolvedValueOnce(green).mockReturnValueOnce(refresh.promise);
    create(read);
    expect(monitor.getSnapshot()).toBeNull();
    await vi.advanceTimersByTimeAsync(5_000);
    expect(read).toHaveBeenCalledTimes(2);
    expect(monitor.getSnapshot()).toEqual(green);
    refresh.resolve({ ready: false, target: 'azure-a' });
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getSnapshot()).toEqual({ ready: false, target: 'azure-a' });
  });

  it('keeps completed strict verification fresh across observed Azure sweep durations', async () => {
    const durations = [12_500, 14_500, 12_800, 13_200];
    let calls = 0;
    let active = 0;
    let peakActive = 0;
    create(
      () =>
        new Promise(resolve => {
          active += 1;
          peakActive = Math.max(peakActive, active);
          const duration = durations[calls++ % durations.length];
          setTimeout(() => {
            active -= 1;
            resolve(green);
          }, duration);
        }),
    );
    try {
      expect(monitor.getSnapshot()).toBeNull();
      await vi.advanceTimersByTimeAsync(12_500);
      for (let elapsed = 0; elapsed < 60_000; elapsed += 500) {
        expect(monitor.getSnapshot()).toEqual(green);
        await vi.advanceTimersByTimeAsync(500);
      }
      expect(calls).toBeGreaterThanOrEqual(4);
      expect(peakActive).toBe(1);
    } finally {
      const stopped = monitor.stop();
      await vi.advanceTimersByTimeAsync(30_000);
      await stopped;
    }
  });

  it('invalidates the last green result when refresh fails', async () => {
    const read = vi
      .fn()
      .mockResolvedValueOnce(green)
      .mockRejectedValueOnce(new Error('connection lost'));
    create(read);
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getSnapshot()).toEqual(green);
    await vi.advanceTimersByTimeAsync(5_000);
    // Start a fresh attempt after the observed failure; no stale positive response.
    read.mockResolvedValue(green);
    expect(monitor.getSnapshot()).toBeNull();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('expires results while revalidation is still running', async () => {
    const refresh = deferred<Report>();
    create(vi.fn().mockResolvedValueOnce(green).mockReturnValue(refresh.promise));
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(29_999);
    expect(monitor.getSnapshot()).toEqual(green);
    await vi.advanceTimersByTimeAsync(1);
    expect(monitor.getSnapshot()).toBeNull();
    refresh.resolve(green);
    await vi.advanceTimersByTimeAsync(0);
  });

  it('includes assessment duration in the freshness bound', async () => {
    const work = deferred<Report>();
    create(() => work.promise);
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(30_000);
    work.resolve(green);
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getSnapshot()).toBeNull();
    await vi.advanceTimersByTimeAsync(0);
  });

  it('discards a completed result after the target context changes', async () => {
    const work = deferred<Report>();
    let target = 'azure-a';
    const read = vi
      .fn()
      .mockReturnValueOnce(work.promise)
      .mockResolvedValue({ ready: true, target: 'azure-b' });
    create(read, () => target);
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(0);
    target = 'azure-b';
    expect(monitor.getSnapshot()).toBeNull();
    work.resolve(green);
    await vi.advanceTimersByTimeAsync(1);
    expect(monitor.getSnapshot()).toEqual({ ready: true, target: 'azure-b' });
    expect(read).toHaveBeenCalledTimes(2);
  });

  it('stops background reads and drains the current authorized assessment', async () => {
    const work = deferred<Report>();
    const read = vi.fn(() => work.promise);
    create(read);
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(0);
    const stopped = monitor.stop();
    expect(monitor.getSnapshot()).toBeNull();
    work.resolve(green);
    await stopped;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(read).toHaveBeenCalledTimes(1);
  });
  it('correlates completed negative verdicts without serializing their content', async () => {
    const events: ReadinessMonitorEvent[] = [];
    const work = deferred<Report>();
    create(
      () => work.promise,
      undefined,
      event => events.push(event),
    );
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(125);
    work.resolve({ ready: false, target: 'secret-target' });
    await vi.advanceTimersByTimeAsync(0);
    const start = events.find(event => event.event === 'assessment-started')!;
    const end = events.find(event => event.event === 'assessment-completed')!;
    expect(end).toMatchObject({
      assessmentId: start.assessmentId,
      assessmentStartedAt: 0,
      assessmentCompletedAt: 125,
      durationMs: 125,
      inFlight: true,
      reason: 'not-ready',
    });
    expect(JSON.stringify(events)).not.toContain('secret-target');
  });

  it('distinguishes initial absence, expiration and throws, bounding repeated probe logs', async () => {
    const events: ReadinessMonitorEvent[] = [];
    const refresh = deferred<Report>();
    create(
      vi.fn().mockResolvedValueOnce(green).mockReturnValue(refresh.promise),
      undefined,
      event => events.push(event),
    );
    for (let i = 0; i < 100; i++) monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getSnapshot()).toEqual(green);
    await vi.advanceTimersByTimeAsync(30_000);
    for (let i = 0; i < 100; i++) expect(monitor.getSnapshot()).toBeNull();
    refresh.reject(new Error('password-secret'));
    await vi.advanceTimersByTimeAsync(0);
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(0);
    expect(
      events.filter(event => event.event === 'snapshot-unavailable').map(event => event.reason),
    ).toEqual(['no-snapshot', 'expired', 'assessment-threw']);
    expect(events.find(event => event.event === 'assessment-threw')).toMatchObject({
      reason: 'assessment-threw',
      durationMs: 25_000,
    });
    expect(JSON.stringify(events)).not.toContain('password-secret');
  });

  it('records context invalidation and discards the old completion', async () => {
    const events: ReadinessMonitorEvent[] = [];
    let context = 'secret-a';
    const work = deferred<Report>();
    create(
      () => work.promise,
      () => context,
      event => events.push(event),
    );
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(0);
    context = 'secret-b';
    monitor.getSnapshot();
    work.resolve(green);
    await vi.advanceTimersByTimeAsync(0);
    expect(
      events.filter(event => event.reason === 'context-changed').map(event => event.event),
    ).toEqual(['context-invalidated', 'snapshot-unavailable', 'assessment-completed']);
    expect(JSON.stringify(events)).not.toContain('secret-');
  });

  it('observer failures cannot turn a ready assessment into a failure', async () => {
    create(
      async () => green,
      undefined,
      () => {
        throw new Error('logger failed');
      },
    );
    expect(monitor.getSnapshot()).toBeNull();
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getSnapshot()).toEqual(green);
  });

  it('runs one verification while callers poll an in-flight assessment', async () => {
    const work = deferred<Report>();
    const read = vi.fn(() => work.promise);
    create(read);
    for (let i = 0; i < 50; i++) expect(monitor.getSnapshot()).toBeNull();
    await vi.advanceTimersByTimeAsync(10_000);
    expect(read).toHaveBeenCalledTimes(1);
    work.resolve(green);
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getSnapshot()).toEqual(green);
  });

  it('correlates each completion with the evidence it replaces', async () => {
    const events: ReadinessMonitorEvent[] = [];
    const slow = deferred<Report>();
    create(
      vi.fn().mockResolvedValueOnce(green).mockReturnValueOnce(slow.promise),
      undefined,
      event => events.push(event),
    );
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(0);
    const first = events.filter(event => event.event === 'assessment-completed');
    expect(first[0]).toMatchObject({ snapshotAssessmentId: null, snapshotAgeMs: null });
    const firstId = first[0].assessmentId;
    // Second sweep starts after the 5s refresh delay and finishes after the first has expired.
    await vi.advanceTimersByTimeAsync(31_000);
    slow.resolve(green);
    await vi.advanceTimersByTimeAsync(0);
    const second = events.filter(event => event.event === 'assessment-completed')[1];
    expect(second).toMatchObject({
      assessmentStartedAt: 5_000,
      assessmentCompletedAt: 31_000,
      durationMs: 26_000,
      reason: 'ready',
      snapshotAssessmentId: firstId,
      snapshotAgeMs: 31_000,
    });
  });

  it('records a completion that finishes after shutdown as stopped and never publishes it', async () => {
    const events: ReadinessMonitorEvent[] = [];
    const work = deferred<Report>();
    const read = vi.fn(() => work.promise);
    create(read, undefined, event => events.push(event));
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(0);
    const stopped = monitor.stop();
    work.resolve(green);
    await stopped;
    await vi.advanceTimersByTimeAsync(60_000);
    expect(
      events.filter(event => event.event === 'assessment-completed').map(event => event.reason),
    ).toEqual(['stopped']);
    expect(monitor.getSnapshot()).toBeNull();
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('an observer failure cannot keep a green snapshot alive through a thrown assessment', async () => {
    const refresh = deferred<Report>();
    create(vi.fn().mockResolvedValueOnce(green).mockReturnValue(refresh.promise), undefined, () => {
      throw new Error('logger down');
    });
    monitor.getSnapshot();
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getSnapshot()).toEqual(green);
    await vi.advanceTimersByTimeAsync(5_000);
    refresh.reject(new Error('database detail'));
    await vi.advanceTimersByTimeAsync(0);
    expect(monitor.getSnapshot()).toBeNull();
  });
});
