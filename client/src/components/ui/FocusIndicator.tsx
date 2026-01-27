/**
 * Focus Indicator Components
 *
 * Provides visible focus indicators for keyboard navigation
 * that meet WCAG 2.1 AA requirements.
 */

import React from 'react';

interface FocusRingProps {
  children: React.ReactNode;
  className?: string;
  offset?: 'none' | 'small' | 'medium' | 'large';
  color?: 'blue' | 'white' | 'black';
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full';
}

/**
 * Wrapper component that adds a visible focus ring
 */
export function FocusRing({
  children,
  className = '',
  offset = 'small',
  color = 'blue',
  rounded = 'md',
}: FocusRingProps) {
  const offsetClasses = {
    none: 'focus-within:ring-offset-0',
    small: 'focus-within:ring-offset-1',
    medium: 'focus-within:ring-offset-2',
    large: 'focus-within:ring-offset-4',
  };

  const colorClasses = {
    blue: 'focus-within:ring-blue-500',
    white: 'focus-within:ring-white',
    black: 'focus-within:ring-black',
  };

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
  };

  return (
    <div
      className={`
        focus-within:ring-2 
        ${offsetClasses[offset]} 
        ${colorClasses[color]} 
        ${roundedClasses[rounded]}
        ${className}
      `}
    >
      {children}
    </div>
  );
}

/**
 * CSS classes for focus styles - use these directly on elements
 */
export const focusStyles = {
  // Standard focus ring
  ring: 'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',

  // Focus ring for dark backgrounds
  ringLight:
    'focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-900',

  // Focus ring without offset
  ringNoOffset: 'focus:outline-none focus:ring-2 focus:ring-blue-500',

  // Focus visible only (keyboard focus)
  visible:
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',

  // Focus visible for dark backgrounds
  visibleLight:
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900',

  // Underline focus style (for links)
  underline: 'focus:outline-none focus:underline focus:decoration-2 focus:underline-offset-4',

  // Box shadow focus (alternative to ring)
  shadow: 'focus:outline-none focus:shadow-[0_0_0_3px_rgba(59,130,246,0.5)]',

  // High contrast focus
  highContrast:
    'focus:outline-none focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2 focus:ring-offset-black',
};

/**
 * Visually hidden but accessible to screen readers
 */
export function VisuallyHidden({ children }: { children: React.ReactNode }) {
  return <span className="sr-only">{children}</span>;
}

/**
 * Live region for screen reader announcements
 */
interface LiveRegionProps {
  children: React.ReactNode;
  priority?: 'polite' | 'assertive';
  atomic?: boolean;
}

export function LiveRegion({ children, priority = 'polite', atomic = true }: LiveRegionProps) {
  return (
    <div role="status" aria-live={priority} aria-atomic={atomic} className="sr-only">
      {children}
    </div>
  );
}

export default FocusRing;
