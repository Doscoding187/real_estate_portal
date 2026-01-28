/**
 * useReducedMotion Hook for Advertise Landing Page
 *
 * Detects user's motion preferences and provides utilities
 * to respect prefers-reduced-motion media query.
 *
 * Requirements: 11.4 - Respect user preferences for reduced motion
 */

import { useEffect, useState } from 'react';

/**
 * Hook to detect if user prefers reduced motion
 *
 * @returns boolean indicating if reduced motion is preferred
 *
 * @example
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 *
 * return (
 *   <motion.div
 *     animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
 *   >
 *     Content
 *   </motion.div>
 * );
 * ```
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check if window is available (SSR safety)
    if (typeof window === 'undefined') {
      return;
    }

    // Create media query
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Set initial value
    setPrefersReducedMotion(mediaQuery.matches);

    // Create listener for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Add listener (use addEventListener for better browser support)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleChange);
    }

    // Cleanup
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleChange);
      } else {
        // Fallback for older browsers
        mediaQuery.removeListener(handleChange);
      }
    };
  }, []);

  return prefersReducedMotion;
}

/**
 * Get animation duration based on reduced motion preference
 *
 * @param normalDuration - Duration in seconds when motion is enabled
 * @param reducedDuration - Duration in seconds when motion is reduced (default: 0.01)
 * @returns Duration in seconds
 *
 * @example
 * ```tsx
 * const duration = useAnimationDuration(0.4, 0.01);
 * ```
 */
export function useAnimationDuration(
  normalDuration: number,
  reducedDuration: number = 0.01,
): number {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? reducedDuration : normalDuration;
}

/**
 * Get animation variants based on reduced motion preference
 *
 * @param normalVariants - Variants when motion is enabled
 * @param reducedVariants - Variants when motion is reduced
 * @returns Appropriate variants based on user preference
 *
 * @example
 * ```tsx
 * const variants = useAnimationVariants(
 *   { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } },
 *   { initial: { opacity: 0 }, animate: { opacity: 1 } }
 * );
 * ```
 */
export function useAnimationVariants<T>(normalVariants: T, reducedVariants: T): T {
  const prefersReducedMotion = useReducedMotion();
  return prefersReducedMotion ? reducedVariants : normalVariants;
}

/**
 * Utility to conditionally apply animation props
 *
 * @param animationProps - Props to apply when motion is enabled
 * @returns Animation props or empty object based on user preference
 *
 * @example
 * ```tsx
 * const animationProps = useConditionalAnimation({
 *   initial: { opacity: 0, y: 20 },
 *   animate: { opacity: 1, y: 0 },
 *   transition: { duration: 0.4 }
 * });
 *
 * return <motion.div {...animationProps}>Content</motion.div>;
 * ```
 */
export function useConditionalAnimation<T extends Record<string, any>>(
  animationProps: T,
): T | Record<string, never> {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    // Return minimal animation (just opacity fade)
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: { duration: 0.01 },
    } as unknown as T;
  }

  return animationProps;
}

/**
 * Check if reduced motion is preferred (synchronous, for SSR)
 *
 * @returns boolean indicating if reduced motion is preferred
 */
export function checkReducedMotion(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}
