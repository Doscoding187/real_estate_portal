import { describe, expect, it, vi } from 'vitest';
import { createClient } from 'redis';
import { RedisAuthRateLimitStore } from '../../_core/authRateLimitStore';
import {
  createPublicLeadRateLimitChecker,
  createPublicLeadRateLimitStore,
  getPublicLeadRateLimitStoreHealth,
  getPublicLeadClientIp,
  publicLeadRateLimitConstants,
} from '../publicLeadRateLimitService';

type CounterValue = { count: number; expiresAt: number };

function redisFactory(options: { now: () => number; fail?: boolean }) {
  const values = new Map<string, CounterValue>();
  const client = {
    isOpen: true,
    on: vi.fn().mockReturnThis(),
    connect: vi.fn().mockResolvedValue(undefined),
    eval: vi.fn(async (_script: string, command: { keys: string[]; arguments: string[] }) => {
      if (options.fail) throw new Error('redis unavailable');
      const key = command.keys[0];
      const previous = values.get(key);
      const current = previous && previous.expiresAt > options.now()
        ? { ...previous, count: previous.count + 1 }
        : {
            count: 1,
            expiresAt: options.now() + Number(command.arguments[0]),
          };
      values.set(key, current);
      return [current.count, Math.max(0, current.expiresAt - options.now())];
    }),
    get: vi.fn(),
    decr: vi.fn(),
    del: vi.fn(),
    ping: vi.fn(),
    destroy: vi.fn(),
  };
  const factory = vi.fn(() => client as any) as unknown as typeof createClient;
  return { factory, values };
}

describe('public lead rate limiting', () => {
  it('shares the IP window across store instances and expires it by TTL', async () => {
    let now = 1_000;
    const sharedRedis = redisFactory({ now: () => now });
    const firstStore = new RedisAuthRateLimitStore('rediss://cache.example.test:6379', {
      clientFactory: sharedRedis.factory,
      keyPrefix: publicLeadRateLimitConstants.keyPrefix,
      scopeLabel: 'public-lead',
      now: () => now,
    });
    const secondStore = new RedisAuthRateLimitStore('rediss://cache.example.test:6379', {
      clientFactory: sharedRedis.factory,
      keyPrefix: publicLeadRateLimitConstants.keyPrefix,
      scopeLabel: 'public-lead',
      now: () => now,
    });
    const firstInstance = createPublicLeadRateLimitChecker(firstStore, () => now);
    const secondInstance = createPublicLeadRateLimitChecker(secondStore, () => now);
    const response = { setHeader: vi.fn() } as any;

    for (let attempt = 0; attempt < publicLeadRateLimitConstants.maxPerWindow; attempt += 1) {
      const check = attempt % 2 === 0 ? firstInstance : secondInstance;
      await expect(check('203.0.113.25')).resolves.toBe(true);
    }
    await expect(secondInstance('203.0.113.25', response)).resolves.toBe(false);
    expect(response.setHeader).toHaveBeenCalledWith('Retry-After', '60');

    const storedKey = [...sharedRedis.values.keys()][0];
    expect(storedKey).toMatch(/^property-listify:rate-limit:public-lead:[a-f0-9]{64}$/);
    expect(storedKey).not.toContain('203.0.113.25');

    now += publicLeadRateLimitConstants.windowMs + 1;
    await expect(firstInstance('203.0.113.25')).resolves.toBe(true);
  });

  it('fails closed on Redis errors and refuses deployed in-memory fallback', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    let now = 0;
    const failedRedis = redisFactory({ now: () => now, fail: true });
    const store = new RedisAuthRateLimitStore('redis://cache.example.test:6379', {
      clientFactory: failedRedis.factory,
      keyPrefix: publicLeadRateLimitConstants.keyPrefix,
      scopeLabel: 'public-lead',
      now: () => now,
      timeoutMs: 250,
      cooldownMs: 1_000,
    });
    const check = createPublicLeadRateLimitChecker(store, () => now);
    await expect(check('198.51.100.19')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });

    expect(() => createPublicLeadRateLimitStore({ runtimeEnv: 'production', env: {} })).toThrow(
      /REDIS_URL is required/,
    );
    expect(() => createPublicLeadRateLimitStore({
      runtimeEnv: 'staging',
      env: { REDIS_URL: 'https://cache.example.test' },
    })).toThrow(/valid redis/);
  });

  it('keeps only local development on the memory store and trusts Express IP resolution', () => {
    expect(createPublicLeadRateLimitStore({ runtimeEnv: 'development', env: {} })).not.toBeInstanceOf(
      RedisAuthRateLimitStore,
    );
    expect(getPublicLeadClientIp({
      req: { ip: '203.0.113.11', headers: { 'x-forwarded-for': '198.51.100.7' } },
    })).toBe('203.0.113.11');
    expect(getPublicLeadClientIp({
      req: { socket: { remoteAddress: '127.0.0.1' }, headers: { 'x-forwarded-for': '198.51.100.7' } },
    })).toBe('127.0.0.1');
  });

  it('reports missing deployed limiter initialization as not ready', async () => {
    await expect(getPublicLeadRateLimitStoreHealth('production')).resolves.toEqual({
      ok: false,
      mode: 'uninitialized',
      required: true,
    });
    await expect(getPublicLeadRateLimitStoreHealth('development')).resolves.toEqual({
      ok: true,
      mode: 'uninitialized',
      required: false,
    });
  });
});
