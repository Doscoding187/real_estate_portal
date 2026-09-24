import { createHash } from 'node:crypto';
import type { Response } from 'express';
import { TRPCError } from '@trpc/server';
import type { AppRuntimeEnv } from '../_core/runtimeBootstrap';
import { resolveAppRuntimeEnv } from '../_core/runtimeBootstrap';
import {
  isValidAuthRateLimitRedisUrl,
  RedisAuthRateLimitStore,
  resolveAuthRateLimitStoreConfiguration,
} from '../_core/authRateLimitStore';

const LEAD_RATE_LIMIT_WINDOW_MS = 60_000;
const LEAD_RATE_LIMIT_MAX_PER_WINDOW = 12;
const PUBLIC_LEAD_RATE_LIMIT_KEY_PREFIX = 'property-listify:rate-limit:public-lead:';

type IncrementResult = { totalHits: number; resetTime: Date };
export type PublicLeadCounterStore = {
  init(options: { windowMs: number }): void;
  increment(key: string): Promise<IncrementResult>;
};

class InMemoryPublicLeadRateLimitStore implements PublicLeadCounterStore {
  private readonly entries = new Map<string, { count: number; resetAt: number }>();
  private windowMs = LEAD_RATE_LIMIT_WINDOW_MS;
  private calls = 0;

  init(options: { windowMs: number }) {
    this.windowMs = options.windowMs;
  }

  async increment(key: string): Promise<IncrementResult> {
    const now = Date.now();
    const previous = this.entries.get(key);
    const entry = previous && previous.resetAt > now
      ? { count: previous.count + 1, resetAt: previous.resetAt }
      : { count: 1, resetAt: now + this.windowMs };
    this.entries.set(key, entry);

    // Local development has no cross-process guarantee, but expired caller keys
    // are still reclaimed so a local spam test cannot grow this map forever.
    this.calls += 1;
    if (this.calls % 64 === 0) {
      for (const [storedKey, storedEntry] of this.entries) {
        if (storedEntry.resetAt <= now) this.entries.delete(storedKey);
      }
    }

    return { totalHits: entry.count, resetTime: new Date(entry.resetAt) };
  }
}

export function createPublicLeadRateLimitStore(input: {
  env?: NodeJS.ProcessEnv;
  runtimeEnv?: AppRuntimeEnv;
} = {}): PublicLeadCounterStore {
  const env = input.env ?? process.env;
  const runtimeEnv = input.runtimeEnv ?? resolveAppRuntimeEnv(env);
  const deployed = runtimeEnv === 'production' || runtimeEnv === 'staging';
  if (!deployed) return new InMemoryPublicLeadRateLimitStore();

  const redisUrl = String(env.REDIS_URL ?? '').trim();
  if (!redisUrl) throw new Error('REDIS_URL is required for deployed public enquiry rate limiting.');
  if (!isValidAuthRateLimitRedisUrl(redisUrl)) {
    throw new Error('REDIS_URL must be a valid redis:// or rediss:// URL.');
  }

  return new RedisAuthRateLimitStore(redisUrl, {
    ...resolveAuthRateLimitStoreConfiguration(env),
    keyPrefix: PUBLIC_LEAD_RATE_LIMIT_KEY_PREFIX,
    scopeLabel: 'public-lead',
  });
}

let configuredStore: PublicLeadCounterStore | null = null;
let configuredChecker: ((ip: string, response?: Response) => Promise<boolean>) | null = null;

export type PublicLeadRateLimitStoreHealth = {
  ok: boolean;
  mode: 'redis' | 'memory' | 'uninitialized';
  required: boolean;
};

