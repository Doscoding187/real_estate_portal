export class RehearsalRefusal extends Error {
  readonly exitCode: number;

  constructor(message: string, exitCode = 1) {
    super(message);
    this.name = 'RehearsalRefusal';
    this.exitCode = exitCode;
  }
}

export const LOAD_REHEARSAL_BOUNDS = {
  durationSeconds: { min: 5, max: 300, default: 60 },
  rps: { min: 1, max: 20, default: 5 },
  concurrency: { min: 1, max: 10, default: 4 },
  requestTimeoutMs: 15_000,
} as const;

export const LOAD_REHEARSAL_CONFIRM_ENV = 'PROPERTY_LISTIFY_LOAD_REHEARSAL_CONFIRM';

export const LOAD_REHEARSAL_TARGET_CLASSES = ['disposable-worktree', 'disposable-test'] as const;

/**
 * Read-side master-plan thresholds (packet 27 / packet 24). Writes, connection
 * acquisition, provider latency and the 24-hour workload are outside this
 * bounded local rehearsal and are excluded deliberately.
 */
export const READ_REHEARSAL_THRESHOLDS = {
  errorRateMax: 0.001,
  p95MsMax: 750,
  p99MsMax: 2_000,
} as const;

export const WRITE_REHEARSAL_THRESHOLDS = {
  errorRateMax: 0.001,
  p95MsMax: 1_000,
  p99MsMax: 2_000,
} as const;

export const CONNECTION_LEASE_THRESHOLDS = {
  p95MsMax: 250,
} as const;

export type ScenarioKind = 'read' | 'write';

export interface LoadRehearsalConfig {
  durationSeconds: number;
  rps: number;
  concurrency: number;
  scenarios: string[];
  evidenceOut: string | null;
}

export interface RehearsalSample {
  latencyMs: number;
  ok: boolean;
}

export interface ScenarioSummary {
  name: string;
  requests: number;
  errors: number;
  errorRate: number;
  p50Ms: number | null;
  p95Ms: number | null;
  p99Ms: number | null;
  maxMs: number | null;
}

export interface ScenarioEvaluation {
  name: string;
  pass: boolean;
  failures: string[];
}

function parseIntFlag(raw: string, label: string): number {
  if (!/^\d+$/.test(raw)) {
    throw new RehearsalRefusal(`Invalid ${label} value "${raw}": expected a positive integer.`);
  }
  return Number(raw);
}

function assertWithinBounds(
  value: number,
  label: string,
  bounds: { min: number; max: number },
): number {
  if (value < bounds.min || value > bounds.max) {
    throw new RehearsalRefusal(
      `${label} ${value} is outside the bounded rehearsal range ${bounds.min}-${bounds.max}.`,
    );
  }
  return value;
}

export function parseRehearsalConfig(
  rawArgv: readonly string[],
  env: NodeJS.ProcessEnv,
): LoadRehearsalConfig {
  const argv = rawArgv[0] === '--' ? rawArgv.slice(1) : rawArgv;
  let durationSeconds = LOAD_REHEARSAL_BOUNDS.durationSeconds.default;
  let rps = LOAD_REHEARSAL_BOUNDS.rps.default;
  let concurrency: number | null = null;
  const scenarios: string[] = [];
  let evidenceOut: string | null = null;

  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const value = argv[index + 1];
    const requireValue = (): string => {
      if (value === undefined || value.startsWith('--')) {
        throw new RehearsalRefusal(`Flag ${flag} requires a value.`);
      }
      index += 1;
      return value;
    };

    if (flag === '--duration-seconds') {
      durationSeconds = assertWithinBounds(
        parseIntFlag(requireValue(), '--duration-seconds'),
        '--duration-seconds',
        LOAD_REHEARSAL_BOUNDS.durationSeconds,
      );
    } else if (flag === '--rps') {
      rps = assertWithinBounds(
        parseIntFlag(requireValue(), '--rps'),
        '--rps',
        LOAD_REHEARSAL_BOUNDS.rps,
      );
    } else if (flag === '--concurrency') {
      concurrency = assertWithinBounds(
        parseIntFlag(requireValue(), '--concurrency'),
        '--concurrency',
        LOAD_REHEARSAL_BOUNDS.concurrency,
      );
    } else if (flag === '--scenario') {
      const name = requireValue().trim();
      if (!name) throw new RehearsalRefusal('--scenario requires a non-empty scenario name.');
      if (!scenarios.includes(name)) scenarios.push(name);
    } else if (flag === '--evidence-out') {
      evidenceOut = requireValue();
    } else {
      throw new RehearsalRefusal(`Unknown flag ${flag}.`);
    }
  }

  if (env[LOAD_REHEARSAL_CONFIRM_ENV] === undefined) {
    throw new RehearsalRefusal(
      `Refused: set ${LOAD_REHEARSAL_CONFIRM_ENV} to the exact target fingerprint to opt in.`,
    );
  }

  return {
    durationSeconds,
    rps,
    concurrency: concurrency ?? Math.min(LOAD_REHEARSAL_BOUNDS.concurrency.default, rps),
    scenarios,
    evidenceOut,
  };
}

