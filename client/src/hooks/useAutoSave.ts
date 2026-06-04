/**
 * Auto-Save Hook (Production-Grade)
 *
 * Provides automatic saving functionality with:
 * - Stale response protection (save revision tracking)
 * - Single-flight control (prevents overlapping saves)
 * - Optional dirty-check optimization
 * - Debouncing and status tracking
 *
 * Works with localStorage or custom save functions.
 */

import { useEffect, useState, useRef, useCallback } from 'react';

export interface AutoSaveOptions<T> {
  /**
   * Debounce delay in milliseconds before saving
   * @default 2000
   */
  debounceMs?: number;

  /**
   * LocalStorage key for saving data
   * Required if no custom onSave function is provided
   */
  storageKey?: string;

  /**
   * Custom save function (e.g., API call)
   * If not provided, will use localStorage
   */
  onSave?: (data: T) => void | Promise<void>;

  /**
   * Error handler for save failures
   */
  onError?: (error: Error) => void;

  /**
   * Enable/disable auto-save
   * @default true
   */
  enabled?: boolean;

  /**
   * Optional: if provided, the hook will skip scheduling saves when this returns true.
   * Use it to avoid saving on purely UI-only changes or when data is effectively unchanged.
   *
   * @example
   * ```tsx
   * shouldSkipSave: (data) => !store.isDirty()
   * ```
   */
  shouldSkipSave?: (data: T) => boolean;
}

export interface AutoSaveStatus {
  /**
   * Timestamp of last successful save
   */
  lastSaved: Date | null;

  /**
   * Whether a save operation is currently in progress
   */
  isSaving: boolean;

  /**
   * Last error that occurred during save
   */
  error: Error | null;

  /**
   * Manually trigger a save (bypasses debounce)
   */
  saveNow: () => Promise<void>;

  /**
   * Clear the last saved timestamp and error
   */
  clearSaveStatus: () => void;
}

/**
 * Hook for automatic saving with debouncing, stale response protection, and single-flight control
 *
 * **Key Features:**
 * - **Stale Response Protection**: Prevents older saves from overwriting newer ones
 * - **Single-Flight Control**: Ensures only one save operation runs at a time
 * - **Dirty Check**: Optional `shouldSkipSave` callback to avoid unnecessary saves
 *
 * @example
 * ```tsx
 * // Basic usage with localStorage
 * const { lastSaved, isSaving } = useAutoSave(formData, {
 *   storageKey: 'my-form-draft',
 *   debounceMs: 2000,
 *   onError: (error) => toast.error('Failed to save')
 * });
 * ```
 *
 * @example
 * ```tsx
 * // Advanced usage with API and dirty check
 * const { saveNow, isSaving } = useAutoSave(stateToWatch, {
 *   debounceMs: 60000,
 *   enabled: isHydrated,
 *   shouldSkipSave: () => !store.isDirty(),
 *   onSave: async (data) => {
 *     await saveDraft(async draftData => {
 *       await saveDraftMutation.mutateAsync({ draftData });
 *     });
 *   }
 * });
 * ```
 */
export function useAutoSave<T extends object>(
  data: T,
  options: AutoSaveOptions<T>,
): AutoSaveStatus {
  const {
    debounceMs = 2000,
    storageKey,
    onSave,
    onError,
    enabled = true,
    shouldSkipSave,
  } = options;

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const dataRef = useRef(data);
  const optionsRef = useRef({ enabled, onError, onSave, shouldSkipSave, storageKey });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastObservedDataRef = useRef(data);
  const isMountedRef = useRef(true);
  const isReadyToScheduleRef = useRef(false);

  // Revisioning + serialized save queue
  const saveRevisionRef = useRef(0);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  dataRef.current = data;
  optionsRef.current = { enabled, onError, onSave, shouldSkipSave, storageKey };

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    isMountedRef.current = true;
    isReadyToScheduleRef.current = false;
    queueMicrotask(() => {
      if (!cancelled && isMountedRef.current) {
        isReadyToScheduleRef.current = true;
      }
    });

    return () => {
      cancelled = true;
      isMountedRef.current = false;
      isReadyToScheduleRef.current = false;
      clearTimer();
    };
  }, [clearTimer]);

  const performSave = useCallback(async () => {
    const optionsAtRequest = optionsRef.current;
    if (!optionsAtRequest.enabled) return;

    const snapshot = dataRef.current;
    if (optionsAtRequest.shouldSkipSave?.(snapshot)) return;

    // Increment revision when requested so older queued results cannot claim latest status.
    const myRevision = ++saveRevisionRef.current;

    const runSave = async () => {
      if (isMountedRef.current) {
        setIsSaving(true);
        setError(null);
      }

      try {
        if (optionsAtRequest.onSave) {
          await optionsAtRequest.onSave(snapshot);
        } else if (optionsAtRequest.storageKey) {
          localStorage.setItem(optionsAtRequest.storageKey, JSON.stringify(snapshot));
        } else {
          throw new Error('Either storageKey or onSave must be provided');
        }

        if (isMountedRef.current && myRevision === saveRevisionRef.current) {
          setLastSaved(new Date());
        }
      } catch (err) {
        const saveError = err instanceof Error ? err : new Error('Unknown save error');

        if (isMountedRef.current && myRevision === saveRevisionRef.current) {
          setError(saveError);
          optionsAtRequest.onError?.(saveError);
        }
        throw saveError;
      } finally {
        if (isMountedRef.current && myRevision === saveRevisionRef.current) {
          setIsSaving(false);
        }
      }
    };

    const savePromise = saveQueueRef.current.then(runSave, runSave);
    saveQueueRef.current = savePromise.catch(() => undefined);
    await savePromise;
  }, []);

  const saveNow = useCallback(async () => {
    clearTimer();
    await performSave();
  }, [clearTimer, performSave]);

  const clearSaveStatus = useCallback(() => {
    setLastSaved(null);
    setError(null);
  }, []);

  useEffect(() => {
    const dataChanged = lastObservedDataRef.current !== data;
    lastObservedDataRef.current = data;

    if (!isReadyToScheduleRef.current) return;
    if (!dataChanged) return;
    if (!enabled) return;
    if (shouldSkipSave?.(data)) return;

    clearTimer();
    timerRef.current = setTimeout(() => {
      void performSave().catch(() => {
        // Status and the optional onError callback already expose the failure.
      });
    }, debounceMs);

    return () => clearTimer();
  }, [data, debounceMs, enabled, performSave, clearTimer]);

  return {
    lastSaved,
    isSaving,
    error,
    saveNow,
    clearSaveStatus,
  };
}
