# Design Document

## Overview

The Explore Discovery Engine is a sophisticated content discovery platform that transforms traditional property browsing into an engaging, personalized entertainment experience. The system combines multiple discovery paradigms: full-screen vertical video browsing (TikTok/Reels), intelligent map-based exploration (Zillow), lifestyle-driven categorization (Airbnb), and rich neighbourhood storytelling.

The architecture is built around three core experiences:

1. **Video Feed Engine**: A full-screen, swipe-based video player with intelligent preloading, engagement tracking, and seamless transitions
2. **Discovery Card Feed**: A masonry-grid layout displaying mixed content types (properties, neighbourhoods, insights, creators)
3. **Map Hybrid View**: A synchronized map and list interface where interactions in one view update the other in real-time

The system uses a sophisticated recommendation engine that learns from user behavior (watch time, saves, clicks, scroll patterns) to personalize content delivery. All components are designed with mobile-first principles, soft UI aesthetics, and performance optimization.

## Architecture

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer (React)                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Video Feed   │  │ Discovery    │  │ Map Hybrid   │      │
│  │ Component    │  │ Card Feed    │  │ View         │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Explore State Management (Zustand)           │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ REST API / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     API Layer (Express)                      │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Explore      │  │ Video        │  │ Boost        │      │
│  │ Router       │  │ Upload       │  │ Router       │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐   │
│  │      Recommendation Engine Service                   │   │
│  │  - User Signal Processor                             │   │
│  │  - Content Ranker                                    │   │
│  │  - Personalization Algorithm                         │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Video        │  │ Neighbourhood│  │ Analytics    │      │
│  │ Service      │  │ Service      │  │ Service      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ PostgreSQL   │  │ Redis Cache  │  │ S3 Storage   │      │
│  │ (Primary DB) │  │ (Sessions,   │  │ (Videos,     │      │
│  │              │  │  Feed Cache) │  │  Images)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**Video Feed Flow:**
1. User opens Explore → Client requests personalized video feed
2. API calls Recommendation Engine with user context
3. Engine queries database for candidate videos, applies ranking algorithm
4. Results cached in Redis with 5-minute TTL
5. Client receives video metadata and URLs
6. Video player preloads next 2 videos
7. User interactions (watch time, swipes, saves) sent to Analytics Service
8. Analytics updates user profile for future recommendations

**Map Hybrid Flow:**
1. User opens Map View → Client requests properties in viewport bounds
2. API queries spatial database with bounding box
3. Properties returned with coordinates and preview data
4. Client renders map pins and synchronized feed
5. User moves map → Client debounces and requests new bounds
6. Feed updates with new properties
7. User scrolls feed → Map highlights corresponding pins

## Components and Interfaces

### Frontend Components

#### 1. ExploreVideoFeed Component
```typescript
interface ExploreVideoFeedProps {
  initialVideos: ExploreVideo[];
  onVideoChange: (videoId: string) => void;
  onEngagement: (videoId: string, action: EngagementAction) => void;
}

interface ExploreVideo {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  propertyId: string;
  price: number;
  location: string;
  beds: number;
  baths: number;
  developmentName?: string;
  creatorId: string;
  creatorName: string;
  creatorAvatar: string;
  tags: string[];
  duration: number;
}
```

**Responsibilities:**
- Full-screen video playback with auto-loop
- Swipe gesture detection (up/down)
- Video preloading (next 2 in queue)
- Overlay UI rendering (property info, actions)
- Engagement tracking (watch time, interactions)

#### 2. DiscoveryCardFeed Component
```typescript
interface DiscoveryCardFeedProps {
  contentBlocks: ContentBlock[];
  onCardClick: (item: DiscoveryItem) => void;
  onLoadMore: () => void;
}

interface ContentBlock {
  id: string;
  title: string;
  type: 'for-you' | 'popular-near-you' | 'new-developments' | 'trending';
  items: DiscoveryItem[];
}

interface DiscoveryItem {
  id: string;
  type: 'property' | 'video' | 'neighbourhood' | 'insight' | 'creator';
  data: PropertyCard | VideoCard | NeighbourhoodCard | InsightCard | CreatorCard;
}
```

**Responsibilities:**
- Masonry grid layout rendering
- Infinite scroll with lazy loading
- Mixed content type display
- Horizontal scroll sections
- Card interaction handling

