import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockGetStatus,
  mockRunDueNotifications,
  mockGetDb,
  mockSelect,
  mockFrom,
  mockWhere,
  mockOrderBy,
  mockLimit,
  mockUpdate,
  mockUpdateSet,
  mockUpdateWhere,
} = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
  mockRunDueNotifications: vi.fn(),
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
  mockLimit: vi.fn(),
  mockUpdate: vi.fn(),
  mockUpdateSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
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
    mockFrom.mockReturnValue({ orderBy: mockOrderBy, where: mockWhere });
    mockWhere.mockReturnValue({ limit: mockLimit });
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
        retryState: 'succeeded',
        retryCount: 1,
        maxRetryCount: 3,
        nextRetryAt: null,
        lastRetryAt: '2026-03-22T10:06:00.000Z',
        actionUrl: '/property/55',
        previewMatches: [],
        error: null,
        processedAt: '2026-03-22T10:05:02.000Z',
      },
    ]);
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });
    mockUpdateWhere.mockResolvedValue(undefined);
    mockGetDb.mockResolvedValue({
      select: mockSelect,
      update: mockUpdate,
    });
    mockUpdate.mockReturnValue({ set: mockUpdateSet });
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
        retriedEmailDeliveries: 1,
        failedEmailRetries: 0,
        abandonedEmailRetries: 0,
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
        retriedEmailDeliveries: 1,
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
        retryState: 'succeeded',
        retryCount: 1,
      }),
    ]);
  });

  it('requeues an abandoned delivery for admins', async () => {
    mockLimit
      .mockResolvedValueOnce([
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
          emailDelivered: 0,
          status: 'partial',
          retryState: 'abandoned',
          retryCount: 3,
          maxRetryCount: 3,
          nextRetryAt: null,
          lastRetryAt: '2026-03-22T10:06:00.000Z',
          actionUrl: '/property/55',
          previewMatches: [],
          error: 'Email delivery returned false',
          processedAt: '2026-03-22T10:05:02.000Z',
        },
      ])
      .mockResolvedValueOnce([
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
          emailDelivered: 0,
          status: 'partial',
          retryState: 'pending',
          retryCount: 3,
          maxRetryCount: 4,
          nextRetryAt: '2026-03-22T10:10:00.000Z',
          lastRetryAt: '2026-03-22T10:06:00.000Z',
          actionUrl: '/property/55',
          previewMatches: [],
          error: null,
          processedAt: '2026-03-22T10:05:02.000Z',
        },
      ]);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 1, role: 'super_admin' },
    } as any);

    const result = await caller.system.updateSavedSearchDeliveryRetryState({
      deliveryHistoryId: 1,
      action: 'requeue',
    });

    expect(mockUpdate).toHaveBeenCalledOnce();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        retryState: 'pending',
        error: null,
        maxRetryCount: 4,
      }),
    );
    expect(result).toMatchObject({
      id: 1,
      retryState: 'pending',
      maxRetryCount: 4,
      emailRequested: true,
      emailDelivered: false,
    });
  });

  it('abandons a pending delivery for admins', async () => {
    mockLimit
      .mockResolvedValueOnce([
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
          emailDelivered: 0,
          status: 'partial',
          retryState: 'pending',
          retryCount: 1,
          maxRetryCount: 3,
          nextRetryAt: '2026-03-22T10:10:00.000Z',
          lastRetryAt: null,
          actionUrl: '/property/55',
          previewMatches: [],
          error: 'Email delivery returned false',
          processedAt: '2026-03-22T10:05:02.000Z',
        },
      ])
      .mockResolvedValueOnce([
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
          emailDelivered: 0,
          status: 'partial',
          retryState: 'abandoned',
          retryCount: 1,
          maxRetryCount: 3,
          nextRetryAt: null,
          lastRetryAt: null,
          actionUrl: '/property/55',
          previewMatches: [],
          error: 'Email delivery returned false',
          processedAt: '2026-03-22T10:05:02.000Z',
        },
      ]);

    const caller = appRouter.createCaller({
      req: { headers: {} },
      res: {},
      user: { id: 1, role: 'super_admin' },
    } as any);

    const result = await caller.system.updateSavedSearchDeliveryRetryState({
      deliveryHistoryId: 1,
      action: 'abandon',
    });

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({
        retryState: 'abandoned',
        nextRetryAt: null,
      }),
    );
    expect(result).toMatchObject({
      id: 1,
      retryState: 'abandoned',
      emailRequested: true,
      emailDelivered: false,
    });
  });
});
