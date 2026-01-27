/**
 * MicroPill Component
 *
 * A small pill/chip component for categories, tags, and filters.
 * Inspired by Airbnb's filter chips and Instagram's category pills.
 *
 * Features:
 * - Selected and unselected states
 * - Smooth selection animations
 * - Optional icon support
 * - Keyboard accessible
 */

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface MicroPillProps {
  label: string;
  selected?: boolean;
  onClick?: () => void;
  icon?: LucideIcon;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'accent';
  className?: string;
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
} as const;

const iconSizes = {
  sm: 'w-3 h-3',
  md: 'w-4 h-4',
  lg: 'w-5 h-5',
} as const;

export function MicroPill({
  label,
  selected = false,
  onClick,
  icon: Icon,
  size = 'md',
  variant = 'default',
  className = '',
  disabled = false,
}: MicroPillProps) {
  const isInteractive = !!onClick && !disabled;

  const getVariantClasses = () => {
    if (variant === 'accent') {
      return selected
        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-accent'
        : 'bg-white text-gray-700 border border-gray-200 hover:border-indigo-300';
    }

    return selected
      ? 'bg-gray-900 text-white shadow-md'
      : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-300';
  };

  return (
    <motion.button
      className={cn(
        sizeClasses[size],
        getVariantClasses(),
        'rounded-full font-medium',
        'transition-all duration-200 ease-out',
        'flex items-center gap-1.5',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        selected ? 'focus:ring-gray-900' : 'focus:ring-gray-300',
        isInteractive && 'cursor-pointer',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
      onClick={isInteractive ? onClick : undefined}
      whileHover={isInteractive ? { scale: 1.05 } : undefined}
      whileTap={isInteractive ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      disabled={disabled}
      type="button"
      role={isInteractive ? 'button' : undefined}
      aria-pressed={isInteractive ? selected : undefined}
    >
      {Icon && <Icon className={iconSizes[size]} />}
      <span>{label}</span>
    </motion.button>
  );
}
