/**
 * Property-Based Tests for Property Search Service
 * 
 * Tests correctness properties for:
 * - Property 2: Sort order correctness (Requirements 2.3)
 * - Property 16: Result count accuracy (Requirements 7.1)
 * - Property 14: Pagination info accuracy (Requirements 6.1)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { propertySearchService } from '../propertySearchService';
import { getDb } from '../../db';
import { properties } from '../../../drizzle/schema';
import { inArray } from 'drizzle-orm';
import type { SortOption, PropertyFilters } from '../../../shared/types';

describe('PropertySearchService - Property-Based Tests', () => {
  let db: any;
  let skipTests = false;
  
  // Test data setup
  const testProperties = [
    {
      title: 'Luxury Villa in Sandton',
      description: 'Beautiful villa',
      propertyType: 'house' as const,
      listingType: 'sale' as const,
      transactionType: 'sale' as const,
      price: 5000000,
      bedrooms: 4,
      bathrooms: 3,
      area: 350,
      address: 'Sandton, Johannesburg',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'available' as const,
      featured: 0,
      views: 0,
      enquiries: 0,
      ownerId: 1,
      latitude: '-26.1076',
      longitude: '28.0567',
      createdAt: new Date('2024-01-15'),
    },
    {
      title: 'Modern Apartment in Cape Town',
      description: 'Stylish apartment',
      propertyType: 'apartment' as const,
      listingType: 'sale' as const,
      transactionType: 'sale' as const,
      price: 2500000,
      bedrooms: 2,
      bathrooms: 2,
      area: 120,
      address: 'Sea Point, Cape Town',
      city: 'Cape Town',
      province: 'Western Cape',
      status: 'available' as const,
      featured: 0,
      views: 0,
      enquiries: 0,
      ownerId: 1,
      latitude: '-33.9249',
      longitude: '18.4241',
      createdAt: new Date('2024-02-20'),
    },
    {
      title: 'Townhouse in Durban',
      description: 'Cozy townhouse',
      propertyType: 'townhouse' as const,
      listingType: 'sale' as const,
      transactionType: 'sale' as const,
      price: 1800000,
      bedrooms: 3,
      bathrooms: 2,
      area: 180,
      address: 'Umhlanga, Durban',
      city: 'Durban',
      province: 'KwaZulu-Natal',
      status: 'available' as const,
      featured: 0,
      views: 0,
      enquiries: 0,
      ownerId: 1,
      latitude: '-29.8587',
      longitude: '31.0218',
      createdAt: new Date('2024-03-10'),
    },
    {
      title: 'Affordable House in Pretoria',
      description: 'Great starter home',
      propertyType: 'house' as const,
      listingType: 'sale' as const,
      transactionType: 'sale' as const,
      price: 1200000,
      bedrooms: 3,
      bathrooms: 2,
      area: 150,
      address: 'Centurion, Pretoria',
      city: 'Pretoria',
      province: 'Gauteng',
      status: 'available' as const,
      featured: 0,
      views: 0,
      enquiries: 0,
      ownerId: 1,
      latitude: '-25.8601',
      longitude: '28.1871',
      createdAt: new Date('2024-01-05'),
    },
    {
      title: 'Penthouse in Sandton',
      description: 'Luxury penthouse',
      propertyType: 'apartment' as const,
      listingType: 'sale' as const,
      transactionType: 'sale' as const,
      price: 8000000,
      bedrooms: 3,
      bathrooms: 3,
      area: 250,
      address: 'Sandton, Johannesburg',
      city: 'Johannesburg',
      province: 'Gauteng',
      status: 'available' as const,
      featured: 0,
      views: 0,
      enquiries: 0,
      ownerId: 1,
      latitude: '-26.1076',
      longitude: '28.0567',
      createdAt: new Date('2024-03-25'),
    },
  ];

  let insertedPropertyIds: number[] = [];

  beforeAll(async () => {
    try {
      db = await getDb();
      if (!db) {
        console.warn('⚠️  DATABASE_URL not configured. Skipping property search tests.');
        console.warn('   To run these tests, set DATABASE_URL environment variable.');
        skipTests = true;
        return;
      }
      
      // Insert test properties
      for (const prop of testProperties) {
        const result = await db.insert(properties).values(prop);
        insertedPropertyIds.push(Number(result.insertId));
      }
    } catch (error) {
      console.warn('⚠️  Database connection failed. Skipping property search tests.');
      console.warn('   Error:', error);
      skipTests = true;
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (db && insertedPropertyIds.length > 0) {
      try {
        await db.delete(properties).where(
          inArray(properties.id, insertedPropertyIds)
        );
      } catch (error) {
        console.warn('Failed to clean up test data:', error);
      }
    }
  });

  /**
   * Property 2: Sort order correctness
   * For any list of properties and any sort option, the resulting list should be properly sorted
   * Validates: Requirements 2.3
   */
  describe('Property 2: Sort order correctness', () => {
    it('should correctly sort properties by price ascending', async () => {
      if (skipTests) {
        console.log('Skipping test: DATABASE_URL not configured');
        return;
      }
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            province: fc.constantFrom('Gauteng', 'Western Cape', 'KwaZulu-Natal'),
            minPrice: fc.option(fc.integer({ min: 0, max: 5000000 }), { nil: undefined }),
            maxPrice: fc.option(fc.integer({ min: 5000000, max: 10000000 }), { nil: undefined }),
          }),
          async (filters) => {
            const results = await propertySearchService.searchProperties(
              filters,
              'price_asc',
              1,
              10
            );

            // Verify sort order: each property should have price >= previous
            for (let i = 1; i < results.properties.length; i++) {
              const prevPrice = results.properties[i - 1].price;
              const currPrice = results.properties[i].price;
              expect(currPrice).toBeGreaterThanOrEqual(prevPrice);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should correctly sort properties by price descending', async () => {
      if (skipTests) return;
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            province: fc.constantFrom('Gauteng', 'Western Cape', 'KwaZulu-Natal'),
          }),
          async (filters) => {
            const results = await propertySearchService.searchProperties(
              filters,
              'price_desc',
              1,
              10
            );

            // Verify sort order: each property should have price <= previous
            for (let i = 1; i < results.properties.length; i++) {
              const prevPrice = results.properties[i - 1].price;
              const currPrice = results.properties[i].price;
              expect(currPrice).toBeLessThanOrEqual(prevPrice);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should correctly sort properties by date descending (newest first)', async () => {
      if (skipTests) return;
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            city: fc.constantFrom('Johannesburg', 'Cape Town', 'Durban', 'Pretoria'),
          }),
          async (filters) => {
            const results = await propertySearchService.searchProperties(
              filters,
              'date_desc',
              1,
              10
            );

            // Verify sort order: each property should have date <= previous
            for (let i = 1; i < results.properties.length; i++) {
              const prevDate = results.properties[i - 1].listedDate.getTime();
              const currDate = results.properties[i].listedDate.getTime();
              expect(currDate).toBeLessThanOrEqual(prevDate);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should correctly sort properties by date ascending (oldest first)', async () => {
      if (skipTests) return;
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            propertyType: fc.constantFrom('house', 'apartment', 'townhouse'),
          }),
          async (filters) => {
            const results = await propertySearchService.searchProperties(
              filters as PropertyFilters,
              'date_asc',
              1,
              10
            );

            // Verify sort order: each property should have date >= previous
            for (let i = 1; i < results.properties.length; i++) {
              const prevDate = results.properties[i - 1].listedDate.getTime();
              const currDate = results.properties[i].listedDate.getTime();
              expect(currDate).toBeGreaterThanOrEqual(prevDate);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should correctly sort properties by suburb alphabetically', async () => {
      if (skipTests) return;
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            province: fc.constantFrom('Gauteng', 'Western Cape'),
          }),
          async (filters) => {
            const results = await propertySearchService.searchProperties(
              filters,
              'suburb_asc',
              1,
              10
            );

            // Verify sort order: suburbs should be in alphabetical order
            for (let i = 1; i < results.properties.length; i++) {
              const prevSuburb = results.properties[i - 1].suburb.toLowerCase();
              const currSuburb = results.properties[i].suburb.toLowerCase();
              expect(currSuburb.localeCompare(prevSuburb)).toBeGreaterThanOrEqual(0);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 16: Result count accuracy
   * For any applied filters, the displayed total count should match the actual number of matching properties
   * Validates: Requirements 7.1
   */
  describe('Property 16: Result count accuracy', () => {
    it('should return accurate total count for any filter combination', async () => {
      if (skipTests) return;
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            province: fc.option(fc.constantFrom('Gauteng', 'Western Cape', 'KwaZulu-Natal'), { nil: undefined }),
            city: fc.option(fc.constantFrom('Johannesburg', 'Cape Town', 'Durban', 'Pretoria'), { nil: undefined }),
            minPrice: fc.option(fc.integer({ min: 0, max: 3000000 }), { nil: undefined }),
            maxPrice: fc.option(fc.integer({ min: 3000000, max: 10000000 }), { nil: undefined }),
            minBedrooms: fc.option(fc.integer({ min: 1, max: 3 }), { nil: undefined }),
            propertyType: fc.option(
              fc.array(fc.constantFrom('house', 'apartment', 'townhouse'), { minLength: 1, maxLength: 2 }),
              { nil: undefined }
            ),
          }),
          async (filters) => {
            const results = await propertySearchService.searchProperties(
              filters as PropertyFilters,
              'date_desc',
              1,
              100 // Large page size to get all results
            );

            // The total count should match the number of properties returned
            // when page size is large enough to contain all results
            if (results.properties.length < 100) {
              expect(results.total).toBe(results.properties.length);
            } else {
              // If we hit the page limit, total should be >= properties returned
              expect(results.total).toBeGreaterThanOrEqual(results.properties.length);
            }

            // Total should never be negative
            expect(results.total).toBeGreaterThanOrEqual(0);

            // If there are properties, total should be > 0
            if (results.properties.length > 0) {
              expect(results.total).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain consistent count across multiple page requests', async () => {
      if (skipTests) return;
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            province: fc.constantFrom('Gauteng', 'Western Cape'),
            minPrice: fc.integer({ min: 1000000, max: 3000000 }),
          }),
          async (filters) => {
            // Get first page
            const page1 = await propertySearchService.searchProperties(
              filters,
              'price_asc',
              1,
              2
            );

            // Get second page
            const page2 = await propertySearchService.searchProperties(
              filters,
              'price_asc',
              2,
              2
            );

            // Total count should be the same across pages
            expect(page1.total).toBe(page2.total);
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  /**
   * Property 14: Pagination info accuracy
   * For any result set, the displayed page number and total pages should accurately reflect the data
   * Validates: Requirements 6.1
   */
  describe('Property 14: Pagination info accuracy', () => {
    it('should return accurate pagination information', async () => {
      if (skipTests) return;
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            page: fc.integer({ min: 1, max: 5 }),
            pageSize: fc.integer({ min: 1, max: 10 }),
            province: fc.constantFrom('Gauteng', 'Western Cape', 'KwaZulu-Natal'),
          }),
          async ({ page, pageSize, province }) => {
            const results = await propertySearchService.searchProperties(
              { province },
              'date_desc',
              page,
              pageSize
            );

            // Page number should match requested page
            expect(results.page).toBe(page);

            // Page size should match requested page size
            expect(results.pageSize).toBe(pageSize);

            // Properties returned should not exceed page size
            expect(results.properties.length).toBeLessThanOrEqual(pageSize);

            // Calculate expected hasMore
            const expectedHasMore = (page * pageSize) < results.total;
            expect(results.hasMore).toBe(expectedHasMore);

            // If not on last page, should have hasMore = true
            if (results.properties.length === pageSize && results.total > page * pageSize) {
              expect(results.hasMore).toBe(true);
            }

            // If on last page or beyond, should have hasMore = false
            if (page * pageSize >= results.total) {
              expect(results.hasMore).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should handle edge cases for pagination', async () => {
      if (skipTests) return;
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            pageSize: fc.integer({ min: 1, max: 20 }),
          }),
          async ({ pageSize }) => {
            // Request page 1
            const page1 = await propertySearchService.searchProperties(
              { province: 'Gauteng' },
              'price_asc',
              1,
              pageSize
            );

            // If there are results
            if (page1.total > 0) {
              // First page should have properties
              expect(page1.properties.length).toBeGreaterThan(0);
              expect(page1.properties.length).toBeLessThanOrEqual(Math.min(pageSize, page1.total));

              // Calculate last page number
              const lastPage = Math.ceil(page1.total / pageSize);

              // Request last page
              const lastPageResults = await propertySearchService.searchProperties(
                { province: 'Gauteng' },
                'price_asc',
                lastPage,
                pageSize
              );

              // Last page should not have hasMore
              expect(lastPageResults.hasMore).toBe(false);

              // Last page should have properties
              expect(lastPageResults.properties.length).toBeGreaterThan(0);

              // Request beyond last page
              const beyondLastPage = await propertySearchService.searchProperties(
                { province: 'Gauteng' },
                'price_asc',
                lastPage + 1,
                pageSize
              );

              // Beyond last page should have no properties
              expect(beyondLastPage.properties.length).toBe(0);
              expect(beyondLastPage.hasMore).toBe(false);
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should correctly calculate total pages', async () => {
      if (skipTests) return;
      
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            pageSize: fc.integer({ min: 1, max: 10 }),
            province: fc.constantFrom('Gauteng', 'Western Cape'),
          }),
          async ({ pageSize, province }) => {
            const results = await propertySearchService.searchProperties(
              { province },
              'date_desc',
              1,
              pageSize
            );

            // Calculate expected total pages
            const expectedTotalPages = Math.ceil(results.total / pageSize);

            // Verify by checking if we can access the last page
            if (expectedTotalPages > 0) {
              const lastPage = await propertySearchService.searchProperties(
                { province },
                'date_desc',
                expectedTotalPages,
                pageSize
              );

              // Last page should exist and have properties
              expect(lastPage.properties.length).toBeGreaterThan(0);
              expect(lastPage.hasMore).toBe(false);

              // One page beyond should be empty
              const beyondLast = await propertySearchService.searchProperties(
                { province },
                'date_desc',
                expectedTotalPages + 1,
                pageSize
              );

              expect(beyondLast.properties.length).toBe(0);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
