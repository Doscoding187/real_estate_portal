/**
 * SkipLink Component
 * Allows keyboard users to skip to main content
 * Part of accessibility enhancements
 *
 * Requirements: 12.1
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SkipLinkProps {
  /**
   * Target element ID to skip to
   */
  targetId: string;
  /**
   * Link text
   */
  children: React.ReactNode;
  /**
   * Additional className
   */
  className?: string;
}

const SkipLink: React.FC<SkipLinkProps> = ({ targetId, children, className }) => {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        // Position off-screen by default
        'sr-only',
        // Show on focus with gradient styling
        'focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50',
        'focus:inline-block focus:px-6 focus:py-3',
        'focus:bg-gradient-to-r focus:from-blue-500 focus:to-indigo-600',
        'focus:text-white focus:font-semibold focus:rounded-lg',
        'focus:shadow-lg focus:outline-none',
        'focus:ring-4 focus:ring-blue-500/50 focus:ring-offset-2',
        'transition-all duration-200',
        className,
      )}
    >
      {children}
    </a>
  );
};

SkipLink.displayName = 'SkipLink';

export { SkipLink };
