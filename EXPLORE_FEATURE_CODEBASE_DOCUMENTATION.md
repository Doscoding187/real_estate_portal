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

## Key Requirements Implementation

### Requirement 1: Video Feed
| Acceptance Criteria | Implementation |
|---------------------|----------------|
| Full-screen vertical videos | `ExploreVideoFeed.tsx`, `ExploreShorts.tsx` |
| Swipe-up navigation | `SwipeEngine.tsx` with gesture detection |
| Property overlay | `VideoOverlay.tsx` with price, location, beds, baths |
| Double-tap to save | `SwipeEngine.onDoubleTap` → `useSaveProperty` |
| Auto-loop videos | `VideoPlayer.tsx` with `loop` attribute |
| 200ms load time | Video preloading in `useExploreVideoFeed` |

### Requirement 2: Personalization
| Acceptance Criteria | Implementation |
|---------------------|----------------|
| Price range learning | `recommendationEngineService.calculatePersonalizedScore()` |
| Neighbourhood preference | `exploreUserPreferences.preferredLocations` |
| Watch completion signal | `exploreEngagements.completed` flag |
| Skip signal | `exploreEngagements.engagementType = 'skip'` |
| Multi-factor algorithm | 6-factor scoring in `recommendationEngineService` |

### Requirement 4: Lifestyle Categories
| Acceptance Criteria | Implementation |
|---------------------|----------------|
| Horizontal category list | `LifestyleCategorySelector.tsx` |
| Filter feed by category | `useTrendingVideos({ categoryId })` |
| Session persistence | `exploreFiltersStore` with localStorage |

### Requirement 7: Mixed Content Feed
| Acceptance Criteria | Implementation |
|---------------------|----------------|
| Blend content types | `DiscoveryCardFeed.tsx` with 4 card types |
| New content type every 5-7 items | `organizeIntoBlocks()` in `useDiscoveryFeed` |
| 7-day recency priority | `recommendationEngineService` recency bonus |
| Sponsored integration | `injectBoostedContent()` with 1:10 ratio |

### Requirement 8: Video Upload
| Acceptance Criteria | Implementation |
|---------------------|----------------|
| Required metadata | `validateVideoMetadata()` in `exploreVideoService` |
| 5-minute processing | S3 presigned URLs for direct upload |
| 8-60 second duration | `validateVideoDuration()` |
| Creator analytics | `exploreAnalyticsService.getCreatorAnalytics()` |

### Requirement 10: Performance
| Acceptance Criteria | Implementation |
|---------------------|----------------|
| Preload next 2 videos | `useVideoPreload` hook |
| Lazy-load images | `useImagePreload` hook |
| Default muted playback | `isMuted` state in `ExploreVideoFeed` |
| Loading skeletons | `SkeletonCard` components |

---

## File Structure Summary

```
client/src/
├── pages/
│   ├── ExploreHome.tsx          # Main explore page (video-first)
│   ├── ExploreFeed.tsx          # Grid-based feed
│   ├── ExploreShorts.tsx        # TikTok-style shorts
│   ├── ExploreMap.tsx           # Map hybrid view
│   ├── ExploreUpload.tsx        # Video upload page
│   ├── NeighbourhoodDetail.tsx  # Neighbourhood deep-dive
│   ├── SavedProperties.tsx      # Saved items
│   └── FollowedItems.tsx        # Followed creators/areas
│
├── components/
│   ├── explore-discovery/
│   │   ├── TrendingVideosSection.tsx
│   │   ├── TrendingVideoCard.tsx
│   │   ├── DiscoveryCardFeed.tsx
│   │   ├── ExploreVideoFeed.tsx
│   │   ├── LifestyleCategorySelector.tsx
│   │   ├── FilterPanel.tsx
│   │   ├── ResponsiveFilterPanel.tsx
│   │   ├── MobileFilterBottomSheet.tsx
│   │   ├── PersonalizedContentBlock.tsx
│   │   ├── MapHybridView.tsx
│   │   ├── VideoPlayer.tsx
│   │   ├── VideoOverlay.tsx
│   │   ├── SaveButton.tsx
│   │   ├── FollowButton.tsx
│   │   ├── EmptyState.tsx
│   │   ├── ErrorBoundary.tsx
│   │   ├── OfflineIndicator.tsx
│   │   ├── VirtualizedFeed.tsx
│   │   ├── AmenityDisplay.tsx
│   │   ├── PriceStatistics.tsx
│   │   ├── AgencyHeader.tsx
│   │   ├── AgencySelector.tsx
│   │   └── cards/
│   │       ├── PropertyCard.tsx
│   │       ├── VideoCard.tsx
│   │       ├── NeighbourhoodCard.tsx
│   │       └── InsightCard.tsx
│   │
│   ├── explore/
│   │   ├── ShortsContainer.tsx
│   │   ├── SwipeEngine.tsx
│   │   ├── VideoCard.tsx
│   │   ├── PropertyOverlay.tsx
│   │   ├── VideoFeedWithPreload.tsx
│   │   ├── ContactAgentModal.tsx
│   │   ├── EnhancedSearchBar.tsx
│   │   └── VideoUploadModal.tsx
│   │
│   └── explore-analytics/
│       ├── ExploreAnalyticsDashboard.tsx
│       ├── AgencyAnalyticsDashboard.tsx
│       ├── BoostCampaignManager.tsx
│       └── ExploreSection.tsx
│
├── hooks/
│   ├── useTrendingVideos.ts
│   ├── useDiscoveryFeed.ts
│   ├── useExploreVideoFeed.ts
│   ├── useExploreCommonState.ts
│   ├── usePersonalizedContent.ts
│   ├── useMapHybridView.ts
│   ├── useCategoryFilter.ts
│   ├── useNeighbourhoodDetail.ts
│   ├── useSaveProperty.ts
│   ├── useFollowCreator.ts
│   ├── useFollowNeighbourhood.ts
│   ├── useVideoPlayback.ts
│   ├── useVideoPreload.ts
│   ├── useImagePreload.ts
│   ├── useFilterUrlSync.ts
│   ├── useSwipeGestures.ts
│   ├── useShortsFeed.ts
│   ├── usePropertyFilters.ts
│   ├── useAgencyFeed.ts
│   └── useAgencyAnalytics.ts
│
├── store/
│   └── exploreFiltersStore.ts
│
└── data/
    └── explorePlaceholderData.ts

server/
├── exploreRouter.ts
├── exploreApiRouter.ts
├── exploreVideoUploadRouter.ts
├── exploreAnalyticsRouter.ts
├── boostCampaignRouter.ts
├── similarPropertiesRouter.ts
│
└── services/
    ├── exploreFeedService.ts
    ├── recommendationEngineService.ts
    ├── exploreVideoService.ts
    ├── exploreAnalyticsService.ts
    ├── exploreInteractionService.ts
    ├── exploreAgencyService.ts
    ├── boostCampaignService.ts
    ├── videoProcessingService.ts
    └── similarPropertiesService.ts
```

