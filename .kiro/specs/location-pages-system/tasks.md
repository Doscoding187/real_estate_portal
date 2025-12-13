# Location Pages System - Section-by-Section Implementation

## Current Status: REBUILDING WITH MODERN UI

Building location pages section by section based on reference design. Each section will be implemented, tested, and refined before moving to the next.

## Phase 1: Foundation & Hero Section

- [ ] 1.1 Set up base page structure and routing
  - Create page templates for Province, City, Suburb
  - Configure routing with slug-based URLs
  - Set up data fetching hooks
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [ ] 1.2 Implement Hero Section component
  - Full-width hero with background image/gradient
  - Location name as H1 with breadcrumb context
  - Key statistics bar (total listings, avg price, avg rent)
  - Integrated search bar with location pre-filled
  - _Requirements: 1.1, 2.1, 3.1, 9.1_

- [ ]* 1.3 Write property test for Hero Section
  - **Property 1: Location Page Data Completeness**
  - **Validates: Requirements 1.1, 2.1, 3.1**

## Phase 2: Search & Filter Section

- [x] 2.1 Build Search Refinement Bar
  - Property type dropdown (Houses, Apartments, etc.)
  - Price range slider (min/max)
  - Bedroom/bathroom filters
  - "Search" button that navigates to results
  - _Requirements: 14.1, 14.2, 14.3_

- [x] 2.2 Implement Property Type Explorer Cards
  - Grid of 4-6 property type cards
  - Each card shows: icon, type name, count, avg price
  - Click navigates to filtered search results
  - Responsive: 4 cols desktop, 2 cols tablet, 1 col mobile
  - _Requirements: 1.3, 6.1, 6.2, 6.3, 6.4_

- [ ]* 2.3 Write property tests for search functionality
  - **Property 6: Search URL Construction**
  - **Property 3: Property Type Count Invariant**
  - **Validates: Requirements 2.2, 3.2, 6.1**

## Phase 3: Location Grid Section

- [ ] 3.1 Create LocationGrid component
  - Reusable grid for cities/suburbs
  - Card design: image, name, listing count, avg price
  - Hover effects and click navigation
  - Responsive grid (4-3-2-1 columns)
  - _Requirements: 1.2, 2.3, 4.2, 4.3_

- [ ] 3.2 Implement "Popular Cities" section (Province pages)
  - Display top 8-12 cities by listing count
  - Sort by popularity/listing count
  - Each card links to city page
  - _Requirements: 1.2_

- [ ] 3.3 Implement "Popular Suburbs" section (City pages)
  - Display top 12-16 suburbs by listing count
  - Each card links to suburb page
  - _Requirements: 2.3_

- [x] 3.4 Write property tests for location hierarchy
  - **Property 2: Hierarchical Data Consistency**
  - **Property 10: Navigation Link Validity**
  - **Validates: Requirements 1.2, 2.3, 4.2, 4.3**

## Phase 3B: Revenue Foundation (Hybrid Pivot)

- [x] 3B.1 Update Schema for Location Targeting
  - Add `location_targeting` table
  - Add demand scoring fields to `developments`
  - _Refined Plan 3B.1_

- [/] 3B.2 Implement Demand Scoring Engine
  - [x] Instrument analytics (`trackEvent`)
  - [ ] Create backend `analytics` router
  - [ ] Update `developments` scoring logic
  - _Refined Plan 3B.2_

- [x] 3B.3 Build Hero Billboard UI
  - Create `HeroBillboard.tsx`
  - Fetch ads from `location_targeting`
  - _Refined Plan 3B.3_

- [x] 3B.4 Create Admin Location Hub
  - Unified dashboard for ads/developers/agents
  - _Refined Plan 3B.4_

## Phase 4: Validating Revenue Streams (Weeks 3-5)

### Week 3: Hot-Selling Developments
- [x] 4.1 Update Developments Grid for "Hot" status
  - Display "Hot Selling" / "High Demand" badges
  - Sort "Hot" items first
  - Show "X people viewing this" (from analytics)
  - _Refined Plan 4.1_

- [x] 4.2 Verify Demand Scoring (Manual/Cron)
  - Trigger scoring calculation
  - Verify `developments` table updates
  - _Refined Plan 4.2_

### Week 4: Featured Developers
- [x] 4.3 Configure Featured Developers in Admin
  - Use `LocationMonetizationPage` to set featured devs
  - Create `FeaturedDevelopers.tsx` component
  - _Refined Plan 4.3_

