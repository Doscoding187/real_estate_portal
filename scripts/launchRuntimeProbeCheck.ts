type ProbeResponse = { status: number; body: unknown };

export type LaunchRuntimeProbeInput = {
  frontendVersion: ProbeResponse;
  apiHealth: ProbeResponse;
  apiReadiness: ProbeResponse;
  apiVersion: ProbeResponse;
  expected: {
    frontendSha: string;
    apiSha: string;
    environment: 'staging' | 'production';
    releaseId: string | null;
    targetFingerprint: string;
  };
  nowMs: number;
};

const MAX_TERM_TICK_AGE_MS = 45 * 60 * 1000;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown> : {};
}

function nested(value: unknown, key: string): Record<string, unknown> {
  return record(record(value)[key]);
}

/** Public, read-only release monitor. Issues never contain response bodies. */
export function evaluateLaunchRuntimeProbe(input: LaunchRuntimeProbeInput): string[] {
  const issues: string[] = [];
  const { expected } = input;

  for (const [name, response] of [
    ['frontend-version', input.frontendVersion],
    ['api-health', input.apiHealth],
    ['api-readiness', input.apiReadiness],
    ['api-version', input.apiVersion],
  ] as const) {
    if (response.status !== 200) issues.push(`${name}: HTTP ${response.status}`);
  }

  const frontend = record(input.frontendVersion.body);
  const health = record(input.apiHealth.body);
  const readiness = record(input.apiReadiness.body);
  const version = record(input.apiVersion.body);

  if (frontend.gitSha !== expected.frontendSha) issues.push('frontend-version: SHA mismatch');
  if (frontend.env !== expected.environment) issues.push('frontend-version: environment mismatch');
  if (version.gitSha !== expected.apiSha) issues.push('api-version: SHA mismatch');
  if (version.env !== expected.environment) issues.push('api-version: environment mismatch');
  if (version.releaseId !== expected.releaseId) issues.push('api-version: release mismatch');

  if (health.ok !== true || health.kind !== 'liveness' ||
      nested(health, 'build').sha !== expected.apiSha) {
    issues.push('api-health: liveness/build mismatch');
  }

  if (readiness.ok !== true || readiness.kind !== 'readiness' ||
      readiness.env !== expected.environment ||
      nested(readiness, 'build').sha !== expected.apiSha) {
    issues.push('api-readiness: status/build mismatch');
  }
  const db = nested(readiness, 'db');
  if (db.applicationReady !== true ||
      db.targetFingerprintHash !== expected.targetFingerprint) {
    issues.push('api-readiness: database target/readiness mismatch');
  }
  for (const key of ['cache', 'authRateLimit', 'publicLeadRateLimit'] as const) {
    const service = nested(readiness, key);
    if (service.ok !== true || service.mode !== 'redis') {
      issues.push(`api-readiness: ${key} unavailable or not using Redis`);
    }
  }
  if (nested(readiness, 's3').ok !== true || nested(readiness, 's3').required !== true) {
    issues.push('api-readiness: public media storage configuration missing');
  }
  if (nested(readiness, 'configuration').ok !== true) {
    issues.push('api-readiness: hosted configuration invalid');
  }

  const scheduler = nested(readiness, 'termScheduler');
  const lastSucceededMs = Date.parse(String(scheduler.lastSucceededAt || ''));
  const lastFailedMs = scheduler.lastFailedAt
    ? Date.parse(String(scheduler.lastFailedAt)) : NaN;
  if (scheduler.timerActive !== true || !Number.isFinite(lastSucceededMs) ||
      lastSucceededMs > input.nowMs ||
      input.nowMs - lastSucceededMs > MAX_TERM_TICK_AGE_MS ||
      (scheduler.lastFailedAt != null && !Number.isFinite(lastFailedMs)) ||
      (Number.isFinite(lastFailedMs) && lastFailedMs > lastSucceededMs)) {
    issues.push('api-readiness: commercial term scheduler stale or failed');
  }

  return issues;
}
