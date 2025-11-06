-- Migration: Create user_preferences table
-- Purpose: Store personalized property search preferences for recommendation scoring
-- Created: 2025-11-05

-- Drop table if exists (for development/rollback)
DROP TABLE IF EXISTS user_preferences;

-- Create user_preferences table
CREATE TABLE user_preferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Property Search Preferences
  preferredPropertyTypes TEXT, -- JSON array: ["house", "apartment"]
  preferredPriceMin INT, -- Minimum price in ZAR
  preferredPriceMax INT, -- Maximum price in ZAR
  preferredBedrooms INT, -- Number of bedrooms
  preferredBathrooms INT, -- Number of bathrooms
  preferredPropertySize TEXT, -- JSON object: {"min": 50, "max": 200}
  
  -- Location Preferences  
  preferredLocations TEXT, -- JSON array of suburb/city names
  preferredDistance INT, -- Max distance in km from center
  preferredProvices TEXT, -- JSON array of province names
  preferredCities TEXT, -- JSON array of city names
  preferredSuburbs TEXT, -- JSON array of suburb names
  
  -- Property Features
  requiredAmenities TEXT, -- JSON array: ["pool", "garden", "garage"]
  preferredAmenities TEXT, -- JSON array
  propertyFeatures TEXT, -- JSON object with feature preferences
  petFriendly TINYINT(1) DEFAULT 0, -- 0 = No preference, 1 = Required, 2 = Not wanted
  furnished ENUM('unfurnished', 'semi_furnished', 'fully_furnished'),
  
  -- Search & Notifications
  alertFrequency ENUM('never', 'instant', 'daily', 'weekly') DEFAULT 'daily',
  emailNotifications TINYINT(1) DEFAULT 1,
  smsNotifications TINYINT(1) DEFAULT 0,
  pushNotifications TINYINT(1) DEFAULT 1,
  isActive TINYINT(1) DEFAULT 1,
  
  -- Weights for recommendation scoring (0-100 scale)
  locationWeight INT DEFAULT 30, -- How important location is
  priceWeight INT DEFAULT 25, -- How important price match is
  featuresWeight INT DEFAULT 25, -- How important features match is
  sizeWeight INT DEFAULT 20, -- How important size match is
  
  -- Metadata
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  lastUsed TIMESTAMP NULL,
  
  -- Indexes
  INDEX idx_user_preferences_userId (userId),
  INDEX idx_user_preferences_active (isActive),
  INDEX idx_user_preferences_updated (updatedAt)
);

-- Insert sample user preferences for testing
INSERT INTO user_preferences (
  userId,
  preferredPropertyTypes,
  preferredPriceMin,
  preferredPriceMax,
  preferredBedrooms,
  preferredBathrooms,
  requiredAmenities,
  preferredAmenities,
  alertFrequency,
  emailNotifications,
  locationWeight,
  priceWeight,
  featuresWeight,
  sizeWeight
) VALUES 
(
  1, -- userId
  '["house", "townhouse"]',
  800000, -- R800K minimum
  2000000, -- R2M maximum
  3, -- 3 bedrooms
  2, -- 2 bathrooms
  '["garage", "garden"]',
  '["pool", "security", "backup_power"]',
  'daily',
  1,
  35, -- Location more important
  30, -- Price moderately important
  20, -- Features less important  
  15  -- Size less important
);

-- Create indexes for better performance
CREATE INDEX idx_user_preferences_location ON user_preferences (preferredDistance);
CREATE INDEX idx_user_preferences_price ON user_preferences (preferredPriceMin, preferredPriceMax);
CREATE INDEX idx_user_preferences_bedrooms ON user_preferences (preferredBedrooms);
CREATE INDEX idx_user_preferences_alert_frequency ON user_preferences (alertFrequency);

-- Comments for documentation
ALTER TABLE user_preferences 
  COMMENT = 'Stores personalized property search preferences for recommendation scoring and search optimization';