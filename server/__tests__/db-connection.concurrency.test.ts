import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ create: vi.fn(), drizzle: vi.fn() }));
vi.mock('drizzle-orm/mysql2', () => ({ drizzle: mocks.drizzle }));
vi.mock('../_core/databaseAuthority/connectionAuthority', () => ({
  createAuthorityRuntimePool: mocks.create,
}));
vi.mock('../_core/databaseAuthority/context', () => ({
  resolveDatabaseAuthority: () => ({ context: { targetFingerprintHash: 'a'.repeat(64) } }),
}));
vi.mock('../_core/databaseAuthority/authorization', () => ({
  authorizeDatabaseOperation: () => ({}),
  protectedDatabaseApprovalFromEnvironment: () => undefined,
}));
import { getDb, resetDb } from '../db-connection';

beforeEach(() => resetDb());

afterEach(() => {
  resetDb();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

describe('runtime connection initialization', () => {
  it('closes the unpublished pool when ORM initialization fails', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const pool = { pool: {}, end: vi.fn(async () => {}) };
    const failure = new Error('ORM initialization failed');
    mocks.create.mockResolvedValue(pool);
    mocks.drizzle.mockImplementationOnce(() => {
      throw failure;
    });
    await expect(getDb()).rejects.toBe(failure);
    expect(pool.end).toHaveBeenCalledOnce();
    mocks.drizzle.mockReturnValue({ connected: true });
    await expect(getDb()).resolves.toEqual({ connected: true });
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });

  it('shares one pool across concurrent startup callers', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const pool = { pool: {}, end: vi.fn(async () => {}) };
    let finish!: (value: typeof pool) => void;
    mocks.create.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    );
    const db = {};
    mocks.drizzle.mockReturnValue(db);
    const callers = Array.from({ length: 20 }, () => getDb());
    expect(mocks.create).toHaveBeenCalledTimes(1);
    finish(pool);
    expect((await Promise.all(callers)).every(value => value === db)).toBe(true);
    expect(mocks.drizzle).toHaveBeenCalledTimes(1);
  });

  it('closes an in-flight pool when reset invalidates its generation', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const pool = { pool: {}, end: vi.fn(async () => {}) };
    let finish!: (value: typeof pool) => void;
    mocks.create.mockImplementation(
      () =>
        new Promise(resolve => {
          finish = resolve;
        }),
    );
    const pending = getDb();
    resetDb();
    finish(pool);
    await expect(pending).rejects.toThrow('cancelled by reset');
    expect(pool.end).toHaveBeenCalledOnce();
    expect(mocks.drizzle).not.toHaveBeenCalled();
  });

  it('allows a new connection attempt after a shared failure', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    mocks.create.mockRejectedValueOnce(new Error('connection failed'));
    await expect(Promise.all([getDb(), getDb()])).rejects.toThrow('connection failed');
    mocks.create.mockResolvedValue({ pool: {}, end: vi.fn(async () => {}) });
    mocks.drizzle.mockReturnValue({ connected: true });
    await expect(getDb()).resolves.toEqual({ connected: true });
    expect(mocks.create).toHaveBeenCalledTimes(2);
  });
});
