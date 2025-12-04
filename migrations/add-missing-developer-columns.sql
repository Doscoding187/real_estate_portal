-- Add missing columns to developers table
-- These columns exist in the schema but not in the production database

ALTER TABLE `developers`
ADD COLUMN IF NOT EXISTS `category` ENUM('residential','commercial','mixed_use','industrial') DEFAULT 'residential' NOT NULL AFTER `province`,
ADD COLUMN IF NOT EXISTS `kpi_cache` JSON AFTER `rejectedAt`,
ADD COLUMN IF NOT EXISTS `last_kpi_calculation` TIMESTAMP NULL AFTER `kpi_cache`,
ADD COLUMN IF NOT EXISTS `completedProjects` INT DEFAULT 0 AFTER `last_kpi_calculation`,
ADD COLUMN IF NOT EXISTS `currentProjects` INT DEFAULT 0 AFTER `completedProjects`,
ADD COLUMN IF NOT EXISTS `upcomingProjects` INT DEFAULT 0 AFTER `currentProjects`,
ADD COLUMN IF NOT EXISTS `trackRecord` TEXT AFTER `upcomingProjects`,
ADD COLUMN IF NOT EXISTS `past_projects` JSON AFTER `trackRecord`,
ADD COLUMN IF NOT EXISTS `specializations` TEXT AFTER `past_projects`;

-- Add index for last_kpi_calculation if it doesn't exist
CREATE INDEX IF NOT EXISTS `idx_developers_last_kpi_calculation` ON `developers`(`last_kpi_calculation`);
