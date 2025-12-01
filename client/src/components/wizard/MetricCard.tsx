/**
 * MetricCard Component (Wizard-specific)
 * Card for displaying portfolio metrics with gradient styling
 * Part of the Soft UI design system
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MetricCardProps {
  /**
   * Metric label
   */
  label: string;
  /**
   * Metric value
   */
  value: number;
  /**
   * Icon to display
   */
  icon: LucideIcon;
  /**
   * Color variant for the gradient
   */
  variant?: 'blue' | 'green' | 'purple' | 'orange';
  /**
   * Encouraging message for zero values
   */
  emptyMessage?: string;
  /**
   * Additional className
   */
  className?: string;
}

const variantStyles = {
  blue: {
    gradient: 'from-blue-500 to-indigo-600',
    border: 'border-blue-200 hover:border-blue-300',
    text: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  green: {
    gradient: 'from-green-500 to-emerald-600',
    border: 'border-green-200 hover:border-green-300',
    text: 'text-green-600',
    bg: 'bg-green-50',
  },
  purple: {
    gradient: 'from-purple-500 to-pink-600',
    border: 'border-purple-200 hover:border-purple-300',
    text: 'text-purple-600',
    bg: 'bg-purple-50',
  },
  orange: {
    gradient: 'from-orange-500 to-amber-600',
    border: 'border-orange-200 hover:border-orange-300',
    text: 'text-orange-600',
    bg: 'bg-orange-50',
  },
};

export const MetricCard = React.forwardRef<HTMLDivElement, MetricCardProps>(
  (
    {
      label,
      value,
      icon: Icon,
      variant = 'blue',
      emptyMessage = 'Start your journey',
      className,
    },
    ref
  ) => {
    const styles = variantStyles[variant];
    const isZero = value === 0;

    return (
      <div
        ref={ref}
        role="group"
        aria-label={`${label}: ${value} ${isZero ? `(${emptyMessage})` : ''}`}
        className={cn(
          'relative flex flex-col gap-4 p-6 rounded-xl',
          'bg-white border-2',
          'transition-all duration-300 ease-in-out',
          'hover:shadow-lg hover:-translate-y-1',
          styles.border,
          className
        )}
      >
        {/* Icon with gradient background */}
        <div className="flex items-center justify-between">
          <div
            className={cn(
              'flex items-center justify-center',
              'w-12 h-12 rounded-full',
              'bg-gradient-to-br',
              styles.gradient
            )}
          >
            <Icon className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
        </div>

        {/* Value with gradient text */}
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-600">{label}</p>
          <p
            className={cn(
              'text-4xl font-bold',
              'bg-gradient-to-r bg-clip-text text-transparent',
              styles.gradient
            )}
          >
            {value}
          </p>
          {isZero && emptyMessage && (
            <p className="text-xs text-gray-500 italic mt-1">{emptyMessage}</p>
          )}
        </div>

        {/* Decorative gradient accent */}
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-1 rounded-b-xl',
            'bg-gradient-to-r opacity-50',
            styles.gradient
          )}
          aria-hidden="true"
        />
      </div>
    );
  }
);

MetricCard.displayName = 'MetricCard';
