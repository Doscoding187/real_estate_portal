// Feature: services-marketplace-overhaul, Property 13: ZAR price range formatting

/**
 * Property-Based Tests for catalog.ts utility functions
 *
 * Property 13: ZAR price range formatting
 * For any non-negative integers where max >= min,
 * formatPriceRange(min, max) returns a string matching R{min} – R{max}
 * with no decimal places.
 *
 * Validates: Requirements 6.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatPriceRange } from '../catalog';

describe('catalog.ts — Property-Based Tests', () => {
  describe('Property 13: ZAR price range formatting', () => {
    it('returns a string matching R{min} – R{max} for any non-negative integers where max >= min', () => {
      fc.assert(
        fc.property(
          // Generate two non-negative integers and ensure max >= min
          fc.nat({ max: 10_000_000 }),
          fc.nat({ max: 10_000_000 }),
          (a, b) => {
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            const result = formatPriceRange(min, max);

            // Must match the pattern R{min} – R{max}
            const expected = `R${min} \u2013 R${max}`;
            expect(result).toBe(expected);

            // Must contain no decimal points
            expect(result).not.toMatch(/\./);

            // Must start with "R"
            expect(result).toMatch(/^R/);

            // Must contain the en-dash separator
            expect(result).toContain('\u2013');

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('handles min === max (single price point)', () => {
      fc.assert(
        fc.property(fc.nat({ max: 10_000_000 }), n => {
          const result = formatPriceRange(n, n);
          expect(result).toBe(`R${n} \u2013 R${n}`);
          expect(result).not.toMatch(/\./);
          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('rounds non-integer inputs to whole numbers', () => {
      fc.assert(
        fc.property(
          fc.float({ min: 0, max: 10_000_000, noNaN: true }),
          fc.float({ min: 0, max: 10_000_000, noNaN: true }),
          (a, b) => {
            const min = Math.min(a, b);
            const max = Math.max(a, b);
            const result = formatPriceRange(min, max);

            // Result must not contain decimal points
            expect(result).not.toMatch(/\./);

            // Result must match the rounded values
            const expectedMin = Math.round(min);
            const expectedMax = Math.round(max);
            expect(result).toBe(`R${expectedMin} \u2013 R${expectedMax}`);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
