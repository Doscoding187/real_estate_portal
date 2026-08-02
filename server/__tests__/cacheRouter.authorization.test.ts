import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDeleteByPattern } = vi.hoisted(() => ({
  mockDeleteByPattern: vi.fn(),
}));

vi.mock('../lib/redis', () => ({
  redisCache: {
    delByPattern: mockDeleteByPattern,
  },
}));

vi.mock('../services/cacheIntegrationService', () => ({
  getCacheStats: vi.fn(),
}));

import { appRouter } from '../routers';

const callerFor = (role: string) =>
  appRouter.createCaller({
    req: { headers: {} },
    res: {},
    user: { id: 42, email: `${role}@example.test`, name: role, role },
  } as any);

describe('cache administration authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(['visitor', 'agent', 'agency_admin'])(
    'rejects %s before clearing the Explore cache',
    async role => {
      await expect(callerFor(role).cache.clearAll()).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });

      await expect(callerFor(role).cache.clearPattern({ pattern: 'feed' })).rejects.toMatchObject({
        code: 'FORBIDDEN',
      });

      expect(mockDeleteByPattern).not.toHaveBeenCalled();
    },
  );

  it('allows only a super admin to clear the scoped cache patterns', async () => {
    await callerFor('super_admin').cache.clearAll();
    await callerFor('super_admin').cache.clearPattern({ pattern: 'feed' });

    expect(mockDeleteByPattern).toHaveBeenNthCalledWith(1, 'explore:*');
    expect(mockDeleteByPattern).toHaveBeenNthCalledWith(2, 'explore:feed:*');
  });
});
