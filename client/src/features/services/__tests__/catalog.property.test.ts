import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { formatPriceRange, parseServiceLocationInput } from '../catalog';

describe('catalog.ts — Property-Based Tests', () => {
  describe('Property 13: ZAR price range formatting', () => {
    it('returns a string matching R{min} – R{max} for any non-negative integers where max >= min', () => {
      fc.assert(
        fc.property(fc.nat({ max: 10_000_000 }), fc.nat({ max: 10_000_000 }), (a, b) => {
          const min = Math.min(a, b);
          const max = Math.max(a, b);
          const result = formatPriceRange(min, max);

          expect(result).toBe(`R${min} – R${max}`);
          expect(result).not.toMatch(/\./);
          expect(result).toMatch(/^R/);
          expect(result).toContain('–');

          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('handles min === max (single price point)', () => {
      fc.assert(
        fc.property(fc.nat({ max: 10_000_000 }), n => {
          const result = formatPriceRange(n, n);
          expect(result).toBe(`R${n} – R${n}`);
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

            expect(result).not.toMatch(/\./);
            expect(result).toBe(`R${Math.round(min)} – R${Math.round(max)}`);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  it('keeps city-only and province-only location input typed', () => {
    expect(parseServiceLocationInput('Cape Town')).toEqual({
      suburb: '',
      city: 'Cape Town',
      province: '',
    });
    expect(parseServiceLocationInput('Western Cape')).toEqual({
      suburb: '',
      city: '',
      province: 'Western Cape',
    });
    expect(parseServiceLocationInput('gauteng')).toEqual({
      suburb: '',
      city: '',
      province: 'Gauteng',
    });

    expect(parseServiceLocationInput('Rondebosch, Cape Town, Western Cape')).toEqual({
      suburb: 'Rondebosch',
      city: 'Cape Town',
      province: 'Western Cape',
    });
    expect(parseServiceLocationInput('Rondebosch, Cape Town, western cape')).toEqual({
      suburb: 'Rondebosch',
      city: 'Cape Town',
      province: 'Western Cape',
    });
  });
});
