# Implementation Plan: Property Explore Shorts

## Overview
This implementation plan breaks down the Property Explore Shorts feature into discrete, manageable tasks. Each task builds incrementally on previous work, ensuring the system remains functional throughout development.

---

## Phase 1: Database & Backend Foundation

- [x] 1. Set up database schema and core backend infrastructure



  - Create explore_shorts table with all fields and indexes
  - Create explore_interactions table for analytics tracking
  - Create explore_highlight_tags table with predefined tags
  - Create explore_user_preferences table for personalization
  - Add foreign key constraints and indexes
  - _Requirements: 1.1, 1.2, 7.1, 7.2, 8.1, 9.1, 12.1_



- [ ] 1.1 Write property test for database schema integrity
  - **Property 16: Platform integration**


  - **Validates: Requirements 12.1**

- [x] 1.2 Seed highlight tags data


  - Insert predefined highlight tags (Ready to Move, No Transfer Duty, Large Yard, etc.)
  - Set appropriate display order and categories
  - _Requirements: 7.2_

- [ ] 1.3 Create backend API router for Explore Shorts
  - Set up exploreRouter.ts with tRPC



  - Add authentication middleware
  - Add rate limiting middleware
  - _Requirements: 12.1_

---

## Phase 2: Feed API Endpoints



- [ ] 2. Implement feed generation endpoints
  - Create GET /explore/recommended endpoint
  - Create GET /explore/by-area endpoint
  - Create GET /explore/by-category endpoint
  - Create GET /explore/agent-feed/:id endpoint
  - Create GET /explore/developer-feed/:id endpoint


  - _Requirements: 4.1, 4.2, 4.3, 4.4_



- [ ] 2.1 Implement basic feed service
  - Create FeedService class
  - Implement getRecommendedFeed method (basic version without ML)
  - Implement getAreaFeed method
  - Implement getCategoryFeed method
  - Implement getAgentFeed method

  - Implement getDeveloperFeed method
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2_

- [ ] 2.2 Write property test for feed generation
  - **Property 9: Feed type switching**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**




- [ ] 2.3 Implement feed pagination and caching
  - Add limit/offset pagination support
  - Implement Redis caching for feed results (5-minute TTL)
  - Add cache invalidation logic
  - _Requirements: 4.1_

---

## Phase 3: Interaction & Analytics Endpoints

- [ ] 3. Implement interaction tracking endpoints
  - Create POST /explore/interaction endpoint
  - Create POST /explore/save/:propertyId endpoint
  - Create POST /explore/share/:propertyId endpoint
  - Add session tracking for guest users
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 11.2, 11.3_

- [ ] 3.1 Create interaction service
  - Implement recordInteraction method
  - Implement saveProperty method
  - Implement shareProperty method
  - Add batch insert optimization for high-volume interactions


  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 3.2 Write property test for interaction tracking
  - **Property 11: Interaction tracking**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

- [ ] 3.3 Implement performance score calculator
  - Create PerformanceScorer service
  - Implement calculateScore method (view-through rate, watch time, save rate, share rate, skip rate)


  - Add boost priority weighting
  - Schedule periodic score recalculation (every 15 minutes)
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 3.4 Write property test for performance score calculation
  - **Property 12: Performance score calculation**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6**




---

## Phase 4: Frontend Core Components

- [ ] 4. Create ShortsContainer component
  - Set up component structure with state management
  - Implement feed loading logic
  - Implement infinite scroll/pagination
  - Add loading and error states
  - _Requirements: 1.1, 4.1_



- [ ] 4.1 Write property test for ShortsContainer
  - **Property 1: Full-screen card display**
  - **Validates: Requirements 1.1, 1.2**

- [ ] 4.2 Create PropertyCard component
  - Implement full-screen card layout
  - Display price, location, specs, and highlights
  - Add responsive design for mobile/tablet/desktop
  - _Requirements: 1.1, 1.2, 7.1, 7.4_

- [ ] 4.3 Write property test for PropertyCard rendering
  - **Property 2: Swipe navigation consistency**
  - **Validates: Requirements 2.1, 2.2, 10.1**

- [ ] 4.3 Create PropertyOverlay component
  - Implement bottom overlay with basic info
  - Add expand/collapse functionality
  - Display CTA buttons (Contact Agent, Book Viewing, WhatsApp)
  - _Requirements: 3.1, 3.2, 3.3_

- [ ] 4.4 Write property test for overlay expansion
  - **Property 7: Overlay expansion**
  - **Validates: Requirements 3.1, 3.2**

---

## Phase 5: Gesture & Interaction System

