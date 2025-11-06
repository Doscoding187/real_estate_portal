-- Phase 10: Database Schema Optimization (Agent 2)
-- Consolidate 11 tables to 7 for better performance and maintainability
-- 
-- OLD STRUCTURE (11 tables):
-- 1. price_history (KEEP)
-- 2. suburb_price_analytics (MERGE)
-- 3. city_price_analytics (MERGE INTO price_analytics)  
-- 4. user_behavior_events (KEEP)
-- 5. user_recommendations (KEEP)
-- 6. market_insights_cache (REMOVE - Use Redis)
-- 7. price_predictions (KEEP)
-- 8. property_similarity_index (KEEP)
-- 9. analytics_aggregations (REMOVE - Over-engineered)
-- 10. properties (EXISTING - Reference table)
-- 11. suburbs, cities, provinces (EXISTING - Reference tables)
--
-- NEW STRUCTURE (7 tables):
-- 1. price_history (KEEP)
-- 2. price_analytics (MERGE suburb + city)
-- 3. user_behavior_events (KEEP)
-- 4. user_recommendations (KEEP)
-- 5. price_predictions (KEEP)
-- 6. property_similarity_index (KEEP)
-- 7. user_preferences (NEW - Enhanced recommendations)

-- First, backup existing data before migration
CREATE TABLE IF NOT EXISTS price_analytics_backup AS SELECT * FROM suburb_price_analytics;
CREATE TABLE IF NOT EXISTS city_price_analytics_backup AS SELECT * FROM city_price_analytics;
CREATE TABLE IF NOT EXISTS market_insights_cache_backup AS SELECT * FROM market_insights_cache;
CREATE TABLE IF NOT EXISTS analytics_aggregations_backup AS SELECT * FROM analytics_aggregations;

-- Drop old analytics tables that will be merged
DROP TABLE IF EXISTS city_price_analytics;
DROP TABLE IF EXISTS market_insights_cache;
DROP TABLE IF EXISTS analytics_aggregations;

-- Create consolidated price_analytics table (replaces suburb + city analytics)
CREATE TABLE IF NOT EXISTS price_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    location_id INT NOT NULL,
    location_type ENUM('suburb', 'city', 'province') NOT NULL,
    
    -- Current Statistics
    current_avg_price DECIMAL(12, 2),
    current_median_price DECIMAL(12, 2),
    current_min_price DECIMAL(12, 2),
    current_max_price DECIMAL(12, 2),
    current_price_count INT DEFAULT 0,
    
    -- Growth Metrics
    one_month_growth_percent DECIMAL(5, 2),
    three_month_growth_percent DECIMAL(5, 2),
    six_month_growth_percent DECIMAL(5, 2),
    one_year_growth_percent DECIMAL(5, 2),
    
    -- Price Distribution
    luxury_segment_percent DECIMAL(5, 2) DEFAULT 0.00, -- Properties > R2M
    mid_range_percent DECIMAL(5, 2) DEFAULT 0.00,     -- Properties R800K-R2M
    affordable_percent DECIMAL(5, 2) DEFAULT 0.00,    -- Properties < R800K
    
    -- Market Velocity
    avg_days_on_market INT DEFAULT 0,
    new_listings_monthly INT DEFAULT 0,
    sold_properties_monthly INT DEFAULT 0,
    
    -- Price Trends
    trending_direction ENUM('up', 'down', 'stable') DEFAULT 'stable',
    trend_confidence DECIMAL(3, 2) DEFAULT 0.00, -- 0.00 to 1.00
    
    -- Popular Metrics
    total_properties INT DEFAULT 0,
    active_listings INT DEFAULT 0,
    user_interactions INT DEFAULT 0,
    
    -- Timestamp
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Optimized indexes
    INDEX idx_location (location_type, location_id),
    INDEX idx_growth_trends (six_month_growth_percent, three_month_growth_percent),
    INDEX idx_price_direction (trending_direction, trend_confidence),
    INDEX idx_analytics_updated (last_updated),
    
    -- Ensure no duplicates
    UNIQUE KEY unique_location (location_type, location_id)
);

