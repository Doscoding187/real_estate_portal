import { vi } from 'vitest';

type AnyFn = (...args: any[]) => any;

/**
 * Creates a "Drizzle-like" chain:
 * - Every builder method returns the same chain
 * - The chain is thenable, so `await db.select()...` resolves to finalValue
 * - Provides common methods used across the codebase
 */
export function createDbChain<TFinal = any>(finalValue: TFinal) {
  const chain: Record<string, AnyFn> = {};

  const methods = [
    // query builder
    'select',
    'from',
    'where',
    'innerJoin',
    'leftJoin',
    'rightJoin',
    'orderBy',
    'groupBy',
    'having',
    'limit',
    'offset',

    // write builder
    'insert',
    'values',
    'update',
    'set',
    'delete',
    'returning',
    '$returningId',
  ];

  for (const m of methods) {
    chain[m] = vi.fn(() => chain);
  }

  // Common execution patterns
  chain.execute = vi.fn(async () => finalValue);
  chain.all = vi.fn(async () => finalValue);
  chain.get = vi.fn(async () => (Array.isArray(finalValue) ? finalValue[0] : finalValue));

  // Make it "thenable" like Drizzle queries, so `await chain` yields finalValue
  chain.then = (onFulfilled: any, onRejected: any) =>
    Promise.resolve(finalValue).then(onFulfilled, onRejected);

  return chain as any;
}
