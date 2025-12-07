/**
 * ErrorBoundary Component for Explore Feature
 * 
 * A specialized error boundary for the Explore feature with:
 * - NetworkError component with retry functionality
 * - Modern styling with icons
 * - Clear error messaging
 * - Graceful error recovery
 * 
 * Requirements: 7.1
 */

import { Component, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, WifiOff, ServerCrash } from 'lucide-react';
import { ModernCard } from '@/components/ui/soft/ModernCard';
import { designTokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary for Explore Feature
 * Catches React errors and displays a user-friendly error UI
 */
export class ExploreErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ExploreErrorBoundary caught an error:', error, errorInfo);
    }

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    this.setState({
      errorInfo,
    });
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Determine error type
      const isNetworkError = 
        this.state.error.message.includes('fetch') ||
        this.state.error.message.includes('network') ||
        this.state.error.message.includes('Failed to fetch');

      return (
        <NetworkError
          error={this.state.error}
          onRetry={this.handleRetry}
          isNetworkError={isNetworkError}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * NetworkError Component
 * Displays a user-friendly error message with retry functionality
 */
interface NetworkErrorProps {
  error: Error;
  onRetry: () => void;
  isNetworkError?: boolean;
  className?: string;
}

export function NetworkError({ 
  error, 
  onRetry, 
  isNetworkError = true,
  className 
}: NetworkErrorProps) {
  const errorConfig = isNetworkError
    ? {
        icon: WifiOff,
        title: 'Connection Error',
        description: 'Unable to load content. Please check your internet connection and try again.',
        iconColor: 'text-orange-500',
      }
    : {
        icon: ServerCrash,
        title: 'Something Went Wrong',
        description: 'An unexpected error occurred. Please try again.',
        iconColor: 'text-red-500',
      };

  const Icon = errorConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={cn('flex items-center justify-center p-8', className)}
    >
      <ModernCard 
        variant="elevated" 
        className="max-w-md w-full p-8"
        hoverable={false}
      >
        <div className="flex flex-col items-center text-center">
          {/* Error Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ 
              delay: 0.1, 
              type: 'spring', 
              stiffness: 200, 
              damping: 15 
            }}
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center mb-6',
              'bg-gradient-to-br from-gray-50 to-gray-100'
            )}
          >
            <Icon className={cn('w-8 h-8', errorConfig.iconColor)} />
          </motion.div>

          {/* Error Title */}
          <h3 
            className="text-xl font-semibold mb-3"
            style={{ color: designTokens.colors.text.primary }}
          >
            {errorConfig.title}
          </h3>

          {/* Error Description */}
          <p 
            className="text-sm mb-6 leading-relaxed"
            style={{ color: designTokens.colors.text.secondary }}
          >
            {errorConfig.description}
          </p>

          {/* Error Details (Development Only) */}
          {process.env.NODE_ENV === 'development' && (
            <details className="w-full mb-6">
              <summary 
                className="text-xs cursor-pointer mb-2 hover:underline"
                style={{ color: designTokens.colors.text.tertiary }}
              >
                Error Details
              </summary>
              <div 
                className="text-left p-3 rounded-lg overflow-auto max-h-32 text-xs font-mono"
                style={{ 
                  backgroundColor: designTokens.colors.bg.tertiary,
                  color: designTokens.colors.text.secondary,
                }}
              >
                <pre className="whitespace-pre-wrap break-words">
                  {error.message}
                  {error.stack && `\n\n${error.stack}`}
                </pre>
              </div>
            </details>
          )}

          {/* Retry Button */}
          <motion.button
            onClick={onRetry}
            className={cn(
              'flex items-center gap-2 px-6 py-3 rounded-lg',
              'bg-gradient-to-r from-indigo-500 to-indigo-600',
              'text-white font-medium',
              'transition-all duration-200',
              'hover:from-indigo-600 hover:to-indigo-700',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
              'active:scale-95'
            )}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            aria-label="Retry loading content"
          >
            <RefreshCw className="w-5 h-5" />
            <span>Try Again</span>
          </motion.button>
        </div>
      </ModernCard>
    </motion.div>
  );
}

/**
 * Inline Error Component
 * For smaller, inline error displays within components
 */
interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function InlineError({ message, onRetry, className }: InlineErrorProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className={cn(
        'flex items-center gap-3 p-4 rounded-lg',
        'bg-red-50 border border-red-200',
        className
      )}
    >
      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
      <p className="text-sm text-red-700 flex-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className={cn(
            'text-sm font-medium text-red-600 hover:text-red-700',
            'underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded'
          )}
          aria-label="Retry"
        >
          Retry
        </button>
      )}
    </motion.div>
  );
}

/**
 * Hook for using error boundary imperatively
 */
export function useErrorHandler() {
  const handleError = (error: Error) => {
    // This will be caught by the nearest error boundary
    throw error;
  };

  return { handleError };
}

// Default export for convenience
export default ExploreErrorBoundary;
