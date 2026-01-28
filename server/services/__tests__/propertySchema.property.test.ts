/**
 * Property-Based Tests for Property Results Optimization Database Schema
 *
 * Feature: property-results-optimization, Properties 43 & 44
 *
 * Property 43: Title type display
 * For any property, the title type (Freehold or Sectional Title) should be displayed
 * Validates: Requirements 16.1
 *
 * Property 44: Levy display
 * For any property with a levy > 0, the monthly levy amount should be displayed
 * Validates: Requirements 16.2
 *
 * These tests verify that the database schema correctly stores and retrieves
 * SA-specific property fields including title_type and levy.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fc from 'fast-check';
import { getDb } from '../../db';
import { properties } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Property Results Optimization - Database Schema', () => {
  let testPropertyIds: number[] = [];
  let db: any;

  beforeAll(async () => {
    db = await getDb();
    if (!db) {
      throw new Error('Database connection failed');
    }
  });

  afterAll(async () => {
    // Cleanup: Delete test properties
    if (db && testPropertyIds.length > 0) {
      for (const id of testPropertyIds) {
        try {
          await db.delete(properties).where(eq(properties.id, id));
        } catch (error) {
          console.warn(`Failed to delete test property ${id}:`, error);
        }
      }
    }
  });

  /**
   * Property Test 43: Title type display
   *
   * For any property with a title_type value, when stored and retrieved,
   * the title_type should be preserved exactly.
   */
  it('Property 43: should store and retrieve title_type correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary property data with title_type
        fc.record({
          title: fc.string({ minLength: 10, maxLength: 100 }),
          description: fc.string({ minLength: 20, maxLength: 500 }),
          propertyType: fc.constantFrom('apartment', 'house', 'townhouse', 'villa'),
          listingType: fc.constantFrom('sale', 'rent'),
          transactionType: fc.constantFrom('sale', 'rent'),
          price: fc.integer({ min: 100000, max: 50000000 }),
          bedrooms: fc.integer({ min: 1, max: 6 }),
          bathrooms: fc.integer({ min: 1, max: 4 }),
          area: fc.integer({ min: 50, max: 1000 }),
          address: fc.string({ minLength: 10, maxLength: 200 }),
          city: fc.constantFrom('Johannesburg', 'Cape Town', 'Durban', 'Pretoria'),
          province: fc.constantFrom('Gauteng', 'Western Cape', 'KwaZulu-Natal'),
          suburb: fc.constantFrom('Sandton', 'Camps Bay', 'Umhlanga', 'Hatfield'),
          titleType: fc.constantFrom('freehold', 'sectional'),
          status: fc.constantFrom('available', 'sold', 'rented'),
          featured: fc.boolean(),
          views: fc.integer({ min: 0, max: 1000 }),
          enquiries: fc.integer({ min: 0, max: 100 }),
          ownerId: fc.constant(1), // Assuming user ID 1 exists
        }),
        async propertyData => {
          try {
            // Insert property with title_type
            const [insertedProperty] = await db.insert(properties).values({
              title: propertyData.title,
              description: propertyData.description,
              propertyType: propertyData.propertyType,
              listingType: propertyData.listingType,
              transactionType: propertyData.transactionType,
              price: propertyData.price,
              bedrooms: propertyData.bedrooms,
              bathrooms: propertyData.bathrooms,
              area: propertyData.area,
              address: propertyData.address,
              city: propertyData.city,
              province: propertyData.province,
              suburb: propertyData.suburb,
              titleType: propertyData.titleType,
              status: propertyData.status,
              featured: propertyData.featured ? 1 : 0,
              views: propertyData.views,
              enquiries: propertyData.enquiries,
              ownerId: propertyData.ownerId,
            });

            const propertyId = insertedProperty.insertId;
            testPropertyIds.push(propertyId);

            // Retrieve the property
            const [retrievedProperty] = await db
              .select()
              .from(properties)
              .where(eq(properties.id, propertyId))
              .limit(1);

            // Property 43: Title type should be preserved
            expect(retrievedProperty).toBeDefined();
            expect(retrievedProperty.titleType).toBe(propertyData.titleType);

            // Verify it's one of the valid values
            expect(['freehold', 'sectional']).toContain(retrievedProperty.titleType);

            return true;
          } catch (error: any) {
            console.error('Test iteration failed:', error.message);
            throw error;
          }
        },
      ),
      {
        numRuns: 100, // Run 100 iterations as per spec requirements
        verbose: false,
      },
    );
  });

  /**
   * Property Test 44: Levy display
   *
   * For any property with a levy > 0, when stored and retrieved,
   * the levy amount should be preserved exactly.
   */
  it('Property 44: should store and retrieve levy amount correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary property data with levy
        fc.record({
          title: fc.string({ minLength: 10, maxLength: 100 }),
          description: fc.string({ minLength: 20, maxLength: 500 }),
          propertyType: fc.constantFrom('apartment', 'townhouse'), // Typically sectional title
          listingType: fc.constantFrom('sale', 'rent'),
          transactionType: fc.constantFrom('sale', 'rent'),
          price: fc.integer({ min: 100000, max: 50000000 }),
          bedrooms: fc.integer({ min: 1, max: 6 }),
          bathrooms: fc.integer({ min: 1, max: 4 }),
          area: fc.integer({ min: 50, max: 1000 }),
          address: fc.string({ minLength: 10, maxLength: 200 }),
          city: fc.constantFrom('Johannesburg', 'Cape Town', 'Durban', 'Pretoria'),
          province: fc.constantFrom('Gauteng', 'Western Cape', 'KwaZulu-Natal'),
          suburb: fc.constantFrom('Sandton', 'Camps Bay', 'Umhlanga', 'Hatfield'),
          titleType: fc.constant('sectional'), // Sectional title properties have levies
          levy: fc
            .double({ min: 500, max: 10000, noNaN: true })
            .map(v => Math.round(v * 100) / 100), // Round to 2 decimals
          status: fc.constantFrom('available', 'sold', 'rented'),
          featured: fc.boolean(),
          views: fc.integer({ min: 0, max: 1000 }),
          enquiries: fc.integer({ min: 0, max: 100 }),
          ownerId: fc.constant(1),
        }),
        async propertyData => {
          try {
            // Insert property with levy
            const [insertedProperty] = await db.insert(properties).values({
              title: propertyData.title,
              description: propertyData.description,
              propertyType: propertyData.propertyType,
              listingType: propertyData.listingType,
              transactionType: propertyData.transactionType,
              price: propertyData.price,
              bedrooms: propertyData.bedrooms,
              bathrooms: propertyData.bathrooms,
              area: propertyData.area,
              address: propertyData.address,
              city: propertyData.city,
              province: propertyData.province,
              suburb: propertyData.suburb,
              titleType: propertyData.titleType,
              levy: propertyData.levy,
              status: propertyData.status,
              featured: propertyData.featured ? 1 : 0,
              views: propertyData.views,
              enquiries: propertyData.enquiries,
              ownerId: propertyData.ownerId,
            });

            const propertyId = insertedProperty.insertId;
            testPropertyIds.push(propertyId);

            // Retrieve the property
            const [retrievedProperty] = await db
              .select()
              .from(properties)
              .where(eq(properties.id, propertyId))
              .limit(1);

            // Property 44: Levy should be preserved
            expect(retrievedProperty).toBeDefined();
            expect(retrievedProperty.levy).toBeDefined();

            // Convert to numbers for comparison (database may return string)
            const storedLevy = parseFloat(retrievedProperty.levy);
            const expectedLevy = propertyData.levy;

            // Allow small floating point differences
            expect(Math.abs(storedLevy - expectedLevy)).toBeLessThan(0.01);

            // Verify levy is positive
            expect(storedLevy).toBeGreaterThan(0);

            return true;
          } catch (error: any) {
            console.error('Test iteration failed:', error.message);
            throw error;
          }
        },
      ),
      {
        numRuns: 100,
        verbose: false,
      },
    );
  });

  /**
   * Property Test: SA-specific fields round-trip
   *
   * For any property with all SA-specific fields populated,
   * all fields should be preserved when stored and retrieved.
   */
  it('should store and retrieve all SA-specific fields correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 10, maxLength: 100 }),
          description: fc.string({ minLength: 20, maxLength: 500 }),
          propertyType: fc.constantFrom('apartment', 'house', 'townhouse'),
          listingType: fc.constantFrom('sale', 'rent'),
          transactionType: fc.constantFrom('sale', 'rent'),
          price: fc.integer({ min: 100000, max: 50000000 }),
          bedrooms: fc.integer({ min: 1, max: 6 }),
          bathrooms: fc.integer({ min: 1, max: 4 }),
          area: fc.integer({ min: 50, max: 1000 }),
          address: fc.string({ minLength: 10, maxLength: 200 }),
          city: fc.constantFrom('Johannesburg', 'Cape Town', 'Durban'),
          province: fc.constantFrom('Gauteng', 'Western Cape', 'KwaZulu-Natal'),
          suburb: fc.constantFrom('Sandton', 'Camps Bay', 'Umhlanga'),
          titleType: fc.constantFrom('freehold', 'sectional'),
          levy: fc.option(
            fc.double({ min: 500, max: 10000, noNaN: true }).map(v => Math.round(v * 100) / 100),
            { nil: null },
          ),
          ratesEstimate: fc.option(
            fc.double({ min: 200, max: 5000, noNaN: true }).map(v => Math.round(v * 100) / 100),
            { nil: null },
          ),
          securityEstate: fc.boolean(),
          petFriendly: fc.boolean(),
          fibreReady: fc.boolean(),
          loadSheddingSolutions: fc.array(fc.constantFrom('solar', 'generator', 'inverter'), {
            minLength: 0,
            maxLength: 3,
          }),
          erfSize: fc.option(
            fc.double({ min: 100, max: 10000, noNaN: true }).map(v => Math.round(v * 100) / 100),
            { nil: null },
          ),
          floorSize: fc.option(
            fc.double({ min: 50, max: 1000, noNaN: true }).map(v => Math.round(v * 100) / 100),
            { nil: null },
          ),
          status: fc.constantFrom('available', 'sold', 'rented'),
          featured: fc.boolean(),
          views: fc.integer({ min: 0, max: 1000 }),
          enquiries: fc.integer({ min: 0, max: 100 }),
          ownerId: fc.constant(1),
        }),
        async propertyData => {
          try {
            // Insert property with all SA-specific fields
            const [insertedProperty] = await db.insert(properties).values({
              title: propertyData.title,
              description: propertyData.description,
              propertyType: propertyData.propertyType,
              listingType: propertyData.listingType,
              transactionType: propertyData.transactionType,
              price: propertyData.price,
              bedrooms: propertyData.bedrooms,
              bathrooms: propertyData.bathrooms,
              area: propertyData.area,
              address: propertyData.address,
              city: propertyData.city,
              province: propertyData.province,
              suburb: propertyData.suburb,
              titleType: propertyData.titleType,
              levy: propertyData.levy,
              ratesEstimate: propertyData.ratesEstimate,
              securityEstate: propertyData.securityEstate,
              petFriendly: propertyData.petFriendly,
              fibreReady: propertyData.fibreReady,
              loadSheddingSolutions: JSON.stringify(propertyData.loadSheddingSolutions),
              erfSize: propertyData.erfSize,
              floorSize: propertyData.floorSize,
              status: propertyData.status,
              featured: propertyData.featured ? 1 : 0,
              views: propertyData.views,
              enquiries: propertyData.enquiries,
              ownerId: propertyData.ownerId,
            });

            const propertyId = insertedProperty.insertId;
            testPropertyIds.push(propertyId);

            // Retrieve the property
            const [retrievedProperty] = await db
              .select()
              .from(properties)
              .where(eq(properties.id, propertyId))
              .limit(1);

            // Verify all SA-specific fields are preserved
            expect(retrievedProperty).toBeDefined();
            expect(retrievedProperty.titleType).toBe(propertyData.titleType);
            expect(retrievedProperty.securityEstate).toBe(propertyData.securityEstate ? 1 : 0);
            expect(retrievedProperty.petFriendly).toBe(propertyData.petFriendly ? 1 : 0);
            expect(retrievedProperty.fibreReady).toBe(propertyData.fibreReady ? 1 : 0);

            // Check numeric fields with tolerance
            if (propertyData.levy !== null) {
              const storedLevy = parseFloat(retrievedProperty.levy);
              expect(Math.abs(storedLevy - propertyData.levy)).toBeLessThan(0.01);
            }

            if (propertyData.ratesEstimate !== null) {
              const storedRates = parseFloat(retrievedProperty.ratesEstimate);
              expect(Math.abs(storedRates - propertyData.ratesEstimate)).toBeLessThan(0.01);
            }

            if (propertyData.erfSize !== null) {
              const storedErf = parseFloat(retrievedProperty.erfSize);
              expect(Math.abs(storedErf - propertyData.erfSize)).toBeLessThan(0.01);
            }

            if (propertyData.floorSize !== null) {
              const storedFloor = parseFloat(retrievedProperty.floorSize);
              expect(Math.abs(storedFloor - propertyData.floorSize)).toBeLessThan(0.01);
            }

            // Check JSON field
            const storedSolutions = JSON.parse(retrievedProperty.loadSheddingSolutions || '[]');
            expect(storedSolutions).toEqual(propertyData.loadSheddingSolutions);

            return true;
          } catch (error: any) {
            console.error('Test iteration failed:', error.message);
            throw error;
          }
        },
      ),
      {
        numRuns: 100,
        verbose: false,
      },
    );
  });
});