#### 3. MapHybridView Component
```typescript
interface MapHybridViewProps {
  properties: PropertyMapItem[];
  viewport: MapViewport;
  onViewportChange: (viewport: MapViewport) => void;
  onPropertySelect: (propertyId: string) => void;
  viewMode: 'map' | 'feed' | 'split';
}

interface PropertyMapItem {
  id: string;
  coordinates: { lat: number; lng: number };
  price: number;
  previewImage: string;
  beds: number;
  baths: number;
  isSponsored: boolean;
}
```

**Responsibilities:**
- Interactive map rendering with pins
- Feed synchronization with map
- Viewport-based property loading
- Cluster marker management
- View mode switching

#### 4. LifestyleCategorySelector Component
```typescript
interface LifestyleCategorySelectorProps {
  categories: LifestyleCategory[];
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string) => void;
}

interface LifestyleCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  propertyCount: number;
}
```

**Responsibilities:**
- Horizontal scrollable category chips
- Active category highlighting
- Category filtering trigger

#### 5. NeighbourhoodDetailPage Component
```typescript
interface NeighbourhoodDetailPageProps {
  neighbourhood: NeighbourhoodDetail;
  onFollow: (neighbourhoodId: string) => void;
}

interface NeighbourhoodDetail {
  id: string;
  name: string;
  heroBanner: string;
  description: string;
  videoTours: VideoTour[];
  amenities: Amenity[];
  priceStats: PriceStatistics;
  safetyRating: number;
  walkabilityScore: number;
  properties: PropertyPreview[];
  highlights: string[];
}
```

**Responsibilities:**
- Rich neighbourhood presentation
- Video tour playback
- Amenity display with icons
- Price trend visualization
- Property listing within neighbourhood

### Backend Services

#### 1. RecommendationEngineService
```typescript
class RecommendationEngineService {
  async generatePersonalizedFeed(
    userId: string,
    context: UserContext
  ): Promise<ExploreVideo[]>;
  
  async recordEngagement(
    userId: string,
    videoId: string,
    engagement: EngagementData
  ): Promise<void>;
  
  async updateUserProfile(
    userId: string,
    signals: UserSignal[]
  ): Promise<void>;
  
  async rankContent(
    candidates: ExploreVideo[],
    userProfile: UserProfile
  ): Promise<ExploreVideo[]>;
}

interface UserContext {
  location?: { lat: number; lng: number };
  sessionHistory: string[];
  activeFilters: FilterSet;
  deviceInfo: DeviceInfo;
}

interface EngagementData {
  watchTime: number;
  completed: boolean;
  action?: 'save' | 'share' | 'click-through';
  timestamp: Date;
}
```

**Algorithm:**
- Collaborative filtering based on similar users
- Content-based filtering using property metadata
- Temporal decay for older content
- Boost factor for sponsored content
- Location proximity scoring
- Budget compatibility scoring

#### 2. VideoProcessingService
```typescript
class VideoProcessingService {
  async uploadVideo(
    file: Buffer,
    metadata: VideoMetadata
  ): Promise<ProcessedVideo>;
  
  async generateThumbnail(videoUrl: string): Promise<string>;
  
  async transcodeVideo(
    videoUrl: string,
    formats: VideoFormat[]
  ): Promise<TranscodedVideo[]>;
  
  async validateVideo(file: Buffer): Promise<ValidationResult>;
}

interface VideoMetadata {
  propertyId: string;
  creatorId: string;
  tags: string[];
  lifestyleCategories: string[];
  music?: string;
  subtitles?: string;
}
```

**Processing Pipeline:**
1. Validate video (duration 8-60s, format, size)
2. Upload to S3
3. Generate thumbnail
4. Transcode to multiple formats (1080p, 720p, 480p)
5. Extract metadata
6. Create database record
7. Trigger recommendation engine update

#### 3. NeighbourhoodService
```typescript
class NeighbourhoodService {
  async getNeighbourhoodDetail(
    neighbourhoodId: string
  ): Promise<NeighbourhoodDetail>;
  
  async getNeighbourhoodsByLocation(
    location: { lat: number; lng: number },
    radius: number
  ): Promise<NeighbourhoodPreview[]>;
  
  async updateNeighbourhoodStats(
    neighbourhoodId: string
  ): Promise<void>;
  
  async followNeighbourhood(
    userId: string,
    neighbourhoodId: string
  ): Promise<void>;
}
```

