/**
 * useWizardAccessibility Hook
 * Manages accessibility features for wizard components
 * 
 * Requirements: 12.1
 */

import { useEffect, useRef } from 'react';
import { focusFirstElement, announceToScreenReader } from '@/lib/accessibility/focusManagement';

export interface UseWizardAccessibilityOptions {
  /**
   * Current step number
   */
  currentStep: number;
  /**
   * Total number of steps
   */
  totalSteps: number;
  /**
   * Step title for announcements
   */
  stepTitle?: string;
  /**
   * Whether to auto-focus first element on step change
   */
  autoFocus?: boolean;
}

export function useWizardAccessibility({
  currentStep,
  totalSteps,
  stepTitle,
  autoFocus = true,
}: UseWizardAccessibilityOptions) {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousStepRef = useRef<number>(currentStep);

  // Announce step changes to screen readers
  useEffect(() => {
    if (previousStepRef.current !== currentStep) {
      const message = stepTitle
        ? `Step ${currentStep} of ${totalSteps}: ${stepTitle}`
        : `Step ${currentStep} of ${totalSteps}`;
      
      announceToScreenReader(message, 'polite');
      previousStepRef.current = currentStep;
    }
  }, [currentStep, totalSteps, stepTitle]);

  // Focus first element when step changes
  useEffect(() => {
    if (autoFocus && containerRef.current) {
      focusFirstElement(containerRef.current);
    }
  }, [currentStep, autoFocus]);

  // Announce validation errors
  const announceError = (errorMessage: string) => {
    announceToScreenReader(`Error: ${errorMessage}`, 'assertive');
  };

  // Announce success messages
  const announceSuccess = (successMessage: string) => {
    announceToScreenReader(successMessage, 'polite');
  };

  return {
    containerRef,
    announceError,
    announceSuccess,
  };
}
