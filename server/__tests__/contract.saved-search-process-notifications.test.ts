import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockProcessDueNotifications } = vi.hoisted(() => ({
  mockProcessDueNotifications: vi.fn(),
}));

vi.mock('../services/savedSearchNotificationEngine', () => ({
  savedSearchNotificationEngine: {
    processDueNotifications: mockProcessDueNotifications,
  },
}));

import { appRouter } from '../routers';

describe('savedSearch.processNotifications contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = 'test';

    mockProcessDueNotifications.mockResolvedValue({
      processedAt: '2026-03-21T10:00:00.000Z',
      scannedSearches: 2,
      dueSearches: 1,
      emittedNotifications: 1,
      dryRun: true,
      notifications: [],
    });
  });

  it('processes due notifications for the authenticated user', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 77, role: 'user' },
    } as any);

    const result = await caller.savedSearch.processNotifications({
      dryRun: true,
      limit: 5,
    });

    expect(mockProcessDueNotifications).toHaveBeenCalledWith({
      userId: 77,
      dryRun: true,
      limit: 5,
    });
    expect(result).toMatchObject({
      dueSearches: 1,
      emittedNotifications: 1,
      dryRun: true,
    });
  });
});
