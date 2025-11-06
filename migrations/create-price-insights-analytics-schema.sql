-- Phase 10: Property Price Insights & Analytics Engine
-- Database Schema for Price Tracking and User Analytics

-- Price History Tracking Table
-- Tracks property price changes over time for trend analysis
CREATE TABLE IF NOT EXISTS price_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    suburb_id INT,
    city_id INT,
    province_id INT,
    price DECIMAL(12, 2) NOT NULL,
    price_per_sqm DECIMAL(10, 2),
    property_type ENUM('apartment', 'house', 'villa', 'plot', 'commercial', 'townhouse', 'cluster_home', 'farm', 'shared_living') NOT NULL,
    listing_type ENUM('sale', 'rent', 'rent_to_buy', 'auction', 'shared_living') NOT NULL,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    source ENUM('new_listing', 'price_change', 'sold', 'rented', 'market_update') DEFAULT 'market_update',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    INDEX idx_property_price (property_id, price),
    INDEX idx_suburb_price (suburb_id, price, recorded_at),
    INDEX idx_city_price (city_id, price, recorded_at),
    INDEX idx_province_price (province_id, price, recorded_at),
    INDEX idx_price_trend (property_type, listing_type, recorded_at),
    INDEX idx_price_source (source, recorded_at)
);

-- Suburb Price Analytics
-- Aggregated price data per suburb for quick analytics queries
CREATE TABLE IF NOT EXISTS suburb_price_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    suburb_id INT NOT NULL,
    city_id INT NOT NULL,
    province_id INT NOT NULL,
    
    -- Current Month Statistics
    current_avg_price DECIMAL(12, 2),
    current_median_price DECIMAL(12, 2),
    current_min_price DECIMAL(12, 2),
    current_max_price DECIMAL(12, 2),
    current_price_count INT DEFAULT 0,
    
    -- Last Month Comparison
    last_month_avg_price DECIMAL(12, 2),
    last_month_median_price DECIMAL(12, 2),
    last_month_price_count INT DEFAULT 0,
    
    -- Growth Metrics (Last 6 months)
    six_month_growth_percent DECIMAL(5, 2),
    three_month_growth_percent DECIMAL(5, 2),
    one_month_growth_percent DECIMAL(5, 2),
    
    -- Price Trends
    trending_direction ENUM('up', 'down', 'stable') DEFAULT 'stable',
    trend_confidence DECIMAL(3, 2) DEFAULT 0.00, -- 0.00 to 1.00
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (suburb_id) REFERENCES suburbs(id) ON DELETE CASCADE,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
    INDEX idx_suburb_analytics (suburb_id),
    INDEX idx_city_analytics (city_id),
    INDEX idx_province_analytics (province_id),
    INDEX idx_growth_trends (six_month_growth_percent, three_month_growth_percent),
    INDEX idx_price_direction (trending_direction, trend_confidence)
);

-- City Price Analytics  
-- Aggregated price data per city
CREATE TABLE IF NOT EXISTS city_price_analytics (
    id INT AUTO_INCREMENT PRIMARY KEY,
    city_id INT NOT NULL,
    province_id INT NOT NULL,
    
    -- Current Statistics
    current_avg_price DECIMAL(12, 2),
    current_median_price DECIMAL(12, 2),
    current_min_price DECIMAL(12, 2),
    current_max_price DECIMAL(12, 2),
    current_price_count INT DEFAULT 0,
    
    -- Growth Metrics
    six_month_growth_percent DECIMAL(5, 2),
    three_month_growth_percent DECIMAL(5, 2),
    one_month_growth_percent DECIMAL(5, 2),
    
    -- Popular Metrics
    total_properties INT DEFAULT 0,
    active_listings INT DEFAULT 0,
    average_days_on_market INT DEFAULT 0,
    
    -- Price Distribution
    luxury_segment_percent DECIMAL(5, 2) DEFAULT 0.00, -- Properties > R2M
    mid_range_percent DECIMAL(5, 2) DEFAULT 0.00,     -- Properties R800K-R2M
    affordable_percent DECIMAL(5, 2) DEFAULT 0.00,    -- Properties < R800K
    
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
    INDEX idx_city_price_analytics (city_id),
    INDEX idx_province_price_analytics (province_id),
    INDEX idx_growth_city (six_month_growth_percent, three_month_growth_percent)
);

