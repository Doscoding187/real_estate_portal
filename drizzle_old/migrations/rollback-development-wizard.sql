-- ============================================
-- ROLLBACK SCRIPT: Development Wizard Optimization
-- ============================================
-- WARNING: This will remove all wizard-related tables and data
-- Use with caution in production environments
-- ============================================

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS `development_documents`;
DROP TABLE IF EXISTS `spec_variations`;
DROP TABLE IF EXISTS `unit_types`;

-- Remove wizard optimization fields from developments table
-- Note: This only removes fields added by wizard optimization
-- The base developments table structure is preserved

ALTER TABLE `developments` 
DROP COLUMN IF EXISTS `features`,
DROP COLUMN IF EXISTS `highlights`,
DROP COLUMN IF EXISTS `rating`,
DROP COLUMN IF EXISTS `gps_accuracy`,
DROP COLUMN IF EXISTS `postal_code`,
DROP COLUMN IF EXISTS `suburb`;

-- Remove indexes added by wizard optimization
DROP INDEX IF EXISTS `idx_developments_gps_accuracy` ON `developments`;
DROP INDEX IF EXISTS `idx_developments_suburb` ON `developments`;
DROP INDEX IF EXISTS `idx_developments_rating` ON `developments`;
DROP INDEX IF EXISTS `idx_developments_slug` ON `developments`;
DROP INDEX IF EXISTS `idx_developments_location` ON `developments`;

-- Revert amenities column back to TEXT if needed
-- ALTER TABLE `developments` MODIFY COLUMN `amenities` TEXT;

-- Revert status enum to original values
ALTER TABLE `developments` 
MODIFY COLUMN `status` ENUM(
  'planning',
  'under-construction',
  'completed',
  'coming_soon'
) DEFAULT 'planning' NOT NULL;

-- ============================================
-- ROLLBACK COMPLETE
-- ============================================
-- The following have been removed:
-- - unit_types table
-- - spec_variations table  
-- - development_documents table
-- - Wizard optimization fields from developments
-- - Related indexes
-- ============================================
