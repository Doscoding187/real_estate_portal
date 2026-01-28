-- Add KPI caching fields to developers table
-- This supports efficient KPI calculations with 5-minute TTL caching

ALTER TABLE `developers` 
ADD COLUMN `kpi_cache` json NULL COMMENT 'Cached KPI data for mission control dashboard',
ADD COLUMN `last_kpi_calculation` timestamp NULL COMMENT 'Timestamp of last KPI calculation for cache invalidation';

-- Add index for cache invalidation queries
CREATE INDEX `idx_developers_last_kpi_calculation` ON `developers`(`last_kpi_calculation`);
