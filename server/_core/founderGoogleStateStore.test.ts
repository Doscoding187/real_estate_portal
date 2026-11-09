import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ConnectionTimeoutError,
  SimpleError,
  SocketClosedUnexpectedlyError,
  type createClient,
} from 'redis';
import { RedisFounderGoogleStateStore } from './founderGoogleStateStore';
import { FOUNDER_GOOGLE_STATE_TTL_MS, type FounderGoogleState } from './founderGoogleIdentity';

const RECORD: FounderGoogleState = {
  purpose: 'founder-proof',
  nonce: 'N'.repeat(43),
  verifier: 'V'.repeat(43),
  browserHash: 'b'.repeat(64),
  createdAt: 1000,
  expiresAt: 1000 + FOUNDER_GOOGLE_STATE_TTL_MS,
};
function fakeClient() {
  return {
    isOpen: true,
    isReady: true,
    on: vi.fn(),
    connect: vi.fn(async () => undefined),
    set: vi.fn(async () => 'OK'),
    eval: vi.fn(async () => JSON.stringify(RECORD)),
    destroy: vi.fn(),
  };
}
function factoryFor(client: ReturnType<typeof fakeClient>) {
  return vi.fn(() => client) as unknown as typeof createClient & ReturnType<typeof vi.fn>;
}
afterEach(() => {
  vi.useRealTimers();
});

