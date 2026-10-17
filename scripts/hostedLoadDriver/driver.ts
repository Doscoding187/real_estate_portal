import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  READ_REHEARSAL_THRESHOLDS,
  RehearsalRefusal,
  WRITE_REHEARSAL_THRESHOLDS,
  evaluateScenario,
  round,
  summarizeScenario,
  type RehearsalSample,
} from '../loadRehearsal/config';
import type { HostedLoadConfig } from './config';
import { HOSTED_LOAD_BOUNDS, dueTimeForIndex, totalScheduledRequests } from './schedule';
import {
  buildHostedScenarios,
  createHostedLoadClient,
  discoverHostedFixtures,
  type HostedScenario,
} from './scenarios';

export const HOSTED_LOAD_EXIT = {
  pass: 0,
  refusal: 1,
  thresholdBreach: 2,
  aborted: 3,
} as const;

export interface HostedLoadRunOptions {
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export interface HostedLoadResult {
  exitCode: number;
  evidence: Record<string, unknown>;
}

const SETTLE_GRACE_MS = 5_000;
const TICK_MS = 1_000;

export async function runHostedLoad(
  config: HostedLoadConfig,
  options: HostedLoadRunOptions = {},
): Promise<HostedLoadResult> {
  const now = options.now ?? (() => performance.now());
  const sleep = options.sleep ?? (ms => new Promise<void>(resolve => setTimeout(resolve, ms)));

  const client = createHostedLoadClient(config.targetOrigin);
  const fixtures = await discoverHostedFixtures(client);
  const allScenarios = buildHostedScenarios(client, fixtures, true);
  const requestedNames = config.scenarios.length
    ? config.scenarios
    : allScenarios
        .filter(scenario => scenario.kind !== 'write' || config.smokeWrite)
        .map(s => s.name);
  const enabled: HostedScenario[] = [];
  for (const name of requestedNames) {
    const scenario = allScenarios.find(candidate => candidate.name === name);
    if (!scenario) {
      throw new RehearsalRefusal(
        `Refused: scenario "${name}" is not available on this target. ${
          name === 'property-detail-view'
            ? 'The hosted smoke write requires --enable-smoke-write.'
            : 'Discoverable typed geography or public inventory is missing.'
        }`,
      );
    }
    if (scenario.kind === 'write' && !config.smokeWrite) {
      throw new RehearsalRefusal(
        'Refused: the property-detail-view smoke write requires --enable-smoke-write and a recorded admission decision.',
      );
    }
    enabled.push(scenario);
  }
  if (enabled.length === 0) {
    throw new RehearsalRefusal('Refused: no scenarios are enabled for this run.');
  }

  const totalRequests = totalScheduledRequests(config.ratePlan, config.durationSeconds);
  const samples = new Map<string, RehearsalSample[]>(enabled.map(scenario => [scenario.name, []]));
  const pending = new Set<Promise<void>>();
  let dispatched = 0;
  let drops = 0;
  let inflight = 0;
  let maxInflight = 0;
  let abortReason: string | null = null;
  const startedAt = new Date();
  const startTick = now();

  const onAbort = (label: string): void => {
    if (abortReason === null) abortReason = label;
  };
  const signalHandlers: Array<[NodeJS.Signals, () => void]> = [
    ['SIGINT', () => onAbort('SIGINT')],
    ['SIGTERM', () => onAbort('SIGTERM')],
  ];
  for (const [signal, handler] of signalHandlers) process.once(signal, handler);
  const checkAbortFile = (): void => {
    if (config.abortFile && existsSync(config.abortFile)) {
      onAbort(`abort-file: ${config.abortFile}`);
    }
  };
  checkAbortFile();

  const dispatch = (scenario: HostedScenario): void => {
    inflight += 1;
    maxInflight = Math.max(maxInflight, inflight);
    dispatched += 1;
    const sampleStart = now();
    const record = (ok: boolean): void => {
      samples.get(scenario.name)!.push({ latencyMs: now() - sampleStart, ok });
    };
    const promise = scenario
      .execute()
      .then(
        () => record(true),
        () => record(false),
      )
      .finally(() => {
        inflight -= 1;
        pending.delete(promise);
      });
    pending.add(promise);
  };

  let index = 0;
  while (index < totalRequests && abortReason === null) {
    const dueMs = dueTimeForIndex(config.ratePlan, config.durationSeconds, index) * 1_000;
    const elapsedMs = now() - startTick;
    if (dueMs > elapsedMs) {
      await sleep(Math.min(dueMs - elapsedMs, TICK_MS));
      checkAbortFile();
      continue;
    }
    while (index < totalRequests && abortReason === null) {
      const nextDueMs = dueTimeForIndex(config.ratePlan, config.durationSeconds, index) * 1_000;
      if (nextDueMs > now() - startTick) break;
      const scenario = enabled[index % enabled.length];
      index += 1;
      if (inflight >= config.inflightCap) {
        drops += 1;
        continue;
      }
      dispatch(scenario);
    }
    checkAbortFile();
  }

  const settleBudgetMs = HOSTED_LOAD_BOUNDS.requestTimeoutMs + SETTLE_GRACE_MS;
  const settleStart = now();
  while (pending.size > 0 && now() - settleStart < settleBudgetMs) {
    await Promise.race([Promise.allSettled([...pending]), sleep(250)]);
    checkAbortFile();
  }
  const unsettled = pending.size;
  const elapsedSeconds = (now() - startTick) / 1_000;

  const scenarioResults = enabled.map(scenario => {
    const summary = summarizeScenario(scenario.name, samples.get(scenario.name)!);
    const evaluation = evaluateScenario(summary, scenario.kind);
    return {
      ...summary,
      kind: scenario.kind,
      thresholds:
        scenario.kind === 'write' ? WRITE_REHEARSAL_THRESHOLDS : READ_REHEARSAL_THRESHOLDS,
      pass: evaluation.pass,
      failures: evaluation.failures,
    };
  });

  const aborted = abortReason !== null;
  const failures: string[] = [];
  if (abortReason) failures.push(`aborted: ${abortReason}`);
  if (!aborted) {
    for (const result of scenarioResults) {
      for (const failure of result.failures) failures.push(`${result.name}: ${failure}`);
    }
  }
  if (drops > 0) {
    failures.push(
      `${drops} scheduled requests dropped because the in-flight cap ${config.inflightCap} was reached`,
    );
  }
  if (unsettled > 0) {
    failures.push(`${unsettled} requests did not settle within ${settleBudgetMs}ms`);
  }
  const pass = !aborted && failures.length === 0;
  const exitCode = aborted
    ? HOSTED_LOAD_EXIT.aborted
    : pass
      ? HOSTED_LOAD_EXIT.pass
      : HOSTED_LOAD_EXIT.thresholdBreach;

  const evidence = {
    evidenceClass: 'hosted-load-driver-run-not-an-admitted-window',
    generatedAt: new Date().toISOString(),
    config: {
      targetHost: config.targetHost,
      durationSeconds: config.durationSeconds,
      ratePlan: config.ratePlan,
      ratePlanSource: config.ratePlanSource,
      inflightCap: config.inflightCap,
      smokeWrite: config.smokeWrite,
      abortFile: config.abortFile,
      scenarios: enabled.map(scenario => ({ name: scenario.name, kind: scenario.kind })),
    },
    thresholds: {
      read: READ_REHEARSAL_THRESHOLDS,
      write: WRITE_REHEARSAL_THRESHOLDS,
    },
    scheduling: {
      totalScheduledRequests: totalRequests,
      dispatched,
      completed: dispatched - unsettled,
      drops,
      maxInflight,
      achievedRps: round(dispatched / Math.max(elapsedSeconds, 0.001), 2),
      elapsedSeconds: round(elapsedSeconds),
    },
    scenarios: scenarioResults,
    unavailableScenarios: fixtures.unavailable,
    abortReason,
    unsettledRequests: unsettled,
    notes: [
      'Open-model hosted load traffic for the B17 capacity workstream; the driver schedules by wall-clock and records every drop instead of self-throttling.',
      'Not an admitted hosting window by itself: no run may start without a recorded admission decision for the exact target window.',
      'The property-detail-view smoke write increments real public view counters irreversibly on hosted targets and stays disabled by default.',
      'The provisional rate plan is a candidate that must be replaced or confirmed by the admitted window forecast.',
      `Workload started ${startedAt.toISOString()} against host ${config.targetHost}.`,
    ],
    verdict: { pass, exitCode, failures },
  };

  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  if (config.evidenceOut) {
    mkdirSync(dirname(config.evidenceOut), { recursive: true });
    writeFileSync(config.evidenceOut, serialized, { encoding: 'utf8', mode: 0o600 });
    console.log(`[hosted-load] evidence written to ${config.evidenceOut}`);
  } else {
    process.stdout.write(serialized);
  }
  console.log(
    `[hosted-load] host ${config.targetHost} elapsed ${evidence.scheduling.elapsedSeconds}s achieved ${evidence.scheduling.achievedRps} rps dispatched ${dispatched}/${totalRequests}`,
  );
  for (const scenario of scenarioResults) {
    console.log(
      `[hosted-load] ${scenario.name} (${scenario.kind}) requests=${scenario.requests} errors=${scenario.errors} p95=${scenario.p95Ms}ms p99=${scenario.p99Ms}ms pass=${scenario.pass}`,
    );
  }
  if (!pass) {
    const label = aborted ? 'aborted' : 'threshold failures';
    console.error(`[hosted-load] ${label}: ${failures.join('; ')}`);
  }

  return { exitCode, evidence };
}
