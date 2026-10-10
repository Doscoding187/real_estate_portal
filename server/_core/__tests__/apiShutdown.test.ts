import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const fixture = fileURLToPath(new URL('./fixtures/apiShutdownChild.ts', import.meta.url));

async function runApiShutdown(
  signal: 'SIGTERM' | 'SIGINT',
  redisUrl?: string,
  loadGooglePlaces = false,
  scenario?:
    | 'core-redis-failure'
    | 'explore-redis-failure'
    | 'saved-startup'
    | 'commercial-startup',
) {
  const child = spawn(process.execPath, ['--import', 'tsx', fixture], {
    cwd: root,
    // Do not inherit credentials, local DB configuration, NODE_OPTIONS or services.
    env: {
      PATH: process.env.PATH,
      NODE_ENV: 'test',
      APP_ENV: 'test',
      SKIP_FRONTEND: 'true',
      PORT: '0',
      JWT_SECRET: 'shutdown-regression-only-secret',
      SAVED_SEARCH_SCHEDULER_ENABLED: 'true',
      LOAD_GOOGLE_PLACES: String(loadGooglePlaces),
      ...(scenario ? { SHUTDOWN_SCENARIO: scenario } : {}),
      ...(redisUrl ? { REDIS_URL: redisUrl } : {}),
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let shutdownAt: number | undefined;
  let timer: NodeJS.Timeout;
  const startedAt = Date.now();
  const result = await new Promise<{ code: number | null; signal: string | null }>(
    (resolve, reject) => {
      const fail = (message: string) => {
        // Mark failure first. Killing is solely harness cleanup after failure.
        reject(new Error(`${message}\n${output}`));
        child.kill('SIGKILL');
      };
      timer = setTimeout(() => fail('API did not start within 15 seconds'), 15_000);
      const collect = (chunk: Buffer) => {
        output += chunk.toString();
        const retriesStarted =
          !redisUrl ||
          (output.includes('[Redis] Connection error:') &&
            output.includes('Redis cache unavailable, switching to fallback mode:'));
        if (
          shutdownAt === undefined &&
          retriesStarted &&
          output.includes(
            scenario?.endsWith('-startup')
              ? 'STARTUP_WAITING_FOR_SHUTDOWN'
              : 'Backend running on http://localhost:0',
          )
        ) {
          shutdownAt = Date.now();
          clearTimeout(timer);
          timer = setTimeout(
            () => fail('API did not exit naturally within 4 seconds of shutdown'),
            4_000,
          );
          child.kill(signal);
        }
      };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      child.once('error', reject);
      child.once('close', (code, exitSignal) => resolve({ code, signal: exitSignal }));
    },
  ).finally(() => clearTimeout(timer));

  expect(shutdownAt, output).toBeDefined();
  const failedCleanup = scenario?.endsWith('-failure');
  expect(result, output).toEqual({ code: failedCleanup ? 1 : 0, signal: null });
  expect(output).toContain(`[Shutdown] ${signal} received`);
  if (failedCleanup) {
    expect(output).toContain(
      scenario === 'core-redis-failure'
        ? 'CORE_REDIS_SHUTDOWN_FAILURE'
        : 'EXPLORE_REDIS_SHUTDOWN_FAILURE',
    );
    expect(output).toContain('[Shutdown] Failed to close cleanly.');
  } else {
    expect(output).toContain('[Shutdown] Cleanup completed.');
  }
  if (scenario?.endsWith('-startup')) {
    expect(output).toContain('STARTUP_FINISHED_AFTER_SHUTDOWN');
    expect(output).not.toContain('Backend running on');
  }
  expect(output).toContain('SHUTDOWN_RESOURCES_RELEASED');
  console.info('API natural exit', {
    requestedSignal: signal,
    redis: redisUrl ? 'unavailable' : 'absent',
    loadGooglePlaces,
    scenario,
    startupMs: shutdownAt! - startedAt,
    shutdownMs: Date.now() - shutdownAt!,
    ...result,
  });
}

describe('API natural process exit', () => {
  it.each(['SIGTERM', 'SIGINT'] as const)(
    'releases real startup resources after %s',
    async signal => {
      await runApiShutdown(signal);
    },
    20_000,
  );

  it('cancels connection retries when Redis is unavailable during startup', async () => {
    // Port zero cannot accept connections. Both real Redis clients enter retry paths.
    await runApiShutdown('SIGTERM', 'redis://127.0.0.1:0');
  }, 20_000);

  it('releases Google Places when a location request has loaded it', async () => {
    await runApiShutdown('SIGTERM', undefined, true);
  }, 20_000);

  it.each(['core-redis-failure', 'explore-redis-failure'] as const)(
    'finishes independent cleanup and exits nonzero after %s',
    async scenario => {
      await runApiShutdown('SIGTERM', undefined, true, scenario);
    },
    20_000,
  );

  it.each(['saved-startup', 'commercial-startup'] as const)(
    'waits for %s and exits without opening its listener',
    async scenario => {
      await runApiShutdown('SIGTERM', undefined, false, scenario);
    },
    20_000,
  );
});
