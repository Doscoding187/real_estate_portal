import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { authorizeDatabaseOperation } from '../server/_core/databaseAuthority/authorization';
import {
  databaseAuthorityChildEnvironment,
  resolveDatabaseAuthority,
} from '../server/_core/databaseAuthority/context';
import {
  LOAD_REHEARSAL_BOUNDS,
  LOAD_REHEARSAL_CONFIRM_ENV,
  READ_REHEARSAL_THRESHOLDS,
  RehearsalRefusal,
  assertRehearsalAuthority,
  evaluateScenario,
  parseRehearsalConfig,
  round,
  summarizeScenario,
  type RehearsalSample,
} from './loadRehearsal/config';

/**
 * Bounded, opt-in local read-load rehearsal for the B17 recovery/capacity
 * workstream. It exercises real public read procedures against the owned
 * disposable worktree target and reports latency/error statistics against the
 * master-plan read thresholds. It is not the hosted 24-hour workload gate.
 */
async function main(): Promise<void> {
  if (process.env.NODE_ENV !== 'test' || process.env.APP_ENV !== 'test') {
    throw new RehearsalRefusal(
      'Refused: NODE_ENV and APP_ENV must both be test so the rehearsal targets the disposable worktree authority.',
    );
  }

  const config = parseRehearsalConfig(process.argv.slice(2), process.env);
  const authority = resolveDatabaseAuthority({ operation: 'runtime-connect' });
  assertRehearsalAuthority(authority.context, process.env[LOAD_REHEARSAL_CONFIRM_ENV]);
  authorizeDatabaseOperation(authority);
  Object.assign(process.env, databaseAuthorityChildEnvironment(authority, process.env));

  const { getDb, shutdownDb } = await import('../server/db-connection');
  await getDb();
  const { db } = await import('../server/db');
  const { appRouter } = await import('../server/routers');
  const { desc } = await import('drizzle-orm');
  const { properties } = await import('../drizzle/schema');

  const caller = appRouter.createCaller({
    user: null,
    req: { headers: {} },
    res: {},
    requestId: 'b17-local-load-rehearsal',
  } as any);

  const timeoutMs = LOAD_REHEARSAL_BOUNDS.requestTimeoutMs;
  const withTimeout = async <T>(promise: Promise<T>): Promise<T> => {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => reject(new Error(`request timed out after ${timeoutMs}ms`)), timeoutMs);
        }),
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };

  const candidateRows = await db
    .select({ id: properties.id })
    .from(properties)
    .orderBy(desc(properties.id))
    .limit(32);
  const candidateIds = candidateRows
    .map((row: { id: unknown }) => Number(row.id))
    .filter((id: number) => Number.isSafeInteger(id) && id > 0);

  const publicIds: number[] = [];
  for (let index = 0; index < candidateIds.length && publicIds.length < 8; index += 4) {
    const chunk = candidateIds.slice(index, index + 4);
    const details = await withTimeout(caller.properties.getPublicByIds({ ids: chunk }));
    for (const detail of details) {
      const id = Number((detail as { property?: { id?: unknown } })?.property?.id);
      if (Number.isSafeInteger(id) && id > 0 && !publicIds.includes(id)) publicIds.push(id);
    }
  }
  if (publicIds.length === 0) {
    throw new RehearsalRefusal(
      'Refused: no public-eligible properties exist on the disposable target, so no representative read workload can be built.',
    );
  }

  const [sampleDetail] = await withTimeout(
    caller.properties.getPublicByIds({ ids: [publicIds[0]] }),
  );
  const sampleProperty = (sampleDetail as { property?: Record<string, unknown> })?.property ?? {};
  const readText = (value: unknown): string =>
    typeof value === 'string' && value.trim() ? value.trim() : '';
  const city = readText(sampleProperty.city);
  const province = readText(sampleProperty.province);

  const unavailable: Array<{ name: string; reason: string }> = [];
  const searchWorks = async (name: string, input: Record<string, unknown>): Promise<boolean> => {
    try {
      const result = (await withTimeout(
        caller.properties.searchPublicInventory(input as any),
      )) as { cards?: unknown[] };
      if (!Array.isArray(result?.cards) || result.cards.length === 0) {
        unavailable.push({ name, reason: 'search returned no public cards for the discovered geography' });
        return false;
      }
      return true;
    } catch (error) {
      unavailable.push({
        name,
        reason: `search warmup failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      return false;
    }
  };

  // Each search request carries exactly one geography authority (typed city or
  // typed province). Mixed-authority inputs are deliberately never produced.
  const cityAvailable = city && (await searchWorks('search-typed-city', { city, listingType: 'sale', pageSize: 24 }));
  const provinceAvailable =
    province &&
    (await searchWorks('search-typed-province', { province, listingType: 'sale', pageSize: 24 }));

  let detailCursor = 0;
  let relatedCursor = 0;
  const scenarios: Array<{ name: string; execute: () => Promise<unknown> }> = [
    {
      name: 'property-detail',
      execute: async () => {
        const id = publicIds[detailCursor++ % publicIds.length];
        const details = await withTimeout(caller.properties.getPublicByIds({ ids: [id] }));
        if (!Array.isArray(details) || details.length === 0) {
          throw new Error(`public detail projection missing for property ${id}`);
        }
        return details[0];
      },
    },
    {
      name: 'property-related-feed',
      execute: () => {
        const id = publicIds[relatedCursor++ % publicIds.length];
        return withTimeout(caller.properties.getRelatedPublicInventory({ propertyId: id }));
      },
    },
  ];
  if (cityAvailable) {
    scenarios.push({
      name: 'search-typed-city',
      execute: () => withTimeout(caller.properties.searchPublicInventory({ city, listingType: 'sale', pageSize: 24 })),
    });
  }
  if (provinceAvailable) {
    scenarios.push({
      name: 'search-typed-province',
      execute: () =>
        withTimeout(caller.properties.searchPublicInventory({ province, listingType: 'sale', pageSize: 24 })),
    });
  }

  const enabled =
    config.scenarios.length > 0
      ? scenarios.filter(scenario => config.scenarios.includes(scenario.name))
      : scenarios;
  if (enabled.length === 0) {
    throw new RehearsalRefusal(
      `Refused: no requested scenarios are available. Known: ${scenarios.map(s => s.name).join(', ')}.`,
    );
  }
  if (!enabled.some(scenario => scenario.name.startsWith('search-'))) {
    throw new RehearsalRefusal(
      'Refused: at least one typed-geography public search scenario must be available for a representative read rehearsal.',
    );
  }

  const samples = new Map<string, RehearsalSample[]>();
  enabled.forEach(scenario => samples.set(scenario.name, []));
  const totalRequests = Math.max(
    enabled.length,
    Math.floor(config.durationSeconds * config.rps),
  );
  const intervalMs = 1000 / config.rps;
  const startedAt = new Date();
  const startedAtMs = performance.now();
  let nextIndex = 0;

  const workers = Array.from({ length: config.concurrency }, async () => {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;
      if (index >= totalRequests) return;
      const issueAt = startedAtMs + index * intervalMs;
      const waitMs = issueAt - performance.now();
      if (waitMs > 0) await new Promise(resolve => setTimeout(resolve, waitMs));
      const scenario = enabled[index % enabled.length];
      const requestStartedMs = performance.now();
      let ok = true;
      try {
        await scenario.execute();
      } catch {
        ok = false;
      }
      samples.get(scenario.name)!.push({ latencyMs: performance.now() - requestStartedMs, ok });
    }
  });
  await Promise.all(workers);
  const elapsedSeconds = (performance.now() - startedAtMs) / 1000;

  const summaries = enabled.map(scenario =>
    summarizeScenario(scenario.name, samples.get(scenario.name) ?? []),
  );
  const evaluations = summaries.map(evaluateScenario);
  const pass = evaluations.every(evaluation => evaluation.pass);
  const evidence = {
    evidenceClass: 'local-load-rehearsal-not-the-hosted-24h-gate',
    generatedAt: new Date().toISOString(),
    authority: {
      targetClass: authority.context.targetClass,
      targetFingerprintHash: authority.context.targetFingerprintHash,
    },
    config,
    thresholds: READ_REHEARSAL_THRESHOLDS,
    achievedRps: round(totalRequests / Math.max(elapsedSeconds, 0.001), 2),
    elapsedSeconds: round(elapsedSeconds),
    scenarios: summaries.map((summary, index) => ({ ...summary, ...evaluations[index] })),
    unavailableScenarios: unavailable,
    notes: [
      'Bounded local smoke rehearsal of public read procedures only.',
      'Not the B17 24-hour representative workload, write-latency, connection-acquisition, restart/backlog, backup/restore or provider recovery evidence.',
      `Workload started ${startedAt.toISOString()}.`,
    ],
    verdict: { pass, failures: evaluations.flatMap(evaluation => evaluation.failures.map(failure => `${evaluation.name}: ${failure}`)) },
  };

  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  if (config.evidenceOut) {
    mkdirSync(dirname(config.evidenceOut), { recursive: true });
    writeFileSync(config.evidenceOut, serialized, { encoding: 'utf8', mode: 0o600 });
    console.log(`[load-rehearsal] evidence written to ${config.evidenceOut}`);
  } else {
    process.stdout.write(serialized);
  }
  console.log(
    `[load-rehearsal] target ${authority.context.targetFingerprintHash.slice(0, 16)} elapsed ${evidence.elapsedSeconds}s achieved ${evidence.achievedRps} rps`,
  );
  for (const scenario of evidence.scenarios) {
    console.log(
      `[load-rehearsal] ${scenario.name}: n=${scenario.requests} errors=${scenario.errors} p50=${scenario.p50Ms}ms p95=${scenario.p95Ms}ms p99=${scenario.p99Ms}ms ${scenario.pass ? 'PASS' : 'FAIL'}`,
    );
  }
  if (!pass) {
    console.error(`[load-rehearsal] threshold failures: ${evidence.verdict.failures.join('; ')}`);
  }
  // Application routers retain module-level workers and the authority pool;
  // exit explicitly after the bounded run instead of waiting for the loop.
  await shutdownDb();
  process.exit(pass ? 0 : 2);
}

main().catch(error => {
  if (error instanceof RehearsalRefusal) {
    console.error(`[load-rehearsal] ${error.message}`);
    process.exit(error.exitCode);
  }
  console.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
  process.exit(1);
});
