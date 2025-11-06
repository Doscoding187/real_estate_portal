-- Advanced Location Intelligence: PostGIS Integration & Enhanced Features
-- This migration adds PostGIS support and advanced geospatial capabilities

-- Enable PostGIS extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geometry columns to existing tables for PostGIS support
ALTER TABLE provinces ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
ALTER TABLE cities ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);

-- Create spatial indexes for performance
CREATE INDEX IF NOT EXISTS idx_provinces_geom ON provinces USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_cities_geom ON cities USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_suburbs_geom ON suburbs USING GIST (geom);
CREATE INDEX IF NOT EXISTS idx_properties_geom ON properties USING GIST (geom);

-- Populate geometry columns from existing coordinates
UPDATE provinces SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) 
WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

UPDATE cities SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) 
WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

UPDATE suburbs SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) 
WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

UPDATE properties SET geom = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326) 
WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

-- Create nearby amenities table for POI integration
CREATE TABLE IF NOT EXISTS nearby_amenities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    type ENUM('school', 'hospital', 'shopping', 'restaurant', 'transport', 'bank', 'park', 'university', 'government') NOT NULL,
    address TEXT,
    geom geometry(Point, 4326) NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
    isVerified TINYINT(1) DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_amenities_type (type),
    INDEX idx_amenities_geom (geom)
);

-- Create spatial index for amenities
CREATE INDEX IF NOT EXISTS idx_nearby_amenities_geom ON nearby_amenities USING GIST (geom);

-- Add geocoding cache for address-to-coordinates conversion
CREATE TABLE IF NOT EXISTS geocoding_cache (
    id INT PRIMARY KEY AUTO_INCREMENT,
    address TEXT NOT NULL,
    formatted_address TEXT,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    place_id VARCHAR(255),
    source ENUM('google', 'nominatim', 'manual') DEFAULT 'google',
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiresAt TIMESTAMP NOT NULL,
    UNIQUE KEY unique_address (address),
    INDEX idx_geocoding_expires (expiresAt)
);

-- Add saved searches for users
CREATE TABLE IF NOT EXISTS saved_searches (
    id INT PRIMARY KEY AUTO_INCREMENT,
    userId INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    search_params JSON NOT NULL,
    notificationEnabled TINYINT(1) DEFAULT 1,
    lastNotified TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_saved_searches_user (userId),
    INDEX idx_saved_searches_enabled (notificationEnabled)
);

-- Create view for enhanced property search with location context
CREATE OR REPLACE VIEW property_search_view AS
SELECT 
    p.*,
    p.geom as property_geom,
    sp.name as suburb_name,
    sc.name as city_name,
    sp.postal_code,
    -- Calculate distance to major cities
    ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(28.0473, -26.2041), 4326)) as distance_jhb_km,
    ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(18.4241, -33.9249), 4326)) as distance_ct_km,
    ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(30.5598, -29.8587), 4326)) as distance_db_km,
    ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(28.2293, -25.7479), 4326)) as distance_pta_km,
    -- Count nearby amenities within 1km
    (SELECT COUNT(*) FROM nearby_amenities a 
     WHERE ST_DWithin(a.geom, p.geom, 1000) AND a.type = 'school') as schools_1km,
    (SELECT COUNT(*) FROM nearby_amenities a 
     WHERE ST_DWithin(a.geom, p.geom, 1000) AND a.type = 'hospital') as hospitals_1km,
    (SELECT COUNT(*) FROM nearby_amenities a 
     WHERE ST_DWithin(a.geom, p.geom, 500) AND a.type = 'transport') as transport_500m,
    (SELECT COUNT(*) FROM nearby_amenities a 
     WHERE ST_DWithin(a.geom, p.geom, 1000) AND a.type = 'shopping') as shopping_1km
FROM properties p
LEFT JOIN suburbs sp ON p.suburbId = sp.id
LEFT JOIN cities sc ON p.cityId = sc.id
WHERE p.status = 'published' AND p.latitude IS NOT NULL AND p.longitude IS NOT NULL;

