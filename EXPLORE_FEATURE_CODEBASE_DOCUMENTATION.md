# Explore Feature - Comprehensive Codebase Documentation

## Executive Summary

The Explore Feature is a next-generation property discovery engine that transforms traditional property browsing into an engaging, personalized content experience. It combines:
- **Short-form video content** (TikTok/Reels style)
- **Intelligent data-driven recommendations** (Zillow-inspired)
- **Lifestyle-based discovery** (Airbnb-inspired)
- **Neighbourhood storytelling**

This document provides a complete technical overview for senior developers.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXPLORE FEATURE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         FRONTEND (React + TypeScript)                │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │ ExploreHome │  │ ExploreFeed │  │ExploreShorts│  │ ExploreMap │  │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └─────┬──────┘  │    │
│  │         │                │                │               │          │    │
│  │  ┌──────┴────────────────┴────────────────┴───────────────┴──────┐  │    │
│  │  │                    SHARED COMPONENTS                           │  │    │
│  │  │  • TrendingVideosSection  • DiscoveryCardFeed                 │  │    │
│  │  │  • ExploreVideoFeed       • FilterPanel                       │  │    │
│  │  │  • PersonalizedContentBlock • LifestyleCategorySelector       │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │                              │                                       │    │
│  │  ┌───────────────────────────┴───────────────────────────────────┐  │    │
│  │  │                    CUSTOM HOOKS                                │  │    │
│  │  │  • useTrendingVideos    • useDiscoveryFeed                    │  │    │
│  │  │  • useExploreVideoFeed  • usePersonalizedContent              │  │    │
│  │  │  • useExploreCommonState • useMapHybridView                   │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  │                              │                                       │    │
│  │  ┌───────────────────────────┴───────────────────────────────────┐  │    │
│  │  │                    STATE MANAGEMENT (Zustand)                  │  │    │
│  │  │  • exploreFiltersStore - Filter state persistence             │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│                              tRPC API                                        │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         BACKEND (Node.js + Express)                  │    │
│  │  ┌─────────────────────────────────────────────────────────────┐    │    │
│  │  │                    tRPC ROUTERS                              │    │    │
│  │  │  • exploreRouter        • exploreApiRouter                  │    │    │
│  │  │  • exploreVideoUploadRouter • exploreAnalyticsRouter        │    │    │
│  │  │  • boostCampaignRouter  • similarPropertiesRouter           │    │    │
│  │  └─────────────────────────────────────────────────────────────┘    │    │
│  │                              │                                       │    │
│  │  ┌───────────────────────────┴───────────────────────────────────┐  │    │
│  │  │                    SERVICES                                    │  │    │
│  │  │  • exploreFeedService       • recommendationEngineService     │  │    │
│  │  │  • exploreVideoService      • exploreAnalyticsService         │  │    │
│  │  │  • exploreInteractionService • boostCampaignService           │  │    │
│  │  │  • exploreAgencyService     • videoProcessingService          │  │    │
│  │  └───────────────────────────────────────────────────────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                    │                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         DATABASE (MySQL/TiDB)                        │    │
│  │  • explore_shorts    • explore_content    • explore_engagements     │    │
│  │  • explore_categories • explore_topics    • explore_user_preferences│    │
│  │  • explore_boost_campaigns • explore_discovery_videos               │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagram

```
User Action → Hook → tRPC Query → Router → Service → Database
     ↓                                          ↓
  UI Update ← State Update ← Response ← Cache ← Query Result
```

---

## Frontend Components

### 1. Pages (`client/src/pages/`)

#### ExploreHome.tsx
**Purpose**: Main entry point for the Explore feature with video-first layout.

**Key Features**:
- Three view modes: Home, Cards, Videos
- Trending videos section (first content after header)
- Personalized content blocks
- Lifestyle category filtering
- Responsive filter panel

**State Management**:
```typescript
const {
  viewMode,           // 'home' | 'cards' | 'videos'
  selectedCategoryId, // Lifestyle category filter
  showFilters,        // Filter panel visibility
  filters,            // Active filter values
} = useExploreCommonState({ initialViewMode: 'home' });
```

**Content Order**:
1. Header with view mode toggle
2. Lifestyle Category Selector
3. **Trending Videos Section** (video-first priority)
4. Personalized Content Blocks (For You, Popular Near You, etc.)

---

