/**
 * Property-Based Tests for Location Analytics Service
 * 
 * These tests validate the correctness properties defined in the design document
 * using property-based testing with fast-check.
 * 
 * Requirements:
 * - 17.1-17.5: Listing count accuracy
 * - 18.1-18.5: Market statistics calculations
 * 
 * Properties:
 * - Property 21: Province listing count accuracy (Requirements 17.1)
 * - Property 22: City listing count accuracy (Requirements 17.2)
 * - Property 23: Suburb listing count accuracy (Requirements 17.3)
 * - Property 24: Average sale price calculation (Requirements 18.1)
 * - Property 26: Median price calculation (Requirements 18.3)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { getDb } from '../../db';
import { locations, listings, developments } from '../../../drizzle/schema';
import { locationAnalyticsService } from '../locationAnalyticsService';
import { eq, sql } from 'drizzle-orm';

// ============================================================================
// Test Setup and Teardown
// ============================================================================

let db: Awaited<ReturnType<typeof getDb>> | null = null;
let skipTests = false;
let testLocationIds: number[] = [];
let testListingIds: number[] = [];

beforeAll(async () => {
  console.log('[LocationAnalytics PBT] Setting up test database...');
  
  // Initialize database connection
  try {
    db = await getDb();
    if (!db) {
      console.warn('⚠️  DATABASE_URL not configured. Skipping location analytics tests.');
      console.warn('   To run these tests, set DATABASE_URL environment variable.');
      skipTests = true;
      return;
    }
  } catch (error) {
    console.error('Failed to initialize database:', error);
    skipTests = true;
  }
});

afterAll(async () => {
  if (skipTests || !db) {
    return;
  }
  
  console.log('[LocationAnalytics PBT] Cleaning up test data...');
  
  // Clean up test listings
  if (testListingIds.length > 0) {
    await db.delete(listings).where(
      sql`${listings.id} IN (${sql.join(testListingIds.map(id => sql`${id}`), sql`, `)})`
    );
  }
  
  // Clean up test locations
  if (testLocationIds.length > 0) {
    await db.delete(locations).where(
      sql`${locations.id} IN (${sql.join(testLocationIds.map(id => sql`${id}`), sql`, `)})`
    );
  }
});

beforeEach(() => {
  // Reset tracking arrays before each test
  testLocationIds = [];
  testListingIds = [];
});

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a test location
 */
async function createTestLocation(data: {
  name: string;
  type: 'province' | 'city' | 'suburb';
  parentId?: number;
}): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  
  const [result] = await db.insert(locations).values({
    name: data.name,
    slug: data.name.toLowerCase().replace(/\s+/g, '-'),
    type: data.type,
    parentId: data.parentId || null,
    description: `Test ${data.type} ${data.name}`,
    latitude: '-26.0',
    longitude: '28.0',
    propertyCount: 0,
  }).$returningId();
  
  testLocationIds.push(result.id);
  return result.id;
}

/**
 * Create a test listing
 */
async function createTestListing(data: {
  province: string;
  city: string;
  suburb?: string;
  action: 'sell' | 'rent';
  price: number;
  propertyType?: string;
  floorArea?: number;
}): Promise<number> {
  if (!db) throw new Error('Database not initialized');
  
  const [result] = await db.insert(listings).values({
    ownerId: 1, // Test user
    action: data.action,
    propertyType: (data.propertyType || 'house') as any,
    title: `Test Property in ${data.suburb || data.city}`,
    description: 'Test property description',
    askingPrice: data.action === 'sell' ? data.price.toString() : null,
    monthlyRent: data.action === 'rent' ? data.price.toString() : null,
    address: `123 Test St, ${data.suburb || data.city}`,
    latitude: '-26.0',
    longitude: '28.0',
    city: data.city,
    suburb: data.suburb || null,
    province: data.province,
    slug: `test-property-${Date.now()}-${Math.random()}`,
    status: 'published',
    propertyDetails: data.floorArea ? { houseAreaM2: data.floorArea } : {},
  }).$returningId();
  
  testListingIds.push(result.id);
  return result.id;
}

// ============================================================================
// Property-Based Tests
// ============================================================================

