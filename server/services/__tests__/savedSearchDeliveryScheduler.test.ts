import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SavedSearchDeliveryScheduler } from '../savedSearchDeliveryScheduler';

const { mockProcessDueNotifications } = vi.hoisted(() => ({
  mockProcessDueNotifications: vi.fn(),
}));

const {
  mockGetDb,
  mockSelect,
  mockSelectFrom,
  mockSelectWhere,
  mockSelectOrderBy,
  mockSelectLimit,
  mockInsertValues,
  mockUpdateSet,
  mockUpdateWhere,
} = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockSelect: vi.fn(),
  mockSelectFrom: vi.fn(),
  mockSelectWhere: vi.fn(),
  mockSelectOrderBy: vi.fn(),
  mockSelectLimit: vi.fn(),
  mockInsertValues: vi.fn(),
  mockUpdateSet: vi.fn(),
  mockUpdateWhere: vi.fn(),
}));

vi.mock('../savedSearchNotificationEngine', () => ({
  savedSearchNotificationEngine: {
    processDueNotifications: mockProcessDueNotifications,
  },
}));

vi.mock('../../db-connection', () => ({
  getDb: mockGetDb,
}));

describe('savedSearchDeliveryScheduler', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    process.env.SAVED_SEARCH_SCHEDULER_ENABLED = 'true';
    process.env.SAVED_SEARCH_SCHEDULER_INTERVAL_MS = '1000';

    mockSelect.mockReturnValue({ from: mockSelectFrom });
    mockSelectFrom.mockReturnValue({ where: mockSelectWhere });
    mockSelectWhere.mockReturnValue({ orderBy: mockSelectOrderBy });
    mockSelectOrderBy.mockReturnValue({ limit: mockSelectLimit });
    mockSelectLimit
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValue([{ id: 1, settingValue: '[]' }]);

    mockInsertValues.mockResolvedValue([{ insertId: 1 }]);
    mockUpdateWhere.mockResolvedValue(undefined);
    mockUpdateSet.mockReturnValue({ where: mockUpdateWhere });

    mockGetDb.mockResolvedValue({
      select: mockSelect,
      insert: vi.fn(() => ({ values: mockInsertValues })),
      update: vi.fn(() => ({ set: mockUpdateSet })),
    });
  });

  it(
    'runs on start and on interval, then exposes last-run status',
    async () => {
      mockProcessDueNotifications
        .mockResolvedValueOnce({
          processedAt: '2026-03-22T10:00:00.000Z',
          scannedSearches: 4,
          dueSearches: 2,
          emittedNotifications: 2,
          emailedNotifications: 1,
          retriedEmailDeliveries: 0,
          failedEmailRetries: 1,
          abandonedEmailRetries: 0,
        })
        .mockResolvedValueOnce({
          processedAt: '2026-03-22T10:00:01.000Z',
          scannedSearches: 5,
          dueSearches: 1,
          emittedNotifications: 1,
          emailedNotifications: 1,
          retriedEmailDeliveries: 1,
          failedEmailRetries: 0,
          abandonedEmailRetries: 0,
        });

      const scheduler = new SavedSearchDeliveryScheduler();

      await scheduler.start();
      await vi.runAllTicks();
      await Promise.resolve();

      await vi.advanceTimersByTimeAsync(1000);

      const status = scheduler.getStatus();
      expect(mockProcessDueNotifications).toHaveBeenCalledTimes(2);
      expect(status).toMatchObject({
        enabled: true,
        timerActive: true,
        running: false,
        intervalMs: 1000,
        lastResult: {
          processedAt: '2026-03-22T10:00:01.000Z',
          scannedSearches: 5,
          dueSearches: 1,
          emittedNotifications: 1,
          emailedNotifications: 1,
          retriedEmailDeliveries: 1,
          failedEmailRetries: 0,
          abandonedEmailRetries: 0,
        },
      });
      expect(status.recentRuns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            trigger: 'interval',
            result: expect.objectContaining({
              dueSearches: 1,
              emailedNotifications: 1,
              retriedEmailDeliveries: 1,
            }),
          }),
          expect.objectContaining({
            trigger: 'startup',
            result: expect.objectContaining({
              dueSearches: 2,
              emailedNotifications: 1,
              failedEmailRetries: 1,
            }),
          }),
        ]),
      );
      expect(mockInsertValues).toHaveBeenCalledOnce();
      expect(mockUpdateSet).toHaveBeenCalledOnce();
      expect(mockUpdateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          description: 'Saved search scheduler run history',
          category: 'notifications',
          isPublic: 0,
        }),
      );

      await scheduler.stop();
    },
    10000,
  );

  it('does not start when the scheduler is disabled', async () => {
    process.env.SAVED_SEARCH_SCHEDULER_ENABLED = 'false';
    const scheduler = new SavedSearchDeliveryScheduler();

    const status = await scheduler.start();

    expect(mockProcessDueNotifications).not.toHaveBeenCalled();
    expect(status).toMatchObject({
      enabled: false,
      timerActive: false,
      running: false,
    });
  });

  it('hydrates persisted run history on start', async () => {
    mockSelectLimit.mockReset();
    mockSelectLimit.mockResolvedValue([
      {
        id: 7,
        settingValue: JSON.stringify([
          {
            trigger: 'manual',
            startedAt: '2026-03-22T11:00:00.000Z',
            completedAt: '2026-03-22T11:00:03.000Z',
            failedAt: null,
            error: null,
            result: {
              processedAt: '2026-03-22T11:00:03.000Z',
              scannedSearches: 8,
              dueSearches: 2,
              emittedNotifications: 2,
              emailedNotifications: 1,
              retriedEmailDeliveries: 1,
              failedEmailRetries: 0,
              abandonedEmailRetries: 0,
            },
          },
        ]),
      },
    ]);

    const scheduler = new SavedSearchDeliveryScheduler();
    const status = await scheduler.start({ runOnStart: false });

    expect(mockProcessDueNotifications).not.toHaveBeenCalled();
    expect(status).toMatchObject({
      timerActive: true,
      lastRunStartedAt: '2026-03-22T11:00:00.000Z',
      lastRunCompletedAt: '2026-03-22T11:00:03.000Z',
      lastResult: {
        dueSearches: 2,
        emailedNotifications: 1,
        retriedEmailDeliveries: 1,
      },
    });
    expect(status.recentRuns).toEqual([
      expect.objectContaining({
        trigger: 'manual',
        startedAt: '2026-03-22T11:00:00.000Z',
      }),
    ]);

    await scheduler.stop();
  });
});
