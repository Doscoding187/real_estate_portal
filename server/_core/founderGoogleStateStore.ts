import { createClient, ErrorReply } from 'redis';
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
const LOG_WINDOW_MS = 5000;
const CONSUME_STATE = `
local value = redis.call('GET', KEYS[1])
if not value then return false end
local record = cjson.decode(value)
if record.browserHash ~= ARGV[1] then return false end
redis.call('DEL', KEYS[1])
return value
`;
type RedisClient = ReturnType<typeof createClient>;
type FailureStep =
  | 'create'
  | 'connect'
  | 'connect-timeout'
  | 'not-ready'
  | 'save-command'
  | 'save-timeout'
  | 'save-not-ok'
  | 'consume-command'
  | 'consume-timeout'
  | 'consume-parse'
  | 'cooldown';

/** One-use browser-bound state on the existing Redis; no process-local fallback. */
export class RedisFounderGoogleStateStore implements FounderGoogleStateStore {
  private client: RedisClient | null = null;
  private connection: Promise<unknown> | null = null;
  private unavailableUntil = 0;
  private closed = false;
  private lastLogAt = Number.NEGATIVE_INFINITY;
  private suppressed = 0;
  private readonly trackers = new WeakMap<
    RedisClient,
    { settled: boolean; discarded: boolean; promise: Promise<unknown> }
  >();

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
    if (!client) return;
    const tracker = this.trackers.get(client);
    if (tracker && !tracker.settled) {
      if (tracker.discarded) return;
      tracker.discarded = true;
      // destroy() before the socket exists only flips isOpen and orphans the socket created
      // later; wait for the connect to settle, then destroy a connection that did come up.
      tracker.promise.then(
        () => {
          try {
            client.destroy();
          } catch {
            /* Already closing. */
          }
        },
        () => undefined,
      );
      return;
    }
    try {
      if (client.isOpen) client.destroy();
    } catch {
      /* Already closing. */
    }
  }

  /** Logs one safe line: step label and error class only, never messages, URLs, hosts, keys or values. */
  private logFailure(step: FailureStep, error?: unknown, replyType?: string): void {
    let name = '-';
    let code = '-';
    let reply = '-';
    try {
      if (error && typeof error === 'object') {
        const e = error as { name?: unknown; code?: unknown; message?: unknown };
        // node-redis error classes do not set `name`, so the constructor name is the real class.
        const safeName = /^[A-Za-z][A-Za-z0-9_]{0,40}$/;
        const ctorName = (error as { constructor?: { name?: unknown } }).constructor?.name;
        if (typeof ctorName === 'string' && ctorName !== 'Error' && safeName.test(ctorName)) {
          name = ctorName;
        } else if (typeof e.name === 'string' && safeName.test(e.name)) {
          name = e.name;
        } else {
          name = 'Error';
        }
        if (typeof e.code === 'string' && /^[A-Z][A-Z0-9_]{1,40}$/.test(e.code)) code = e.code;
        const isReplyError =
          error instanceof ErrorReply || /^(ErrorReply|SimpleError|BlobError)$/.test(name);
        if (isReplyError && typeof e.message === 'string') {
          const word = e.message.split(/\s/, 1)[0];
          if (/^[A-Z]{2,20}$/.test(word)) reply = word;
        }
      }
      if (replyType && /^[a-z]{1,20}$/.test(replyType)) reply = replyType;
    } catch {
      /* Diagnostics must never change the response. */
    }
    const at = (this.options.now ?? Date.now)();
    if (at - this.lastLogAt < LOG_WINDOW_MS) {
      this.suppressed += 1;
      return;
    }
    this.lastLogAt = at;
    const suffix = this.suppressed > 0 ? ` suppressed=${this.suppressed}` : '';
    this.suppressed = 0;
    console.warn(
      `[founder-google-state] unavailable step=${step} name=${name} code=${code} reply=${reply}${suffix}`,
    );
  }

  private async bounded<T>(
    operation: Promise<T>,
    client: RedisClient,
    commandStep: FailureStep,
    timeoutStep: FailureStep,
  ): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = Object.assign(new Error('timeout'), { name: 'TimeoutError' });
    try {
      return await Promise.race([
        operation,
        new Promise<T>((_resolve, reject) => {
          timer = setTimeout(() => reject(timeout), TIMEOUT_MS);
        }),
      ]);
    } catch (error) {
      if (error === timeout) throw this.markUnavailable(client, timeoutStep, timeout);
      throw this.markUnavailable(client, commandStep, error);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Starts the cooldown, drops the cached client so the next attempt is fresh, returns the error to throw. */
  private markUnavailable(
    client: RedisClient | null,
    step: FailureStep,
    error?: unknown,
  ): FounderGoogleIdentityError {
    this.unavailableUntil = (this.options.now ?? Date.now)() + COOLDOWN_MS;
    this.discard(client);
    this.logFailure(step, error);
    return this.unavailable();
  }

  private async getClient(): Promise<RedisClient> {
    if (this.closed) throw this.unavailable();
    const nowMs = (this.options.now ?? Date.now)();
    if (this.unavailableUntil > nowMs) {
      this.logFailure('cooldown');
      throw this.unavailable();
    }
    // A cached client whose socket is closed is dead (reconnectStrategy is false); never reuse it.
    if (this.client && !this.client.isOpen) {
      this.discard(this.client);
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
        const created = this.client;
        const connection = created.connect();
        const tracker = {
          settled: false,
          discarded: false,
          promise: connection as Promise<unknown>,
        };
        // Attaching both handlers also marks a rejection as handled.
        connection.then(
          () => {
            tracker.settled = true;
          },
          () => {
            tracker.settled = true;
          },
        );
        this.trackers.set(created, tracker);
        this.connection = connection;
      } catch (error) {
        throw this.markUnavailable(this.client, 'create', error);
      }
    }
    const client = this.client;
    const connection = this.connection;
    if (!client || !connection) throw this.markUnavailable(client, 'not-ready');
    await this.bounded(connection, client, 'connect', 'connect-timeout');
    if (this.closed || this.client !== client || !client.isReady) {
      throw this.markUnavailable(client, 'not-ready');
    }
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
      'save-command',
      'save-timeout',
    );
    if (result !== 'OK') {
      this.logFailure('save-not-ok', undefined, result === null ? 'null' : typeof result);
      throw this.unavailable();
    }
  }

  async consume(state: string, browserHash: string): Promise<FounderGoogleState | null> {
    const client = await this.getClient();
    const value = await this.bounded(
      client.eval(CONSUME_STATE, {
        keys: [PREFIX + hashGoogleOpaqueValue(state)],
        arguments: [browserHash],
      }),
      client,
      'consume-command',
      'consume-timeout',
    );
    if (value === null || value === false) return null;
    try {
      if (typeof value !== 'string' || value.length > 2048) throw this.unavailable();
      return JSON.parse(value);
    } catch (error) {
      this.logFailure('consume-parse', error instanceof FounderGoogleIdentityError ? undefined : error);
      throw this.unavailable();
    }
  }

  async close(): Promise<void> {
    this.closed = true;
    this.discard(this.client);
  }
}
