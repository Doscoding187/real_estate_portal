/**
 * Wizard Animation Utilities
 * Reusable animation definitions for wizard components
 * Part of the Soft UI design system
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 9.5
 */

/**
 * Slide-in animation from right (forward navigation)
 */
export const slideInRight = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
  transition: { duration: 0.3, ease: 'easeInOut' },
};

/**
 * Slide-in animation from left (backward navigation)
 */
export const slideInLeft = {
  initial: { opacity: 0, x: -50 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
  transition: { duration: 0.3, ease: 'easeInOut' },
};

/**
 * Fade animation
 */
export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.2 },
};

/**
 * Shake animation for validation errors
 */
export const shake = {
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
};

/**
 * Pulse animation for submit button
 */
export const pulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

/**
 * Stagger animation for children
 * @param index - Index of the child element
 * @param baseDelay - Base delay in seconds
 */
export const staggerChildren = (index: number, baseDelay: number = 0.05) => ({
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      delay: index * baseDelay,
      duration: 0.4,
      ease: 'easeOut',
    },
  },
});

/**
 * Scale animation
 */
export const scaleIn = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
  transition: { duration: 0.2 },
};

/**
 * Get animation based on direction
 * @param direction - 'forward' or 'backward'
 */
export const getSlideAnimation = (direction: 'forward' | 'backward') => {
  return direction === 'forward' ? slideInRight : slideInLeft;
};

/**
 * Check if user prefers reduced motion
 */
export const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Get animation with reduced motion support
 * @param animation - Animation object
 */
export const withReducedMotion = <T extends Record<string, any>>(
  animation: T,
): T | { initial: {}; animate: {}; exit: {} } => {
  if (prefersReducedMotion()) {
    return {
      initial: {},
      animate: {},
      exit: {},
    };
  }
  return animation;
};

/**
 * CSS class-based animations (for non-framer-motion usage)
 */
export const cssAnimations = {
  slideInRight: 'animate-in slide-in-from-right-4 fade-in duration-300',
  slideInLeft: 'animate-in slide-in-from-left-4 fade-in duration-300',
  fadeIn: 'animate-in fade-in duration-200',
  scaleIn: 'animate-in zoom-in-95 fade-in duration-200',
  shake: 'animate-shake',
  pulse: 'animate-pulse',
};

/**
 * Timing functions
 */
export const easings = {
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
  spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
};

/**
 * Duration presets (in milliseconds)
 */
export const durations = {
  fast: 150,
  normal: 300,
  slow: 500,
};
