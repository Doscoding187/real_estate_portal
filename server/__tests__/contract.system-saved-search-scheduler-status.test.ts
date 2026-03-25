import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetStatus,
  mockRunDueNotifications,
  mockGetDb,
  mockSelect,
  mockFrom,
  mockOrderBy,
  mockLimit,
} = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
  mockRunDueNotifications: vi.fn(),
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
}));

vi.mock('../services/savedSearchDeliveryScheduler', () => ({
  savedSearchDeliveryScheduler: {
    getStatus: mockGetStatus,
    runDueNotifications: mockRunDueNotifications,
  },
}));

vi.mock('../db', async importOriginal => {
  const actual = await importOriginal<typeof import('../db')>();
  return {
    ...actual,
    getDb: mockGetDb,
  };
});

import { appRouter } from '../routers';

describe('system.savedSearchSchedulerStatus contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunDueNotifications.mockResolvedValue(undefined);
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockReturnValue({ limit: mockLimit });
    mockLimit.mockResolvedValue([
      {
        id: 1,
        savedSearchId: 11,
        userId: 7,
        searchName: 'Johannesburg Apartments',
        title: '2 new matches for Johannesburg Apartments',
        content: 'Johannesburg: 2 new matches.',
        listingSource: 'all',
        notificationFrequency: 'daily',
        totalMatches: 2,
        newMatchCount: 2,
        inAppRequested: 1,
        emailRequested: 1,
        inAppDelivered: 1,
        emailDelivered: 1,
        status: 'delivered',
        actionUrl: '/property/55',
        previewMatches: [],
        error: null,
        processedAt: '2026-03-22T10:05:02.000Z',
      },
    ]);
    mockGetDb.mockResolvedValue({
      select: mockSelect,
    });
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

  it('returns saved-search delivery history for admins', async () => {
    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 1, role: 'super_admin' },
    } as any);

    const result = await caller.system.savedSearchDeliveryHistory({ limit: 5 });

    expect(mockGetDb).toHaveBeenCalledOnce();
    expect(mockSelect).toHaveBeenCalledOnce();
    expect(mockLimit).toHaveBeenCalledWith(5);
    expect(result).toEqual([
      expect.objectContaining({
        searchName: 'Johannesburg Apartments',
        status: 'delivered',
        inAppRequested: true,
        emailRequested: true,
        inAppDelivered: true,
        emailDelivered: true,
      }),
    ]);
  });
});
