import { describe, expect, it } from 'vitest';
import { evaluateLaunchRuntimeProbe, type LaunchRuntimeProbeInput } from '../launchRuntimeProbeCheck';

const nowMs = Date.parse('2026-09-24T12:00:00.000Z');
const frontendSha = 'a'.repeat(40);
const apiSha = 'b'.repeat(40);
const targetFingerprint = 'c'.repeat(64);

function healthy(): LaunchRuntimeProbeInput {
  return {
    nowMs,
    expected: {
      frontendSha, apiSha, targetFingerprint,
      environment: 'production', releaseId: 'paid-v1',
    },
    frontendVersion: { status: 200, body: { gitSha: frontendSha, env: 'production' } },
    apiVersion: { status: 200, body: { gitSha: apiSha, env: 'production', releaseId: 'paid-v1' } },
    apiHealth: { status: 200, body: { ok: true, kind: 'liveness', build: { sha: apiSha } } },
    apiReadiness: { status: 200, body: {
      ok: true, kind: 'readiness', env: 'production', build: { sha: apiSha },
      db: { applicationReady: true, targetFingerprintHash: targetFingerprint },
      cache: { ok: true, mode: 'redis' },
      authRateLimit: { ok: true, mode: 'redis' },
      publicLeadRateLimit: { ok: true, mode: 'redis' },
      s3: { ok: true, required: true }, configuration: { ok: true },
      termScheduler: {
        timerActive: true, lastSucceededAt: '2026-09-24T11:45:00.000Z',
        lastFailedAt: null, intervalMs: 900000,
      },
    } },
  };
}

describe('launch runtime probe', () => {
  it('accepts an exact healthy hosted release tuple', () => {
    expect(evaluateLaunchRuntimeProbe(healthy())).toEqual([]);
  });

  it('rejects a different frontend, API release or database target', () => {
    const input = healthy();
    input.frontendVersion.body = { gitSha: 'd'.repeat(40), env: 'production' };
    input.apiVersion.body = { gitSha: apiSha, env: 'production', releaseId: 'other' };
    (input.apiReadiness.body as any).db.targetFingerprintHash = 'e'.repeat(64);
    expect(evaluateLaunchRuntimeProbe(input)).toEqual(expect.arrayContaining([
      'frontend-version: SHA mismatch',
      'api-version: release mismatch',
      'api-readiness: database target/readiness mismatch',
    ]));
  });

  it('does not mistake a green liveness endpoint for healthy readiness', () => {
    const input = healthy();
    input.apiReadiness.status = 503;
    (input.apiReadiness.body as any).db.applicationReady = false;
    (input.apiReadiness.body as any).cache = { ok: false, mode: 'memory' };
    expect(evaluateLaunchRuntimeProbe(input)).toEqual(expect.arrayContaining([
      'api-readiness: HTTP 503',
      'api-readiness: database target/readiness mismatch',
      'api-readiness: cache unavailable or not using Redis',
    ]));
  });

  it('rejects a stale or failed commercial term scheduler', () => {
    const input = healthy();
    (input.apiReadiness.body as any).termScheduler.lastSucceededAt = '2026-09-24T11:00:00.000Z';
    expect(evaluateLaunchRuntimeProbe(input)).toContain(
      'api-readiness: commercial term scheduler stale or failed',
    );

    (input.apiReadiness.body as any).termScheduler.lastSucceededAt = '2026-09-24T11:45:00.000Z';
    (input.apiReadiness.body as any).termScheduler.lastFailedAt = '2026-09-24T11:50:00.000Z';
    expect(evaluateLaunchRuntimeProbe(input)).toContain(
      'api-readiness: commercial term scheduler stale or failed',
    );
  });
});
