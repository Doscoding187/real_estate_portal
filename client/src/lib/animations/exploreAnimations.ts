/**
 * Explore Animations Library
 * 
 * Framer Motion animation variants for the Explore feature.
 * All animations respect prefers-reduced-motion media query.
 * 
 * Design Philosophy:
 * - Subtle, not bouncy
 * - Fast and responsive
 * - Smooth easing curves
 * - Respect user preferences
 */

import { Variants, Transition } from 'framer-motion';

// Check if user prefers reduced motion
export const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

// Standard easing curves
export const easings = {
  easeOut: [0.4, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  easeInOut: [0.4, 0, 0.2, 1],
  spring: { type: 'spring', stiffness: 300, damping: 30 },
} as const;

// Standard transitions
export const transitions = {
  fast: { duration: 0.15, ease: easings.easeOut },
  normal: { duration: 0.3, ease: easings.easeOut },
  slow: { duration: 0.5, ease: easings.easeOut },
} as const;

/**
 * Card Animations
 * Subtle lift and scale effects for cards
 */
export const cardVariants: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.normal,
  },
  hover: {
    y: -2,
    scale: 1.01,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.98,
    transition: transitions.fast,
  },
};

/**
 * Button Animations
 * Press and hover effects for buttons
 */
export const buttonVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.98,
    transition: transitions.fast,
  },
};

/**
 * Chip/Pill Animations
 * Selection and hover effects for category chips
 */
export const chipVariants: Variants = {
  initial: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: transitions.fast,
  },
  tap: {
    scale: 0.95,
    transition: transitions.fast,
  },
  selected: {
    scale: 1,
    transition: transitions.normal,
  },
};

/**
 * Map Pin Animations
 * Bounce and scale effects for map markers
 */
export const mapPinVariants: Variants = {
  initial: {
    scale: 1,
    y: 0,
  },
  hover: {
    scale: 1.1,
    y: -4,
    transition: transitions.fast,
  },
  selected: {
    scale: 1.2,
    y: -8,
    transition: {
      ...transitions.normal,
      y: {
        type: 'spring',
        stiffness: 300,
        damping: 20,
      },
    },
  },
};

/**
 * Page Transition Animations
 * Smooth transitions between pages
 */
export const pageVariants: Variants = {
  initial: {
    opacity: 0,
    x: -20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: transitions.fast,
  },
};

/**
 * Modal/Overlay Animations
 * Fade and scale effects for modals
 */
export const modalVariants: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: transitions.normal,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: transitions.fast,
  },
};

/**
 * Bottom Sheet Animations
 * Slide up from bottom for mobile filters
 */
export const bottomSheetVariants: Variants = {
  initial: {
    y: '100%',
  },
  animate: {
    y: 0,
    transition: {
      ...transitions.normal,
      type: 'spring',
      stiffness: 300,
      damping: 30,
    },
  },
  exit: {
    y: '100%',
    transition: transitions.fast,
  },
};

/**
 * Stagger Children Animation
 * For lists and grids
 */
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export const staggerItemVariants: Variants = {
  initial: {
    opacity: 0,
    y: 10,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.fast,
  },
};

/**
 * Fade Animations
 * Simple fade in/out
 */
export const fadeVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: transitions.normal },
  exit: { opacity: 0, transition: transitions.fast },
};

/**
 * Slide Animations
 * Directional slides
 */
export const slideVariants = {
  fromLeft: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: transitions.normal },
    exit: { x: 20, opacity: 0, transition: transitions.fast },
  },
  fromRight: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1, transition: transitions.normal },
    exit: { x: -20, opacity: 0, transition: transitions.fast },
  },
  fromTop: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: transitions.normal },
    exit: { y: 20, opacity: 0, transition: transitions.fast },
  },
  fromBottom: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: transitions.normal },
    exit: { y: -20, opacity: 0, transition: transitions.fast },
  },
};

/**
 * Utility function to get animation variants with reduced motion support
 */
export function getVariants(variants: Variants): Variants {
  if (prefersReducedMotion()) {
    // Return simplified variants for reduced motion
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    };
  }
  return variants;
}

/**
 * Utility function to get transition with reduced motion support
 */
export function getTransition(transition: Transition): Transition {
  if (prefersReducedMotion()) {
    return { duration: 0.01 };
  }
  return transition;
}
