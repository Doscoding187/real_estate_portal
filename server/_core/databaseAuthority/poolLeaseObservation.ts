import { performance } from 'node:perf_hooks';

export interface PoolLeaseSample {
  durationMs: number;
  error: boolean;
}

export interface LeaseObservablePool {
  getConnection: (...args: unknown[]) => unknown;
  pool?: unknown;
}

/**
 * `mysql2/promise` pools delegate both an explicit `getConnection()` and the
 * implicit acquisition inside `query`/`execute` to an inner callback pool.
 * Observation must target that inner pool; otherwise query/execute leases are
 * invisible. Callback pools return themselves.
 */
export function resolveLeaseObservablePool(pool: LeaseObservablePool): LeaseObservablePool {
  const inner = pool.pool;
  if (inner && typeof (inner as LeaseObservablePool).getConnection === 'function') {
    return inner as LeaseObservablePool;
  }
  return pool;
}

/**
 * Wraps a mysql2-style pool's `getConnection` so callers can observe real
 * connection-lease latency, including queue wait, without changing SQL or pool
 * behaviour. Both the callback and promise call styles are preserved. The
 * returned function restores the original method and is idempotent.
 */
export function observePoolLeases(
  pool: LeaseObservablePool,
  listener: (sample: PoolLeaseSample) => void,
): () => void {
  const target = resolveLeaseObservablePool(pool);
  const original = target.getConnection;
  const bound = original.bind(target) as (...args: unknown[]) => unknown;

  const wrapped = (...args: unknown[]): unknown => {
    const started = performance.now();
    const callback = args[0];

    if (typeof callback === 'function') {
      return bound((...callbackArgs: unknown[]) => {
        const [error] = callbackArgs;
        listener({ durationMs: performance.now() - started, error: Boolean(error) });
        return (callback as (...cbArgs: unknown[]) => unknown)(...callbackArgs);
      });
    }

    const pending = bound(...args);
    if (pending && typeof (pending as PromiseLike<unknown>).then === 'function') {
      return (pending as Promise<unknown>).then(
        value => {
          listener({ durationMs: performance.now() - started, error: false });
          return value;
        },
        (error: unknown) => {
          listener({ durationMs: performance.now() - started, error: true });
          throw error;
        },
      );
    }

    listener({ durationMs: performance.now() - started, error: false });
    return pending;
  };

  target.getConnection = wrapped;
  return () => {
    if (target.getConnection === wrapped) target.getConnection = original;
  };
}