-- Migrate data from suburb_price_analytics to new price_analytics
INSERT INTO price_analytics (
    location_id,
    location_type,
    current_avg_price,
    current_median_price,
    current_min_price,
    current_max_price,
    current_price_count,
    one_month_growth_percent,
    three_month_growth_percent,
    six_month_growth_percent,
    trending_direction,
    trend_confidence,
    last_updated
)
SELECT 
    suburb_id as location_id,
    'suburb' as location_type,
    current_avg_price,
    current_median_price,
    current_min_price,
    current_max_price,
    current_price_count,
    one_month_growth_percent,
    three_month_growth_percent,
    six_month_growth_percent,
    trending_direction,
    trend_confidence,
    last_updated
FROM suburb_price_analytics
ON DUPLICATE KEY UPDATE
    current_avg_price = VALUES(current_avg_price),
    current_median_price = VALUES(current_median_price),
    current_min_price = VALUES(current_min_price),
    current_max_price = VALUES(current_max_price),
    current_price_count = VALUES(current_price_count),
    one_month_growth_percent = VALUES(one_month_growth_percent),
    three_month_growth_percent = VALUES(three_month_growth_percent),
    six_month_growth_percent = VALUES(six_month_growth_percent),
    trending_direction = VALUES(trending_direction),
    trend_confidence = VALUES(trend_confidence),
    last_updated = VALUES(last_updated);

-- Migrate data from city_price_analytics to new price_analytics
INSERT INTO price_analytics (
    location_id,
    location_type,
    current_avg_price,
    current_median_price,
    current_min_price,
    current_max_price,
    current_price_count,
    one_month_growth_percent,
    three_month_growth_percent,
    six_month_growth_percent,
    total_properties,
    active_listings,
    average_days_on_market,
    luxury_segment_percent,
    mid_range_percent,
    affordable_percent,
    trending_direction,
    trend_confidence,
    last_updated
)
SELECT 
    city_id as location_id,
    'city' as location_type,
    current_avg_price,
    current_median_price,
    current_min_price,
    current_max_price,
    current_price_count,
    one_month_growth_percent,
    three_month_growth_percent,
    six_month_growth_percent,
    total_properties,
    active_listings,
    average_days_on_market,
    luxury_segment_percent,
    mid_range_percent,
    affordable_percent,
    CASE 
        WHEN six_month_growth_percent > 3 THEN 'up'
        WHEN six_month_growth_percent < -3 THEN 'down'
        ELSE 'stable'
    END as trending_direction,
    LEAST(ABS(six_month_growth_percent) / 10, 1.0) as trend_confidence, -- Simple confidence calc
    last_updated
FROM city_price_analytics_backup
ON DUPLICATE KEY UPDATE
    current_avg_price = VALUES(current_avg_price),
    current_median_price = VALUES(current_median_price),
    current_min_price = VALUES(current_min_price),
    current_max_price = VALUES(current_max_price),
    current_price_count = VALUES(current_price_count),
    one_month_growth_percent = VALUES(one_month_growth_percent),
    three_month_growth_percent = VALUES(three_month_growth_percent),
    six_month_growth_percent = VALUES(six_month_growth_percent),
    total_properties = VALUES(total_properties),
    active_listings = VALUES(active_listings),
    average_days_on_market = VALUES(average_days_on_market),
    luxury_segment_percent = VALUES(luxury_segment_percent),
    mid_range_percent = VALUES(mid_range_percent),
    affordable_percent = VALUES(affordable_percent),
    trending_direction = VALUES(trending_direction),
    trend_confidence = VALUES(trend_confidence),
    last_updated = VALUES(last_updated);

