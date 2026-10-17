import { describe, expect, it } from 'vitest';
import { observePoolLeases, type PoolLeaseSample } from '../poolLeaseObservation';

function callbackPool(behaviour: 'resolve' | 'error') {
  const pool = {
    calls: 0,
    getConnection(
      this: { calls: number },
      callback: (error: Error | null, connection?: object) => void,
    ) {
      this.calls += 1;
      if (behaviour === 'error') callback(new Error('pool unavailable'));
      else callback(null, { id: this.calls });
    },
  };
  return pool;
}

function promisePool(behaviour: 'resolve' | 'error') {
  const pool = {
    calls: 0,
    getConnection(this: { calls: number }) {
      this.calls += 1;
      return behaviour === 'error'
        ? Promise.reject(new Error('pool unavailable'))
        : Promise.resolve({ id: this.calls });
    },
  };
  return pool;
}

describe('observePoolLeases', () => {
  it('observes callback-style leases without changing behaviour', async () => {
    const pool = callbackPool('resolve');
    const samples: PoolLeaseSample[] = [];
    const stop = observePoolLeases(pool, sample => samples.push(sample));

    const connection = await new Promise<object | undefined>((resolve, reject) =>
      pool.getConnection((error, leased) => (error ? reject(error) : resolve(leased))),
    );

    expect(connection).toEqual({ id: 1 });
    expect(pool.calls).toBe(1);
    expect(samples).toHaveLength(1);
    expect(samples[0].error).toBe(false);
    expect(samples[0].durationMs).toBeGreaterThanOrEqual(0);

    stop();
  });

  it('flags callback-style lease errors and rethrows promise-style errors', async () => {
    const failingCallback = callbackPool('error');
    const callbackSamples: PoolLeaseSample[] = [];
    const stopCallback = observePoolLeases(failingCallback, sample => callbackSamples.push(sample));
    await new Promise<void>(resolve => failingCallback.getConnection(() => resolve()));
    expect(callbackSamples).toEqual([expect.objectContaining({ error: true })]);
    stopCallback();

    const failingPromise = promisePool('error');
    const promiseSamples: PoolLeaseSample[] = [];
    const stopPromise = observePoolLeases(failingPromise, sample => promiseSamples.push(sample));
    await expect(
      Promise.resolve((failingPromise as { getConnection: () => unknown }).getConnection()),
    ).rejects.toThrow('pool unavailable');
    expect(promiseSamples).toEqual([expect.objectContaining({ error: true })]);
    stopPromise();
  });

  it('observes promise-style leases and stops after restore', async () => {
    const pool = promisePool('resolve');
    const samples: PoolLeaseSample[] = [];
    const stop = observePoolLeases(pool, sample => samples.push(sample));

    const connection = await (pool.getConnection() as Promise<{ id: number }>);
    expect(connection).toEqual({ id: 1 });
    expect(samples).toHaveLength(1);

    stop();
    await pool.getConnection();
    expect(samples).toHaveLength(1);
  });

  it('observes a promise-pool wrapper through its inner callback pool', async () => {
    const inner = callbackPool('resolve');
    const originalInner = inner.getConnection;
    const outer = {
      pool: inner,
      getConnection() {
        return new Promise((resolve, reject) =>
          inner.getConnection((error, connection) => (error ? reject(error) : resolve(connection))),
        );
      },
    };

    const samples: PoolLeaseSample[] = [];
    const stop = observePoolLeases(outer, sample => samples.push(sample));

    await outer.getConnection();
    await new Promise<void>(resolve => inner.getConnection(() => resolve()));

    expect(inner.calls).toBe(2);
    expect(samples).toHaveLength(2);
    expect(samples.every(sample => sample.error === false)).toBe(true);

    stop();
    expect(inner.getConnection).toBe(originalInner);
    await outer.getConnection();
    expect(samples).toHaveLength(2);
  });
});
