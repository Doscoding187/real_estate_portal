-- ============================================
-- RAILWAY DATABASE MIGRATION SETUP
-- Run this script in Railway Database Query tab
-- ============================================

-- 1. Check existing tables
SELECT 'Checking existing tables...' as status;
SHOW TABLES;

-- 2. Create developer_subscriptions table
SELECT 'Creating developer_subscriptions table...' as status;
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
  FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE SET NULL
);

-- 3. Create developer_subscription_limits table
SELECT 'Creating developer_subscription_limits table...' as status;
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
  FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE CASCADE
);

-- 4. Create developer_subscription_usage table
SELECT 'Creating developer_subscription_usage table...' as status;
CREATE TABLE IF NOT EXISTS `developer_subscription_usage` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `subscription_id` int NOT NULL,
  `developments_count` int DEFAULT 0 NOT NULL,
  `leads_this_month` int DEFAULT 0 NOT NULL,
  `team_members_count` int DEFAULT 0 NOT NULL,
  `last_reset_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE CASCADE
);

-- 5. Add developer approval workflow columns
SELECT 'Adding developer approval workflow columns...' as status;
ALTER TABLE `developers` 
ADD COLUMN IF NOT EXISTS `userId` int NOT NULL AFTER `isVerified`,
ADD COLUMN IF NOT EXISTS `status` enum('pending','approved','rejected') DEFAULT 'pending' NOT NULL AFTER `userId`,
ADD COLUMN IF NOT EXISTS `rejectionReason` text NULL AFTER `status`,
ADD COLUMN IF NOT EXISTS `approvedBy` int NULL AFTER `rejectionReason`,
ADD COLUMN IF NOT EXISTS `approvedAt` timestamp NULL AFTER `approvedBy`,
ADD COLUMN IF NOT EXISTS `rejectedBy` int NULL AFTER `approvedAt`,
ADD COLUMN IF NOT EXISTS `rejectedAt` timestamp NULL AFTER `rejectedBy`;

-- 6. Enhance developments table
SELECT 'Enhancing developments table...' as status;
ALTER TABLE `developments` 
ADD COLUMN IF NOT EXISTS `slug` varchar(255) UNIQUE AFTER `name`,
ADD COLUMN IF NOT EXISTS `floor_plans` text AFTER `videos`,
ADD COLUMN IF NOT EXISTS `brochures` text AFTER `floor_plans`,
ADD COLUMN IF NOT EXISTS `published_at` timestamp NULL AFTER `updated_at`,
ADD COLUMN IF NOT EXISTS `is_published` tinyint DEFAULT 0 NOT NULL AFTER `is_featured`;

-- 7. Create development_phases table
SELECT 'Creating development_phases table...' as status;
CREATE TABLE IF NOT EXISTS `development_phases` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `development_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `phase_number` int NOT NULL,
  `description` text,
  `status` enum('planning', 'pre_launch', 'selling', 'sold_out', 'completed') DEFAULT 'planning' NOT NULL,
  `total_units` int DEFAULT 0 NOT NULL,
  `available_units` int DEFAULT 0 NOT NULL,
  `price_from` int,
  `price_to` int,
  `launch_date` timestamp,
  `completion_date` timestamp,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE
);

-- 8. Create development_units table
SELECT 'Creating development_units table...' as status;
CREATE TABLE IF NOT EXISTS `development_units` (
  `id` int AUTO_INCREMENT PRIMARY KEY NOT NULL,
  `development_id` int NOT NULL,
  `phase_id` int,
  `unit_number` varchar(100) NOT NULL,
  `unit_type` enum('studio', '1bed', '2bed', '3bed', '4bed+', 'penthouse', 'townhouse', 'house') NOT NULL,
  `bedrooms` int,
  `bathrooms` decimal(3,1),
  `size` decimal(10,2) COMMENT 'Size in square meters',
  `price` decimal(12,2) NOT NULL,
  `floor_plan` text COMMENT 'S3 URL',
  `floor` int,
  `facing` varchar(50),
  `features` text COMMENT 'JSON array',
  `status` enum('available', 'reserved', 'sold') DEFAULT 'available' NOT NULL,
  `reserved_at` timestamp NULL,
  `reserved_by` int COMMENT 'leadId',
  `sold_at` timestamp NULL,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`phase_id`) REFERENCES `development_phases`(`id`) ON DELETE SET NULL,
  UNIQUE KEY `unique_unit_per_development` (`development_id`, `unit_number`)
);

