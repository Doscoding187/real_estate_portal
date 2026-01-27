-- Create Explore Discovery Engine Tables
-- Migration for comprehensive Explore feature with videos, neighbourhoods, categories, and recommendations
-- Adapted for MySQL from PostgreSQL design

-- Main content table for all Explore items (videos, properties, neighbourhoods, insights)
CREATE TABLE IF NOT EXISTS `explore_content` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `content_type` VARCHAR(50) NOT NULL COMMENT 'video, property, neighbourhood, insight',
  `reference_id` INT NOT NULL COMMENT 'ID of the actual content',
  `creator_id` INT NULL,
  `title` VARCHAR(255),
  `description` TEXT,
  `thumbnail_url` VARCHAR(500),
  `video_url` VARCHAR(500),
  `metadata` JSON COMMENT 'flexible metadata storage',
  `tags` JSON COMMENT 'array of tags',
  `lifestyle_categories` JSON COMMENT 'array of lifestyle category IDs',
  `location_lat` DECIMAL(10, 8),
  `location_lng` DECIMAL(11, 8),
  `price_min` INT,
  `price_max` INT,
  `view_count` INT DEFAULT 0,
  `engagement_score` DECIMAL(5, 2) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `is_featured` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_explore_content_type` (`content_type`),
  INDEX `idx_explore_content_creator` (`creator_id`),
  INDEX `idx_explore_content_location` (`location_lat`, `location_lng`),
  INDEX `idx_explore_content_engagement` (`engagement_score` DESC),
  INDEX `idx_explore_content_active` (`is_active`, `created_at` DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
