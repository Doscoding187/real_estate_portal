# Implementation Plan: Google Places Autocomplete Integration

## Overview

This implementation plan breaks down the Google Places Autocomplete Integration into discrete, manageable coding tasks. Each task builds incrementally on previous work, ensuring the system remains functional throughout development.

## ✅ What's Already Built

Based on the infrastructure audit, the following components already exist:

### Database Schema
- ✅ `provinces` table (needs: slug, place_id, seo fields)
- ✅ `cities` table (needs: slug, place_id, seo fields)
- ✅ `suburbs` table (needs: slug, place_id, seo fields)
- ✅ `locations` table (has: slug, type, parentId - needs: place_id, viewport, seo fields)

### Services
- ✅ `locationPagesService.improved.ts` - Fully functional location pages service
  - Fetches province/city/suburb data with statistics
  - Calculates market analytics
  - Supports slug-based lookups (with name fallback)

### Specs
- ✅ Complete location-pages-system spec with requirements, design, and tasks

## 🔨 What Needs to Be Built

Focus on these missing components only:

## Task List

- [x] 1. Set up Google Places API infrastructure





  - Configure Google Places API key in environment variables
  - Create Google Places Service wrapper with error handling
  - Implement session token management
  - Add API request logging and monitoring
  - _Requirements: 1.1, 2.1, 5.2, 5.3, 15.1-15.5, 26.1-26.5_

- [x] 1.1 Write property test for session token lifecycle


  - **Property 15: Session token termination**
  - **Validates: Requirements 5.3**

- [x] 2. Enhance existing database schema with Google Places fields




  - Add `slug` column to `provinces` table (VARCHAR 200, UNIQUE)
  - Add `place_id` column to `provinces` table (VARCHAR 255, UNIQUE)
  - Add `seo_title` and `seo_description` columns to `provinces` table
  - Add `slug` column to `cities` table (VARCHAR 200, UNIQUE within province)
  - Add `place_id` column to `cities` table (VARCHAR 255, UNIQUE)
  - Add `seo_title` and `seo_description` columns to `cities` table
  - Add `slug` column to `suburbs` table (VARCHAR 200, UNIQUE within city)
  - Add `place_id` column to `suburbs` table (VARCHAR 255, UNIQUE)
  - Add `seo_title` and `seo_description` columns to `suburbs` table
  - Add `place_id` column to `locations` table (VARCHAR 255, UNIQUE)
  - Add viewport bounds columns to `locations` table (viewport_ne_lat, viewport_ne_lng, viewport_sw_lat, viewport_sw_lng)
  - Add `seo_title`, `seo_description`, `hero_image` columns to `locations` table
  - Create location_searches table for trending analysis
  - Create recent_searches table for user history
  - Add location_id foreign key to properties table (if not exists)
  - Add location_id foreign key to developments table (if not exists)
  - Create database indexes for performance (place_id, slug, location_id)
  - _Requirements: 16.5, 27.1, 27.5_
  - _Note: locations table already exists with basic structure, we're enhancing it_

- [x] 2.1 Write property test for hierarchical integrity


  - **Property 20: Hierarchical integrity**
  - **Validates: Requirements 16.5**

- [-] 3. Implement LocationAutocomplete component (Frontend)












  - Create base autocomplete input component
  - Implement debounced input handling (300ms)
  - Add autocomplete suggestions dropdown
  - Implement keyboard navigation (arrow keys, Enter, Escape)
  - Add loading and error states
  - Style for mobile responsiveness (44px touch targets)
  - _Requirements: 1.1-1.5, 5.1, 8.1-8.5, 13.1-13.5_

- [ ] 3.1 Write property test for debounce delay





  - **Property 13: Debounce delay enforcement**
  - **Validates: Requirements 5.1**

- [ ] 3.2 Write property test for minimum input length
  - **Property 1: Minimum input length triggers autocomplete**
  - **Validates: Requirements 1.2**