### Week 5: Recommended Agents
- [x] 4.4 Configure Recommended Agents
  - Use `LocationMonetizationPage` to set agents
  - Create `RecommendedAgents.tsx` component
  - _Refined Plan 4.4_

- [ ] 4.1 Build Featured Listings Grid
  - Display 6-12 property cards
  - Card design: image, price, beds, baths, sqm
  - Click navigates to property detail page
  - Responsive: 4-3-2-1 columns
  - _Requirements: 3.3, 7.1, 7.2, 7.3_

- [ ] 4.2 Implement listing prioritization logic
  - Prioritize recent listings (last 30 days)
  - Prioritize high-quality images
  - Fallback to random selection if insufficient
  - _Requirements: 7.5_

- [ ] 4.3 Add empty state handling
  - Show message when no listings available
  - Suggest nearby areas with listings
  - _Requirements: 7.4_

- [ ]* 4.4 Write property test for featured listings
  - **Property 7: Featured Listings Boundary**
  - **Validates: Requirements 3.3, 7.1**

## Phase 5: Trending & Developments Section

- [x] 5.1 Create Trending Suburbs Slider
  - Horizontal scrollable slider
  - Show 8-10 trending suburbs
  - Display trend indicator (↑ percentage)
  - Swipe support on mobile
  - _Requirements: 1.4, 15.1, 15.2, 15.3_

- [x] 5.2 Implement trending calculation algorithm
  - Calculate based on listing growth, views, price changes
  - Weight: 30% listing growth, 30% views, 20% price, 20% inquiries
  - Compare last 30 days vs previous 30 days
  - _Requirements: 15.2, 15.4_

- [x] 5.3 Build New Developments Grid/Slider
  - Display 3-6 development cards
  - Card: image, name, location, price range, completion date
  - Click navigates to development detail page
  - _Requirements: 1.4, 2.4, 12.1, 12.2, 12.3_

- [ ]* 5.4 Write property tests for trending and developments
  - **Property 4: Trending Score Calculation**
  - **Property 17: Development Location Filtering**
  - **Validates: Requirements 1.4, 15.2, 12.1**

## Phase 6: Market Insights Section

- [x] 6.1 Create Market Statistics Cards
  - Display avg sale price, avg rent, price per sqm
  - Show time on market (DOM)
  - Display YoY growth percentage with trend indicator
  - Calculate rental yield for suburbs
  - _Requirements: 1.5, 5.1, 5.2, 5.3, 5.4_

- [x] 6.2 Implement statistics calculation service
  - Calculate AVG(price) for sale listings
  - Calculate AVG(rental_price) for rentals
  - Calculate AVG(price / size) for price per sqm
  - Calculate AVG(DATEDIFF(NOW(), created_at)) for DOM
  - _Requirements: 5.1, 5.2, 5.3, 13.2_

- [ ] 6.3 Add price history chart (optional)
  - Line chart showing price trends over 12 months
  - Separate lines for sale vs rent
  - _Requirements: 1.5_

- [ ]* 6.4 Write property tests for statistics
  - **Property 5: Statistics Calculation Accuracy**
  - **Property 8: Rental Yield Formula**
  - **Property 11: Time on Market Calculation**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

## Phase 7: Amenities & Lifestyle Section

- [x] 7.1 Build Amenities Section component
  - Display schools with ratings/distances
  - Show transport options (train, bus, highways)
  - List shopping centers and malls
  - Show healthcare facilities
  - _Requirements: 2.5, 3.5, 8.1, 8.2, 8.3, 8.4_

- [x] 7.2 Integrate amenities data source
  - Fetch from Google Places API
  - Calculate distances from location center
  - Handle valid data with caching
  - _Requirements: 8.5_

- [ ] 7.3 Create Nearby Suburbs component (Suburb pages)
  - Display 4-6 similar/nearby suburbs
  - Show basic stats for each
  - Link to suburb pages
  - _Requirements: 3.5_

## Phase 8: SEO & Content Section

- [ ] 8.1 Implement SEO Text Block component
  - Auto-generate 150-500 words based on page level
  - Province: 200-300 words
  - City: 300-500 words
  - Suburb: 150-250 words
  - Include location name, statistics, highlights
  - _Requirements: 9.2_

- [ ] 8.2 Generate meta tags for all page levels
  - Title tag with location and listing count
  - Meta description with key statistics
  - Canonical URL
  - Open Graph tags (og:title, og:description, og:image)
  - Twitter Card tags
  - _Requirements: 9.3, 9.5_

