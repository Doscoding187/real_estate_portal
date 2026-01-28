-- ============================================
-- CONSOLIDATED MIGRATION: All Potentially Missing Tables
-- Run this manually in TiBD Cloud / Railway MySQL
-- Created: 2026-01-12
-- ============================================
-- Note: All tables use IF NOT EXISTS so safe to run multiple times

-- ============================================
-- 1. DEVELOPMENT PHASES (Already created separately)
-- ============================================
-- Skipped - was just created

-- ============================================
-- 2. UNIT TYPES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `unit_types` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `development_id` INT NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `name` VARCHAR(255),
  
  -- Basic Configuration
  `ownership_type` ENUM('full-title', 'sectional-title', 'leasehold', 'life-rights') DEFAULT 'sectional-title',
  `structural_type` ENUM('apartment', 'freestanding-house', 'simplex', 'duplex', 'penthouse', 'plot-and-plan', 'townhouse', 'studio') DEFAULT 'apartment',
  `bedrooms` INT DEFAULT 0,
  `bathrooms` DECIMAL(3,1) DEFAULT 0,
  `floors` ENUM('single-storey', 'double-storey', 'triplex') NULL,
  
  -- Sizes
  `unit_size` INT NULL,
  `yard_size` INT NULL,
  
  -- Pricing
  `price_from` DECIMAL(15,2),
  `price_to` DECIMAL(15,2) NULL,
  `base_price_from` INT NULL,
  `base_price_to` INT NULL,
  
  -- Financial columns
  `monthly_levy_from` INT NULL,
  `monthly_levy_to` INT NULL,
  `rates_and_taxes_from` INT NULL,
  `rates_and_taxes_to` INT NULL,
  `extras` JSON NULL,
  
  -- Parking
  `parking_type` VARCHAR(50) NULL,
  `parking_bays` INT DEFAULT 0,
  
  -- Availability
  `total_units` INT DEFAULT 0,
  `available_units` INT DEFAULT 0,
  `reserved_units` INT DEFAULT 0,
  `completion_date` DATE NULL,
  `deposit_required` DECIMAL(15,2) NULL,
  `internal_notes` TEXT NULL,
  
  -- Description & Media
  `config_description` TEXT NULL,
  `description` TEXT NULL,
  `virtual_tour_link` VARCHAR(500) NULL,
  
  -- Specifications
  `spec_overrides` JSON NULL,
  `specifications` JSON NULL,
  `amenities` JSON NULL,
  `features` JSON NULL,
  `base_media` JSON NULL,
  
  -- Display
  `display_order` INT DEFAULT 0,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE,
  
  -- Indexes
  INDEX `idx_unit_types_development_id` (`development_id`),
  INDEX `idx_unit_types_bedrooms` (`bedrooms`)
);

-- ============================================
-- 3. DEVELOPER SUBSCRIPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS `developer_subscriptions` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `developer_id` int NOT NULL,
  `plan_id` int,
  `tier` enum('free_trial', 'basic', 'premium') DEFAULT 'free_trial' NOT NULL,
  `status` enum('active', 'cancelled', 'expired') DEFAULT 'active' NOT NULL,
  `trial_ends_at` timestamp,
  `current_period_start` timestamp,
  `current_period_end` timestamp,
  `stripe_subscription_id` varchar(100),
  `stripe_customer_id` varchar(100),
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE CASCADE,
  INDEX `idx_developer_subscriptions_developer_id` (`developer_id`),
  INDEX `idx_developer_subscriptions_status` (`status`),
  INDEX `idx_developer_subscriptions_tier` (`tier`)
);

-- ============================================
-- 4. DEVELOPER SUBSCRIPTION LIMITS
-- ============================================
CREATE TABLE IF NOT EXISTS `developer_subscription_limits` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `subscription_id` int NOT NULL,
  `max_developments` int DEFAULT 1 NOT NULL,
  `max_leads_per_month` int DEFAULT 50 NOT NULL,
  `max_team_members` int DEFAULT 1 NOT NULL,
  `analytics_retention_days` int DEFAULT 30 NOT NULL,
  `crm_integration_enabled` tinyint DEFAULT 0 NOT NULL,
  `advanced_analytics_enabled` tinyint DEFAULT 0 NOT NULL,
  `bond_integration_enabled` tinyint DEFAULT 0 NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE CASCADE,
  INDEX `idx_developer_subscription_limits_subscription_id` (`subscription_id`)
);

-- ============================================
-- 5. DEVELOPER SUBSCRIPTION USAGE
-- ============================================
CREATE TABLE IF NOT EXISTS `developer_subscription_usage` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `subscription_id` int NOT NULL,
  `developments_count` int DEFAULT 0 NOT NULL,
  `leads_this_month` int DEFAULT 0 NOT NULL,
  `team_members_count` int DEFAULT 0 NOT NULL,
  `last_reset_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE CASCADE,
  INDEX `idx_developer_subscription_usage_subscription_id` (`subscription_id`)
);

-- ============================================
-- 6. ACTIVITIES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `activities` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `developer_id` int NOT NULL,
  `activity_type` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `metadata` json,
  `related_entity_type` enum('development', 'unit', 'lead', 'campaign', 'team_member'),
  `related_entity_id` int,
  `user_id` int,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE CASCADE,
  INDEX `idx_activities_developer_id` (`developer_id`),
  INDEX `idx_activities_activity_type` (`activity_type`),
  INDEX `idx_activities_created_at` (`created_at`)
);

-- ============================================
-- 7. DEVELOPER NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `developer_notifications` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `developer_id` int NOT NULL,
  `user_id` int NULL,
  `title` varchar(255) NOT NULL,
  `body` text NOT NULL,
  `type` varchar(50) NOT NULL,
  `severity` enum('info', 'warning', 'error', 'success') NOT NULL DEFAULT 'info',
  `read` boolean NOT NULL DEFAULT false,
  `action_url` varchar(500) NULL,
  `metadata` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE CASCADE,
  INDEX `idx_developer_notifications_developer_id` (`developer_id`),
  INDEX `idx_developer_notifications_read` (`read`),
  INDEX `idx_developer_notifications_created_at` (`created_at`)
);

-- ============================================
-- 8. DEVELOPMENT UNITS TABLE (Individual units)
-- ============================================
CREATE TABLE IF NOT EXISTS `development_units` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `development_id` INT NOT NULL,
  `phase_id` INT NULL,
  `unit_number` VARCHAR(100) NOT NULL,
  `unit_type` ENUM('studio','1bed','2bed','3bed','4bed+','penthouse','townhouse','house') NOT NULL,
  `bedrooms` INT,
  `bathrooms` DECIMAL(3, 1),
  `size` DECIMAL(10, 2),
  `price` DECIMAL(12, 2) NOT NULL,
  `floor_plan` TEXT,
  `floor` INT,
  `facing` VARCHAR(50),
  `features` TEXT,
  `status` ENUM('available','reserved','sold') DEFAULT 'available' NOT NULL,
  `reserved_at` TIMESTAMP NULL,
  `reserved_by` INT,
  `sold_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE,
  INDEX `idx_development_units_development_id` (`development_id`),
  INDEX `idx_development_units_status` (`status`)
);

-- ============================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================
-- SELECT 'unit_types' as tbl, COUNT(*) as count FROM unit_types
-- UNION ALL SELECT 'developer_subscriptions', COUNT(*) FROM developer_subscriptions
-- UNION ALL SELECT 'activities', COUNT(*) FROM activities
-- UNION ALL SELECT 'developer_notifications', COUNT(*) FROM developer_notifications
-- UNION ALL SELECT 'development_units', COUNT(*) FROM development_units;
