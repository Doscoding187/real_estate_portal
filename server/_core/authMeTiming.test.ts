import { EventEmitter, once } from 'node:events';
import type { AddressInfo } from 'node:net';
import type { RequestHandler } from 'express';
import express from 'express';
import type { AuthorityRuntimePool } from './databaseAuthority/connectionAuthority';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAuthMeTimingMiddleware,
  instrumentAuthMePool,
  measureAuthMePhase,
} from './authMeTiming';

type Pool = AuthorityRuntimePool['pool'];

const id = '561fc101-59d2-4a58-a8ca-83bb30734b01';
const other = '561fc101-59d2-4a58-a8ca-83bb30734b02';
let logs: ReturnType<typeof vi.spyOn>;
function enable(ids = id) {
  vi.stubEnv('AUTH_ME_TIMING_REQUEST_IDS', ids);
  vi.stubEnv('AUTH_ME_TIMING_EXPIRES_AT', new Date(Date.now() + 60_000).toISOString());
}
function rows() {
  return logs.mock.calls.map(([text]) => JSON.parse(String(text)));
}
function response() {
  return Object.assign(new EventEmitter(), { statusCode: 200 });
}
function run<T>(
  middleware: RequestHandler,
  work: () => Promise<T>,
  requestId = id,
  res = response(),
  path = '/api/trpc/auth.me',
  headers: Record<string, string | string[]> = {},
) {
  return new Promise<T>((resolve, reject) => {
    middleware(
      {
        requestId,
        path,
        method: 'GET',
        headers: { cookie: 'DO_NOT_LOG_COOKIE', ...headers },
      } as unknown as Parameters<RequestHandler>[0],
      res as unknown as Parameters<RequestHandler>[1],
      () => {
        work().then(resolve, reject);
      },
    );
  });
}
function fakePool(failure?: Error) {
  const connection = { private: 'DO_NOT_LOG_CONNECTION' };
  const core = {
    getConnection: vi.fn((cb: (error: Error | null, c?: unknown) => void) => {
      setImmediate(() => cb(failure || null, failure ? undefined : connection));
    }),
  };
  const execute = vi.fn(function (this: { pool: typeof core }, ..._args: unknown[]) {
    return new Promise((resolve, reject) =>
      this.pool.getConnection((error, c) => {
        if (error) reject(error);
        else resolve(c);
      }),
    );
  });
  return {
    pool: { pool: core, execute, query: execute } as unknown as Pool,
    execute,
    core,
    connection,
  };
}

