/**
 * Property-Based Tests for ProviderAvatar component
 *
 * Feature: services-marketplace-overhaul, Property 5: Provider avatar initials are always non-empty
 *
 * Property 5: Provider avatar initials are always non-empty
 * For any non-empty companyName string, getInitials(companyName) returns 1–2 uppercase characters.
 * Validates: Requirements 3.1, 6.1
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getInitials } from '../ProviderAvatar';

// Feature: services-marketplace-overhaul, Property 5: Provider avatar initials are always non-empty
describe('getInitials', () => {
  it('Property 5: returns 1–2 characters for any non-empty companyName', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        companyName => {
          const initials = getInitials(companyName);
          expect(initials.length).toBeGreaterThanOrEqual(1);
          expect(initials.length).toBeLessThanOrEqual(2);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('Property 5: returns only uppercase characters for any non-empty companyName', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        companyName => {
          const initials = getInitials(companyName);
          expect(initials).toMatch(/^[A-Z]{1,2}$/);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('Property 5: result is always non-empty for any non-empty companyName', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        companyName => {
          const initials = getInitials(companyName);
          expect(initials.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 20 },
    );
  });

  it('Property 5: all constraints hold simultaneously for any non-empty companyName', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter(s => s.trim().length > 0),
        companyName => {
          const initials = getInitials(companyName);
          const isNonEmpty = initials.length > 0;
          const isOneOrTwoChars = initials.length >= 1 && initials.length <= 2;
          const isUppercase = /^[A-Z]{1,2}$/.test(initials);
          return isNonEmpty && isOneOrTwoChars && isUppercase;
        },
      ),
      { numRuns: 20 },
    );
  });
});
