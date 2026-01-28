/**
 * GradientProgressIndicator Component
 * Visual progress tracker with gradient styling for multi-step wizards
 * Part of the Soft UI design system
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import * as React from 'react';
import { CheckIcon, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: number;
  title: string;
  icon: LucideIcon;
}

export interface GradientProgressIndicatorProps {
  /**
   * Array of steps to display
   */
  steps: Step[];
  /**
   * Current active step (1-indexed)
   */
  currentStep: number;
  /**
   * Array of completed step IDs
   */
  completedSteps?: number[];
  /**
   * Callback when a completed step is clicked
   */
  onStepClick?: (stepId: number) => void;
  /**
   * Container className
   */
  className?: string;
}

const GradientProgressIndicator: React.FC<GradientProgressIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps = [],
  onStepClick,
  className,
}) => {
  const isStepCompleted = (stepId: number) => completedSteps.includes(stepId);
  const isStepActive = (stepId: number) => stepId === currentStep;
  const isStepClickable = (stepId: number) => isStepCompleted(stepId) && onStepClick !== undefined;

  return (
    <div className={cn('w-full', className)}>
      {/* Desktop/Tablet View */}
      <div className="hidden sm:block">
        <div className="relative">
          {/* Progress Line Background */}
          <div className="absolute top-5 left-0 right-0 h-1 bg-gray-200 -z-10" />

          {/* Gradient Progress Line (for completed steps) */}
          <div
            className="absolute top-5 left-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-600 -z-10 transition-all duration-500 ease-in-out"
            style={{
              width: `${(completedSteps.length / (steps.length - 1)) * 100}%`,
            }}
          />

          {/* Steps */}
          <div className="flex justify-between items-start">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = isStepCompleted(step.id);
              const isActive = isStepActive(step.id);
              const isClickable = isStepClickable(step.id);

              return (
                <div
                  key={step.id}
                  className="flex flex-col items-center relative"
                  style={{ width: `${100 / steps.length}%` }}
                >
                  {/* Step Circle */}
                  <button
                    type="button"
                    onClick={() => isClickable && onStepClick?.(step.id)}
                    disabled={!isClickable}
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center',
                      'border-2 transition-all duration-300 ease-in-out',
                      'focus:outline-none focus:ring-4 focus:ring-blue-500/20',
                      // Active state - gradient fill
                      isActive && [
                        'bg-gradient-to-r from-blue-500 to-indigo-600',
                        'border-transparent text-white shadow-md',
                        'scale-110',
                      ],
                      // Completed state - green gradient
                      isCompleted &&
                        !isActive && [
                          'bg-gradient-to-r from-green-500 to-emerald-600',
                          'border-transparent text-white shadow-md',
                        ],
                      // Inactive state
                      !isActive && !isCompleted && ['bg-white border-gray-300 text-gray-400'],
                      // Hover effects for completed steps
                      isClickable && ['cursor-pointer', 'hover:scale-105 hover:shadow-lg'],
                      !isClickable && 'cursor-default',
                    )}
                    aria-label={`${step.title}${isCompleted ? ' (completed)' : isActive ? ' (current)' : ''}`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isCompleted && !isActive ? (
                      <CheckIcon className="w-5 h-5" strokeWidth={3} />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </button>

                  {/* Step Label */}
                  <span
                    className={cn(
                      'mt-2 text-xs font-medium text-center transition-colors duration-300',
                      'max-w-[80px] sm:max-w-none',
                      isActive && 'text-blue-600',
                      isCompleted && !isActive && 'text-green-600',
                      !isActive && !isCompleted && 'text-gray-500',
                    )}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile View - Compact */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {steps.map(step => {
              const isCompleted = isStepCompleted(step.id);
              const isActive = isStepActive(step.id);

              return (
                <div
                  key={step.id}
                  className={cn(
                    'h-2 rounded-full transition-all duration-300',
                    isActive && 'w-8 bg-gradient-to-r from-blue-500 to-indigo-600',
                    isCompleted &&
                      !isActive &&
                      'w-6 bg-gradient-to-r from-green-500 to-emerald-600',
                    !isActive && !isCompleted && 'w-6 bg-gray-300',
                  )}
                  aria-hidden="true"
                />
              );
            })}
          </div>
          <span className="text-sm font-medium text-gray-600">
            Step {currentStep} of {steps.length}
          </span>
        </div>

        {/* Current Step Info */}
        <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
          {steps.map(step => {
            if (step.id !== currentStep) return null;
            const Icon = step.icon;

            return (
              <div key={step.id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md">
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500">Current step</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

GradientProgressIndicator.displayName = 'GradientProgressIndicator';

export { GradientProgressIndicator };
