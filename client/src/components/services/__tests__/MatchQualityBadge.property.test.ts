/**
 * Property-Based Tests for MatchQualityBadge component
 *
 * Feature: services-marketplace-overhaul, Property 11: Match quality label is deterministic and exhaustive
 *
 * Property 11: Match quality label is deterministic and exhaustive
 * For any score in [0, 1], getMatchLabel(score) returns exactly one of the three labels
 * ('Strong match', 'Good match', 'Possible match'), never throws, never returns undefined.
 * Validates: Requirements 5.2
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { getMatchLabel } from '../MatchQualityBadge';

// Feature: services-marketplace-overhaul, Property 11: Match quality label is deterministic and exhaustive
describe('getMatchLabel', () => {
  const VALID_LABELS = ['Strong match', 'Good match', 'Possible match'] as const;

  it('Property 11: returns exactly one of the three valid labels for any score in [0, 1]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 1, noNaN: true }), score => {
        const label = getMatchLabel(score);
        expect(VALID_LABELS).toContain(label);
      }),
      { numRuns: 20 },
    );
  });

  it('Property 11: never returns undefined for any score in [0, 1]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 1, noNaN: true }), score => {
        const label = getMatchLabel(score);
        expect(label).toBeDefined();
      }),
      { numRuns: 20 },
    );
  });

  it('Property 11: never throws for any score in [0, 1]', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 1, noNaN: true }), score => {
        expect(() => getMatchLabel(score)).not.toThrow();
      }),
      { numRuns: 20 },
    );
  });

  it('Property 11: is deterministic — same score always returns same label', () => {
    fc.assert(
      fc.property(fc.float({ min: 0, max: 1, noNaN: true }), score => {
        const label1 = getMatchLabel(score);
        const label2 = getMatchLabel(score);
        expect(label1).toBe(label2);
      }),
      { numRuns: 20 },
    );
  });
});