- [ ] 3.3 Write property test for suggestion display cap

  - **Property 2: Suggestion display cap**
  - **Validates: Requirements 1.3**

- [x] 4. Implement Google Places API integration





  - Create getAutocompleteSuggestions method with South Africa bias
  - Create getPlaceDetails method
  - Implement response caching (5 minutes)
  - Add retry logic for network errors
  - Implement fallback to manual entry on API failures
  - _Requirements: 1.1-1.5, 2.1-2.5, 5.5, 11.1-11.5_

- [x] 4.1 Write property test for cache behavior

  - **Property 16: Cache hit for duplicate queries**
  - **Validates: Requirements 5.5**

- [x] 4.2 Write property test for network error retry

  - **Property 18: Network error retry**
  - **Validates: Requirements 11.4**



- [x] 5. Implement address component parsing



  - Create extractHierarchy function to parse Place Details
  - Extract province from administrative_area_level_1
  - Extract city from locality with fallback to administrative_area_level_2
  - Extract suburb from sublocality_level_1 with fallback to neighborhood
  - Extract street address from street_number and route
  - Extract and validate coordinates
  - _Requirements: 3.1-3.5, 4.1-4.5_

- [x] 5.1 Write property test for province extraction

  - **Property 5: Address component extraction**
  - **Validates: Requirements 3.2**


- [x] 5.2 Write property test for city extraction with fallback

  - **Property 6: City extraction with fallback**
  - **Validates: Requirements 3.3**


- [x] 5.3 Write property test for suburb extraction with fallback

  - **Property 7: Suburb extraction with fallback**
  - **Validates: Requirements 3.4**

- [x] 5.4 Write property test for coordinate precision

  - **Property 10: Coordinate precision**

  - **Validates: Requirements 4.2**

- [x] 5.5 Write property test for South Africa boundary validation

  - **Property 12: South Africa boundary validation**
  - **Validates: Requirements 4.5**

- [x] 6. Enhance existing LocationPagesService with Google Places integration





  - Add findOrCreateLocation method to existing service
  - Implement location hierarchy resolution using Google Places data
  - Add generateSlug utility function (kebab-case)
  - Add generateSEOContent utility function (titles, descriptions)
  - Implement duplicate prevention using Place ID
  - Create sync mechanism to keep provinces/cities/suburbs tables in sync with locations table
  - _Requirements: 16.1-16.5, 27.1-27.5_
  - _Note: locationPagesService.improved.ts already exists with province/city/suburb data fetching_

- [x] 6.1 Write property test for slug generation format


  - **Property 34: Slug generation format**
  - **Validates: Requirements 27.2**

- [x] 6.2 Write property test for slug uniqueness within parent


  - **Property 39: Slug uniqueness within parent**
  - **Validates: Requirements 29.4**

- [x] 6.3 Write property test for location record creation


  - **Property 19: Location record creation**
  - **Validates: Requirements 16.2**

- [x] 7. Integrate autocomplete with listing creation





  - Update listing creation flow to use LocationAutocomplete
  - Implement resolveLocation function
  - Link listings to locations via location_id
  - Maintain backward compatibility with legacy fields
  - Update development creation flow similarly
  - _Requirements: 16.1-16.5, 25.1_

- [x] 7.1 Write property test for Place ID storage


  - **Property 32: Place ID storage on selection**
  - **Validates: Requirements 25.1**


- [ ] 8. Implement location statistics service











  - Create LocationAnalyticsService
  - Implement calculatePriceStats method (avg sale, avg rental, median)
  - Implement calculateMarketActivity method (days on market, new listings)
  - Implement calculatePropertyTypes method (distribution)
  - Add caching layer (Redis, 5 minutes TTL)
  - _Requirements: 17.1-17.5, 18.1-18.5_

- [x] 8.1 Write property test for listing count accuracy (province)


  - **Property 21: Province listing count accuracy**
  - **Validates: Requirements 17.1**


