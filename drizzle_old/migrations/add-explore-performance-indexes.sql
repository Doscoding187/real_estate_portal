-- =====================================================
-- Explore Discovery Engine - Performance Indexes
-- Task 17.3: Optimize database queries
-- =====================================================

-- =====================================================
-- EXPLORE CONTENT INDEXES
-- =====================================================

-- Composite index for feed queries (content_type + is_active + engagement_score)
CREATE INDEX IF NOT EXISTS idx_explore_content_feed 
ON explore_content(content_type, is_active, engagement_score DESC);

-- Composite index for creator content queries
CREATE INDEX IF NOT EXISTS idx_explore_content_creator_active 
ON explore_content(creator_id, is_active, created_at DESC);

-- Index for featured content queries
CREATE INDEX IF NOT EXISTS idx_explore_content_featured 
ON explore_content(is_featured, is_active, engagement_score DESC);

-- Index for price range filtering
CREATE INDEX IF NOT EXISTS idx_explore_content_price_range 
ON explore_content(price_min, price_max, is_active);

-- Index for recent content (recency prioritization)
CREATE INDEX IF NOT EXISTS idx_explore_content_recent 
ON explore_content(created_at DESC, is_active, engagement_score DESC);

-- =====================================================
-- EXPLORE VIDEOS INDEXES
-- =====================================================

-- Composite index for video feed queries
CREATE INDEX IF NOT EXISTS idx_explore_videos_feed 
ON explore_discovery_videos(is_active, engagement_score DESC, created_at DESC);

-- Index for property-linked videos
CREATE INDEX IF NOT EXISTS idx_explore_videos_property 
ON explore_discovery_videos(property_id, is_active);

-- Index for development-linked videos
CREATE INDEX IF NOT EXISTS idx_explore_videos_development 
ON explore_discovery_videos(development_id, is_active);

-- Index for creator videos
CREATE INDEX IF NOT EXISTS idx_explore_videos_creator 
ON explore_discovery_videos(creator_id, is_active, created_at DESC);

-- Index for video analytics queries
CREATE INDEX IF NOT EXISTS idx_explore_videos_analytics 
ON explore_discovery_videos(total_views DESC, completion_rate DESC);

-- =====================================================
-- EXPLORE ENGAGEMENTS INDEXES
-- =====================================================

-- Composite index for user engagement history
CREATE INDEX IF NOT EXISTS idx_explore_engagements_user_history 
ON explore_engagements(user_id, created_at DESC);

-- Index for content engagement aggregation
CREATE INDEX IF NOT EXISTS idx_explore_engagements_content_type 
ON explore_engagements(content_id, engagement_type, created_at DESC);

-- Index for session-based queries
CREATE INDEX IF NOT EXISTS idx_explore_engagements_session 
ON explore_engagements(session_id, created_at);

-- =====================================================
-- EXPLORE USER PREFERENCES INDEXES
-- =====================================================

-- Index for user preference lookups (already has unique on user_id)
CREATE INDEX IF NOT EXISTS idx_explore_user_prefs_active 
ON explore_user_preferences_new(user_id, last_active DESC);

-- =====================================================
-- EXPLORE FEED SESSIONS INDEXES
-- =====================================================

-- Composite index for session analytics
CREATE INDEX IF NOT EXISTS idx_explore_sessions_analytics 
ON explore_feed_sessions(user_id, session_start DESC);

-- Index for active sessions
CREATE INDEX IF NOT EXISTS idx_explore_sessions_active 
ON explore_feed_sessions(session_end, session_start DESC);

-- =====================================================
-- EXPLORE BOOST CAMPAIGNS INDEXES
-- =====================================================

-- Composite index for active campaign queries
CREATE INDEX IF NOT EXISTS idx_explore_boost_active 
ON explore_boost_campaigns(status, start_date, end_date);

-- Index for creator campaign management
CREATE INDEX IF NOT EXISTS idx_explore_boost_creator 
ON explore_boost_campaigns(creator_id, status, created_at DESC);

-- Index for content boost lookups
CREATE INDEX IF NOT EXISTS idx_explore_boost_content 
ON explore_boost_campaigns(content_id, status);

-- =====================================================
-- EXPLORE SAVED PROPERTIES INDEXES
-- =====================================================

-- Composite index for user saved items
CREATE INDEX IF NOT EXISTS idx_explore_saved_user 
ON explore_saved_properties(user_id, saved_at DESC);

-- Index for property save counts
CREATE INDEX IF NOT EXISTS idx_explore_saved_property 
ON explore_saved_properties(property_id, saved_at DESC);

-- =====================================================
-- EXPLORE FOLLOWS INDEXES
-- =====================================================

-- Index for neighbourhood followers
CREATE INDEX IF NOT EXISTS idx_explore_neighbourhood_follows_user 
ON explore_neighbourhood_follows(user_id, followed_at DESC);

-- Index for creator followers
CREATE INDEX IF NOT EXISTS idx_explore_creator_follows_user 
ON explore_creator_follows(user_id, followed_at DESC);

-- Index for follower counts
CREATE INDEX IF NOT EXISTS idx_explore_creator_follows_creator 
ON explore_creator_follows(creator_id, followed_at DESC);

-- =====================================================
-- EXPLORE NEIGHBOURHOODS INDEXES
-- =====================================================

-- Index for neighbourhood listings
CREATE INDEX IF NOT EXISTS idx_explore_neighbourhoods_active 
ON explore_neighbourhoods(is_active, follower_count DESC);

-- Index for location-based queries (if lat/lng columns exist)
-- Note: TiDB doesn't support spatial indexes like PostGIS
-- Using composite index on lat/lng for bounding box queries
CREATE INDEX IF NOT EXISTS idx_explore_neighbourhoods_location 
ON explore_neighbourhoods(location_lat, location_lng);

-- =====================================================
-- EXPLORE CATEGORIES INDEXES
-- =====================================================

-- Index for category display order
CREATE INDEX IF NOT EXISTS idx_explore_categories_order 
ON explore_categories(is_active, display_order);

-- =====================================================
-- PROPERTIES TABLE INDEXES (for Explore queries)
-- =====================================================

-- Composite index for property feed queries
CREATE INDEX IF NOT EXISTS idx_properties_explore_feed 
ON properties(status, suburb_id, price DESC, created_at DESC);

-- Index for property type filtering
CREATE INDEX IF NOT EXISTS idx_properties_type_status 
ON properties(property_type, status, created_at DESC);

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_properties_price_range 
ON properties(price, status);

-- Index for location-based property queries
CREATE INDEX IF NOT EXISTS idx_properties_location 
ON properties(suburb_id, status, price);

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this to verify indexes were created:
-- SHOW INDEX FROM explore_content;
-- SHOW INDEX FROM explore_discovery_videos;
-- SHOW INDEX FROM explore_engagements;
-- SHOW INDEX FROM properties;
