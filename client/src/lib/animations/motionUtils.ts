/**
 * Motion Utilities for Advertise Landing Page
 * 
 * Provides utilities for handling animations with reduced motion support
 * 
 * Requirements: 11.4 - Respect user preferences for reduced motion
 */

import { Variants, Transition, MotionProps } from 'framer-motion';
import { checkReducedMotion } from '@/hooks/useReducedMotion.advertise';

/**
 * Create animation variants that respect reduced motion
 * 
 * @param variants - Normal animation variants
 * @returns Variants that respect reduced motion preference
 */
export function createAccessibleVariants(variants: Variants): Variants {
  const prefersReducedMotion = checkReducedMotion();
  
  if (!prefersReducedMotion) {
    return variants;
  }
  
  // Create reduced motion variants (only opacity changes)
  const reducedVariants: Variants = {};
  
  Object.keys(variants).forEach((key) => {
    const variant = variants[key];
    if (typeof variant === 'object' && variant !== null) {
      reducedVariants[key] = {
        opacity: variant.opacity ?? 1,
        transition: {
          duration: 0.01,
        },
      };
    }
  });
  
  return reducedVariants;
}

/**
 * Create animation variants that respect reduced motion (runtime version)
 * Use this when you need to check reduced motion at runtime
 * 
 * @param variants - Normal animation variants
 * @param prefersReducedMotion - Whether user prefers reduced motion
 * @returns Variants that respect reduced motion preference
 */
export function createAccessibleVariantsRuntime(
  variants: Variants,
  prefersReducedMotion: boolean
): Variants {
  if (!prefersReducedMotion) {
    return variants;
  }
  
  // Create reduced motion variants (only opacity changes)
  const reducedVariants: Variants = {};
  
  Object.keys(variants).forEach((key) => {
    const variant = variants[key];
    if (typeof variant === 'object' && variant !== null) {
      reducedVariants[key] = {
        opacity: variant.opacity ?? 1,
        transition: {
          duration: 0.01,
        },
      };
    }
  });
  
  return reducedVariants;
}

/**
 * Create transition that respects reduced motion
 * 
 * @param transition - Normal transition config
 * @returns Transition that respects reduced motion preference
 */
export function createAccessibleTransition(transition: Transition): Transition {
  const prefersReducedMotion = checkReducedMotion();
  
  if (!prefersReducedMotion) {
    return transition;
  }
  
  // Return instant transition for reduced motion
  return {
    duration: 0.01,
  };
}

/**
 * Get animation duration based on reduced motion preference
 * 
 * @param duration - Normal duration in seconds
 * @returns Duration that respects reduced motion preference
 */
export function getAccessibleDuration(duration: number): number {
  const prefersReducedMotion = checkReducedMotion();
  return prefersReducedMotion ? 0.01 : duration;
}

/**
 * Reduced motion variants for common animations
 */
export const reducedMotionVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  visible: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
  },
  hidden: {
    initial: { opacity: 1 },
    animate: { opacity: 0 },
  },
} as const;

/**
 * Check if animations should be disabled
 * Considers both reduced motion preference and device capabilities
 * 
 * @returns boolean indicating if animations should be disabled
 */
export function shouldDisableAnimations(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  // Check reduced motion preference
  const prefersReducedMotion = checkReducedMotion();
  if (prefersReducedMotion) {
    return true;
  }
  
  // Check for low-end device (optional, for performance)
  // This is a heuristic based on hardware concurrency
  const isLowEndDevice = navigator.hardwareConcurrency ? navigator.hardwareConcurrency <= 2 : false;
  
  return isLowEndDevice;
}

/**
 * Wrapper for motion components that respects reduced motion
 * 
 * @param variants - Animation variants
 * @param transition - Animation transition
 * @returns Props object with accessible animations
 */
export function getAccessibleMotionProps(
  variants: Variants,
  transition?: Transition
) {
  const shouldDisable = shouldDisableAnimations();
  
  if (shouldDisable) {
    return {
      variants: reducedMotionVariants.fadeIn,
      transition: { duration: 0.01 },
    };
  }
  
  return {
    variants,
    transition,
  };
}

/**
 * Wrapper for motion components that respects reduced motion (runtime version)
 * Use this when you need to check reduced motion at runtime
 * 
 * @param variants - Animation variants
 * @param transition - Animation transition
 * @param prefersReducedMotion - Whether user prefers reduced motion
 * @returns Props object with accessible animations
 */
export function getAccessibleMotionPropsRuntime(
  variants: Variants,
  transition: Transition | undefined,
  prefersReducedMotion: boolean
): MotionProps {
  if (prefersReducedMotion) {
    return {
      variants: reducedMotionVariants.fadeIn,
      transition: { duration: 0.01 },
    };
  }
  
  return {
    variants,
    transition,
  };
}

/**
 * Apply reduced motion to any motion props object
 * 
 * @param props - Motion props
 * @param prefersReducedMotion - Whether user prefers reduced motion
 * @returns Motion props with reduced motion applied
 */
export function applyReducedMotion<T extends MotionProps>(
  props: T,
  prefersReducedMotion: boolean
): T {
  if (!prefersReducedMotion) {
    return props;
  }
  
  // Create a copy of props with reduced motion
  const reducedProps = { ...props };
  
  // Simplify variants if present
  if (reducedProps.variants) {
    reducedProps.variants = createAccessibleVariantsRuntime(
      reducedProps.variants,
      prefersReducedMotion
    );
  }
  
  // Simplify transition if present
  if (reducedProps.transition) {
    reducedProps.transition = { duration: 0.01 };
  }
  
  // Remove transform-based animations from initial/animate/exit
  if (reducedProps.initial && typeof reducedProps.initial === 'object') {
    const { x, y, scale, rotate, ...rest } = reducedProps.initial as any;
    reducedProps.initial = rest;
  }
  
  if (reducedProps.animate && typeof reducedProps.animate === 'object') {
    const { x, y, scale, rotate, ...rest } = reducedProps.animate as any;
    reducedProps.animate = rest;
  }
  
  if (reducedProps.exit && typeof reducedProps.exit === 'object') {
    const { x, y, scale, rotate, ...rest } = reducedProps.exit as any;
    reducedProps.exit = rest;
  }
  
  return reducedProps;
}
