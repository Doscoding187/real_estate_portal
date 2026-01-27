-- Migration: Add Google Places fields to existing location tables
-- Task: 2. Enhance existing database schema with Google Places fields

-- Add Google Places fields to provinces table
ALTER TABLE provinces
ADD COLUMN slug VARCHAR(200) UNIQUE AFTER name,
ADD COLUMN place_id VARCHAR(255) UNIQUE AFTER slug,
ADD COLUMN seo_title VARCHAR(255) AFTER place_id,
ADD COLUMN seo_description TEXT AFTER seo_title;

-- Add Google Places fields to cities table
ALTER TABLE cities
ADD COLUMN slug VARCHAR(200) AFTER name,
ADD COLUMN place_id VARCHAR(255) UNIQUE AFTER slug,
ADD COLUMN seo_title VARCHAR(255) AFTER place_id,
ADD COLUMN seo_description TEXT AFTER seo_title;

-- Add Google Places fields to suburbs table
ALTER TABLE suburbs
ADD COLUMN slug VARCHAR(200) AFTER name,
ADD COLUMN place_id VARCHAR(255) UNIQUE AFTER slug,
ADD COLUMN seo_title VARCHAR(255) AFTER place_id,
ADD COLUMN seo_description TEXT AFTER seo_title;

-- Add Google Places fields to locations table
ALTER TABLE locations
ADD COLUMN place_id VARCHAR(255) UNIQUE AFTER parentId,
ADD COLUMN viewport_ne_lat DECIMAL(10, 8) AFTER longitude,
ADD COLUMN viewport_ne_lng DECIMAL(11, 8) AFTER viewport_ne_lat,
ADD COLUMN viewport_sw_lat DECIMAL(10, 8) AFTER viewport_ne_lng,
ADD COLUMN viewport_sw_lng DECIMAL(11, 8) AFTER viewport_sw_lat,
ADD COLUMN seo_title VARCHAR(255) AFTER description,
ADD COLUMN seo_description TEXT AFTER seo_title,
ADD COLUMN hero_image VARCHAR(500) AFTER seo_description;

-- Create location_searches table for trending analysis
CREATE TABLE IF NOT EXISTS location_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  location_id INT NOT NULL,
  user_id INT NULL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_location_searched (location_id, searched_at),
  INDEX idx_user_id (user_id),
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create recent_searches table for user history
CREATE TABLE IF NOT EXISTS recent_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  location_id INT NOT NULL,
  searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_location (user_id, location_id),
  INDEX idx_user_recent (user_id, searched_at DESC),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

-- Add location_id foreign key to properties table (if not exists)
-- Check if column exists first
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'properties'
    AND COLUMN_NAME = 'location_id'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE properties ADD COLUMN location_id INT NULL AFTER suburbId, ADD INDEX idx_properties_location_id (location_id), ADD FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL',
  'SELECT "Column location_id already exists in properties table"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add location_id foreign key to developments table (if not exists)
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'developments'
    AND COLUMN_NAME = 'location_id'
);

SET @sql = IF(
  @column_exists = 0,
  'ALTER TABLE developments ADD COLUMN location_id INT NULL AFTER suburb, ADD INDEX idx_developments_location_id (location_id), ADD FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL',
  'SELECT "Column location_id already exists in developments table"'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Create database indexes for performance
CREATE INDEX IF NOT EXISTS idx_provinces_slug ON provinces(slug);
CREATE INDEX IF NOT EXISTS idx_provinces_place_id ON provinces(place_id);

CREATE INDEX IF NOT EXISTS idx_cities_slug ON cities(slug);
CREATE INDEX IF NOT EXISTS idx_cities_place_id ON cities(place_id);

CREATE INDEX IF NOT EXISTS idx_suburbs_slug ON suburbs(slug);
CREATE INDEX IF NOT EXISTS idx_suburbs_place_id ON suburbs(place_id);

CREATE INDEX IF NOT EXISTS idx_locations_place_id ON locations(place_id);
CREATE INDEX IF NOT EXISTS idx_locations_slug ON locations(slug);
CREATE INDEX IF NOT EXISTS idx_locations_parent_id ON locations(parentId);

-- Add composite index for slug uniqueness within parent for cities
CREATE UNIQUE INDEX IF NOT EXISTS idx_cities_slug_province ON cities(slug, provinceId);

-- Add composite index for slug uniqueness within parent for suburbs
CREATE UNIQUE INDEX IF NOT EXISTS idx_suburbs_slug_city ON suburbs(slug, cityId);
