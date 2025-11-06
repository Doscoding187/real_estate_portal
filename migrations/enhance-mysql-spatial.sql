-- Advanced Location Intelligence: MySQL Spatial Extensions & Enhanced Features
-- This migration enhances the existing MySQL-based system with advanced geospatial capabilities

-- Add geometry columns to existing tables using MySQL spatial extensions
ALTER TABLE provinces ADD COLUMN IF NOT EXISTS geom POINT SRID 4326;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS geom POINT SRID 4326;
ALTER TABLE suburbs ADD COLUMN IF NOT EXISTS geom POINT SRID 4326;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS geom POINT SRID 4326;

-- Create spatial indexes for performance
CREATE SPATIAL INDEX IF NOT EXISTS idx_provinces_geom ON provinces (geom);
CREATE SPATIAL INDEX IF NOT EXISTS idx_cities_geom ON cities (geom);
CREATE SPATIAL INDEX IF NOT EXISTS idx_suburbs_geom ON suburbs (geom);
CREATE SPATIAL INDEX IF NOT EXISTS idx_properties_geom ON properties (geom);

-- Populate geometry columns from existing coordinates
UPDATE provinces SET geom = ST_GeomFromText(CONCAT('POINT(', longitude, ' ', latitude, ')'), 4326) 
WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

UPDATE cities SET geom = ST_GeomFromText(CONCAT('POINT(', longitude, ' ', latitude, ')'), 4326) 
WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

UPDATE suburbs SET geom = ST_GeomFromText(CONCAT('POINT(', longitude, ' ', latitude, ')'), 4326) 
WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

UPDATE properties SET geom = ST_GeomFromText(CONCAT('POINT(', longitude, ' ', latitude, ')'), 4326) 
WHERE longitude IS NOT NULL AND latitude IS NOT NULL;

-- Create nearby amenities table for POI integration
CREATE TABLE IF NOT EXISTS nearby_amenities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    type ENUM('school', 'hospital', 'shopping', 'restaurant', 'transport', 'bank', 'park', 'university', 'government') NOT NULL,
    address TEXT,
    geom POINT SRID 4326 NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    rating DECIMAL(2, 1) CHECK (rating >= 0 AND rating <= 5),
    isVerified TINYINT(1) DEFAULT 1,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_amenities_type (type),
    INDEX idx_amenities_lat_lng (latitude, longitude)
);

-- Create spatial index for amenities
CREATE SPATIAL INDEX IF NOT EXISTS idx_nearby_amenities_geom ON nearby_amenities (geom);

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
    userId INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    search_params JSON NOT NULL,
    notificationEnabled TINYINT(1) DEFAULT 1,
    lastNotified TIMESTAMP NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_saved_searches_user (userId),
    INDEX idx_saved_searches_enabled (notificationEnabled)
);

-- Performance indexes for saved searches and caching
CREATE INDEX IF NOT EXISTS idx_saved_searches_last_notified ON saved_searches(lastNotified) WHERE lastNotified IS NULL;

-- Sample amenities data for testing (Johannesburg area)
INSERT INTO nearby_amenities (name, type, address, latitude, longitude, geom) VALUES
('Sandton City', 'shopping', 'Rivonia Rd, Sandhurst, Sandton, 2196', -26.1076, 28.0567, ST_GeomFromText('POINT(28.0567 -26.1076)', 4326)),
('Rosebank Mall', 'shopping', 'Oxford Rd, Rosebank, Johannesburg, 2196', -26.1534, 28.0433, ST_GeomFromText('POINT(28.0433 -26.1534)', 4326)),
('Monte Casino', 'shopping', '1 Monte Casino Blvd, Fourways, Sandton, 2191', -26.0140, 28.0111, ST_GeomFromText('POINT(28.0111 -26.0140)', 4326)),
('St. Johns College', 'school', 'St. Andrews Rd, Bedfordview, Johannesburg, 2008', -26.1698, 28.1237, ST_GeomFromText('POINT(28.1237 -26.1698)', 4326)),
('Ramelan High School', 'school', 'Hendrik Verwoerd Dr, Randburg, 2194', -26.0941, 27.9328, ST_GeomFromText('POINT(27.9328 -26.0941)', 4326)),
('Johannesburg General Hospital', 'hospital', 'Jubilee Rd, Parktown, Johannesburg, 2193', -26.1823, 28.0433, ST_GeomFromText('POINT(28.0433 -26.1823)', 4326)),
('Sunninghill Hospital', 'hospital', 'Nanyuki Rd, Sunninghill, Sandton, 2157', -26.0615, 28.0714, ST_GeomFromText('POINT(28.0714 -26.0615)', 4326)),
('OR Tambo Airport', 'transport', 'O.R. Tambo International Airport, Johannesburg, 1627', -26.1392, 28.2467, ST_GeomFromText('POINT(28.2467 -26.1392)', 4326)),
('Sandton Gautrain Station', 'transport', 'Rivonia Rd, Sandhurst, Sandton, 2196', -26.1076, 28.0567, ST_GeomFromText('POINT(28.0567 -26.1076)', 4326)),
('Nedbank Sandton', 'bank', '135 Rivonia Rd, Sandhurst, Sandton, 2196', -26.1076, 28.0567, ST_GeomFromText('POINT(28.0567 -26.1076)', 4326)),
('Hyde Park Shopping Centre', 'shopping', '1 Jan Smuts Ave, Hyde Park, Johannesburg, 2192', -26.1595, 28.0527, ST_GeomFromText('POINT(28.0527 -26.1595)', 4326)),
('Morningside Clinic', 'hospital', 'Corner of Bowling Ave & Rivonia Rd, Sandton, 2196', -26.1076, 28.0567, ST_GeomFromText('POINT(28.0567 -26.1076)', 4326))
ON DUPLICATE KEY UPDATE name = VALUES(name);

COMMIT;