export async function getPublicLeadRateLimitStoreHealth(
  runtimeEnv: AppRuntimeEnv = resolveAppRuntimeEnv(),
): Promise<PublicLeadRateLimitStoreHealth> {
  const required = runtimeEnv === 'production' || runtimeEnv === 'staging';
  if (!configuredStore) {
    return { ok: !required, mode: 'uninitialized', required };
  }
  if (configuredStore instanceof RedisAuthRateLimitStore) {
    return { ok: await configuredStore.probe(), mode: 'redis', required };
  }
  return { ok: !required, mode: 'memory', required };
}

export async function shutdownPublicLeadRateLimitStore(): Promise<void> {
  if (configuredStore instanceof RedisAuthRateLimitStore) await configuredStore.shutdown();
  configuredStore = null;
  configuredChecker = null;
}

export function createPublicLeadRateLimitChecker(
  store: PublicLeadCounterStore,
  now: () => number = Date.now,
): (ip: string, response?: Response) => Promise<boolean> {
  store.init({ windowMs: LEAD_RATE_LIMIT_WINDOW_MS });
  return async (ip, response) => {
    try {
      const safeIp = ip.trim() || 'unknown';
      const key = createHash('sha256').update(safeIp).digest('hex');
      const { totalHits, resetTime } = await store.increment(key);
      if (totalHits <= LEAD_RATE_LIMIT_MAX_PER_WINDOW) return true;

      const retryAfterSeconds = Math.max(1, Math.ceil((resetTime.getTime() - now()) / 1000));
      response?.setHeader('Retry-After', String(retryAfterSeconds));
      return false;
    } catch (error) {
      const retryAfterSeconds = Number((error as { retryAfterSeconds?: number })?.retryAfterSeconds);
      if (Number.isInteger(retryAfterSeconds) && retryAfterSeconds > 0) {
        response?.setHeader('Retry-After', String(retryAfterSeconds));
      }
      throw new TRPCError({
        code: 'SERVICE_UNAVAILABLE',
        message: 'Public enquiry intake is temporarily unavailable. Please try again shortly.',
      });
    }
  };
}

export function configurePublicLeadRateLimitStore(
  input: { env?: NodeJS.ProcessEnv; runtimeEnv?: AppRuntimeEnv } = {},
): PublicLeadCounterStore {
  const store = createPublicLeadRateLimitStore(input);
  store.init({ windowMs: LEAD_RATE_LIMIT_WINDOW_MS });
  configuredStore = store;
  configuredChecker = createPublicLeadRateLimitChecker(store);
  return store;
}

function getConfiguredStore(): PublicLeadCounterStore {
  if (configuredStore) return configuredStore;
  // Direct service use in tests/local development remains bounded. Deployed
  // callers must have been initialized with the shared Redis authority.
  return configurePublicLeadRateLimitStore();
}

/**
 * Check the shared IP window. The stored key is a one-way digest, not the IP
 * itself. req.ip is supplied by Express after its configured proxy policy.
 */
export async function checkPublicLeadRateLimit(ip: string, response?: Response): Promise<boolean> {
  if (!configuredChecker) {
    const store = getConfiguredStore();
    configuredChecker = createPublicLeadRateLimitChecker(store);
  }
  return configuredChecker(ip, response);
}

export function getPublicLeadClientIp(ctx: any): string {
  // Express resolves req.ip using its configured trust-proxy policy. Never
  // interpret x-forwarded-for here; an untrusted caller must not choose a key.
  const reqIp = ctx?.req?.ip;
  if (typeof reqIp === 'string' && reqIp.trim().length > 0) return reqIp.trim();

  const socketIp = ctx?.req?.socket?.remoteAddress;
  if (typeof socketIp === 'string' && socketIp.trim().length > 0) return socketIp.trim();

  return 'unknown';
}

export const publicLeadRateLimitConstants = {
  windowMs: LEAD_RATE_LIMIT_WINDOW_MS,
  maxPerWindow: LEAD_RATE_LIMIT_MAX_PER_WINDOW,
  keyPrefix: PUBLIC_LEAD_RATE_LIMIT_KEY_PREFIX,
};
