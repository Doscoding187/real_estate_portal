import type { Options, Store } from 'express-rate-limit';
import { createClient } from 'redis';
import { resolveAppRuntimeEnv, type AppRuntimeEnv } from './runtimeBootstrap';

const AUTH_RATE_LIMIT_KEY_PREFIX = 'property-listify:rate-limit:auth:';
const DEFAULT_STORE_TIMEOUT_MS = 1_500;
const DEFAULT_STORE_COOLDOWN_MS = 5_000;
const MIN_STORE_TIMEOUT_MS = 250;
const MAX_STORE_TIMEOUT_MS = 5_000;
const MIN_STORE_COOLDOWN_MS = 1_000;
const MAX_STORE_COOLDOWN_MS = 60_000;
type AuthRateLimitRedisClient = ReturnType<typeof createClient>;

export const AUTH_RATE_LIMIT_STORE_UNAVAILABLE_CODE = 'AUTH_RATE_LIMIT_STORE_UNAVAILABLE';

export class AuthRateLimitStoreUnavailableError extends Error {
  readonly code = AUTH_RATE_LIMIT_STORE_UNAVAILABLE_CODE;
  readonly retryAfterSeconds: number;

  constructor(retryAfterMs: number) {
    super('Authentication rate-limit store is unavailable.');
    this.name = 'AuthRateLimitStoreUnavailableError';
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1_000));
  }
}

export type AuthRateLimitStoreConfiguration = {
  timeoutMs: number;
  cooldownMs: number;
};

type RedisAuthRateLimitStoreOptions = AuthRateLimitStoreConfiguration & {
  /** Test seams. Production callers use the node-redis defaults. */
  clientFactory?: typeof createClient;
  now?: () => number;
};

function parseBoundedInteger(
  value: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < minimum || parsed > maximum) return fallback;
  return parsed;
}

function normalizeBoundedInteger(
  value: number | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback;
}

export function isValidAuthRateLimitRedisUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'redis:' || parsed.protocol === 'rediss:') && parsed.hostname.length > 0
    );
  } catch {
    return false;
  }
}

export function resolveAuthRateLimitStoreConfiguration(
  env: NodeJS.ProcessEnv = process.env,
): AuthRateLimitStoreConfiguration {
  return {
    timeoutMs: parseBoundedInteger(
      env.AUTH_RATE_LIMIT_STORE_TIMEOUT_MS,
      DEFAULT_STORE_TIMEOUT_MS,
      MIN_STORE_TIMEOUT_MS,
      MAX_STORE_TIMEOUT_MS,
    ),
    cooldownMs: parseBoundedInteger(
      env.AUTH_RATE_LIMIT_STORE_COOLDOWN_MS,
      DEFAULT_STORE_COOLDOWN_MS,
      MIN_STORE_COOLDOWN_MS,
      MAX_STORE_COOLDOWN_MS,
    ),
  };
}

/**
 * A small Redis-backed store for the authentication boundary. It intentionally
 * has no production in-memory fallback: a multi-instance deployment must not
 * silently turn a password or reset endpoint into per-process rate limiting.
 */
