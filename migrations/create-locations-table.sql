-- Create locations table to store cities and suburbs from Google Places
CREATE TABLE IF NOT EXISTS locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  place_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  full_address TEXT NOT NULL,
  location_type VARCHAR(50) NOT NULL, -- 'city', 'suburb', 'neighborhood', etc.
  province VARCHAR(100),
  country VARCHAR(100) DEFAULT 'South Africa',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Create index on place_id for faster lookups
CREATE INDEX idx_locations_place_id ON locations(place_id);

-- Create index on name for search
CREATE INDEX idx_locations_name ON locations(name);

-- Create index on location_type
CREATE INDEX idx_locations_type ON locations(location_type);
