import { describe, expect, it } from 'vitest';
import { createAuthRateLimitStore, RedisAuthRateLimitStore } from './authRateLimitStore';

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

  it('creates a shared Redis store for deployed environments without connecting at startup', () => {
    expect(
      createAuthRateLimitStore({
        runtimeEnv: 'production',
        env: { REDIS_URL: 'rediss://cache.example.test:6379' },
      }),
    ).toBeInstanceOf(RedisAuthRateLimitStore);
  });
});
