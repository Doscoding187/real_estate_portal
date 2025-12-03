-- =====================================================
-- FIX DEVELOPER PROFILE SUBMISSION - DATABASE MIGRATION
-- =====================================================
-- This migration adds missing columns required for the developer profile creation
-- Run this on your TiDB database before deploying the code changes

-- Check if columns already exist before adding
-- If they already exist, MySQL will throw an error - that's okay, it means the column is already there

-- Add approval workflow columns
ALTER TABLE `developers` 
ADD COLUMN IF NOT EXISTS `rejectionReason` text NULL COMMENT 'Reason for rejection if developer application was rejected',
ADD COLUMN IF NOT EXISTS `approvedBy` int NULL COMMENT 'User ID of admin who approved this developer',
ADD COLUMN IF NOT EXISTS `approvedAt` timestamp NULL COMMENT 'Timestamp when developer was approved',
ADD COLUMN IF NOT EXISTS `rejectedBy` int NULL COMMENT 'User ID of admin who rejected this developer',
ADD COLUMN IF NOT EXISTS `rejectedAt` timestamp NULL COMMENT 'Timestamp when developer was rejected';

-- Add KPI caching columns for performance
ALTER TABLE `developers`
ADD COLUMN IF NOT EXISTS `kpi_cache` json NULL COMMENT 'Cached KPI data for mission control dashboard',
ADD COLUMN IF NOT EXISTS `last_kpi_calculation` timestamp NULL COMMENT 'Timestamp of last KPI calculation for cache invalidation';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS `idx_developers_last_kpi_calculation` ON `developers`(`last_kpi_calculation`);
CREATE INDEX IF NOT EXISTS `idx_developers_status` ON `developers`(`status`);
CREATE INDEX IF NOT EXISTS `idx_developers_approved_by` ON `developers`(`approvedBy`);
CREATE INDEX IF NOT EXISTS `idx_developers_rejected_by` ON `developers`(`rejectedBy`);

-- Add foreign key constraints if they don't exist
-- Note: TiDB might handle these differently than MySQL

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
-- Run this after the migration to verify all columns exist:
-- DESCRIBE `developers`;
-- 
-- You should see these columns:
-- - rejectionReason (text, NULL)
-- - approvedBy (int, NULL)
-- - approvedAt (timestamp, NULL)
-- - rejectedBy (int, NULL)
-- - rejectedAt (timestamp, NULL)
-- - kpi_cache (json, NULL)
-- - last_kpi_calculation (timestamp, NULL)
