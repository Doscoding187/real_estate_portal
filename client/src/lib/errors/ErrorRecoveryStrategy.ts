/**
 * Error Recovery Strategy
 *
 * Defines error types and recovery strategies for the application
 */

export type ErrorType = 'network' | 'validation' | 'server' | 'upload' | 'session' | 'unknown';

export interface AppError {
  /**
   * Error type
   */
  type: ErrorType;

  /**
   * Error message
   */
  message: string;

  /**
   * Original error object
   */
  originalError?: Error | unknown;

  /**
   * Whether this error is recoverable
   */
  isRecoverable: boolean;

  /**
   * Field name (for validation errors)
   */
  field?: string;

  /**
   * HTTP status code (for server errors)
   */
  statusCode?: number;

  /**
   * Additional context
   */
  context?: Record<string, unknown>;
}

export interface ErrorRecoveryStrategy {
  /**
   * Error type this strategy handles
   */
  type: ErrorType;

  /**
   * User-friendly error message
   */
  message: string;

  /**
   * Whether the error is recoverable
   */
  retryable: boolean;

  /**
   * Recovery action function
   */
  recoveryAction?: () => void | Promise<void>;

  /**
   * Maximum retry attempts
   */
  maxRetries?: number;

  /**
   * Retry delay in milliseconds
   */
  retryDelay?: number;
}

/**
 * Parse error into AppError format
 */
export function parseError(error: unknown, context?: Record<string, unknown>): AppError {
  // Network errors
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return {
      type: 'network',
      message: 'Network connection failed. Please check your internet connection.',
      originalError: error,
      isRecoverable: true,
      context,
    };
  }

  // HTTP errors
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const statusCode = (error as any).status;

    // Session expired
    if (statusCode === 401) {
      return {
        type: 'session',
        message: 'Your session has expired. Please log in again.',
        originalError: error,
        isRecoverable: false,
        statusCode,
        context,
      };
    }

    // Validation errors
    if (statusCode === 400 || statusCode === 422) {
      return {
        type: 'validation',
        message: 'Please check your input and try again.',
        originalError: error,
        isRecoverable: true,
        statusCode,
        context,
      };
    }

    // Server errors
    if (statusCode >= 500) {
      return {
        type: 'server',
        message: 'Server error occurred. Please try again later.',
        originalError: error,
        isRecoverable: true,
        statusCode,
        context,
      };
    }
  }

  // Upload errors
  if (context?.type === 'upload') {
    return {
      type: 'upload',
      message: (context.message as string) || 'File upload failed.',
      originalError: error,
      isRecoverable: true,
      context,
    };
  }

  // Generic error
  if (error instanceof Error) {
    return {
      type: 'unknown',
      message: error.message || 'An unexpected error occurred.',
      originalError: error,
      isRecoverable: false,
      context,
    };
  }

  // Unknown error
  return {
    type: 'unknown',
    message: 'An unexpected error occurred.',
    originalError: error,
    isRecoverable: false,
    context,
  };
}

/**
 * Get recovery strategy for an error
 */
export function getRecoveryStrategy(error: AppError): ErrorRecoveryStrategy {
  switch (error.type) {
    case 'network':
      return {
        type: 'network',
        message:
          'Connection lost. Your draft has been saved. Please check your internet connection and try again.',
        retryable: true,
        maxRetries: 3,
        retryDelay: 2000, // 2 seconds
      };

    case 'validation':
      return {
        type: 'validation',
        message: error.message || 'Please fix the highlighted errors before continuing.',
        retryable: false,
      };

    case 'server':
      return {
        type: 'server',
        message: 'Server error occurred. Please try again in a moment.',
        retryable: true,
        maxRetries: 2,
        retryDelay: 5000, // 5 seconds
      };

    case 'upload':
      return {
        type: 'upload',
        message: error.message || 'File upload failed. Please try again.',
        retryable: true,
        maxRetries: 2,
        retryDelay: 1000, // 1 second
      };

    case 'session':
      return {
        type: 'session',
        message: 'Your session has expired. Please log in again to continue.',
        retryable: false,
      };

    default:
      return {
        type: 'unknown',
        message: error.message || 'An unexpected error occurred.',
        retryable: false,
      };
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: Error | unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        break;
      }

      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 1000;

      await new Promise(resolve => setTimeout(resolve, delay + jitter));
    }
  }

  throw lastError;
}

/**
 * Log error for debugging
 */
export function logError(error: AppError): void {
  const logData = {
    type: error.type,
    message: error.message,
    statusCode: error.statusCode,
    field: error.field,
    context: error.context,
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
  };

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('[Error]', logData, error.originalError);
  }

  // In production, you would send this to an error tracking service
  // Example: Sentry, LogRocket, etc.
  // sendToErrorTracking(logData);
}

/**
 * Check if error is recoverable
 */
export function isRecoverableError(error: AppError): boolean {
  return error.isRecoverable && error.type !== 'session';
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: AppError): string {
  const strategy = getRecoveryStrategy(error);
  return strategy.message;
}
