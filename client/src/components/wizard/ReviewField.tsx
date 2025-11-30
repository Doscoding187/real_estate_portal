/**
 * ReviewField Component
 * Display field with label and value for review sections
 * Part of the Soft UI design system
 * 
 * Requirements: 9.1, 9.2
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { SpecializationBadge } from './SpecializationBadge';
import { LucideIcon } from 'lucide-react';

export type ReviewFieldType = 'text' | 'badge' | 'metric' | 'list';

export interface ReviewFieldProps {
  /**
   * Field label
   */
  label: string;
  /**
   * Field value
   */
  value: string | number | string[] | null | undefined;
  /**
   * Field type for different rendering
   */
  type?: ReviewFieldType;
  /**
   * Icon for badge type
   */
  icon?: LucideIcon;
  /**
   * Additional className
   */
  className?: string;
}

export const ReviewField = React.forwardRef<HTMLDivElement, ReviewFieldProps>(
  ({ label, value, type = 'text', icon, className }, ref) => {
    const renderValue = () => {
      // Handle empty values
      if (value === null || value === undefined || value === '') {
        return <span className="text-gray-400 italic">Not provided</span>;
      }

      switch (type) {
        case 'badge':
          // Render as badges (for arrays)
          if (Array.isArray(value)) {
            return (
              <div className="flex flex-wrap gap-2">
                {value.map((item, index) => (
                  <SpecializationBadge
                    key={index}
                    id={item}
                    label={item}
                    icon={icon}
                    variant="primary"
                  />
                ))}
              </div>
            );
          }
          return (
            <SpecializationBadge
              id={String(value)}
              label={String(value)}
              icon={icon}
              variant="primary"
            />
          );

        case 'metric':
          // Render as metric with gradient
          return (
            <span
              className={cn(
                'text-2xl font-bold',
                'bg-gradient-to-r from-blue-600 to-indigo-600',
                'bg-clip-text text-transparent'
              )}
            >
              {value}
            </span>
          );

        case 'list':
          // Render as bullet list
          if (Array.isArray(value)) {
            return (
              <ul className="list-disc list-inside space-y-1 text-gray-700">
                {value.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            );
          }
          return <span className="text-gray-700">{String(value)}</span>;

        case 'text':
        default:
          // Render as plain text
          return <span className="text-gray-700">{String(value)}</span>;
      }
    };

    return (
      <div ref={ref} className={cn('space-y-1', className)}>
        {/* Label with gradient */}
        <dt
          className={cn(
            'text-sm font-medium',
            'bg-gradient-to-r from-gray-600 to-gray-700',
            'bg-clip-text text-transparent'
          )}
        >
          {label}
        </dt>

        {/* Value */}
        <dd className="text-base">{renderValue()}</dd>
      </div>
    );
  }
);

ReviewField.displayName = 'ReviewField';
