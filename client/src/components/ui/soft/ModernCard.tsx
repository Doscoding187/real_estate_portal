/**
 * ModernCard Component
 * 
 * A versatile card component with modern design and subtle shadows.
 * Supports multiple variants: default, glass, and elevated.
 * 
 * Features:
 * - Smooth hover animations
 * - Press state feedback
 * - Accessible click handling
 * - Customizable variants
 */

import { motion, HTMLMotionProps } from 'framer-motion';
import { designTokens } from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

interface ModernCardProps extends Omit<HTMLMotionProps<'div'>, 'onClick'> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  variant?: 'default' | 'glass' | 'elevated';
  as?: 'div' | 'article' | 'section';
}

const variantStyles = {
  default: 'bg-white rounded-lg shadow-md hover:shadow-hover',
  glass: 'glass-overlay rounded-lg',
  elevated: 'bg-white rounded-lg shadow-xl hover:shadow-2xl',
} as const;

export function ModernCard({ 
  children, 
  className = '', 
  onClick, 
  hoverable = true,
  variant = 'default',
  as = 'div',
  ...props
}: ModernCardProps) {
  const Component = motion[as];
  const isInteractive = !!onClick;

  return (
    <Component
      className={cn(
        variantStyles[variant],
        'transition-all duration-300 ease-out',
        isInteractive && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      whileHover={hoverable && isInteractive ? { 
        y: -2, 
        scale: 1.01,
        transition: { duration: 0.2, ease: 'easeOut' }
      } : undefined}
      whileTap={isInteractive ? { 
        scale: 0.98,
        transition: { duration: 0.15, ease: 'easeOut' }
      } : undefined}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      {...props}
    >
      {children}
    </Component>
  );
}
