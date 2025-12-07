/**
 * IconButton Component
 * 
 * A modern icon button with multiple variants and smooth animations.
 * Supports default, glass, and accent styles.
 * 
 * Features:
 * - Accessible with proper ARIA labels
 * - Smooth hover and press animations
 * - Multiple size options
 * - Keyboard navigation support
 */

import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { designTokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface IconButtonProps {
  icon: LucideIcon;
  onClick: () => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'glass' | 'accent';
  className?: string;
  disabled?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
} as const;

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
} as const;

const variantClasses = {
  default: 'modern-btn bg-white text-gray-700 hover:bg-gray-50',
  glass: 'glass-overlay text-white hover:bg-white/90',
  accent: 'accent-btn text-white',
} as const;

export function IconButton({ 
  icon: Icon, 
  onClick, 
  label, 
  size = 'md',
  variant = 'default',
  className = '',
  disabled = false,
}: IconButtonProps) {
  return (
    <motion.button
      className={cn(
        sizeClasses[size],
        variantClasses[variant],
        'flex items-center justify-center rounded-xl',
        'transition-all duration-150 ease-out',
        'focus:outline-none focus:ring-2 focus:ring-offset-2',
        variant === 'accent' ? 'focus:ring-indigo-500' : 'focus:ring-gray-300',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      onClick={onClick}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      aria-label={label}
      disabled={disabled}
      type="button"
    >
      <Icon className={iconSizes[size]} />
    </motion.button>
  );
}