beforeEach(() => {
  logs = vi.spyOn(console, 'info').mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('bounded account-information timing', () => {
  it.each([
    undefined,
    '',
    'x'.repeat(129),
    'invalid id',
    'invalid\r\nheader',
    'trailing\n',
    'first,second',
    ['first', 'second'],
    'invalid\u00e9',
  ])('omits an absent or invalid Railway ID without changing execution: %j', async value => {
    enable();
    const headers: Record<string, string | string[]> =
      value === undefined ? {} : { 'x-railway-request-id': value };
    const work = vi.fn(async () => 'normal authentication result');
    expect(
      await run(createAuthMeTimingMiddleware(), work, id, response(), '/api/trpc/auth.me', headers),
    ).toBe('normal authentication result');
    expect(work).toHaveBeenCalledOnce();
    expect(rows()[0]).toMatchObject({ requestId: id, phase: 'request', event: 'arrived' });
    expect(rows()[0]).not.toHaveProperty('railwayRequestId');
    expect(JSON.stringify(rows())).not.toMatch(/DO_NOT_LOG_COOKIE|invalid|first|second/);
  });

  it('retains the bounded Railway ID at the maximum length', async () => {
    enable();
    const railwayRequestId = 'R_-' + 'x'.repeat(125);
    await run(
      createAuthMeTimingMiddleware(),
      async () => true,
      id,
      response(),
      '/api/trpc/auth.me',
      {
        'x-railway-request-id': railwayRequestId,
      },
    );
    expect(rows()[0]).toMatchObject({ requestId: id, railwayRequestId, event: 'arrived' });
  });

  it('does nothing when disabled, including leaving the pool untouched', async () => {
    vi.stubEnv('AUTH_ME_TIMING_REQUEST_IDS', '');
    const p = fakePool(),
      original = p.pool.execute;
    instrumentAuthMePool(p.pool);
    expect(p.pool.execute).toBe(original);
    const pending = Promise.resolve('normal result');
    expect(measureAuthMePhase('entitlements', () => pending)).toBe(pending);
    expect(await run(createAuthMeTimingMiddleware(), () => pending)).toBe('normal result');
    expect(rows()).toEqual([]);
  });

  it.each(['bad', Array(9).fill(id).join(',')])('rejects an invalid selection: %s', async ids => {
    enable(ids);
    await run(createAuthMeTimingMiddleware(), async () => true);
    expect(rows()).toEqual([]);
  });

  it.each([-1, 31 * 60_000])('rejects an expired or overlong window: %s', async offset => {
    enable();
    vi.stubEnv('AUTH_ME_TIMING_EXPIRES_AT', new Date(Date.now() + offset).toISOString());
    await run(createAuthMeTimingMiddleware(), async () => true);
    expect(rows()).toEqual([]);
  });

  it('traces each selected ID once and excludes other requests and routes', async () => {
    enable();
    const middleware = createAuthMeTimingMiddleware();
    await run(middleware, async () => true, other);
    await run(middleware, async () => true, id, response(), '/api/trpc/auth.logout');
    expect(rows()).toEqual([]);
    await run(middleware, () => measureAuthMePhase('session-verification', async () => true));
    const count = rows().length;
    await run(middleware, () => measureAuthMePhase('session-verification', async () => true));
    expect(rows()).toHaveLength(count);
  });

  it('expires the middleware after installation', async () => {
    enable();
    const middleware = createAuthMeTimingMiddleware();
    vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 120_000);
    await run(middleware, async () => true);
    expect(rows()).toEqual([]);
  });

  it('measures pool leasing separately and preserves SQL arguments and results', async () => {
    enable();
    const p = fakePool();
    instrumentAuthMePool(p.pool);
    const sql = 'SELECT name FROM users WHERE id = ?',
      values = ['DO_NOT_LOG_VALUE'];
    const result = await run(createAuthMeTimingMiddleware(), () =>
      measureAuthMePhase('entitlements', () => p.pool.execute(sql, values)),
    );
    expect(result).toBe(p.connection);
    expect(p.execute.mock.calls[0]).toEqual([sql, values]);
    const lease = rows().find(x => x.phase === 'database-lease' && x.event === 'completed');
    const operation = rows().find(x => x.phase === 'database-operation' && x.event === 'completed');
    expect(lease.operation).toBe(operation.operation);
    expect(lease.durationMs).toBeGreaterThanOrEqual(0);
    expect(operation.durationMs).toBeGreaterThanOrEqual(lease.durationMs);
    expect(operation.sqlHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(rows())).not.toMatch(/DO_NOT_LOG|SELECT name|headers|cookie|values/);
  });

  it('preserves the original lease failure without logging its private details', async () => {
    enable();
    const failure = new Error('DO_NOT_LOG_SECRET');
    const p = fakePool(failure);
    instrumentAuthMePool(p.pool);
    await expect(
      run(createAuthMeTimingMiddleware(), () => p.pool.execute('SELECT ?', ['secret'])),
    ).rejects.toBe(failure);
    expect(
      rows()
        .filter(x => x.event === 'failed')
        .map(x => x.phase),
    ).toEqual(['database-lease', 'database-operation']);
    expect(JSON.stringify(rows())).not.toContain('DO_NOT_LOG_SECRET');
  });

  it('keeps simultaneous request identities isolated', async () => {
    enable(id + ',' + other);
    const middleware = createAuthMeTimingMiddleware();
    await Promise.all(
      [id, other].map(requestId =>
        run(
          middleware,
          () =>
            measureAuthMePhase('session-user-lookup', async () => {
              await new Promise(resolve => setImmediate(resolve));
              return requestId;
            }),
          requestId,
        ),
      ),
    );
    for (const requestId of [id, other]) {
      expect(
        rows()
          .filter(x => x.requestId === requestId)
          .map(x => x.event),
      ).toEqual(['arrived', 'started', 'completed']);
    }
  });

  it('distinguishes a stalled lease from client disconnection and later API completion', async () => {
    enable();
    let now = 0;
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    const p = fakePool();
    let release: Parameters<typeof p.core.getConnection>[0] | undefined;
    p.core.getConnection.mockImplementation(callback => {
      release = callback;
    });
    instrumentAuthMePool(p.pool);
    const res = response();
    const pending = run(
      createAuthMeTimingMiddleware(),
      () => measureAuthMePhase('entitlements', () => p.pool.execute('SELECT ?', ['private'])),
      id,
      res,
    );
    expect(rows().some(x => x.phase === 'database-lease' && x.event === 'started')).toBe(true);
    expect(rows().some(x => x.phase === 'database-lease' && x.event === 'completed')).toBe(false);
    now = 8_000;
    res.emit('close');
    expect(rows().at(-1)).toMatchObject({
      phase: 'response',
      event: 'closed-before-finish',
      elapsedMs: 8_000,
    });
    now = 12_000;
    release!(null, p.connection);
    await pending;
    expect(rows().find(x => x.phase === 'database-lease' && x.event === 'completed')).toMatchObject(
      { durationMs: 12_000 },
    );
    expect(rows().at(-1)).toMatchObject({
      phase: 'entitlements',
      event: 'completed',
      durationMs: 12_000,
    });
  });

  it('passes query options and bound values through without changing transport', async () => {
    enable();
    const p = fakePool();
    instrumentAuthMePool(p.pool);
    const options = { sql: 'SELECT ?', rowsAsArray: true },
      values = ['DO_NOT_LOG_VALUE'];
    await run(createAuthMeTimingMiddleware(), () => p.pool.query(options, values));
    expect(p.execute.mock.calls[0][0]).toBe(options);
    expect(p.execute.mock.calls[0][1]).toBe(values);
    expect(JSON.stringify(rows())).not.toMatch(/rowsAsArray|DO_NOT_LOG_VALUE|SELECT/);
  });

  it('leaves an unselected operation untouched even on an instrumented pool', async () => {
    enable();
    const p = fakePool();
    const pending = Promise.resolve(p.connection);
    p.execute.mockReturnValueOnce(pending);
    instrumentAuthMePool(p.pool);
    expect(p.pool.execute('SELECT ?', ['private'])).toBe(pending);
    expect(rows()).toEqual([]);
  });

  it('reports disconnects once and always retains the response event after the log cap', async () => {
    enable();
    const res = response();
    await run(
      createAuthMeTimingMiddleware(),
      async () => {
        for (let n = 0; n < 80; n++) await measureAuthMePhase('entitlements', async () => null);
      },
      id,
      res,
    );
    res.emit('close');
    res.emit('finish');
    expect(rows()).toHaveLength(129);
    expect(rows().at(-1)).toMatchObject({ phase: 'response', event: 'closed-before-finish' });
  });

  it('logging failure does not alter the original result or exception', async () => {
    enable();
    logs.mockImplementation(() => {
      throw new Error('logger failed');
    });
    const middleware = createAuthMeTimingMiddleware();
    expect(await run(middleware, () => measureAuthMePhase('entitlements', async () => 42))).toBe(
      42,
    );
    enable(other);
    const failure = new Error('original');
    await expect(
      run(
        createAuthMeTimingMiddleware(),
        () =>
          measureAuthMePhase('entitlements', async () => {
            throw failure;
          }),
        other,
      ),
    ).rejects.toBe(failure);
  });

  it('retains both IDs when the HTTP client disconnects before receiving response headers', async () => {
    enable();
    const railwayRequestId = 'Yzmaway8TvebD25xipRofQ';
    let release!: () => void;
    const held = new Promise<void>(resolve => {
      release = resolve;
    });
    let arrived!: () => void;
    const arrival = new Promise<void>(resolve => {
      arrived = resolve;
    });
    let disconnected!: (headersSent: boolean) => void;
    const disconnect = new Promise<boolean>(resolve => {
      disconnected = resolve;
    });
    const app = express();
    app.use((req, res, next) => {
      (req as typeof req & { requestId: string }).requestId = String(req.headers['x-request-id']);
      res.setHeader('x-request-id', String(req.headers['x-request-id']));
      next();
    });
    app.use(createAuthMeTimingMiddleware());
    app.get('/api/trpc/auth.me', async (_req, res) => {
      res.once('close', () => disconnected(res.headersSent));
      arrived();
      await measureAuthMePhase('session-user-lookup', () => held);
    });
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const controller = new AbortController();
    try {
      const outcome = fetch(
        `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/trpc/auth.me`,
        {
          signal: controller.signal,
          headers: {
            'x-request-id': id,
            'x-railway-request-id': railwayRequestId,
            cookie: 'DO_NOT_LOG_COOKIE',
            authorization: 'DO_NOT_LOG_AUTHORIZATION',
          },
        },
      ).then(
        () => 'unexpected response',
        (error: Error) => error.name,
      );
      await arrival;
      controller.abort();
      expect(await outcome).toBe('AbortError');
      expect(await disconnect).toBe(false);
      expect(rows()[0]).toMatchObject({
        requestId: id,
        railwayRequestId,
        phase: 'request',
        event: 'arrived',
      });
      expect(rows().at(-1)).toMatchObject({ requestId: id, event: 'closed-before-finish' });
      expect(rows().some(row => row.event === 'completed')).toBe(false);
      expect(JSON.stringify(rows())).not.toMatch(/DO_NOT_LOG_COOKIE|DO_NOT_LOG_AUTHORIZATION/);
    } finally {
      controller.abort();
      release();
      await held;
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });

  it('correlates actual HTTP arrival, phases and response with the supplied ID', async () => {
    enable();
    const app = express();
    app.use((req, res, next) => {
      (req as typeof req & { requestId: string }).requestId = String(req.headers['x-request-id']);
      res.setHeader('x-request-id', String(req.headers['x-request-id']));
      next();
    });
    app.use(createAuthMeTimingMiddleware());
    app.get('/api/trpc/auth.me', async (_req, res) => {
      await measureAuthMePhase('session-user-lookup', async () => true);
      await measureAuthMePhase('last-sign-in-update', async () => true);
      await measureAuthMePhase('entitlements', async () => true);
      await measureAuthMePhase('distribution-identities', async () => true);
      res.json({ ok: true });
    });
    const server = app.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const response = await fetch(
        `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/trpc/auth.me`,
        { headers: { 'x-request-id': id, cookie: 'DO_NOT_LOG_COOKIE' } },
      );
      expect(response.status).toBe(200);
      expect(response.headers.get('x-request-id')).toBe(id);
      expect(await response.json()).toEqual({ ok: true });
      expect(rows().at(-1)).toMatchObject({
        requestId: id,
        phase: 'response',
        event: 'completed',
        status: 200,
      });
      expect(rows().every(x => x.requestId === id)).toBe(true);
      expect(JSON.stringify(rows())).not.toContain('DO_NOT_LOG_COOKIE');
    } finally {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  });
});
