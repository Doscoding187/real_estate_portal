-- ================================================
-- Agency Content Attribution Rollback Migration
-- ================================================
-- Removes agency_id fields and related indexes from explore tables
-- Use this script to rollback the agency attribution feature
-- Requirements: 7.5

-- ================================================
-- 1. Drop composite indexes
-- ================================================

DROP INDEX IF EXISTS `idx_explore_shorts_agency_performance` ON `explore_shorts`;
DROP INDEX IF EXISTS `idx_explore_content_agency_active` ON `explore_content`;
DROP INDEX IF EXISTS `idx_explore_shorts_agency_published` ON `explore_shorts`;

-- ================================================
-- 2. Drop foreign key constraints
-- ================================================

ALTER TABLE `explore_shorts` 
DROP FOREIGN KEY IF EXISTS `fk_explore_shorts_agency`;

ALTER TABLE `explore_content` 
DROP FOREIGN KEY IF EXISTS `fk_explore_content_agency`;

-- ================================================
-- 3. Drop indexes
-- ================================================

DROP INDEX IF EXISTS `idx_explore_shorts_agency_id` ON `explore_shorts`;
DROP INDEX IF EXISTS `idx_explore_content_agency_id` ON `explore_content`;
DROP INDEX IF EXISTS `idx_explore_content_creator_type` ON `explore_content`;

-- ================================================
-- 4. Drop columns from explore_shorts
-- ================================================

ALTER TABLE `explore_shorts` 
DROP COLUMN IF EXISTS `agency_id`;

-- ================================================
-- 5. Drop columns from explore_content
-- ================================================

ALTER TABLE `explore_content` 
DROP COLUMN IF EXISTS `agency_id`,
DROP COLUMN IF EXISTS `creator_type`;

-- ================================================
-- 6. Verification Queries
-- ================================================

-- Verify explore_shorts columns removed
SELECT 
  COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'explore_shorts' 
  AND COLUMN_NAME = 'agency_id';

-- Verify explore_content columns removed
SELECT 
  COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'explore_content' 
  AND COLUMN_NAME IN ('creator_type', 'agency_id');

-- Verify indexes removed
SELECT 
  TABLE_NAME,
  INDEX_NAME
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_NAME IN ('explore_shorts', 'explore_content')
  AND INDEX_NAME LIKE '%agency%'
GROUP BY TABLE_NAME, INDEX_NAME;

-- If all queries return empty results, rollback was successful
SELECT '✅ Agency attribution rollback completed successfully!' AS Status;
