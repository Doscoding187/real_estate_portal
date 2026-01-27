/**
 * Error Boundary for Advertise Landing Page
 *
 * Wraps major sections to catch and handle React errors gracefully.
 * Provides fallback UI and error logging to monitoring service.
 *
 * Requirements: 10.1
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { softUITokens } from './design-tokens';
import { fadeUp } from '@/lib/animations/advertiseAnimations';

export interface AdvertiseErrorBoundaryProps {
  /**
   * Child components to protect
   */
  children: ReactNode;

  /**
   * Optional custom fallback UI
   */
  fallback?: ReactNode;

  /**
   * Section name for error logging
   */
  sectionName?: string;

  /**
   * Optional error handler callback
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;

  /**
   * Whether to show the section name in error UI
   */
  showSectionName?: boolean;
}

export interface AdvertiseErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 * Catches React errors and displays user-friendly fallback UI
 */
export class AdvertiseErrorBoundary extends Component<
  AdvertiseErrorBoundaryProps,
  AdvertiseErrorBoundaryState
> {
  constructor(props: AdvertiseErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<AdvertiseErrorBoundaryState> {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('AdvertiseErrorBoundary caught an error:', error, errorInfo);
    }

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log to monitoring service (e.g., Sentry, LogRocket)
    this.logErrorToService(error, errorInfo);
  }

  /**
   * Log error to monitoring service
   */
  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In production, send to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      try {
        // Example: Send to monitoring service
        // Sentry.captureException(error, {
        //   contexts: {
        //     react: {
        //       componentStack: errorInfo.componentStack,
        //     },
        //   },
        //   tags: {
        //     section: this.props.sectionName || 'unknown',
        //     page: 'advertise-landing',
        //   },
        // });

        // For now, just log to console
        console.error('Error logged to monitoring service:', {
          error: error.message,
          section: this.props.sectionName,
          componentStack: errorInfo.componentStack,
        });
      } catch (loggingError) {
        console.error('Failed to log error to monitoring service:', loggingError);
      }
    }
  }

  /**
   * Reset error boundary state
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Reload the page
   */
  private handleReload = () => {
    window.location.reload();
  };

  /**
   * Navigate to home page
   */
  private handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div
          style={{
            padding: `${softUITokens.spacing['5xl']} ${softUITokens.spacing.xl}`,
            background: softUITokens.colors.neutral.gray50,
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          role="alert"
          aria-live="assertive"
        >
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            style={{
              maxWidth: '600px',
              textAlign: 'center',
              padding: softUITokens.spacing['5xl'],
              background: softUITokens.colors.neutral.white,
              borderRadius: softUITokens.borderRadius.softLarge,
              boxShadow: softUITokens.shadows.soft,
            }}
          >
            {/* Error Icon */}
            <div
              style={{
                color: '#f59e0b', // amber-500
                marginBottom: softUITokens.spacing.lg,
              }}
              aria-hidden="true"
            >
              <AlertTriangle size={64} style={{ margin: '0 auto' }} />
            </div>

            {/* Error Title */}
            <h2
              style={{
                fontSize: softUITokens.typography.fontSize['3xl'],
                fontWeight: softUITokens.typography.fontWeight.bold,
                color: softUITokens.colors.neutral.gray900,
                marginBottom: softUITokens.spacing.md,
              }}
            >
              {this.props.showSectionName && this.props.sectionName
                ? `${this.props.sectionName} Error`
                : 'Something Went Wrong'}
            </h2>

            {/* Error Message */}
            <p
              style={{
                fontSize: softUITokens.typography.fontSize.lg,
                color: softUITokens.colors.neutral.gray600,
                marginBottom: softUITokens.spacing.xl,
                lineHeight: softUITokens.typography.lineHeight.relaxed,
              }}
            >
              We encountered an unexpected error while loading this section. Don't worry, our team
              has been notified and is working on a fix.
            </p>

            {/* Development Error Details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details
                style={{
                  marginBottom: softUITokens.spacing.xl,
                  padding: softUITokens.spacing.lg,
                  background: softUITokens.colors.neutral.gray50,
                  borderRadius: softUITokens.borderRadius.soft,
                  textAlign: 'left',
                  fontSize: softUITokens.typography.fontSize.sm,
                  color: softUITokens.colors.neutral.gray700,
                }}
              >
                <summary
                  style={{
                    cursor: 'pointer',
                    fontWeight: softUITokens.typography.fontWeight.medium,
                    marginBottom: softUITokens.spacing.sm,
                  }}
                >
                  Error Details (Development Only)
                </summary>
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontSize: softUITokens.typography.fontSize.xs,
                  }}
                >
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                gap: softUITokens.spacing.md,
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              <button
                onClick={this.handleReset}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: softUITokens.spacing.sm,
                  padding: `${softUITokens.spacing.md} ${softUITokens.spacing.xl}`,
                  background: softUITokens.colors.primary.gradient,
                  color: softUITokens.colors.neutral.white,
                  border: 'none',
                  borderRadius: softUITokens.borderRadius.soft,
                  fontSize: softUITokens.typography.fontSize.base,
                  fontWeight: softUITokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: `all ${softUITokens.transitions.base}`,
                  boxShadow: softUITokens.shadows.soft,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = softUITokens.shadows.softHover;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = softUITokens.shadows.soft;
                }}
                aria-label="Try again"
              >
                <RefreshCw size={18} />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: softUITokens.spacing.sm,
                  padding: `${softUITokens.spacing.md} ${softUITokens.spacing.xl}`,
                  background: softUITokens.colors.neutral.white,
                  color: softUITokens.colors.primary.dark,
                  border: `2px solid ${softUITokens.colors.primary.dark}`,
                  borderRadius: softUITokens.borderRadius.soft,
                  fontSize: softUITokens.typography.fontSize.base,
                  fontWeight: softUITokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: `all ${softUITokens.transitions.base}`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = softUITokens.colors.primary.light;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = softUITokens.colors.neutral.white;
                }}
                aria-label="Reload page"
              >
                <RefreshCw size={18} />
                Reload Page
              </button>

              <button
                onClick={this.handleGoHome}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: softUITokens.spacing.sm,
                  padding: `${softUITokens.spacing.md} ${softUITokens.spacing.xl}`,
                  background: 'transparent',
                  color: softUITokens.colors.neutral.gray600,
                  border: `1px solid ${softUITokens.colors.neutral.gray300}`,
                  borderRadius: softUITokens.borderRadius.soft,
                  fontSize: softUITokens.typography.fontSize.base,
                  fontWeight: softUITokens.typography.fontWeight.medium,
                  cursor: 'pointer',
                  transition: `all ${softUITokens.transitions.base}`,
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = softUITokens.colors.neutral.gray50;
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                }}
                aria-label="Go to home page"
              >
                <Home size={18} />
                Go Home
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Minimal Error Fallback
 * Lightweight fallback for less critical sections
 */
export const MinimalErrorFallback: React.FC<{
  sectionName?: string;
  onRetry?: () => void;
}> = ({ sectionName, onRetry }) => {
  return (
    <div
      style={{
        padding: softUITokens.spacing.xl,
        background: softUITokens.colors.neutral.gray50,
        borderRadius: softUITokens.borderRadius.soft,
        textAlign: 'center',
      }}
      role="alert"
      aria-live="polite"
    >
      <p
        style={{
          color: softUITokens.colors.neutral.gray600,
          fontSize: softUITokens.typography.fontSize.base,
          marginBottom: softUITokens.spacing.md,
        }}
      >
        {sectionName ? `Unable to load ${sectionName}` : 'Unable to load this section'}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          style={{
            padding: `${softUITokens.spacing.sm} ${softUITokens.spacing.lg}`,
            background: softUITokens.colors.primary.gradient,
            color: softUITokens.colors.neutral.white,
            border: 'none',
            borderRadius: softUITokens.borderRadius.soft,
            fontSize: softUITokens.typography.fontSize.sm,
            fontWeight: softUITokens.typography.fontWeight.medium,
            cursor: 'pointer',
          }}
          aria-label="Retry loading section"
        >
          Retry
        </button>
      )}
    </div>
  );
};

/**
 * Section Error Boundary Wrapper
 * Convenience wrapper for wrapping individual sections
 */
export const SectionErrorBoundary: React.FC<{
  children: ReactNode;
  sectionName: string;
  minimal?: boolean;
}> = ({ children, sectionName, minimal = false }) => {
  return (
    <AdvertiseErrorBoundary
      sectionName={sectionName}
      showSectionName={true}
      fallback={minimal ? <MinimalErrorFallback sectionName={sectionName} /> : undefined}
    >
      {children}
    </AdvertiseErrorBoundary>
  );
};

// Default export
export default AdvertiseErrorBoundary;
