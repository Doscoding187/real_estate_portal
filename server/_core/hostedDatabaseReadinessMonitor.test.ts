import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReadinessMonitorEvent } from './readinessSnapshotMonitor';

const captured = vi.hoisted(() => ({
  options: null as unknown as {
    observe: (
      event: ReadinessMonitorEvent,
      value?: { targetFingerprintHash: string; detail?: string },
    ) => void;
    classify: (value: { applicationReady: boolean }) => string;
  },
}));
vi.mock('./readinessSnapshotMonitor', async importOriginal => ({
  ...(await importOriginal<typeof import('./readinessSnapshotMonitor')>()),
  ReadinessSnapshotMonitor: class {
    constructor(options: typeof captured.options) {
      captured.options = options;
    }
  },
}));
vi.mock('./databaseAuthority/readiness', () => ({
  assessRuntimeDatabaseReadiness: vi.fn(),
  unavailableReadiness: vi.fn(),
}));
import './hostedDatabaseReadinessMonitor';

const ASSESSMENT_ID = '0c9d6a1e-5b7f-4e2a-9d3c-1a2b3c4d5e6f';
const FINGERPRINT = 'b'.repeat(64);

function completedEvent(overrides: Partial<ReadinessMonitorEvent> = {}): ReadinessMonitorEvent {
  return {
    event: 'assessment-completed',
    assessmentId: ASSESSMENT_ID,
    assessmentStartedAt: 0,
    assessmentCompletedAt: 123,
    durationMs: 123,
    inFlight: true,
    observedAt: 123,
    snapshotAssessmentId: null,
    snapshotAgeMs: null,
    contextGeneration: 0,
    assessmentGeneration: 0,
    trigger: 'request',
    scheduledStartAt: null,
    scheduledDelayMs: null,
    startLagMs: null,
    targetIdentity: 'resolved',
    targetFingerprintHash: FINGERPRINT,
    stages: [
      { name: 'authorize', startOffsetMs: 0, durationMs: 1, outcome: 'ok' },
      { name: 'connect', startOffsetMs: 1, durationMs: 40, outcome: 'ok' },
      { name: 'verify', startOffsetMs: 41, durationMs: 80, outcome: 'ok' },
    ],
    activeStage: null,
    verdict: {
      applicationReady: false,
      notReadyLayers: [{ layer: 'schemaMigrated', code: 'manifest-head-behind' }],
    },
    reason: 'not-ready',
    ...overrides,
  };
}

