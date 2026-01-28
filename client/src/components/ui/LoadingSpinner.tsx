/**
 * LoadingSpinner Component
 * Spinner with gradient colors
 * Part of the Soft UI design system
 *
 * Requirements: 11.2
 */

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Color variant
   */
  variant?: 'primary' | 'success' | 'warning';
  /**
   * Optional label text
   */
  label?: string;
  /**
   * Additional className
   */
  className?: string;
}

const sizeStyles = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const variantStyles = {
  primary: 'text-blue-600',
  success: 'text-green-600',
  warning: 'text-orange-600',
};

export const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ size = 'md', variant = 'primary', label, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col items-center justify-center gap-3', className)}
        role="status"
        aria-label={label || 'Loading'}
      >
        {/* Spinner with gradient */}
        <div className="relative">
          <Loader2
            className={cn('animate-spin', sizeStyles[size], variantStyles[variant])}
            aria-hidden="true"
          />
          {/* Gradient glow effect */}
          <div
            className={cn(
              'absolute inset-0 blur-md opacity-50',
              'animate-spin',
              variantStyles[variant],
            )}
            aria-hidden="true"
          >
            <Loader2 className={cn(sizeStyles[size])} />
          </div>
        </div>

        {/* Optional label */}
        {label && <p className="text-sm font-medium text-gray-600">{label}</p>}

        <span className="sr-only">{label || 'Loading...'}</span>
      </div>
    );
  },
);

LoadingSpinner.displayName = 'LoadingSpinner';
