/**
 * GradientButton Component
 * Premium button with gradient backgrounds and smooth animations
 * Part of the Soft UI design system
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const gradientButtonVariants = cva(
  [
    // Base styles
    'inline-flex items-center justify-center gap-2',
    'whitespace-nowrap rounded-lg text-sm font-semibold',
    'transition-all duration-300 ease-in-out',
    'outline-none focus-visible:ring-4 focus-visible:ring-offset-2',
    // Disabled state
    'disabled:pointer-events-none disabled:opacity-60',
    // Icon sizing
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-gradient-to-r from-blue-500 to-indigo-600',
          'text-white shadow-md',
          'hover:shadow-lg hover:scale-[1.02]',
          'active:scale-[0.98] active:shadow-sm',
          'focus-visible:ring-blue-500/50',
          'disabled:from-blue-400 disabled:to-indigo-500',
        ],
        success: [
          'bg-gradient-to-r from-green-500 to-emerald-600',
          'text-white shadow-md',
          'hover:shadow-lg hover:scale-[1.02]',
          'active:scale-[0.98] active:shadow-sm',
          'focus-visible:ring-green-500/50',
          'disabled:from-green-400 disabled:to-emerald-500',
        ],
        warning: [
          'bg-gradient-to-r from-orange-500 to-red-600',
          'text-white shadow-md',
          'hover:shadow-lg hover:scale-[1.02]',
          'active:scale-[0.98] active:shadow-sm',
          'focus-visible:ring-orange-500/50',
          'disabled:from-orange-400 disabled:to-red-500',
        ],
        outline: [
          'border-2 border-gray-300 bg-white',
          'text-gray-700 shadow-sm',
          'hover:border-blue-500 hover:text-blue-600 hover:shadow-md',
          'active:scale-[0.98]',
          'focus-visible:ring-gray-300/50',
          'disabled:border-gray-200 disabled:text-gray-400',
        ],
      },
      size: {
        default: 'h-10 px-6 py-2.5',
        sm: 'h-8 px-4 py-2 text-xs',
        lg: 'h-12 px-8 py-3 text-base',
        icon: 'size-10',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof gradientButtonVariants> {
  /**
   * Show loading spinner
   */
  loading?: boolean;
  /**
   * Icon to display before text
   */
  icon?: LucideIcon;
  /**
   * Icon to display after text
   */
  iconRight?: LucideIcon;
}

const GradientButton = React.forwardRef<HTMLButtonElement, GradientButtonProps>(
  (
    {
      className,
      variant,
      size,
      loading = false,
      icon: Icon,
      iconRight: IconRight,
      children,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(gradientButtonVariants({ variant, size, className }))}
        disabled={isDisabled}
        {...props}
      >
        {/* Loading Spinner */}
        {loading && (
          <Loader2
            className="animate-spin"
            aria-label="Loading"
            aria-hidden="false"
          />
        )}

        {/* Left Icon */}
        {!loading && Icon && <Icon aria-hidden="true" />}

        {/* Button Text */}
        {children && <span>{children}</span>}

        {/* Right Icon */}
        {!loading && IconRight && <IconRight aria-hidden="true" />}
      </button>
    );
  }
);

GradientButton.displayName = 'GradientButton';

export { GradientButton, gradientButtonVariants };
