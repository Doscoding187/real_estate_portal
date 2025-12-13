# Location Pages - Section-by-Section Breakdown

This document breaks down the location pages into individual sections based on the reference design. Each section will be built, tested, and refined independently.

## Reference Image Analysis

Based on the provided reference image, the location page consists of these key sections:

---

## Section 1: Hero Section
**Priority: HIGH | Phase 1**

### Visual Description
- Full-width hero area with background image or gradient
- Large, prominent location name (H1)
- Breadcrumb trail showing hierarchy
- Key statistics displayed inline (Total Listings, Avg Price, Avg Rent)
- Integrated search bar with filters

### Components Needed
- `HeroLocation` component
- `StatsBar` component (inline stats)
- `SearchBar` component (integrated)

### Data Requirements
- Location name
- Total listing count
- Average sale price
- Average rental price
- Background image URL

### User Actions
- View location overview
- See key statistics at a glance
- Start a search with location pre-filled

---

## Section 2: Search & Filter Bar
**Priority: HIGH | Phase 2**

### Visual Description
- Prominent search refinement controls
- Property type dropdown
- Price range slider or inputs
- Bedroom/bathroom filters
- "Search" or "Apply Filters" button

### Components Needed
- `SearchRefinementBar` component
- `PropertyTypeDropdown`
- `PriceRangeSlider`
- `BedroomFilter`
- `BathroomFilter`

### Data Requirements
- Available property types in location
- Price range (min/max) for location
- Available bedroom/bathroom options

### User Actions
- Filter by property type
- Set price range
- Select bedroom/bathroom count
- Navigate to search results with filters applied

---

## Section 3: Property Type Explorer
**Priority: HIGH | Phase 2**

### Visual Description
- Grid of 4-6 large property type cards
- Each card shows:
  - Icon representing property type
  - Property type name (Houses, Apartments, etc.)
  - Number of listings
  - Average price
- Cards are clickable and navigate to filtered search

### Components Needed
- `PropertyTypeExplorer` component
- `PropertyTypeCard` component

### Data Requirements
- Property type breakdown (count per type)
- Average price per property type
- Icons for each property type

### User Actions
- Click property type card
- Navigate to search results filtered by type

---

## Section 4: Popular Cities/Suburbs Grid
**Priority: HIGH | Phase 3**

### Visual Description
- Grid layout (4 columns desktop, 2 tablet, 1 mobile)
- Each card shows:
  - Location image
  - Location name
  - Number of listings
  - Average price
- Hover effects on cards
- "View All" link at bottom

### Components Needed
- `LocationGrid` component
- `LocationCard` component

### Data Requirements
- List of child locations (cities for province, suburbs for city)
- Listing count per location
- Average price per location
- Location images

### User Actions
- Click location card
- Navigate to child location page
- View all locations

---

## Section 5: Featured Listings
**Priority: MEDIUM | Phase 4**

### Visual Description
- Grid of 6-12 property cards
- Each card shows:
  - Property image
  - Price
  - Bedrooms, bathrooms, square meters
  - Location (suburb/city)
- "View All Properties" button at bottom

### Components Needed
- `FeaturedListings` component
- `PropertyCard` component

### Data Requirements
- 6-12 featured property listings
- Property images, prices, specs
- Property location details

### User Actions
- Click property card
- Navigate to property detail page
- View all properties in location

---

## Section 6: Trending Suburbs Slider
**Priority: MEDIUM | Phase 5**

### Visual Description
- Horizontal scrollable slider
- Shows 8-10 trending suburb cards
- Each card shows:
  - Suburb name
  - Trend indicator (↑ 15%)
  - Number of listings
  - Average price
- Swipe support on mobile
- Navigation arrows on desktop

### Components Needed
- `TrendingSlider` component
- `TrendingCard` component

### Data Requirements
- Trending suburbs with trend scores
- Listing counts
- Price changes (YoY)
- View/inquiry growth metrics

### User Actions
- Swipe/scroll through trending suburbs
- Click suburb card
- Navigate to suburb page

---

## Section 7: New Developments
**Priority: MEDIUM | Phase 5**

### Visual Description
- Grid or slider of development cards
- Each card shows:
  - Development image
  - Development name
  - Location
  - Price range (R1.5M - R3M)
  - Completion date
- "View All Developments" link

### Components Needed
- `DevelopmentsGrid` component
- `DevelopmentCard` component

### Data Requirements
- Active developments in location
- Development images, names, locations
- Price ranges
- Completion dates

### User Actions
- Click development card
- Navigate to development detail page
- View all developments

---

## Section 8: Market Insights
**Priority: MEDIUM | Phase 6**

### Visual Description
- Statistics cards or panels
- Shows:
  - Average sale price
  - Average rental price
  - Price per square meter
  - Days on market (DOM)
  - Year-over-year growth (%)
  - Rental yield (%)
- Optional: Price history chart
- Optional: Property type distribution chart

### Components Needed
- `MarketInsights` component
- `StatCard` component
- `PriceHistoryChart` component (optional)
- `PropertyTypeChart` component (optional)

### Data Requirements
- Average prices (sale/rent)
- Price per sqm
- Days on market
- YoY growth percentage
- Rental yield
- Historical price data (for chart)

### User Actions
- View market statistics
- Understand market trends
- Compare with other locations

---

## Section 9: Lifestyle & Amenities
**Priority: LOW | Phase 7**

