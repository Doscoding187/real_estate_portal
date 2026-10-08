import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Drives the real snapshot monitor and the real hosted log formatter. The only fakes are the
// database assessment (scripted per test) and the clock. Assertions read the emitted console
// lines, so a regression in what operators can see fails here even if internal state is right.

type Probe = {
  target(targetFingerprintHash: string | null): void;
  begin(stage: string): void;
  end(stage: string, outcome: 'ok' | 'threw'): void;
  verdict(verdict: unknown): void;
};
type Assess = (input: { probe?: Probe }) => Promise<unknown>;

const hooks = vi.hoisted(() => ({ assess: null as Assess | null }));

vi.mock('./databaseAuthority/context', () => ({
  resolveDatabaseAuthority: () => {
    throw new Error('authority unavailable in this fixture');
  },
}));
vi.mock('./databaseAuthority/readiness', () => ({
  assessRuntimeDatabaseReadiness: (input: { probe?: Probe }) => {
    if (!hooks.assess) throw new Error('no scripted assessment');
    return hooks.assess(input);
  },
  unavailableReadiness: (input: { targetFingerprintHash: string; targetClass: string }) => ({
    applicationReady: false,
    targetFingerprintHash: input.targetFingerprintHash,
    targetClass: input.targetClass,
    layers: {},
  }),
}));

const FP_A = 'c'.repeat(64);
const FP_B = 'd'.repeat(64);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const GREEN = {
  applicationReady: true,
  targetFingerprintHash: FP_A,
  targetClass: 'test',
  layers: {},
};

type Deferred = { promise: Promise<unknown>; resolve: (value: unknown) => void };
function deferred(): Deferred {
  let resolve!: (value: unknown) => void;
  const promise = new Promise<unknown>(yes => {
    resolve = yes;
  });
  return { promise, resolve };
}

let rawLines: string[];
let failLogSink: boolean;
let hangs: Deferred[];
let snapshot: () => unknown;
let stop: () => Promise<void>;
let info: ReturnType<typeof vi.spyOn>;

type LoggedLine = Record<string, unknown>;
const parsed = (): LoggedLine[] => rawLines.map(line => JSON.parse(line) as LoggedLine);
const phases = (lines = parsed()) =>
  lines.filter(line => line.event === 'assessment-phase-started');
const flush = () => vi.advanceTimersByTimeAsync(0);
function hang(): Deferred {
  const pending = deferred();
  hangs.push(pending);
  return pending;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
  rawLines = [];
  failLogSink = false;
  hangs = [];
  info = vi.spyOn(console, 'info').mockImplementation((line: string) => {
    if (failLogSink) throw new Error('log sink unavailable');
    rawLines.push(line);
  });
  vi.resetModules();
  const hosted = await import('./hostedDatabaseReadinessMonitor');
  snapshot = hosted.hostedDatabaseReadinessSnapshot;
  stop = hosted.stopHostedDatabaseReadinessMonitor;
});

afterEach(async () => {
  // Release every scripted hang so shutdown can drain, then stop the monitor.
  for (const pending of hangs) pending.resolve(GREEN);
  await vi.advanceTimersByTimeAsync(0);
  await stop();
  vi.useRealTimers();
  info.mockRestore();
});