-- User Behavior Tracking
-- Track user interactions for personalized recommendations
CREATE TABLE IF NOT EXISTS user_behavior_events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT, -- NULL for anonymous users
    session_id VARCHAR(255) NOT NULL,
    
    -- Event Details
    event_type ENUM('property_view', 'search', 'save_property', 'contact_agent', 'map_interaction', 'price_filter', 'location_filter', 'property_type_filter') NOT NULL,
    event_data JSON, -- Flexible data storage for event-specific information
    
    -- Context
    property_id INT,
    suburb_id INT,
    city_id INT,
    province_id INT,
    price_range_min DECIMAL(12, 2),
    price_range_max DECIMAL(12, 2),
    property_type ENUM('apartment', 'house', 'villa', 'plot', 'commercial', 'townhouse', 'cluster_home', 'farm', 'shared_living'),
    listing_type ENUM('sale', 'rent', 'rent_to_buy', 'auction', 'shared_living'),
    
    -- Tracking
    page_url VARCHAR(500),
    referrer VARCHAR(500),
    user_agent TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE SET NULL,
    FOREIGN KEY (suburb_id) REFERENCES suburbs(id) ON DELETE SET NULL,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE SET NULL,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE SET NULL,
    INDEX idx_user_events (user_id, event_type, created_at),
    INDEX idx_session_events (session_id, event_type, created_at),
    INDEX idx_property_events (property_id, event_type, created_at),
    INDEX idx_location_events (suburb_id, city_id, province_id, created_at)
);

-- User Preferences & Recommendations
-- Store user preferences and AI-generated recommendations
CREATE TABLE IF NOT EXISTS user_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    
    -- User Preferences
    preferred_suburbs JSON, -- Array of suburb IDs with preference scores
    preferred_cities JSON, -- Array of city IDs with preference scores
    preferred_price_range JSON, -- {min: number, max: number}
    preferred_property_types JSON, -- Array of property types
    preferred_listing_types JSON, -- Array of listing types
    
    -- AI Recommendations
    recommended_suburbs JSON, -- Array of recommended suburbs with reasons
    recommended_properties JSON, -- Array of recommended properties with scores
    recommended_similar_users JSON, -- Array of similar user IDs
    
    -- Engagement Metrics
    recommendation_click_count INT DEFAULT 0,
    recommendation_conversion_count INT DEFAULT 0,
    last_recommendation_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_preferences (user_id),
    INDEX idx_recommendation_engagement (recommendation_click_count, recommendation_conversion_count)
);

-- Market Insights Cache
-- Pre-calculated insights for fast homepage loading
CREATE TABLE IF NOT EXISTS market_insights_cache (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_data JSON NOT NULL,
    cache_type ENUM('suburb_heatmap', 'city_trends', 'popular_areas', 'price_predictions', 'user_recommendations') NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_cache_key (cache_key),
    INDEX idx_cache_type (cache_type),
    INDEX idx_cache_expiry (expires_at)
);

-- Price Prediction Models
-- Store AI model predictions for property prices
CREATE TABLE IF NOT EXISTS price_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT,
    suburb_id INT,
    city_id INT,
    province_id INT,
    
    -- Prediction Details
    predicted_price DECIMAL(12, 2) NOT NULL,
    predicted_price_range_min DECIMAL(12, 2),
    predicted_price_range_max DECIMAL(12, 2),
    confidence_score DECIMAL(3, 2) DEFAULT 0.00, -- 0.00 to 1.00
    
    -- Model Information
    model_version VARCHAR(50),
    model_features JSON, -- Features used for prediction
    training_data_size INT,
    
    -- Validation
    actual_price DECIMAL(12, 2), -- When property is sold/rented
    prediction_error DECIMAL(8, 2), -- Absolute error
    prediction_accuracy DECIMAL(3, 2), -- Percentage accuracy
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    validated_at TIMESTAMP NULL,
    
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (suburb_id) REFERENCES suburbs(id) ON DELETE CASCADE,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
    INDEX idx_property_predictions (property_id),
    INDEX idx_suburb_predictions (suburb_id, city_id, province_id),
    INDEX idx_model_performance (model_version, confidence_score, prediction_accuracy)
);

-- Property Similarity Index
-- Pre-calculated similarity scores for recommendations
CREATE TABLE IF NOT EXISTS property_similarity_index (
    id INT AUTO_INCREMENT PRIMARY KEY,
    property_id_1 INT NOT NULL,
    property_id_2 INT NOT NULL,
    
    -- Similarity Metrics
    location_similarity DECIMAL(3, 2) DEFAULT 0.00, -- Distance-based similarity
    price_similarity DECIMAL(3, 2) DEFAULT 0.00,    -- Price range similarity
    type_similarity DECIMAL(3, 2) DEFAULT 0.00,     -- Property type similarity
    feature_similarity DECIMAL(3, 2) DEFAULT 0.00,  -- Amenities, size, etc.
    overall_similarity DECIMAL(3, 2) DEFAULT 0.00,  -- Weighted average
    
    -- Context
    similarity_reason JSON, -- Reasons for high similarity
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (property_id_1) REFERENCES properties(id) ON DELETE CASCADE,
    FOREIGN KEY (property_id_2) REFERENCES properties(id) ON DELETE CASCADE,
    UNIQUE KEY unique_pair (property_id_1, property_id_2),
    INDEX idx_similarity_score (overall_similarity, location_similarity, price_similarity),
    INDEX idx_property1_similarities (property_id_1, overall_similarity),
    INDEX idx_property2_similarities (property_id_2, overall_similarity)
);