#### 4. BoostService
```typescript
class BoostService {
  async createBoostCampaign(
    creatorId: string,
    contentId: string,
    config: BoostConfig
  ): Promise<BoostCampaign>;
  
  async getBoostAnalytics(
    campaignId: string
  ): Promise<BoostAnalytics>;
  
  async deactivateBoost(campaignId: string): Promise<void>;
  
  async injectBoostedContent(
    feed: ExploreVideo[],
    userProfile: UserProfile
  ): Promise<ExploreVideo[]>;
}

interface BoostConfig {
  duration: number; // days
  budget: number;
  targetAudience: {
    locations?: string[];
    priceRange?: { min: number; max: number };
    propertyTypes?: string[];
  };
}
```

## Data Models

### ExploreContent Table
```sql
CREATE TABLE explore_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type VARCHAR(50) NOT NULL, -- 'video', 'property', 'neighbourhood', 'insight'
  reference_id UUID NOT NULL, -- ID of the actual content
  creator_id UUID REFERENCES users(id),
  title VARCHAR(255),
  description TEXT,
  thumbnail_url VARCHAR(500),
  video_url VARCHAR(500),
  metadata JSONB, -- flexible metadata storage
  tags TEXT[],
  lifestyle_categories TEXT[],
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  price_min INTEGER,
  price_max INTEGER,
  view_count INTEGER DEFAULT 0,
  engagement_score DECIMAL(5, 2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_explore_content_type ON explore_content(content_type);
CREATE INDEX idx_explore_content_creator ON explore_content(creator_id);
CREATE INDEX idx_explore_content_location ON explore_content USING GIST(
  ll_to_earth(location_lat, location_lng)
);
CREATE INDEX idx_explore_content_engagement ON explore_content(engagement_score DESC);
```

### ExploreVideo Table
```sql
CREATE TABLE explore_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  explore_content_id UUID REFERENCES explore_content(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id),
  development_id UUID REFERENCES developments(id),
  video_url VARCHAR(500) NOT NULL,
  thumbnail_url VARCHAR(500) NOT NULL,
  duration INTEGER NOT NULL, -- seconds
  transcoded_urls JSONB, -- {720p: url, 480p: url}
  music_track VARCHAR(255),
  has_subtitles BOOLEAN DEFAULT false,
  subtitle_url VARCHAR(500),
  total_views INTEGER DEFAULT 0,
  total_watch_time INTEGER DEFAULT 0, -- seconds
  completion_rate DECIMAL(5, 2) DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  click_through_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_explore_videos_property ON explore_videos(property_id);
CREATE INDEX idx_explore_videos_development ON explore_videos(development_id);
```

### ExploreCategory Table
```sql
CREATE TABLE explore_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(100),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  property_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### ExploreNeighbourhood Table
```sql
CREATE TABLE explore_neighbourhoods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  city VARCHAR(100),
  province VARCHAR(100),
  hero_banner_url VARCHAR(500),
  description TEXT,
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  boundary_polygon GEOGRAPHY(POLYGON),
  amenities JSONB, -- {schools: [], shopping: [], transport: []}
  safety_rating DECIMAL(3, 2),
  walkability_score INTEGER,
  avg_property_price INTEGER,
  price_trend JSONB, -- {6m: [], 12m: []}
  highlights TEXT[],
  follower_count INTEGER DEFAULT 0,
  property_count INTEGER DEFAULT 0,
  video_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_explore_neighbourhoods_location ON explore_neighbourhoods USING GIST(
  ll_to_earth(location_lat, location_lng)
);
```

### ExploreUserPreference Table
```sql
CREATE TABLE explore_user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  price_range_min INTEGER,
  price_range_max INTEGER,
  preferred_locations TEXT[],
  preferred_property_types TEXT[],
  preferred_lifestyle_categories TEXT[],
  followed_neighbourhoods UUID[],
  followed_creators UUID[],
  engagement_history JSONB, -- recent interactions
  last_active TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX idx_explore_user_pref_user ON explore_user_preferences(user_id);
```

### ExploreFeedSession Table
```sql
CREATE TABLE explore_feed_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  total_duration INTEGER, -- seconds
  videos_viewed INTEGER DEFAULT 0,
  videos_completed INTEGER DEFAULT 0,
  properties_saved INTEGER DEFAULT 0,
  click_throughs INTEGER DEFAULT 0,
  device_type VARCHAR(50),
  session_data JSONB -- detailed interaction log
);

