# Design Document: Google Places Autocomplete Integration

## Overview

The Google Places Autocomplete Integration provides intelligent location input across the Property Listify platform while serving as the foundation for a dynamic, SEO-optimized location pages system. The design follows a dual-content architecture where static SEO content ensures crawlability and ranking, while dynamic market data provides real-time value to users.

### Key Design Principles

1. **SEO-First Architecture**: Static location records with stable URLs and crawlable content
2. **Dynamic Market Intelligence**: Real-time statistics calculated from actual listings
3. **API Cost Optimization**: Debouncing, caching, and session token management
4. **Progressive Enhancement**: Server-side rendering with client-side hydration
5. **Hierarchical Data Model**: Province → City → Suburb → Listings

## Architecture

### High-Level System Flow

```
User Input → Google Places Autocomplete → Place Selection → Place Details API
                                                                    ↓
                                                          Location Record Creation
                                                                    ↓
                                                    ┌───────────────┴───────────────┐
                                                    ↓                               ↓
                                          Listing Association              Location Page Generation
                                                    ↓                               ↓
                                          Dynamic Statistics ←────────────── SSR Merge
                                                                                    ↓
                                                                          SEO-Optimized Page
```

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  LocationAutocomplete Component                                  │
│  ├─ Input with debouncing (300ms)                               │
│  ├─ Suggestion dropdown                                          │
│  ├─ Recent searches display                                      │
│  └─ Map preview integration                                      │
│                                                                   │
│  Location Page Components                                        │
│  ├─ Static content (SSR)                                        │
│  ├─ Dynamic statistics (SSR + hydration)                        │
│  ├─ Interactive map                                              │
│  └─ Listing filters                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                         API Layer                                │
├─────────────────────────────────────────────────────────────────┤
│  Google Places Service                                           │
│  ├─ Autocomplete API wrapper                                    │
│  ├─ Place Details API wrapper                                   │
│  ├─ Session token management                                    │
│  └─ Error handling & fallbacks                                  │
│                                                                   │
│  Location Pages Service                                          │
│  ├─ Location CRUD operations                                    │
│  ├─ Hierarchy management                                         │
│  ├─ SEO content generation                                      │
│  └─ Statistics aggregation                                      │
│                                                                   │
│  Analytics Service                                               │
│  ├─ Market statistics calculation                               │
│  ├─ Trending suburbs analysis                                   │
│  └─ Similar locations recommendation                            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       Database Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  locations (static SEO content)                                  │
│  listings (dynamic data source)                                  │
│  location_searches (trending analysis)                           │
│  recent_searches (user history)                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. LocationAutocomplete Component (Frontend)

**Purpose**: Provide Google Places autocomplete functionality with South Africa bias

**Props**:
```typescript
interface LocationAutocompleteProps {
  value: string;
  onChange: (location: LocationData) => void;
  placeholder?: string;
  required?: boolean;
  showMapPreview?: boolean;
  allowManualEntry?: boolean;
}
```

**Key Features**:
- Debounced input (300ms delay)
- Session token management
- Recent searches display
- Keyboard navigation support
- Mobile-optimized touch targets
- Loading and error states

### 2. Google Places Service (Backend)

**Purpose**: Wrapper for Google Places API with optimization and error handling

**Interface**:
```typescript
interface GooglePlacesService {
  // Get autocomplete suggestions
  getAutocompleteSuggestions(
    input: string,
    sessionToken: string,
    options?: AutocompleteOptions
  ): Promise<PlacePrediction[]>;
  
  // Get detailed place information
  getPlaceDetails(
    placeId: string,
    sessionToken: string
  ): Promise<PlaceDetails>;
  
  // Geocode an address
  geocodeAddress(address: string): Promise<GeocodeResult>;
  
  // Reverse geocode coordinates
  reverseGeocode(lat: number, lng: number): Promise<PlaceDetails>;
}
```

**Optimization Features**:
- Request debouncing
- Response caching (5 minutes)
- Session token lifecycle management
- Automatic retry on transient failures
- Fallback to manual entry on API errors

### 3. Location Pages Service (Backend)

**Purpose**: Manage location records and generate SEO-optimized pages

**Interface**:
```typescript
interface LocationPagesService {
  // Create or update location record
  upsertLocation(data: LocationInput): Promise<Location>;
  
  // Get location by slug hierarchy
  getLocationByPath(
    province: string,
    city?: string,
    suburb?: string
  ): Promise<Location>;
  
  // Get location statistics
  getLocationStatistics(locationId: number): Promise<LocationStats>;
  
  // Get trending suburbs
  getTrendingSuburbs(limit: number): Promise<Location[]>;
  
  // Get similar locations
  getSimilarLocations(locationId: number): Promise<Location[]>;
  
  // Generate SEO content
  generateSEOContent(location: Location): Promise<SEOContent>;
}
```

### 4. Location Analytics Service (Backend)

**Purpose**: Calculate dynamic market statistics from listings