-- Create enhanced user_preferences table (replaces parts of user_recommendations)
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- Location Preferences with weighted scores
    preferred_suburbs JSON, -- Array of {suburb_id: number, score: number}
    preferred_cities JSON, -- Array of {city_id: number, score: number}
    preferred_provinces JSON, -- Array of {province_id: number, score: number}
    
    -- Price Range Preferences
    preferred_price_range JSON, -- {min: number, max: number, confidence: number}
    
    -- Property Type Preferences
    preferred_property_types JSON, -- Array of {type: string, score: number}
    preferred_listing_types JSON, -- Array of {type: string, score: number}
    
    -- Budget and Lifestyle Preferences
    max_commute_time INT, -- Minutes
    min_bedrooms INT,
    max_bedrooms INT,
    min_bathrooms INT,
    max_bathrooms INT,
    min_area INT, -- Square meters
    max_area INT, -- Square meters
    
    -- Engagement Scores
    recommendation_click_count INT DEFAULT 0,
    recommendation_conversion_count INT DEFAULT 0,
    last_interaction_at TIMESTAMP NULL,
    preference_confidence DECIMAL(3, 2) DEFAULT 0.00, -- 0.00 to 1.00
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_preferences (user_id),
    INDEX idx_preference_confidence (preference_confidence),
    INDEX idx_last_interaction (last_interaction_at),
    
    UNIQUE KEY unique_user (user_id)
);

-- Update user_recommendations to reference user_preferences
ALTER TABLE user_recommendations 
DROP COLUMN IF EXISTS preferred_suburbs,
DROP COLUMN IF EXISTS preferred_cities, 
DROP COLUMN IF EXISTS preferred_price_range,
DROP COLUMN IF EXISTS preferred_property_types,
DROP COLUMN IF EXISTS preferred_listing_types;

-- Add reference to user_preferences
ALTER TABLE user_recommendations 
ADD COLUMN user_preferences_id INT,
ADD FOREIGN KEY (user_preferences_id) REFERENCES user_preferences(id) ON DELETE SET NULL;

-- Optimize user_behavior_events table
ALTER TABLE user_behavior_events
DROP INDEX IF EXISTS idx_user_events,
DROP INDEX IF EXISTS idx_session_events,
DROP INDEX IF EXISTS idx_property_events,
DROP INDEX IF EXISTS idx_location_events;

-- Create optimized indexes for common query patterns
CREATE INDEX idx_user_behavior_optimized 
ON user_behavior_events (user_id, event_type, created_at DESC);

CREATE INDEX idx_session_behavior_optimized 
ON user_behavior_events (session_id, event_type, created_at DESC);

CREATE INDEX idx_location_behavior_optimized 
ON user_behavior_events (suburb_id, city_id, province_id, created_at DESC);

CREATE INDEX idx_property_interactions 
ON user_behavior_events (property_id, event_type, created_at DESC);

-- Create views for common analytics queries (replacing complex aggregations)
CREATE OR REPLACE VIEW location_price_trends AS
SELECT 
    pa.location_id,
    pa.location_type,
    CASE 
        WHEN pa.location_type = 'suburb' THEN s.name
        WHEN pa.location_type = 'city' THEN c.name
        WHEN pa.location_type = 'province' THEN p.province
    END as location_name,
    CASE 
        WHEN pa.location_type = 'suburb' THEN c.name
        WHEN pa.location_type = 'city' THEN p.province
        WHEN pa.location_type = 'province' THEN 'National'
    END as parent_location,
    pa.current_avg_price,
    pa.six_month_growth_percent,
    pa.trending_direction,
    pa.trend_confidence,
    pa.total_properties,
    pa.user_interactions,
    pa.last_updated
FROM price_analytics pa
LEFT JOIN suburbs s ON pa.location_type = 'suburb' AND pa.location_id = s.id
LEFT JOIN cities c ON pa.location_type = 'city' AND pa.location_id = c.id
LEFT JOIN provinces p ON (pa.location_type = 'province' AND pa.location_id = p.id) 
    OR (pa.location_type = 'city' AND c.province_id = p.id)
    OR (pa.location_type = 'suburb' AND s.city_id = c.id AND c.province_id = p.id);

