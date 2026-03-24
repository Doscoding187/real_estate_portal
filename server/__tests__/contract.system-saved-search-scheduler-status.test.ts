import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGetStatus, mockRunDueNotifications } = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
  mockRunDueNotifications: vi.fn(),
}));

vi.mock('../services/savedSearchDeliveryScheduler', () => ({
  savedSearchDeliveryScheduler: {
    getStatus: mockGetStatus,
    runDueNotifications: mockRunDueNotifications,
  },
}));

import { appRouter } from '../routers';

describe('system.savedSearchSchedulerStatus contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunDueNotifications.mockResolvedValue(undefined);
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
      recentRuns: [],
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

  it('runs the scheduler manually for admins', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 1, role: 'super_admin' },
    } as any);

    const result = await caller.system.runSavedSearchScheduler();

    expect(mockRunDueNotifications).toHaveBeenCalledOnce();
    expect(mockRunDueNotifications).toHaveBeenCalledWith('manual');
    expect(mockGetStatus).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      enabled: true,
      timerActive: true,
    });
  });
});
