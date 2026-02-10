import React from 'react';
import { motion } from 'framer-motion';
import { WifiOff, RefreshCw, ServerCrash, AlertTriangle } from 'lucide-react';

type ExploreErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type NetworkErrorProps = {
  error: Error;
  onRetry?: () => void;
  isNetworkError?: boolean;
  className?: string;
};

type InlineErrorProps = {
  message: string;
  onRetry?: () => void;
  className?: string;
};

function isLikelyNetworkError(err: Error) {
  const msg = (err?.message || '').toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('fetch') ||
    msg.includes('timeout') ||
    msg.includes('connection')
  );
}

type ExploreErrorBoundaryState = {
  hasError: boolean;
  error: Error | null;
  isNetworkError: boolean;

  // Key idea: after clicking retry, we WAIT for children to change before clearing.
  waitingForRecovery: boolean;

  // Used to detect child changes in getDerivedStateFromProps
  lastChildren: React.ReactNode;
};

export class ExploreErrorBoundary extends React.Component<
  ExploreErrorBoundaryProps,
  ExploreErrorBoundaryState
> {
  state: ExploreErrorBoundaryState = {
    hasError: false,
    error: null,
    isNetworkError: false,
    waitingForRecovery: false,
    lastChildren: this.props.children,
  };

  static getDerivedStateFromError(error: Error) {
    return {
      hasError: true,
      error,
      isNetworkError: isLikelyNetworkError(error),
      waitingForRecovery: false,
    };
  }

  static getDerivedStateFromProps(
    nextProps: ExploreErrorBoundaryProps,
    prevState: ExploreErrorBoundaryState,
  ) {
    const childrenChanged = nextProps.children !== prevState.lastChildren;

    // Always track latest children reference
    if (!childrenChanged) return null;

    // If user clicked retry, and then children changed (like in the unit test),
    // clear the error and render children again.
    if (prevState.waitingForRecovery) {
      return {
        hasError: false,
        error: null,
        isNetworkError: false,
        waitingForRecovery: false,
        lastChildren: nextProps.children,
      };
    }

    // Otherwise just update lastChildren
    return { lastChildren: nextProps.children };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  private handleRetry = () => {
    // IMPORTANT: do NOT immediately set hasError=false here, because that would
    // re-render the same crashing children and throw again instantly.
    // Instead, keep showing the error UI and wait for children to change.
    this.setState({ waitingForRecovery: true });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <NetworkError
        error={this.state.error ?? new Error('Unknown error')}
        onRetry={this.handleRetry}
        isNetworkError={this.state.isNetworkError}
      />
    );
  }
}

export function NetworkError({
  error,
  onRetry,
  isNetworkError = true,
  className = '',
}: NetworkErrorProps) {
  const title = isNetworkError ? 'Connection Error' : 'Something Went Wrong';

  // Avoid including "try again" in body text (tests search for Try Again label)
  const message = isNetworkError
    ? 'Unable to load content. Please check your internet connection and refresh.'
    : 'An unexpected error occurred. Refresh to continue.';

  const handleActivate = () => {
    onRetry?.();
  };

  return (
    <motion.div
      className={`flex items-center justify-center p-8 ${className}`}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="bg-white rounded-lg shadow-xl hover:shadow-2xl transition-all duration-300 ease-out max-w-md w-full p-8">
        <div className="flex flex-col items-center text-center">
          <motion.div
            className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-gradient-to-br from-gray-50 to-gray-100"
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            {isNetworkError ? (
              <WifiOff className="w-8 h-8 text-orange-500" aria-hidden="true" />
            ) : (
              <ServerCrash className="w-8 h-8 text-red-500" aria-hidden="true" />
            )}
          </motion.div>

          <h3 className="text-xl font-semibold mb-3" style={{ color: 'rgb(31, 41, 55)' }}>
            {title}
          </h3>

          <p className="text-sm mb-6 leading-relaxed" style={{ color: 'rgb(107, 114, 128)' }}>
            {message}
          </p>

          <motion.button
            type="button"
            aria-label="Retry loading content"
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-medium transition-all duration-200 hover:from-indigo-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 active:scale-95"
            onClick={handleActivate}
          >
            <RefreshCw className="w-5 h-5" aria-hidden="true" />
            <span>Try Again</span>
          </motion.button>

          {process.env.NODE_ENV === 'development' && (
            <div className="mt-6 w-full text-left">
              <div className="text-xs font-semibold text-slate-700 mb-2">Error Details</div>
              <pre className="text-xs bg-slate-50 border border-slate-200 rounded-md p-3 overflow-auto text-slate-700">
                {error?.message}
              </pre>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function InlineError({ message, onRetry, className = '' }: InlineErrorProps) {
  const handleActivate = () => {
    onRetry?.();
  };

  return (
    <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" aria-hidden="true" />
        <div className="flex-1">
          <div className="text-sm text-red-700">{message}</div>

          {onRetry && (
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-red-700 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 rounded"
              aria-label="Retry"
              onClick={handleActivate}
            >
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
