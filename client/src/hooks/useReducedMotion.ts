/**
 * useReducedMotion Hook
 * Detects user's motion preference and provides utilities for respecting it
 *
 * Requirements: 12.4
 */

import { useEffect, useState } from 'react';

/**
 * Hook to detect if user prefers reduced motion
 * Returns true if user has enabled "prefers-reduced-motion" in their OS/browser settings
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if matchMedia is supported
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setPrefersReducedMotion(event.matches);
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Legacy browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  return prefersReducedMotion;
}

/**
 * Get animation duration based on reduced motion preference
 * Returns 0 if reduced motion is preferred, otherwise returns the specified duration
 */
export function getAnimationDuration(duration: number, prefersReducedMotion: boolean): number {
  return prefersReducedMotion ? 0 : duration;
}

/**
 * Get transition class based on reduced motion preference
 * Returns empty string if reduced motion is preferred
 */
export function getTransitionClass(transitionClass: string, prefersReducedMotion: boolean): string {
  return prefersReducedMotion ? '' : transitionClass;
}
