/**
 * Property-Based Tests for Property Filters Store
 *
 * Feature: property-results-optimization, Properties 3 & 4
 *
 * Property 3: URL filter synchronization
 * For any filter state, the URL parameters should accurately represent those filters
 * Validates: Requirements 2.4
 *
 * Property 4: Filter state round-trip
 * For any filter state, converting to URL parameters and back should preserve the exact filter state
 * Validates: Requirements 2.5
 *
 * These tests verify that the property filters store correctly synchronizes
 * filter state with URL parameters and localStorage.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { usePropertyFiltersStore } from '../propertyFiltersStore';
import type { PropertyFilters } from '../../../../shared/types';

describe('Property Filters Store - URL Synchronization', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = usePropertyFiltersStore.getState();
    store.resetFilters();
  });

  /**
   * Property Test 3: URL filter synchronization
   *
   * For any filter state, when converted to URL parameters,
   * the URL should accurately represent all active filters.
   */
  it('Property 3: should accurately represent filter state in URL parameters', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary filter state
        fc.record({
          // Location filters
          province: fc.option(
            fc.constantFrom('Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape'),
            { nil: undefined },
          ),
          city: fc.option(fc.constantFrom('Johannesburg', 'Cape Town', 'Durban', 'Pretoria'), {
            nil: undefined,
          }),
          suburb: fc.option(
            fc.array(fc.constantFrom('Sandton', 'Camps Bay', 'Umhlanga', 'Hatfield'), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined },
          ),

          // Basic filters
          propertyType: fc.option(
            fc.array(fc.constantFrom('house', 'apartment', 'townhouse', 'plot', 'commercial'), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined },
          ),
          listingType: fc.option(fc.constantFrom('sale', 'rent'), { nil: undefined }),
          minPrice: fc.option(fc.integer({ min: 100000, max: 5000000 }), { nil: undefined }),
          maxPrice: fc.option(fc.integer({ min: 5000000, max: 50000000 }), { nil: undefined }),
          minBedrooms: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
          maxBedrooms: fc.option(fc.integer({ min: 2, max: 10 }), { nil: undefined }),
          minBathrooms: fc.option(fc.integer({ min: 1, max: 4 }), { nil: undefined }),

          // Size filters
          minErfSize: fc.option(fc.integer({ min: 100, max: 1000 }), { nil: undefined }),
          maxErfSize: fc.option(fc.integer({ min: 1000, max: 10000 }), { nil: undefined }),
          minFloorSize: fc.option(fc.integer({ min: 50, max: 200 }), { nil: undefined }),
          maxFloorSize: fc.option(fc.integer({ min: 200, max: 1000 }), { nil: undefined }),

          // SA-specific filters
          titleType: fc.option(
            fc.array(fc.constantFrom('freehold', 'sectional'), { minLength: 1, maxLength: 2 }),
            { nil: undefined },
          ),
          maxLevy: fc.option(fc.integer({ min: 500, max: 10000 }), { nil: undefined }),
          securityEstate: fc.option(fc.boolean(), { nil: undefined }),
          petFriendly: fc.option(fc.boolean(), { nil: undefined }),
          fibreReady: fc.option(fc.boolean(), { nil: undefined }),
          loadSheddingSolutions: fc.option(
            fc.array(fc.constantFrom('solar', 'generator', 'inverter', 'none'), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined },
          ),

          // Status filters
          status: fc.option(
            fc.array(fc.constantFrom('available', 'under_offer', 'sold', 'let'), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined },
          ),
        }),
        filterData => {
          const store = usePropertyFiltersStore.getState();

          // Set the filters in the store
          store.setFilters(filterData as PropertyFilters);

          // Convert to URL parameters
          const urlParams = store.syncToUrl();

          // Verify each filter is represented in URL
          if (filterData.province) {
            expect(urlParams.get('province')).toBe(filterData.province);
          }

          if (filterData.city) {
            expect(urlParams.get('city')).toBe(filterData.city);
          }

          if (filterData.suburb && filterData.suburb.length > 0) {
            expect(urlParams.get('suburb')).toBe(filterData.suburb.join(','));
          }

          if (filterData.propertyType && filterData.propertyType.length > 0) {
            expect(urlParams.get('propertyType')).toBe(filterData.propertyType.join(','));
          }

          if (filterData.listingType) {
            expect(urlParams.get('listingType')).toBe(filterData.listingType);
          }

          if (filterData.minPrice !== undefined) {
            expect(urlParams.get('minPrice')).toBe(String(filterData.minPrice));
          }

          if (filterData.maxPrice !== undefined) {
            expect(urlParams.get('maxPrice')).toBe(String(filterData.maxPrice));
          }

          if (filterData.minBedrooms !== undefined) {
            expect(urlParams.get('minBedrooms')).toBe(String(filterData.minBedrooms));
          }

          if (filterData.maxBedrooms !== undefined) {
            expect(urlParams.get('maxBedrooms')).toBe(String(filterData.maxBedrooms));
          }

          if (filterData.minBathrooms !== undefined) {
            expect(urlParams.get('minBathrooms')).toBe(String(filterData.minBathrooms));
          }

          if (filterData.minErfSize !== undefined) {
            expect(urlParams.get('minErfSize')).toBe(String(filterData.minErfSize));
          }

          if (filterData.maxErfSize !== undefined) {
            expect(urlParams.get('maxErfSize')).toBe(String(filterData.maxErfSize));
          }

          if (filterData.minFloorSize !== undefined) {
            expect(urlParams.get('minFloorSize')).toBe(String(filterData.minFloorSize));
          }

          if (filterData.maxFloorSize !== undefined) {
            expect(urlParams.get('maxFloorSize')).toBe(String(filterData.maxFloorSize));
          }

          if (filterData.titleType && filterData.titleType.length > 0) {
            expect(urlParams.get('titleType')).toBe(filterData.titleType.join(','));
          }

          if (filterData.maxLevy !== undefined) {
            expect(urlParams.get('maxLevy')).toBe(String(filterData.maxLevy));
          }

          if (filterData.securityEstate !== undefined) {
            expect(urlParams.get('securityEstate')).toBe(String(filterData.securityEstate));
          }

          if (filterData.petFriendly !== undefined) {
            expect(urlParams.get('petFriendly')).toBe(String(filterData.petFriendly));
          }

          if (filterData.fibreReady !== undefined) {
            expect(urlParams.get('fibreReady')).toBe(String(filterData.fibreReady));
          }

          if (filterData.loadSheddingSolutions && filterData.loadSheddingSolutions.length > 0) {
            expect(urlParams.get('loadSheddingSolutions')).toBe(
              filterData.loadSheddingSolutions.join(','),
            );
          }

          if (filterData.status && filterData.status.length > 0) {
            expect(urlParams.get('status')).toBe(filterData.status.join(','));
          }

          return true;
        },
      ),
      {
        numRuns: 100, // Run 100 iterations as per spec requirements
        verbose: false,
      },
    );
  });

  /**
   * Property Test 4: Filter state round-trip
   *
   * For any filter state, converting to URL parameters and back
   * should preserve the exact filter state.
   */
  it('Property 4: should preserve filter state through URL round-trip', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary filter state
        fc.record({
          // Location filters
          province: fc.option(
            fc.constantFrom('Gauteng', 'Western Cape', 'KwaZulu-Natal', 'Eastern Cape'),
            { nil: undefined },
          ),
          city: fc.option(fc.constantFrom('Johannesburg', 'Cape Town', 'Durban', 'Pretoria'), {
            nil: undefined,
          }),
          suburb: fc.option(
            fc.array(fc.constantFrom('Sandton', 'Camps Bay', 'Umhlanga', 'Hatfield'), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined },
          ),

          // Basic filters
          propertyType: fc.option(
            fc.array(fc.constantFrom('house', 'apartment', 'townhouse', 'plot', 'commercial'), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined },
          ),
          listingType: fc.option(fc.constantFrom('sale', 'rent'), { nil: undefined }),
          minPrice: fc.option(fc.integer({ min: 100000, max: 5000000 }), { nil: undefined }),
          maxPrice: fc.option(fc.integer({ min: 5000000, max: 50000000 }), { nil: undefined }),
          minBedrooms: fc.option(fc.integer({ min: 1, max: 5 }), { nil: undefined }),
          maxBedrooms: fc.option(fc.integer({ min: 2, max: 10 }), { nil: undefined }),
          minBathrooms: fc.option(fc.integer({ min: 1, max: 4 }), { nil: undefined }),

          // Size filters
          minErfSize: fc.option(fc.integer({ min: 100, max: 1000 }), { nil: undefined }),
          maxErfSize: fc.option(fc.integer({ min: 1000, max: 10000 }), { nil: undefined }),
          minFloorSize: fc.option(fc.integer({ min: 50, max: 200 }), { nil: undefined }),
          maxFloorSize: fc.option(fc.integer({ min: 200, max: 1000 }), { nil: undefined }),

          // SA-specific filters
          titleType: fc.option(
            fc.array(fc.constantFrom('freehold', 'sectional'), { minLength: 1, maxLength: 2 }),
            { nil: undefined },
          ),
          maxLevy: fc.option(fc.integer({ min: 500, max: 10000 }), { nil: undefined }),
          securityEstate: fc.option(fc.boolean(), { nil: undefined }),
          petFriendly: fc.option(fc.boolean(), { nil: undefined }),
          fibreReady: fc.option(fc.boolean(), { nil: undefined }),
          loadSheddingSolutions: fc.option(
            fc.array(fc.constantFrom('solar', 'generator', 'inverter', 'none'), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined },
          ),

          // Status filters
          status: fc.option(
            fc.array(fc.constantFrom('available', 'under_offer', 'sold', 'let'), {
              minLength: 1,
              maxLength: 3,
            }),
            { nil: undefined },
          ),
        }),
        originalFilters => {
          const store = usePropertyFiltersStore.getState();

          // Step 1: Set the original filters
          store.setFilters(originalFilters as PropertyFilters);
          const stateAfterSet = store.filters;

          // Step 2: Convert to URL parameters
          const urlParams = store.syncToUrl();

          // Step 3: Reset the store
          store.resetFilters();

          // Step 4: Restore from URL parameters
          store.syncFromUrl(urlParams);
          const stateAfterRestore = store.filters;

          // Step 5: Verify all filters are preserved

          // Location filters
          expect(stateAfterRestore.province).toBe(stateAfterSet.province);
          expect(stateAfterRestore.city).toBe(stateAfterSet.city);
          expect(stateAfterRestore.suburb).toEqual(stateAfterSet.suburb);

          // Basic filters
          expect(stateAfterRestore.propertyType).toEqual(stateAfterSet.propertyType);
          expect(stateAfterRestore.listingType).toBe(stateAfterSet.listingType);
          expect(stateAfterRestore.minPrice).toBe(stateAfterSet.minPrice);
          expect(stateAfterRestore.maxPrice).toBe(stateAfterSet.maxPrice);
          expect(stateAfterRestore.minBedrooms).toBe(stateAfterSet.minBedrooms);
          expect(stateAfterRestore.maxBedrooms).toBe(stateAfterSet.maxBedrooms);
          expect(stateAfterRestore.minBathrooms).toBe(stateAfterSet.minBathrooms);

          // Size filters
          expect(stateAfterRestore.minErfSize).toBe(stateAfterSet.minErfSize);
          expect(stateAfterRestore.maxErfSize).toBe(stateAfterSet.maxErfSize);
          expect(stateAfterRestore.minFloorSize).toBe(stateAfterSet.minFloorSize);
          expect(stateAfterRestore.maxFloorSize).toBe(stateAfterSet.maxFloorSize);

          // SA-specific filters
          expect(stateAfterRestore.titleType).toEqual(stateAfterSet.titleType);
          expect(stateAfterRestore.maxLevy).toBe(stateAfterSet.maxLevy);
          expect(stateAfterRestore.securityEstate).toBe(stateAfterSet.securityEstate);
          expect(stateAfterRestore.petFriendly).toBe(stateAfterSet.petFriendly);
          expect(stateAfterRestore.fibreReady).toBe(stateAfterSet.fibreReady);
          expect(stateAfterRestore.loadSheddingSolutions).toEqual(
            stateAfterSet.loadSheddingSolutions,
          );

          // Status filters
          expect(stateAfterRestore.status).toEqual(stateAfterSet.status);

          return true;
        },
      ),
      {
        numRuns: 100, // Run 100 iterations as per spec requirements
        verbose: false,
      },
    );
  });

  /**
   * Additional test: Verify sort and view mode are included in URL
   */
  it('should include sort option and view mode in URL parameters', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(
          'price_asc',
          'price_desc',
          'date_desc',
          'date_asc',
          'suburb_asc',
          'suburb_desc',
        ),
        fc.constantFrom('list', 'grid', 'map'),
        fc.integer({ min: 1, max: 10 }),
        (sortOption, viewMode, page) => {
          const store = usePropertyFiltersStore.getState();

          // Set sort, view, and page
          store.setSortOption(sortOption);
          store.setViewMode(viewMode);
          store.setPage(page);

          // Convert to URL
          const urlParams = store.syncToUrl();

          // Verify sort is in URL (unless it's the default)
          if (sortOption !== 'date_desc') {
            expect(urlParams.get('sort')).toBe(sortOption);
          }

          // Verify view is in URL (unless it's the default)
          if (viewMode !== 'list') {
            expect(urlParams.get('view')).toBe(viewMode);
          }

          // Verify page is in URL (unless it's page 1)
          if (page > 1) {
            expect(urlParams.get('page')).toBe(String(page));
          }

          return true;
        },
      ),
      {
        numRuns: 100,
        verbose: false,
      },
    );
  });
});