describe('founder Google proof state availability boundary', () => {
  it('uses the configured Redis, bounded connections, hashed state keys and a five-minute NX TTL', async () => {
    const client = fakeClient();
    const factory = factoryFor(client);
    const store = new RedisFounderGoogleStateStore('rediss://cache.example.test', {
      clientFactory: factory,
    });
    await store.save('raw-unit-state', RECORD);
    expect(factory).toHaveBeenCalledWith({
      url: 'rediss://cache.example.test',
      disableOfflineQueue: true,
      socket: { connectTimeout: 1500, reconnectStrategy: false },
    });
    const [key, value, options] = client.set.mock.calls[0] as unknown as [string, string, object];
    expect(key).toMatch(/^property-listify:founder-google-proof:[a-f0-9]{64}$/);
    expect(key).not.toContain('raw-unit-state');
    expect(JSON.parse(value)).toEqual(RECORD);
    expect(options).toEqual({ NX: true, PX: 300000 });
    await store.close();
    expect(client.destroy).toHaveBeenCalledTimes(1);
    await expect(store.save('new-state', RECORD)).rejects.toMatchObject({ status: 503 });
  });

  it('fails closed on a rejected connection and waits for cooldown before a fresh connection', async () => {
    let now = 1000;
    const bad = fakeClient();
    const good = fakeClient();
    bad.connect.mockRejectedValue(new Error('private-connection-details'));
    const factory = vi
      .fn()
      .mockReturnValueOnce(bad)
      .mockReturnValue(good) as unknown as typeof createClient & ReturnType<typeof vi.fn>;
    const store = new RedisFounderGoogleStateStore('redis://cache.example.test', {
      clientFactory: factory,
      now: () => now,
    });
    await expect(store.save('state', RECORD)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_STATE_UNAVAILABLE',
      status: 503,
      message: 'Google sign-in is temporarily unavailable. Start again later.',
    });
    await expect(store.save('state', RECORD)).rejects.toMatchObject({ status: 503 });
    expect(factory).toHaveBeenCalledTimes(1);
    expect(bad.set).not.toHaveBeenCalled();
    now += 5001;
    await store.save('fresh-state', RECORD);
    expect(factory).toHaveBeenCalledTimes(2);
    await store.close();
  });

  it('creates a new client instead of reusing one whose connection dropped after a save', async () => {
    const first = fakeClient();
    const second = fakeClient();
    const factory = vi
      .fn()
      .mockReturnValueOnce(first)
      .mockReturnValue(second) as unknown as typeof createClient & ReturnType<typeof vi.fn>;
    const store = new RedisFounderGoogleStateStore('redis://cache.example.test', {
      clientFactory: factory,
    });
    await store.save('state', RECORD);
    first.isOpen = false;
    first.isReady = false;
    await store.save('state-2', RECORD);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(first.set).toHaveBeenCalledTimes(1);
    expect(second.set).toHaveBeenCalledTimes(1);
    // Reconnected client serves consume too.
    expect(await store.consume('state-2', RECORD.browserHash)).toEqual(RECORD);
    expect(second.eval).toHaveBeenCalledTimes(1);
    expect(first.eval).not.toHaveBeenCalled();
    await store.close();
  });

  it('discards a connected-but-not-ready client, enters cooldown, then reconnects fresh', async () => {
    let now = 1000;
    const stale = fakeClient();
    stale.isReady = false;
    const good = fakeClient();
    const factory = vi
      .fn()
      .mockReturnValueOnce(stale)
      .mockReturnValue(good) as unknown as typeof createClient & ReturnType<typeof vi.fn>;
    const store = new RedisFounderGoogleStateStore('redis://cache.example.test', {
      clientFactory: factory,
      now: () => now,
    });
    await expect(store.save('state', RECORD)).rejects.toMatchObject({
      code: 'FOUNDER_GOOGLE_STATE_UNAVAILABLE',
      status: 503,
    });
    expect(stale.destroy).toHaveBeenCalledTimes(1);
    await expect(store.save('state', RECORD)).rejects.toMatchObject({ status: 503 });
    expect(factory).toHaveBeenCalledTimes(1);
    now += 5001;
    await store.save('state', RECORD);
    expect(factory).toHaveBeenCalledTimes(2);
    expect(good.set).toHaveBeenCalledTimes(1);
    await store.close();
  });

  it('always reports 503 and never falls back when every client fails', async () => {
    let now = 1000;
    const clients: ReturnType<typeof fakeClient>[] = [];
    const factory = vi.fn(() => {
      const c = fakeClient();
      c.connect.mockRejectedValue(new Error('private-connection-details'));
      clients.push(c);
      return c;
    }) as unknown as typeof createClient & ReturnType<typeof vi.fn>;
    const store = new RedisFounderGoogleStateStore('redis://cache.example.test', {
      clientFactory: factory,
      now: () => now,
    });
    for (let i = 0; i < 3; i += 1) {
      await expect(store.save('state', RECORD)).rejects.toMatchObject({
        code: 'FOUNDER_GOOGLE_STATE_UNAVAILABLE',
        status: 503,
      });
      await expect(store.consume('state', RECORD.browserHash)).rejects.toMatchObject({
        status: 503,
      });
      now += 5001;
    }
    expect(factory).toHaveBeenCalledTimes(3);
    for (const c of clients) {
      expect(c.set).not.toHaveBeenCalled();
      expect(c.eval).not.toHaveBeenCalled();
    }
    await store.close();
  });

  it('bounds a hung connection and provides no in-memory success fallback', async () => {
    vi.useFakeTimers();
    const client = fakeClient();
    client.connect.mockImplementation(() => new Promise(() => undefined));
    const store = new RedisFounderGoogleStateStore('redis://cache.example.test', {
      clientFactory: factoryFor(client),
    });
    const pending = expect(store.save('state', RECORD)).rejects.toMatchObject({ status: 503 });
    await vi.advanceTimersByTimeAsync(1501);
    await pending;
    expect(client.set).not.toHaveBeenCalled();
    expect(client.destroy).toHaveBeenCalledTimes(1);
    await store.close();
  });

  it('bounds a hung consume and discards its client', async () => {
    vi.useFakeTimers();
    const client = fakeClient();
    client.eval.mockImplementation(() => new Promise(() => undefined));
    const store = new RedisFounderGoogleStateStore('redis://cache.example.test', {
      clientFactory: factoryFor(client),
    });
    const pending = expect(store.consume('state', RECORD.browserHash)).rejects.toMatchObject({
      status: 503,
    });
    await vi.advanceTimersByTimeAsync(1501);
    await pending;
    expect(client.destroy).toHaveBeenCalledTimes(1);
    await store.close();
  });

  it('requires an atomic Redis consume rather than independent GET and DEL commands', async () => {
    const client = fakeClient();
    const store = new RedisFounderGoogleStateStore('redis://cache.example.test', {
      clientFactory: factoryFor(client),
    });
    expect(await store.consume('state', RECORD.browserHash)).toEqual(RECORD);
    const [, options] = client.eval.mock.calls[0] as unknown as [
      string,
      { keys: string[]; arguments: string[] },
    ];
    expect(options.keys).toHaveLength(1);
    expect(options.keys[0]).toMatch(/^property-listify:founder-google-proof:[a-f0-9]{64}$/);
    expect(options.arguments).toEqual([RECORD.browserHash]);
    await store.close();
  });

  it.each([null, false])('represents missing or mismatched state %j as failure', async value => {
    const client = fakeClient();
    client.eval.mockResolvedValue(value as any);
    const store = new RedisFounderGoogleStateStore('redis://cache.example.test', {
      clientFactory: factoryFor(client),
    });
    expect(await store.consume('state', RECORD.browserHash)).toBeNull();
    await store.close();
  });

  describe('safe failure diagnostics', () => {
    const SECRET = 'rediss://user:pw@host:6380 property-listify:founder-google-proof:abc';
    function make(client: ReturnType<typeof fakeClient>, now?: () => number) {
      return new RedisFounderGoogleStateStore('redis://cache.example.test', {
        clientFactory: factoryFor(client),
        ...(now ? { now } : {}),
      });
    }
    function lines(spy: { mock: { calls: unknown[][] } }) {
      return spy.mock.calls.map(call => String(call[0]));
    }
    function failWith(message: string, extra: object = {}, name = 'Error') {
      return Object.assign(new Error(message), { name }, extra);
    }

    it('create step', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const factory = vi.fn(() => {
        throw failWith(SECRET);
      }) as unknown as typeof createClient & ReturnType<typeof vi.fn>;
      const store = new RedisFounderGoogleStateStore('redis://cache.example.test', {
        clientFactory: factory,
      });
      await expect(store.save('s', RECORD)).rejects.toMatchObject({
        code: 'FOUNDER_GOOGLE_STATE_UNAVAILABLE',
        status: 503,
        message: 'Google sign-in is temporarily unavailable. Start again later.',
      });
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=create name=Error code=- reply=-',
      ]);
      warn.mockRestore();
    });

    it('connect step with error code, and no secrets in the line', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = fakeClient();
      client.connect.mockRejectedValue(failWith(SECRET, { code: 'ECONNREFUSED' }));
      await expect(make(client).save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=connect name=Error code=ECONNREFUSED reply=-',
      ]);
      warn.mockRestore();
    });

    it('connect-timeout step', async () => {
      vi.useFakeTimers();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = fakeClient();
      client.connect.mockImplementation(() => new Promise(() => undefined));
      const pending = expect(make(client).save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      await vi.advanceTimersByTimeAsync(1501);
      await pending;
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=connect-timeout name=TimeoutError code=- reply=-',
      ]);
      warn.mockRestore();
    });

    it('not-ready step', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = fakeClient();
      client.isReady = false;
      await expect(make(client).save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=not-ready name=- code=- reply=-',
      ]);
      warn.mockRestore();
    });

    it('save-command step reports only the reply word', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = fakeClient();
      client.set.mockRejectedValue(new SimpleError(`MOVED 3999 ${SECRET}`) as never);
      await expect(make(client).save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=save-command name=SimpleError code=- reply=MOVED',
      ]);
      warn.mockRestore();
    });

    it('real node-redis connection errors log their class name', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const a = fakeClient();
      a.connect.mockRejectedValue(new ConnectionTimeoutError());
      await expect(make(a).save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      const b = fakeClient();
      b.connect.mockRejectedValue(new SocketClosedUnexpectedlyError());
      await expect(make(b).save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=connect name=ConnectionTimeoutError code=- reply=-',
        '[founder-google-state] unavailable step=connect name=SocketClosedUnexpectedlyError code=- reply=-',
      ]);
      warn.mockRestore();
    });

    it('drops a non-conforming reply word and code', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = fakeClient();
      client.set.mockRejectedValue(
        Object.assign(new SimpleError(`bad ${SECRET}`), { code: 'not a code' }) as never,
      );
      await expect(make(client).save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=save-command name=SimpleError code=- reply=-',
      ]);
      warn.mockRestore();
    });

    it('save-timeout step', async () => {
      vi.useFakeTimers();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = fakeClient();
      client.set.mockImplementation(() => new Promise(() => undefined) as never);
      const pending = expect(make(client).save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      await vi.advanceTimersByTimeAsync(1501);
      await pending;
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=save-timeout name=TimeoutError code=- reply=-',
      ]);
      warn.mockRestore();
    });

    it('save-not-ok step reports the reply type only', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = fakeClient();
      client.set.mockResolvedValue(null as never);
      await expect(make(client).save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=save-not-ok name=- code=- reply=null',
      ]);
      warn.mockRestore();
    });

    it('consume-command step', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = fakeClient();
      client.eval.mockRejectedValue(
        new SimpleError(`NOPERM this user has no permissions ${SECRET}`) as never,
      );
      await expect(make(client).consume('s', RECORD.browserHash)).rejects.toMatchObject({
        status: 503,
      });
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=consume-command name=SimpleError code=- reply=NOPERM',
      ]);
      warn.mockRestore();
    });

    it('consume-timeout step', async () => {
      vi.useFakeTimers();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = fakeClient();
      client.eval.mockImplementation(() => new Promise(() => undefined) as never);
      const pending = expect(make(client).consume('s', RECORD.browserHash)).rejects.toMatchObject({
        status: 503,
      });
      await vi.advanceTimersByTimeAsync(1501);
      await pending;
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=consume-timeout name=TimeoutError code=- reply=-',
      ]);
      warn.mockRestore();
    });

    it('consume-parse step never includes the payload', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const client = fakeClient();
      client.eval.mockResolvedValue(`{${SECRET}` as never);
      await expect(make(client).consume('s', RECORD.browserHash)).rejects.toMatchObject({
        status: 503,
      });
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=consume-parse name=SyntaxError code=- reply=-',
      ]);
      warn.mockRestore();
    });

    it('logs cooldown at most once per window and never leaks secrets', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      let now = 1000;
      const client = fakeClient();
      client.connect.mockRejectedValue(failWith(SECRET, { code: 'ETIMEDOUT' }));
      const store = make(client, () => now);
      for (let i = 0; i < 5; i += 1) {
        await expect(store.save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      }
      expect(lines(warn)).toEqual([
        '[founder-google-state] unavailable step=connect name=Error code=ETIMEDOUT reply=-',
        '[founder-google-state] unavailable step=cooldown name=- code=- reply=-',
      ]);
      now += 5001;
      await expect(store.save('s', RECORD)).rejects.toMatchObject({ status: 503 });
      expect(lines(warn)).toHaveLength(3);
      for (const line of lines(warn)) {
        expect(line).not.toMatch(/rediss?:|user|pw|host|6380|property-listify:|founder-google-proof/);
      }
      warn.mockRestore();
    });
  });

  it.each(['not-json', 'x'.repeat(2049)])('rejects corrupt Redis payloads', async value => {
    const client = fakeClient();
    client.eval.mockResolvedValue(value);
    const store = new RedisFounderGoogleStateStore('redis://cache.example.test', {
      clientFactory: factoryFor(client),
    });
    await expect(store.consume('state', RECORD.browserHash)).rejects.toMatchObject({ status: 503 });
    await store.close();
  });
});