- [ ] 8.3 Add structured data (Schema.org)
  - Place schema for location
  - BreadcrumbList schema for navigation
  - Product schema for featured listings
  - _Requirements: 9.4_

- [ ]* 8.4 Write property tests for SEO
  - **Property 12: SEO Heading Structure**
  - **Property 13: SEO Content Word Count**
  - **Property 14: Meta Tag Completeness**
  - **Property 15: Schema Markup Validity**
  - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**

## Phase 9: Final CTAs & Navigation

- [ ] 9.1 Build Final CTA Section
  - Three prominent CTA buttons at page bottom
  - "Search Houses", "Search Apartments", "All Properties"
  - Each links to search with appropriate filters
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ] 9.2 Implement Breadcrumb Navigation
  - Display hierarchy: Home > Province > City > Suburb
  - Each level is clickable
  - Include schema markup
  - _Requirements: 4.1_

- [ ]* 9.3 Write property test for navigation
  - **Property 9: Breadcrumb Hierarchy**
  - **Validates: Requirements 4.1**

## Phase 10: Responsive Design & Polish

- [ ] 10.1 Implement mobile-first responsive layouts
  - Mobile: single column, horizontal sliders
  - Tablet: 2-3 columns, mixed layouts
  - Desktop: 3-4 columns, grid layouts
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 10.2 Add touch gesture support
  - Swipe navigation for sliders
  - Touch-friendly tap targets (min 44x44px)
  - _Requirements: 10.4_

- [ ] 10.3 Optimize performance
  - Lazy load images
  - Lazy load below-the-fold components
  - Implement virtual scrolling for large grids
  - _Requirements: 10.5_

- [ ] 10.4 Add loading states and skeletons
  - Skeleton screens for all sections
  - Loading spinners for data fetching
  - Smooth transitions

## Phase 11: Data & Caching

- [ ] 11.1 Implement API endpoints
  - GET /api/location/province/:slug
  - GET /api/location/province/:province/city/:city
  - GET /api/location/province/:province/city/:city/suburb/:suburb
  - GET /api/location/trending
  - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [ ] 11.2 Set up Redis caching
  - Cache province data (1 hour TTL)
  - Cache city data (1 hour TTL)
  - Cache suburb data (30 min TTL)
  - Cache trending data (30 min TTL)
  - _Requirements: 13.5_

- [ ] 11.3 Implement cache invalidation
  - Invalidate on new listing
  - Invalidate on listing update
  - Invalidate on listing deletion
  - _Requirements: 13.5_

- [ ]* 11.4 Write property tests for data consistency
  - **Property 16: Dynamic Data Freshness**
  - **Property 18: Cache Invalidation Consistency**
  - **Validates: Requirements 13.1, 13.5**

## Phase 12: Testing & Deployment

- [ ] 12.1 Write unit tests for all components
  - Test component rendering
  - Test prop handling
  - Test user interactions

- [ ] 12.2 Write integration tests
  - Test API endpoints
  - Test data fetching
  - Test error handling

- [ ] 12.3 Perform end-to-end testing
  - Test complete user flows
  - Test navigation between pages
  - Test search functionality

- [ ] 12.4 Run performance audits
  - Lighthouse scores (>90 for performance, SEO)
  - Page load time (<2 seconds)
  - Core Web Vitals

- [ ] 12.5 Deploy to production
  - Run database migrations
  - Seed location data
  - Configure environment variables
  - Deploy application

## Quick Reference

**Test URLs:**
- http://localhost:5000/gauteng (Province)
- http://localhost:5000/gauteng/johannesburg (City)
- http://localhost:5000/gauteng/johannesburg/sandton (Suburb)

**Key Components:**
- HeroLocation - Hero section with stats
- SearchRefinementBar - Search filters
- PropertyTypeExplorer - Property type cards
- LocationGrid - Cities/suburbs grid
- FeaturedListings - Property cards
- TrendingSlider - Trending suburbs
- DevelopmentsGrid - New developments
- MarketInsights - Statistics and charts
- AmenitiesSection - Lifestyle info
- SEOTextBlock - SEO content
- FinalCTA - Bottom CTAs
- Breadcrumbs - Navigation trail

## Notes

This is a complete rebuild focusing on modern UI/UX based on the reference design. Each phase builds on the previous one, allowing for iterative development and testing.
