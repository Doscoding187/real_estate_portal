/**
 * SpecializationCardGrid Component
 * Responsive grid layout for specialization cards with multi-select logic
 * Part of the Soft UI design system
 *
 * Requirements: 7.1
 */

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpecializationCard } from './SpecializationCard';

export interface Specialization {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
}

export interface SpecializationCardGridProps {
  /**
   * Array of specialization options
   */
  specializations: Specialization[];
  /**
   * Array of selected specialization IDs
   */
  selectedIds?: string[];
  /**
   * Callback when selection changes
   */
  onSelectionChange?: (selectedIds: string[]) => void;
  /**
   * Maximum number of selections allowed (optional)
   */
  maxSelections?: number;
  /**
   * Minimum number of selections required (optional)
   */
  minSelections?: number;
  /**
   * Additional className for the grid container
   */
  className?: string;
}

export const SpecializationCardGrid = React.forwardRef<HTMLDivElement, SpecializationCardGridProps>(
  (
    {
      specializations,
      selectedIds = [],
      onSelectionChange,
      maxSelections,
      minSelections,
      className,
    },
    ref,
  ) => {
    const gridId = React.useId();
    const descriptionId = `${gridId}-description`;

    const handleSelect = (id: string) => {
      let newSelection: string[];

      if (selectedIds.includes(id)) {
        // Deselect - check minimum
        if (minSelections && selectedIds.length <= minSelections) {
          // Don't allow deselection if at minimum
          return;
        }
        newSelection = selectedIds.filter(selectedId => selectedId !== id);
      } else {
        // Select - check maximum
        if (maxSelections && selectedIds.length >= maxSelections) {
          // Don't allow selection if at maximum
          return;
        }
        newSelection = [...selectedIds, id];
      }

      onSelectionChange?.(newSelection);
    };

    const selectionInfo = React.useMemo(() => {
      const parts: string[] = [];
      if (minSelections) {
        parts.push(`Select at least ${minSelections}`);
      }
      if (maxSelections) {
        parts.push(`up to ${maxSelections} specializations`);
      } else if (!minSelections) {
        parts.push('Select one or more specializations');
      }
      parts.push(`${selectedIds.length} selected`);
      return parts.join('. ');
    }, [minSelections, maxSelections, selectedIds.length]);

    return (
      <>
        {/* Hidden description for screen readers */}
        <div id={descriptionId} className="sr-only">
          {selectionInfo}
        </div>

        <div
          ref={ref}
          className={cn(
            // Responsive grid layout
            'grid gap-4',
            'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
            className,
          )}
          role="group"
          aria-label="Development specializations"
          aria-describedby={descriptionId}
        >
          {specializations.map((specialization, index) => (
            <div
              key={specialization.id}
              className="animate-in fade-in slide-in-from-bottom-4"
              style={{
                animationDelay: `${index * 50}ms`,
                animationDuration: '400ms',
                animationFillMode: 'backwards',
              }}
            >
              <SpecializationCard
                id={specialization.id}
                label={specialization.label}
                description={specialization.description}
                icon={specialization.icon}
                selected={selectedIds.includes(specialization.id)}
                onSelect={handleSelect}
              />
            </div>
          ))}
        </div>
      </>
    );
  },
);

SpecializationCardGrid.displayName = 'SpecializationCardGrid';