export function assertRehearsalAuthority(
  context: { targetClass: string; targetFingerprintHash: string },
  confirmValue: string | undefined,
): void {
  if (!(LOAD_REHEARSAL_TARGET_CLASSES as readonly string[]).includes(context.targetClass)) {
    throw new RehearsalRefusal(
      `Refused: load rehearsal runs only against disposable targets, not "${context.targetClass}".`,
    );
  }
  if (!confirmValue) {
    throw new RehearsalRefusal(
      `Refused: set ${LOAD_REHEARSAL_CONFIRM_ENV} to the exact target fingerprint to opt in.`,
    );
  }
  if (confirmValue !== context.targetFingerprintHash) {
    throw new RehearsalRefusal(
      'Refused: load rehearsal confirmation does not match the resolved target fingerprint.',
    );
  }
}

export function percentile(samples: readonly number[], p: number): number | null {
  if (samples.length === 0) return null;
  if (!(p > 0) || p > 100) throw new RehearsalRefusal(`Invalid percentile ${p}.`);
  const sorted = [...samples].sort((left, right) => left - right);
  const rank = Math.ceil((p / 100) * sorted.length);
  return sorted[Math.min(sorted.length, Math.max(1, rank)) - 1];
}

export function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function summarizeScenario(
  name: string,
  samples: readonly RehearsalSample[],
): ScenarioSummary {
  const successful = samples.filter(sample => sample.ok).map(sample => sample.latencyMs);
  const errors = samples.length - successful.length;
  return {
    name,
    requests: samples.length,
    errors,
    errorRate: samples.length === 0 ? 0 : round(errors / samples.length, 4),
    p50Ms: percentile(successful, 50) === null ? null : round(percentile(successful, 50)!),
    p95Ms: percentile(successful, 95) === null ? null : round(percentile(successful, 95)!),
    p99Ms: percentile(successful, 99) === null ? null : round(percentile(successful, 99)!),
    maxMs: successful.length === 0 ? null : round(Math.max(...successful)),
  };
}

export function evaluateScenario(
  summary: ScenarioSummary,
  kind: ScenarioKind = 'read',
): ScenarioEvaluation {
  const thresholds = kind === 'write' ? WRITE_REHEARSAL_THRESHOLDS : READ_REHEARSAL_THRESHOLDS;
  const failures: string[] = [];
  if (summary.requests === 0) {
    failures.push('no requests observed');
  }
  if (summary.errorRate > thresholds.errorRateMax) {
    failures.push(`error rate ${summary.errorRate} exceeds ${thresholds.errorRateMax}`);
  }
  if (summary.p95Ms !== null && summary.p95Ms > thresholds.p95MsMax) {
    failures.push(`p95 ${summary.p95Ms}ms exceeds ${thresholds.p95MsMax}ms`);
  }
  if (summary.p99Ms !== null && summary.p99Ms > thresholds.p99MsMax) {
    failures.push(`p99 ${summary.p99Ms}ms exceeds ${thresholds.p99MsMax}ms`);
  }
  return { name: summary.name, pass: failures.length === 0, failures };
}

export function evaluateLease(summary: ScenarioSummary): ScenarioEvaluation {
  const failures: string[] = [];
  if (summary.requests === 0) {
    failures.push('no lease samples observed');
  }
  if (summary.errorRate > 0) {
    failures.push(`connection-lease acquisition errors: ${summary.errors}`);
  }
  if (summary.p95Ms !== null && summary.p95Ms > CONNECTION_LEASE_THRESHOLDS.p95MsMax) {
    failures.push(`p95 ${summary.p95Ms}ms exceeds ${CONNECTION_LEASE_THRESHOLDS.p95MsMax}ms`);
  }
  return { name: summary.name, pass: failures.length === 0, failures };
}
