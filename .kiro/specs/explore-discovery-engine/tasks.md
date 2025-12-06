# Implementation Plan

- [x] 1. Set up database schema and core data models













  - Create all Explore-related database tables with proper indexes
  - Set up PostGIS spatial extensions for location queries
  - Create migration scripts for schema deployment
  - _Requirements: 1.1, 2.1, 3.1, 5.1, 7.1, 12.1_

- [x] 1.1 Write unit tests for database schema





  - Test table creation and constraints
  - Test spatial index functionality
  - Test foreign key relationships
  - _Requirements: 1.1, 2.1, 3.1_

- [x] 2. Implement video storage and processing service





  - [x] 2.1 Create video upload API endpoint with S3 integration


    - Implement multipart upload handling
    - Add video file validation (format, size, duration)
    - Store video metadata in database
    - _Requirements: 8.1, 8.4_

  - [ ]* 2.2 Write property test for video metadata validation
    - **Property 34: Video metadata validation**
    - **Validates: Requirements 8.1**

  - [ ]* 2.3 Write property test for video duration validation
    - **Property 35: Video duration validation**
    - **Validates: Requirements 8.4**



  - [x] 2.4 Implement video transcoding pipeline


    - Set up video processing queue
    - Generate multiple quality versions (1080p, 720p, 480p)


    - Create thumbnail generation
    - _Requirements: 8.2_

  - [x] 2.5 Build video metadata extraction service

    - Extract duration, resolution, codec information


    - Generate preview thumbnails at intervals
    - Store processed video URLs
    - _Requirements: 8.2_

- [ ] 3. Build recommendation engine service
  - [ ] 3.1 Create user preference tracking system
    - Implement engagement signal recording
    - Build user profile aggregation
    - Create preference scoring algorithm
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 3.2 Write property test for price range adaptation
    - **Property 7: Price range recommendation adaptation**
    - **Validates: Requirements 2.1**

  - [ ]* 3.3 Write property test for neighbourhood preference learning
    - **Property 8: Neighbourhood preference learning**
    - **Validates: Requirements 2.2**

  - [ ]* 3.4 Write property test for completion signal recording
    - **Property 9: Completion signal recording**
    - **Validates: Requirements 2.3**

  - [ ]* 3.5 Write property test for skip signal processing
    - **Property 10: Skip signal processing**
    - **Validates: Requirements 2.4**

  - [x]* 3.6 Write property test for property type adaptation


    - **Property 11: Property type preference adaptation**
    - **Validates: Requirements 2.5**

  - [ ]* 3.7 Write property test for multi-factor recommendations
    - **Property 12: Multi-factor recommendation**
    - **Validates: Requirements 2.6**

  - [ ] 3.8 Implement content ranking algorithm
    - Build collaborative filtering logic
    - Implement content-based filtering
    - Add temporal decay for older content
    - Create location proximity scoring
    - _Requirements: 2.6, 7.3, 7.4_

  - [ ]* 3.9 Write property test for recency prioritization
    - **Property 31: Recency prioritization**
    - **Validates: Requirements 7.3**

  - [ ]* 3.10 Write property test for personalized ordering
    - **Property 32: Personalized content ordering**
    - **Validates: Requirements 7.4**

- [x] 4. Create Explore API endpoints
  - [x] 4.1 Build personalized feed generation endpoint
    - Implement GET /api/explore/feed with user context
    - Add pagination and infinite scroll support
    - Integrate recommendation engine
    - _Requirements: 2.1, 7.1, 12.1_

  - [x] 4.2 Create video feed endpoint
    - Implement GET /api/explore/videos with filtering
    - Add preload hints for next videos
    - Include engagement tracking
    - _Requirements: 1.1, 1.2_

  - [x] 4.3 Build neighbourhood endpoints
    - Implement GET /api/explore/neighbourhoods
    - Create GET /api/explore/neighbourhoods/:id for details
    - Add follow/unfollow endpoints
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

  - [x] 4.4 Create category filtering endpoints
    - Implement GET /api/explore/categories




    - Add category-based feed filtering
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 4.5 Build engagement tracking endpoints
    - Implement POST /api/explore/engagement
    - Add batch engagement recording
    - Create analytics aggregation
    - _Requirements: 2.3, 8.6_

