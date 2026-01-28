-- Migration: Add Property Results Optimization Fields
-- Description: Adds SA-specific columns to properties table and creates analytics tables
-- Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 4.1, 11.1, 11.3

-- Add SA-specific columns to properties table
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS title_type VARCHAR(20) DEFAULT 'freehold' COMMENT 'Property title type: freehold or sectional',
  ADD COLUMN IF NOT EXISTS levy DECIMAL(10,2) COMMENT 'Monthly levy for sectional title properties',
  ADD COLUMN IF NOT EXISTS rates_estimate DECIMAL(10,2) COMMENT 'Monthly rates estimate',
  ADD COLUMN IF NOT EXISTS security_estate BOOLEAN DEFAULT false COMMENT 'Property is in a security estate',
  ADD COLUMN IF NOT EXISTS pet_friendly BOOLEAN DEFAULT false COMMENT 'Property allows pets',
  ADD COLUMN IF NOT EXISTS fibre_ready BOOLEAN DEFAULT false COMMENT 'Property has fibre connectivity',
  ADD COLUMN IF NOT EXISTS load_shedding_solutions JSON COMMENT 'Array of load-shedding solutions: solar, generator, inverter',
  ADD COLUMN IF NOT EXISTS erf_size DECIMAL(10,2) COMMENT 'Erf/land size in square meters',
  ADD COLUMN IF NOT EXISTS floor_size DECIMAL(10,2) COMMENT 'Floor size in square meters',
  ADD COLUMN IF NOT EXISTS suburb VARCHAR(255) COMMENT 'Property suburb/neighbourhood';

-- Create indexes for common filter queries
CREATE INDEX IF NOT EXISTS idx_properties_title_type ON properties(title_type);
CREATE INDEX IF NOT EXISTS idx_properties_security_estate ON properties(security_estate);
CREATE INDEX IF NOT EXISTS idx_properties_pet_friendly ON properties(pet_friendly);
CREATE INDEX IF NOT EXISTS idx_properties_fibre_ready ON properties(fibre_ready);
CREATE INDEX IF NOT EXISTS idx_properties_suburb ON properties(suburb);
CREATE INDEX IF NOT EXISTS idx_properties_listed_date ON properties(createdAt);

-- Composite indexes for common filter combinations
CREATE INDEX IF NOT EXISTS idx_properties_location_type 
  ON properties(city, propertyType, listingType, status);
CREATE INDEX IF NOT EXISTS idx_properties_price_beds 
  ON properties(price, bedrooms, status);

-- Saved searches table
CREATE TABLE IF NOT EXISTS saved_searches (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(255) NOT NULL,
  filters JSON NOT NULL COMMENT 'Stored filter criteria',
  notification_method VARCHAR(20) DEFAULT 'email',
  notification_frequency VARCHAR(20) DEFAULT 'weekly',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_notified TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT true,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_searches_active ON saved_searches(is_active);

-- Search analytics table
CREATE TABLE IF NOT EXISTS search_analytics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  session_id VARCHAR(255),
  filters JSON NOT NULL COMMENT 'Search filter criteria',
  result_count INT COMMENT 'Number of results returned',
  sort_order VARCHAR(50) COMMENT 'Sort order applied',
  view_mode VARCHAR(20) COMMENT 'View mode: list, grid, or map',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_search_analytics_created ON search_analytics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_session ON search_analytics(session_id);

-- Property click tracking
CREATE TABLE IF NOT EXISTS property_clicks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  property_id INT NOT NULL,
  user_id INT NULL,
  session_id VARCHAR(255),
  position INT COMMENT 'Position in search results',
  search_filters JSON COMMENT 'Active filters when clicked',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_property_clicks_property ON property_clicks(property_id);
CREATE INDEX IF NOT EXISTS idx_property_clicks_created ON property_clicks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_clicks_session ON property_clicks(session_id);