#### ExploreFeed.tsx
**Purpose**: Grid-based property discovery with horizontal scrolling content blocks.

**Key Features**:
- Desktop sidebar with filters
- Mobile-optimized header
- Feed type switching (recommended, area, category)
- Search functionality
- Upload button for authenticated users

---

#### ExploreShorts.tsx
**Purpose**: TikTok-style vertical video feed with swipe navigation.

**Key Features**:
- Full-screen vertical video playback
- Swipe up/down navigation
- Double-tap to save
- Glass overlay controls
- Swipe hint for first-time users

---

#### ExploreMap.tsx
**Purpose**: Map-synchronized property browsing.

**Key Features**:
- Split-screen map and feed view
- Pin clustering
- "Search This Area" functionality
- Synchronized scrolling

---

### 2. Core Components (`client/src/components/explore-discovery/`)

#### TrendingVideosSection.tsx
**Purpose**: Horizontal scrollable section of trending videos (video-first layout).

**Props**:
```typescript
interface TrendingVideosSectionProps {
  categoryId?: number;           // Filter by lifestyle category
  onVideoClick: (video) => void; // Handle video selection
  onSeeAll: () => void;          // Navigate to full video view
}
```

**Features**:
- Fetches trending videos via `useTrendingVideos` hook
- Skeleton loading states
- Empty state with category message
- Horizontal scroll with snap points

---

#### TrendingVideoCard.tsx
**Purpose**: Compact video card for horizontal display in trending section.

**Props**:
```typescript
interface TrendingVideoCardProps {
  video: TrendingVideo;
  onClick: () => void;
  index: number;
}
```

---

#### DiscoveryCardFeed.tsx
**Purpose**: Masonry grid of mixed content types (properties, videos, neighbourhoods, insights).

**Features**:
- Infinite scroll with intersection observer
- Content blocks with horizontal scrolling
- Engagement tracking
- Error and empty states

**Card Types**:
- `PropertyCard` - Property listings
- `VideoCard` - Video content
- `NeighbourhoodCard` - Area information
- `InsightCard` - Market insights

---

#### ExploreVideoFeed.tsx
**Purpose**: Full-screen vertical video browsing with swipe navigation.

**Features**:
- SwipeEngine for gesture detection
- VideoPlayer with auto-loop
- VideoOverlay with property info
- Progress indicators
- Preloading next videos

---

#### LifestyleCategorySelector.tsx
**Purpose**: Horizontal scrollable lifestyle category chips.

**Categories**:
- Secure Estates
- Luxury
- Family Living
- Student Living
- Urban Living
- Pet-Friendly
- Retirement

---

#### FilterPanel.tsx / ResponsiveFilterPanel.tsx
**Purpose**: Advanced filtering interface.

**Filter Options**:
- Property type
- Price range
- Bedrooms/Bathrooms
- Location
- Agency

---

#### PersonalizedContentBlock.tsx
**Purpose**: Themed content section with horizontal scroll.

**Section Types**:
- "For You" - Personalized recommendations
- "Popular Near You" - Location-based
- "New Developments" - Latest projects
- "Trending" - High engagement content

---

### 3. Card Components (`client/src/components/explore-discovery/cards/`)

| Component | Purpose | Key Props |
|-----------|---------|-----------|
| `PropertyCard.tsx` | Property listing display | property, onClick, onSave |
| `VideoCard.tsx` | Video thumbnail with overlay | video, onClick, onSave |
| `NeighbourhoodCard.tsx` | Area information card | neighbourhood, onClick, onFollow |
| `InsightCard.tsx` | Market insight display | insight, onClick |

---

### 4. Explore Components (`client/src/components/explore/`)

| Component | Purpose |
|-----------|---------|
| `ShortsContainer.tsx` | Container for vertical video feed |
| `SwipeEngine.tsx` | Gesture detection for swipe navigation |
| `VideoCard.tsx` | Full-screen video card with overlay |
| `PropertyOverlay.tsx` | Property info overlay on videos |
| `VideoFeedWithPreload.tsx` | Video feed with preloading |
| `ContactAgentModal.tsx` | Agent contact form |
| `EnhancedSearchBar.tsx` | Search with suggestions |
| `VideoUploadModal.tsx` | Video upload interface |

---

## Custom Hooks (`client/src/hooks/`)

### useTrendingVideos
**Purpose**: Fetches trending videos with category filtering.