**Interface**:
```typescript
interface LocationAnalyticsService {
  // Calculate price statistics
  calculatePriceStats(locationId: number): Promise<PriceStats>;
  
  // Calculate market activity
  calculateMarketActivity(locationId: number): Promise<MarketActivity>;
  
  // Calculate property type distribution
  calculatePropertyTypes(locationId: number): Promise<PropertyTypeStats>;
  
  // Track location search
  trackLocationSearch(locationId: number, userId?: number): Promise<void>;
  
  // Get trending score
  calculateTrendingScore(locationId: number): Promise<number>;
}
```

## Data Models

### locations Table (Static SEO Content)

```sql
CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'country', 'province', 'city', 'suburb'
  parent_id INTEGER REFERENCES locations(id),
  place_id VARCHAR(255) UNIQUE,
  
  -- Geographic data
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  viewport_ne_lat DECIMAL(10, 8),
  viewport_ne_lng DECIMAL(11, 8),
  viewport_sw_lat DECIMAL(10, 8),
  viewport_sw_lng DECIMAL(11, 8),
  
  -- SEO content (static)
  description TEXT,
  hero_image VARCHAR(500),
  seo_title VARCHAR(255),
  seo_description TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(slug, parent_id),
  INDEX idx_place_id (place_id),
  INDEX idx_parent_id (parent_id),
  INDEX idx_type (type),
  INDEX idx_slug (slug)
);
```

### location_searches Table (Trending Analysis)

```sql
CREATE TABLE location_searches (
  id SERIAL PRIMARY KEY,
  location_id INTEGER NOT NULL REFERENCES locations(id),
  user_id INTEGER REFERENCES users(id),
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_location_searched (location_id, searched_at),
  INDEX idx_user_id (user_id)
);
```

### recent_searches Table (User History)

```sql
CREATE TABLE recent_searches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  location_id INTEGER NOT NULL REFERENCES locations(id),
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE(user_id, location_id),
  INDEX idx_user_recent (user_id, searched_at DESC)
);
```

### Enhanced listings Table (Location Association)

```sql
-- Add to existing listings table
ALTER TABLE listings ADD COLUMN location_id INTEGER REFERENCES locations(id);
ALTER TABLE listings ADD INDEX idx_location_id (location_id);

-- Keep existing fields for backward compatibility
-- province, city, suburb, place_id, latitude, longitude
```

### Enhanced developments Table (Location Association)

```sql
-- Add to existing developments table
ALTER TABLE developments ADD COLUMN location_id INTEGER REFERENCES locations(id);
ALTER TABLE developments ADD INDEX idx_location_id (location_id);
```

## 
Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Minimum input length triggers autocomplete
*For any* user input string, autocomplete suggestions should only be fetched when the string length is >= 3 characters
**Validates: Requirements 1.2**

### Property 2: Suggestion display cap
*For any* API response containing autocomplete suggestions, the UI should display at most 5 suggestions regardless of how many the API returns
**Validates: Requirements 1.3**

### Property 3: Selection populates field
*For any* autocomplete suggestion, when selected, the location field should be populated with the place name from that suggestion
**Validates: Requirements 1.4**

### Property 4: Selection triggers Place Details fetch
*For any* place selection from autocomplete, the system should call the Place Details API with the corresponding Place ID
**Validates: Requirements 1.5, 3.1**

### Property 5: Address component extraction
*For any* Place Details response containing administrative_area_level_1, the province field should be populated with that value
**Validates: Requirements 3.2**

### Property 6: City extraction with fallback
*For any* Place Details response, the city field should be populated from locality if present, otherwise from administrative_area_level_2
**Validates: Requirements 3.3**

### Property 7: Suburb extraction with fallback
*For any* Place Details response, the suburb field should be populated from sublocality_level_1 if present, otherwise from neighborhood
**Validates: Requirements 3.4**

### Property 8: Street address concatenation
*For any* Place Details response containing street_number and route, the street address should be the concatenation of these components
**Validates: Requirements 3.5**

### Property 9: Coordinate extraction
*For any* place selection, latitude and longitude should be extracted from the place geometry
**Validates: Requirements 4.1**

### Property 10: Coordinate precision
*For any* extracted coordinates, they should be stored with at least 6 decimal places of precision
**Validates: Requirements 4.2**

### Property 11: GPS accuracy marking
*For any* coordinates extracted from Google Places, the GPS accuracy status should be set to "accurate"
**Validates: Requirements 4.3**

### Property 12: South Africa boundary validation
*For any* coordinates extracted from a place, they should fall within South Africa's geographic boundaries (latitude: -35 to -22, longitude: 16 to 33)
**Validates: Requirements 4.5**

### Property 13: Debounce delay enforcement
*For any* sequence of rapid keystrokes in the location field, API requests should only be made after 300ms of inactivity
**Validates: Requirements 5.1**

### Property 14: Session token usage
*For any* autocomplete API request, a session token should be included in the request parameters
**Validates: Requirements 5.2**

### Property 15: Session token termination
*For any* place selection, the current session token should be terminated and a new one generated for the next session
**Validates: Requirements 5.3**

### Property 16: Cache hit for duplicate queries
*For any* autocomplete query that was made within the last 5 minutes, the system should return cached results instead of making a new API call
**Validates: Requirements 5.5**

### Property 17: Geocoding populates fields
*For any* successful geocoding response, coordinates and address components should be populated in the form
**Validates: Requirements 7.3**

