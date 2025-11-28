/**
 * Save Status Indicator Component
 * 
 * Displays the current save status with icon and timestamp
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, AlertCircle, Cloud } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export interface SaveStatusIndicatorProps {
  /**
   * Timestamp of last successful save
   */
  lastSaved: Date | null;
  
  /**
   * Whether a save is currently in progress
   */
  isSaving: boolean;
  
  /**
   * Error that occurred during save
   */
  error?: Error | null;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Show full text or compact version
   * @default 'full'
   */
  variant?: 'full' | 'compact';
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  lastSaved,
  isSaving,
  error,
  className,
  variant = 'full',
}) => {
  // Determine status
  const getStatus = () => {
    if (error) return 'error';
    if (isSaving) return 'saving';
    if (lastSaved) return 'saved';
    return 'idle';
  };

  const status = getStatus();

  // Status configurations
  const statusConfig = {
    idle: {
      icon: Cloud,
      text: 'Not saved',
      color: 'text-gray-400',
      bgColor: 'bg-gray-50',
    },
    saving: {
      icon: Loader2,
      text: 'Saving...',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    saved: {
      icon: Check,
      text: lastSaved
        ? `Saved ${formatDistanceToNow(lastSaved, { addSuffix: true })}`
        : 'Saved',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    error: {
      icon: AlertCircle,
      text: 'Save failed',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
          config.color,
          config.bgColor,
          className
        )}
      >
        <Icon
          className={cn('w-3 h-3', status === 'saving' && 'animate-spin')}
        />
        {status === 'saved' && lastSaved && (
          <span className="hidden sm:inline">
            {formatDistanceToNow(lastSaved, { addSuffix: true })}
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={status}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium',
          config.color,
          config.bgColor,
          className
        )}
      >
        <Icon
          className={cn('w-4 h-4', status === 'saving' && 'animate-spin')}
        />
        <span>{config.text}</span>
        
        {error && (
          <span className="text-xs text-red-500 ml-1">
            ({error.message})
          </span>
        )}
      </motion.div>
    </AnimatePresence>
  );
};
