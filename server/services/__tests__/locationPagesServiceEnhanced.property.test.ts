/**
 * Property-Based Tests for Enhanced Location Pages Service
 * 
 * These tests validate universal properties that should hold across all inputs
 * using fast-check for property-based testing.
 * 
 * Requirements:
 * - 27.2: Slug generation format (Property 34)
 * - 29.4: Slug uniqueness within parent (Property 39)
 * - 16.2: Location record creation (Property 19)
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { generateSlug, generateSEOContent } from '../locationPagesServiceEnhanced';

describe('LocationPagesServiceEnhanced - Property Tests', () => {
  
  /**
   * Property 34: Slug generation format
   * Feature: google-places-autocomplete-integration, Property 34: Slug generation format
   * Validates: Requirements 27.2
   * 
   * For any location name, the generated slug should be in kebab-case format
   * (lowercase with hyphens replacing spaces and special characters removed)
   */
  describe('Property 34: Slug generation format', () => {
    it('should generate kebab-case slugs for any location name', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          (locationName) => {
            const slug = generateSlug(locationName);
            
            // Should be lowercase
            expect(slug).toBe(slug.toLowerCase());
            
            // Should not contain spaces
            expect(slug).not.toContain(' ');
            
            // Should only contain lowercase letters, numbers, and hyphens
            expect(slug).toMatch(/^[a-z0-9-]*$/);
            
            // Should not start or end with hyphen (unless empty)
            if (slug.length > 0) {
              expect(slug).not.toMatch(/^-|-$/);
            }
            
            // Should not have consecutive hyphens
            expect(slug).not.toMatch(/--/);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle special characters by removing them', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          (input) => {
            const slug = generateSlug(input);
            
            // Should not contain any special characters except hyphens
            expect(slug).toMatch(/^[a-z0-9-]*$/);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should replace spaces and underscores with hyphens', () => {
      fc.assert(
        fc.property(
          fc.array(fc.string({ minLength: 1, maxLength: 20 }), { minLength: 1, maxLength: 5 }),
          (words) => {
            const input = words.join(' ');
            const slug = generateSlug(input);
            
            // Should not contain spaces
            expect(slug).not.toContain(' ');
            expect(slug).not.toContain('_');
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should produce consistent results for the same input', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (input) => {
            const slug1 = generateSlug(input);
            const slug2 = generateSlug(input);
            
            // Should be deterministic
            expect(slug1).toBe(slug2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Property 39: Slug uniqueness within parent
   * Feature: google-places-autocomplete-integration, Property 39: Slug uniqueness within parent
   * Validates: Requirements 29.4
   * 
   * For any two locations with the same parent_id, their slugs should be unique
   * 
   * Note: This property is tested at the database level in integration tests
   * Here we test that different names produce different slugs
   */
  describe('Property 39: Slug uniqueness within parent', () => {
    it('should generate different slugs for different location names', () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0)
          ).filter(([a, b]) => a.toLowerCase().trim() !== b.toLowerCase().trim()),
          ([name1, name2]) => {
            const slug1 = generateSlug(name1);
            const slug2 = generateSlug(name2);
            
            // Different names should produce different slugs
            // (unless they normalize to the same thing, which is acceptable)
            if (slug1 === slug2) {
              // If slugs are the same, the normalized names should be the same
              const normalized1 = name1.toLowerCase().replace(/[^a-z0-9]/g, '');
              const normalized2 = name2.toLowerCase().replace(/[^a-z0-9]/g, '');
              expect(normalized1).toBe(normalized2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should handle similar names with different special characters', () => {
      const testCases = [
        ['Cape Town', 'Cape-Town', 'Cape_Town'],
        ['Johannesburg', 'Johannesburg!', 'Johannesburg?'],
        ['Port Elizabeth', 'Port  Elizabeth', 'Port   Elizabeth'],
      ];
      
      testCases.forEach(names => {
        const slugs = names.map(generateSlug);
        // All variations should produce the same slug
        const uniqueSlugs = new Set(slugs);
        expect(uniqueSlugs.size).toBe(1);
      });
    });
  });
  
  /**
   * Property 19: Location record creation
   * Feature: google-places-autocomplete-integration, Property 19: Location record creation
   * Validates: Requirements 16.2
   * 
   * For any new suburb added via listing, a location record should be created
   * with name, slug, type, and coordinates
   * 
   * Note: This property is tested at the database level in integration tests
   * Here we test the SEO content generation
   */
  describe('Property 19: Location record creation - SEO content generation', () => {
    it('should generate non-empty SEO content for any location', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('province', 'city', 'suburb', 'neighborhood'),
          }),
          (location) => {
            const seoContent = generateSEOContent(location as any);
            
            // Title should be non-empty
            expect(seoContent.title).toBeTruthy();
            expect(seoContent.title.length).toBeGreaterThan(0);
            
            // Description should be non-empty
            expect(seoContent.description).toBeTruthy();
            expect(seoContent.description.length).toBeGreaterThan(0);
            
            // Title should contain the location name
            expect(seoContent.title).toContain(location.name);
            
            // Description should contain the location name
            expect(seoContent.description).toContain(location.name);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should generate appropriate titles based on location type', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('province', 'city', 'suburb', 'neighborhood'),
          }),
          (location) => {
            const seoContent = generateSEOContent(location as any);
            
            // Title should include location name
            expect(seoContent.title).toContain(location.name);
            
            // Title should include "Properties" or similar real estate terms
            const hasRealEstateTerms = 
              seoContent.title.toLowerCase().includes('properties') ||
              seoContent.title.toLowerCase().includes('property') ||
              seoContent.title.toLowerCase().includes('sale') ||
              seoContent.title.toLowerCase().includes('rent');
            
            expect(hasRealEstateTerms).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
    
    it('should generate descriptions with context about the location', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0),
            type: fc.constantFrom('province', 'city', 'suburb', 'neighborhood'),
          }),
          (location) => {
            const seoContent = generateSEOContent(location as any);
            
            // Description should be substantial (at least 50 characters)
            expect(seoContent.description.length).toBeGreaterThan(50);
            
            // Description should include location name
            expect(seoContent.description).toContain(location.name);
            
            // Description should mention properties or real estate
            const hasRealEstateContext = 
              seoContent.description.toLowerCase().includes('properties') ||
              seoContent.description.toLowerCase().includes('property') ||
              seoContent.description.toLowerCase().includes('listings') ||
              seoContent.description.toLowerCase().includes('houses') ||
              seoContent.description.toLowerCase().includes('apartments');
            
            expect(hasRealEstateContext).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
  
  /**
   * Additional property tests for robustness
   */
  describe('Additional robustness properties', () => {
    it('should handle empty strings gracefully', () => {
      const slug = generateSlug('');
      expect(slug).toBe('');
    });
    
    it('should handle strings with only special characters', () => {
      const slug = generateSlug('!@#$%^&*()');
      expect(slug).toBe('');
    });
    
    it('should handle strings with only spaces', () => {
      const slug = generateSlug('     ');
      expect(slug).toBe('');
    });
    
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(1000);
      const slug = generateSlug(longString);
      expect(slug).toBe(longString);
      expect(slug).toMatch(/^[a-z0-9-]*$/);
    });
    
    it('should handle unicode characters', () => {
      const slug = generateSlug('Café São Paulo');
      // Should remove unicode characters
      expect(slug).toMatch(/^[a-z0-9-]*$/);
      expect(slug).not.toContain('é');
      expect(slug).not.toContain('ã');
    });
  });
});