- [x] 8.2 Write property test for listing count accuracy (city)

  - **Property 22: City listing count accuracy**
  - **Validates: Requirements 17.2**

- [x] 8.3 Write property test for listing count accuracy (suburb)


  - **Property 23: Suburb listing count accuracy**
  - **Validates: Requirements 17.3**

- [x] 8.4 Write property test for average sale price calculation


  - **Property 24: Average sale price calculation**
  - **Validates: Requirements 18.1**

- [x] 8.5 Write property test for median price calculation


  - **Property 26: Median price calculation**

  - **Validates: Requirements 18.3**


- [x] 9. Enhance existing location page components with Google Places data






  - Update existing location page routing to support hierarchical URLs (/south-africa/{province}/{city}/{suburb})
  - Enhance existing LocationPage components to use Google Places data
  - Add Place ID to URL parameters for precise filtering
  - Update HeroSection to display Google Places data
  - Update QuickStatsRow to show dynamic statistics
  - Enhance PropertyExplorer with Place ID-based filtering
  - Add InteractiveMap component with Google Maps integration
  - Enhance AboutTheArea component with SEO content from locations table
  - _Requirements: 23.1-23.5, 28.1-28.5, 29.1-29.5_
  - _Note: locationPagesService.improved.ts already provides data for province/city/suburb pages_


- [x] 9.1 Write property test for province URL format

  - **Property 36: Province URL format**
  - **Validates: Requirements 29.1**

- [x] 9.2 Write property test for city URL format


  - **Property 37: City URL format**
  - **Validates: Requirements 29.2**

- [x] 9.3 Write property test for suburb URL format


  - **Property 38: Suburb URL format**
  - **Validates: Requirements 29.3**

- [x] 10. Enhance location page data fetching with Google Places integration





  - Add getLocationByPath method to existing service (supports slug-based lookups)
  - Enhance static content fetching to include Google Places data from locations table
  - Keep existing dynamic statistics fetching from analytics service
  - Merge static Google Places content with dynamic statistics in SSR
  - Add ISR caching (24 hours for static, 5 minutes for dynamic)
  - _Requirements: 24.1-24.5, 28.1-28.5_
  - _Note: locationPagesService.improved.ts already has getProvinceData, getCityData, getSuburbData methods_

- [x] 11. Add structured data and SEO metadata






  - Generate JSON-LD structured data with @type "Place"
  - Include location name, coordinates, address in structured data
  - Generate breadcrumb structured data
  - Create dynamic meta tags (title, description, OG tags)
  - Validate structured data against Schema.org
  - _Requirements: 23.1-23.5, 30.1-30.5_


- [x] 11.1 Write property test for structured data presence

  - **Property 40: Structured data presence**
  - **Validates: Requirements 30.1**



- [x] 11.2 Write property test for structured data completeness



  - **Property 41: Structured data completeness**
  - **Validates: Requirements 30.2**

- [x] 12. Implement search integration





  - Create global search service with location ranking
  - Implement searchLocations method
  - Add location results to global search results
  - Implement Place ID-based filtering for listings
  - Connect location pages to filtered search results
  - _Requirements: 19.1-19.5, 25.1-25.5_

- [x] 12.1 Write property test for suburb selection redirect


  - **Property 29: Suburb selection redirects to location page**
  - **Validates: Requirements 19.1**

- [x] 12.2 Write property test for Place ID in URL parameters

  - **Property 30: Place ID in URL parameters**
  - **Validates: Requirements 19.4**

- [x] 12.3 Write property test for Place ID filtering

  - **Property 33: Place ID filtering**
  - **Validates: Requirements 25.2**

- [x] 13. Implement trending suburbs feature




  - Create trackLocationSearch method
  - Implement calculateTrendingScore method
  - Create getTrendingSuburbs method
  - Add TrendingSuburbs component to location pages
  - Display trending indicators and statistics
  - _Requirements: 21.1-21.5_