- [ ] 5. Implement SwipeEngine component
  - Set up react-spring and react-use-gesture
  - Implement vertical swipe detection (up/down)
  - Implement tap zone detection (left/right)
  - Implement double-tap detection
  - Implement long-press detection
  - Add gesture conflict prevention
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [ ] 5.1 Write property test for swipe gestures
  - **Property 2: Swipe navigation consistency**
  - **Validates: Requirements 2.1, 2.2**

- [ ] 5.2 Write property test for tap navigation
  - **Property 3: Photo gallery navigation**
  - **Validates: Requirements 2.3, 2.4**

- [ ] 5.3 Write property test for double-tap save
  - **Property 4: Double-tap save action**
  - **Validates: Requirements 2.5, 11.2**

- [ ] 5.2 Implement card transition animations
  - Create smooth slide-up/slide-down animations
  - Ensure transitions complete within 300ms
  - Add spring physics for natural feel
  - _Requirements: 2.1, 2.2, 10.1_

- [ ] 5.4 Write property test for transition timing
  - **Property 13: Preloading efficiency**
  - **Validates: Requirements 10.1, 10.2, 10.3**

---

## Phase 6: Media Player System

- [ ] 6. Create MediaPlayer component
  - Implement video player with HTML5 video element
  - Implement photo slideshow with auto-advance
  - Add mute/unmute toggle
  - Add photo gallery navigation (left/right taps)
  - Display current photo indicator
  - _Requirements: 1.3, 1.4, 1.5, 2.3, 2.4_

- [ ] 6.1 Write property test for video autoplay
  - **Property 5: Video autoplay behavior**
  - **Validates: Requirements 1.3, 1.5**

- [ ] 6.2 Write property test for photo slideshow
  - **Property 6: Photo slideshow fallback**
  - **Validates: Requirements 1.4**

- [ ] 6.2 Implement PreloadManager
  - Preload next card's first frame
  - Preload previous card's first frame
  - Implement lazy loading for videos
  - Add memory management to prevent leaks
  - _Requirements: 10.2, 10.3, 10.4_

- [ ] 6.3 Add media error handling
  - Implement retry logic for failed loads
  - Show placeholder for failed media
  - Fall back to photos if video fails
  - Log errors to analytics
  - _Requirements: 1.3, 1.4_

---

## Phase 7: Quick Actions & CTAs

- [ ] 7. Implement top-right action icons
  - Add Save icon with tap handler
  - Add Share icon with tap handler
  - Add More icon with menu
  - Implement visual feedback for actions
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 7.1 Write property test for quick action icons
  - **Property 15: Quick action icons**
  - **Validates: Requirements 11.1, 11.2, 11.3, 11.4, 11.5**

- [ ] 7.2 Implement CTA button handlers
  - Connect "Contact Agent" to messaging system
  - Connect "Book Viewing" to viewing scheduler
  - Connect "WhatsApp Agent" to WhatsApp deep link
  - Add loading states for async actions
  - _Requirements: 3.4, 3.5, 12.2, 12.3_

- [ ] 7.3 Write property test for CTA functionality
  - **Property 8: CTA button functionality**
  - **Validates: Requirements 3.3, 3.4, 3.5**

---

## Phase 8: Feed Filtering & Categories

- [ ] 8. Implement feed type selector
  - Create feed type switcher UI (Recommended, Area, Category, Agent, Developer)
  - Add area selection dropdown
  - Add category selection dropdown
  - Implement feed switching logic
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 8.1 Write property test for feed filtering
  - **Property 9: Feed type switching**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ] 8.2 Implement category filters
  - Add predefined categories (Luxury Homes, Student Rentals, etc.)
  - Connect category selection to feed API
  - Add category badges to UI
  - _Requirements: 4.5_

---

## Phase 9: Recommendation Engine

- [ ] 9. Implement basic recommendation algorithm
  - Factor in user location proximity
  - Factor in user budget preferences
  - Factor in property type preferences
  - Include top-performing properties
  - Apply boost priority weighting
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 9.1 Write property test for recommendation algorithm
  - **Property 9: Feed type switching**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 9.2 Implement user preference tracking
  - Track viewed properties
  - Track saved properties
  - Track interaction patterns
  - Update user preferences in database
  - _Requirements: 5.3_

- [ ] 9.3 Add behavioral signals to recommendations
  - Factor in scroll patterns (skip rate)
  - Factor in save rate
  - Factor in share rate
  - Adjust recommendations based on behavior
  - _Requirements: 5.3_

---

## Phase 10: Content Creator Interface

- [ ] 10. Create shorts upload interface for agents/developers
  - Create upload form component
  - Add video file upload with validation
  - Add photo upload with validation
  - Add caption input field
  - Add highlight tag selector (max 4)
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 10.1 Write property test for upload validation
  - **Property 6: Photo slideshow fallback**
  - **Validates: Requirements 6.1, 6.2, 6.4, 6.5**

