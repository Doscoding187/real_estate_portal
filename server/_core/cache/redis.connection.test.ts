import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
import { getCacheHealth, initializeCache, shutdownCache } from './redis';

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
});
