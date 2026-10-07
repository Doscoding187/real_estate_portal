import { createClient } from 'redis';
import { isValidAuthRateLimitRedisUrl } from './authRateLimitStore';
import {
  FOUNDER_GOOGLE_STATE_TTL_MS,
  FounderGoogleIdentityError,
  hashGoogleOpaqueValue,
  type FounderGoogleState,
  type FounderGoogleStateStore,
} from './founderGoogleIdentity';

const PREFIX = 'property-listify:founder-google-proof:';
const TIMEOUT_MS = 1500;
const COOLDOWN_MS = 5000;
const CONSUME_STATE = `
local value = redis.call('GET', KEYS[1])
if not value then return false end
local record = cjson.decode(value)
if record.browserHash ~= ARGV[1] then return false end
redis.call('DEL', KEYS[1])
return value
`;
type RedisClient = ReturnType<typeof createClient>;

/** One-use browser-bound state on the existing Redis; no process-local fallback. */
export class RedisFounderGoogleStateStore implements FounderGoogleStateStore {
  private client: RedisClient | null = null;
  private connection: Promise<unknown> | null = null;
  private unavailableUntil = 0;
  private closed = false;

  constructor(
    private readonly redisUrl: string,
    private readonly options: { clientFactory?: typeof createClient; now?: () => number } = {},
  ) {
    if (!isValidAuthRateLimitRedisUrl(redisUrl)) throw new Error('A valid Redis URL is required.');
  }

  private unavailable(): FounderGoogleIdentityError {
    return new FounderGoogleIdentityError(
      'FOUNDER_GOOGLE_STATE_UNAVAILABLE',
      503,
      'Google sign-in is temporarily unavailable. Start again later.',
    );
  }

  private discard(client: RedisClient | null): void {
    if (this.client === client) {
      this.client = null;
      this.connection = null;
    }
    try {
      if (client?.isOpen) client.destroy();
    } catch {
      /* Already closing. */
    }
  }

  private async bounded<T>(operation: Promise<T>, client: RedisClient): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_resolve, reject) => {
          timer = setTimeout(() => reject(this.unavailable()), TIMEOUT_MS);
        }),
      ]);
    } catch {
      this.unavailableUntil = (this.options.now ?? Date.now)() + COOLDOWN_MS;
      this.discard(client);
      throw this.unavailable();
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private async getClient(): Promise<RedisClient> {
    if (this.closed || this.unavailableUntil > (this.options.now ?? Date.now)()) {
      throw this.unavailable();
    }
    if (!this.client) {
      try {
        this.client = (this.options.clientFactory ?? createClient)({
          url: this.redisUrl,
          disableOfflineQueue: true,
          socket: { connectTimeout: TIMEOUT_MS, reconnectStrategy: false },
        });
        this.client.on('error', () => {
          /* Awaited operations own the fail-closed boundary. */
        });
        this.connection = this.client.connect();
      } catch {
        this.discard(this.client);
        this.unavailableUntil = (this.options.now ?? Date.now)() + COOLDOWN_MS;
        throw this.unavailable();
      }
    }
    const client = this.client;
    const connection = this.connection;
    if (!client || !connection) throw this.unavailable();
    await this.bounded(connection, client);
    if (this.closed || this.client !== client || !client.isReady) throw this.unavailable();
    return client;
  }

  async save(state: string, record: FounderGoogleState): Promise<void> {
    const client = await this.getClient();
    const result = await this.bounded(
      client.set(PREFIX + hashGoogleOpaqueValue(state), JSON.stringify(record), {
        NX: true,
        PX: FOUNDER_GOOGLE_STATE_TTL_MS,
      }),
      client,
    );
    if (result !== 'OK') throw this.unavailable();
  }

  async consume(state: string, browserHash: string): Promise<FounderGoogleState | null> {
    const client = await this.getClient();
    const value = await this.bounded(
      client.eval(CONSUME_STATE, {
        keys: [PREFIX + hashGoogleOpaqueValue(state)],
        arguments: [browserHash],
      }),
      client,
    );
    if (value === null || value === false) return null;
    try {
      if (typeof value !== 'string' || value.length > 2048) throw this.unavailable();
      return JSON.parse(value);
    } catch {
      throw this.unavailable();
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    this.discard(this.client);
  }
}