describe('hosted readiness logs for hung verification', () => {
  it('a first assessment that hangs after resolving its target logs target and stage before completion', async () => {
    const pending = hang();
    hooks.assess = async ({ probe }) => {
      probe!.target(FP_A);
      probe!.begin('authorize');
      probe!.end('authorize', 'ok');
      probe!.begin('connect');
      probe!.end('connect', 'ok');
      probe!.begin('verify');
      return pending.promise;
    };

    snapshot();
    await flush();

    const phaseLines = phases();
    expect(phaseLines.map(line => line.activeStage)).toEqual(['authorize', 'connect', 'verify']);
    expect(new Set(phaseLines.map(line => line.assessmentId)).size).toBe(1);
    expect(phaseLines[0].assessmentId).toMatch(UUID);
    expect(phaseLines.at(-1)).toMatchObject({
      targetIdentity: 'resolved',
      targetFingerprintHash: FP_A,
      trigger: 'request',
      inFlight: true,
      activeStage: 'verify',
      durationMs: null,
      assessmentCompletedAt: null,
    });
    expect(parsed().some(line => line.event === 'assessment-completed')).toBe(false);

    // Repeated polling while hung adds no lines: single flight and one reason transition.
    const before = rawLines.length;
    await vi.advanceTimersByTimeAsync(60_000);
    for (let i = 0; i < 50; i++) snapshot();
    await flush();
    expect(rawLines.length).toBe(before);
  });

  it('a hang during recovery after a failed assessment logs the new target and stage, not the failed one', async () => {
    const recovery = hang();
    let attempt = 0;
    hooks.assess = async ({ probe }) => {
      attempt += 1;
      if (attempt === 1) {
        probe!.target(FP_A);
        probe!.begin('connect');
        probe!.end('connect', 'threw');
        throw new Error('driver detail token=abc123');
      }
      probe!.target(FP_B);
      probe!.begin('authorize');
      probe!.end('authorize', 'ok');
      probe!.begin('verify');
      return recovery.promise;
    };

    snapshot();
    await flush();
    const failed = parsed().find(line => line.event === 'assessment-threw')!;
    expect(failed).toMatchObject({
      reason: 'assessment-threw',
      targetFingerprintHash: FP_A,
      activeStage: null,
      stages: [{ name: 'connect', outcome: 'threw' }],
    });

    const beforeRecovery = rawLines.length;
    snapshot();
    await flush();
    const after = parsed().slice(beforeRecovery);
    expect(after.find(line => line.event === 'snapshot-unavailable')).toMatchObject({
      reason: 'assessment-threw',
    });
    expect(after.find(line => line.event === 'assessment-started')).toMatchObject({
      trigger: 'request',
    });
    const recoveryPhases = phases(after);
    expect(recoveryPhases.map(line => [line.activeStage, line.targetFingerprintHash])).toEqual([
      ['authorize', FP_B],
      ['verify', FP_B],
    ]);
    expect(recoveryPhases[0].assessmentId).not.toBe(failed.assessmentId);
    expect(parsed().some(line => line.event === 'assessment-completed')).toBe(false);

    const beforePolling = rawLines.length;
    for (let i = 0; i < 50; i++) snapshot();
    await flush();
    expect(rawLines.length).toBe(beforePolling);
    // Raw exception text never reaches the sink.
    expect(rawLines.join('\n')).not.toContain('token=abc123');
    expect(rawLines.join('\n')).not.toContain('driver detail');
  });

  it('a held snapshot that expires while verifying progresses into a hung cleanup, logged with its stage', async () => {
    const verifyGate = deferred();
    hangs.push(verifyGate);
    const cleanupHang = hang();
    let attempt = 0;
    hooks.assess = async ({ probe }) => {
      attempt += 1;
      probe!.target(FP_A);
      probe!.begin('authorize');
      probe!.end('authorize', 'ok');
      probe!.begin('connect');
      probe!.end('connect', 'ok');
      probe!.begin('verify');
      if (attempt === 1) {
        probe!.end('verify', 'ok');
        probe!.begin('cleanup');
        probe!.end('cleanup', 'ok');
        return GREEN;
      }
      await verifyGate.promise;
      probe!.end('verify', 'ok');
      probe!.begin('cleanup');
      return cleanupHang.promise;
    };

    // First assessment completes green at t=0; the second is scheduled at t=5s.
    snapshot();
    await flush();
    expect(parsed().find(line => line.event === 'assessment-completed')).toMatchObject({
      reason: 'ready',
      assessmentStartedAt: 0,
    });
    await vi.advanceTimersByTimeAsync(5_000);
    expect(snapshot()).toEqual(GREEN); // still fresh at t=5s: the held snapshot is valid

    // The held snapshot (started at t=0) expires at t=30s while attempt two is verifying.
    await vi.advanceTimersByTimeAsync(25_000);
    expect(snapshot()).toMatchObject({ applicationReady: false });
    const expiredAt = rawLines.length;
    const expired = parsed().filter(
      line => line.event === 'snapshot-unavailable' && line.reason === 'expired',
    );
    expect(expired).toHaveLength(1);
    expect(expired[0]).toMatchObject({
      inFlight: true,
      trigger: 'scheduled',
      activeStage: 'verify',
      targetFingerprintHash: FP_A,
      snapshotAgeMs: 30_000,
    });

    // Verification is released, and the assessment advances into cleanup and hangs.
    verifyGate.resolve(GREEN);
    await flush();
    const cleanupLines = phases(parsed().slice(expiredAt));
    expect(cleanupLines.at(-1)).toMatchObject({
      activeStage: 'cleanup',
      targetFingerprintHash: FP_A,
      trigger: 'scheduled',
      inFlight: true,
    });
    expect(parsed().filter(line => line.event === 'assessment-completed')).toHaveLength(1);

    // Hung cleanup stays bounded under polling: no completion, no repeated expiry lines.
    const beforePolling = rawLines.length;
    await vi.advanceTimersByTimeAsync(60_000);
    for (let i = 0; i < 50; i++) expect(snapshot()).toMatchObject({ applicationReady: false });
    await flush();
    expect(rawLines.length).toBe(beforePolling);
  });

  it('a failing log sink cannot change the outcome of a ready assessment', async () => {
    failLogSink = true;
    hooks.assess = async ({ probe }) => {
      probe!.target(FP_A);
      probe!.begin('verify');
      probe!.end('verify', 'ok');
      return GREEN;
    };
    snapshot();
    await flush();
    expect(snapshot()).toEqual(GREEN);
    expect(rawLines).toEqual([]);
  });

  it('keeps each logged line within a fixed size bound', async () => {
    const pending = hang();
    hooks.assess = async ({ probe }) => {
      probe!.target(FP_A);
      probe!.begin('authorize');
      probe!.end('authorize', 'ok');
      probe!.begin('connect');
      probe!.end('connect', 'ok');
      probe!.begin('verify');
      probe!.end('verify', 'threw');
      probe!.begin('cleanup');
      return pending.promise;
    };
    snapshot();
    await flush();
    const largest = Math.max(...rawLines.map(line => Buffer.byteLength(line, 'utf8')));
    expect(largest).toBeLessThan(2048);
  });
});
