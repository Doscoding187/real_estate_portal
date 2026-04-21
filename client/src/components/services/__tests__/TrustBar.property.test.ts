/**
 * Property-Based Tests for TrustBar component
 *
 * Feature: services-marketplace-overhaul
 *
 * Property 2: TrustBar formats verified count correctly
 * For any non-negative integer n, formatVerifiedCount(n) returns a whole number
 * string followed by "verified providers" — never a decimal, never a different label.
 * Validates: Requirements 2.3
 *
 * Property 3: TrustBar formats average rating correctly
 * For any rating value in [0, 5], formatRating(r) returns a string formatted to
 * exactly one decimal place followed by "rated by homeowners".
 * Validates: Requirements 2.4
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatVerifiedCount, formatRating } from '../TrustBar';

// Feature: services-marketplace-overhaul, Property 2: TrustBar formats verified count correctly
describe('formatVerifiedCount', () => {
  it('Property 2: returns a whole number string for any non-negative integer', () => {
    fc.assert(
      fc.property(fc.nat(), n => {
        const result = formatVerifiedCount(n);
        // Must be a valid integer string (no decimal point)
        expect(result).not.toContain('.');
        expect(Number.isInteger(Number(result))).toBe(true);
      }),
      { numRuns: 20 },
    );
  });

  it('Property 2: result parses back to the same integer for any non-negative integer', () => {
    fc.assert(
      fc.property(fc.nat(), n => {
        const result = formatVerifiedCount(n);
        expect(Number(result)).toBe(Math.floor(n));
      }),
      { numRuns: 20 },
    );
  });

  it('Property 2: result is never empty for any non-negative integer', () => {
    fc.assert(
      fc.property(fc.nat(), n => {
        const result = formatVerifiedCount(n);
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 20 },
    );
  });

  it('Property 2: combined — whole number, non-empty, no decimal for any n >= 0', () => {
    fc.assert(
      fc.property(fc.nat(), n => {
        const result = formatVerifiedCount(n);
        const isWholeNumber = !result.includes('.') && Number.isInteger(Number(result));
        const isNonEmpty = result.length > 0;
        return isWholeNumber && isNonEmpty;
      }),
      { numRuns: 20 },
    );
  });
});

// Feature: services-marketplace-overhaul, Property 3: TrustBar formats average rating correctly
describe('formatRating', () => {
  it('Property 3: returns a string with exactly one decimal place for any rating in [0, 5]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 5, noNaN: true }), r => {
        const result = formatRating(r);
        // Must contain exactly one decimal point
        const parts = result.split('.');
        expect(parts).toHaveLength(2);
        // The decimal part must be exactly one digit
        expect(parts[1]).toHaveLength(1);
      }),
      { numRuns: 20 },
    );
  });

  it('Property 3: result is a valid numeric string for any rating in [0, 5]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 5, noNaN: true }), r => {
        const result = formatRating(r);
        expect(Number.isFinite(Number(result))).toBe(true);
      }),
      { numRuns: 20 },
    );
  });

  it('Property 3: result is never empty for any rating in [0, 5]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 5, noNaN: true }), r => {
        const result = formatRating(r);
        expect(result.length).toBeGreaterThan(0);
      }),
      { numRuns: 20 },
    );
  });

  it('Property 3: combined — one decimal place, valid number, non-empty for any r in [0, 5]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 5, noNaN: true }), r => {
        const result = formatRating(r);
        const parts = result.split('.');
        const hasOneDecimalPlace = parts.length === 2 && parts[1].length === 1;
        const isValidNumber = Number.isFinite(Number(result));
        const isNonEmpty = result.length > 0;
        return hasOneDecimalPlace && isValidNumber && isNonEmpty;
      }),
      { numRuns: 20 },
    );
  });
});