-- Analytics Aggregations (Daily/Monthly)
-- Pre-calculated daily and monthly analytics
CREATE TABLE IF NOT EXISTS analytics_aggregations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    aggregation_type ENUM('daily', 'weekly', 'monthly') NOT NULL,
    aggregation_date DATE NOT NULL,
    
    -- Geographic Aggregations
    suburb_id INT,
    city_id INT,
    province_id INT,
    
    -- Property Type Aggregations
    property_type ENUM('apartment', 'house', 'villa', 'plot', 'commercial', 'townhouse', 'cluster_home', 'farm', 'shared_living'),
    listing_type ENUM('sale', 'rent', 'rent_to_buy', 'auction', 'shared_living'),
    
    -- Metrics
    total_properties INT DEFAULT 0,
    active_listings INT DEFAULT 0,
    avg_price DECIMAL(12, 2),
    median_price DECIMAL(12, 2),
    min_price DECIMAL(12, 2),
    max_price DECIMAL(12, 2),
    price_per_sqm_avg DECIMAL(10, 2),
    
    -- User Activity
    total_views INT DEFAULT 0,
    total_saves INT DEFAULT 0,
    total_contacts INT DEFAULT 0,
    unique_visitors INT DEFAULT 0,
    
    -- Market Velocity
    new_listings INT DEFAULT 0,
    sold_properties INT DEFAULT 0,
    rented_properties INT DEFAULT 0,
    avg_days_on_market DECIMAL(8, 2),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (suburb_id) REFERENCES suburbs(id) ON DELETE CASCADE,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE CASCADE,
    FOREIGN KEY (province_id) REFERENCES provinces(id) ON DELETE CASCADE,
    INDEX idx_aggregation (aggregation_type, aggregation_date),
    INDEX idx_suburb_aggregation (aggregation_type, aggregation_date, suburb_id),
    INDEX idx_city_aggregation (aggregation_type, aggregation_date, city_id),
    INDEX idx_property_type_aggregation (aggregation_type, aggregation_date, property_type, listing_type)
);

-- Add indexes for performance optimization
CREATE INDEX idx_price_history_composite ON price_history (suburb_id, property_type, listing_type, recorded_at);
CREATE INDEX idx_user_behavior_recent ON user_behavior_events (created_at DESC, event_type);
CREATE INDEX idx_property_similarity_recent ON property_similarity_index (overall_similarity DESC, created_at DESC);

-- Create views for common analytics queries
CREATE OR REPLACE VIEW suburb_price_trends AS
SELECT 
    p.suburb_id,
    s.name as suburb_name,
    c.name as city_name,
    p.property_type,
    p.listing_type,
    DATE(p.recorded_at) as price_date,
    AVG(p.price) as avg_price,
    COUNT(*) as property_count,
    MIN(p.price) as min_price,
    MAX(p.price) as max_price
FROM price_history p
JOIN suburbs s ON p.suburb_id = s.id
JOIN cities c ON s.city_id = c.id
WHERE p.recorded_at >= DATE_SUB(CURRENT_DATE, INTERVAL 12 MONTH)
GROUP BY p.suburb_id, p.property_type, p.listing_type, DATE(p.recorded_at);

CREATE OR REPLACE VIEW popular_areas AS
SELECT 
    s.id as suburb_id,
    s.name as suburb_name,
    c.name as city_name,
    p.province,
    COUNT(DISTINCT p.id) as total_properties,
    AVG(p.price) as avg_price,
    COUNT(ube.id) as user_interactions,
    CASE 
        WHEN AVG(p.price) > 2000000 THEN 'Luxury'
        WHEN AVG(p.price) > 800000 THEN 'Mid-Range'
        ELSE 'Affordable'
    END as price_segment
FROM properties p
JOIN suburbs s ON p.suburbId = s.id
JOIN cities c ON s.city_id = c.id
LEFT JOIN user_behavior_events ube ON ube.suburb_id = s.id
WHERE p.status = 'published'
GROUP BY s.id, s.name, c.name, p.province
ORDER BY user_interactions DESC, total_properties DESC;