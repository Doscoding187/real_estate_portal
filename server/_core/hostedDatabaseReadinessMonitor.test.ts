import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReadinessMonitorEvent } from './readinessSnapshotMonitor';

const captured = vi.hoisted(() => ({
  options: null as unknown as {
    observe: (event: ReadinessMonitorEvent, value?: { targetFingerprintHash: string }) => void;
    classify: (value: { applicationReady: boolean }) => string;
  },
}));
vi.mock('./readinessSnapshotMonitor', () => ({
  ReadinessSnapshotMonitor: class {
    constructor(options: typeof captured.options) {
      captured.options = options;
    }
  },
}));
vi.mock('./databaseAuthority/context', () => ({ resolveDatabaseAuthority: vi.fn() }));
vi.mock('./databaseAuthority/readiness', () => ({
  assessRuntimeDatabaseReadiness: vi.fn(),
  unavailableReadiness: vi.fn(),
}));
import './hostedDatabaseReadinessMonitor';

const event: ReadinessMonitorEvent = {
  event: 'assessment-completed',
  assessmentId: 'test-assessment',
  assessmentStartedAt: 0,
  assessmentCompletedAt: 123,
  durationMs: 123,
  inFlight: true,
  observedAt: 123,
  snapshotAssessmentId: 'test-assessment',
  snapshotAgeMs: 123,
  reason: 'ready',
};
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});
describe('hosted readiness diagnostic allowlist', () => {
  it('logs the exact valid source and target fingerprint without report details', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubEnv('BUILD_SHA', 'a'.repeat(40));
    captured.options.observe(event, {
      targetFingerprintHash: 'b'.repeat(64),
      detail: 'secret database url',
    } as { targetFingerprintHash: string });
    expect(JSON.parse(log.mock.calls[0][0])).toEqual({
      component: 'hosted-database-readiness',
      ...event,
      sourceSha: 'a'.repeat(40),
      targetFingerprintHash: 'b'.repeat(64),
    });
    expect(log.mock.calls[0][0]).not.toContain('secret');
  });
  it('omits invalid environment values and fingerprints', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubEnv('BUILD_SHA', 'secret://credentials');
    captured.options.observe(event, { targetFingerprintHash: 'secret://credentials' });
    expect(JSON.parse(log.mock.calls[0][0])).toMatchObject({
      sourceSha: null,
      targetFingerprintHash: null,
    });
    expect(log.mock.calls[0][0]).not.toContain('secret');
  });
  it('classifies only the application verdict', () => {
    expect(captured.options.classify({ applicationReady: false })).toBe('not-ready');
    expect(captured.options.classify({ applicationReady: true })).toBe('ready');
  });
});