### Property 18: Network error retry
*For any* network error during API requests, the system should retry exactly once before falling back to manual entry
**Validates: Requirements 11.4**

### Property 19: Location record creation
*For any* new suburb added via listing, a location record should be created in the locations table with name, slug, type, and coordinates
**Validates: Requirements 16.2**

### Property 20: Hierarchical integrity
*For any* location record with a parent_id, the parent location should exist in the locations table
**Validates: Requirements 16.5**

### Property 21: Province listing count accuracy
*For any* province, the displayed listing count should equal the number of listings where location_id references a location within that province's hierarchy
**Validates: Requirements 17.1**

### Property 22: City listing count accuracy
*For any* city, the displayed listing count should equal the number of listings where location_id references a location within that city's hierarchy
**Validates: Requirements 17.2**

### Property 23: Suburb listing count accuracy
*For any* suburb, the displayed listing count should equal the number of listings where location_id references that suburb
**Validates: Requirements 17.3**

### Property 24: Average sale price calculation
*For any* location with sale listings, the average sale price should equal the sum of all sale listing prices divided by the count of sale listings
**Validates: Requirements 18.1**

### Property 25: Average rental price calculation
*For any* location with rental listings, the average rental price should equal the sum of all rental listing prices divided by the count of rental listings
**Validates: Requirements 18.2**

### Property 26: Median price calculation
*For any* location with listings, the median price should be the middle value when all listing prices are sorted
**Validates: Requirements 18.3**

### Property 27: Days on market calculation
*For any* location with listings, the average days on market should equal the sum of (current_date - created_at) for all listings divided by listing count
**Validates: Requirements 18.4**

### Property 28: Price per square meter calculation
*For any* location with listings that have floor_area data, the average price per m² should equal the sum of (price / floor_area) divided by the count of listings with floor_area
**Validates: Requirements 18.5**

### Property 29: Suburb selection redirects to location page
*For any* suburb selected from search autocomplete, the system should redirect to a URL matching the pattern /south-africa/{province-slug}/{city-slug}/{suburb-slug}
**Validates: Requirements 19.1**

### Property 30: Place ID in URL parameters
*For any* redirection to a location page, the Place ID should be included as a URL query parameter
**Validates: Requirements 19.4**

### Property 31: Search event recording
*For any* location search, a record should be created in location_searches table with location_id, user_id (if authenticated), and timestamp
**Validates: Requirements 21.1**

### Property 32: Place ID storage on selection
*For any* location selected from autocomplete, the Place ID should be stored with the search query or listing data
**Validates: Requirements 25.1**

### Property 33: Place ID filtering
*For any* location filter applied to listings, the system should match using location_id (which links to Place ID) rather than text comparison on suburb/city/province fields
**Validates: Requirements 25.2**

### Property 34: Slug generation format
*For any* location name, the generated slug should be in kebab-case format (lowercase with hyphens replacing spaces and special characters removed)
**Validates: Requirements 27.2**

### Property 35: Description generation
*For any* location record created, a description field should be populated with non-empty content
**Validates: Requirements 27.3**

### Property 36: Province URL format
*For any* province location, the generated URL should match the pattern /south-africa/{province-slug}
**Validates: Requirements 29.1**

### Property 37: City URL format
*For any* city location, the generated URL should match the pattern /south-africa/{province-slug}/{city-slug}
**Validates: Requirements 29.2**

### Property 38: Suburb URL format
*For any* suburb location, the generated URL should match the pattern /south-africa/{province-slug}/{city-slug}/{suburb-slug}
**Validates: Requirements 29.3**

### Property 39: Slug uniqueness within parent
*For any* two locations with the same parent_id, their slugs should be unique
**Validates: Requirements 29.4**

### Property 40: Structured data presence
*For any* location page rendered, the HTML should contain JSON-LD structured data with @type "Place"
**Validates: Requirements 30.1**

### Property 41: Structured data completeness
*For any* location page's structured data, it should include name, geo coordinates, address, and url properties
**Validates: Requirements 30.2**

## Error Handling

### Google Places API Errors

**Strategy**: Graceful degradation with fallback to manual entry

1. **API Unavailable (503)**
   - Display message: "Location autocomplete temporarily unavailable"
   - Enable manual text entry
   - Log error for monitoring

2. **Rate Limit Exceeded (429)**
   - Display message: "Too many requests, please enter location manually"
   - Enable manual entry
   - Alert administrators

3. **Invalid API Key (403)**
   - Log critical error
   - Enable manual entry
   - Alert administrators immediately

4. **Network Timeout**
   - Retry once after 2 seconds
   - If retry fails, enable manual entry
   - Display message: "Connection issue, please try again"

5. **Invalid Place ID**
   - Display message: "Location not found"
   - Allow user to search again
   - Log warning

### Location Page Errors

**Strategy**: Partial rendering with error indicators

1. **Location Not Found**
   - Return 404 status
   - Display "Location not found" page
   - Suggest similar locations or search

2. **Statistics Calculation Failure**
   - Render static content
   - Display message: "Market statistics temporarily unavailable"
   - Log error