- [ ] 5. Implement frontend video feed component
  - [ ] 5.1 Create ExploreVideoFeed component with swipe navigation
    - Build full-screen video player
    - Implement vertical swipe gesture detection

    - Add video preloading logic
    - _Requirements: 1.1, 1.2_

  - [ ]* 5.2 Write property test for video transition performance
    - **Property 1: Video transition performance**
    - **Validates: Requirements 1.2**

  - [ ]* 5.3 Write property test for video preloading
    - **Property 42: Video preloading**
    - **Validates: Requirements 10.1**

  - [ ] 5.4 Build video overlay UI
    - Create property information overlay
    - Add action buttons (save, share, profile, view listing)
    - Implement double-tap to save
    - _Requirements: 1.3, 1.4, 1.5, 1.7_

  - [ ]* 5.5 Write property test for overlay completeness
    - **Property 2: Video overlay completeness**
    - **Validates: Requirements 1.3**


  - [ ]* 5.6 Write property test for save action consistency
    - **Property 3: Save action consistency**
    - **Validates: Requirements 1.4, 14.1**

  - [ ]* 5.7 Write property test for profile navigation
    - **Property 4: Profile navigation**
    - **Validates: Requirements 1.5**


  - [ ]* 5.8 Write property test for listing navigation
    - **Property 6: Listing navigation**
    - **Validates: Requirements 1.7**

  - [ ] 5.9 Implement video auto-loop functionality
    - Add seamless video looping
    - Handle video end events
    - _Requirements: 1.6_

  - [ ]* 5.10 Write property test for video auto-loop
    - **Property 5: Video auto-loop**
    - **Validates: Requirements 1.6**

  - [ ] 5.11 Add muted playback with tap-to-unmute
    - Set default muted state
    - Implement unmute toggle
    - _Requirements: 10.4_

  - [ ]* 5.12 Write property test for default muted playback
    - **Property 44: Default muted playback**
    - **Validates: Requirements 10.4**

- [x] 6. Build discovery card feed component
  - [x] 6.1 Create DiscoveryCardFeed with masonry layout
    - Implement responsive masonry grid
    - Add infinite scroll functionality
    - Build lazy loading for images
    - _Requirements: 7.1, 10.2, 12.2_

  - [ ]* 6.2 Write property test for lazy loading behavior
    - **Property 43: Lazy loading behavior**
    - **Validates: Requirements 10.2**

  - [ ]* 6.3 Write property test for infinite scroll loading
    - **Property 50: Infinite scroll loading**
    - **Validates: Requirements 12.2**

  - [x] 6.4 Implement mixed content type rendering
    - Create PropertyCard component
    - Create VideoCard component
    - Create NeighbourhoodCard component
    - Create InsightCard component
    - _Requirements: 7.1_

  - [ ]* 6.5 Write property test for content type diversity
    - **Property 29: Content type diversity**
    - **Validates: Requirements 7.1**

  - [x]* 6.6 Write property test for content type distribution






    - **Property 30: Content type distribution**
    - **Validates: Requirements 7.2**

  - [x] 6.7 Add horizontal scroll sections for content blocks
    - Implement content block container
    - Add "See All" navigation
    - _Requirements: 12.3, 12.4_


  - [ ]* 6.8 Write property test for content block layout
    - **Property 51: Content block layout**
    - **Validates: Requirements 12.3**

  - [ ]* 6.9 Write property test for content block navigation
    - **Property 52: Content block navigation**
    - **Validates: Requirements 12.4**

