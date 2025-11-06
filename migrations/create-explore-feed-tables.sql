-- ================================================
-- Phase 7: Explore Feed - Video System Tables
-- ================================================
-- Creates tables for TikTok-style explore feed with dual-type videos
-- Run this script in MySQL Workbench after running create-core-tables.sql

USE real_estate_portal;

-- ================================================
-- 1. Videos Table (Dual-type: listing & content)
-- ================================================
CREATE TABLE IF NOT EXISTS videos (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agentId INT NOT NULL,
  propertyId INT DEFAULT NULL,
  developmentId INT DEFAULT NULL,
  videoUrl TEXT NOT NULL,
  caption TEXT,
  type ENUM('listing', 'content') DEFAULT 'content' NOT NULL,
  duration INT DEFAULT 0 COMMENT 'Video duration in seconds',
  views INT DEFAULT 0 NOT NULL,
  likes INT DEFAULT 0 NOT NULL,
  shares INT DEFAULT 0 NOT NULL,
  isPublished TINYINT(1) DEFAULT 1 NOT NULL,
  isFeatured TINYINT(1) DEFAULT 0 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE,
  FOREIGN KEY (propertyId) REFERENCES properties(id) ON DELETE SET NULL,
  FOREIGN KEY (developmentId) REFERENCES developments(id) ON DELETE SET NULL,
  INDEX idx_agent (agentId),
  INDEX idx_property (propertyId),
  INDEX idx_type (type),
  INDEX idx_published (isPublished),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 2. Video Likes Table
-- ================================================
CREATE TABLE IF NOT EXISTS videoLikes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  videoId INT NOT NULL,
  userId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (videoId) REFERENCES videos(id) ON DELETE CASCADE,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_video (videoId, userId),
  INDEX idx_video (videoId),
  INDEX idx_user (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 3. Provinces Table (South African)
-- ================================================
CREATE TABLE IF NOT EXISTS provinces (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(10) NOT NULL UNIQUE,
  latitude VARCHAR(20),
  longitude VARCHAR(21),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 4. Cities Table
-- ================================================
CREATE TABLE IF NOT EXISTS cities (
  id INT PRIMARY KEY AUTO_INCREMENT,
  provinceId INT NOT NULL,
  name VARCHAR(150) NOT NULL,
  latitude VARCHAR(20),
  longitude VARCHAR(21),
  isMetro TINYINT(1) DEFAULT 0 NOT NULL COMMENT '1 = Metropolitan municipality',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (provinceId) REFERENCES provinces(id) ON DELETE CASCADE,
  INDEX idx_province (provinceId),
  INDEX idx_metro (isMetro)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 5. Suburbs Table
-- ================================================
CREATE TABLE IF NOT EXISTS suburbs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  cityId INT NOT NULL,
  name VARCHAR(200) NOT NULL,
  latitude VARCHAR(20),
  longitude VARCHAR(21),
  postalCode VARCHAR(10),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (cityId) REFERENCES cities(id) ON DELETE CASCADE,
  INDEX idx_city (cityId),
  INDEX idx_postal (postalCode)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 6. Notifications Table
-- ================================================
CREATE TABLE IF NOT EXISTS notifications (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  type ENUM('lead_assigned', 'offer_received', 'showing_scheduled', 'system_alert') NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  data TEXT COMMENT 'JSON data for additional context',
  isRead TINYINT(1) DEFAULT 0 NOT NULL,
  readAt TIMESTAMP NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user (userId),
  INDEX idx_read (isRead),
  INDEX idx_created (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 7. Email Templates Table
-- ================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  templateKey VARCHAR(100) NOT NULL UNIQUE,
  subject VARCHAR(255) NOT NULL,
  htmlContent TEXT NOT NULL,
  textContent TEXT,
  agencyId INT DEFAULT NULL,
  isActive TINYINT(1) DEFAULT 1 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agencyId) REFERENCES agencies(id) ON DELETE CASCADE,
  INDEX idx_key (templateKey),
  INDEX idx_agency (agencyId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 8. Location Search Cache
-- ================================================
CREATE TABLE IF NOT EXISTS location_search_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  searchQuery VARCHAR(255) NOT NULL,
  searchType ENUM('province', 'city', 'suburb', 'address', 'all') NOT NULL,
  resultsJSON TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  INDEX idx_query (searchQuery),
  INDEX idx_expires (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 9. Agent Coverage Areas
-- ================================================
CREATE TABLE IF NOT EXISTS agent_coverage_areas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  agentId INT NOT NULL,
  areaName VARCHAR(255) NOT NULL,
  areaType ENUM('province', 'city', 'suburb', 'custom_polygon') NOT NULL,
  areaData TEXT NOT NULL COMMENT 'JSON - coordinates or area definition',
  isActive TINYINT(1) DEFAULT 1 NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (agentId) REFERENCES agents(id) ON DELETE CASCADE,
  INDEX idx_agent (agentId),
  INDEX idx_active (isActive)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ================================================
-- 10. Update Properties Table (add location hierarchy)
-- ================================================
-- Check if columns exist before adding
SET @db_name = 'real_estate_portal';
SET @table_name = 'properties';

-- Add provinceId if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @table_name AND COLUMN_NAME = 'provinceId');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE properties ADD COLUMN provinceId INT DEFAULT NULL AFTER longitude', 
  'SELECT "Column provinceId already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add cityId if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @table_name AND COLUMN_NAME = 'cityId');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE properties ADD COLUMN cityId INT DEFAULT NULL AFTER provinceId', 
  'SELECT "Column cityId already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add suburbId if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @table_name AND COLUMN_NAME = 'suburbId');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE properties ADD COLUMN suburbId INT DEFAULT NULL AFTER cityId', 
  'SELECT "Column suburbId already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add locationText if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @table_name AND COLUMN_NAME = 'locationText');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE properties ADD COLUMN locationText TEXT DEFAULT NULL AFTER suburbId', 
  'SELECT "Column locationText already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add placeId if not exists
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = @db_name AND TABLE_NAME = @table_name AND COLUMN_NAME = 'placeId');
SET @sql = IF(@col_exists = 0, 
  'ALTER TABLE properties ADD COLUMN placeId VARCHAR(255) DEFAULT NULL AFTER locationText', 
  'SELECT "Column placeId already exists" AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ================================================
-- Verification Queries
-- ================================================
SELECT 'Videos Table' AS TableName, COUNT(*) AS RecordCount FROM videos
UNION ALL
SELECT 'Video Likes', COUNT(*) FROM videoLikes
UNION ALL
SELECT 'Provinces', COUNT(*) FROM provinces
UNION ALL
SELECT 'Cities', COUNT(*) FROM cities
UNION ALL
SELECT 'Suburbs', COUNT(*) FROM suburbs
UNION ALL
SELECT 'Notifications', COUNT(*) FROM notifications
UNION ALL
SELECT 'Email Templates', COUNT(*) FROM email_templates
UNION ALL
SELECT 'Agent Coverage Areas', COUNT(*) FROM agent_coverage_areas;

SELECT '✅ Phase 7 Explore Feed tables created successfully!' AS Status;
