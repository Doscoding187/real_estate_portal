import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { client } = vi.hoisted(() => ({
  client: {
    isOpen: true,
    isReady: true,
    on: vi.fn(),
    connect: vi.fn(),
    quit: vi.fn(),
    destroy: vi.fn(),
  },
}));
vi.mock('redis', () => ({ createClient: () => client }));

let cache: (typeof import('./redis'))['redisCache'];

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('REDIS_URL', 'redis://127.0.0.1:6379');
  client.isOpen = true;
  client.isReady = true;
  client.connect.mockResolvedValue(undefined);
  client.quit.mockImplementation(async () => {
    client.isOpen = false;
  });
  client.destroy.mockImplementation(() => {
    client.isOpen = false;
  });
});

afterEach(async () => {
  await cache?.disconnect().catch(() => {});
  vi.unstubAllEnvs();
});

describe('startup Redis singleton shutdown', () => {
  it('quits a ready client once across repeated and concurrent cleanup', async () => {
    ({ redisCache: cache } = await import('./redis'));
    const closing = cache.disconnect();
    expect(cache.disconnect()).toBe(closing);
    await closing;
    await cache.disconnect();
    expect(client.quit).toHaveBeenCalledTimes(1);
    expect(client.destroy).not.toHaveBeenCalled();
  });

  it('cancels and awaits a connection that has never become ready', async () => {
    client.isReady = false;
    let cancelConnect!: (error: Error) => void;
    client.connect.mockReturnValue(
      new Promise((_resolve, reject) => {
        cancelConnect = reject;
      }),
    );
    client.destroy.mockImplementation(() => {
      client.isOpen = false;
      cancelConnect(new Error('Connection cancelled by shutdown'));
    });
    ({ redisCache: cache } = await import('./redis'));
    await cache.disconnect();
    expect(client.destroy).toHaveBeenCalledTimes(1);
    expect(client.quit).not.toHaveBeenCalled();
  });

  it('closes the socket and propagates a QUIT failure on repeated cleanup', async () => {
    ({ redisCache: cache } = await import('./redis'));
    const failure = new Error('QUIT failed');
    client.quit.mockRejectedValueOnce(failure);
    await expect(cache.disconnect()).rejects.toBe(failure);
    await expect(cache.disconnect()).rejects.toBe(failure);
    expect(client.destroy).toHaveBeenCalledTimes(1);
  });
});
