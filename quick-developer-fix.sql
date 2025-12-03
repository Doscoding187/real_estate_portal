-- QUICK FIX: Add missing columns to developers table
-- For TiDB Database - Run this immediately

ALTER TABLE `developers` 
ADD COLUMN `rejectionReason` text NULL,
ADD COLUMN `approvedBy` int NULL,
ADD COLUMN `approvedAt` timestamp NULL,
ADD COLUMN `rejectedBy` int NULL,
ADD COLUMN `rejectedAt` timestamp NULL,
ADD COLUMN `kpi_cache` json NULL,
ADD COLUMN `last_kpi_calculation` timestamp NULL;

-- Create index for performance
CREATE INDEX `idx_developers_last_kpi_calculation` ON `developers`(`last_kpi_calculation`);
