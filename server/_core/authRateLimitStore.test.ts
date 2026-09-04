import { afterEach, describe, expect, it, vi } from 'vitest';
import { createClient } from 'redis';
import {
  AuthRateLimitStoreUnavailableError,
  createAuthRateLimitStore,
  getAuthRateLimitStoreHealth,
  RedisAuthRateLimitStore,
  resolveAuthRateLimitStoreConfiguration,
} from './authRateLimitStore';

type RedisClientStub = {
  isOpen: boolean;
  on: ReturnType<typeof vi.fn>;
  connect: ReturnType<typeof vi.fn>;
  incr: ReturnType<typeof vi.fn>;
  pExpire: ReturnType<typeof vi.fn>;
  pTTL: ReturnType<typeof vi.fn>;
  get: ReturnType<typeof vi.fn>;
  decr: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
  ping: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

function createRedisClientStub(overrides: Partial<RedisClientStub> = {}): RedisClientStub {
  return {
    isOpen: true,
    on: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    incr: vi.fn().mockResolvedValue(1),
    pExpire: vi.fn().mockResolvedValue(1),
    pTTL: vi.fn().mockResolvedValue(15 * 60 * 1000),
    get: vi.fn().mockResolvedValue(null),
    decr: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    ping: vi.fn().mockResolvedValue('PONG'),
    destroy: vi.fn(),
    ...overrides,
  };
}

function clientFactory(client: RedisClientStub) {
  return vi.fn(
    () => client as unknown as ReturnType<typeof createClient>,
  ) as unknown as typeof createClient;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('authentication rate-limit store', () => {
  it('uses the built-in memory limiter locally even when a local Redis URL is configured', () => {
    expect(
      createAuthRateLimitStore({
        runtimeEnv: 'development',
        env: { REDIS_URL: 'redis://127.0.0.1:6379' },
      }),
    ).toBeUndefined();
  });

  it('refuses a deployed authentication boundary without Redis', () => {
    expect(() => createAuthRateLimitStore({ runtimeEnv: 'production', env: {} })).toThrow(
      'REDIS_URL is required',
    );
  });

  it('refuses a deployed authentication boundary with a non-Redis URL', () => {
    expect(() =>
      createAuthRateLimitStore({
        runtimeEnv: 'production',
        env: { REDIS_URL: 'https://cache.example.test' },
      }),
    ).toThrow('REDIS_URL must be a valid redis:// or rediss:// URL');
  });

  it('creates a shared Redis store for deployed environments without connecting at startup', () => {
    expect(
      createAuthRateLimitStore({
        runtimeEnv: 'production',
        env: { REDIS_URL: 'rediss://cache.example.test:6379' },
      }),
    ).toBeInstanceOf(RedisAuthRateLimitStore);
  });

  it('uses bounded defaults and ignores unsafe tuning values', () => {
    expect(resolveAuthRateLimitStoreConfiguration({})).toEqual({
      timeoutMs: 1_500,
      cooldownMs: 5_000,
    });
    expect(
      resolveAuthRateLimitStoreConfiguration({
        AUTH_RATE_LIMIT_STORE_TIMEOUT_MS: '0',
        AUTH_RATE_LIMIT_STORE_COOLDOWN_MS: 'forever',
      }),
    ).toEqual({ timeoutMs: 1_500, cooldownMs: 5_000 });
    expect(
      resolveAuthRateLimitStoreConfiguration({
        AUTH_RATE_LIMIT_STORE_TIMEOUT_MS: '750',
        AUTH_RATE_LIMIT_STORE_COOLDOWN_MS: '8000',
      }),
    ).toEqual({ timeoutMs: 750, cooldownMs: 8_000 });
  });

  it('bounds a stalled Redis connection and fails closed without retrying every request', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = createRedisClientStub({
      connect: vi.fn(() => new Promise(() => undefined)),
    });
    const factory = clientFactory(client);
    const store = new RedisAuthRateLimitStore('rediss://cache.example.test:6379', {
      clientFactory: factory,
      timeoutMs: 250,
      cooldownMs: 60_000,
    });

    await expect(store.increment('203.0.113.1')).rejects.toMatchObject({
      name: 'AuthRateLimitStoreUnavailableError',
      code: 'AUTH_RATE_LIMIT_STORE_UNAVAILABLE',
      retryAfterSeconds: 60,
    });
    expect(factory).toHaveBeenCalledWith({
      url: 'rediss://cache.example.test:6379',
      disableOfflineQueue: true,
      socket: { connectTimeout: 250, reconnectStrategy: false },
    });
    expect(client.destroy).toHaveBeenCalledTimes(1);

    await expect(store.increment('203.0.113.1')).rejects.toBeInstanceOf(
      AuthRateLimitStoreUnavailableError,
    );
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('bounds stalled Redis commands after a connection has been established', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = createRedisClientStub({
      incr: vi.fn(() => new Promise(() => undefined)),
    });
    const store = new RedisAuthRateLimitStore('redis://cache.example.test:6379', {
      clientFactory: clientFactory(client),
      timeoutMs: 250,
      cooldownMs: 60_000,
    });

    await expect(store.increment('203.0.113.2')).rejects.toBeInstanceOf(
      AuthRateLimitStoreUnavailableError,
    );
    expect(client.destroy).toHaveBeenCalledTimes(1);
  });

  it('recovers automatically after the cooldown and records new distributed hits', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    vi.spyOn(console, 'info').mockImplementation(() => undefined);
    let now = 100;
    const unavailableClient = createRedisClientStub({
      connect: vi.fn().mockRejectedValue(new Error('network unavailable')),
    });
    const recoveredClient = createRedisClientStub({
      incr: vi.fn().mockResolvedValue(2),
      pTTL: vi.fn().mockResolvedValue(30_000),
    });
    const factory = vi
      .fn()
      .mockReturnValueOnce(unavailableClient)
      .mockReturnValueOnce(recoveredClient) as unknown as typeof createClient;
    const store = new RedisAuthRateLimitStore('redis://cache.example.test:6379', {
      clientFactory: factory,
      timeoutMs: 250,
      cooldownMs: 1_000,
      now: () => now,
    });

    await expect(store.increment('203.0.113.3')).rejects.toBeInstanceOf(
      AuthRateLimitStoreUnavailableError,
    );

    now += 1_001;
    await expect(store.increment('203.0.113.3')).resolves.toMatchObject({ totalHits: 2 });
    expect(factory).toHaveBeenCalledTimes(2);
    expect(recoveredClient.incr).toHaveBeenCalledWith(
      'property-listify:rate-limit:auth:203.0.113.3',
    );
  });

  it('probes the same bounded connection path without leaking a store error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const client = createRedisClientStub({
      ping: vi.fn().mockRejectedValue(new Error('redis unavailable')),
    });
    const store = new RedisAuthRateLimitStore('redis://cache.example.test:6379', {
      clientFactory: clientFactory(client),
      timeoutMs: 250,
      cooldownMs: 60_000,
    });

    await expect(store.probe()).resolves.toBe(false);
  });

  it('does not report an omitted limiter as healthy in a deployed runtime', async () => {
    await expect(getAuthRateLimitStoreHealth(undefined, 'production')).resolves.toEqual({
      ok: false,
      mode: 'memory',
    });
    await expect(getAuthRateLimitStoreHealth(undefined, 'development')).resolves.toEqual({
      ok: true,
      mode: 'memory',
    });
  });
});
