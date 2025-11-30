/**
 * NavigationButtons Component
 * Navigation controls for wizard with gradient buttons
 * Part of the Soft UI design system
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import * as React from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GradientButton } from '../ui/GradientButton';

export interface NavigationButtonsProps {
  /**
   * Whether to show the back button
   */
  showBack?: boolean;
  /**
   * Whether to show the next button
   */
  showNext?: boolean;
  /**
   * Whether this is the last step (shows submit instead of next)
   */
  isLastStep?: boolean;
  /**
   * Whether the next/submit button is disabled
   */
  nextDisabled?: boolean;
  /**
   * Whether the back button is disabled
   */
  backDisabled?: boolean;
  /**
   * Whether the form is submitting
   */
  loading?: boolean;
  /**
   * Callback when back is clicked
   */
  onBack?: () => void;
  /**
   * Callback when next is clicked
   */
  onNext?: () => void;
  /**
   * Custom label for next button
   */
  nextLabel?: string;
  /**
   * Custom label for back button
   */
  backLabel?: string;
  /**
   * Additional className
   */
  className?: string;
}

export const NavigationButtons = React.forwardRef<
  HTMLDivElement,
  NavigationButtonsProps
>(
  (
    {
      showBack = true,
      showNext = true,
      isLastStep = false,
      nextDisabled = false,
      backDisabled = false,
      loading = false,
      onBack,
      onNext,
      nextLabel,
      backLabel,
      className,
    },
    ref
  ) => {
    const getNextLabel = () => {
      if (nextLabel) return nextLabel;
      if (isLastStep) return 'Submit';
      return 'Next';
    };

    const getBackLabel = () => {
      if (backLabel) return backLabel;
      return 'Back';
    };

    return (
      <div
        ref={ref}
        className={cn(
          'flex items-center justify-between gap-4',
          'px-6 py-6 md:px-8',
          'border-t border-gray-200',
          'bg-gray-50/50',
          className
        )}
      >
        {/* Back Button */}
        {showBack ? (
          <GradientButton
            variant="outline"
            size="lg"
            onClick={onBack}
            disabled={backDisabled || loading}
            icon={ArrowLeft}
            className="min-w-[120px]"
          >
            {getBackLabel()}
          </GradientButton>
        ) : (
          <div />
        )}

        {/* Next/Submit Button */}
        {showNext && (
          <GradientButton
            variant={isLastStep ? 'success' : 'primary'}
            size="lg"
            onClick={onNext}
            disabled={nextDisabled}
            loading={loading}
            iconRight={isLastStep ? Check : ArrowRight}
            className="min-w-[120px]"
          >
            {getNextLabel()}
          </GradientButton>
        )}
      </div>
    );
  }
);

NavigationButtons.displayName = 'NavigationButtons';
