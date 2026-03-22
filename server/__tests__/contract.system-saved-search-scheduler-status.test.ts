import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetStatus } = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
}));

vi.mock('../services/savedSearchDeliveryScheduler', () => ({
  savedSearchDeliveryScheduler: {
    getStatus: mockGetStatus,
  },
}));

import { appRouter } from '../routers';

describe('system.savedSearchSchedulerStatus contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStatus.mockReturnValue({
      enabled: true,
      running: false,
      timerActive: true,
      intervalMs: 300000,
      startedAt: '2026-03-22T10:00:00.000Z',
      lastRunStartedAt: '2026-03-22T10:05:00.000Z',
      lastRunCompletedAt: '2026-03-22T10:05:02.000Z',
      lastRunFailedAt: null,
      lastError: null,
      lastResult: {
        processedAt: '2026-03-22T10:05:02.000Z',
        scannedSearches: 12,
        dueSearches: 3,
        emittedNotifications: 3,
        emailedNotifications: 2,
      },
    });
  });

  it('returns scheduler state for admins', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 1, role: 'super_admin' },
    } as any);

    const result = await caller.system.savedSearchSchedulerStatus();

    expect(mockGetStatus).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      enabled: true,
      timerActive: true,
      intervalMs: 300000,
      lastResult: {
        dueSearches: 3,
        emittedNotifications: 3,
        emailedNotifications: 2,
      },
    });
  });
});
