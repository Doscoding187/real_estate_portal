/**
 * Auto-Save Hook
 * 
 * Provides automatic saving functionality with debouncing and status tracking.
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
   * Clear the last saved timestamp
   */
  clearSaveStatus: () => void;
}

/**
 * Hook for automatic saving with debouncing
 * 
 * @example
 * ```tsx
 * const { lastSaved, isSaving } = useAutoSave(formData, {
 *   storageKey: 'my-form-draft',
 *   debounceMs: 2000,
 *   onError: (error) => toast.error('Failed to save')
 * });
 * ```
 */
export function useAutoSave<T extends object>(
  data: T,
  options: AutoSaveOptions<T>
): AutoSaveStatus {
  const {
    debounceMs = 2000,
    storageKey,
    onSave,
    onError,
    enabled = true,
  } = options;

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Use ref to track the latest data without triggering re-renders
  const dataRef = useRef(data);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialMount = useRef(true);

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Save function
  const performSave = useCallback(async () => {
    if (!enabled) return;
    
    setIsSaving(true);
    setError(null);

    try {
      if (onSave) {
        // Use custom save function
        await onSave(dataRef.current);
      } else if (storageKey) {
        // Use localStorage
        try {
          localStorage.setItem(storageKey, JSON.stringify(dataRef.current));
        } catch (storageError) {
          // Handle quota exceeded or other storage errors
          if (storageError instanceof Error) {
            throw new Error(`Storage error: ${storageError.message}`);
          }
          throw new Error('Failed to save to localStorage');
        }
      } else {
        throw new Error('Either storageKey or onSave must be provided');
      }

      setLastSaved(new Date());
    } catch (err) {
      const saveError = err instanceof Error ? err : new Error('Unknown save error');
      setError(saveError);
      onError?.(saveError);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, onSave, storageKey, onError]);

  // Manual save function (bypasses debounce)
  const saveNow = useCallback(async () => {
    // Clear any pending debounced save
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await performSave();
  }, [performSave]);

  // Clear save status
  const clearSaveStatus = useCallback(() => {
    setLastSaved(null);
    setError(null);
  }, []);

  // Auto-save effect with debouncing
  useEffect(() => {
    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!enabled) return;

    // Clear existing timer
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Set new timer
    timerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [data, debounceMs, enabled, performSave]);

  return {
    lastSaved,
    isSaving,
    error,
    saveNow,
    clearSaveStatus,
  };
}
