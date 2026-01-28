/**
 * LiveRegion Component
 * ARIA live region for announcing dynamic content changes to screen readers
 *
 * Requirements: 12.3, 12.5
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface LiveRegionProps {
  /**
   * Content to announce
   */
  children: React.ReactNode;
  /**
   * Priority level for announcements
   * - polite: Wait for current speech to finish
   * - assertive: Interrupt current speech
   */
  priority?: 'polite' | 'assertive';
  /**
   * Whether to announce the entire region or just changes
   */
  atomic?: boolean;
  /**
   * Whether the region is relevant (visible to screen readers)
   */
  relevant?:
    | 'additions'
    | 'removals'
    | 'text'
    | 'all'
    | 'additions text'
    | 'additions removals'
    | 'removals additions'
    | 'removals text'
    | 'text additions'
    | 'text removals';
  /**
   * Additional className
   */
  className?: string;
}

/**
 * LiveRegion component for screen reader announcements
 * Automatically announces content changes to assistive technologies
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  priority = 'polite',
  atomic = true,
  relevant = 'additions text',
  className,
}) => {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      aria-relevant={relevant}
      className={cn('sr-only', className)}
    >
      {children}
    </div>
  );
};

LiveRegion.displayName = 'LiveRegion';

/**
 * Hook for managing live region announcements
 */
export function useLiveRegion() {
  const [message, setMessage] = React.useState<string>('');
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const announce = React.useCallback((text: string, duration = 1000) => {
    setMessage(text);

    // Clear message after duration to allow re-announcing the same message
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setMessage('');
    }, duration);
  }, []);

  // Cleanup on unmount
  React.useEffect(() => {
    const currentTimeout = timeoutRef.current;
    return () => {
      if (currentTimeout) {
        clearTimeout(currentTimeout);
      }
    };
  }, []);

  return { message, announce };
}
