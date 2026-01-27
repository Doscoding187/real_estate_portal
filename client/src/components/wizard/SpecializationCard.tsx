/**
 * SpecializationCard Component
 * Interactive card for selecting development specializations
 * Part of the Soft UI design system
 *
 * Requirements: 7.1, 7.2, 7.3
 */

import * as React from 'react';
import { Check, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SpecializationCardProps {
  /**
   * Unique identifier for the specialization
   */
  id: string;
  /**
   * Display label for the specialization
   */
  label: string;
  /**
   * Description text
   */
  description?: string;
  /**
   * Icon component to display
   */
  icon: LucideIcon;
  /**
   * Whether the card is selected
   */
  selected?: boolean;
  /**
   * Callback when card is clicked
   */
  onSelect?: (id: string) => void;
  /**
   * Additional className
   */
  className?: string;
}

export const SpecializationCard = React.forwardRef<HTMLButtonElement, SpecializationCardProps>(
  ({ id, label, description, icon: Icon, selected = false, onSelect, className }, ref) => {
    const handleClick = () => {
      onSelect?.(id);
    };

    return (
      <button
        ref={ref}
        type="button"
        onClick={handleClick}
        className={cn(
          // Base styles
          'relative flex flex-col items-center gap-3 p-6 rounded-xl',
          'transition-all duration-300 ease-in-out',
          'outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2',
          // Unselected state - gradient border
          'border-2',
          !selected && [
            'border-gray-200 bg-white',
            'hover:border-blue-300 hover:shadow-md hover:scale-[1.02]',
            'active:scale-[0.98]',
          ],
          // Selected state - gradient fill
          selected && [
            'border-transparent bg-gradient-to-br from-blue-500 to-indigo-600',
            'text-white shadow-lg scale-[1.02]',
            'hover:shadow-xl hover:scale-[1.03]',
          ],
          className,
        )}
        aria-pressed={selected}
        aria-label={`${selected ? 'Deselect' : 'Select'} ${label} specialization`}
      >
        {/* Checkmark for selected state */}
        {selected && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-white/20 backdrop-blur-sm">
              <Check className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Icon */}
        <div
          className={cn(
            'flex items-center justify-center w-14 h-14 rounded-full',
            'transition-all duration-300',
            selected
              ? 'bg-white/20 backdrop-blur-sm'
              : 'bg-gradient-to-br from-blue-50 to-indigo-50',
          )}
        >
          <Icon
            className={cn(
              'w-7 h-7 transition-colors duration-300',
              selected ? 'text-white' : 'text-blue-600',
            )}
            aria-hidden="true"
          />
        </div>

        {/* Label */}
        <div className="text-center">
          <h3
            className={cn(
              'text-base font-semibold transition-colors duration-300',
              selected ? 'text-white' : 'text-gray-900',
            )}
          >
            {label}
          </h3>
          {description && (
            <p
              className={cn(
                'mt-1 text-sm transition-colors duration-300',
                selected ? 'text-white/90' : 'text-gray-600',
              )}
            >
              {description}
            </p>
          )}
        </div>
      </button>
    );
  },
);

SpecializationCard.displayName = 'SpecializationCard';
