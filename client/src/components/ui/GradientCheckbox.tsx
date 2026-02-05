/**
 * GradientCheckbox Component
 * Enhanced checkbox with gradient fill when checked
 * Part of the Soft UI design system
 *
 * Requirements: 3.5, 9.3
 */

import * as React from 'react';
import * as CheckboxPrimitive from '@radix-ui/react-checkbox';
import { CheckIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface GradientCheckboxProps extends React.ComponentPropsWithoutRef<
  typeof CheckboxPrimitive.Root
> {
  /**
   * Label text for the checkbox
   */
  label?: string;
  /**
   * Description text below the label
   */
  description?: string;
  /**
   * Error message to display
   */
  error?: string;
  /**
   * Container className
   */
  containerClassName?: string;
}

const GradientCheckbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  GradientCheckboxProps
>(({ className, label, description, error, containerClassName, id, ...props }, ref) => {
  const checkboxId = id || `checkbox-${React.useId()}`;
  const hasError = !!error;

  return (
    <div className={cn('space-y-2', containerClassName)}>
      <div className="flex items-start space-x-3">
        {/* Checkbox */}
        <CheckboxPrimitive.Root
          ref={ref}
          id={checkboxId}
          className={cn(
            // Base styles
            'peer h-5 w-5 shrink-0 rounded-md border-2',
            'transition-all duration-300 ease-in-out',
            'outline-none cursor-pointer',
            // Default state
            'border-gray-300 bg-white',
            // Focus state
            'focus-visible:ring-4 focus-visible:ring-blue-500/20',
            'focus-visible:border-blue-500',
            // Checked state with gradient
            'data-[state=checked]:border-transparent',
            'data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-indigo-600',
            'data-[state=checked]:shadow-md',
            // Hover state
            'hover:border-blue-400',
            'data-[state=checked]:hover:shadow-lg data-[state=checked]:hover:scale-105',
            // Error state
            hasError && [
              'border-red-300',
              'focus-visible:ring-red-500/20',
              'focus-visible:border-red-500',
            ],
            // Disabled state
            'disabled:cursor-not-allowed disabled:opacity-50',
            'disabled:hover:border-gray-300 disabled:hover:scale-100',
            className,
          )}
          aria-invalid={hasError}
          aria-describedby={
            error ? `${checkboxId}-error` : description ? `${checkboxId}-description` : undefined
          }
          {...props}
        >
          <CheckboxPrimitive.Indicator
            className={cn(
              'flex items-center justify-center text-white',
              'animate-in zoom-in-50 duration-200',
            )}
          >
            <CheckIcon className="h-4 w-4" strokeWidth={3} />
          </CheckboxPrimitive.Indicator>
        </CheckboxPrimitive.Root>

        {/* Label and Description */}
        {(label || description) && (
          <div className="flex-1 space-y-1">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'text-sm font-medium leading-none cursor-pointer',
                  'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                  hasError ? 'text-red-600' : 'text-gray-900',
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                id={`${checkboxId}-description`}
                className={cn('text-sm leading-snug', hasError ? 'text-red-500' : 'text-gray-500')}
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p
          id={`${checkboxId}-error`}
          className="text-sm bg-gradient-to-r from-red-500 to-red-600 bg-clip-text text-transparent font-medium animate-in fade-in slide-in-from-top-1 duration-200 ml-8"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
});

GradientCheckbox.displayName = 'GradientCheckbox';

export { GradientCheckbox };
