import type { Options, Store } from 'express-rate-limit';
import { createClient } from 'redis';
import { resolveAppRuntimeEnv, type AppRuntimeEnv } from './runtimeBootstrap';

const AUTH_RATE_LIMIT_KEY_PREFIX = 'property-listify:rate-limit:auth:';
type AuthRateLimitRedisClient = ReturnType<typeof createClient>;

/**
 * A small Redis-backed store for the authentication boundary. It intentionally
 * has no production in-memory fallback: a multi-instance deployment must not
 * silently turn a password or reset endpoint into per-process rate limiting.
 */
export class RedisAuthRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix = AUTH_RATE_LIMIT_KEY_PREFIX;
  private client: AuthRateLimitRedisClient | null = null;
  private connection: Promise<AuthRateLimitRedisClient> | null = null;
  private windowMs = 15 * 60 * 1000;

  constructor(private readonly redisUrl: string) {}

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  private async getClient() {
    if (!this.client) {
      const client = createClient({ url: this.redisUrl });
      client.on('error', () => {
        // The rate limiter returns a controlled failure through express-rate-limit.
        // Do not log connection details or Redis URLs here.
      });
      this.client = client;
      this.connection = client.connect();
    }

    try {
      await this.connection;
      return this.client;
    } catch {
      this.client = null;
      this.connection = null;
      throw new Error('Authentication rate-limit store is unavailable.');
    }
  }

  private key(value: string) {
    return `${this.prefix}${value}`;
  }

  async increment(key: string) {
    const client = await this.getClient();
    if (!client) throw new Error('Authentication rate-limit store is unavailable.');

    const redisKey = this.key(key);
    const totalHits = await client.incr(redisKey);
    if (totalHits === 1) {
      await client.pExpire(redisKey, this.windowMs);
    }
    const remainingMs = await client.pTTL(redisKey);

    return {
      totalHits,
      resetTime: new Date(Date.now() + (remainingMs > 0 ? remainingMs : this.windowMs)),
    };
  }

  async get(key: string) {
    const client = await this.getClient();
    if (!client) return undefined;

    const totalHits = Number((await client.get(this.key(key))) || '0');
    if (!Number.isInteger(totalHits) || totalHits < 1) return undefined;

    const remainingMs = await client.pTTL(this.key(key));
    return {
      totalHits,
      resetTime: remainingMs > 0 ? new Date(Date.now() + remainingMs) : undefined,
    };
  }

  async decrement(key: string) {
    const client = await this.getClient();
    if (client) await client.decr(this.key(key));
  }

  async resetKey(key: string) {
    const client = await this.getClient();
    if (client) await client.del(this.key(key));
  }

  async shutdown() {
    if (this.client?.isOpen) await this.client.quit();
    this.client = null;
    this.connection = null;
  }
}

export function createAuthRateLimitStore(
  input: {
    env?: NodeJS.ProcessEnv;
    runtimeEnv?: AppRuntimeEnv;
  } = {},
): Store | undefined {
  const env = input.env ?? process.env;
  const runtimeEnv = input.runtimeEnv ?? resolveAppRuntimeEnv(env);
  const redisUrl = String(env.REDIS_URL || '').trim();
  const requiresDistributedStore = runtimeEnv === 'production' || runtimeEnv === 'staging';

  if (!requiresDistributedStore) {
    return undefined;
  }

  if (!redisUrl) {
    throw new Error('REDIS_URL is required for distributed authentication rate limiting.');
  }

  return new RedisAuthRateLimitStore(redisUrl);
}
