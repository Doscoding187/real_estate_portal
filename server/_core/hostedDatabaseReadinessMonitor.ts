import { createHash } from 'node:crypto';
import { resolveDatabaseAuthority } from './databaseAuthority/context';
import type { DatabaseCredentialClass } from './databaseAuthority/types';
import {
  assessRuntimeDatabaseReadiness,
  unavailableReadiness,
  type LayeredDatabaseReadiness,
} from './databaseAuthority/readiness';
import {
  READINESS_MONITOR_EVENTS,
  ReadinessSnapshotMonitor,
  type ReadinessMonitorEvent,
} from './readinessSnapshotMonitor';

const SHA_PATTERN = /^[a-f0-9]{40}$/i;
const HASH_PATTERN = /^[a-f0-9]{64}$/i;
const CODE_PATTERN = /^[a-z0-9-]{1,64}$/;
const IDENTIFIER_PATTERN = /^[A-Za-z][A-Za-z0-9]{0,63}$/;
const IDENTITY_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LOGGED_STAGES = 16;
const MAX_LOGGED_LAYERS = 32;
// Module initialization time for this process instance. It is not the operating-system
// process start time; provider deployment and replica identity are logged separately.
const MODULE_INITIALIZED_AT = new Date().toISOString();
const EVENT_NAMES: ReadonlySet<string> = new Set(READINESS_MONITOR_EVENTS);

function fingerprintOrNull(value: unknown): string | null {
  return typeof value === 'string' && HASH_PATTERN.test(value) ? value : null;
}

function uuidOrNull(value: unknown): string | null {
  return typeof value === 'string' && UUID_PATTERN.test(value) ? value : null;
}

function codeOrNull(value: unknown): string | null {
  return typeof value === 'string' && CODE_PATTERN.test(value) ? value : null;
}

function identifierOrNull(value: unknown): string | null {
  return typeof value === 'string' && IDENTIFIER_PATTERN.test(value) ? value : null;
}

function platformIdentity(name: string): string | null {
  const value = process.env[name];
  return value && IDENTITY_PATTERN.test(value) ? value : null;
}

/**
 * Explicit allowlist: every logged field is named here. Environment contents, layer
 * detail, exception text and report bodies never reach the log line.
 */
function readinessDiagnosticLine(
  event: ReadinessMonitorEvent,
  value?: LayeredDatabaseReadiness,
): string {
  const source = process.env.BUILD_SHA ?? process.env.RAILWAY_GIT_COMMIT_SHA;
  const sourceSha = source && SHA_PATTERN.test(source) ? source : null;
  const targetFingerprintHash = fingerprintOrNull(event.targetFingerprintHash);
  return JSON.stringify({
    component: 'hosted-database-readiness',
    event: EVENT_NAMES.has(event.event) ? event.event : null,
    reason: event.reason,
    assessmentId: uuidOrNull(event.assessmentId),
    assessmentStartedAt: event.assessmentStartedAt,
    assessmentCompletedAt: event.assessmentCompletedAt,
    durationMs: event.durationMs,
    inFlight: event.inFlight,
    observedAt: event.observedAt,
    snapshotAssessmentId: uuidOrNull(event.snapshotAssessmentId),
    snapshotAgeMs: event.snapshotAgeMs,
    contextGeneration: event.contextGeneration,
    assessmentGeneration: event.assessmentGeneration,
    trigger: event.trigger,
    scheduledStartAt: event.scheduledStartAt,
    scheduledDelayMs: event.scheduledDelayMs,
    startLagMs: event.startLagMs,
    targetIdentity: event.targetIdentity,
    targetFingerprintHash,
    targetFingerprintMatchesReport: value
      ? fingerprintOrNull(value.targetFingerprintHash) === targetFingerprintHash
      : null,
    stages: event.stages.slice(0, MAX_LOGGED_STAGES).map(stage => ({
      name: identifierOrNull(stage.name),
      startOffsetMs: stage.startOffsetMs,
      durationMs: stage.durationMs,
      outcome: stage.outcome === 'ok' || stage.outcome === 'threw' ? stage.outcome : null,
    })),
    activeStage: identifierOrNull(event.activeStage),
    verdict: event.verdict
      ? {
          applicationReady: event.verdict.applicationReady === true,
          notReadyLayers: event.verdict.notReadyLayers.slice(0, MAX_LOGGED_LAYERS).flatMap(item => {
            const layer = identifierOrNull(item.layer);
            const code = codeOrNull(item.code);
            return layer && code ? [{ layer, code }] : [];
          }),
        }
      : null,
    sourceSha,
    deployment: platformIdentity('RAILWAY_DEPLOYMENT_ID'),
    replica: platformIdentity('RAILWAY_REPLICA_ID'),
    processId: process.pid,
    moduleInitializedAt: MODULE_INITIALIZED_AT,
  });
}

// Age includes the verification itself. Slow/failed/expired verification fails closed.
const monitor = new ReadinessSnapshotMonitor<LayeredDatabaseReadiness>({
  read: probe => assessRuntimeDatabaseReadiness({ probe }),
  classify: value => (value.applicationReady ? 'ready' : 'not-ready'),
  observe: (event, value) => {
    console.info(readinessDiagnosticLine(event, value));
  },
  contextKey: () =>
    createHash('sha256')
      .update(
        JSON.stringify(
          Object.entries(process.env)
            .filter(
              ([key]) =>
                key.startsWith('DATABASE_') ||
                ['APP_ENV', 'NODE_ENV', 'BUILD_SHA', 'RAILWAY_GIT_COMMIT_SHA'].includes(key),
            )
            .sort(([a], [b]) => a.localeCompare(b)),
        ),
      )
      .digest('hex'),
  maxAgeMs: 30_000,
  refreshDelayMs: 5_000,
});

export function hostedDatabaseReadinessSnapshot(): LayeredDatabaseReadiness {
  const snapshot = monitor.getSnapshot();
  if (snapshot) return snapshot;
  let targetFingerprintHash = 'unresolved';
  let targetClass = 'unknown';
  try {
    const authority = resolveDatabaseAuthority({
      operation: 'readiness',
      cwd: process.cwd(),
      credentialClass:
        (process.env.DATABASE_CREDENTIAL_CLASS as DatabaseCredentialClass) ?? undefined,
    });
    targetFingerprintHash = authority.context.targetFingerprintHash;
    targetClass = authority.context.targetClass;
  } catch {
    /* An unresolved target remains unready. */
  }
  return unavailableReadiness({
    checkedAt: new Date(),
    targetFingerprintHash,
    targetClass,
    connectivityCode: 'readiness-verification-pending-or-expired',
    connectivityDetail: 'A fresh complete authorized database verification is required.',
  });
}

export async function stopHostedDatabaseReadinessMonitor(): Promise<void> {
  await monitor.stop();
}