-- 9. Enhance leads table with affordability fields
SELECT 'Enhancing leads table...' as status;
ALTER TABLE `leads` 
ADD COLUMN IF NOT EXISTS `affordability_data` JSON NULL COMMENT 'Buyer affordability calculation results',
ADD COLUMN IF NOT EXISTS `qualification_status` ENUM('qualified', 'partially_qualified', 'unqualified', 'pending') DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS `qualification_score` INT DEFAULT 0 COMMENT 'Qualification score 0-100',
ADD COLUMN IF NOT EXISTS `lead_source` VARCHAR(100) NULL COMMENT 'Lead source channel',
ADD COLUMN IF NOT EXISTS `referrer_url` TEXT NULL COMMENT 'Referrer URL',
ADD COLUMN IF NOT EXISTS `utm_source` VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS `utm_medium` VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS `utm_campaign` VARCHAR(100) NULL,
ADD COLUMN IF NOT EXISTS `funnel_stage` ENUM('interest', 'affordability', 'qualification', 'viewing', 'offer', 'bond', 'sale') DEFAULT 'interest',
ADD COLUMN IF NOT EXISTS `assigned_to` INT NULL COMMENT 'User ID of assigned sales team member',
ADD COLUMN IF NOT EXISTS `assigned_at` TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS `converted_at` TIMESTAMP NULL,
ADD COLUMN IF NOT EXISTS `lost_reason` TEXT NULL;

-- 10. Create all indexes
SELECT 'Creating indexes...' as status;

-- Developer subscriptions indexes
CREATE INDEX IF NOT EXISTS `idx_developer_subscriptions_developer_id` ON `developer_subscriptions`(`developer_id`);
CREATE INDEX IF NOT EXISTS `idx_developer_subscriptions_status` ON `developer_subscriptions`(`status`);
CREATE INDEX IF NOT EXISTS `idx_developer_subscriptions_tier` ON `developer_subscriptions`(`tier`);
CREATE INDEX IF NOT EXISTS `idx_developer_subscription_limits_subscription_id` ON `developer_subscription_limits`(`subscription_id`);
CREATE INDEX IF NOT EXISTS `idx_developer_subscription_usage_subscription_id` ON `developer_subscription_usage`(`subscription_id`);

-- Developments indexes
CREATE INDEX IF NOT EXISTS `idx_developments_slug` ON `developments`(`slug`);
CREATE INDEX IF NOT EXISTS `idx_developments_developer_id` ON `developments`(`developer_id`);
CREATE INDEX IF NOT EXISTS `idx_developments_published` ON `developments`(`is_published`);

-- Development phases indexes
CREATE INDEX IF NOT EXISTS `idx_development_phases_development_id` ON `development_phases`(`development_id`);
CREATE INDEX IF NOT EXISTS `idx_development_phases_status` ON `development_phases`(`status`);

-- Units indexes
CREATE INDEX IF NOT EXISTS `idx_units_development_id` ON `development_units`(`development_id`);
CREATE INDEX IF NOT EXISTS `idx_units_phase_id` ON `development_units`(`phase_id`);
CREATE INDEX IF NOT EXISTS `idx_units_status` ON `development_units`(`status`);
CREATE INDEX IF NOT EXISTS `idx_units_unit_type` ON `development_units`(`unit_type`);
CREATE INDEX IF NOT EXISTS `idx_units_price` ON `development_units`(`price`);

-- Leads indexes
CREATE INDEX IF NOT EXISTS `idx_leads_qualification_status` ON `leads` (`qualification_status`);
CREATE INDEX IF NOT EXISTS `idx_leads_funnel_stage` ON `leads` (`funnel_stage`);
CREATE INDEX IF NOT EXISTS `idx_leads_assigned_to` ON `leads` (`assigned_to`);
CREATE INDEX IF NOT EXISTS `idx_leads_lead_source` ON `leads` (`lead_source`);

-- Add developer indexes
CREATE INDEX IF NOT EXISTS `idx_developers_userId` ON `developers`(`userId`);
CREATE INDEX IF NOT EXISTS `idx_developers_status` ON `developers`(`status`);

-- 11. Verify all tables were created
SELECT 'Migration complete! Verifying tables...' as status;
SHOW TABLES;

SELECT 'Done! All tables and indexes created successfully.' as status;
