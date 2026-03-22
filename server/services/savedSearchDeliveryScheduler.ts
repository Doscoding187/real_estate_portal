import type { SavedSearchNotificationEngineResult } from './savedSearchNotificationEngine';
import { savedSearchNotificationEngine } from './savedSearchNotificationEngine';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export interface SavedSearchDeliverySchedulerStatus {
  enabled: boolean;
  running: boolean;
  timerActive: boolean;
  intervalMs: number;
  startedAt: string | null;
  lastRunStartedAt: string | null;
  lastRunCompletedAt: string | null;
  lastRunFailedAt: string | null;
  lastError: string | null;
  lastResult: Pick<
    SavedSearchNotificationEngineResult,
    'processedAt' | 'scannedSearches' | 'dueSearches' | 'emittedNotifications' | 'emailedNotifications'
  > | null;
}

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return fallback;
  }

  if (['1', 'true', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['0', 'false', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return fallback;
}

function parsePositiveIntEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function isSchedulerEnabled() {
  return parseBooleanEnv(process.env.SAVED_SEARCH_SCHEDULER_ENABLED, process.env.NODE_ENV !== 'test');
}

function getSchedulerIntervalMs() {
  return parsePositiveIntEnv(process.env.SAVED_SEARCH_SCHEDULER_INTERVAL_MS, DEFAULT_INTERVAL_MS);
}

export class SavedSearchDeliveryScheduler {
  private timer: NodeJS.Timeout | null = null;
  private currentRun: Promise<void> | null = null;
  private status: SavedSearchDeliverySchedulerStatus = {
    enabled: isSchedulerEnabled(),
    running: false,
    timerActive: false,
    intervalMs: getSchedulerIntervalMs(),
    startedAt: null,
    lastRunStartedAt: null,
    lastRunCompletedAt: null,
    lastRunFailedAt: null,
    lastError: null,
    lastResult: null,
  };

  start(options?: { runOnStart?: boolean }) {
    this.status.enabled = isSchedulerEnabled();
    this.status.intervalMs = getSchedulerIntervalMs();

    if (!this.status.enabled) {
      this.stop();
      return this.getStatus();
    }

    if (this.timer) {
      return this.getStatus();
    }

    this.status.startedAt = new Date().toISOString();
    this.timer = setInterval(() => {
      void this.runDueNotifications('interval');
    }, this.status.intervalMs);
    this.timer.unref?.();
    this.status.timerActive = true;

    if (options?.runOnStart ?? true) {
      void this.runDueNotifications('startup');
    }

    return this.getStatus();
  }

  async stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    this.status.timerActive = false;

    if (this.currentRun) {
      await this.currentRun;
    }
  }

  getStatus(): SavedSearchDeliverySchedulerStatus {
    return { ...this.status, lastResult: this.status.lastResult ? { ...this.status.lastResult } : null };
  }

  async runDueNotifications(trigger: 'startup' | 'interval' | 'manual' = 'manual') {
    if (this.currentRun) {
      return this.currentRun;
    }

    const runStartedAt = new Date().toISOString();
    this.status.running = true;
    this.status.lastRunStartedAt = runStartedAt;
    this.status.lastError = null;

    const runPromise = (async () => {
      try {
        const result = await savedSearchNotificationEngine.processDueNotifications();
        this.status.lastResult = {
          processedAt: result.processedAt,
          scannedSearches: result.scannedSearches,
          dueSearches: result.dueSearches,
          emittedNotifications: result.emittedNotifications,
          emailedNotifications: result.emailedNotifications,
        };
        this.status.lastRunCompletedAt = new Date().toISOString();
        console.log('[SavedSearchScheduler] Run completed', {
          trigger,
          scannedSearches: result.scannedSearches,
          dueSearches: result.dueSearches,
          emittedNotifications: result.emittedNotifications,
          emailedNotifications: result.emailedNotifications,
        });
      } catch (error) {
        this.status.lastRunFailedAt = new Date().toISOString();
        this.status.lastError = (error as Error)?.message || 'Unknown scheduler error';
        console.error('[SavedSearchScheduler] Run failed', {
          trigger,
          error: this.status.lastError,
        });
      } finally {
        this.status.running = false;
        this.currentRun = null;
      }
    })();

    this.currentRun = runPromise;
    return runPromise;
  }
}

export const savedSearchDeliveryScheduler = new SavedSearchDeliveryScheduler();