CREATE INDEX idx_explore_sessions_user ON explore_feed_sessions(user_id);
CREATE INDEX idx_explore_sessions_start ON explore_feed_sessions(session_start DESC);
```

### ExploreEngagement Table
```sql
CREATE TABLE explore_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  content_id UUID REFERENCES explore_content(id),
  engagement_type VARCHAR(50) NOT NULL, -- 'view', 'save', 'share', 'click'
  watch_time INTEGER, -- for videos
  completed BOOLEAN DEFAULT false,
  session_id UUID REFERENCES explore_feed_sessions(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_explore_engagement_user ON explore_engagements(user_id);
CREATE INDEX idx_explore_engagement_content ON explore_engagements(content_id);
CREATE INDEX idx_explore_engagement_type ON explore_engagements(engagement_type);
```

### ExploreBoostCampaign Table
```sql
CREATE TABLE explore_boost_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES users(id),
  content_id UUID REFERENCES explore_content(id),
  campaign_name VARCHAR(255),
  budget DECIMAL(10, 2),
  spent DECIMAL(10, 2) DEFAULT 0,
  duration_days INTEGER,
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  target_audience JSONB,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed'
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  conversions INTEGER DEFAULT 0,
  cost_per_click DECIMAL(10, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_boost_campaigns_creator ON explore_boost_campaigns(creator_id);
CREATE INDEX idx_boost_campaigns_status ON explore_boost_campaigns(status);
CREATE INDEX idx_boost_campaigns_dates ON explore_boost_campaigns(start_date, end_date);
```

## Error Handling

### Client-Side Error Handling

**Video Playback Errors:**
- Network failure → Display retry button with cached thumbnail
- Video format unsupported → Attempt fallback format (720p → 480p)
- Slow loading → Show loading skeleton, preload next video
- Video unavailable → Skip to next video, log error

**Feed Loading Errors:**
- API timeout → Display cached content with "Refresh" option
- No content available → Show empty state with suggestions
- Filter returns no results → Suggest relaxing filters
- Location permission denied → Fall back to city-level content

**Map Errors:**
- Map tiles fail to load → Display list view only
- Geolocation unavailable → Use IP-based location estimation
- Too many properties in viewport → Enable clustering

### Server-Side Error Handling

**Recommendation Engine Errors:**
- User profile incomplete → Fall back to popular content
- Algorithm timeout → Return cached recommendations
- Database query failure → Serve trending content

**Video Processing Errors:**
- Upload fails → Retry with exponential backoff
- Transcoding fails → Store original, retry processing
- Invalid format → Return validation error to user
- Storage quota exceeded → Notify admin, pause uploads

**Boost Campaign Errors:**
- Budget exceeded → Auto-pause campaign, notify creator
- Invalid targeting → Use default targeting parameters
- Payment failure → Pause campaign, notify creator

## Testing Strategy

### Unit Testing

**Frontend Components:**
- Test video player controls (play, pause, swipe)
- Test card rendering with various content types
- Test map pin clustering logic
- Test filter application and clearing
- Test engagement tracking functions

**Backend Services:**
- Test recommendation algorithm with mock user profiles
- Test video validation logic
- Test boost campaign budget calculations
- Test neighbourhood stats aggregation
- Test spatial queries for map bounds

### Property-Based Testing

We will use **fast-check** (JavaScript/TypeScript property-based testing library) for universal property validation.

**Configuration:**
- Each property test will run a minimum of 100 iterations
- Tests will use custom generators for domain-specific data
- Each test will be tagged with the format: `**Feature: explore-discovery-engine, Property {number}: {property_text}**`

**Test Organization:**
- Property tests will be co-located with unit tests in `__tests__` directories
- Generators will be defined in `__tests__/generators/` subdirectories
- Each correctness property from the design will have exactly one property-based test



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Video transition performance
*For any* video in the feed, when a user swipes to the next video, the transition SHALL complete within 200 milliseconds.
**Validates: Requirements 1.2**

### Property 2: Video overlay completeness
*For any* video with property data, the overlay SHALL contain price, location, beds, baths, and development name (when applicable).
**Validates: Requirements 1.3**

### Property 3: Save action consistency
*For any* video or property card, double-tapping or clicking the save icon SHALL add the property to the user's saved collection.
**Validates: Requirements 1.4, 14.1**

### Property 4: Profile navigation
*For any* video with a creator, tapping the profile icon SHALL navigate to the correct agent or developer profile page.
**Validates: Requirements 1.5**

### Property 5: Video auto-loop
*For any* video, when playback completes, the video SHALL automatically restart from the beginning.
**Validates: Requirements 1.6**

### Property 6: Listing navigation
*For any* video with a property, tapping "View Listing" SHALL open the full property details page.
**Validates: Requirements 1.7**

### Property 7: Price range recommendation adaptation
*For any* user viewing pattern focused on a specific price range, the recommendation engine SHALL increase the proportion of properties within that range in future feeds.
**Validates: Requirements 2.1**

### Property 8: Neighbourhood preference learning
*For any* neighbourhood where a user saves multiple properties, the recommendation engine SHALL increase content from that neighbourhood in subsequent feeds.
**Validates: Requirements 2.2**

### Property 9: Completion signal recording
*For any* video watched to completion, the system SHALL record a positive engagement signal in the user's profile.
**Validates: Requirements 2.3**

### Property 10: Skip signal processing
*For any* sequence of quickly skipped videos with similar characteristics, the recommendation engine SHALL decrease similar content in future recommendations.
**Validates: Requirements 2.4**

### Property 11: Property type preference adaptation
*For any* property type that a user interacts with frequently, the recommendation algorithm SHALL increase the proportion of that type in future feeds.
**Validates: Requirements 2.5**

### Property 12: Multi-factor recommendation
*For any* recommendation generation, the algorithm SHALL incorporate user location, budget signals, property type preferences, and watch time patterns.
**Validates: Requirements 2.6**

### Property 13: Map-feed synchronization on scroll
*For any* property in the feed, when scrolled into view, the corresponding map pin SHALL be highlighted.
**Validates: Requirements 3.2**

### Property 14: Map-feed synchronization on pan
*For any* map viewport change, the property feed SHALL update to show only listings within the visible bounds.
**Validates: Requirements 3.3**

### Property 15: Pin-to-card highlighting
*For any* map pin, when tapped, the corresponding property card SHALL be highlighted in the feed.
**Validates: Requirements 3.4**

### Property 16: Search area reload
*For any* map viewport, tapping "Search This Area" SHALL reload the feed with properties from the current bounds.
**Validates: Requirements 3.5**

### Property 17: Cluster marker display
*For any* set of properties within clustering distance, the map SHALL display a cluster marker with the correct property count.
**Validates: Requirements 3.6**

### Property 18: Category filtering
*For any* lifestyle category selection, the Explore feed SHALL display only properties matching that category.
**Validates: Requirements 4.2**

### Property 19: Multi-feed category filtering
*For any* active category, both the video feed and discovery cards SHALL filter to match the category.
**Validates: Requirements 4.3**

### Property 20: Category session persistence
*For any* category selection, the preference SHALL persist throughout the user's session across navigation.
**Validates: Requirements 4.4**

### Property 21: Neighbourhood amenity display
*For any* neighbourhood page, all amenity types (schools, shopping, transport, safety ratings) SHALL be displayed.
**Validates: Requirements 5.2**

### Property 22: Neighbourhood price data display
*For any* neighbourhood with price data, the page SHALL display price trends and average property values.
**Validates: Requirements 5.3**

### Property 23: Neighbourhood video filtering
*For any* neighbourhood page, only videos specific to that neighbourhood SHALL be displayed.
**Validates: Requirements 5.4**

### Property 24: Neighbourhood property filtering
*For any* neighbourhood page, only properties within that neighbourhood SHALL be displayed.
**Validates: Requirements 5.5**

### Property 25: Follow impact on recommendations
*For any* followed neighbourhood, content from that area SHALL increase in the user's personalized feed.
**Validates: Requirements 5.6**

### Property 26: Multi-view filter synchronization
*For any* filter application, the Explore feed, video feed, and map view SHALL all update simultaneously.
**Validates: Requirements 6.4**

### Property 27: Dynamic filter adaptation
*For any* property type change, the available filter options SHALL adjust to match the selected type.
**Validates: Requirements 6.5**

### Property 28: Filter state display
*For any* active filter set, the system SHALL display a filter count badge and provide a clear filters action.
**Validates: Requirements 6.6**

### Property 29: Content type diversity
*For any* Explore feed, the content SHALL include property cards, video thumbnails, neighbourhood cards, and market insight cards.
**Validates: Requirements 7.1**

### Property 30: Content type distribution
*For any* sequence of 10 items in the feed, at least one new content type SHALL be introduced every 5-7 items.
**Validates: Requirements 7.2**

### Property 31: Recency prioritization
*For any* feed generation, content uploaded within the last 7 days SHALL be prioritized over older content.
**Validates: Requirements 7.3**

### Property 32: Personalized content ordering
*For any* user with engagement history, the feed ordering SHALL reflect weighted personalization based on that history.
**Validates: Requirements 7.4**

### Property 33: Sponsored content disclosure
*For any* sponsored content item, the system SHALL display a disclosure label while integrating it seamlessly with organic content.
**Validates: Requirements 7.5**

### Property 34: Video metadata validation
*For any* video upload, the system SHALL reject submissions missing required metadata (price, location, property type, tags).
**Validates: Requirements 8.1**

### Property 35: Video duration validation
*For any* video submission, the system SHALL reject videos shorter than 8 seconds or longer than 60 seconds.
**Validates: Requirements 8.4**

### Property 36: Video analytics provision
*For any* video with engagement, the creator SHALL have access to analytics including views, watch time, saves, and click-throughs.
**Validates: Requirements 8.6**

### Property 37: Boost frequency increase
*For any* boosted content, the appearance frequency in relevant user feeds SHALL be higher than non-boosted content.
**Validates: Requirements 9.2**

### Property 38: Boost labeling
*For any* boosted content displayed, a "Sponsored" label SHALL be visible.
**Validates: Requirements 9.3**

### Property 39: Boost analytics provision
*For any* active boost campaign, real-time analytics on impressions, engagement, and cost per interaction SHALL be available.
**Validates: Requirements 9.4**

### Property 40: Boost budget enforcement
*For any* boost campaign, when the budget is depleted, the system SHALL stop promoting the content and notify the creator.
**Validates: Requirements 9.5**

### Property 41: Sponsored content ratio
*For any* feed segment of 10 items, at most 1 SHALL be sponsored content.
**Validates: Requirements 9.6**

### Property 42: Video preloading
*For any* currently playing video, the next 2 videos in the sequence SHALL be preloaded.
**Validates: Requirements 10.1**

### Property 43: Lazy loading behavior
*For any* content in the feed, images and data SHALL load only as they approach the viewport.
**Validates: Requirements 10.2**

### Property 44: Default muted playback
*For any* video that begins playing, the initial state SHALL be muted with tap-to-unmute available.
**Validates: Requirements 10.4**

### Property 45: Admin video actions
*For any* uploaded video under review, the administrator SHALL have access to approve, reject, or request changes actions.
**Validates: Requirements 11.2**

### Property 46: Featured content prioritization
*For any* content marked as featured by an administrator, it SHALL appear in "Trending" and "Featured" sections.
**Validates: Requirements 11.3**

### Property 47: Category management operations
*For any* lifestyle category, administrators SHALL be able to create, edit, and reorder it.
**Validates: Requirements 11.4**

### Property 48: Admin analytics display
*For any* Explore content, administrators SHALL have access to engagement metrics including total views, average watch time, and performance rankings.
**Validates: Requirements 11.5**

### Property 49: Sponsored content configuration
*For any* sponsored content, administrators SHALL be able to configure placement frequency and target audience parameters.
**Validates: Requirements 11.6**

### Property 50: Infinite scroll loading
*For any* scroll position approaching the end of loaded content, the system SHALL progressively load additional content blocks.
**Validates: Requirements 12.2**

### Property 51: Content block layout
*For any* content block, items SHALL be displayed in a horizontal scrollable list.
**Validates: Requirements 12.3**

### Property 52: Content block navigation
*For any* content block with a "See All" action, tapping it SHALL navigate to a full-page view of that category.
**Validates: Requirements 12.4**

### Property 53: For You personalization
*For any* user with engagement history, the "For You" content block SHALL be personalized based on that history.
**Validates: Requirements 12.5**

### Property 54: Location-based popular content
*For any* user with a known location, the "Popular Near You" content SHALL show trending properties from that area.
**Validates: Requirements 12.6**

### Property 55: Neighbourhood follow action
*For any* neighbourhood, tapping the follow button SHALL add it to the user's followed list.
**Validates: Requirements 13.1**

### Property 56: Creator follow impact
*For any* followed creator, their content SHALL appear more frequently in the user's personalized feed.
**Validates: Requirements 13.2**

### Property 57: Followed items display
*For any* user profile view, lists of followed neighbourhoods and creators SHALL be displayed.
**Validates: Requirements 13.3**

### Property 58: Unfollow impact
*For any* unfollowed neighbourhood or creator, content from that source SHALL decrease in future recommendations.
**Validates: Requirements 13.4**

### Property 59: Follower notifications
*For any* creator gaining a follower, the system SHALL notify the creator and update their follower count.
**Validates: Requirements 13.5**

### Property 60: Saved items retrieval
*For any* user viewing their saved properties, all saved items SHALL be displayed with collection organization options.
**Validates: Requirements 14.3**

### Property 61: Save signal for recommendations
*For any* property save action, the system SHALL use this signal to improve future recommendations.
**Validates: Requirements 14.4**

### Property 62: Save state display
*For any* already-saved property, the save icon SHALL display as filled and allow unsaving with a single tap.
**Validates: Requirements 14.5**

### Property 63: Similar property generation
*For any* viewed property, the system SHALL generate similar properties based on price (within 20%), location (same or adjacent areas), and property features.
**Validates: Requirements 15.1, 15.3**

### Property 64: Similar properties in feed
*For any* user with viewing history, similar properties SHALL appear in the "Similar to What You Viewed" section.
**Validates: Requirements 15.2**

### Property 65: Similarity algorithm refinement
*For any* similar property interaction, the system SHALL refine the similarity algorithm based on which suggestions receive engagement.
**Validates: Requirements 15.4**

### Property 66: Similarity fallback expansion
*For any* property with no exact similar matches, the system SHALL expand criteria to include nearby areas or adjusted price ranges.
**Validates: Requirements 15.5**



## Performance Requirements

### Video Feed Performance
- Video transition time: < 200ms (Property 1)
- Video preload: Next 2 videos buffered before user reaches them
- Initial feed load: < 1.5 seconds for first 5 videos
- Swipe gesture response: < 50ms

### Map Performance
- Map tile loading: Progressive, visible area first
- Pin rendering: < 500ms for up to 1000 pins
- Cluster calculation: < 300ms for viewport changes
- Map-feed sync delay: < 100ms

### Feed Performance
- Infinite scroll trigger: 2 screens before end
- Lazy load trigger: 1 screen before viewport
- Image loading: Progressive JPEG with blur-up
- Content block rendering: < 200ms per block

### API Performance
- Recommendation generation: < 800ms
- Video upload processing: < 5 minutes
- Analytics query: < 500ms
- Boost campaign activation: < 1 second

### Caching Strategy
- User preferences: Redis, 1-hour TTL
- Feed results: Redis, 5-minute TTL
- Neighbourhood data: Redis, 1-day TTL
- Video metadata: Redis, 1-hour TTL
- Map tiles: Browser cache, 7-day TTL

## Scalability Considerations

### Database Optimization
- Spatial indexes on all location columns
- Composite indexes on (user_id, created_at) for engagement queries
- Partitioning of engagement tables by month
- Read replicas for recommendation queries
- Connection pooling with max 100 connections

### Content Delivery
- Video CDN with edge caching
- Image CDN with automatic format conversion (WebP, AVIF)
- Thumbnail generation at multiple sizes (320px, 640px, 1280px)
- Adaptive bitrate streaming for videos

### Recommendation Engine Scaling
- Pre-compute recommendations for active users (hourly batch job)
- Cache popular content rankings (15-minute refresh)
- Async processing of engagement signals
- Horizontal scaling of recommendation service

### Monitoring and Alerts
- Video load time > 3 seconds
- API response time > 1 second
- Error rate > 1%
- Cache hit rate < 80%
- Database connection pool > 80% utilization

## Security Considerations

### Content Moderation
- All uploaded videos require admin approval before going live
- Automated content scanning for inappropriate material
- User reporting system for problematic content
- Creator reputation scoring based on approval rate

### Data Privacy
- User engagement data anonymized for analytics
- Location data stored with user consent only
- Viewing history retention: 90 days
- Right to deletion: Complete user data removal within 30 days

### API Security
- Rate limiting: 100 requests per minute per user
- Video upload size limit: 100MB
- Authentication required for all personalized endpoints
- CORS restrictions on video upload endpoints

### Boost Campaign Security
- Payment verification before campaign activation
- Budget limits enforced at API level
- Fraud detection for suspicious boost patterns
- Refund policy for invalid clicks

## Accessibility

### Video Accessibility
- Auto-generated subtitles for all videos
- Subtitle toggle control
- Screen reader support for video overlays
- Keyboard navigation for video controls

### UI Accessibility
- ARIA labels on all interactive elements
- Keyboard navigation for entire Explore interface
- Focus indicators on all focusable elements
- Color contrast ratio > 4.5:1 for all text

### Motion Accessibility
- Respect prefers-reduced-motion setting
- Disable auto-play for users with motion sensitivity
- Provide static alternatives to animated content
- Smooth scroll option for feed navigation

## Internationalization

### Content Localization
- Multi-language support for UI elements
- Currency formatting based on user locale
- Date/time formatting per locale
- Right-to-left (RTL) layout support

### Content Translation
- Property descriptions translated to user's language
- Neighbourhood information localized
- Video subtitles in multiple languages
- Search query translation

## Analytics and Metrics

### User Engagement Metrics
- Daily Active Users (DAU) in Explore
- Average session duration
- Videos per session
- Swipe-through rate
- Save rate
- Click-through rate to listings

### Content Performance Metrics
- Video completion rate
- Average watch time per video
- Top-performing creators
- Most-viewed neighbourhoods
- Category popularity

### Business Metrics
- Boost campaign ROI
- Revenue per boosted video
- Conversion rate (Explore → Listing view → Contact)
- Creator retention rate
- Content upload velocity

### Technical Metrics
- API response times (p50, p95, p99)
- Video load times
- Cache hit rates
- Error rates by endpoint
- Database query performance

## Future Enhancements

### Phase 2 Features
- Live video streaming for property tours
- AR property visualization in video feed
- Voice search for properties
- Social sharing with custom preview cards
- Collaborative property lists

### Phase 3 Features
- AI-generated property videos from images
- Personalized video narration
- Virtual staging in videos
- Neighbourhood comparison tool
- Investment calculator integration

### Phase 4 Features
- Blockchain-based property verification
- NFT property certificates
- Metaverse property showcases
- AI chatbot for property questions
- Predictive pricing models

## Migration Strategy

### Phase 1: Foundation (Weeks 1-4)
- Set up database schema
- Implement basic video upload and storage
- Create video feed component
- Build recommendation engine MVP

### Phase 2: Core Features (Weeks 5-8)
- Implement map hybrid view
- Add lifestyle categories
- Build neighbourhood pages
- Create boost system

### Phase 3: Polish (Weeks 9-10)
- Performance optimization
- Analytics dashboard
- Admin controls
- Testing and bug fixes

### Phase 4: Launch (Week 11-12)
- Beta testing with select users
- Content seeding
- Creator onboarding
- Public launch

## Dependencies

### External Services
- AWS S3 for video and image storage
- AWS CloudFront for CDN
- Google Maps API for map functionality
- Redis for caching
- PostgreSQL with PostGIS extension

### Third-Party Libraries
- React for UI components
- Zustand for state management
- React Query for data fetching
- Framer Motion for animations
- fast-check for property-based testing
- Vitest for unit testing

### Internal Dependencies
- Existing user authentication system
- Property listing database
- Agent/developer profiles
- Payment processing system
- Notification system

## Deployment Architecture

### Production Environment
```
┌─────────────────────────────────────────────────────────────┐
│                     Load Balancer (AWS ALB)                  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  Web Server  │    │  Web Server  │    │  Web Server  │
│   (Node.js)  │    │   (Node.js)  │    │   (Node.js)  │
└──────────────┘    └──────────────┘    └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            ▼
                ┌───────────────────────┐
                │   PostgreSQL Primary  │
                │   (with PostGIS)      │
                └───────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
        ┌──────────────┐        ┌──────────────┐
        │  Read Replica│        │  Read Replica│
        └──────────────┘        └──────────────┘
        
        ┌───────────────────────┐
        │   Redis Cluster       │
        │   (Cache + Sessions)  │
        └───────────────────────┘
        
        ┌───────────────────────┐
        │   S3 + CloudFront     │
        │   (Videos + Images)   │
        └───────────────────────┘
```

### Staging Environment
- Mirrors production with reduced capacity
- Separate database and cache instances
- Same CDN configuration for testing
- Automated deployment from main branch

### Development Environment
- Local PostgreSQL with PostGIS
- Local Redis instance
- S3 bucket for development uploads
- Hot reload for rapid development

## Conclusion

The Explore Discovery Engine represents a paradigm shift in property discovery, combining entertainment, intelligence, and functionality. By implementing the architecture, components, and algorithms outlined in this design, we will create a highly engaging platform that keeps users exploring properties while providing agents and developers with powerful tools to showcase their listings. The system is designed to scale, adapt, and evolve with user needs while maintaining performance and reliability.