- [ ] 10.2 Implement media upload endpoint
  - Create POST /explore/upload endpoint
  - Validate file types and sizes
  - Upload to S3
  - Create explore_shorts record
  - Link to listing or development
  - _Requirements: 6.1, 6.2, 6.5, 12.5_

- [ ] 10.3 Implement media processing pipeline
  - Detect video orientation (vertical/horizontal)
  - Generate video thumbnails
  - Generate video preview clips (3 seconds)
  - Optimize images
  - Store processed media URLs
  - _Requirements: 6.1, 6.5_

- [ ] 10.4 Add content management interface
  - List uploaded shorts
  - Edit shorts (caption, highlights, publish status)
  - Delete shorts
  - View performance metrics
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

---

## Phase 11: Analytics & Performance Tracking

- [ ] 11. Implement client-side analytics tracking
  - Track impression events on card display
  - Track view events (>2 seconds)
  - Track hold time duration
  - Track skip events (quick swipes)
  - Track save events
  - Track share events
  - Send events to backend API
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 11.1 Write property test for analytics tracking
  - **Property 11: Interaction tracking**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5, 8.6**

- [ ] 11.2 Create analytics dashboard for agents/developers
  - Display view count, save count, share count
  - Display view-through rate
  - Display average watch time
  - Display performance score
  - Show trends over time
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

---

## Phase 12: Desktop Experience

- [ ] 12. Implement desktop-optimized layout
  - Create centered mobile frame for desktop
  - Add max-width constraint (420px)
  - Maintain vertical shorts experience
  - Add keyboard navigation support
  - _Requirements: 10.5_

- [ ] 12.1 Write property test for desktop layout
  - **Property 14: Desktop frame simulation**
  - **Validates: Requirements 10.5**

---

## Phase 13: Performance Optimization

- [ ] 13. Implement caching and optimization
  - Add Redis caching for feed results
  - Add Redis caching for performance scores
  - Add Redis caching for user preferences
  - Implement CDN for media delivery
  - Add database query optimization
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 13.1 Write property test for preloading
  - **Property 13: Preloading efficiency**
  - **Validates: Requirements 10.2, 10.3, 10.4**

- [ ] 13.2 Optimize client performance
  - Implement virtual scrolling
  - Add Web Workers for heavy computations
  - Optimize bundle size
  - Add performance monitoring
  - _Requirements: 10.1_

---

## Phase 14: Integration & Polish

- [ ] 14. Integrate with existing platform systems
  - Connect to listings database
  - Connect to developments database
  - Connect to CRM/lead capture system
  - Connect to messaging system
  - Connect to revenue/boost module
  - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

- [ ] 14.1 Write property test for platform integration
  - **Property 16: Platform integration**
  - **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

- [ ] 14.2 Add error handling and edge cases
  - Handle empty feeds gracefully
  - Handle network errors
  - Handle media loading failures
  - Add retry logic
  - Add user-friendly error messages
  - _Requirements: 1.1, 1.3, 1.4_

- [ ] 14.3 Implement accessibility features
  - Add ARIA labels
  - Add keyboard navigation
  - Add screen reader support
  - Add reduced motion mode
  - Test with accessibility tools
  - _Requirements: 1.1, 2.1, 2.2_

---

## Phase 15: Testing & Quality Assurance

- [ ] 15. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 15.1 Write integration tests
  - Test complete user journey (load feed → view property → save → contact agent)
  - Test feed switching
  - Test media playback
  - Test interaction tracking end-to-end

- [ ] 15.2 Write performance tests
  - Test feed API under load
  - Test smooth 60fps animations
  - Test memory usage during extended browsing
  - Test on various mobile devices

- [ ] 15.3 Conduct user acceptance testing
  - Test on real devices (iOS, Android)
  - Test on various screen sizes
  - Test on slow networks
  - Gather user feedback

---

## Phase 16: Deployment & Monitoring

- [ ] 16. Set up monitoring and observability
  - Add logging for all API endpoints
  - Add error tracking (Sentry or similar)
  - Add performance monitoring
  - Set up alerts for high error rates
  - Set up alerts for slow API responses
  - _Requirements: 8.1, 9.1_

- [ ] 16.2 Deploy to production
  - Run database migrations
  - Deploy backend API
  - Deploy frontend
  - Configure CDN
  - Configure Redis
  - Test in production environment
  - _Requirements: 1.1_

- [ ] 16.3 Create documentation
  - Document API endpoints
  - Document component usage
  - Create user guide for agents/developers
  - Create admin guide for platform management
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

---

## Notes

- Each phase builds on the previous phase
- Optional tasks (marked with *) include tests and documentation
- Core functionality should be implemented before optional enhancements
- Regular checkpoints ensure system stability
- All tasks reference specific requirements for traceability
