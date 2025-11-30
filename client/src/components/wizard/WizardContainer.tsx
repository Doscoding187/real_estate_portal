/**
 * WizardContainer Component
 * Main container for wizard with glass morphism and gradient background
 * Part of the Soft UI design system
 * 
 * Requirements: 1.4, 10.1, 10.2, 10.3, 10.4
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface WizardContainerProps {
  /**
   * Wizard content
   */
  children: React.ReactNode;
  /**
   * Additional className
   */
  className?: string;
}

export const WizardContainer = React.forwardRef<HTMLDivElement, WizardContainerProps>(
  ({ children, className }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          // Full viewport with gradient background
          'min-h-screen w-full',
          'bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30',
          'relative overflow-auto',
          className
        )}
      >
        {/* Decorative gradient orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-purple-400/20 to-pink-400/20 rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2" />
        </div>

        {/* Main content container with glass morphism */}
        <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
          <div
            className={cn(
              'max-w-4xl mx-auto',
              'bg-white/80 backdrop-blur-xl',
              'rounded-2xl shadow-2xl shadow-blue-500/10',
              'border border-white/50',
              'transition-all duration-500 ease-in-out'
            )}
          >
            {children}
          </div>
        </div>
      </div>
    );
  }
);

WizardContainer.displayName = 'WizardContainer';