---

## Testing

### Test Files Location
```
client/src/components/explore-discovery/__tests__/
├── AriaCompliance.test.tsx
├── EmptyState.test.tsx
├── ErrorBoundary.test.tsx
├── MobileFilterBottomSheet.test.tsx
├── OfflineIndicator.test.tsx
└── VirtualizedFeed.validation.md

server/services/__tests__/
├── exploreFeedService.test.ts
├── exploreDiscoverySchema.test.ts
├── exploreAgencyAttribution.test.ts
└── exploreAgencyAttribution.integration.test.ts
```

---

## Design System Integration

### Design Tokens (`client/src/lib/design-tokens.ts`)
```typescript
designTokens = {
  colors: {
    bg: { primary, secondary, tertiary, dark },
    text: { primary, secondary, tertiary, inverse },
    accent: { primary, light, gradient },
    glass: { bg, bgDark, border, borderDark, backdrop },
    status: { error, success, warning },
  },
  shadows: { sm, md, lg, accent, accentHover },
  typography: { fontWeight: { medium, semibold, bold } },
  spacing: { xs, sm, md, lg, xl },
}
```

### Animation System (`client/src/lib/animations/exploreAnimations.ts`)
```typescript
// Page transitions
pageVariants = { initial, animate, exit }

// Stagger animations for lists
staggerContainerVariants
staggerItemVariants

// Button interactions
buttonVariants = { hover, tap }
```

---

## Performance Optimizations

1. **Video Preloading**: Next 2 videos preloaded via `useVideoPreload`
2. **Image Lazy Loading**: `useImagePreload` with intersection observer
3. **Virtualized Lists**: `VirtualizedFeed.tsx` for large datasets
4. **Redis Caching**: 5-minute TTL on feed queries
5. **Debounced Filters**: `useDebounce` for filter changes
6. **Skeleton Loading**: Immediate visual feedback

---

## Accessibility Features

1. **ARIA Labels**: All interactive elements labeled
2. **Keyboard Navigation**: `useKeyboardNavigation` hook
3. **Skip Links**: `SkipToContent.tsx` component
4. **Focus Management**: `useFocusManagement` hook
5. **Reduced Motion**: `useReducedMotion` hook
6. **Screen Reader Support**: Proper heading hierarchy

---

## Related Specifications

- `.kiro/specs/explore-discovery-engine/requirements.md` - Full requirements
- `.kiro/specs/explore-discovery-engine/design.md` - Technical design
- `.kiro/specs/explore-video-first-layout/` - Video-first layout spec
- `.kiro/specs/explore-frontend-refinement/` - UI refinement spec
- `.kiro/specs/explore-agency-content-attribution/` - Agency attribution spec

---

## Quick Reference Commands

```bash
# Run Explore tests
pnpm test -- --grep "explore"

# Check Explore components
pnpm lint client/src/components/explore-discovery/

# Run database migrations
pnpm tsx scripts/run-explore-discovery-migration.ts
```

---

## Contact

For questions about this feature, refer to:
- Requirements: `.kiro/specs/explore-discovery-engine/requirements.md`
- Implementation tasks: `.kiro/specs/explore-discovery-engine/tasks.md`
- Video-first layout: `.kiro/specs/explore-video-first-layout/tasks.md`

---

*Document generated: January 8, 2026*
*Version: 1.0*
