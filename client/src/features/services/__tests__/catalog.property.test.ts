import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  buildServiceLocationPath,
  buildServiceRequestPath,
  formatPriceRange,
  serviceJourneyContextFromSearch,
} from '../catalog';

const PLACE_ID = 'pl-place-01-000000000000000000000000';

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

  it('round-trips the allowlisted journey context without inventing values', () => {
    const context = {
      category: 'moving',
      providerId: 42,
      serviceCode: 'removals',
      propertyId: 7,
      listingId: 8,
      developmentId: 9,
      propertyLinked: true,
      intentStage: 'buyer_move_ready',

      sourceSurface: 'journey_injection',
      sourceDetail: 'saved_property',
      reasonKey: 'move_ready',
      canonicalPlaceId: PLACE_ID,
    } as const;

    const requestPath = buildServiceRequestPath('moving', 42, 'removals', context);
    const requestUrl = new URL(requestPath, 'https://property-listify.test');
    expect(requestUrl.pathname).toBe('/services/request/moving');
    expect(Object.fromEntries(requestUrl.searchParams.entries())).toEqual(
      Object.fromEntries(Object.entries(context).map(([key, value]) => [key, String(value)])),
    );

    const canonicalPath = buildServiceLocationPath('moving', PLACE_ID, context);
    const canonicalUrl = new URL(canonicalPath, 'https://property-listify.test');
    expect(canonicalUrl.pathname).toBe('/services/moving');
    expect(canonicalUrl.searchParams.get('canonicalPlaceId')).toBe(PLACE_ID);
    expect(serviceJourneyContextFromSearch(canonicalUrl.search)).toEqual(
      Object.fromEntries(Object.entries(context).map(([key, value]) => [key, String(value)])),
    );
  });

  it('does not preserve legacy typed geography as a request or search authority', () => {
    const legacyContext = {
      category: 'moving',
      city: 'Cape Town',
      province: 'Western Cape',
      suburb: 'Rondebosch',
    } as any;
    const request = new URL(
      buildServiceRequestPath('moving', 42, 'removals', legacyContext),
      'https://property-listify.test',
    );
    const search = new URL(
      buildServiceLocationPath('moving', null, legacyContext),
      'https://property-listify.test',
    );
    expect(request.searchParams.has('city')).toBe(false);
    expect(request.searchParams.has('province')).toBe(false);
    expect(request.searchParams.has('suburb')).toBe(false);
    expect(search.searchParams.has('city')).toBe(false);
    expect(search.searchParams.has('province')).toBe(false);
    expect(search.searchParams.has('suburb')).toBe(false);
    expect(serviceJourneyContextFromSearch('?city=Cape+Town&province=Western+Cape')).toEqual({});
  });
});