### Visual Description
- Organized by category:
  - Schools (with ratings/distances)
  - Transport (train, bus, highways)
  - Shopping (malls, centers)
  - Healthcare (hospitals, clinics)
- Each amenity shows:
  - Name
  - Distance from location
  - Rating (if applicable)

### Components Needed
- `AmenitiesSection` component
- `AmenityCategory` component
- `AmenityItem` component

### Data Requirements
- Nearby schools with ratings
- Transport options and distances
- Shopping centers
- Healthcare facilities

### User Actions
- View nearby amenities
- Understand lifestyle in area
- Click amenity for more details

---

## Section 10: Nearby Suburbs (Suburb Pages Only)
**Priority: LOW | Phase 7**

### Visual Description
- Small grid of 4-6 nearby suburb cards
- Each card shows:
  - Suburb name
  - Distance from current suburb
  - Number of listings
  - Average price

### Components Needed
- `NearbySuburbs` component
- `SuburbCard` component

### Data Requirements
- Nearby suburbs (within same city)
- Distances
- Listing counts
- Average prices

### User Actions
- Click nearby suburb card
- Navigate to suburb page
- Explore similar areas

---

## Section 11: SEO Content Block
**Priority: MEDIUM | Phase 8**

### Visual Description
- Text content section (150-500 words)
- Proper heading structure (H2, H3)
- Naturally written content about the location
- Includes keywords and statistics
- Readable, not keyword-stuffed

### Components Needed
- `SEOTextBlock` component

### Data Requirements
- Location name and context
- Key statistics
- Notable features/highlights
- Auto-generated or manual content

### User Actions
- Read about the location
- Understand area highlights
- (SEO benefit for search engines)

---

## Section 12: Final Call-to-Action
**Priority: HIGH | Phase 9**

### Visual Description
- Three prominent CTA buttons at page bottom
- Buttons:
  1. "Search Houses in [Location]"
  2. "Search Apartments in [Location]"
  3. "View All Properties in [Location]"
- Full-width section with background color/gradient

### Components Needed
- `FinalCTA` component
- `CTAButton` component

### Data Requirements
- Location name
- Search URLs with filters

### User Actions
- Click CTA button
- Navigate to search results with filters applied

---

## Section 13: Breadcrumb Navigation
**Priority: HIGH | Phase 9**

### Visual Description
- Horizontal breadcrumb trail
- Shows: Home > Province > City > Suburb
- Each level is clickable (except current)
- Includes schema markup for SEO

### Components Needed
- `Breadcrumbs` component

### Data Requirements
- Current location hierarchy
- URLs for each level

### User Actions
- Click breadcrumb level
- Navigate up the hierarchy
- Understand current location context

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Hero Section
2. Breadcrumb Navigation

### Phase 2: Core Discovery (Week 1-2)
3. Search & Filter Bar
4. Property Type Explorer
5. Popular Cities/Suburbs Grid

### Phase 3: Content (Week 2)
6. Featured Listings
7. Final Call-to-Action

### Phase 4: Enhanced Discovery (Week 3)
8. Trending Suburbs Slider
9. New Developments

### Phase 5: Data & Context (Week 3)
10. Market Insights
11. SEO Content Block

### Phase 6: Polish (Week 4)
12. Lifestyle & Amenities
13. Nearby Suburbs

---

## Responsive Behavior

### Mobile (< 640px)
- Hero: Full-width, stacked stats
- Property Types: Horizontal scroll
- Location Grid: 1 column
- Featured Listings: 1 column
- Trending: Full-width swipe
- Developments: Horizontal scroll
- Market Insights: Stacked cards
- CTAs: Stacked buttons

### Tablet (640px - 1023px)
- Hero: Full-width, inline stats
- Property Types: 2 columns
- Location Grid: 2 columns
- Featured Listings: 2 columns
- Trending: 2-3 visible
- Developments: 2 columns
- Market Insights: 2 columns
- CTAs: Inline buttons

### Desktop (1024px+)
- Hero: Full-width with background
- Property Types: 4 columns
- Location Grid: 3-4 columns
- Featured Listings: 3-4 columns
- Trending: 4-5 visible
- Developments: 3 columns
- Market Insights: Multi-column
- CTAs: Inline with hover effects

---

## Design Tokens

### Colors
- Primary: #2563eb (blue)
- Secondary: #10b981 (green)
- Accent: #f59e0b (amber)
- Background: #f9fafb (light gray)
- Card: #ffffff (white)
- Text: #111827 (dark gray)
- Text Secondary: #6b7280 (medium gray)

### Typography
- H1: 2.5rem (40px) - Location name
- H2: 2rem (32px) - Section headings
- H3: 1.5rem (24px) - Subsection headings
- Body: 1rem (16px) - Regular text
- Small: 0.875rem (14px) - Secondary text

### Spacing
- Section padding: 4rem (64px) vertical
- Card padding: 1.5rem (24px)
- Grid gap: 1.5rem (24px)
- Element spacing: 1rem (16px)

### Shadows
- Card: 0 1px 3px rgba(0,0,0,0.1)
- Card hover: 0 4px 6px rgba(0,0,0,0.1)
- Button: 0 1px 2px rgba(0,0,0,0.05)

---

## Next Steps

1. Review this breakdown with the team
2. Confirm section priorities
3. Start with Phase 1 (Hero + Breadcrumbs)
4. Build, test, and refine each section
5. Move to next phase once current phase is complete

Each section should be:
- Fully functional
- Responsive
- Tested
- Documented

Before moving to the next section.
