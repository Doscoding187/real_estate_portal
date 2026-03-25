import { desc, eq } from 'drizzle-orm';
import { platformSettings } from '../../drizzle/schema';
import { getDb } from '../db-connection';
import type { SavedSearchNotificationEngineResult } from './savedSearchNotificationEngine';
import { savedSearchNotificationEngine } from './savedSearchNotificationEngine';

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;
const HISTORY_SETTING_KEY = 'saved_search_scheduler_history';
const HISTORY_LIMIT = 20;

export interface SavedSearchDeliverySchedulerRun {
  trigger: 'startup' | 'interval' | 'manual';
  startedAt: string;
  completedAt: string | null;
  failedAt: string | null;
  error: string | null;
  result: Pick<
    SavedSearchNotificationEngineResult,
    | 'processedAt'
    | 'scannedSearches'
    | 'dueSearches'
    | 'emittedNotifications'
    | 'emailedNotifications'
    | 'retriedEmailDeliveries'
    | 'failedEmailRetries'
    | 'abandonedEmailRetries'
  > | null;
}

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
    | 'processedAt'
    | 'scannedSearches'
    | 'dueSearches'
    | 'emittedNotifications'
    | 'emailedNotifications'
    | 'retriedEmailDeliveries'
    | 'failedEmailRetries'
    | 'abandonedEmailRetries'
  > | null;
  recentRuns: SavedSearchDeliverySchedulerRun[];
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

function coerceHistoryEntry(value: unknown): SavedSearchDeliverySchedulerRun | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const trigger = candidate.trigger;
  if (trigger !== 'startup' && trigger !== 'interval' && trigger !== 'manual') {
    return null;
  }

  const startedAt =
    typeof candidate.startedAt === 'string' && candidate.startedAt ? candidate.startedAt : null;
  if (!startedAt) {
    return null;
  }

  const result =
    candidate.result && typeof candidate.result === 'object' && !Array.isArray(candidate.result)
      ? (candidate.result as SavedSearchDeliverySchedulerRun['result'])
      : null;

  return {
    trigger,
    startedAt,
    completedAt:
      typeof candidate.completedAt === 'string' && candidate.completedAt ? candidate.completedAt : null,
    failedAt: typeof candidate.failedAt === 'string' && candidate.failedAt ? candidate.failedAt : null,
    error: typeof candidate.error === 'string' && candidate.error ? candidate.error : null,
    result,
  };
}

