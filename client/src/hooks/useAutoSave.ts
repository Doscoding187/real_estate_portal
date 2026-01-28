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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // Revisioning + single-flight
  const saveRevisionRef = useRef(0);
  const inFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const performSave = useCallback(async () => {
    if (!enabled) return;

    const snapshot = dataRef.current;
    if (shouldSkipSave?.(snapshot)) return;

    // Increment revision for this save attempt
    const myRevision = ++saveRevisionRef.current;

    // Single-flight: if a save is in progress, wait for it, then continue
    if (inFlightRef.current) {
      try {
        await inFlightRef.current;
      } catch {
        // ignore; we'll attempt this save anyway
      }
    }

    setIsSaving(true);
    setError(null);

    const savePromise = (async () => {
      try {
        if (onSave) {
          await onSave(snapshot);
        } else if (storageKey) {
          localStorage.setItem(storageKey, JSON.stringify(snapshot));
        } else {
          throw new Error('Either storageKey or onSave must be provided');
        }

        // Only apply "lastSaved" if this is still the latest save
        if (myRevision === saveRevisionRef.current) {
          setLastSaved(new Date());
        }
      } catch (err) {
        const saveError = err instanceof Error ? err : new Error('Unknown save error');

        // Only apply error if this is still the latest save
        if (myRevision === saveRevisionRef.current) {
          setError(saveError);
        }
        onError?.(saveError);
        throw saveError;
      } finally {
        // Only clear saving state if this is still the latest save
        if (myRevision === saveRevisionRef.current) {
          setIsSaving(false);
        }
      }
    })();

    inFlightRef.current = savePromise;

    try {
      await savePromise;
    } finally {
      // Only clear inFlight if we didn't get superseded
      if (inFlightRef.current === savePromise) {
        inFlightRef.current = null;
      }
    }
  }, [enabled, onSave, storageKey, onError, shouldSkipSave]);

  const saveNow = useCallback(async () => {
    clearTimer();
    await performSave();
  }, [clearTimer, performSave]);

  const clearSaveStatus = useCallback(() => {
    setLastSaved(null);
    setError(null);
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!enabled) return;
    if (shouldSkipSave?.(data)) return;

    clearTimer();
    timerRef.current = setTimeout(() => {
      void performSave();
    }, debounceMs);

    return () => clearTimer();
  }, [data, debounceMs, enabled, performSave, clearTimer, shouldSkipSave]);

  return {
    lastSaved,
    isSaving,
    error,
    saveNow,
    clearSaveStatus,
  };
}
