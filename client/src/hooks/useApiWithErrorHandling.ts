/**
 * Custom hook for API calls with error handling and recovery
 * Integrates with ErrorRecoveryStrategy system
 */

import { useState, useCallback } from 'react';
import { parseError, getRecoveryStrategy, retryWithBackoff, logError, type AppError } from '@/lib/errors/ErrorRecoveryStrategy';

interface UseApiWithErrorHandlingOptions {
  onSuccess?: () => void;
  onError?: (error: AppError) => void;
  maxRetries?: number;
  showDraftSavedMessage?: boolean;
}

interface ApiState {
  isLoading: boolean;
  error: AppError | null;
  retryCount: number;
}

export function useApiWithErrorHandling<T extends (...args: any[]) => Promise<any>>(
  apiFunction: T,
  options: UseApiWithErrorHandlingOptions = {}
) {
  const [state, setState] = useState<ApiState>({
    isLoading: false,
    error: null,
    retryCount: 0,
  });

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const execute = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await apiFunction(...args);
        
        setState({
          isLoading: false,
          error: null,
          retryCount: 0,
        });

        options.onSuccess?.();
        return result;
      } catch (error) {
        // Parse the error
        const appError = parseError(error, { type: 'network' });
        const strategy = getRecoveryStrategy(appError);

        // Log the error
        logError(appError);

        // Update state with error
        setState(prev => ({
          isLoading: false,
          error: appError,
          retryCount: prev.retryCount + 1,
        }));

        // Call error callback
        options.onError?.(appError);

        return null;
      }
    },
    [apiFunction, options]
  );

  const retry = useCallback(
    async (...args: Parameters<T>): Promise<ReturnType<T> | null> => {
      if (!state.error) return null;

      const strategy = getRecoveryStrategy(state.error);
      const maxRetries = options.maxRetries ?? strategy.maxRetries ?? 3;

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const result = await retryWithBackoff(
          () => apiFunction(...args),
          maxRetries,
          strategy.retryDelay ?? 2000
        );

        setState({
          isLoading: false,
          error: null,
          retryCount: 0,
        });

        options.onSuccess?.();
        return result;
      } catch (error) {
        const appError = parseError(error, { type: 'network' });
        logError(appError);

        setState(prev => ({
          isLoading: false,
          error: appError,
          retryCount: prev.retryCount + 1,
        }));

        options.onError?.(appError);
        return null;
      }
    },
    [apiFunction, state.error, options]
  );

  return {
    execute,
    retry,
    clearError,
    isLoading: state.isLoading,
    error: state.error,
    retryCount: state.retryCount,
  };
}
