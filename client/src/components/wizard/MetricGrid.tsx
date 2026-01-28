/**
 * MetricGrid Component
 * Responsive grid layout for portfolio metrics
 * Part of the Soft UI design system
 *
 * Requirements: 6.1, 13.2
 */

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetricCard } from './MetricCard';

export interface Metric {
  id: string;
  label: string;
  value: number;
  icon: LucideIcon;
  variant?: 'blue' | 'green' | 'purple' | 'orange';
  emptyMessage?: string;
}

export interface MetricGridProps {
  /**
   * Array of metrics to display
   */
  metrics: Metric[];
  /**
   * Additional className for the grid container
   */
  className?: string;
}

export const MetricGrid = React.forwardRef<HTMLDivElement, MetricGridProps>(
  ({ metrics, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Responsive grid layout
          // 1 column on mobile, 2 columns on tablet/desktop
          'grid gap-4',
          'grid-cols-1 md:grid-cols-2',
          className,
        )}
        role="group"
        aria-label="Portfolio metrics"
      >
        {metrics.map((metric, index) => (
          <div
            key={metric.id}
            className="animate-in fade-in slide-in-from-bottom-4"
            style={{
              animationDelay: `${index * 75}ms`,
              animationDuration: '500ms',
              animationFillMode: 'backwards',
            }}
          >
            <MetricCard
              label={metric.label}
              value={metric.value}
              icon={metric.icon}
              variant={metric.variant}
              emptyMessage={metric.emptyMessage}
            />
          </div>
        ))}
      </div>
    );
  },
);

MetricGrid.displayName = 'MetricGrid';