- [x] 7. Implement map hybrid view
  - [x] 7.1 Create MapHybridView component with Google Maps
    - Set up Google Maps integration
    - Implement property pin rendering
    - Add cluster markers for dense areas
    - _Requirements: 3.1, 3.6_

  - [x]* 7.2 Write property test for cluster marker display

    - **Property 17: Cluster marker display**
    - **Validates: Requirements 3.6**

  - [x] 7.3 Build map-feed synchronization logic
    - Implement scroll-to-highlight on map
    - Add pan-to-update feed
    - Create pin-tap-to-highlight-card
    - _Requirements: 3.2, 3.3, 3.4_


  - [ ]* 7.4 Write property test for map-feed sync on scroll
    - **Property 13: Map-feed synchronization on scroll**
    - **Validates: Requirements 3.2**

  - [ ]* 7.5 Write property test for map-feed sync on pan
    - **Property 14: Map-feed synchronization on pan**
    - **Validates: Requirements 3.3**

  - [ ]* 7.6 Write property test for pin-to-card highlighting
    - **Property 15: Pin-to-card highlighting**
    - **Validates: Requirements 3.4**

  - [x] 7.7 Add "Search This Area" functionality
    - Implement viewport bounds detection
    - Add search trigger button
    - Update feed based on bounds
    - _Requirements: 3.5_

  - [ ]* 7.8 Write property test for search area reload
    - **Property 16: Search area reload**
    - **Validates: Requirements 3.5**

  - [x] 7.9 Implement view mode switching (map/feed/split)
    - Add view mode toggle controls
    - Handle responsive layouts
    - _Requirements: 3.1_

- [x] 8. Create lifestyle category system
  - [x] 8.1 Build LifestyleCategorySelector component
    - Create horizontal scrollable category chips
    - Add active category highlighting
    - Implement category selection handling
    - _Requirements: 4.1, 4.2_

  - [ ]* 8.2 Write property test for category filtering
    - **Property 18: Category filtering**
    - **Validates: Requirements 4.2**






  - [x] 8.3 Implement multi-feed category filtering
    - Apply filters to video feed
    - Apply filters to discovery cards


    - Apply filters to map view
    - _Requirements: 4.3_

  - [ ]* 8.4 Write property test for multi-feed filtering
    - **Property 19: Multi-feed category filtering**
    - **Validates: Requirements 4.3**



  - [x] 8.5 Add category session persistence
    - Store active category in session state
    - Restore category on navigation
    - _Requirements: 4.4_

  - [ ]* 8.6 Write property test for category persistence
    - **Property 20: Category session persistence**


    - **Validates: Requirements 4.4**

  - [x] 8.7 Seed default lifestyle categories
    - Create categories: Secure Estates, Luxury, Family Living, etc.
    - Add category icons and descriptions
    - _Requirements: 4.5_



- [x] 9. Build neighbourhood detail pages
  - [x] 9.1 Create NeighbourhoodDetailPage component
    - Build hero banner section
    - Add neighbourhood description
    - Implement map integration
    - _Requirements: 5.1_



  - [x] 9.2 Implement amenity display system
    - Create amenity icons and labels
    - Display schools, shopping, transport, safety ratings
    - _Requirements: 5.2_

  - [ ]* 9.3 Write property test for amenity display
    - **Property 21: Neighbourhood amenity display**
    - **Validates: Requirements 5.2**

  - [x] 9.4 Add price statistics visualization
    - Create price trend charts
    - Display average property values
    - _Requirements: 5.3_

  - [ ]* 9.5 Write property test for price data display
    - **Property 22: Neighbourhood price data display**
    - **Validates: Requirements 5.3**

  - [x] 9.6 Implement neighbourhood video section
    - Filter videos by neighbourhood
    - Display video tours
    - _Requirements: 5.4_

  - [ ]* 9.7 Write property test for video filtering
    - **Property 23: Neighbourhood video filtering**
    - **Validates: Requirements 5.4**

  - [x] 9.8 Add neighbourhood property listings
    - Filter properties by neighbourhood
    - Display available properties
    - _Requirements: 5.5_

  - [ ]* 9.9 Write property test for property filtering
    - **Property 24: Neighbourhood property filtering**
    - **Validates: Requirements 5.5**

  - [x] 9.10 Implement follow/unfollow functionality
    - Add follow button
    - Update user preferences
    - Track follower counts
    - _Requirements: 5.6, 13.1_

  - [ ]* 9.11 Write property test for follow impact
    - **Property 25: Follow impact on recommendations**
    - **Validates: Requirements 5.6**






  - [ ]* 9.12 Write property test for neighbourhood follow action
    - **Property 55: Neighbourhood follow action**
    - **Validates: Requirements 13.1**