3. **Database Connection Error**
   - Return 503 status
   - Display maintenance page
   - Alert administrators

### Data Validation Errors

**Strategy**: Prevent invalid data from entering the system

1. **Invalid Coordinates**
   - Reject coordinates outside South Africa bounds
   - Display validation error
   - Allow user to correct

2. **Missing Required Fields**
   - Highlight missing fields
   - Prevent form submission
   - Display clear error messages

3. **Duplicate Location**
   - Check for existing location by Place ID
   - Update existing record instead of creating duplicate
   - Log merge operation

## Testing Strategy

### Unit Testing

**Focus**: Individual functions and components in isolation

**Key Test Areas**:
1. Address component parsing logic
2. Slug generation from location names
3. Coordinate validation
4. Statistics calculation functions
5. URL generation from location hierarchy
6. Debounce implementation
7. Cache hit/miss logic

**Tools**: Jest, React Testing Library

### Property-Based Testing

**Focus**: Universal properties that should hold across all inputs

**Library**: fast-check (JavaScript/TypeScript property testing)

**Configuration**: Minimum 100 iterations per property test

**Key Properties to Test**:
- Property 1: Minimum input length (Requirements 1.2)
- Property 2: Suggestion display cap (Requirements 1.3)
- Property 10: Coordinate precision (Requirements 4.2)
- Property 12: South Africa boundary validation (Requirements 4.5)
- Property 13: Debounce delay (Requirements 5.1)
- Property 16: Cache behavior (Requirements 5.5)
- Property 21-23: Listing count accuracy (Requirements 17.1-17.3)
- Property 24-28: Statistics calculations (Requirements 18.1-18.5)
- Property 34: Slug format (Requirements 27.2)
- Property 36-38: URL format (Requirements 29.1-29.3)
- Property 39: Slug uniqueness (Requirements 29.4)

**Example Property Test**:
```typescript
// Property 34: Slug generation format
it('should generate kebab-case slugs for any location name', () => {
  fc.assert(
    fc.property(
      fc.string({ minLength: 1, maxLength: 100 }),
      (locationName) => {
        const slug = generateSlug(locationName);
        
        // Should be lowercase
        expect(slug).toBe(slug.toLowerCase());
        
        // Should not contain spaces
        expect(slug).not.toContain(' ');
        
        // Should only contain lowercase letters, numbers, and hyphens
        expect(slug).toMatch(/^[a-z0-9-]+$/);
        
        // Should not start or end with hyphen
        expect(slug).not.toMatch(/^-|-$/);
      }
    ),
    { numRuns: 100 }
  );
});
```

### Integration Testing

**Focus**: Component interactions and API integrations

**Key Test Scenarios**:
1. Complete autocomplete flow: input → suggestions → selection → Place Details → form population
2. Location record creation from listing submission
3. Location page rendering with static and dynamic content
4. Search flow: autocomplete → location page → filtered listings
5. Trending suburbs calculation from search events
6. Similar locations recommendation

**Tools**: Jest, Supertest (API testing), Playwright (E2E)

### Performance Testing

**Focus**: API cost optimization and page load times

**Key Metrics**:
1. Autocomplete API calls per user session (target: < 10)
2. Cache hit rate (target: > 60%)
3. Location page load time (target: < 2 seconds)
4. Statistics calculation time (target: < 500ms)
5. Database query performance for location hierarchy

**Tools**: Lighthouse, k6 (load testing)

### SEO Testing

**Focus**: Crawlability and search engine optimization

**Key Checks**:
1. All location pages return 200 status
2. Meta tags present and unique
3. Structured data validates against Schema.org
4. URLs follow hierarchical pattern
5. Internal linking structure complete
6. Sitemap includes all location pages

**Tools**: Google Search Console, Screaming Frog, Lighthouse SEO audit

## Search Integration Architecture

### Global Search Pipeline

The location system integrates with the platform's global search to provide unified results across locations, listings, developments, and agencies.

**Search Flow**:
```
User Query → Autocomplete Suggestions
                    ↓
    Place Selection or Keyword Search
                    ↓
Resolve to Locations, Listings, Developments
                    ↓
        Global Search Results Page
        ├─ Matching locations
        ├─ Matching listings
        ├─ Matching developments
        └─ Matching agencies
```

### Search Result Types (Priority Order)

