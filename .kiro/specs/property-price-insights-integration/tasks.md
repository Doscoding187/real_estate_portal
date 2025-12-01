# Implementation Plan

- [ ] 1. Create backend price insights service
- [x] 1.1 Implement priceInsightsService.ts with core calculation functions



  - Create service class with cache management
  - Implement calculateMedianPrice() function
  - Implement calculatePriceRanges() function with six buckets
  - Implement calculateAvgPricePerSqm() function with null/zero filtering
  - Implement getTopMicromarkets() function with sorting and limiting
  - Add cache validity checking with 15-minute TTL
  - _Requirements: 1.1, 1.5, 2.1, 3.1, 4.1, 4.3, 5.2_

- [ ]* 1.2 Write property test for median calculation
  - **Property 3: Median calculation correctness**
  - **Validates: Requirements 2.1**

- [ ]* 1.3 Write property test for price range categorization
  - **Property 2: Price range bucket completeness**
  - **Property 10: Price range boundary correctness**
  - **Validates: Requirements 3.4, 3.5**

- [ ]* 1.4 Write property test for price per m² filtering
  - **Property 4: Price per m² exclusion**
  - **Validates: Requirements 4.3**


- [ ] 2. Implement database queries for aggregation
- [ ] 2.1 Create SQL queries for city statistics
  - Write query to get active listings by city with counts and averages
  - Write query to calculate median price using window functions
  - Write query to get price distribution with CASE statement buckets
  - Write query to get top 4 micromarkets by listing count
  - Add proper WHERE clauses for active status filtering
  - _Requirements: 1.2, 1.3, 2.1, 3.1, 5.1, 5.2_

- [ ]* 2.2 Write property test for active listings filter
  - **Property 1: Active listings filter consistency**
  - **Validates: Requirements 1.2**

- [ ]* 2.3 Write property test for micromarket ordering
  - **Property 5: Micromarket ordering**


  - **Validates: Requirements 5.2**

- [ ] 3. Create API endpoint for price insights
- [ ] 3.1 Implement priceInsightsRouter.ts with GET endpoint
  - Create Express router with /api/price-insights endpoint
  - Add error handling with appropriate status codes
  - Set cache-control headers for 15-minute freshness
  - Integrate with priceInsightsService
  - Add request logging
  - _Requirements: 8.1, 8.2, 8.4, 8.5_

- [ ]* 3.2 Write property test for city minimum threshold
  - **Property 7: City minimum threshold**
  - **Validates: Requirements 6.1**

- [ ]* 3.3 Write unit tests for API endpoint
  - Test successful response with valid data
  - Test error handling for database failures

  - Test cache header presence
  - Test empty data scenario
  - _Requirements: 8.1, 8.4, 8.5_

- [ ] 4. Implement caching layer
- [ ] 4.1 Add cache management to priceInsightsService
  - Implement in-memory Map cache with timestamps
  - Add cache key generation
  - Implement cache validity checking (15-minute TTL)
  - Add cache hit/miss logging
  - Handle cache corruption gracefully
  - _Requirements: 1.5, 7.3, 7.4_



- [ ]* 4.2 Write property test for cache freshness
  - **Property 6: Cache freshness**
  - **Validates: Requirements 7.3**

- [ ] 5. Create frontend hook for data fetching
- [ ] 5.1 Implement usePriceInsights.ts custom hook
  - Create hook with state management for data, loading, and error
  - Implement fetchInsights function with error handling
  - Add useEffect for initial data fetch
  - Implement refetch function for retry functionality
  - Add proper TypeScript types for return values
  - _Requirements: 9.1, 9.3, 9.4_




- [ ]* 5.2 Write unit tests for usePriceInsights hook
  - Test initial loading state
  - Test successful data fetch
  - Test error handling
  - Test refetch functionality
  - _Requirements: 9.1, 9.3, 9.4_

- [ ] 6. Update PropertyInsights component with real data
- [ ] 6.1 Refactor PropertyInsights component to use usePriceInsights hook
  - Replace placeholder data with usePriceInsights hook
  - Implement auto-selection of city with most listings

  - Add loading skeleton component
  - Add error state with retry button
  - Add empty state for no data
  - Maintain tab switching without refetch
  - _Requirements: 1.1, 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.3, 9.4, 9.5_


- [ ]* 6.2 Write property test for data consistency across tabs
  - **Property 9: Data consistency across tabs**
  - **Validates: Requirements 6.5**


- [ ] 7. Implement loading and error states
- [ ] 7.1 Create InsightsLoadingSkeleton component
  - Design skeleton UI matching final layout
  - Add shimmer animation effects
  - Ensure responsive design

  - _Requirements: 9.1, 9.2_

- [ ] 7.2 Create InsightsErrorState component
  - Add error message display
  - Implement retry button with click handler
  - Add appropriate error icon

  - _Requirements: 9.3, 9.4_

- [ ] 7.3 Create InsightsEmptyState component
  - Add empty state message
  - Design placeholder content
  - _Requirements: 1.4_

- [x] 8. Format and display metrics

- [ ] 8.1 Implement data formatting utilities
  - Create formatPrice function for millions display (e.g., "R 2.85M")
  - Create formatNumber function with thousand separators
  - Create formatPricePerSqm function
  - Handle null/undefined values gracefully
  - _Requirements: 2.3, 2.4, 4.4_

- [x] 8.2 Update metric cards with formatted data

  - Display Active Listings with formatted count
  - Display Avg. Price/m² with formatted value
  - Display Median Price with formatted value
  - Add icons and labels consistently
  - Handle N/A states for missing data
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 9. Implement price distribution visualization


- [ ] 9.1 Update price range bar chart rendering
  - Map price range data to horizontal bars
  - Calculate proportional widths based on counts
  - Display all six price buckets including zeros
  - Add count labels to bars
  - Ensure responsive layout

  - _Requirements: 3.2, 3.3, 3.4_

- [x] 10. Implement micromarket comparison display

- [ ] 10.1 Update micromarket bars with real data
  - Map micromarket data to horizontal bars
  - Scale bar widths relative to highest price per m²
  - Display suburb names and price per m² values
  - Handle cities with fewer than 4 suburbs
  - Add hover effects
  - _Requirements: 5.1, 5.3, 5.4, 5.5_

- [ ] 11. Add database indexes for performance
- [ ] 11.1 Create migration for database indexes
  - Add index on properties.cityId
  - Add index on properties.status
  - Add index on properties.price
  - Add index on properties.suburbId
  - Add composite index on (cityId, status) if beneficial
  - _Requirements: 7.5_


- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Test end-to-end integration
- [x] 13.1 Manual testing of complete flow


  - Verify home page loads with real data
  - Test tab switching between cities
  - Verify all metrics display correctly
  - Test loading states
  - Test error states with network disabled
  - Test retry functionality
  - Verify cache behavior after 15 minutes
  - _Requirements: 1.1, 6.2, 6.3, 9.1, 9.3, 9.4_

- [ ]* 13.2 Write integration tests
  - Test full API endpoint with test database
  - Test cache behavior across multiple requests
  - Test frontend component with mocked API
  - _Requirements: 8.1, 8.2, 8.3_

- [ ] 14. Performance optimization and monitoring
- [ ] 14.1 Verify query performance
  - Run EXPLAIN on all database queries
  - Benchmark queries with sample data
  - Ensure response times meet requirements
  - Add query logging for slow queries
  - _Requirements: 7.5, 8.3, 9.2_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