CREATE OR REPLACE VIEW popular_locations AS
SELECT 
    location_id,
    location_type,
    location_name,
    parent_location,
    current_avg_price,
    six_month_growth_percent,
    trending_direction,
    total_properties,
    user_interactions,
    CASE 
        WHEN current_avg_price > 2000000 THEN 'Luxury'
        WHEN current_avg_price > 800000 THEN 'Mid-Range'
        ELSE 'Affordable'
    END as price_segment,
    (user_interactions * 1.0 / NULLIF(total_properties, 0)) as interaction_ratio
FROM location_price_trends
WHERE total_properties > 0
ORDER BY interaction_ratio DESC, user_interactions DESC
LIMIT 100;

CREATE OR REPLACE VIEW price_predictions_summary AS
SELECT 
    pp.property_id,
    p.title,
    p.propertyType,
    p.listingType,
    p.price as current_price,
    pp.predicted_price,
    pp.predicted_price_range_min,
    pp.predicted_price_range_max,
    pp.confidence_score,
    pp.model_version,
    pp.training_data_size,
    pp.created_at as prediction_date,
    CASE 
        WHEN pp.actual_price IS NOT NULL THEN 
            ABS(pp.predicted_price - pp.actual_price) / pp.actual_price * 100
        ELSE NULL
    END as prediction_error_percent
FROM price_predictions pp
LEFT JOIN properties p ON pp.property_id = p.id
ORDER BY pp.created_at DESC;

-- Add computed columns for better analytics
ALTER TABLE price_analytics 
ADD COLUMN IF NOT EXISTS price_volatility DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS market_momentum DECIMAL(5, 2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS investment_score DECIMAL(3, 2) DEFAULT 0.00;

-- Update price_analytics with computed values
UPDATE price_analytics SET 
    price_volatility = LEAST(ABS(six_month_growth_percent) * 2, 20.0),
    market_momentum = CASE 
        WHEN six_month_growth_percent > 5 THEN 1.0
        WHEN six_month_growth_percent > 2 THEN 0.7
        WHEN six_month_growth_percent > -2 THEN 0.5
        WHEN six_month_growth_percent > -5 THEN 0.3
        ELSE 0.1
    END,
    investment_score = LEAST(
        (trend_confidence * 0.4) + 
        (CASE WHEN trending_direction = 'up' THEN 0.4 ELSE 0.1 END) + 
        (LEAST(user_interactions / 100.0, 0.2)),
        1.0
    );

-- Create indexes for computed columns
CREATE INDEX idx_investment_score ON price_analytics (investment_score DESC);
CREATE INDEX idx_market_momentum ON price_analytics (market_momentum DESC);
CREATE INDEX idx_price_volatility ON price_analytics (price_volatility DESC);

-- Update schema version for tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version VARCHAR(20) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    description TEXT
);

INSERT INTO schema_version (version, description) 
VALUES ('10.2-optimized', 'Consolidated analytics tables from 11 to 7, optimized indexes, and enhanced queries')
ON DUPLICATE KEY UPDATE 
    applied_at = CURRENT_TIMESTAMP,
    description = VALUES(description);

-- Clean up: Remove old backup tables after successful migration
-- Uncomment these lines after confirming migration success:
-- DROP TABLE IF EXISTS price_analytics_backup;
-- DROP TABLE IF EXISTS city_price_analytics_backup;
-- DROP TABLE IF EXISTS market_insights_cache_backup;
-- DROP TABLE IF EXISTS analytics_aggregations_backup;

-- Final performance optimization: Analyze table statistics
ANALYZE TABLE price_analytics;
ANALYZE TABLE user_behavior_events;
ANALYZE TABLE user_preferences;
ANALYZE TABLE price_predictions;
ANALYZE TABLE property_similarity_index;

-- Show migration summary
SELECT 
    'price_analytics' as table_name,
    COUNT(*) as record_count
FROM price_analytics
UNION ALL
SELECT 
    'user_preferences' as table_name,
    COUNT(*) as record_count
FROM user_preferences
UNION ALL
SELECT 
    'schema_optimization' as table_name,
    COUNT(*) as record_count
FROM schema_version
WHERE version = '10.2-optimized';