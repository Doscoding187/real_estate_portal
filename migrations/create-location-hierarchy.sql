-- Location Intelligence Database Schema
-- South African Provinces, Cities, and Suburbs hierarchy

-- Step 1: Create provinces table
CREATE TABLE IF NOT EXISTS provinces (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) UNIQUE NOT NULL COMMENT 'Official province code (e.g., GP, WC, KZN)',
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_name (name),
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 2: Create cities table
CREATE TABLE IF NOT EXISTS cities (
  id INT AUTO_INCREMENT PRIMARY KEY,
  provinceId INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  isMetro INT DEFAULT 0 NOT NULL COMMENT '1 = Metropolitan municipality',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (provinceId) REFERENCES provinces(id) ON DELETE CASCADE,
  INDEX idx_province (provinceId),
  INDEX idx_name (name),
  INDEX idx_metro (isMetro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 3: Create suburbs table
CREATE TABLE IF NOT EXISTS suburbs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cityId INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  postalCode VARCHAR(10),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (cityId) REFERENCES cities(id) ON DELETE CASCADE,
  INDEX idx_city (cityId),
  INDEX idx_name (name),
  INDEX idx_postal (postalCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 4: Update properties table with enhanced location fields
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS provinceId INT AFTER updatedAt,
  ADD COLUMN IF NOT EXISTS cityId INT AFTER provinceId,
  ADD COLUMN IF NOT EXISTS suburbId INT AFTER cityId,
  ADD COLUMN IF NOT EXISTS locationText TEXT AFTER suburbId COMMENT 'Full address as entered by user',
  ADD COLUMN IF NOT EXISTS placeId VARCHAR(255) AFTER locationText COMMENT 'Google Places ID if available',
  ADD INDEX IF NOT EXISTS idx_province_city (provinceId, cityId),
  ADD INDEX IF NOT EXISTS idx_coordinates (latitude, longitude);

-- Step 5: Create location search cache for performance
CREATE TABLE IF NOT EXISTS location_search_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  searchQuery VARCHAR(255) NOT NULL,
  searchType ENUM('province', 'city', 'suburb', 'address') NOT NULL,
  resultsJSON TEXT NOT NULL COMMENT 'Cached search results as JSON',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  INDEX idx_query (searchQuery),
  INDEX idx_type (searchType),
  INDEX idx_expires (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Step 6: Agent coverage areas for mapping
CREATE TABLE IF NOT EXISTS agent_coverage_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  agentId INT NOT NULL,
  areaName VARCHAR(255) NOT NULL,
  areaType ENUM('province', 'city', 'suburb', 'custom_polygon') NOT NULL,
  areaData JSON NOT NULL COMMENT 'Coordinates or area definition',
  isActive INT DEFAULT 1 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE,
  INDEX idx_agent (agentId),
  INDEX idx_type (areaType),
  INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert South African provinces data
INSERT INTO provinces (name, code, latitude, longitude) VALUES
('Eastern Cape', 'EC', -32.2968, 26.2772),
('Free State', 'FS', -28.4541, 26.7968),
('Gauteng', 'GP', -26.2041, 28.0473),
('KwaZulu-Natal', 'KZN', -29.0122, 30.4497),
('Limpopo', 'LP', -23.8864, 29.4179),
('Mpumalanga', 'MP', -25.5653, 30.5279),
('Northern Cape', 'NC', -29.0467, 21.8569),
('North West', 'NW', -26.6639, 25.2837),
('Western Cape', 'WC', -33.2277, 21.8569)
ON DUPLICATE KEY UPDATE 
  name = VALUES(name), 
  latitude = VALUES(latitude), 
  longitude = VALUES(longitude);

-- Major cities data (sample - can be expanded)
INSERT INTO cities (provinceId, name, latitude, longitude, isMetro) VALUES
-- Gauteng
(3, 'Johannesburg', -26.2041, 28.0473, 1),
(3, 'Pretoria', -25.7479, 28.2293, 1),
(3, 'Ekurhuleni', -26.1389, 28.2445, 1),
(3, 'Tshwane', -25.7479, 28.2293, 1),
-- Western Cape
(9, 'Cape Town', -33.9249, 18.4241, 1),
(9, 'Stellenbosch', -33.9321, 18.8602, 0),
(9, 'Paarl', -33.7328, 18.9778, 0),
-- KwaZulu-Natal
(4, 'Durban', -29.8587, 31.0218, 1),
(4, 'Pietermaritzburg', -29.6001, 30.3799, 0),
(4, 'Newcastle', -28.0368, 29.9161, 0),
-- Eastern Cape
(1, 'Port Elizabeth', -33.9608, 25.6022, 0),
(1, 'East London', -33.0148, 27.9116, 0),
(1, 'Grahamstown', -33.3185, 26.5322, 0),
-- Free State
(2, 'Bloemfontein', -29.1212, 26.2041, 0),
(2, 'Welkom', -27.9774, 26.7374, 0),
-- Limpopo
(5, 'Polokwane', -23.8864, 29.4179, 0),
(5, 'Tzaneen', -23.8333, 30.1667, 0),
-- Mpumalanga
(6, 'Nelspruit', -25.4745, 30.9703, 0),
(6, 'Witbank', -25.8715, 29.1887, 0),
-- Northern Cape
(7, 'Kimberley', -28.7378, 24.7623, 0),
(7, 'Upington', -28.4133, 21.2591, 0),
-- North West
(8, 'Mafikeng', -25.8569, 25.6408, 0),
(8, 'Potchefstroom', -26.7119, 27.0861, 0)
ON DUPLICATE KEY UPDATE 
  provinceId = VALUES(provinceId),
  latitude = VALUES(latitude), 
  longitude = VALUES(longitude);

-- Sample suburbs for major cities
INSERT INTO suburbs (cityId, name, latitude, longitude, postalCode) VALUES
-- Johannesburg suburbs
(1, 'Sandton', -26.1076, 28.0567, 2196),
(1, 'Rosebank', -26.1486, 28.0433, 2196),
(1, 'Melville', -26.1756, 28.0050, 2109),
(1, 'Randburg', -26.1667, 27.9167, 2194),
-- Cape Town suburbs
(5, 'Green Point', -33.9067, 18.4056, 8005),
(5, 'Sea Point', -33.9092, 18.3816, 8005),
(5, 'V&A Waterfront', -33.9048, 18.4204, 8002),
(5, 'Constantia', -34.0050, 18.4167, 7806),
-- Durban suburbs
(8, 'Umhlanga', -29.7295, 31.0656, 4320),
(8, 'Durban North', -29.8003, 31.0306, 4051),
(8, 'Westville', -29.8324, 30.9278, 3629),
(8, 'Pinetown', -29.8134, 30.8589, 3610)
ON DUPLICATE KEY UPDATE 
  cityId = VALUES(cityId),
  latitude = VALUES(latitude), 
  longitude = VALUES(longitude),
  postalCode = VALUES(postalCode);

-- Add sample agent coverage areas
INSERT INTO agent_coverage_areas (agentId, areaName, areaType, areaData) VALUES
(1, 'Johannesburg Metro', 'city', '{"center": {"lat": -26.2041, "lng": 28.0473}, "radius": 25000}'),
(1, 'Sandton Area', 'suburb', '{"center": {"lat": -26.1076, "lng": 28.0567}, "radius": 5000}'),
(2, 'Cape Town Metro', 'city', '{"center": {"lat": -33.9249, "lng": 18.4241}, "radius": 30000}'),
(2, 'Atlantic Seaboard', 'custom_polygon', '{"points": [{"lat": -33.9200, "lng": 18.3800}, {"lat": -33.9000, "lng": 18.3900}, {"lat": -33.9100, "lng": 18.4100}]}')
ON DUPLICATE KEY UPDATE 
  areaData = VALUES(areaData);