export class RedisAuthRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix = AUTH_RATE_LIMIT_KEY_PREFIX;
  private client: AuthRateLimitRedisClient | null = null;
  private connection: Promise<unknown> | null = null;
  private windowMs = 15 * 60 * 1000;
  private readonly timeoutMs: number;
  private readonly cooldownMs: number;
  private readonly clientFactory: typeof createClient;
  private readonly now: () => number;
  private unavailableUntilMs = 0;
  private unavailable = false;

  constructor(
    private readonly redisUrl: string,
    options: Partial<RedisAuthRateLimitStoreOptions> = {},
  ) {
    if (!isValidAuthRateLimitRedisUrl(redisUrl)) {
      throw new Error('REDIS_URL must be a valid redis:// or rediss:// URL.');
    }
    this.timeoutMs = normalizeBoundedInteger(
      options.timeoutMs,
      DEFAULT_STORE_TIMEOUT_MS,
      MIN_STORE_TIMEOUT_MS,
      MAX_STORE_TIMEOUT_MS,
    );
    this.cooldownMs = normalizeBoundedInteger(
      options.cooldownMs,
      DEFAULT_STORE_COOLDOWN_MS,
      MIN_STORE_COOLDOWN_MS,
      MAX_STORE_COOLDOWN_MS,
    );
    this.clientFactory = options.clientFactory ?? createClient;
    this.now = options.now ?? Date.now;
  }

  init(options: Options) {
    this.windowMs = options.windowMs;
  }

  private retryAfterMs(): number {
    return Math.max(1_000, this.unavailableUntilMs - this.now());
  }

  private unavailableError(): AuthRateLimitStoreUnavailableError {
    return new AuthRateLimitStoreUnavailableError(this.retryAfterMs());
  }

  private discardClient(client: AuthRateLimitRedisClient | null | undefined): void {
    if (!client) return;

    if (this.client === client) {
      this.client = null;
      this.connection = null;
    }

    if (client.isOpen) {
      try {
        client.destroy();
      } catch {
        // A failed connection can already be closing. The bounded failure below
        // remains the authoritative result for the browser boundary.
      }
    }
  }

  private markUnavailable(client?: AuthRateLimitRedisClient | null): void {
    const wasUnavailable = this.unavailable;
    this.unavailable = true;
    this.unavailableUntilMs = this.now() + this.cooldownMs;
    this.discardClient(client);

    if (!wasUnavailable) {
      console.error(
        '[AuthRateLimit] Distributed auth rate-limit store unavailable; failing authentication requests closed until retry.',
        { retryAfterSeconds: this.unavailableError().retryAfterSeconds },
      );
    }
  }

  private markRecovered(): void {
    if (this.unavailable) {
      console.info('[AuthRateLimit] Distributed auth rate-limit store connection restored.');
    }
    this.unavailable = false;
    this.unavailableUntilMs = 0;
  }

  private async awaitBounded<T>(
    operation: Promise<T>,
    client: AuthRateLimitRedisClient,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;

    try {
      return await Promise.race([
        operation,
        new Promise<T>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error('Authentication rate-limit store timed out.')),
            this.timeoutMs,
          );
        }),
      ]);
    } catch {
      this.markUnavailable(client);
      throw this.unavailableError();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async getClient(): Promise<AuthRateLimitRedisClient> {
    if (this.unavailableUntilMs > this.now()) {
      throw this.unavailableError();
    }

    if (!this.client) {
      let client: AuthRateLimitRedisClient | null = null;
      try {
        client = this.clientFactory({
          url: this.redisUrl,
          // This store must never wait behind node-redis's default reconnect loop.
          // A new bounded attempt is made only after the cooldown has elapsed.
          disableOfflineQueue: true,
          socket: {
            connectTimeout: this.timeoutMs,
            reconnectStrategy: false,
          },
        });
        client.on('error', () => {
          // A node-redis client needs an error listener, but connection and
          // command awaits below are the single authority that changes the
          // circuit state. Mutating it here can discard an in-flight rejected
          // connection promise before its bounded await observes the failure.
        });
        this.client = client;
        this.connection = client.connect();
      } catch {
        this.markUnavailable(client);
        throw this.unavailableError();
      }
    }

    const client = this.client;
    const connection = this.connection;
    if (!client || !connection) {
      this.markUnavailable(client);
      throw this.unavailableError();
    }

    await this.awaitBounded(connection, client);
    if (this.client !== client) {
      throw this.unavailableError();
    }
    this.markRecovered();
    return client;
  }

  private async execute<T>(
    operation: (client: AuthRateLimitRedisClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.getClient();
    return this.awaitBounded(
      Promise.resolve().then(() => operation(client)),
      client,
    );
  }

  private key(value: string) {
    return `${this.prefix}${value}`;
  }

  async increment(key: string) {
    const redisKey = this.key(key);
    const totalHits = await this.execute(client => client.incr(redisKey));
    if (totalHits === 1) {
      await this.execute(client => client.pExpire(redisKey, this.windowMs));
    }
    const remainingMs = await this.execute(client => client.pTTL(redisKey));

    return {
      totalHits,
      resetTime: new Date(Date.now() + (remainingMs > 0 ? remainingMs : this.windowMs)),
    };
  }

  async get(key: string) {
    const totalHits = Number((await this.execute(client => client.get(this.key(key)))) || '0');
    if (!Number.isInteger(totalHits) || totalHits < 1) return undefined;

    const remainingMs = await this.execute(client => client.pTTL(this.key(key)));
    return {
      totalHits,
      resetTime: remainingMs > 0 ? new Date(Date.now() + remainingMs) : undefined,
    };
  }

  async decrement(key: string) {
    await this.execute(client => client.decr(this.key(key)));
  }

  async resetKey(key: string) {
    await this.execute(client => client.del(this.key(key)));
  }

  async probe(): Promise<boolean> {
    try {
      await this.execute(client => client.ping());
      return true;
    } catch (error) {
      if (error instanceof AuthRateLimitStoreUnavailableError) return false;
      throw error;
    }
  }

  async shutdown() {
    this.discardClient(this.client);
    this.unavailable = false;
    this.unavailableUntilMs = 0;
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
  if (!isValidAuthRateLimitRedisUrl(redisUrl)) {
    throw new Error('REDIS_URL must be a valid redis:// or rediss:// URL.');
  }

  return new RedisAuthRateLimitStore(redisUrl, resolveAuthRateLimitStoreConfiguration(env));
}

export type AuthRateLimitStoreHealth = {
  ok: boolean;
  mode: 'redis' | 'memory';
};

export async function getAuthRateLimitStoreHealth(
  store: Store | undefined,
  runtimeEnv: AppRuntimeEnv = resolveAppRuntimeEnv(),
): Promise<AuthRateLimitStoreHealth> {
  if (!store) {
    return {
      ok: runtimeEnv !== 'production' && runtimeEnv !== 'staging',
      mode: 'memory',
    };
  }
  if (!(store instanceof RedisAuthRateLimitStore)) return { ok: false, mode: 'redis' };
  return { ok: await store.probe(), mode: 'redis' };
}
