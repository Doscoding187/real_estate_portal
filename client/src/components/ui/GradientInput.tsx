/**
 * GradientInput Component
 * Enhanced input field with gradient focus states and error handling
 * Part of the Soft UI design system
 * 
 * Requirements: 3.1, 3.2, 3.3
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface GradientInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Label text for the input
   */
  label?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Whether the field is required
   */
  required?: boolean;
  /**
   * Helper text to display below the input
   */
  helperText?: string;
  /**
   * Container className
   */
  containerClassName?: string;
}

const GradientInput = React.forwardRef<HTMLInputElement, GradientInputProps>(
  (
    {
      className,
      label,
      error,
      required,
      helperText,
      containerClassName,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${React.useId()}`;
    const hasError = !!error;

    return (
      <div className={cn('space-y-2', containerClassName)}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700"
          >
            {label}
            {required && (
              <span
                className="ml-1 bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent font-semibold"
                aria-label="required"
              >
                *
              </span>
            )}
          </label>
        )}

        {/* Input */}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base styles
              'w-full px-4 py-2.5 rounded-lg',
              'text-sm text-gray-900 placeholder:text-gray-400',
              'border-2 bg-white',
              'transition-all duration-300 ease-in-out',
              'outline-none',
              // Default state
              'border-gray-300',
              // Focus state with gradient border
              'focus:border-transparent',
              'focus:ring-4 focus:ring-blue-500/20',
              'focus:shadow-[0_0_0_2px_transparent,0_0_0_4px_rgb(59_130_246_/_0.5)]',
              // Error state with soft red gradient
              hasError && [
                'border-red-300',
                'focus:ring-red-500/20',
                'focus:shadow-[0_0_0_2px_transparent,0_0_0_4px_rgb(239_68_68_/_0.5)]',
                'animate-shake',
              ],
              // Disabled state
              'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60',
              className
            )}
            aria-invalid={hasError}
            aria-describedby={
              error
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />

          {/* Gradient border effect on focus (visual only) */}
          <div
            className={cn(
              'absolute inset-0 rounded-lg pointer-events-none',
              'bg-gradient-to-r from-blue-500 to-indigo-600',
              'opacity-0 transition-opacity duration-300',
              '-z-10',
              // Show on focus (handled by peer selector in parent)
            )}
            aria-hidden="true"
          />
        </div>

        {/* Error Message */}
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent font-medium animate-in fade-in slide-in-from-top-1 duration-200"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper Text */}
        {!error && helperText && (
          <p
            id={`${inputId}-helper`}
            className="text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

GradientInput.displayName = 'GradientInput';

export { GradientInput };
