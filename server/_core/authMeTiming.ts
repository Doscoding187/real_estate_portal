import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import type { RequestHandler } from 'express';
import type { AuthorityRuntimePool } from './databaseAuthority/connectionAuthority';

type Pool = AuthorityRuntimePool['pool'];

type Phase =
  | 'request'
  | 'response'
  | 'session-verification'
  | 'session-user-lookup'
  | 'founder-binding'
  | 'agent-account-check'
  | 'last-sign-in-update'
  | 'entitlements'
  | 'distribution-identities'
  | 'database-access'
  | 'database-operation'
  | 'database-lease';
type Trace = { requestId: string; started: number; events: number; operation: number };
type Context = { trace: Trace; phase: Phase; operation?: number; sqlHash?: string };
const storage = new AsyncLocalStorage<Context>();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function selection() {
  const ids = (process.env.AUTH_ME_TIMING_REQUEST_IDS || '').split(',');
  const expiry = Date.parse(process.env.AUTH_ME_TIMING_EXPIRES_AT || '');
  const remaining = expiry - Date.now();
  return ids.length <= 8 &&
    ids.every(id => uuid.test(id)) &&
    remaining > 0 &&
    remaining <= 30 * 60_000
    ? { ids, expiry }
    : null;
}

function emit(context: Context, phase: Phase, event: string, extra: Record<string, unknown> = {}) {
  const { trace } = context;
  if (trace.events++ >= 128 && phase !== 'response') return;
  // Fixed fields only: never headers, SQL, values, users or exception details.
  const sha = process.env.RAILWAY_GIT_COMMIT_SHA;
  try {
    console.info(
      JSON.stringify({
        kind: 'auth-me-timing',
        timestamp: new Date().toISOString(),
        requestId: trace.requestId,
        path: '/api/trpc/auth.me',
        sourceSha: sha && /^[0-9a-f]{40}$/i.test(sha) ? sha : undefined,
        phase,
        parentPhase: context.phase,
        event,
        elapsedMs: Math.round((performance.now() - trace.started) * 100) / 100,
        operation: context.operation,
        sqlHash: context.sqlHash,
        ...extra,
      }),
    );
  } catch {
    /* Diagnostic output must never alter authentication. */
  }
}

/** Installed before authentication; eight one-shot IDs, at most thirty minutes. */
export function createAuthMeTimingMiddleware(): RequestHandler {
  const config = selection();
  const remaining = new Set(config?.ids);
  return (req, res, next) => {
    const requestId = (req as typeof req & { requestId?: string }).requestId;
    if (
      !config ||
      Date.now() >= config.expiry ||
      req.method !== 'GET' ||
      req.path !== '/api/trpc/auth.me' ||
      !requestId ||
      !remaining.delete(requestId)
    ) {
      next();
      return;
    }
    const context: Context = {
      trace: { requestId, started: performance.now(), events: 0, operation: 0 },
      phase: 'request',
    };
    let completed = false;
    const finish = (event: string) => {
      if (completed) return;
      completed = true;
      emit(context, 'response', event, { status: res.statusCode, events: context.trace.events });
    };
    res.once('finish', () => finish('completed'));
    res.once('close', () => finish('closed-before-finish'));
    emit(context, 'request', 'arrived');
    storage.run(context, next);
  };
}

export function measureAuthMePhase<T>(phase: Phase, work: () => Promise<T>): Promise<T> {
  const context = storage.getStore();
  if (!context) return work();
  const started = performance.now();
  emit(context, phase, 'started');
  const finish = (event: string) =>
    emit(context, phase, event, {
      durationMs: Math.round((performance.now() - started) * 100) / 100,
    });
  let pending: Promise<T>;
  try {
    pending = storage.run({ ...context, phase }, work);
  } catch (error) {
    finish('failed');
    throw error;
  }
  return pending.then(
    value => {
      finish('completed');
      return value;
    },
    error => {
      finish('failed');
      throw error;
    },
  );
}

/** Observe the existing authorized pool; do not create connections or change SQL. */
export function instrumentAuthMePool(pool: Pool): void {
  if (!selection()) return;
  const originalLease = pool.pool.getConnection;
  pool.pool.getConnection = function (callback) {
    const context = storage.getStore();
    if (!context) return originalLease.call(this, callback);
    const started = performance.now();
    emit(context, 'database-lease', 'started');
    return originalLease.call(this, (error, connection) => {
      emit(context, 'database-lease', error ? 'failed' : 'completed', {
        durationMs: Math.round((performance.now() - started) * 100) / 100,
      });
      callback(error, connection);
    });
  };
  for (const method of ['execute', 'query'] as const) {
    const original = pool[method];
    Object.defineProperty(pool, method, {
      configurable: true,
      writable: true,
      value: function (this: Pool, ...args: unknown[]) {
        const context = storage.getStore();
        if (!context) return Reflect.apply(original, this, args);
        const statement =
          typeof args[0] === 'string' ? args[0] : (args[0] as { sql?: unknown } | undefined)?.sql;
        const operation = ++context.trace.operation;
        const sqlHash =
          typeof statement === 'string'
            ? createHash('sha256').update(statement).digest('hex')
            : undefined;
        return storage.run({ ...context, operation, sqlHash }, () =>
          measureAuthMePhase('database-operation', () => Reflect.apply(original, this, args)),
        );
      },
    });
  }
}
