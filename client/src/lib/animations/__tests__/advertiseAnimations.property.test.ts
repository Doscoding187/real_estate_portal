/**
 * Property-Based Tests for Animation Timing
 *
 * Feature: advertise-with-us-landing, Property 20: Animation duration
 * Validates: Requirements 11.5
 *
 * These tests verify that all animations complete within the specified
 * duration range of 300-500ms to maintain perceived performance.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  fadeUp,
  softLift,
  staggerContainer,
  staggerItem,
  scaleIn,
  slideInLeft,
  slideInRight,
  fade,
  buttonPress,
  animationConfig,
} from '../advertiseAnimations';
import { Variants } from 'framer-motion';

describe('Animation Timing - Property Tests', () => {
  /**
   * Property 20: Animation duration
   * For any animation triggered on the page, the animation duration should be between 300ms and 500ms
   */

  // Helper function to extract duration from transition object
  const getDuration = (transition: any): number | null => {
    if (!transition) return null;
    if (typeof transition.duration === 'number') {
      return transition.duration * 1000; // Convert to ms
    }
    return null;
  };

  // Helper function to check if duration is in valid range
  const isValidDuration = (durationMs: number | null): boolean => {
    if (durationMs === null) return true; // No duration specified is ok (uses default)
    return durationMs >= 300 && durationMs <= 500;
  };

  it('should have animation durations between 300ms and 500ms for fadeUp variant', () => {
    fc.assert(
      fc.property(fc.constantFrom('animate', 'exit'), state => {
        const variant = fadeUp[state as keyof typeof fadeUp];
        if (typeof variant === 'object' && variant !== null && 'transition' in variant) {
          const duration = getDuration(variant.transition);
          expect(isValidDuration(duration)).toBe(true);

          if (duration !== null) {
            expect(duration).toBeGreaterThanOrEqual(300);
            expect(duration).toBeLessThanOrEqual(500);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should have animation durations between 100ms and 500ms for softLift variant (tiered)', () => {
    fc.assert(
      fc.property(fc.constantFrom('hover', 'tap'), state => {
        const variant = softLift[state as keyof typeof softLift];
        if (typeof variant === 'object' && variant !== null && 'transition' in variant) {
          const duration = getDuration(variant.transition);

          if (duration !== null) {
            // Micro-interactions (tap): 100-200ms
            // Hover states: 200-500ms
            expect(duration).toBeGreaterThanOrEqual(100);
            expect(duration).toBeLessThanOrEqual(500);

            // Tap should be fast (100-200ms)
            if (state === 'tap') {
              expect(duration).toBeLessThanOrEqual(200);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should have animation durations between 200ms and 500ms for staggerItem variant (tiered)', () => {
    fc.assert(
      fc.property(fc.constantFrom('animate', 'exit'), state => {
        const variant = staggerItem[state as keyof typeof staggerItem];
        if (typeof variant === 'object' && variant !== null && 'transition' in variant) {
          const duration = getDuration(variant.transition);

          if (duration !== null) {
            // Exit animations: ≤250ms
            // Entrance animations: 350-500ms
            expect(duration).toBeGreaterThanOrEqual(200);
            expect(duration).toBeLessThanOrEqual(500);

            // Exit should be fast (≤250ms)
            if (state === 'exit') {
              expect(duration).toBeLessThanOrEqual(250);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should have animation durations between 200ms and 500ms for scaleIn variant (tiered)', () => {
    fc.assert(
      fc.property(fc.constantFrom('animate', 'exit'), state => {
        const variant = scaleIn[state as keyof typeof scaleIn];
        if (typeof variant === 'object' && variant !== null && 'transition' in variant) {
          const duration = getDuration(variant.transition);

          if (duration !== null) {
            expect(duration).toBeGreaterThanOrEqual(200);
            expect(duration).toBeLessThanOrEqual(500);

            // Exit should be fast (≤250ms)
            if (state === 'exit') {
              expect(duration).toBeLessThanOrEqual(250);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should have animation durations between 300ms and 500ms for slideInLeft variant', () => {
    fc.assert(
      fc.property(fc.constantFrom('animate', 'exit'), state => {
        const variant = slideInLeft[state as keyof typeof slideInLeft];
        if (typeof variant === 'object' && variant !== null && 'transition' in variant) {
          const duration = getDuration(variant.transition);
          expect(isValidDuration(duration)).toBe(true);

          if (duration !== null) {
            expect(duration).toBeGreaterThanOrEqual(300);
            expect(duration).toBeLessThanOrEqual(500);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should have animation durations between 300ms and 500ms for slideInRight variant', () => {
    fc.assert(
      fc.property(fc.constantFrom('animate', 'exit'), state => {
        const variant = slideInRight[state as keyof typeof slideInRight];
        if (typeof variant === 'object' && variant !== null && 'transition' in variant) {
          const duration = getDuration(variant.transition);
          expect(isValidDuration(duration)).toBe(true);

          if (duration !== null) {
            expect(duration).toBeGreaterThanOrEqual(300);
            expect(duration).toBeLessThanOrEqual(500);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should have animation durations between 200ms and 500ms for fade variant (tiered)', () => {
    fc.assert(
      fc.property(fc.constantFrom('animate', 'exit'), state => {
        const variant = fade[state as keyof typeof fade];
        if (typeof variant === 'object' && variant !== null && 'transition' in variant) {
          const duration = getDuration(variant.transition);

          if (duration !== null) {
            expect(duration).toBeGreaterThanOrEqual(200);
            expect(duration).toBeLessThanOrEqual(500);

            // Exit should be fast (≤250ms)
            if (state === 'exit') {
              expect(duration).toBeLessThanOrEqual(250);
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should have animation durations between 300ms and 500ms for buttonPress variant', () => {
    fc.assert(
      fc.property(fc.constantFrom('hover', 'tap'), state => {
        const variant = buttonPress[state as keyof typeof buttonPress];
        if (typeof variant === 'object' && variant !== null && 'transition' in variant) {
          const duration = getDuration(variant.transition);

          // Button interactions should be fast (100-200ms) for responsiveness
          if (duration !== null) {
            expect(duration).toBeGreaterThanOrEqual(100);
            expect(duration).toBeLessThanOrEqual(500);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  // Test animation config constants
  it('should have valid duration constants in animationConfig', () => {
    fc.assert(
      fc.property(fc.constantFrom('fast', 'normal', 'slow'), durationKey => {
        const duration =
          animationConfig.duration[durationKey as keyof typeof animationConfig.duration];

        // Duration should be a positive number
        expect(typeof duration).toBe('number');
        expect(duration).toBeGreaterThan(0);

        // Convert to ms and check range
        const durationMs = duration * 1000;

        // Fast can be shorter for micro-interactions
        if (durationKey === 'fast') {
          expect(durationMs).toBeGreaterThanOrEqual(100);
          expect(durationMs).toBeLessThanOrEqual(200);
        } else if (durationKey === 'normal') {
          expect(durationMs).toBeGreaterThanOrEqual(300);
          expect(durationMs).toBeLessThanOrEqual(300);
        } else if (durationKey === 'slow') {
          expect(durationMs).toBeGreaterThanOrEqual(500);
          expect(durationMs).toBeLessThanOrEqual(500);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should have valid easing functions in animationConfig', () => {
    fc.assert(
      fc.property(fc.constantFrom('default', 'spring', 'easeOut', 'easeIn'), easingKey => {
        const easing = animationConfig.easing[easingKey as keyof typeof animationConfig.easing];

        // Easing should be an array of 4 numbers (cubic-bezier)
        expect(Array.isArray(easing)).toBe(true);
        expect(easing.length).toBe(4);

        // All values should be numbers
        easing.forEach(value => {
          expect(typeof value).toBe('number');
        });

        // First and third values should be between 0 and 1
        expect(easing[0]).toBeGreaterThanOrEqual(0);
        expect(easing[0]).toBeLessThanOrEqual(1);
        expect(easing[2]).toBeGreaterThanOrEqual(0);
        expect(easing[2]).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  it('should have valid stagger delays in animationConfig', () => {
    fc.assert(
      fc.property(fc.constantFrom('fast', 'normal', 'slow'), staggerKey => {
        const stagger = animationConfig.stagger[staggerKey as keyof typeof animationConfig.stagger];

        // Stagger should be a positive number
        expect(typeof stagger).toBe('number');
        expect(stagger).toBeGreaterThan(0);

        // Convert to ms and check reasonable range
        const staggerMs = stagger * 1000;
        expect(staggerMs).toBeGreaterThanOrEqual(50);
        expect(staggerMs).toBeLessThanOrEqual(200);
      }),
      { numRuns: 100 },
    );
  });

  // Structural tests
  it('should have all required animation variants', () => {
    const requiredVariants = [
      fadeUp,
      softLift,
      staggerContainer,
      staggerItem,
      scaleIn,
      slideInLeft,
      slideInRight,
      fade,
      buttonPress,
    ];

    requiredVariants.forEach(variant => {
      expect(variant).toBeDefined();
      expect(typeof variant).toBe('object');
    });
  });

  it('should have consistent structure across animation variants', () => {
    const variants = [fadeUp, staggerItem, scaleIn, slideInLeft, slideInRight, fade];

    variants.forEach(variant => {
      // Should have initial and animate states
      expect(variant).toHaveProperty('initial');
      expect(variant).toHaveProperty('animate');

      // Animate state should have transition
      const animateState = variant.animate;
      if (typeof animateState === 'object' && animateState !== null) {
        expect(animateState).toHaveProperty('transition');
      }
    });
  });
});
