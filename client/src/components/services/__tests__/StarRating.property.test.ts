/**
 * Property-Based Tests for StarRating component
 *
 * Feature: services-marketplace-overhaul, Property 4: Star rating rounds to nearest half star
 *
 * Property 4: Star rating rounds to nearest half star
 * For any rating in [0, 5], roundToHalfStar(rating) returns a multiple of 0.5,
 * within 0.25 of input, and in range [0, 5].
 * Validates: Requirements 3.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { roundToHalfStar } from '../StarRating';

// Feature: services-marketplace-overhaul, Property 4: Star rating rounds to nearest half star
describe('roundToHalfStar', () => {
  it('Property 4: returns a multiple of 0.5 for any rating in [0, 5]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 5, noNaN: true }), rating => {
        const rounded = roundToHalfStar(rating);
        // Must be a multiple of 0.5
        expect(rounded % 0.5).toBeCloseTo(0, 10);
      }),
      { numRuns: 20 },
    );
  });

  it('Property 4: result is within 0.25 of the input for any rating in [0, 5]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 5, noNaN: true }), rating => {
        const rounded = roundToHalfStar(rating);
        expect(Math.abs(rounded - rating)).toBeLessThanOrEqual(0.25);
      }),
      { numRuns: 20 },
    );
  });

  it('Property 4: result is always in range [0, 5] for any rating in [0, 5]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 5, noNaN: true }), rating => {
        const rounded = roundToHalfStar(rating);
        expect(rounded).toBeGreaterThanOrEqual(0);
        expect(rounded).toBeLessThanOrEqual(5);
      }),
      { numRuns: 20 },
    );
  });

  it('Property 4: all three constraints hold simultaneously for any rating in [0, 5]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 5, noNaN: true }), rating => {
        const rounded = roundToHalfStar(rating);
        const isMultipleOfHalf = rounded % 0.5 === 0 || Math.abs(rounded % 0.5) < 1e-10;
        const isWithinQuarter = Math.abs(rounded - rating) <= 0.25;
        const isInRange = rounded >= 0 && rounded <= 5;
        return isMultipleOfHalf && isWithinQuarter && isInRange;
      }),
      { numRuns: 20 },
    );
  });
});