```typescript
interface UseTrendingVideosOptions {
  categoryId?: number;
  limit?: number;
}

interface UseTrendingVideosReturn {
  videos: TrendingVideo[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isEmpty: boolean;
}
```

**Algorithm**:
- Fetches from `explore.getFeed` with `feedType: 'trending'`
- Filters by category if provided
- Falls back to placeholder data for development

---

### useDiscoveryFeed
**Purpose**: Manages discovery feed with infinite scroll.

```typescript
interface UseDiscoveryFeedOptions {
  categoryId?: number;
  filters?: Record<string, any>;
  usePlaceholder?: boolean;
}

// Returns
{
  contentBlocks: ContentBlock[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  recordEngagement: (contentId, type) => void;
  setupObserver: (element) => void;
  refetch: () => void;
}
```

**Features**:
- Organizes content into themed blocks
- Intersection observer for infinite scroll
- Engagement tracking via mutations

---

### useExploreVideoFeed
**Purpose**: Manages video feed state and navigation.

**Features**:
- Current video tracking
- Navigation (next/previous)
- Video completion handling
- Save/share actions

---

### useExploreCommonState
**Purpose**: Shared state logic across Explore pages.

```typescript
interface UseExploreCommonStateOptions {
  initialViewMode?: 'home' | 'cards' | 'videos' | 'shorts';
  initialFeedType?: FeedType;
}

// Returns
{
  viewMode, setViewMode,
  feedType, setFeedType,
  selectedCategoryId, setSelectedCategoryId,
  showFilters, setShowFilters, toggleFilters,
  filters,
  filterActions: { getFilterCount, clearFilters, ... }
}
```

---

### usePersonalizedContent
**Purpose**: Fetches personalized content sections.

**Sections Generated**:
- For You (based on engagement history)
- Popular Near You (location-based)
- New Developments
- Trending Listings

---

### Additional Hooks

| Hook | Purpose |
|------|---------|
| `useMapHybridView` | Map-feed synchronization |
| `useCategoryFilter` | Category filtering logic |
| `useNeighbourhoodDetail` | Neighbourhood page data |
| `useSaveProperty` | Property save functionality |
| `useFollowCreator` | Creator follow functionality |
| `useFollowNeighbourhood` | Neighbourhood follow functionality |
| `useVideoPlayback` | Video playback controls |
| `useVideoPreload` | Video preloading logic |
| `useImagePreload` | Image preloading |
| `useFilterUrlSync` | URL-filter synchronization |
| `useThrottle` / `useDebounce` | Performance utilities |

---

## State Management

### exploreFiltersStore (Zustand)
**Location**: `client/src/store/exploreFiltersStore.ts`

```typescript
interface FilterState {
  // Filter values
  propertyType: string | null;
  priceMin: number | null;
  priceMax: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  categoryId: number | null;
  location: string | null;
  agencyId: number | null;
  
  // Actions
  setPropertyType: (type) => void;
  setPriceRange: (min, max) => void;
  setBedrooms: (count) => void;
  setBathrooms: (count) => void;
  setCategoryId: (id) => void;
  setLocation: (location) => void;
  setAgencyId: (id) => void;
  clearFilters: () => void;
  getFilterCount: () => number;
}
```

**Features**:
- Persists to localStorage
- Shared across all Explore pages
- Automatic filter count calculation

---

## Backend Services (`server/services/`)

### exploreFeedService.ts
**Purpose**: Core feed generation logic.

**Methods**:
```typescript
class ExploreFeedService {
  // Get personalized recommendations
  getRecommendedFeed(options: FeedOptions): Promise<FeedResult>
  
  // Get location-based feed
  getAreaFeed(options: FeedOptions): Promise<FeedResult>
  
  // Get category-filtered feed
  getCategoryFeed(options: FeedOptions): Promise<FeedResult>
  
  // Get agent-specific content
  getAgentFeed(options: FeedOptions): Promise<FeedResult>
  
  // Get developer-specific content
  getDeveloperFeed(options: FeedOptions): Promise<FeedResult>
  
  // Get agency-attributed content
  getAgencyFeed(options: FeedOptions): Promise<FeedResult>
  
  // Get lifestyle categories
  getCategories(): Promise<Category[]>
  
  // Get topics for Deep Dive
  getTopics(): Promise<Topic[]>
}
```