- [x] 10. Implement dynamic filtering system
  - [x] 10.1 Create FilterPanel component
    - Build filter UI with property type detection


    - Implement residential property filters
    - Implement development filters
    - Implement land filters
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 10.2 Build multi-view filter synchronization
    - Apply filters to all views simultaneously
    - Update video feed, discovery cards, and map
    - _Requirements: 6.4_

  - [ ]* 10.3 Write property test for multi-view sync
    - **Property 26: Multi-view filter synchronization**


    - **Validates: Requirements 6.4**

  - [x] 10.4 Implement dynamic filter adaptation
    - Change available filters based on property type
    - Update filter options on type change
    - _Requirements: 6.5_

  - [x]* 10.5 Write property test for filter adaptation

    - **Property 27: Dynamic filter adaptation**
    - **Validates: Requirements 6.5**

  - [x] 10.6 Add filter state display and clearing
    - Show filter count badge
    - Implement clear all filters action
    - _Requirements: 6.6_





  - [ ]* 10.7 Write property test for filter state display
    - **Property 28: Filter state display**
    - **Validates: Requirements 6.6**


- [ ] 11. Create boost campaign system
  - [ ] 11.1 Build BoostService for campaign management
    - Implement campaign creation logic
    - Add budget tracking
    - Create targeting configuration
    - _Requirements: 9.1, 9.2_



  - [ ]* 11.2 Write property test for boost frequency
    - **Property 37: Boost frequency increase**
    - **Validates: Requirements 9.2**

  - [ ] 11.3 Implement boosted content injection
    - Add sponsored content to feeds
    - Maintain 1:10 sponsored-to-organic ratio
    - Add "Sponsored" labels
    - _Requirements: 9.3, 9.6_

  - [ ]* 11.4 Write property test for boost labeling
    - **Property 38: Boost labeling**
    - **Validates: Requirements 9.3**

  - [ ]* 11.5 Write property test for sponsored ratio
    - **Property 41: Sponsored content ratio**
    - **Validates: Requirements 9.6**

  - [ ] 11.6 Build boost analytics dashboard
    - Track impressions, clicks, conversions
    - Calculate cost per interaction
    - Display real-time metrics
    - _Requirements: 9.4_

  - [ ]* 11.7 Write property test for boost analytics
    - **Property 39: Boost analytics provision**
    - **Validates: Requirements 9.4**

  - [ ] 11.8 Implement budget enforcement
    - Monitor campaign spending
    - Auto-pause when budget depleted
    - Send creator notifications
    - _Requirements: 9.5_

  - [ ]* 11.9 Write property test for budget enforcement
    - **Property 40: Boost budget enforcement**
    - **Validates: Requirements 9.5**

- [ ] 12. Build user engagement tracking
  - [ ] 12.1 Create engagement recording system
    - Track video watch time
    - Record saves, shares, clicks
    - Store engagement in database
    - _Requirements: 2.3, 14.1_

  - [ ] 12.2 Implement session tracking
    - Create session on Explore entry
    - Track session duration and interactions
    - Close session on exit
    - _Requirements: 2.6_

  - [ ] 12.3 Build analytics aggregation service
    - Calculate video completion rates
    - Aggregate engagement metrics
    - Generate creator analytics
    - _Requirements: 8.6_

  - [ ]* 12.4 Write property test for analytics provision
    - **Property 36: Video analytics provision**
    - **Validates: Requirements 8.6**