function parsePersistedHistory(value: unknown): SavedSearchDeliverySchedulerRun[] {
  if (typeof value !== 'string' || !value.trim()) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.map(coerceHistoryEntry).filter(Boolean).slice(0, HISTORY_LIMIT) as SavedSearchDeliverySchedulerRun[];
  } catch {
    return [];
  }
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
    recentRuns: [],
  };

  async start(options?: { runOnStart?: boolean }) {
    this.status.enabled = isSchedulerEnabled();
    this.status.intervalMs = getSchedulerIntervalMs();
    await this.hydratePersistedHistory();

    if (!this.status.enabled) {
      await this.stop();
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
    return {
      ...this.status,
      lastResult: this.status.lastResult ? { ...this.status.lastResult } : null,
      recentRuns: this.status.recentRuns.map(entry => ({ ...entry, result: entry.result ? { ...entry.result } : null })),
    };
  }

  async runDueNotifications(trigger: 'startup' | 'interval' | 'manual' = 'manual') {
    if (this.currentRun) {
      return this.currentRun;
    }

    const runStartedAt = new Date().toISOString();
    this.status.running = true;
    this.status.lastRunStartedAt = runStartedAt;
    this.status.lastError = null;
    const historyEntry: SavedSearchDeliverySchedulerRun = {
      trigger,
      startedAt: runStartedAt,
      completedAt: null,
      failedAt: null,
      error: null,
      result: null,
    };

    const runPromise = (async () => {
      try {
        const result = await savedSearchNotificationEngine.processDueNotifications();
        this.status.lastResult = {
          processedAt: result.processedAt,
          scannedSearches: result.scannedSearches,
          dueSearches: result.dueSearches,
          emittedNotifications: result.emittedNotifications,
          emailedNotifications: result.emailedNotifications,
          retriedEmailDeliveries: result.retriedEmailDeliveries,
          failedEmailRetries: result.failedEmailRetries,
          abandonedEmailRetries: result.abandonedEmailRetries,
        };
        const completedAt = new Date().toISOString();
        this.status.lastRunCompletedAt = completedAt;
        historyEntry.completedAt = completedAt;
        historyEntry.result = { ...this.status.lastResult };
        console.log('[SavedSearchScheduler] Run completed', {
          trigger,
          scannedSearches: result.scannedSearches,
          dueSearches: result.dueSearches,
          emittedNotifications: result.emittedNotifications,
          emailedNotifications: result.emailedNotifications,
          retriedEmailDeliveries: result.retriedEmailDeliveries,
          failedEmailRetries: result.failedEmailRetries,
          abandonedEmailRetries: result.abandonedEmailRetries,
        });
      } catch (error) {
        const failedAt = new Date().toISOString();
        this.status.lastRunFailedAt = failedAt;
        this.status.lastError = (error as Error)?.message || 'Unknown scheduler error';
        historyEntry.failedAt = failedAt;
        historyEntry.error = this.status.lastError;
        console.error('[SavedSearchScheduler] Run failed', {
          trigger,
          error: this.status.lastError,
        });
      } finally {
        this.recordHistoryEntry(historyEntry);
        await this.persistHistory();
        this.status.running = false;
        this.currentRun = null;
      }
    })();

    this.currentRun = runPromise;
    return runPromise;
  }

  private recordHistoryEntry(entry: SavedSearchDeliverySchedulerRun) {
    this.status.recentRuns = [entry, ...this.status.recentRuns].slice(0, HISTORY_LIMIT);
  }

  private async hydratePersistedHistory() {
    const db = await getDb();
    if (!db) {
      return;
    }

    try {
      const rows = await (db.select().from(platformSettings) as any)
        .where(eq(platformSettings.settingKey, HISTORY_SETTING_KEY))
        .orderBy(desc(platformSettings.updatedAt))
        .limit(1);

      const persistedHistory = parsePersistedHistory(rows[0]?.settingValue);
      if (persistedHistory.length === 0) {
        return;
      }

      this.status.recentRuns = persistedHistory;
      const latest = persistedHistory[0];
      this.status.lastRunStartedAt = latest.startedAt;
      this.status.lastRunCompletedAt = latest.completedAt;
      this.status.lastRunFailedAt = latest.failedAt;
      this.status.lastError = latest.error;
      this.status.lastResult = latest.result;
    } catch (error) {
      console.warn('[SavedSearchScheduler] Failed to hydrate persisted history.', error);
    }
  }

  private async persistHistory() {
    const db = await getDb();
    if (!db) {
      return;
    }

    const serializedHistory = JSON.stringify(this.status.recentRuns);

    try {
      const rows = await (db.select().from(platformSettings) as any)
        .where(eq(platformSettings.settingKey, HISTORY_SETTING_KEY))
        .orderBy(desc(platformSettings.updatedAt))
        .limit(1);

      const existing = rows[0];
      if (existing?.id) {
        await db
          .update(platformSettings)
          .set({
            settingValue: serializedHistory,
            description: 'Saved search scheduler run history',
            category: 'notifications',
            isPublic: 0,
          })
          .where(eq(platformSettings.id, Number(existing.id)));
        return;
      }

      await db.insert(platformSettings).values({
        settingKey: HISTORY_SETTING_KEY,
        settingValue: serializedHistory,
        description: 'Saved search scheduler run history',
        category: 'notifications',
        isPublic: 0,
      });
    } catch (error) {
      console.warn('[SavedSearchScheduler] Failed to persist run history.', error);
    }
  }
}

export const savedSearchDeliveryScheduler = new SavedSearchDeliveryScheduler();