**Feed Ranking Algorithm**:
1. Boost priority (paid promotion)
2. Quality-Weighted Performance Score: `Performance * (1 + Quality/100)`
3. Recency (publishedAt)

**Caching**:
- Uses Redis cache with 5-minute TTL
- Cache keys: `recommendedFeed:{userId}:{limit}:{offset}`

---

### recommendationEngineService.ts
**Purpose**: Intelligent personalization and content ranking.

**Personalization Factors**:
| Factor | Weight | Description |
|--------|--------|-------------|
| Engagement Score | 0-40 pts | Base content performance |
| Price Range Match | 0-20 pts | User budget alignment |
| Lifestyle Category | 0-15 pts | Category preference match |
| Creator Follow | 0-10 pts | Following bonus |
| Recency | 0-10 pts | Content freshness (7-day decay) |
| Location Proximity | 0-5 pts | Distance from user (50km radius) |

**Boost Injection**:
- 1:10 ratio (1 sponsored per 10 organic)
- Subtle "Sponsored" label
- Budget-based ordering

---

### exploreVideoService.ts
**Purpose**: Video upload, processing, and metadata management.

**Key Functions**:
```typescript
// Generate presigned S3 URLs for upload
generateVideoUploadUrls(creatorId, filename, contentType): Promise<VideoUploadResult>

// Create video records after upload
createExploreVideo(creatorId, videoUrl, thumbnailUrl, metadata, duration): Promise<ProcessedVideo>

// Update video analytics
updateVideoAnalytics(videoId, analytics): Promise<void>
```

**Validation Rules**:
- Duration: 8-60 seconds
- Required metadata: title, tags, property/development link
- Agency attribution validation

---

### exploreAnalyticsService.ts
**Purpose**: Engagement metrics and creator analytics.

**Metrics Tracked**:
- Views (total and unique)
- Watch time
- Completion rate
- Saves, shares, clicks
- Skip rate
- Engagement score

**Analytics Methods**:
```typescript
getVideoAnalytics(videoId, startDate?, endDate?): Promise<VideoAnalytics>
getCreatorAnalytics(creatorId, startDate?, endDate?): Promise<CreatorAnalytics>
getSessionAnalytics(sessionId): Promise<SessionAnalytics>
getAggregatedMetrics(period, creatorId?): Promise<AggregatedMetrics>
```

**Engagement Score Formula**:
```
Score = (completions/views * 40) + (saves/views * 30) + 
        (shares/views * 20) + (clicks/views * 10) - (skips/views * 20)
```

---

### exploreInteractionService.ts
**Purpose**: Records user interactions for analytics and recommendations.

**Interaction Types**:
- `impression` - Content appeared in viewport
- `view` - Content was viewed
- `skip` - Content was skipped quickly
- `save` - Property saved to favorites
- `share` - Content shared
- `contact` - Agent contacted
- `whatsapp` - WhatsApp contact
- `book_viewing` - Viewing booked

---

### boostCampaignService.ts
**Purpose**: Paid promotion management.

**Features**:
- Campaign creation with budget and duration
- Target audience configuration
- Real-time analytics
- Automatic budget depletion handling

---

### exploreAgencyService.ts
**Purpose**: Agency content attribution and analytics.

**Features**:
- Auto-detect agent's agency affiliation
- Agency feed generation
- Agent content aggregation
- Agency analytics dashboard

---

## API Routers (`server/`)

### exploreRouter.ts
**Purpose**: Main tRPC router for Explore feature.

**Endpoints**:
```typescript
// Get feed by type
getFeed: publicProcedure
  .input({
    feedType: 'recommended' | 'area' | 'category' | 'agent' | 'developer' | 'agency',
    limit: number,
    offset: number,
    location?: string,
    category?: string,
    agentId?: number,
    developerId?: number,
    agencyId?: number,
  })
  .query()

// Record user interaction
recordInteraction: publicProcedure
  .input({
    shortId: number,
    interactionType: 'impression' | 'view' | 'skip' | 'save' | 'share' | 'contact' | 'whatsapp' | 'book_viewing',
    duration?: number,
    feedType: FeedType,
    deviceType: 'mobile' | 'tablet' | 'desktop',
  })
  .mutation()

// Save property (authenticated)
saveProperty: protectedProcedure
  .input({ shortId: number })
  .mutation()

// Share property
shareProperty: publicProcedure
  .input({ shortId: number, platform?: string })
  .mutation()

// Get highlight tags
getHighlightTags: publicProcedure.query()

// Get categories
getCategories: publicProcedure.query()

// Get topics
getTopics: publicProcedure.query()

// Upload new explore short (authenticated)
uploadShort: protectedProcedure
  .input({
    title: string,
    caption?: string,
    mediaUrls: string[],
    highlights?: string[],
    listingId?: number,
    developmentId?: number,
    attributeToAgency?: boolean,
  })
  .mutation()
```

