import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockProcessDueNotifications } = vi.hoisted(() => ({
  mockProcessDueNotifications: vi.fn(),
}));

vi.mock('../savedSearchNotificationEngine', () => ({
  savedSearchNotificationEngine: {
    processDueNotifications: mockProcessDueNotifications,
  },
}));

describe('savedSearchDeliveryScheduler', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.useFakeTimers();
    process.env.SAVED_SEARCH_SCHEDULER_ENABLED = 'true';
    process.env.SAVED_SEARCH_SCHEDULER_INTERVAL_MS = '1000';
  });

  it('runs on start and on interval, then exposes last-run status', async () => {
    mockProcessDueNotifications
      .mockResolvedValueOnce({
        processedAt: '2026-03-22T10:00:00.000Z',
        scannedSearches: 4,
        dueSearches: 2,
        emittedNotifications: 2,
        emailedNotifications: 1,
      })
      .mockResolvedValueOnce({
        processedAt: '2026-03-22T10:00:01.000Z',
        scannedSearches: 5,
        dueSearches: 1,
        emittedNotifications: 1,
        emailedNotifications: 1,
      });

    const { savedSearchDeliveryScheduler } = await import('../savedSearchDeliveryScheduler');

    savedSearchDeliveryScheduler.start();
    await vi.runAllTicks();
    await Promise.resolve();

    await vi.advanceTimersByTimeAsync(1000);

    const status = savedSearchDeliveryScheduler.getStatus();
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
      },
    });

    await savedSearchDeliveryScheduler.stop();
  });

  it('does not start when the scheduler is disabled', async () => {
    process.env.SAVED_SEARCH_SCHEDULER_ENABLED = 'false';
    const { savedSearchDeliveryScheduler } = await import('../savedSearchDeliveryScheduler');

    const status = savedSearchDeliveryScheduler.start();

    expect(mockProcessDueNotifications).not.toHaveBeenCalled();
    expect(status).toMatchObject({
      enabled: false,
      timerActive: false,
      running: false,
    });
  });
});
