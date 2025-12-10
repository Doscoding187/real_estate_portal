/**
 * Animation Utilities for Advertise With Us Landing Page
 * 
 * Provides Framer Motion animation variants and hooks for smooth,
 * premium animations throughout the landing page.
 * 
 * Animation Duration Guidelines (Tiered Approach):
 * - Micro-interactions & tap feedback: 100-200ms (feels instantaneous)
 * - Exit/dismissal animations: ≤250ms (quick but readable)
 * - Entrance & scroll-triggered: 350-600ms (breathing room, elegance)
 * - Complex sequences/staggers: total ≤900ms
 * 
 * This tiered approach follows modern UX best practices from:
 * - Google Material Design Motion Guidelines
 * - Apple Human Interface Guidelines
 * - Nielsen Norman Group research on perceived performance
 * 
 * References:
 * - https://material.io/design/motion/speed.html
 * - https://developer.apple.com/design/human-interface-guidelines/motion
 */

import { Variants } from 'framer-motion';

/**
 * Fade-up animation variant
 * Elements fade in while moving up from below
 */
export const fadeUp: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1], // cubic-bezier easing
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Soft lift animation variant
 * Elements lift up with shadow expansion on hover
 */
export const softLift: Variants = {
  rest: {
    y: 0,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04), 0 4px 16px rgba(0, 0, 0, 0.06)',
  },
  hover: {
    y: -4,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.12)',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  tap: {
    y: 0,
    scale: 0.98,
    transition: {
      duration: 0.15,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Stagger container animation variant
 * Parent container that staggers child animations
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1, // 100ms delay between children
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.05,
      staggerDirection: -1, // Reverse order on exit
    },
  },
};

/**
 * Stagger item animation variant
 * Child elements that animate in sequence
 */
export const staggerItem: Variants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Scale in animation variant
 * Elements scale up from smaller size
 */
export const scaleIn: Variants = {
  initial: {
    opacity: 0,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Slide in from left animation variant
 */
export const slideInLeft: Variants = {
  initial: {
    opacity: 0,
    x: -30,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Slide in from right animation variant
 */
export const slideInRight: Variants = {
  initial: {
    opacity: 0,
    x: 30,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.4,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    x: 20,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Fade animation variant (simple opacity change)
 */
export const fade: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Button press animation variant
 */
export const buttonPress: Variants = {
  rest: {
    scale: 1,
  },
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1],
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Pulse animation for attention-grabbing elements
 */
export const pulse: Variants = {
  initial: {
    scale: 1,
  },
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
 * Rotate animation for icons
 */
export const rotate: Variants = {
  initial: {
    rotate: 0,
  },
  animate: {
    rotate: 360,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

/**
 * Animation configuration constants
 */
export const animationConfig = {
  // Duration constants (in seconds)
  duration: {
    fast: 0.15,
    normal: 0.3,
    slow: 0.5,
  },
  // Easing functions
  easing: {
    default: [0.4, 0, 0.2, 1] as const,
    spring: [0.68, -0.55, 0.265, 1.55] as const,
    easeOut: [0, 0, 0.2, 1] as const,
    easeIn: [0.4, 0, 1, 1] as const,
  },
  // Stagger delays (in seconds)
  stagger: {
    fast: 0.05,
    normal: 0.1,
    slow: 0.15,
  },
} as const;
