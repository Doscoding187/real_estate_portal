/**
 * Error Alert Component
 *
 * Displays error messages with retry and dismiss actions
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, RefreshCw, X, WifiOff, Server, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ErrorType } from '@/lib/errors/ErrorRecoveryStrategy';

export interface ErrorAlertProps {
  /**
   * Error type
   */
  type: ErrorType;

  /**
   * Error title
   */
  title?: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Whether the error is retryable
   */
  retryable?: boolean;

  /**
   * Callback when retry button is clicked
   */
  onRetry?: () => void;

  /**
   * Callback when dismiss button is clicked
   */
  onDismiss?: () => void;

  /**
   * Whether to show the alert
   */
  show?: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Auto-dismiss after milliseconds
   */
  autoDismiss?: number;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  type,
  title,
  message,
  retryable = false,
  onRetry,
  onDismiss,
  show = true,
  className,
  autoDismiss,
}) => {
  // Auto-dismiss effect
  React.useEffect(() => {
    if (show && autoDismiss && onDismiss) {
      const timer = setTimeout(() => {
        onDismiss();
      }, autoDismiss);
      return () => clearTimeout(timer);
    }
  }, [show, autoDismiss, onDismiss]);

  // Get icon based on error type
  const getIcon = () => {
    switch (type) {
      case 'network':
        return <WifiOff className="w-5 h-5" />;
      case 'server':
        return <Server className="w-5 h-5" />;
      case 'validation':
        return <AlertTriangle className="w-5 h-5" />;
      case 'upload':
        return <AlertCircle className="w-5 h-5" />;
      case 'session':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <AlertCircle className="w-5 h-5" />;
    }
  };

  // Get default title based on error type
  const getDefaultTitle = () => {
    switch (type) {
      case 'network':
        return 'Connection Error';
      case 'server':
        return 'Server Error';
      case 'validation':
        return 'Validation Error';
      case 'upload':
        return 'Upload Failed';
      case 'session':
        return 'Session Expired';
      default:
        return 'Error';
    }
  };

  // Get variant based on error type
  const getVariant = () => {
    switch (type) {
      case 'validation':
        return 'default';
      default:
        return 'destructive';
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={className}
        >
          <Alert variant={getVariant()} className="relative">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <AlertTitle className="mb-1">{title || getDefaultTitle()}</AlertTitle>
                <AlertDescription className="text-sm">{message}</AlertDescription>
              </div>

              {/* Actions */}
              <div className="flex-shrink-0 flex items-center gap-2">
                {retryable && onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="gap-2 bg-white hover:bg-gray-50"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry
                  </Button>
                )}

                {onDismiss && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onDismiss}
                    className="h-8 w-8 p-0 hover:bg-white/50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * Error Alert List Component
 *
 * Displays multiple error alerts in a stack
 */
export interface ErrorAlertListProps {
  /**
   * Array of errors to display
   */
  errors: Array<{
    id: string;
    type: ErrorType;
    title?: string;
    message: string;
    retryable?: boolean;
  }>;

  /**
   * Callback when retry is clicked
   */
  onRetry?: (id: string) => void;

  /**
   * Callback when dismiss is clicked
   */
  onDismiss?: (id: string) => void;

  /**
   * Additional CSS classes
   */
  className?: string;
}

export const ErrorAlertList: React.FC<ErrorAlertListProps> = ({
  errors,
  onRetry,
  onDismiss,
  className,
}) => {
  if (errors.length === 0) return null;

  return (
    <div className={cn('space-y-3', className)}>
      {errors.map(error => (
        <ErrorAlert
          key={error.id}
          type={error.type}
          title={error.title}
          message={error.message}
          retryable={error.retryable}
          onRetry={onRetry ? () => onRetry(error.id) : undefined}
          onDismiss={onDismiss ? () => onDismiss(error.id) : undefined}
        />
      ))}
    </div>
  );
};