- [x] 13. Implement save and follow features





  - [ ] 13.1 Create save functionality
    - Add save action to videos and cards
    - Store saved properties in database
    - Provide visual confirmation
    - _Requirements: 14.1, 14.2_

  - [ ] 13.2 Build saved properties view
    - Display all saved items

    - Add collection organization
    - Implement unsave action
    - _Requirements: 14.3, 14.5_

  - [ ]* 13.3 Write property test for saved items retrieval
    - **Property 60: Saved items retrieval**
    - **Validates: Requirements 14.3**


  - [ ]* 13.4 Write property test for save state display
    - **Property 62: Save state display**
    - **Validates: Requirements 14.5**

  - [ ] 13.5 Integrate saves into recommendation engine
    - Use save signals for personalization
    - Adjust recommendations based on saves
    - _Requirements: 14.4_


  - [ ]* 13.6 Write property test for save signal impact
    - **Property 61: Save signal for recommendations**
    - **Validates: Requirements 14.4**

  - [ ] 13.7 Implement creator follow system
    - Add follow button to creator profiles
    - Track followed creators
    - Update follower counts
    - _Requirements: 13.2, 13.5_

  - [ ]* 13.8 Write property test for creator follow impact
    - **Property 56: Creator follow impact**
    - **Validates: Requirements 13.2**

  - [ ]* 13.9 Write property test for follower notifications
    - **Property 59: Follower notifications**
    - **Validates: Requirements 13.5**

  - [ ] 13.10 Build followed items display
    - Show followed neighbourhoods
    - Show followed creators
    - Add unfollow actions
    - _Requirements: 13.3, 13.4_

  - [ ]* 13.11 Write property test for followed items display
    - **Property 57: Followed items display**
    - **Validates: Requirements 13.3**

  - [ ]* 13.12 Write property test for unfollow impact
    - **Property 58: Unfollow impact**
    - **Validates: Requirements 13.4**

- [ ] 14. Create similar properties system
  - [ ] 14.1 Build similarity calculation algorithm
    - Implement price range matching (±20%)
    - Add location proximity scoring
    - Match property features
    - _Requirements: 15.1, 15.3_

  - [ ]* 14.2 Write property test for similar property generation
    - **Property 63: Similar property generation**
    - **Validates: Requirements 15.1, 15.3**

  - [ ] 14.3 Integrate similar properties into feed
    - Add "Similar to What You Viewed" section
    - Display similar properties based on history
    - _Requirements: 15.2_

  - [ ]* 14.4 Write property test for similar properties in feed
    - **Property 64: Similar properties in feed**
    - **Validates: Requirements 15.2**

  - [ ] 14.5 Implement algorithm refinement
    - Track which similar properties get engagement
    - Adjust similarity weights based on interactions
    - _Requirements: 15.4_

  - [ ]* 14.6 Write property test for algorithm refinement
    - **Property 65: Similarity algorithm refinement**
    - **Validates: Requirements 15.4**

  - [ ] 14.7 Add fallback expansion logic
    - Expand search radius when no matches
    - Adjust price range when needed
    - _Requirements: 15.5_

  - [ ]* 14.8 Write property test for fallback expansion
    - **Property 66: Similarity fallback expansion**
    - **Validates: Requirements 15.5**

- [ ] 15. Build admin dashboard
  - [ ] 15.1 Create admin Explore management interface
    - Build category management UI
    - Add video approval workflow
    - Implement content featuring controls
    - _Requirements: 11.1, 11.4_

  - [ ]* 15.2 Write property test for admin video actions
    - **Property 45: Admin video actions**
    - **Validates: Requirements 11.2**

  - [ ]* 15.3 Write property test for featured content prioritization
    - **Property 46: Featured content prioritization**
    - **Validates: Requirements 11.3**

  - [ ]* 15.4 Write property test for category management
    - **Property 47: Category management operations**
    - **Validates: Requirements 11.4**

  - [ ] 15.5 Build admin analytics dashboard
    - Display engagement metrics
    - Show top-performing content
    - Add filtering and date ranges
    - _Requirements: 11.5_

  - [ ]* 15.6 Write property test for admin analytics
    - **Property 48: Admin analytics display**
    - **Validates: Requirements 11.5**

  - [ ] 15.7 Implement sponsored content configuration
    - Add placement frequency controls
    - Configure target audience parameters
    - _Requirements: 11.6_

  - [ ]* 15.8 Write property test for sponsored config
    - **Property 49: Sponsored content configuration**
    - **Validates: Requirements 11.6**

