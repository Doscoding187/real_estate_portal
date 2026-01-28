/**
 * ReviewSection Component
 * Collapsible section for displaying review information with gradient accents
 * Part of the Soft UI design system
 *
 * Requirements: 9.1, 9.2, 9.4
 */

import * as React from 'react';
import { ChevronDown, Edit2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReviewSectionProps {
  /**
   * Section title
   */
  title: string;
  /**
   * Section content
   */
  children: React.ReactNode;
  /**
   * Whether the section is collapsible
   */
  collapsible?: boolean;
  /**
   * Initial collapsed state
   */
  defaultCollapsed?: boolean;
  /**
   * Callback when edit button is clicked
   */
  onEdit?: () => void;
  /**
   * Additional className
   */
  className?: string;
}

export const ReviewSection = React.forwardRef<HTMLDivElement, ReviewSectionProps>(
  ({ title, children, collapsible = true, defaultCollapsed = false, onEdit, className }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

    const toggleCollapse = () => {
      if (collapsible) {
        setIsCollapsed(!isCollapsed);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border-2 border-gray-200',
          'bg-white overflow-hidden',
          'transition-all duration-300',
          className,
        )}
      >
        {/* Section Header */}
        <div
          className={cn(
            'flex items-center justify-between p-4',
            'border-b-2 border-transparent',
            'bg-gradient-to-r from-blue-50/50 to-indigo-50/50',
            'transition-all duration-300',
            'group',
          )}
        >
          <button
            type="button"
            onClick={toggleCollapse}
            className={cn(
              'flex items-center gap-3 flex-1',
              'text-left outline-none',
              collapsible && 'cursor-pointer',
            )}
            disabled={!collapsible}
          >
            <h3
              className={cn(
                'text-lg font-semibold',
                'bg-gradient-to-r from-blue-600 to-indigo-600',
                'bg-clip-text text-transparent',
              )}
            >
              {title}
            </h3>
            {collapsible && (
              <ChevronDown
                className={cn(
                  'w-5 h-5 text-gray-400',
                  'transition-transform duration-300',
                  isCollapsed ? '-rotate-90' : 'rotate-0',
                )}
                aria-hidden="true"
              />
            )}
          </button>

          {/* Edit Button */}
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                'text-sm font-medium text-gray-600',
                'border border-gray-200',
                'opacity-0 group-hover:opacity-100',
                'hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50',
                'transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-blue-500/50',
              )}
              aria-label={`Edit ${title}`}
            >
              <Edit2 className="w-4 h-4" aria-hidden="true" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Section Content */}
        <div
          className={cn(
            'transition-all duration-300 ease-in-out',
            isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100',
          )}
        >
          <div className="p-6 space-y-4">{children}</div>
        </div>

        {/* Gradient Accent Border */}
        <div
          className={cn(
            'h-1 bg-gradient-to-r from-blue-500 to-indigo-600',
            'transition-opacity duration-300',
            isCollapsed ? 'opacity-0' : 'opacity-100',
          )}
          aria-hidden="true"
        />
      </div>
    );
  },
);

ReviewSection.displayName = 'ReviewSection';
