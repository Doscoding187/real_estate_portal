/**
 * Property-Based Tests for Location URL Format
 *
 * These tests validate that location URLs follow the correct hierarchical format
 * as specified in Requirements 29.1-29.3
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { generateSlug } from '../locationPagesServiceEnhanced';

/**
 * Generate a URL path for a province
 * Requirements 29.1: Province URL format
 */
function generateProvinceUrl(provinceSlug: string): string {
  return `/south-africa/${provinceSlug}`;
}

/**
 * Generate a URL path for a city
 * Requirements 29.2: City URL format
 */
function generateCityUrl(provinceSlug: string, citySlug: string): string {
  return `/south-africa/${provinceSlug}/${citySlug}`;
}

/**
 * Generate a URL path for a suburb
 * Requirements 29.3: Suburb URL format
 */
function generateSuburbUrl(provinceSlug: string, citySlug: string, suburbSlug: string): string {
  return `/south-africa/${provinceSlug}/${citySlug}/${suburbSlug}`;
}

/**
 * Arbitrary for generating valid location names
 * Names should be realistic (1-50 characters, letters, spaces, hyphens, apostrophes)
 * Must produce non-empty slugs after processing
 */
const locationNameArbitrary = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter(name => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return false;

    // Check if the name would produce a non-empty slug
    const slug = generateSlug(trimmed);
    return slug.length > 0;
  })
  .map(name => name.trim());

describe('Location URL Format Property Tests', () => {
  describe('Property 36: Province URL format', () => {
    /**
     * **Feature: google-places-autocomplete-integration, Property 36: Province URL format**
     *
     * For any province location, the generated URL should match the pattern /south-africa/{province-slug}
     *
     * **Validates: Requirements 29.1**
     */
    it('should generate province URLs in format /south-africa/{province-slug}', () => {
      fc.assert(
        fc.property(locationNameArbitrary, provinceName => {
          // Generate slug from province name
          const provinceSlug = generateSlug(provinceName);

          // Generate URL
          const url = generateProvinceUrl(provinceSlug);

          // Verify URL format
          expect(url).toMatch(/^\/south-africa\/[a-z0-9-]+$/);

          // Verify it starts with /south-africa/
          expect(url).toMatch(/^\/south-africa\//);

          // Verify slug is kebab-case (lowercase, hyphens, no spaces)
          const slugPart = url.replace('/south-africa/', '');
          expect(slugPart).toBe(slugPart.toLowerCase());
          expect(slugPart).not.toContain(' ');
          expect(slugPart).toMatch(/^[a-z0-9-]+$/);

          // Verify no leading or trailing hyphens in slug
          expect(slugPart).not.toMatch(/^-|-$/);

          // Verify URL has exactly 2 path segments
          const segments = url.split('/').filter(s => s.length > 0);
          expect(segments).toHaveLength(2);
          expect(segments[0]).toBe('south-africa');
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 37: City URL format', () => {
    /**
     * **Feature: google-places-autocomplete-integration, Property 37: City URL format**
     *
     * For any city location, the generated URL should match the pattern /south-africa/{province-slug}/{city-slug}
     *
     * **Validates: Requirements 29.2**
     */
    it('should generate city URLs in format /south-africa/{province-slug}/{city-slug}', () => {
      fc.assert(
        fc.property(locationNameArbitrary, locationNameArbitrary, (provinceName, cityName) => {
          // Generate slugs
          const provinceSlug = generateSlug(provinceName);
          const citySlug = generateSlug(cityName);

          // Generate URL
          const url = generateCityUrl(provinceSlug, citySlug);

          // Verify URL format
          expect(url).toMatch(/^\/south-africa\/[a-z0-9-]+\/[a-z0-9-]+$/);

          // Verify it starts with /south-africa/
          expect(url).toMatch(/^\/south-africa\//);

          // Verify all slug parts are kebab-case
          const parts = url.split('/').filter(s => s.length > 0);
          parts.slice(1).forEach(part => {
            expect(part).toBe(part.toLowerCase());
            expect(part).not.toContain(' ');
            expect(part).toMatch(/^[a-z0-9-]+$/);
            expect(part).not.toMatch(/^-|-$/);
          });

          // Verify URL has exactly 3 path segments
          expect(parts).toHaveLength(3);
          expect(parts[0]).toBe('south-africa');
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 38: Suburb URL format', () => {
    /**
     * **Feature: google-places-autocomplete-integration, Property 38: Suburb URL format**
     *
     * For any suburb location, the generated URL should match the pattern
     * /south-africa/{province-slug}/{city-slug}/{suburb-slug}
     *
     * **Validates: Requirements 29.3**
     */
    it('should generate suburb URLs in format /south-africa/{province-slug}/{city-slug}/{suburb-slug}', () => {
      fc.assert(
        fc.property(
          locationNameArbitrary,
          locationNameArbitrary,
          locationNameArbitrary,
          (provinceName, cityName, suburbName) => {
            // Generate slugs
            const provinceSlug = generateSlug(provinceName);
            const citySlug = generateSlug(cityName);
            const suburbSlug = generateSlug(suburbName);

            // Generate URL
            const url = generateSuburbUrl(provinceSlug, citySlug, suburbSlug);

            // Verify URL format
            expect(url).toMatch(/^\/south-africa\/[a-z0-9-]+\/[a-z0-9-]+\/[a-z0-9-]+$/);

            // Verify it starts with /south-africa/
            expect(url).toMatch(/^\/south-africa\//);

            // Verify all slug parts are kebab-case
            const parts = url.split('/').filter(s => s.length > 0);
            parts.slice(1).forEach(part => {
              expect(part).toBe(part.toLowerCase());
              expect(part).not.toContain(' ');
              expect(part).toMatch(/^[a-z0-9-]+$/);
              expect(part).not.toMatch(/^-|-$/);
            });

            // Verify URL has exactly 4 path segments
            expect(parts).toHaveLength(4);
            expect(parts[0]).toBe('south-africa');
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('URL Hierarchy Consistency', () => {
    /**
     * Additional property: URLs should maintain hierarchical consistency
     * A suburb URL should contain its parent city URL as a prefix
     */
    it('should maintain hierarchical consistency in URLs', () => {
      fc.assert(
        fc.property(
          locationNameArbitrary,
          locationNameArbitrary,
          locationNameArbitrary,
          (provinceName, cityName, suburbName) => {
            const provinceSlug = generateSlug(provinceName);
            const citySlug = generateSlug(cityName);
            const suburbSlug = generateSlug(suburbName);

            const provinceUrl = generateProvinceUrl(provinceSlug);
            const cityUrl = generateCityUrl(provinceSlug, citySlug);
            const suburbUrl = generateSuburbUrl(provinceSlug, citySlug, suburbSlug);

            // City URL should start with province URL
            expect(cityUrl).toContain(provinceUrl);

            // Suburb URL should start with city URL
            expect(suburbUrl).toContain(cityUrl);

            // Suburb URL should also contain province URL
            expect(suburbUrl).toContain(provinceUrl);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
