/**
 * WizardProgressIndicator Component
 *
 * Displays step progress for multi-step wizards with a progress bar and optional encouraging copy.
 * Responsive: compact single-line layout on mobile (< 640px).
 *
 * Requirements: 4.6, 13.1, 13.2, 13.3, 13.4, 14.6
 */

import React from 'react';

export type WizardProgressIndicatorProps = {
  currentStep: number; // 1-based
  totalSteps: number;
  encouragingCopy?: string;
};

export function WizardProgressIndicator({
  currentStep,
  totalSteps,
  encouragingCopy,
}: WizardProgressIndicatorProps) {
  const progressPercentage = (currentStep / totalSteps) * 100;

  return (
    <div className="w-full space-y-2">
      {/* Step label and progress bar - compact on mobile */}
      <div className="flex flex-col gap-2 sm:flex-col">
        <div className="flex items-center justify-between gap-4">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
            Step {currentStep} of {totalSteps}
          </span>
          <div
            role="progressbar"
            aria-valuenow={currentStep}
            aria-valuemin={1}
            aria-valuemax={totalSteps}
            aria-label={`Step ${currentStep} of ${totalSteps}`}
            className="flex-1 h-2 bg-muted rounded-full overflow-hidden"
          >
            <div
              className="h-full bg-primary transition-all duration-300 ease-in-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Optional encouraging copy */}
      {encouragingCopy && (
        <p className="text-sm text-muted-foreground">{encouragingCopy}</p>
      )}
    </div>
  );
}