---

### exploreApiRouter.ts
**Purpose**: REST API endpoints for Explore feature.

---

### exploreVideoUploadRouter.ts
**Purpose**: Video upload handling with S3 presigned URLs.

---

### exploreAnalyticsRouter.ts
**Purpose**: Analytics endpoints for creators and admins.

---

### boostCampaignRouter.ts
**Purpose**: Boost campaign management endpoints.

---

### similarPropertiesRouter.ts
**Purpose**: Similar property recommendations.

---

## Database Schema

### Core Tables

```sql
-- Main content table
explore_shorts (
  id INT PRIMARY KEY,
  listing_id INT,
  development_id INT,
  agent_id INT,
  developer_id INT,
  agency_id INT,           -- Agency attribution
  title VARCHAR(255),
  caption TEXT,
  primary_media_id INT,
  media_ids JSON,
  highlights JSON,
  performance_score DECIMAL,
  boost_priority INT,
  is_published BOOLEAN,
  is_featured BOOLEAN,
  published_at DATETIME
)

-- Discovery engine content
explore_content (
  id INT PRIMARY KEY,
  content_type ENUM('video', 'property', 'neighbourhood', 'insight'),
  reference_id INT,
  creator_id INT,
  creator_type ENUM('user', 'agent', 'developer', 'agency'),
  agency_id INT,
  title VARCHAR(255),
  description TEXT,
  thumbnail_url VARCHAR(500),
  video_url VARCHAR(500),
  metadata JSON,
  tags JSON,
  lifestyle_categories JSON,
  location_lat DECIMAL,
  location_lng DECIMAL,
  price_min DECIMAL,
  price_max DECIMAL,
  view_count INT,
  engagement_score DECIMAL,
  is_active BOOLEAN,
  is_featured BOOLEAN
)

-- Video-specific data
explore_discovery_videos (
  id INT PRIMARY KEY,
  explore_content_id INT,
  property_id INT,
  development_id INT,
  video_url VARCHAR(500),
  thumbnail_url VARCHAR(500),
  duration INT,
  transcoded_urls JSON,
  music_track VARCHAR(255),
  has_subtitles BOOLEAN,
  subtitle_url VARCHAR(500),
  total_views INT,
  total_watch_time INT,
  completion_rate DECIMAL,
  save_count INT,
  share_count INT,
  click_through_count INT
)

-- User engagement tracking
explore_engagements (
  id INT PRIMARY KEY,
  content_id INT,
  user_id INT,
  session_id INT,
  engagement_type ENUM('view', 'save', 'share', 'click', 'skip'),
  watch_time INT,
  completed BOOLEAN,
  created_at DATETIME
)

-- User preferences for personalization
explore_user_preferences (
  id INT PRIMARY KEY,
  user_id INT UNIQUE,
  price_range_min DECIMAL,
  price_range_max DECIMAL,
  preferred_locations JSON,
  preferred_property_types JSON,
  preferred_lifestyle_categories JSON,
  followed_neighbourhoods JSON,
  followed_creators JSON
)

-- Lifestyle categories
explore_categories (
  id INT PRIMARY KEY,
  name VARCHAR(100),
  slug VARCHAR(100),
  icon VARCHAR(50),
  display_order INT,
  is_active BOOLEAN
)

-- Boost campaigns
explore_boost_campaigns (
  id INT PRIMARY KEY,
  content_id INT,
  creator_id INT,
  budget DECIMAL,
  spent DECIMAL,
  start_date DATETIME,
  end_date DATETIME,
  target_audience JSON,
  status ENUM('draft', 'active', 'paused', 'completed'),
  impressions INT,
  clicks INT,
  conversions INT
)

-- Feed sessions
explore_feed_sessions (
  id INT PRIMARY KEY,
  user_id INT,
  started_at DATETIME,
  ended_at DATETIME,
  feed_type VARCHAR(50),
  device_type VARCHAR(20)
)
```

---
