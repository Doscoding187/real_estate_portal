/**
 * WizardHeader Component
 * Header with gradient title and step counter
 * Part of the Soft UI design system
 * 
 * Requirements: 1.1
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface WizardHeaderProps {
  /**
   * Main title
   */
  title: string;
  /**
   * Subtitle/description
   */
  subtitle?: string;
  /**
   * Current step number
   */
  currentStep?: number;
  /**
   * Total number of steps
   */
  totalSteps?: number;
  /**
   * Save status indicator
   */
  saveStatus?: 'saved' | 'saving' | 'unsaved';
  /**
   * Additional className
   */
  className?: string;
}

export const WizardHeader = React.forwardRef<HTMLDivElement, WizardHeaderProps>(
  (
    {
      title,
      subtitle,
      currentStep,
      totalSteps,
      saveStatus,
      className,
    },
    ref
  ) => {
    const getSaveStatusText = () => {
      switch (saveStatus) {
        case 'saved':
          return 'All changes saved';
        case 'saving':
          return 'Saving...';
        case 'unsaved':
          return 'Unsaved changes';
        default:
          return null;
      }
    };

    const getSaveStatusColor = () => {
      switch (saveStatus) {
        case 'saved':
          return 'text-green-600';
        case 'saving':
          return 'text-blue-600';
        case 'unsaved':
          return 'text-orange-600';
        default:
          return '';
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-8 md:px-8 md:py-10',
          'border-b border-gray-200',
          className
        )}
      >
        <div className="flex items-start justify-between gap-4">
          {/* Title and subtitle */}
          <div className="flex-1">
            <h1
              className={cn(
                'text-3xl md:text-4xl font-bold',
                'bg-gradient-to-r from-blue-600 to-indigo-600',
                'bg-clip-text text-transparent',
                'mb-2'
              )}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-600 text-base md:text-lg">
                {subtitle}
              </p>
            )}
          </div>

          {/* Step counter and save status */}
          <div className="flex flex-col items-end gap-2">
            {currentStep !== undefined && totalSteps !== undefined && (
              <div
                className={cn(
                  'px-4 py-2 rounded-full',
                  'bg-gradient-to-r from-blue-50 to-indigo-50',
                  'border border-blue-200'
                )}
              >
                <span
                  className={cn(
                    'text-sm font-semibold',
                    'bg-gradient-to-r from-blue-600 to-indigo-600',
                    'bg-clip-text text-transparent'
                  )}
                >
                  Step {currentStep} of {totalSteps}
                </span>
              </div>
            )}

            {saveStatus && (
              <div className="flex items-center gap-2">
                {saveStatus === 'saving' && (
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                )}
                <span className={cn('text-xs font-medium', getSaveStatusColor())}>
                  {getSaveStatusText()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

WizardHeader.displayName = 'WizardHeader';
