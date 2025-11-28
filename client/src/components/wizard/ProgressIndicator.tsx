/**
 * Enhanced Progress Indicator Component
 * 
 * Displays wizard progress with clickable steps, completion tracking, and tooltips
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface Step {
  /**
   * Step number (1-indexed)
   */
  number: number;
  
  /**
   * Step title/label
   */
  title: string;
  
  /**
   * Whether this step is completed
   */
  isComplete: boolean;
  
  /**
   * Whether this is the current step
   */
  isCurrent: boolean;
  
  /**
   * Whether this step can be clicked/accessed
   */
  isAccessible: boolean;
  
  /**
   * Whether this step has validation errors
   */
  hasError?: boolean;
  
  /**
   * Number of errors in this step
   */
  errorCount?: number;
}

export interface ProgressIndicatorProps {
  /**
   * Array of steps to display
   */
  steps: Step[];
  
  /**
   * Callback when a step is clicked
   */
  onStepClick?: (stepNumber: number) => void;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Compact mode (smaller size)
   */
  compact?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  onStepClick,
  className,
  compact = false,
}) => {
  const handleStepClick = (step: Step) => {
    if (step.isAccessible && onStepClick) {
      onStepClick(step.number);
    }
  };

  return (
    <TooltipProvider>
      <div className={cn('w-full', className)}>
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              {/* Step Circle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.button
                    onClick={() => handleStepClick(step)}
                    disabled={!step.isAccessible}
                    whileHover={step.isAccessible ? { scale: 1.1 } : {}}
                    whileTap={step.isAccessible ? { scale: 0.95 } : {}}
                    className={cn(
                      'flex flex-col items-center transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-lg p-1',
                      step.isAccessible ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
                    )}
                  >
                    {/* Circle */}
                    <motion.div
                      initial={false}
                      animate={{
                        scale: step.isCurrent ? 1 : 0.9,
                      }}
                      className={cn(
                        'flex items-center justify-center font-semibold text-sm rounded-full transition-all relative',
                        compact ? 'w-8 h-8' : 'w-10 h-10',
                        step.hasError && 'ring-2 ring-red-500',
                        step.isComplete && !step.hasError && 'bg-green-500 text-white shadow-md',
                        step.isComplete && step.hasError && 'bg-red-500 text-white shadow-md',
                        step.isCurrent && !step.isComplete && !step.hasError && 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-lg',
                        step.isCurrent && !step.isComplete && step.hasError && 'bg-red-600 text-white ring-4 ring-red-100 shadow-lg',
                        !step.isComplete && !step.isCurrent && !step.hasError && 'bg-gray-200 text-gray-500',
                        !step.isComplete && !step.isCurrent && step.hasError && 'bg-red-100 text-red-600 border-2 border-red-500'
                      )}
                    >
                      {step.isComplete ? (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                        >
                          <Check className={cn('stroke-[3]', compact ? 'w-4 h-4' : 'w-5 h-5')} />
                        </motion.div>
                      ) : (
                        step.number
                      )}
                      
                      {/* Error Badge */}
                      {step.hasError && step.errorCount && step.errorCount > 0 && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center shadow-md"
                        >
                          {step.errorCount}
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Step Title */}
                    <span
                      className={cn(
                        'text-center max-w-[80px] transition-all mt-2',
                        compact ? 'text-[10px]' : 'text-xs',
                        step.isCurrent && 'font-semibold text-gray-900',
                        !step.isCurrent && 'text-gray-500'
                      )}
                    >
                      {step.title}
                    </span>
                  </motion.button>
                </TooltipTrigger>
                
                {/* Tooltip */}
                <TooltipContent>
                  {step.hasError && step.errorCount && (
                    <p className="text-sm text-red-600 font-semibold mb-1">
                      {step.errorCount} validation error{step.errorCount > 1 ? 's' : ''}
                    </p>
                  )}
                  {!step.isAccessible && !step.isComplete && (
                    <p className="text-sm">Complete previous steps first</p>
                  )}
                  {step.isAccessible && !step.isCurrent && !step.hasError && (
                    <p className="text-sm">Click to go to {step.title}</p>
                  )}
                  {step.isAccessible && !step.isCurrent && step.hasError && (
                    <p className="text-sm">Click to fix errors in {step.title}</p>
                  )}
                  {step.isCurrent && !step.hasError && (
                    <p className="text-sm">Current step: {step.title}</p>
                  )}
                  {step.isCurrent && step.hasError && (
                    <p className="text-sm">Current step: {step.title} (has errors)</p>
                  )}
                  {step.isComplete && !step.hasError && (
                    <p className="text-sm">✓ {step.title} completed</p>
                  )}
                </TooltipContent>
              </Tooltip>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-2 relative">
                  <div className={cn(
                    'h-0.5 w-full transition-all duration-300',
                    step.isComplete ? 'bg-green-500' : 'bg-gray-200'
                  )} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

/**
 * Helper function to generate steps array from wizard state
 */
export const generateSteps = (
  stepTitles: string[],
  currentStep: number,
  completedSteps: number[],
  errorSteps?: number[]
): Step[] => {
  return stepTitles.map((title, index) => {
    const stepNumber = index + 1;
    const isComplete = completedSteps.includes(stepNumber) || stepNumber < currentStep;
    const isCurrent = stepNumber === currentStep;
    const isAccessible = isComplete || isCurrent || stepNumber === currentStep + 1;
    const hasError = errorSteps?.includes(stepNumber) || false;

    return {
      number: stepNumber,
      title,
      isComplete,
      isCurrent,
      isAccessible,
      hasError,
      errorCount: hasError ? 1 : 0, // Will be updated with actual count
    };
  });
};

/**
 * Helper function to update steps with error counts
 */
export const updateStepsWithErrors = (
  steps: Step[],
  errorsByStep: Map<number, number>
): Step[] => {
  return steps.map(step => ({
    ...step,
    hasError: errorsByStep.has(step.number),
    errorCount: errorsByStep.get(step.number) || 0,
  }));
};
