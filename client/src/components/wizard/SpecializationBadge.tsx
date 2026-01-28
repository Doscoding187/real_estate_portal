/**
 * SpecializationBadge Component
 * Gradient badge for displaying selected specializations with remove functionality
 * Part of the Soft UI design system
 *
 * Requirements: 7.4, 7.5
 */

import * as React from 'react';
import { X, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpecializationBadgeProps {
  /**
   * Unique identifier for the specialization
   */
  id: string;
  /**
   * Display label for the specialization
   */
  label: string;
  /**
   * Optional icon to display
   */
  icon?: LucideIcon;
  /**
   * Callback when remove button is clicked
   */
  onRemove?: (id: string) => void;
  /**
   * Gradient variant
   */
  variant?: 'primary' | 'success' | 'warning' | 'purple';
  /**
   * Additional className
   */
  className?: string;
}

const variantStyles = {
  primary: 'bg-gradient-to-r from-blue-500 to-indigo-600',
  success: 'bg-gradient-to-r from-green-500 to-emerald-600',
  warning: 'bg-gradient-to-r from-orange-500 to-amber-600',
  purple: 'bg-gradient-to-r from-purple-500 to-pink-600',
};

export const SpecializationBadge = React.forwardRef<HTMLDivElement, SpecializationBadgeProps>(
  ({ id, label, icon: Icon, onRemove, variant = 'primary', className }, ref) => {
    const [isRemoving, setIsRemoving] = React.useState(false);

    const handleRemove = () => {
      setIsRemoving(true);
      // Wait for fade-out animation before calling onRemove
      setTimeout(() => {
        onRemove?.(id);
      }, 200);
    };

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
          'text-white text-sm font-medium shadow-md',
          'transition-all duration-200 ease-in-out',
          variantStyles[variant],
          isRemoving && 'opacity-0 scale-90',
          !isRemoving && 'animate-in fade-in zoom-in-95',
          className,
        )}
        role="status"
        aria-label={`${label} specialization selected`}
      >
        {/* Icon */}
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />}

        {/* Label */}
        <span className="flex-1">{label}</span>

        {/* Remove button */}
        {onRemove && (
          <button
            type="button"
            onClick={handleRemove}
            className={cn(
              'flex items-center justify-center',
              'w-5 h-5 rounded-full',
              'bg-white/20 hover:bg-white/30',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-white/50',
              'group',
            )}
            aria-label={`Remove ${label} specialization`}
          >
            <X
              className={cn(
                'w-3 h-3 text-white',
                'transition-transform duration-200',
                'group-hover:scale-110',
              )}
              aria-hidden="true"
            />
          </button>
        )}
      </div>
    );
  },
);

SpecializationBadge.displayName = 'SpecializationBadge';
