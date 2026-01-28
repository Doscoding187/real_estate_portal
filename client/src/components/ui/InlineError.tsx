/**
 * InlineError Component
 *
 * Displays inline validation error messages with smooth animations
 * Used throughout forms to provide immediate feedback
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InlineErrorProps {
  /**
   * Error message to display
   */
  error?: string;

  /**
   * Whether to show the error
   */
  show: boolean;

  /**
   * Additional CSS classes
   */
  className?: string;

  /**
   * Icon to display (defaults to AlertCircle)
   */
  icon?: React.ReactNode;

  /**
   * Size variant
   */
  size?: 'sm' | 'md' | 'lg';
}

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
};

/**
 * InlineError component with Framer Motion animations
 */
export const InlineError: React.FC<InlineErrorProps> = ({
  error,
  show,
  className,
  icon,
  size = 'md',
}) => {
  return (
    <AnimatePresence mode="wait">
      {show && error && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginTop: 0 }}
          animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
          exit={{ opacity: 0, height: 0, marginTop: 0 }}
          transition={{
            duration: 0.2,
            ease: 'easeInOut',
          }}
          className={cn(
            'text-red-600 flex items-start gap-1.5 overflow-hidden',
            sizeClasses[size],
            className,
          )}
          role="alert"
          aria-live="polite"
        >
          <span className={cn('flex-shrink-0 mt-0.5', iconSizes[size])}>
            {icon || <AlertCircle className={iconSizes[size]} />}
          </span>
          <span className="flex-1">{error}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/**
 * InlineError with custom styling for different contexts
 */
export const InlineErrorVariants = {
  /**
   * Default error style (red)
   */
  error: (props: Omit<InlineErrorProps, 'className'>) => (
    <InlineError {...props} className="text-red-600" />
  ),

  /**
   * Warning style (yellow/orange)
   */
  warning: (props: Omit<InlineErrorProps, 'className'>) => (
    <InlineError {...props} className="text-yellow-600" />
  ),

  /**
   * Info style (blue)
   */
  info: (props: Omit<InlineErrorProps, 'className'>) => (
    <InlineError {...props} className="text-blue-600" />
  ),

  /**
   * Success style (green)
   */
  success: (props: Omit<InlineErrorProps, 'className'>) => (
    <InlineError {...props} className="text-green-600" />
  ),
};

export default InlineError;