describe('LocationAnalyticsService - Property-Based Tests', () => {
  
  /**
   * Property 21: Province listing count accuracy
   * **Validates: Requirements 17.1**
   * 
   * For any province, the displayed listing count should equal the number of
   * listings where location_id references a location within that province's hierarchy
   * 
   * Note: Currently using legacy fields (province, city, suburb) until locationId
   * is added to listings table
   */
  it('Property 21: Province listing count should match actual listings in province', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }
    
    await fc.assert(
      fc.asyncProperty(
        // Generate a province name
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        // Generate number of listings (0-20)
        fc.integer({ min: 0, max: 20 }),
        async (provinceName, listingCount) => {
          // Create test province
          const provinceId = await createTestLocation({
            name: provinceName,
            type: 'province',
          });
          
          // Create test city in province
          const cityId = await createTestLocation({
            name: `${provinceName} City`,
            type: 'city',
            parentId: provinceId,
          });
          
          // Create listings in this province
          const createdListings: number[] = [];
          for (let i = 0; i < listingCount; i++) {
            const listingId = await createTestListing({
              province: provinceName,
              city: `${provinceName} City`,
              suburb: `Suburb ${i}`,
              action: i % 2 === 0 ? 'sell' : 'rent',
              price: 1000000 + (i * 100000),
            });
            createdListings.push(listingId);
          }
          
          // Get statistics
          const stats = await locationAnalyticsService.getLocationStatistics(provinceId);
          
          // Verify listing count matches
          expect(stats.totalListings).toBe(listingCount);
          
          // Clean up
          const db = await getDb();
          if (createdListings.length > 0) {
            await db.delete(listings).where(
              sql`${listings.id} IN (${sql.join(createdListings.map(id => sql`${id}`), sql`, `)})`
            );
          }
          await db.delete(locations).where(eq(locations.id, cityId));
          await db.delete(locations).where(eq(locations.id, provinceId));
        }
      ),
      { numRuns: 10 } // Run 10 times with different inputs
    );
  }, 60000); // 60 second timeout
  
  /**
   * Property 22: City listing count accuracy
   * **Validates: Requirements 17.2**
   * 
   * For any city, the displayed listing count should equal the number of listings
   * where location_id references a location within that city's hierarchy
   */
  it('Property 22: City listing count should match actual listings in city', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 0, max: 15 }),
        async (provinceName, cityName, listingCount) => {
          // Create test province
          const provinceId = await createTestLocation({
            name: provinceName,
            type: 'province',
          });
          
          // Create test city
          const cityId = await createTestLocation({
            name: cityName,
            type: 'city',
            parentId: provinceId,
          });
          
          // Create listings in this city
          const createdListings: number[] = [];
          for (let i = 0; i < listingCount; i++) {
            const listingId = await createTestListing({
              province: provinceName,
              city: cityName,
              suburb: `Suburb ${i}`,
              action: i % 2 === 0 ? 'sell' : 'rent',
              price: 800000 + (i * 50000),
            });
            createdListings.push(listingId);
          }
          
          // Get statistics
          const stats = await locationAnalyticsService.getLocationStatistics(cityId);
          
          // Verify listing count matches
          expect(stats.totalListings).toBe(listingCount);
          
          // Clean up
          const db = await getDb();
          if (createdListings.length > 0) {
            await db.delete(listings).where(
              sql`${listings.id} IN (${sql.join(createdListings.map(id => sql`${id}`), sql`, `)})`
            );
          }
          await db.delete(locations).where(eq(locations.id, cityId));
          await db.delete(locations).where(eq(locations.id, provinceId));
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);
  
  /**
   * Property 23: Suburb listing count accuracy
   * **Validates: Requirements 17.3**
   * 
   * For any suburb, the displayed listing count should equal the number of listings
   * where location_id references that suburb
   */
  it('Property 23: Suburb listing count should match actual listings in suburb', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.integer({ min: 0, max: 10 }),
        async (provinceName, cityName, suburbName, listingCount) => {
          // Create test province
          const provinceId = await createTestLocation({
            name: provinceName,
            type: 'province',
          });
          
          // Create test city
          const cityId = await createTestLocation({
            name: cityName,
            type: 'city',
            parentId: provinceId,
          });
          
          // Create test suburb
          const suburbId = await createTestLocation({
            name: suburbName,
            type: 'suburb',
            parentId: cityId,
          });
          
          // Create listings in this suburb
          const createdListings: number[] = [];
          for (let i = 0; i < listingCount; i++) {
            const listingId = await createTestListing({
              province: provinceName,
              city: cityName,
              suburb: suburbName,
              action: i % 2 === 0 ? 'sell' : 'rent',
              price: 500000 + (i * 25000),
            });
            createdListings.push(listingId);
          }
          
          // Get statistics
          const stats = await locationAnalyticsService.getLocationStatistics(suburbId);
          
          // Verify listing count matches
          expect(stats.totalListings).toBe(listingCount);
          
          // Clean up
          const db = await getDb();
          if (createdListings.length > 0) {
            await db.delete(listings).where(
              sql`${listings.id} IN (${sql.join(createdListings.map(id => sql`${id}`), sql`, `)})`
            );
          }
          await db.delete(locations).where(eq(locations.id, suburbId));
          await db.delete(locations).where(eq(locations.id, cityId));
          await db.delete(locations).where(eq(locations.id, provinceId));
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);
  
  /**
   * Property 24: Average sale price calculation
   * **Validates: Requirements 18.1**
   * 
   * For any location with sale listings, the average sale price should equal
   * the sum of all sale listing prices divided by the count of sale listings
   */
  it('Property 24: Average sale price should be calculated correctly', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.array(fc.integer({ min: 100000, max: 10000000 }), { minLength: 1, maxLength: 10 }),
        async (suburbName, salePrices) => {
          // Create test location hierarchy
          const provinceId = await createTestLocation({
            name: 'Test Province',
            type: 'province',
          });
          
          const cityId = await createTestLocation({
            name: 'Test City',
            type: 'city',
            parentId: provinceId,
          });
          
          const suburbId = await createTestLocation({
            name: suburbName,
            type: 'suburb',
            parentId: cityId,
          });
          
          // Create sale listings with specified prices
          const createdListings: number[] = [];
          for (const price of salePrices) {
            const listingId = await createTestListing({
              province: 'Test Province',
              city: 'Test City',
              suburb: suburbName,
              action: 'sell',
              price,
            });
            createdListings.push(listingId);
          }
          
          // Calculate expected average
          const expectedAvg = Math.round(
            salePrices.reduce((sum, price) => sum + price, 0) / salePrices.length
          );
          
          // Get statistics
          const stats = await locationAnalyticsService.calculatePriceStats(suburbId);
          
          // Verify average sale price matches expected
          expect(stats.avgSalePrice).toBe(expectedAvg);
          
          // Clean up
          const db = await getDb();
          if (createdListings.length > 0) {
            await db.delete(listings).where(
              sql`${listings.id} IN (${sql.join(createdListings.map(id => sql`${id}`), sql`, `)})`
            );
          }
          await db.delete(locations).where(eq(locations.id, suburbId));
          await db.delete(locations).where(eq(locations.id, cityId));
          await db.delete(locations).where(eq(locations.id, provinceId));
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);
  
  /**
   * Property 26: Median price calculation
   * **Validates: Requirements 18.3**
   * 
   * For any location with listings, the median price should be the middle value
   * when all listing prices are sorted
   */
  it('Property 26: Median price should be calculated correctly', async () => {
    if (skipTests || !db) {
      console.log('⏭️  Skipping test - database not available');
      return;
    }
    
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 3, maxLength: 20 }).filter(s => s.trim().length > 0),
        fc.array(fc.integer({ min: 100000, max: 10000000 }), { minLength: 1, maxLength: 15 }),
        async (suburbName, prices) => {
          // Create test location hierarchy
          const provinceId = await createTestLocation({
            name: 'Test Province',
            type: 'province',
          });
          
          const cityId = await createTestLocation({
            name: 'Test City',
            type: 'city',
            parentId: provinceId,
          });
          
          const suburbId = await createTestLocation({
            name: suburbName,
            type: 'suburb',
            parentId: cityId,
          });
          
          // Create listings with specified prices (mix of sale and rent)
          const createdListings: number[] = [];
          for (let i = 0; i < prices.length; i++) {
            const listingId = await createTestListing({
              province: 'Test Province',
              city: 'Test City',
              suburb: suburbName,
              action: i % 2 === 0 ? 'sell' : 'rent',
              price: prices[i],
            });
            createdListings.push(listingId);
          }
          
          // Calculate expected median
          const sortedPrices = [...prices].sort((a, b) => a - b);
          const mid = Math.floor(sortedPrices.length / 2);
          const expectedMedian = sortedPrices.length % 2 === 0
            ? Math.round((sortedPrices[mid - 1] + sortedPrices[mid]) / 2)
            : sortedPrices[mid];
          
          // Get statistics
          const stats = await locationAnalyticsService.calculatePriceStats(suburbId);
          
          // Verify median price matches expected
          expect(stats.medianPrice).toBe(expectedMedian);
          
          // Clean up
          const db = await getDb();
          if (createdListings.length > 0) {
            await db.delete(listings).where(
              sql`${listings.id} IN (${sql.join(createdListings.map(id => sql`${id}`), sql`, `)})`
            );
          }
          await db.delete(locations).where(eq(locations.id, suburbId));
          await db.delete(locations).where(eq(locations.id, cityId));
          await db.delete(locations).where(eq(locations.id, provinceId));
        }
      ),
      { numRuns: 10 }
    );
  }, 60000);
});