function logged(log: ReturnType<typeof vi.spyOn>, index = 0): Record<string, unknown> {
  return JSON.parse(log.mock.calls[index][0] as string);
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('hosted readiness diagnostic allowlist', () => {
  it('logs the exact valid source, assessment identity and fingerprint without report details', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubEnv('BUILD_SHA', 'a'.repeat(40));
    captured.options.observe(completedEvent(), {
      targetFingerprintHash: FINGERPRINT,
      detail: 'secret database url',
    });
    const line = logged(log);
    expect(line).toMatchObject({
      component: 'hosted-database-readiness',
      assessmentId: ASSESSMENT_ID,
      targetIdentity: 'resolved',
      targetFingerprintHash: FINGERPRINT,
      targetFingerprintMatchesReport: true,
      sourceSha: 'a'.repeat(40),
      activeStage: null,
    });
    expect(log.mock.calls[0][0]).not.toContain('secret');
  });

  it('keeps the logged field set explicit and fixed', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    captured.options.observe(completedEvent());
    expect(Object.keys(logged(log)).sort()).toEqual(
      [
        'activeStage',
        'assessmentCompletedAt',
        'assessmentGeneration',
        'assessmentId',
        'assessmentStartedAt',
        'component',
        'contextGeneration',
        'deployment',
        'durationMs',
        'event',
        'inFlight',
        'moduleInitializedAt',
        'observedAt',
        'processId',
        'reason',
        'replica',
        'scheduledDelayMs',
        'scheduledStartAt',
        'snapshotAgeMs',
        'snapshotAssessmentId',
        'sourceSha',
        'stages',
        'startLagMs',
        'targetFingerprintHash',
        'targetFingerprintMatchesReport',
        'targetIdentity',
        'trigger',
        'verdict',
      ].sort(),
    );
  });

  it('omits invalid environment values and fingerprints', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubEnv('BUILD_SHA', 'secret://credentials');
    vi.stubEnv('RAILWAY_DEPLOYMENT_ID', 'postgres://user:pw@host/db');
    captured.options.observe(completedEvent({ targetFingerprintHash: 'secret://credentials' }), {
      targetFingerprintHash: 'secret://credentials',
    });
    expect(logged(log)).toMatchObject({
      sourceSha: null,
      deployment: null,
      targetFingerprintHash: null,
      targetFingerprintMatchesReport: true,
    });
    expect(log.mock.calls[0][0]).not.toContain('secret');
    expect(log.mock.calls[0][0]).not.toContain('postgres');
  });

  it('keeps an unresolved authority explicit and never labels it with a fingerprint', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    captured.options.observe(
      completedEvent({
        targetIdentity: 'unresolved',
        targetFingerprintHash: null,
        stages: [],
        verdict: {
          applicationReady: false,
          notReadyLayers: [{ layer: 'targetConnectivity', code: 'authority-unresolved' }],
        },
      }),
      { targetFingerprintHash: 'unresolved' } as unknown as { targetFingerprintHash: string },
    );
    expect(logged(log)).toMatchObject({
      targetIdentity: 'unresolved',
      targetFingerprintHash: null,
      targetFingerprintMatchesReport: true,
      verdict: {
        applicationReady: false,
        notReadyLayers: [{ layer: 'targetConnectivity', code: 'authority-unresolved' }],
      },
    });
  });

  it('drops layer and stage names that are not bounded codes', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    captured.options.observe(
      completedEvent({
        stages: [
          {
            name: 'connect with password=hunter2',
            startOffsetMs: 0,
            durationMs: 1,
            outcome: 'threw',
          },
        ],
        activeStage: 'verify:user@host',
        verdict: {
          applicationReady: false,
          notReadyLayers: [
            { layer: 'Schema Layer', code: 'ok-code' },
            { layer: 'schemaMigrated', code: 'manifest-head-behind' },
          ],
        },
      }),
    );
    const line = logged(log);
    expect(line).toMatchObject({
      stages: [{ name: null, startOffsetMs: 0, durationMs: 1, outcome: 'threw' }],
      activeStage: null,
      verdict: { notReadyLayers: [{ layer: 'schemaMigrated', code: 'manifest-head-behind' }] },
    });
    expect(log.mock.calls[0][0]).not.toContain('hunter2');
    expect(log.mock.calls[0][0]).not.toContain('user@host');
  });

  it('validates platform identity and omits raw exception text', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.stubEnv('RAILWAY_DEPLOYMENT_ID', '3f9c2a10-7d1e-4b8a-9c6f-0a1b2c3d4e5f');
    vi.stubEnv('RAILWAY_REPLICA_ID', 'replica-1');
    captured.options.observe(
      completedEvent({
        event: 'assessment-threw',
        reason: 'assessment-threw',
        verdict: null,
        stages: [],
      }),
    );
    expect(logged(log)).toMatchObject({
      deployment: '3f9c2a10-7d1e-4b8a-9c6f-0a1b2c3d4e5f',
      replica: 'replica-1',
      verdict: null,
      targetFingerprintMatchesReport: null,
    });
  });

  it('logs only allowlisted event names, including the phase-start event', () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {});
    captured.options.observe(
      completedEvent({ event: 'assessment-phase-started' as never, reason: null }),
    );
    captured.options.observe(completedEvent({ event: 'arbitrary password=hunter2' as never }));
    expect(logged(log, 0)).toMatchObject({ event: 'assessment-phase-started' });
    expect(logged(log, 1)).toMatchObject({ event: null });
    expect(log.mock.calls[1][0]).not.toContain('hunter2');
  });

  it('classifies only the application verdict', () => {
    expect(captured.options.classify({ applicationReady: false })).toBe('not-ready');
    expect(captured.options.classify({ applicationReady: true })).toBe('ready');
  });
});
