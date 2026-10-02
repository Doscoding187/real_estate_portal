import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

const { constructed, client } = vi.hoisted(() => ({
  constructed: vi.fn(),
  client: {
    on: vi.fn(),
    ping: vi.fn(),
    info: vi.fn(),
    dbsize: vi.fn(),
    quit: vi.fn(),
  },
}));
vi.mock('ioredis', () => ({
  default: class {
    constructor(...args: unknown[]) {
      constructed(...args);
      return client;
    }
  },
}));
vi.mock('../authRateLimitStore', async importOriginal => ({
  ...(await importOriginal<typeof import('../authRateLimitStore')>()),
  getAuthRateLimitStoreHealth: async () => ({ ok: true, mode: 'redis' }),
}));
vi.mock('../hostedDatabaseReadinessMonitor', () => ({
  hostedDatabaseReadinessSnapshot: () => ({ applicationReady: true }),
}));
vi.mock('../hostedRuntimeConfiguration', () => ({
  hostedRuntimeConfigurationIssues: () => [],
  resolveHostedBuildSha: () => 'a'.repeat(40),
}));
vi.mock('../../services/publicLeadRateLimitService', () => ({
  getPublicLeadRateLimitStoreHealth: async () => ({ ok: true, mode: 'redis', required: true }),
}));
vi.mock('../../services/commercialTermNoticeScheduler', () => ({
  commercialTermNoticeScheduler: { status: () => ({ timerActive: true }) },
}));
import { getCacheHealth, getRedisCacheManager, initializeCache, shutdownCache } from './redis';
import { registerHealthEndpoint } from '../health';

describe('hosted cache connection authority', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('APP_ENV', 'production');
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('REDIS_URL', 'redis://default:test-password@redis.railway.internal:6379/0');
    vi.stubEnv('REDIS_HOST', 'unrelated-host.invalid');
    client.ping.mockResolvedValue('PONG');
    client.info.mockResolvedValue('used_memory:0\r\n');
    client.dbsize.mockResolvedValue(0);
    client.quit.mockResolvedValue('OK');
  });

  it('uses the same REDIS_URL as the security stores and starts the connection', async () => {
    await initializeCache();
    expect(constructed).toHaveBeenCalledWith(
      process.env.REDIS_URL,
      expect.objectContaining({ lazyConnect: false }),
    );
    expect(await getCacheHealth()).toMatchObject({
      status: 'healthy',
      redis: { connected: true },
      metrics: { fallback_mode: false },
    });
    expect(client.ping).toHaveBeenCalledTimes(1);
    await shutdownCache();
  });

  it('reports disconnected fallback after an actual ping failure', async () => {
    await initializeCache();
    client.ping.mockRejectedValue(new Error('unavailable'));
    expect(await getCacheHealth()).toMatchObject({
      status: 'degraded',
      redis: { connected: false },
      metrics: { fallback_mode: true },
    });
    await shutdownCache();
  });

  it('does not select a different hosted target from REDIS_HOST when URL is absent', async () => {
    vi.stubEnv('REDIS_URL', '');
    await initializeCache();
    expect(constructed).not.toHaveBeenCalled();
    expect(await getCacheHealth()).toMatchObject({
      redis: { connected: false },
      metrics: { fallback_mode: true },
    });
    await shutdownCache();
  });

  it('recovers HTTP readiness after more than ten failed probes without restarting or clearing telemetry', async () => {
    for (const key of [
      'AWS_REGION',
      'S3_BUCKET_NAME',
      'AWS_ACCESS_KEY_ID',
      'AWS_SECRET_ACCESS_KEY',
    ]) {
      vi.stubEnv(key, 'test-configured');
    }
    await initializeCache();
    const manager = getRedisCacheManager();
    const app = express();
    registerHealthEndpoint(app);
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const address = server.address() as AddressInfo;
    const url = `http://127.0.0.1:${address.port}/api/readiness`;
    async function expectReadiness(status: number, ready: boolean) {
      const response = await fetch(url);
      expect(response.status).toBe(status);
      expect(await response.json()).toMatchObject({
        ok: ready,
        env: 'production',
        cache: { ok: ready, mode: ready ? 'redis' : 'memory' },
      });
    }

    try {
      await expectReadiness(200, true);
      client.ping.mockRejectedValue(new Error('Redis outage'));
      for (let i = 0; i < 11; i++) await expectReadiness(503, false);
      expect((await manager.getStats()).connectionErrors).toBe(11);

      client.ping.mockResolvedValue('PONG');
      await expectReadiness(200, true);
      expect(await getCacheHealth()).toMatchObject({
        status: 'healthy',
        redis: { connected: true },
        metrics: { fallback_mode: false },
      });
      expect((await manager.getStats()).connectionErrors).toBe(11);
      expect(getRedisCacheManager()).toBe(manager);
      expect(constructed).toHaveBeenCalledTimes(1);
      expect(client.quit).not.toHaveBeenCalled();

      // A later outage must still close readiness, despite the previous recovery.
      client.ping.mockRejectedValue(new Error('Second Redis outage'));
      await expectReadiness(503, false);
      client.ping.mockResolvedValue('PONG');
      await expectReadiness(200, true);
      expect((await manager.getStats()).connectionErrors).toBe(12);
    } finally {
      server.close();
      await once(server, 'close');
      await shutdownCache();
    }
  });
});