**1. Location Results (Priority #1)**
- Cities
- Suburbs
- Points of interest
- Provinces
- Geo-coded polygons

**2. Listings**
- Filtered by location_id or polygon boundaries
- Sorted by relevance and recency

**3. Developments**
- Filtered by location or proximity
- Sorted by status and popularity

**4. Agencies & Developers**
- Ranked by relevance and operation area
- Filtered by service locations

### Search Ranking Signals

The search algorithm considers multiple signals to rank results:

1. **Query Similarity Score**: Text matching against location names
2. **Historical Popularity**: Based on location_searches table
3. **Trending Score**: Recent search activity (30-day window)
4. **Listing Inventory Volume**: Locations with more listings rank higher
5. **User Search History**: Personalized based on past searches
6. **Google Places Relevance**: Leverage Google's ranking signals

### Search API Interface

```typescript
interface SearchService {
  // Global search across all entity types
  globalSearch(query: string, options: SearchOptions): Promise<SearchResults>;
  
  // Location-specific search
  searchLocations(query: string, type?: LocationType): Promise<Location[]>;
  
  // Search with geographic bounds
  searchInBounds(bounds: GeoBounds, filters: SearchFilters): Promise<SearchResults>;
}

interface SearchResults {
  locations: LocationResult[];
  listings: ListingResult[];
  developments: DevelopmentResult[];
  agencies: AgencyResult[];
  totalResults: number;
  query: string;
}
```

## Location Page Rendering Strategy

### Hybrid SSR/ISR Model

Location pages use a hybrid rendering approach that balances SEO requirements with dynamic data freshness:

**Static Content (ISR - 24 hour cache)**:
- Page title and meta tags
- Intro description
- SEO metadata
- Breadcrumbs
- Hero images
- Hierarchy tree
- About the area content

**Dynamic Content (SSR - 5 minute cache)**:
- Average sale price
- Average rental price
- Number of listings
- Number of developments
- Price trends
- Market activity metrics
- Property type distribution

**Client-Side Hydration**:
- Interactive maps
- Charts and graphs
- Filter controls
- Listing carousels

### Rendering Pipeline

```
SSR Request
    ↓
Load Static SEO Content (from locations table)
    ↓
Load Dynamic Stats (from listings aggregation)
    ↓
Merge Static + Dynamic
    ↓
Render HTML
    ↓
Send to Browser
    ↓
Client-Side Hydration (charts, maps, filters)
```

## Location Page Layout Specification

### 1. Hero Section

**Components**:
- Location name (H1)
- High-level description (2-3 sentences)
- Province badge
- Background hero image
- Market summary badges:
  - Average sale price
  - Average rental price
  - Number of active listings
  - Number of new developments

**Example**:
```tsx
<HeroSection>
  <HeroImage src={location.hero_image} />
  <HeroContent>
    <Breadcrumbs hierarchy={location.hierarchy} />
    <h1>{location.name}</h1>
    <ProvinceBadge>{location.province}</ProvinceBadge>
    <Description>{location.description}</Description>
    <MarketBadges>
      <Badge>Avg Sale: R{stats.avgSalePrice}</Badge>
      <Badge>Avg Rental: R{stats.avgRentalPrice}</Badge>
      <Badge>{stats.listingCount} Listings</Badge>
      <Badge>{stats.developmentCount} Developments</Badge>
    </MarketBadges>
  </HeroContent>
</HeroSection>
```

### 2. Quick Stats Row

**Calculated Dynamically (SSR)**:
- Average price per m²
- Market activity index (0-100 scale)
- Price trend indicators (30/90/180 days)
- Rental yield estimate
- Small trend charts

**Data Source**: Aggregated from listings table

### 3. Property Explorer

**Tabbed Interface**:
```tsx
<PropertyExplorer>
  <Tabs>
    <Tab href={`/search?location=${location.slug}&type=for-sale`}>
      For Sale ({stats.forSaleCount})
    </Tab>
    <Tab href={`/search?location=${location.slug}&type=to-rent`}>
      To Rent ({stats.toRentCount})
    </Tab>
    <Tab href={`/search?location=${location.slug}&type=new-developments`}>
      New Developments ({stats.developmentCount})
    </Tab>
  </Tabs>
  <FeaturedListings location={location.id} limit={6} />
</PropertyExplorer>
```

### 4. Interactive Map Section

**Features**:
- Centered on location polygon/coordinates
- Markers for:
  - Active listings
  - New developments
  - Points of interest (schools, malls, hospitals)
- Zoom controls
- Cluster markers for dense areas

### 5. About the Area (Static SEO Section)

**Content Structure**:
- 700-1200 words of SEO-optimized content
- 3 structured sections:
  1. **Lifestyle**: Demographics, culture, amenities
  2. **Infrastructure**: Transport, schools, healthcare
  3. **Property Market**: Historical trends, buyer profiles

**SEO Optimization**:
- Structured headings (H2, H3)
- Internal links to related locations
- External links to authoritative sources
- Keyword optimization for local search

### 6. Location Breakdown

**For City Pages**:
- List of suburbs with statistics
- Sortable by price, listings, popularity

**For Suburb Pages**:
- Links to nearby suburbs
- Similar neighborhoods

**For Province Pages**:
- List of major cities
- Regional market overview

### 7. Trending Suburbs Section

**Ranking Factors**:
- Search popularity (from location_searches)
- Listing volume growth
- Price appreciation
- User engagement metrics

**Display**:
- Top 10 trending suburbs
- Trend indicators (↑ ↓)
- Quick stats for each

### 8. Recommended Similar Locations

**Similarity Algorithm**:
```typescript
function calculateSimilarity(location1: Location, location2: Location): number {
  const priceScore = 1 - Math.abs(location1.avgPrice - location2.avgPrice) / Math.max(location1.avgPrice, location2.avgPrice);
  const typeScore = calculatePropertyTypeOverlap(location1, location2);
  const lifestyleScore = calculateLifestyleScore(location1, location2);
  
  return (priceScore * 0.4) + (typeScore * 0.3) + (lifestyleScore * 0.3);
}
```

**Based On**:
- Price bracket (±20%)
- Property type distribution
- Lifestyle patterns
- Proximity

## Location Hierarchy Model

### Hierarchical Structure

```
Country (South Africa)
    ↓
Province (Gauteng, Western Cape, KwaZulu-Natal, etc.)
    ↓
City (Johannesburg, Cape Town, Durban, etc.)
    ↓
Suburb (Sandton, Camps Bay, Umhlanga, etc.)
```

### Benefits

1. **Clean URLs**: Hierarchical path structure
2. **Strong SEO**: Clear site architecture for crawlers
3. **Efficient Data Grouping**: Easy aggregation queries
4. **Rich Internal Linking**: Automatic breadcrumbs and navigation
5. **Easy Listing Association**: Single location_id reference

### URL Structure Examples

```
/south-africa
/south-africa/gauteng
/south-africa/gauteng/johannesburg
/south-africa/gauteng/johannesburg/sandton
/south-africa/western-cape/cape-town/camps-bay
```

## Data Flow for Listing Creation

### Complete Flow

**Step 1: Location Search**
- Agent searches for location
- Google Places Autocomplete returns suggestions
- Agent selects a place
- System receives: place_id, coordinates, formatted_address

**Step 2: Place ID Resolution**
```typescript
async function resolveLocation(placeId: string): Promise<Location> {
  // Check if location exists
  let location = await db.locations.findByPlaceId(placeId);
  
  if (!location) {
    // Fetch full details from Google
    const placeDetails = await googlePlaces.getPlaceDetails(placeId);
    
    // Extract hierarchy
    const hierarchy = extractHierarchy(placeDetails);
    
    // Create or update location records
    location = await createLocationHierarchy(hierarchy);
  }
  
  return location;
}
```

**Step 3: Hierarchy Extraction**
```typescript
function extractHierarchy(placeDetails: PlaceDetails): LocationHierarchy {
  return {
    country: extractComponent(placeDetails, 'country'),
    province: extractComponent(placeDetails, 'administrative_area_level_1'),
    city: extractComponent(placeDetails, 'locality') || 
          extractComponent(placeDetails, 'administrative_area_level_2'),
    suburb: extractComponent(placeDetails, 'sublocality_level_1') ||
            extractComponent(placeDetails, 'neighborhood')
  };
}
```

**Step 4: Location Record Creation**
- Check if each level exists (country → province → city → suburb)
- Create missing records
- Generate slugs
- Generate SEO content (using AI or templates)
- Link parent_id relationships

**Step 5: Listing Association**
```typescript
async function createListing(listingData: ListingInput): Promise<Listing> {
  // Resolve location
  const location = await resolveLocation(listingData.placeId);
  
  // Create listing with location_id
  const listing = await db.listings.create({
    ...listingData,
    location_id: location.id,
    // Keep legacy fields for backward compatibility
    province: location.province,
    city: location.city,
    suburb: location.suburb,
    place_id: listingData.placeId,
    latitude: listingData.latitude,
    longitude: listingData.longitude
  });
  
  return listing;
}
```

**Step 6: Statistics Update**
- Invalidate cached statistics for the location
- Trigger background job to recalculate trending scores

## Market Analytics Pipeline

### Dynamic Statistics Calculation

**Calculated on Every Page Request (with 5-minute cache)**:

```typescript
interface LocationStatistics {
  // Price metrics
  avgSalePrice: number;
  avgRentalPrice: number;
  medianPrice: number;
  pricePerSqm: number;
  
  // Inventory metrics
  totalListings: number;
  forSaleCount: number;
  toRentCount: number;
  developmentCount: number;
  
  // Market activity
  avgDaysOnMarket: number;
  newListingsLast30Days: number;
  priceReductions: number;
  
  // Trends
  priceTrend30d: number; // percentage change
  priceTrend90d: number;
  priceTrend180d: number;
  
  // Distribution
  propertyTypeDistribution: Record<string, number>;
  bedroomDistribution: Record<string, number>;
}
```

**Calculation Source**:
```sql
-- Average sale price
SELECT AVG(price) 
FROM listings 
WHERE location_id = ? 
  AND listing_type = 'sale'
  AND status = 'active';

-- Price trend (30 days)
SELECT 
  (AVG(CASE WHEN created_at >= NOW() - INTERVAL 30 DAY THEN price END) - 
   AVG(CASE WHEN created_at < NOW() - INTERVAL 30 DAY THEN price END)) /
  AVG(CASE WHEN created_at < NOW() - INTERVAL 30 DAY THEN price END) * 100
FROM listings
WHERE location_id = ?;

-- Property type distribution
SELECT property_type, COUNT(*) as count
FROM listings
WHERE location_id = ?
  AND status = 'active'
GROUP BY property_type;
```

### Historical Data Tracking

**listing_history Table**:
```sql
CREATE TABLE listing_history (
  id SERIAL PRIMARY KEY,
  listing_id INTEGER NOT NULL REFERENCES listings(id),
  price DECIMAL(12, 2),
  status VARCHAR(50),
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_listing_time (listing_id, changed_at)
);
```

This enables:
- Price change tracking
- Days on market calculation
- Market velocity analysis
- Historical trend visualization

## Implementation Notes

### Phase 1: Google Places Integration (Core Autocomplete)
- Implement LocationAutocomplete component
- Create Google Places Service wrapper
- Add debouncing and caching
- Implement session token management
- Add error handling and fallbacks

### Phase 2: Location Database Structure
- Create locations table with hierarchy
- Create location_searches table
- Create recent_searches table
- Implement location CRUD operations
- Add migration to populate from existing listings
- Create indexes for performance

### Phase 3: Location Pages (Static Content)
- Implement location page routing with hierarchy
- Create location page components (Hero, Stats, Explorer, Map, About)
- Generate SEO content (titles, descriptions, slugs)
- Add structured data markup
- Implement breadcrumb navigation

### Phase 4: Dynamic Statistics
- Implement analytics service
- Create aggregation queries for statistics
- Add caching layer for statistics (Redis)
- Integrate statistics into location pages
- Implement trend calculation

### Phase 5: Search Integration
- Integrate location autocomplete with global search
- Implement Place ID-based filtering
- Add location result ranking
- Connect location pages to search results
- Implement deep linking from location pages to filtered search

### Phase 6: Advanced Features
- Add trending suburbs feature
- Implement similar locations recommendation
- Create location comparison tool
- Add price trend charts
- Implement market activity indicators

### Phase 7: Monitoring & Optimization
- Add API usage tracking
- Implement cost monitoring dashboard
- Optimize cache strategies
- Performance tuning
- SEO monitoring and optimization

## Integration Summary: How Everything Works Together

### The Complete System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Creates Listing                          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              Google Places Autocomplete                          │
│  ✓ Provides real-world geographic data                          │
│  ✓ Standardizes locations across platform                       │
│  ✓ Ensures 100% accurate mapping                                │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              Location Record Creation                            │
│  ✓ Extracts hierarchy (province → city → suburb)                │
│  ✓ Creates/updates location records                             │
│  ✓ Generates SEO-friendly slugs                                 │
│  ✓ Creates static SEO content                                   │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              Listing Association                                 │
│  ✓ Links listing to location via location_id                    │
│  ✓ Stores coordinates for map rendering                         │
│  ✓ Maintains backward compatibility with legacy fields          │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              Location Pages                                      │
│  ✓ Serve as SEO landing pages                                   │
│  ✓ Use static content for ranking (80%)                         │
│  ✓ Use dynamic stats for relevance (20%)                        │
│  ✓ Update automatically as listings change                      │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              Search Integration                                  │
│  ✓ Uses location hierarchy for filtering                        │
│  ✓ Provides location-based results                              │
│  ✓ Supports deep linking to filtered views                      │
│  ✓ Ranks by relevance and popularity                            │
└────────────────────────┬────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────────┐
│              SEO & Discovery                                     │
│  ✓ Static structure + dynamic insights                          │
│  ✓ Perfect for local real estate ranking                        │
│  ✓ Mimics Zillow, Redfin, Property24 architecture              │
│  ✓ Automatic sitemap generation                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Key Integration Points

**1. Google Places → Location Records**
- Every place selection creates or updates a location record
- Hierarchy is automatically extracted and maintained
- Place IDs ensure uniqueness and prevent duplicates

**2. Location Records → Listings**
- Listings reference locations via location_id foreign key
- Legacy fields (province, city, suburb) maintained for backward compatibility
- Coordinates stored on listings for map rendering

**3. Listings → Dynamic Statistics**
- All market data calculated from listings table
- Aggregations use location_id for precise filtering
- Statistics cached for 5 minutes to balance freshness and performance

**4. Location Pages → Search**
- Location pages link to pre-filtered search results
- Search results link back to location pages
- Creates powerful internal linking structure for SEO

**5. Search Activity → Trending Analysis**
- Every search tracked in location_searches table
- Trending scores calculated from search frequency
- Personalized recommendations based on user history

### Data Consistency Guarantees

**Referential Integrity**:
```sql
-- Listings must reference valid locations
ALTER TABLE listings 
  ADD CONSTRAINT fk_listings_location 
  FOREIGN KEY (location_id) 
  REFERENCES locations(id);

-- Locations must reference valid parent locations
ALTER TABLE locations 
  ADD CONSTRAINT fk_locations_parent 
  FOREIGN KEY (parent_id) 
  REFERENCES locations(id);
```

**Cascade Behavior**:
- Deleting a location is prevented if listings reference it
- Updating a location slug automatically updates URLs
- Parent location changes cascade to children

**Data Migration Strategy**:
```typescript
// Migrate existing listings to use location_id
async function migrateListingsToLocations() {
  const listings = await db.listings.findAll({
    where: { location_id: null }
  });
  
  for (const listing of listings) {
    // Find or create location from legacy fields
    const location = await findOrCreateLocation({
      province: listing.province,
      city: listing.city,
      suburb: listing.suburb,
      placeId: listing.place_id,
      coordinates: {
        lat: listing.latitude,
        lng: listing.longitude
      }
    });
    
    // Update listing
    await listing.update({ location_id: location.id });
  }
}
```

### Performance Characteristics

**Expected Query Performance**:
- Location lookup by slug: < 10ms (indexed)
- Listing count aggregation: < 50ms (indexed)
- Statistics calculation: < 500ms (cached)
- Location page render: < 2 seconds (SSR)
- Autocomplete response: < 300ms (debounced + cached)

**Scalability Targets**:
- Support 100,000+ locations
- Handle 1,000,000+ listings
- Process 10,000+ searches per day
- Maintain < 3 second page load times

### SEO Architecture Benefits

**Why This Approach Works**:

1. **Static URLs**: Every location has a permanent, hierarchical URL
2. **Crawlable Content**: 80% of page content is static HTML
3. **Fresh Data**: 20% dynamic content keeps pages relevant
4. **Internal Linking**: Automatic breadcrumbs and related locations
5. **Structured Data**: Schema.org markup for rich snippets
6. **Unique Content**: Every location page has unique descriptions
7. **User Value**: Real market data provides genuine value

**Comparison to Competitors**:
- **Zillow**: Uses same static + dynamic approach
- **Redfin**: Similar location hierarchy model
- **Property24**: Comparable SEO structure
- **Rightmove**: Similar market statistics integration

This architecture positions Property Listify to compete effectively in local real estate search rankings.

## Security Considerations

1. **API Key Protection**
   - Store Google Places API key in environment variables
   - Never expose API key in client-side code
   - Use server-side proxy for all API calls
   - Implement key rotation policy

2. **Input Validation**
   - Sanitize all user inputs before geocoding
   - Validate coordinates against expected ranges
   - Prevent SQL injection in location queries
   - Rate limit autocomplete requests per user

3. **Access Control**
   - Restrict location record creation to authenticated users
   - Implement role-based access for location management
   - Audit log for location data changes

4. **Data Privacy**
   - Anonymize location search tracking for non-authenticated users
   - Comply with GDPR for user location history
   - Provide user controls to clear search history

## Performance Optimization

### Caching Strategy

**Level 1: Browser Cache**
- Static location content: 1 hour
- Location page HTML: 5 minutes
- Autocomplete suggestions: 5 minutes

**Level 2: Server Cache (Redis)**
- Location statistics: 5 minutes
- Trending suburbs: 1 hour
- Similar locations: 30 minutes
- Google Places API responses: 5 minutes

**Level 3: Database Query Cache**
- Location hierarchy queries: 1 hour
- Listing count aggregations: 5 minutes

### Database Optimization

**Indexes**:
```sql
-- Location lookups
CREATE INDEX idx_locations_slug_parent ON locations(slug, parent_id);
CREATE INDEX idx_locations_place_id ON locations(place_id);
CREATE INDEX idx_locations_type ON locations(type);

-- Listing associations
CREATE INDEX idx_listings_location_id ON listings(location_id);
CREATE INDEX idx_listings_location_status ON listings(location_id, status);

-- Search tracking
CREATE INDEX idx_location_searches_location_time ON location_searches(location_id, searched_at DESC);
```

**Query Optimization**:
- Use materialized views for complex statistics
- Implement pagination for large result sets
- Use EXPLAIN ANALYZE to optimize slow queries
- Consider read replicas for analytics queries

### API Cost Optimization

**Strategies**:
1. Debounce autocomplete requests (300ms)
2. Cache API responses (5 minutes)
3. Use session tokens correctly
4. Implement request deduplication
5. Monitor and alert on usage spikes

**Expected Costs** (based on Google Places pricing):
- Autocomplete: $2.83 per 1,000 requests
- Place Details: $17 per 1,000 requests
- Target: < $100/month for 10,000 listings/month

## Deployment Considerations

### Environment Variables

```env
GOOGLE_PLACES_API_KEY=your_api_key_here
GOOGLE_PLACES_COUNTRY_RESTRICTION=ZA
AUTOCOMPLETE_DEBOUNCE_MS=300
AUTOCOMPLETE_CACHE_TTL_SECONDS=300
LOCATION_STATS_CACHE_TTL_SECONDS=300
```

### Database Migrations

1. Create locations table
2. Create location_searches table
3. Create recent_searches table
4. Add location_id to listings table
5. Add location_id to developments table
6. Populate locations from existing listings
7. Create indexes

### Monitoring

**Key Metrics**:
- Google Places API call volume
- API error rate
- Cache hit rate
- Location page load time
- Statistics calculation time
- Database query performance

**Alerts**:
- API usage > 80% of daily limit
- API error rate > 5%
- Location page load time > 3 seconds
- Database query time > 1 second

## Future Enhancements

1. **Multi-language Support**
   - Translate location descriptions
   - Support multiple language URLs
   - Localized SEO content

2. **Advanced Analytics**
   - Price trend predictions
   - Market heat maps
   - Neighborhood comparison tools

3. **User Personalization**
   - Saved location preferences
   - Personalized location recommendations
   - Custom location alerts

4. **Enhanced SEO**
   - Automated content generation using AI
   - Dynamic schema markup based on content
   - Automated internal linking optimization

5. **Mobile App Integration**
   - Native autocomplete components
   - Offline location caching
   - GPS-based location detection
