import { describe, expect, it } from 'vitest';
import {
  CONNECTION_LEASE_THRESHOLDS,
  LOAD_REHEARSAL_CONFIRM_ENV,
  READ_REHEARSAL_THRESHOLDS,
  RehearsalRefusal,
  WRITE_REHEARSAL_THRESHOLDS,
  assertRehearsalAuthority,
  evaluateLease,
  evaluateScenario,
  parseRehearsalConfig,
  percentile,
  summarizeScenario,
} from '../loadRehearsal/config';

const confirmEnv = { [LOAD_REHEARSAL_CONFIRM_ENV]: 'fingerprint-abc' };

describe('parseRehearsalConfig', () => {
  it('applies bounded defaults and derives concurrency from rps', () => {
    expect(parseRehearsalConfig([], confirmEnv)).toEqual({
      durationSeconds: 60,
      rps: 5,
      concurrency: 4,
      scenarios: [],
      evidenceOut: null,
    });
  });

  it('parses explicit flags and repeated scenarios', () => {
    const config = parseRehearsalConfig(
      [
        '--duration-seconds',
        '30',
        '--rps',
        '2',
        '--concurrency',
        '2',
        '--scenario',
        'property-detail',
        '--scenario',
        'search-typed-city',
        '--evidence-out',
        '/tmp/evidence.json',
      ],
      confirmEnv,
    );
    expect(config).toEqual({
      durationSeconds: 30,
      rps: 2,
      concurrency: 2,
      scenarios: ['property-detail', 'search-typed-city'],
      evidenceOut: '/tmp/evidence.json',
    });
  });

  it('refuses values outside the bounded range', () => {
    for (const argv of [
      ['--duration-seconds', '4'],
      ['--duration-seconds', '301'],
      ['--rps', '0'],
      ['--rps', '21'],
      ['--concurrency', '11'],
    ]) {
      expect(() => parseRehearsalConfig(argv, confirmEnv)).toThrow(RehearsalRefusal);
    }
  });

  it('refuses malformed, unknown and valueless flags', () => {
    expect(() => parseRehearsalConfig(['--rps', 'fast'], confirmEnv)).toThrow(RehearsalRefusal);
    expect(() => parseRehearsalConfig(['--unknown'], confirmEnv)).toThrow(RehearsalRefusal);
    expect(() => parseRehearsalConfig(['--rps'], confirmEnv)).toThrow(RehearsalRefusal);
    expect(() => parseRehearsalConfig(['--scenario', '--rps', '5'], confirmEnv)).toThrow(
      RehearsalRefusal,
    );
  });

  it('tolerates the package-manager argument separator', () => {
    expect(parseRehearsalConfig(['--', '--rps', '3'], confirmEnv)).toMatchObject({ rps: 3 });
  });

  it('refuses when the opt-in confirmation is absent', () => {
    expect(() => parseRehearsalConfig([], {})).toThrow(/PROPERTY_LISTIFY_LOAD_REHEARSAL_CONFIRM/);
  });
});

describe('assertRehearsalAuthority', () => {
  const context = { targetClass: 'disposable-worktree', targetFingerprintHash: 'deadbeef' };

  it('accepts only an exact fingerprint match on disposable classes', () => {
    expect(() => assertRehearsalAuthority(context, 'deadbeef')).not.toThrow();
    expect(() =>
      assertRehearsalAuthority({ ...context, targetClass: 'disposable-test' }, 'deadbeef'),
    ).not.toThrow();
  });

  it('refuses non-disposable targets, missing confirmation and mismatch', () => {
    expect(() =>
      assertRehearsalAuthority({ ...context, targetClass: 'hosted' }, 'deadbeef'),
    ).toThrow(/disposable/);
    expect(() => assertRehearsalAuthority(context, undefined)).toThrow(/opt in/);
    expect(() => assertRehearsalAuthority(context, 'f00d')).toThrow(/does not match/);
  });
});

describe('percentile and summaries', () => {
  it('computes nearest-rank percentiles deterministically', () => {
    expect(percentile([], 50)).toBeNull();
    expect(percentile([10], 95)).toBe(10);
    expect(percentile([40, 10, 30, 20], 50)).toBe(20);
    expect(percentile([40, 10, 30, 20], 95)).toBe(40);
    expect(percentile([40, 10, 30, 20], 100)).toBe(40);
    expect(() => percentile([1], 0)).toThrow(RehearsalRefusal);
  });

  it('summarizes successful latencies and total error rate', () => {
    const summary = summarizeScenario('search', [
      { latencyMs: 100, ok: true },
      { latencyMs: 200, ok: true },
      { latencyMs: 900, ok: false },
    ]);
    expect(summary.requests).toBe(3);
    expect(summary.errors).toBe(1);
    expect(summary.errorRate).toBe(0.3333);
    expect(summary.p95Ms).toBe(200);
    expect(summary.p99Ms).toBe(200);
  });

  it('evaluates scenarios against the master-plan read thresholds', () => {
    const passing = summarizeScenario('ok', [
      { latencyMs: 100, ok: true },
      { latencyMs: 200, ok: true },
    ]);
    expect(evaluateScenario(passing)).toEqual({ name: 'ok', pass: true, failures: [] });

    const slow = summarizeScenario('slow', [
      { latencyMs: READ_REHEARSAL_THRESHOLDS.p95MsMax + 1, ok: true },
    ]);
    expect(evaluateScenario(slow).pass).toBe(false);

    const failing = summarizeScenario('errors', [
      { latencyMs: 10, ok: false },
      { latencyMs: 10, ok: true },
    ]);
    expect(evaluateScenario(failing).failures).toContainEqual(
      `error rate 0.5 exceeds ${READ_REHEARSAL_THRESHOLDS.errorRateMax}`,
    );

    expect(evaluateScenario(summarizeScenario('empty', [])).failures).toContainEqual(
      'no requests observed',
    );
  });
});

describe('write thresholds and connection leases', () => {
  it('applies write thresholds only to write scenarios', () => {
    const summary = summarizeScenario('write', [{ latencyMs: 800, ok: true }]);
    expect(evaluateScenario(summary, 'write').pass).toBe(true);
    expect(evaluateScenario(summary, 'read').pass).toBe(false);
    expect(evaluateScenario(summary, 'read').failures).toContainEqual(
      `p95 800ms exceeds ${READ_REHEARSAL_THRESHOLDS.p95MsMax}ms`,
    );

    const over = summarizeScenario('write-over', [
      { latencyMs: WRITE_REHEARSAL_THRESHOLDS.p95MsMax + 1, ok: true },
    ]);
    expect(evaluateScenario(over, 'write').pass).toBe(false);
  });

  it('evaluates connection-lease percentiles against the acquisition threshold', () => {
    const healthy = summarizeScenario('connection-lease', [
      { latencyMs: 5, ok: true },
      { latencyMs: 40, ok: true },
    ]);
    expect(evaluateLease(healthy).pass).toBe(true);

    const slow = summarizeScenario('connection-lease', [
      { latencyMs: CONNECTION_LEASE_THRESHOLDS.p95MsMax + 10, ok: true },
    ]);
    expect(evaluateLease(slow).failures).toEqual([
      `p95 260ms exceeds ${CONNECTION_LEASE_THRESHOLDS.p95MsMax}ms`,
    ]);

    const errored = summarizeScenario('connection-lease', [{ latencyMs: 5, ok: false }]);
    expect(evaluateLease(errored).pass).toBe(false);

    expect(evaluateLease(summarizeScenario('connection-lease', [])).failures).toContainEqual(
      'no lease samples observed',
    );
  });
});
