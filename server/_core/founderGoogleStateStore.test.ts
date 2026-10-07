import { afterEach, describe, expect, it, vi } from 'vitest';
import type { createClient } from 'redis';
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
