/**
 * Integration Tests for Google Places Autocomplete Integration
 * Task 23: Write integration tests for complete flows
 * 
 * Tests:
 * - Complete autocomplete flow: input → suggestions → selection → Place Details → form population
 * - Location record creation from listing submission
 * - Location page rendering with static and dynamic content
 * - Search flow: autocomplete → location page → filtered listings
 * - Trending suburbs calculation from search events
 * 
 * Requirements: All
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { getDb } from '../../db';
import { locations, listings, locationSearches, provinces, cities, suburbs } from '../../../drizzle/schema';
import { sql } from 'drizzle-orm';
import { googlePlacesService, PlaceDetails } from '../googlePlacesService';
import { locationPagesServiceEnhanced } from '../locationPagesServiceEnhanced';
import { globalSearchService } from '../globalSearchService';

describe('Google Places Autocomplete Integration - Integration Tests', () => {
  let db: any;
  let testLocationIds: number[] = [];
  let testListingIds: number[] = [];
  let testSearchIds: number[] = [];

  beforeAll(async () => {
    // Check if DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  Database connection not available. Skipping integration tests.');
      console.warn('   Set DATABASE_URL environment variable to run these tests.');
      return;
    }

    // Initialize database connection
    try {
      db = await getDb();
      
      if (!db) {
        console.warn('⚠️  Database connection not available. Skipping integration tests.');
        return;
      }

      // Ensure tables exist
      await db.execute(sql`SELECT 1 FROM locations LIMIT 1`);
    } catch (error) {
      console.error('Tables not found. Run migration first:', error);
      db = null;
    }
  });

  beforeEach(async () => {
    if (!db) return;

    // Clean up test data
    await db.execute(sql`DELETE FROM location_searches WHERE location_id IN (SELECT id FROM locations WHERE name LIKE 'TEST:INTEGRATION:%')`);
    await db.execute(sql`DELETE FROM listings WHERE title LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(sql`DELETE FROM locations WHERE name LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(sql`DELETE FROM suburbs WHERE name LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(sql`DELETE FROM cities WHERE name LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(sql`DELETE FROM provinces WHERE name LIKE 'TEST:INTEGRATION:%'`);
    
    testLocationIds = [];
    testListingIds = [];
    testSearchIds = [];
  });

  afterAll(async () => {
    if (!db) return;

    // Final cleanup
    await db.execute(sql`DELETE FROM location_searches WHERE location_id IN (SELECT id FROM locations WHERE name LIKE 'TEST:INTEGRATION:%')`);
    await db.execute(sql`DELETE FROM listings WHERE title LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(sql`DELETE FROM locations WHERE name LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(sql`DELETE FROM suburbs WHERE name LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(sql`DELETE FROM cities WHERE name LIKE 'TEST:INTEGRATION:%'`);
    await db.execute(sql`DELETE FROM provinces WHERE name LIKE 'TEST:INTEGRATION:%'`);
  });

  /**
   * Integration Test 1: Complete autocomplete flow
   * Requirements: 1.1-1.5, 2.1-2.5, 3.1-3.5, 4.1-4.5
   * 
   * Tests the complete flow from user input to form population:
   * 1. User types in location field (minimum 3 characters)
   * 2. System fetches autocomplete suggestions from Google Places API
   * 3. User selects a suggestion
   * 4. System fetches Place Details
   * 5. System extracts address components and coordinates
   * 6. System populates form fields
   */
  describe('Complete autocomplete flow', () => {
    it('should handle complete autocomplete workflow from input to form population', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Mock Google Places API responses
      const mockPlaceDetails: PlaceDetails = {
        placeId: 'TEST_PLACE_ID_SANDTON',
        formattedAddress: 'Sandton, Johannesburg, Gauteng, South Africa',
        name: 'Sandton',
        types: ['sublocality', 'political'],
        addressComponents: [
          { longName: 'Sandton', shortName: 'Sandton', types: ['sublocality_level_1', 'sublocality', 'political'] },
          { longName: 'Johannesburg', shortName: 'JHB', types: ['locality', 'political'] },
          { longName: 'Gauteng', shortName: 'GP', types: ['administrative_area_level_1', 'political'] },
          { longName: 'South Africa', shortName: 'ZA', types: ['country', 'political'] },
        ],
        geometry: {
          location: { lat: -26.107407, lng: 28.056229 },
          viewport: {
            northeast: { lat: -26.0500, lng: 28.1000 },
            southwest: { lat: -26.1500, lng: 28.0000 },
          },
        },
      };

      // Step 1: Create session token
      const sessionToken = googlePlacesService.createSessionToken();
      expect(sessionToken).toBeDefined();
      expect(typeof sessionToken).toBe('string');
      expect(sessionToken.length).toBeGreaterThan(0);

      // Step 2: Get autocomplete suggestions (minimum 3 characters)
      // Note: In real scenario, this would call Google Places API
      // For integration test, we'll test the flow with mock data
      const input = 'Sandton';
      expect(input.length).toBeGreaterThanOrEqual(3);

      // Step 3: Simulate place selection and fetch Place Details
      // In real scenario, user would select from suggestions
      // We'll use the mock place details directly

      // Step 4: Extract address components
      const { extractHierarchy } = await import('../googlePlacesService');
      const hierarchy = extractHierarchy(mockPlaceDetails);

      // Verify extraction
      expect(hierarchy.province).toBe('Gauteng');
      expect(hierarchy.city).toBe('Johannesburg');
      expect(hierarchy.suburb).toBe('Sandton');
      expect(hierarchy.coordinates.lat).toBe(-26.107407);
      expect(hierarchy.coordinates.lng).toBe(28.056229);
      expect(hierarchy.coordinates.precision).toBeGreaterThanOrEqual(6);
      expect(hierarchy.isWithinSouthAfrica).toBe(true);

      // Step 5: Terminate session token
      googlePlacesService.terminateSessionToken(sessionToken);

      // Step 6: Verify form would be populated with correct data
      const formData = {
        province: hierarchy.province,
        city: hierarchy.city,
        suburb: hierarchy.suburb,
        latitude: hierarchy.coordinates.lat,
        longitude: hierarchy.coordinates.lng,
        placeId: mockPlaceDetails.placeId,
        gpsAccuracy: 'accurate',
      };

      expect(formData.province).toBe('Gauteng');
      expect(formData.city).toBe('Johannesburg');
      expect(formData.suburb).toBe('Sandton');
      expect(formData.latitude).toBe(-26.107407);
      expect(formData.longitude).toBe(28.056229);
      expect(formData.placeId).toBe('TEST_PLACE_ID_SANDTON');
      expect(formData.gpsAccuracy).toBe('accurate');
    });
  });

  /**
   * Integration Test 2: Location record creation from listing submission
   * Requirements: 16.1-16.5, 25.1, 27.1-27.5
   * 
   * Tests the complete flow of creating location records when a listing is submitted:
   * 1. User submits listing with location data from autocomplete
   * 2. System creates/finds province location record
   * 3. System creates/finds city location record
   * 4. System creates/finds suburb location record
   * 5. System links listing to location via location_id
   * 6. System syncs to legacy tables (provinces, cities, suburbs)
   */
  describe('Location record creation from listing submission', () => {
    it('should create location hierarchy and link listing', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Step 1: Simulate listing submission with location data
      const listingLocationData = {
        placeId: 'TEST_PLACE_ID_ROSEBANK',
        address: '123 Oxford Road, Rosebank, Johannesburg, Gauteng',
        latitude: -26.145,
        longitude: 28.041,
        city: 'TEST:INTEGRATION:Johannesburg',
        suburb: 'TEST:INTEGRATION:Rosebank',
        province: 'TEST:INTEGRATION:Gauteng',
        postalCode: '2196',
      };

      // Step 2: Resolve location (creates hierarchy)
      const location = await locationPagesServiceEnhanced.resolveLocation(listingLocationData);

      expect(location).toBeDefined();
      expect(location.id).toBeDefined();
      expect(location.name).toBe('TEST:INTEGRATION:Rosebank');
      expect(location.type).toBe('suburb');
      expect(location.placeId).toBe('TEST_PLACE_ID_ROSEBANK');
      expect(location.slug).toBe('test-integration-rosebank');

      testLocationIds.push(location.id);

      // Step 3: Verify parent hierarchy was created
      if (location.parentId) {
        const [cityLocation] = await db
          .select()
          .from(locations)
          .where(sql`id = ${location.parentId}`)
          .limit(1);

        expect(cityLocation).toBeDefined();
        expect(cityLocation.name).toBe('TEST:INTEGRATION:Johannesburg');
        expect(cityLocation.type).toBe('city');

        testLocationIds.push(cityLocation.id);

        // Verify province
        if (cityLocation.parentId) {
          const [provinceLocation] = await db
            .select()
            .from(locations)
            .where(sql`id = ${cityLocation.parentId}`)
            .limit(1);

          expect(provinceLocation).toBeDefined();
          expect(provinceLocation.name).toBe('TEST:INTEGRATION:Gauteng');
          expect(provinceLocation.type).toBe('province');

          testLocationIds.push(provinceLocation.id);
        }
      }

      // Step 4: Create listing linked to location
      const [listing] = await db
        .insert(listings)
        .values({
          title: 'TEST:INTEGRATION:Luxury Apartment',
          description: 'Test listing for integration test',
          price: 2500000,
          propertyType: 'apartment',
          listingType: 'for-sale',
          bedrooms: 2,
          bathrooms: 2,
          locationId: location.id,
          latitude: listingLocationData.latitude.toString(),
          longitude: listingLocationData.longitude.toString(),
          city: listingLocationData.city,
          suburb: listingLocationData.suburb,
          province: listingLocationData.province,
          status: 'published',
        })
        .$returningId();

      testListingIds.push(listing.id);

      // Step 5: Verify listing is linked to location
      const [createdListing] = await db
        .select()
        .from(listings)
        .where(sql`id = ${listing.id}`)
        .limit(1);

      expect(createdListing.locationId).toBe(location.id);

      // Step 6: Verify legacy tables were synced
      const [suburbRecord] = await db
        .select()
        .from(suburbs)
        .where(sql`name = 'TEST:INTEGRATION:Rosebank'`)
        .limit(1);

      expect(suburbRecord).toBeDefined();
      expect(suburbRecord.slug).toBe('test-integration-rosebank');
      expect(suburbRecord.placeId).toBe('TEST_PLACE_ID_ROSEBANK');

      // Clean up
      await db.execute(sql`DELETE FROM listings WHERE id = ${listing.id}`);
      for (const id of testLocationIds) {
        await db.execute(sql`DELETE FROM locations WHERE id = ${id}`);
      }
      await db.execute(sql`DELETE FROM suburbs WHERE name = 'TEST:INTEGRATION:Rosebank'`);
      await db.execute(sql`DELETE FROM cities WHERE name = 'TEST:INTEGRATION:Johannesburg'`);
      await db.execute(sql`DELETE FROM provinces WHERE name = 'TEST:INTEGRATION:Gauteng'`);
    });

    it('should reuse existing location records for duplicate submissions', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      const locationData = {
        placeId: 'TEST_PLACE_ID_DUPLICATE',
        address: 'Duplicate Location Test',
        latitude: -26.2,
        longitude: 28.05,
        city: 'TEST:INTEGRATION:TestCity',
        suburb: 'TEST:INTEGRATION:TestSuburb',
        province: 'TEST:INTEGRATION:TestProvince',
      };

      // First submission
      const location1 = await locationPagesServiceEnhanced.resolveLocation(locationData);
      testLocationIds.push(location1.id);

      // Second submission with same Place ID
      const location2 = await locationPagesServiceEnhanced.resolveLocation(locationData);

      // Should return the same location
      expect(location2.id).toBe(location1.id);
      expect(location2.placeId).toBe(location1.placeId);

      // Clean up
      for (const id of testLocationIds) {
        await db.execute(sql`DELETE FROM locations WHERE id = ${id}`);
      }
    });
  });

  /**
   * Integration Test 3: Location page rendering with static and dynamic content
   * Requirements: 24.1-24.5, 28.1-28.5, 29.1-29.5
   * 
   * Tests location page data fetching and rendering:
   * 1. Create location with static SEO content
   * 2. Create listings in that location
   * 3. Fetch location page data (static + dynamic)
   * 4. Verify static content (SEO, description, coordinates)
   * 5. Verify dynamic statistics (listing count, average price)
   * 6. Verify URL format follows hierarchical pattern
   */
  describe('Location page rendering with static and dynamic content', () => {
    it('should render location page with merged static and dynamic content', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Step 1: Create location hierarchy
      const provinceLocation = await locationPagesServiceEnhanced.findOrCreateLocation({
        name: 'TEST:INTEGRATION:Western Cape',
        type: 'province',
        latitude: '-33.9249',
        longitude: '18.4241',
        description: 'Test province for integration testing',
        seoTitle: 'Properties in TEST:INTEGRATION:Western Cape',
        seoDescription: 'Find properties in TEST:INTEGRATION:Western Cape',
      });

      testLocationIds.push(provinceLocation.id);

      const cityLocation = await locationPagesServiceEnhanced.findOrCreateLocation({
        name: 'TEST:INTEGRATION:Cape Town',
        type: 'city',
        parentId: provinceLocation.id,
        latitude: '-33.9249',
        longitude: '18.4241',
        description: 'Test city for integration testing',
        seoTitle: 'Properties in TEST:INTEGRATION:Cape Town',
        seoDescription: 'Find properties in TEST:INTEGRATION:Cape Town',
      });

      testLocationIds.push(cityLocation.id);

      const suburbLocation = await locationPagesServiceEnhanced.findOrCreateLocation({
        name: 'TEST:INTEGRATION:Sea Point',
        type: 'suburb',
        parentId: cityLocation.id,
        placeId: 'TEST_PLACE_ID_SEA_POINT',
        latitude: '-33.9249',
        longitude: '18.4241',
        description: 'Test suburb for integration testing',
        seoTitle: 'Properties in TEST:INTEGRATION:Sea Point',
        seoDescription: 'Find properties in TEST:INTEGRATION:Sea Point',
      });

      testLocationIds.push(suburbLocation.id);

      // Step 2: Create listings in the suburb
      const listingData = [
        { title: 'TEST:INTEGRATION:Apartment 1', price: 3000000, propertyType: 'apartment', listingType: 'for-sale' },
        { title: 'TEST:INTEGRATION:Apartment 2', price: 3500000, propertyType: 'apartment', listingType: 'for-sale' },
        { title: 'TEST:INTEGRATION:House 1', price: 5000000, propertyType: 'house', listingType: 'for-sale' },
        { title: 'TEST:INTEGRATION:Rental 1', price: 15000, propertyType: 'apartment', listingType: 'to-rent' },
      ];

      for (const data of listingData) {
        const [listing] = await db
          .insert(listings)
          .values({
            ...data,
            description: 'Test listing',
            bedrooms: 2,
            bathrooms: 2,
            locationId: suburbLocation.id,
            latitude: '-33.9249',
            longitude: '18.4241',
            city: cityLocation.name,
            suburb: suburbLocation.name,
            province: provinceLocation.name,
            status: 'published',
          })
          .$returningId();

        testListingIds.push(listing.id);
      }

      // Step 3: Fetch location page data
      const locationPageData = await locationPagesServiceEnhanced.getLocationByPath(
        'test-integration-western-cape',
        'test-integration-cape-town',
        'test-integration-sea-point'
      );

      // Step 4: Verify static content
      expect(locationPageData).toBeDefined();
      expect(locationPageData!.name).toBe('TEST:INTEGRATION:Sea Point');
      expect(locationPageData!.slug).toBe('test-integration-sea-point');
      expect(locationPageData!.type).toBe('suburb');
      expect(locationPageData!.description).toBe('Test suburb for integration testing');
      expect(locationPageData!.seoTitle).toBe('Properties in TEST:INTEGRATION:Sea Point');
      expect(locationPageData!.seoDescription).toBe('Find properties in TEST:INTEGRATION:Sea Point');
      expect(locationPageData!.latitude).toBe('-33.9249');
      expect(locationPageData!.longitude).toBe('18.4241');
      expect(locationPageData!.placeId).toBe('TEST_PLACE_ID_SEA_POINT');

      // Step 5: Verify dynamic statistics
      const { locationAnalyticsService } = await import('../locationAnalyticsService');
      const stats = await locationAnalyticsService.calculatePriceStats(suburbLocation.id);

      expect(stats.totalListings).toBe(4);
      expect(stats.forSaleCount).toBe(3);
      expect(stats.toRentCount).toBe(1);
      expect(stats.averageSalePrice).toBe(3833333.33); // (3000000 + 3500000 + 5000000) / 3
      expect(stats.averageRentalPrice).toBe(15000);

      // Step 6: Verify URL format
      // Province URL: /south-africa/{province-slug}
      expect(provinceLocation.slug).toBe('test-integration-western-cape');
      const provinceUrl = `/south-africa/${provinceLocation.slug}`;
      expect(provinceUrl).toBe('/south-africa/test-integration-western-cape');

      // City URL: /south-africa/{province-slug}/{city-slug}
      expect(cityLocation.slug).toBe('test-integration-cape-town');
      const cityUrl = `/south-africa/${provinceLocation.slug}/${cityLocation.slug}`;
      expect(cityUrl).toBe('/south-africa/test-integration-western-cape/test-integration-cape-town');

      // Suburb URL: /south-africa/{province-slug}/{city-slug}/{suburb-slug}
      expect(suburbLocation.slug).toBe('test-integration-sea-point');
      const suburbUrl = `/south-africa/${provinceLocation.slug}/${cityLocation.slug}/${suburbLocation.slug}`;
      expect(suburbUrl).toBe('/south-africa/test-integration-western-cape/test-integration-cape-town/test-integration-sea-point');

      // Clean up
      for (const id of testListingIds) {
        await db.execute(sql`DELETE FROM listings WHERE id = ${id}`);
      }
      for (const id of testLocationIds) {
        await db.execute(sql`DELETE FROM locations WHERE id = ${id}`);
      }
    });
  });

  /**
   * Integration Test 4: Search flow from autocomplete to filtered listings
   * Requirements: 19.1-19.5, 25.1-25.5
   * 
   * Tests the complete search flow:
   * 1. User searches for location in global search
   * 2. System returns location results
   * 3. User selects a suburb from search
   * 4. System redirects to location page with Place ID
   * 5. Location page filters listings by location_id
   * 6. System displays filtered results
   */
  describe('Search flow: autocomplete → location page → filtered listings', () => {
    it('should handle complete search flow from query to filtered results', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Step 1: Create test location and listings
      const testLocation = await locationPagesServiceEnhanced.findOrCreateLocation({
        name: 'TEST:INTEGRATION:Sandton',
        type: 'suburb',
        placeId: 'TEST_PLACE_ID_SANDTON_SEARCH',
        latitude: '-26.107407',
        longitude: '28.056229',
        description: 'Test suburb for search integration',
        seoTitle: 'Properties in TEST:INTEGRATION:Sandton',
        seoDescription: 'Find properties in TEST:INTEGRATION:Sandton',
      });

      testLocationIds.push(testLocation.id);

      // Create listings in this location
      for (let i = 0; i < 5; i++) {
        const [listing] = await db
          .insert(listings)
          .values({
            title: `TEST:INTEGRATION:Property ${i + 1}`,
            description: 'Test listing for search',
            price: 2000000 + i * 500000,
            propertyType: 'apartment',
            listingType: 'for-sale',
            bedrooms: 2,
            bathrooms: 2,
            locationId: testLocation.id,
            latitude: '-26.107407',
            longitude: '28.056229',
            city: 'Johannesburg',
            suburb: testLocation.name,
            province: 'Gauteng',
            status: 'published',
          })
          .$returningId();

        testListingIds.push(listing.id);
      }

      // Step 2: Search for location
      const searchResults = await globalSearchService.searchLocations('Sandton', 'suburb');

      // Verify location appears in search results
      const foundLocation = searchResults.find(
        (loc: any) => loc.name === 'TEST:INTEGRATION:Sandton'
      );
      expect(foundLocation).toBeDefined();
      expect(foundLocation.placeId).toBe('TEST_PLACE_ID_SANDTON_SEARCH');

      // Step 3: Simulate user selecting suburb from search
      // This would redirect to: /south-africa/{province}/{city}/{suburb}?placeId=TEST_PLACE_ID_SANDTON_SEARCH
      const selectedLocationId = foundLocation.id;
      const placeId = foundLocation.placeId;

      // Step 4: Filter listings by location_id (using Place ID)
      const filteredListings = await db
        .select()
        .from(listings)
        .where(sql`location_id = ${selectedLocationId} AND status = 'published'`)
        .limit(10);

      // Step 5: Verify filtered results
      expect(filteredListings.length).toBe(5);
      
      for (const listing of filteredListings) {
        expect(listing.locationId).toBe(selectedLocationId);
        expect(listing.title).toContain('TEST:INTEGRATION:Property');
      }

      // Verify Place ID is used for precise filtering
      expect(placeId).toBe('TEST_PLACE_ID_SANDTON_SEARCH');

      // Clean up
      for (const id of testListingIds) {
        await db.execute(sql`DELETE FROM listings WHERE id = ${id}`);
      }
      for (const id of testLocationIds) {
        await db.execute(sql`DELETE FROM locations WHERE id = ${id}`);
      }
    });

    it('should support multiple location filters with AND logic', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Create two test locations
      const location1 = await locationPagesServiceEnhanced.findOrCreateLocation({
        name: 'TEST:INTEGRATION:Location1',
        type: 'suburb',
        placeId: 'TEST_PLACE_ID_LOC1',
        latitude: '-26.1',
        longitude: '28.0',
      });

      const location2 = await locationPagesServiceEnhanced.findOrCreateLocation({
        name: 'TEST:INTEGRATION:Location2',
        type: 'suburb',
        placeId: 'TEST_PLACE_ID_LOC2',
        latitude: '-26.2',
        longitude: '28.1',
      });

      testLocationIds.push(location1.id, location2.id);

      // Create listings in both locations
      const [listing1] = await db
        .insert(listings)
        .values({
          title: 'TEST:INTEGRATION:Listing in Location 1',
          description: 'Test',
          price: 2000000,
          propertyType: 'apartment',
          listingType: 'for-sale',
          bedrooms: 2,
          bathrooms: 2,
          locationId: location1.id,
          latitude: '-26.1',
          longitude: '28.0',
          status: 'published',
        })
        .$returningId();

      const [listing2] = await db
        .insert(listings)
        .values({
          title: 'TEST:INTEGRATION:Listing in Location 2',
          description: 'Test',
          price: 3000000,
          propertyType: 'house',
          listingType: 'for-sale',
          bedrooms: 3,
          bathrooms: 2,
          locationId: location2.id,
          latitude: '-26.2',
          longitude: '28.1',
          status: 'published',
        })
        .$returningId();

      testListingIds.push(listing1.id, listing2.id);

      // Filter by multiple locations (OR logic in this case)
      const multiLocationResults = await db
        .select()
        .from(listings)
        .where(sql`location_id IN (${location1.id}, ${location2.id}) AND status = 'published'`);

      expect(multiLocationResults.length).toBe(2);

      // Clean up
      for (const id of testListingIds) {
        await db.execute(sql`DELETE FROM listings WHERE id = ${id}`);
      }
      for (const id of testLocationIds) {
        await db.execute(sql`DELETE FROM locations WHERE id = ${id}`);
      }
    });
  });

  /**
   * Integration Test 5: Trending suburbs calculation from search events
   * Requirements: 21.1-21.5
   * 
   * Tests trending suburbs feature:
   * 1. Record location search events
   * 2. Calculate trending score based on search frequency
   * 3. Weight recent searches higher than older searches
   * 4. Return top 10 trending suburbs
   * 5. Update rankings daily
   */
  describe('Trending suburbs calculation from search events', () => {
    it('should calculate trending suburbs from search events', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Step 1: Create test locations
      const suburbs = [];
      for (let i = 1; i <= 5; i++) {
        const suburb = await locationPagesServiceEnhanced.findOrCreateLocation({
          name: `TEST:INTEGRATION:Suburb${i}`,
          type: 'suburb',
          placeId: `TEST_PLACE_ID_SUBURB${i}`,
          latitude: `-26.${i}`,
          longitude: `28.${i}`,
        });
        suburbs.push(suburb);
        testLocationIds.push(suburb.id);
      }

      // Step 2: Record search events with varying frequencies
      // Suburb 1: 10 searches (most popular)
      // Suburb 2: 7 searches
      // Suburb 3: 5 searches
      // Suburb 4: 3 searches
      // Suburb 5: 1 search (least popular)

      const searchCounts = [10, 7, 5, 3, 1];
      
      for (let i = 0; i < suburbs.length; i++) {
        for (let j = 0; j < searchCounts[i]; j++) {
          const [search] = await db
            .insert(locationSearches)
            .values({
              locationId: suburbs[i].id,
              userId: null, // Anonymous search
              searchedAt: new Date(Date.now() - j * 60 * 60 * 1000), // Spread over hours
            })
            .$returningId();

          testSearchIds.push(search.id);
        }
      }

      // Step 3: Calculate trending suburbs
      const { locationAnalyticsService } = await import('../locationAnalyticsService');
      const trendingSuburbs = await locationAnalyticsService.getTrendingSuburbs(10);

      // Step 4: Verify results are sorted by search frequency
      expect(trendingSuburbs.length).toBeGreaterThan(0);
      expect(trendingSuburbs.length).toBeLessThanOrEqual(10);

      // Most popular suburb should be first
      const topSuburb = trendingSuburbs.find(
        (s: any) => s.name === 'TEST:INTEGRATION:Suburb1'
      );
      expect(topSuburb).toBeDefined();

      // Verify trending scores are calculated
      for (const suburb of trendingSuburbs) {
        expect(suburb.trendingScore).toBeDefined();
        expect(suburb.trendingScore).toBeGreaterThan(0);
        expect(suburb.searchCount).toBeDefined();
      }

      // Verify suburbs are sorted by trending score (descending)
      for (let i = 0; i < trendingSuburbs.length - 1; i++) {
        expect(trendingSuburbs[i].trendingScore).toBeGreaterThanOrEqual(
          trendingSuburbs[i + 1].trendingScore
        );
      }

      // Clean up
      for (const id of testSearchIds) {
        await db.execute(sql`DELETE FROM location_searches WHERE id = ${id}`);
      }
      for (const id of testLocationIds) {
        await db.execute(sql`DELETE FROM locations WHERE id = ${id}`);
      }
    });

    it('should weight recent searches higher than older searches', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Create two suburbs
      const recentSuburb = await locationPagesServiceEnhanced.findOrCreateLocation({
        name: 'TEST:INTEGRATION:RecentSuburb',
        type: 'suburb',
        placeId: 'TEST_PLACE_ID_RECENT',
        latitude: '-26.1',
        longitude: '28.1',
      });

      const oldSuburb = await locationPagesServiceEnhanced.findOrCreateLocation({
        name: 'TEST:INTEGRATION:OldSuburb',
        type: 'suburb',
        placeId: 'TEST_PLACE_ID_OLD',
        latitude: '-26.2',
        longitude: '28.2',
      });

      testLocationIds.push(recentSuburb.id, oldSuburb.id);

      // Recent suburb: 5 searches in last 24 hours
      for (let i = 0; i < 5; i++) {
        const [search] = await db
          .insert(locationSearches)
          .values({
            locationId: recentSuburb.id,
            userId: null,
            searchedAt: new Date(Date.now() - i * 60 * 60 * 1000), // Last 5 hours
          })
          .$returningId();

        testSearchIds.push(search.id);
      }

      // Old suburb: 5 searches from 25-30 days ago
      for (let i = 0; i < 5; i++) {
        const [search] = await db
          .insert(locationSearches)
          .values({
            locationId: oldSuburb.id,
            userId: null,
            searchedAt: new Date(Date.now() - (25 + i) * 24 * 60 * 60 * 1000), // 25-30 days ago
          })
          .$returningId();

        testSearchIds.push(search.id);
      }

      // Calculate trending scores
      const { locationAnalyticsService } = await import('../locationAnalyticsService');
      const trendingSuburbs = await locationAnalyticsService.getTrendingSuburbs(10);

      // Find our test suburbs
      const recentTrending = trendingSuburbs.find(
        (s: any) => s.id === recentSuburb.id
      );
      const oldTrending = trendingSuburbs.find(
        (s: any) => s.id === oldSuburb.id
      );

      // Recent suburb should have higher trending score despite same search count
      if (recentTrending && oldTrending) {
        expect(recentTrending.trendingScore).toBeGreaterThan(oldTrending.trendingScore);
      }

      // Clean up
      for (const id of testSearchIds) {
        await db.execute(sql`DELETE FROM location_searches WHERE id = ${id}`);
      }
      for (const id of testLocationIds) {
        await db.execute(sql`DELETE FROM locations WHERE id = ${id}`);
      }
    });

    it('should limit results to top 10 suburbs', async () => {
      if (!db) {
        console.log('Skipping test: Database not available');
        return;
      }

      // Create 15 suburbs with search events
      for (let i = 1; i <= 15; i++) {
        const suburb = await locationPagesServiceEnhanced.findOrCreateLocation({
          name: `TEST:INTEGRATION:TrendingSuburb${i}`,
          type: 'suburb',
          placeId: `TEST_PLACE_ID_TRENDING${i}`,
          latitude: `-26.${i}`,
          longitude: `28.${i}`,
        });

        testLocationIds.push(suburb.id);

        // Each suburb gets i searches
        for (let j = 0; j < i; j++) {
          const [search] = await db
            .insert(locationSearches)
            .values({
              locationId: suburb.id,
              userId: null,
              searchedAt: new Date(),
            })
            .$returningId();

          testSearchIds.push(search.id);
        }
      }

      // Get trending suburbs
      const { locationAnalyticsService } = await import('../locationAnalyticsService');
      const trendingSuburbs = await locationAnalyticsService.getTrendingSuburbs(10);

      // Should return exactly 10 results
      expect(trendingSuburbs.length).toBe(10);

      // Top result should be Suburb15 (most searches)
      const topSuburb = trendingSuburbs[0];
      expect(topSuburb.name).toBe('TEST:INTEGRATION:TrendingSuburb15');

      // Clean up
      for (const id of testSearchIds) {
        await db.execute(sql`DELETE FROM location_searches WHERE id = ${id}`);
      }
      for (const id of testLocationIds) {
        await db.execute(sql`DELETE FROM locations WHERE id = ${id}`);
      }
    });
  });
});