-- Sample amenities data for testing (Johannesburg area)
INSERT INTO nearby_amenities (name, type, address, latitude, longitude, geom) VALUES
('Sandton City', 'shopping', 'Rivonia Rd, Sandhurst, Sandton, 2196', -26.1076, 28.0567, ST_SetSRID(ST_MakePoint(28.0567, -26.1076), 4326)),
('Rosebank Mall', 'shopping', 'Oxford Rd, Rosebank, Johannesburg, 2196', -26.1534, 28.0433, ST_SetSRID(ST_MakePoint(28.0433, -26.1534), 4326)),
('Monte Casino', 'shopping', '1 Monte Casino Blvd, Fourways, Sandton, 2191', -26.0140, 28.0111, ST_SetSRID(ST_MakePoint(28.0111, -26.0140), 4326)),
('St. Johns College', 'school', 'St. Andrews Rd, Bedfordview, Johannesburg, 2008', -26.1698, 28.1237, ST_SetSRID(ST_MakePoint(28.1237, -26.1698), 4326)),
('Ramelan High School', 'school', 'Hendrik Verwoerd Dr, Randburg, 2194', -26.0941, 27.9328, ST_SetSRID(ST_MakePoint(27.9328, -26.0941), 4326)),
('Johannesburg General Hospital', 'hospital', ' Jubilee Rd, Parktown, Johannesburg, 2193', -26.1823, 28.0433, ST_SetSRID(ST_MakePoint(28.0433, -26.1823), 4326)),
('Sunninghill Hospital', 'hospital', 'Nanyuki Rd, Sunninghill, Sandton, 2157', -26.0615, 28.0714, ST_SetSRID(ST_MakePoint(28.0714, -26.0615), 4326)),
('OR Tambo Airport', 'transport', 'O.R. Tambo International Airport, Johannesburg, 1627', -26.1392, 28.2467, ST_SetSRID(ST_MakePoint(28.2467, -26.1392), 4326)),
('Sandton Gautrain Station', 'transport', 'Rivonia Rd, Sandhurst, Sandton, 2196', -26.1076, 28.0567, ST_SetSRID(ST_MakePoint(28.0567, -26.1076), 4326)),
('Nedbank Sandton', 'bank', '135 Rivonia Rd, Sandhurst, Sandton, 2196', -26.1076, 28.0567, ST_SetSRID(ST_MakePoint(28.0567, -26.1076), 4326)),
('Hyde Park Shopping Centre', 'shopping', '1 Jan Smuts Ave, Hyde Park, Johannesburg, 2192', -26.1595, 28.0527, ST_SetSRID(ST_MakePoint(28.0527, -26.1595), 4326)),
('Morningside Clinic', 'hospital', 'Corner of Bowling Ave & Rivonia Rd, Sandton, 2196', -26.1076, 28.0567, ST_SetSRID(ST_MakePoint(28.0567, -26.1076), 4326))
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Performance indexes for saved searches and caching
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_notified ON saved_searches(lastNotified) WHERE lastNotified IS NULL;

-- Function to get nearby properties using PostGIS
DELIMITER //
CREATE FUNCTION GetNearbyProperties(
    p_lat DECIMAL(10, 8),
    p_lng DECIMAL(11, 8),
    p_radius_meters INT,
    p_limit INT
) RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE result_json JSON;
    
    SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'id', p.id,
            'title', p.title,
            'price', p.price,
            'propertyType', p.propertyType,
            'listingType', p.listingType,
            'latitude', p.latitude,
            'longitude', p.longitude,
            'distance_meters', ROUND(ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326))),
            'distance_km', ROUND(ST_Distance(p.geom, ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)) / 1000, 2)
        )
    ) INTO result_json
    FROM properties p
    WHERE p.status = 'published'
    AND p.latitude IS NOT NULL 
    AND p.longitude IS NOT NULL
    AND ST_DWithin(
        p.geom, 
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326), 
        p_radius_meters
    )
    ORDER BY ST_Distance(
        p.geom, 
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)
    )
    LIMIT p_limit;
    
    RETURN COALESCE(result_json, JSON_ARRAY());
END//
DELIMITER ;

-- Grant necessary permissions (adjust as needed for your setup)
-- Note: These are examples and may need to be adjusted for your MySQL setup
-- GRANT SELECT, INSERT, UPDATE ON nearby_amenities TO 'real_estate_app'@'%';
-- GRANT SELECT, INSERT, UPDATE ON geocoding_cache TO 'real_estate_app'@'%';
-- GRANT SELECT, INSERT, UPDATE ON saved_searches TO 'real_estate_app'@'%';

COMMIT;