- [x] 16. Implement personalized content sections
  - [x] 16.1 Create "For You" content block
    - Generate personalized recommendations
    - Display in horizontal scroll
    - _Requirements: 12.1, 12.5_

  - [ ]* 16.2 Write property test for For You personalization
    - **Property 53: For You personalization**
    - **Validates: Requirements 12.5**

  - [x] 16.3 Build "Popular Near You" section
    - Use user location for filtering
    - Show trending local properties
    - _Requirements: 12.1, 12.6_

  - [ ]* 16.4 Write property test for location-based content
    - **Property 54: Location-based popular content**
    - **Validates: Requirements 12.6**

  - [x] 16.5 Add "New Developments" and "Trending" sections
    - Filter by development status
    - Sort by engagement metrics
    - _Requirements: 12.1_

- [x] 17. Optimize performance and caching

  - [x] 17.1 Implement Redis caching layer
    - Cache user preferences (1-hour TTL)
    - Cache feed results (5-minute TTL)
    - Cache neighbourhood data (1-day TTL)
    - _Requirements: 10.1, 10.2_
    - **Status**: ✅ Complete - Redis integrated with Railway, automatic fallback to in-memory cache

  - [x] 17.2 Add CDN integration for media
    - Configure CloudFront for videos
    - Set up image CDN with format conversion
    - Implement adaptive bitrate streaming
    - _Requirements: 10.1_
    - **Status**: ✅ Complete - Already configured and in use

  - [x] 17.3 Optimize database queries
    - Add composite indexes
    - Implement query result caching
    - Set up read replicas
    - _Requirements: All performance-related_
    - **Status**: ✅ Complete - 15 performance indexes created

  - [x] 17.4 Implement progressive loading
    - Add loading skeletons
    - Implement blur-up for images
    - Progressive JPEG encoding
    - _Requirements: 10.2, 10.6_
    - **Status**: ✅ Complete - Skeleton and ProgressiveImage components created

- [x] 18. Add accessibility features
  - [x] 18.1 Implement video accessibility
    - Generate auto-subtitles for videos
    - Add subtitle toggle control
    - Implement keyboard navigation
    - _Requirements: All accessibility-related_

  - [x] 18.2 Add ARIA labels and semantic HTML
    - Label all interactive elements
    - Ensure proper heading hierarchy
    - Add focus indicators
    - _Requirements: All accessibility-related_

  - [x] 18.3 Implement motion preferences
    - Respect prefers-reduced-motion
    - Disable auto-play for motion sensitivity
    - Provide static alternatives
    - _Requirements: All accessibility-related_

- [ ] 19. Implement sponsored content disclosure
  - [ ] 19.1 Add sponsored labels to boosted content
    - Display "Sponsored" badge
    - Ensure label visibility
    - _Requirements: 7.5, 9.3_

  - [ ]* 19.2 Write property test for sponsored disclosure
    - **Property 33: Sponsored content disclosure**
    - **Validates: Requirements 7.5**

- [ ] 20. Final integration and testing
  - [ ] 20.1 Integration testing across all components
    - Test video feed to listing navigation
    - Test map-feed synchronization end-to-end
    - Test recommendation engine with real data
    - _Requirements: All_

  - [ ]* 20.2 Performance testing
    - Load test API endpoints
    - Test video streaming under load
    - Verify caching effectiveness
    - _Requirements: All performance-related_

  - [ ]* 20.3 End-to-end user flow testing
    - Test complete user journey through Explore
    - Verify all interactions work correctly
    - Test on multiple devices and browsers
    - _Requirements: All_

- [ ] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