- [x] 13.1 Write property test for search event recording

  - **Property 31: Search event recording**
  - **Validates: Requirements 21.1**

- [x] 14. Implement similar locations recommendation











  - Create calculateSimilarity algorithm
  - Implement getSimilarLocations method
  - Consider price bracket, property types, lifestyle patterns
  - Add SimilarLocations component to location pages
  - Display up to 5 similar locations with statistics
  - _Requirements: 22.1-22.5_



- [x] 15. Add recent searches feature

  - Implement recent searches storage in local storage
  - Display recent searches in autocomplete dropdown
  - Add "Recent" label to distinguish from API suggestions
  - Implement clear recent searches functionality
  - Limit to 5 most recent searches per user
  - _Requirements: 14.1-14.5_

- [x] 16. Implement map preview feature




  - Add small map preview on place selection
  - Center map on selected coordinates
  - Add marker at selected location
  - Implement expandable map view
  - Add draggable marker with reverse geocoding
  - _Requirements: 12.1-12.5_

- [ ] 17. Add manual entry fallback








  - Implement manual text entry mode
  - Add "Use this address" confirmation button
  - Implement geocoding for manual entries
  - Mark GPS accuracy as "manual" for manual entries
  - Handle geocoding failures gracefully
  - _Requirements: 7.1-7.5_



- [x] 18. Implement location breakdown components



  - Create SuburbList component for city pages
  - Create NearbySuburbs component for suburb pages
  - Create CityList component for province pages
  - Add sorting and filtering options
  - Display statistics for each location
  - _Requirements: 20.1-20.5_

- [x] 19. Create data migration and sync scripts





  - Write script to generate slugs for existing provinces/cities/suburbs
  - Write script to sync existing provinces/cities/suburbs to locations table
  - Write script to migrate existing listings to use location_id (optional, can be gradual)
  - Create utility to extract location data from legacy fields
  - Create location records for existing data
  - Verify data integrity after migration
  - _Requirements: 16.1-16.5_
  - _Note: This is optional for initial launch - can migrate gradually as new listings are created_

- [x] 20. Implement API usage monitoring




  - Create API usage logging service
  - Log autocomplete requests with session tokens
  - Log Place Details requests with response times
  - Log API errors with context
  - Create monitoring dashboard
  - Add alerts for usage thresholds (80% of limit)
  - _Requirements: 26.1-26.5_

- [x] 21. Add performance optimizations







  - Implement Redis caching for API responses
  - Add database query optimization (indexes, materialized views)
  - Implement request deduplication
  - Add CDN caching for location pages
  - Optimize image loading (lazy loading, WebP format)
  - _Requirements: 5.5, 24.5_

- [x] 22. Checkpoint - Ensure all tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 23. Write integration tests for complete flows




  - Test complete autocomplete flow: input → suggestions → selection → Place Details → form population
  - Test location record creation from listing submission
  - Test location page rendering with static and dynamic content
  - Test search flow: autocomplete → location page → filtered listings
  - Test trending suburbs calculation from search events

- [x] 24. Write unit tests for core functions




  - Test address component extraction logic
  - Test slug generation from location names
  - Test coordinate validation
  - Test statistics calculation functions
  - Test URL generation from location hierarchy
  - Test cache hit/miss logic

- [x] 25. Create documentation







  - Document Google Places API setup and configuration
  - Create developer guide for using LocationAutocomplete component
  - Document location page architecture and rendering strategy
  - Create API documentation for location services
  - Document database schema and relationships
  - Create troubleshooting guide for common issues

- [x] 26. Final testing and deployment preparation




  - Perform end-to-end testing of all features
  - Test on multiple browsers and devices
  - Verify SEO metadata and structured data
  - Test API error handling and fallbacks
  - Verify performance metrics meet targets
  - Create deployment checklist

