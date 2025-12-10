-- ================================================
-- Agency Content Attribution Migration
-- ================================================
-- Adds agency_id fields to explore_shorts and explore_content tables
-- Enables agency-level content attribution and analytics
-- Requirements: 1.2, 4.1, 4.2, 4.3, 6.1, 7.5

-- ================================================
-- 1. Add agency_id to explore_shorts table
-- ================================================
-- Requirements: 1.2, 4.1

ALTER TABLE `explore_shorts`
ADD COLUMN `agency_id` INT NULL AFTER `developer_id`;

ALTER TABLE `explore_shorts`
ADD INDEX `idx_explore_shorts_agency_id` (`agency_id`);

ALTER TABLE `explore_shorts`
ADD CONSTRAINT `fk_explore_shorts_agency` 
  FOREIGN KEY (`agency_id`) 
  REFERENCES `agencies`(`id`) 
  ON DELETE SET NULL;

-- ================================================
-- 2. Add agency fields to explore_content table
-- ================================================
-- Requirements: 1.2, 4.1, 6.1

ALTER TABLE `explore_content`
ADD COLUMN `creator_type` ENUM('user', 'agent', 'developer', 'agency') 
  NOT NULL DEFAULT 'user' AFTER `creator_id`;

ALTER TABLE `explore_content`
ADD COLUMN `agency_id` INT NULL AFTER `creator_type`;

ALTER TABLE `explore_content`
ADD INDEX `idx_explore_content_creator_type` (`creator_type`);

ALTER TABLE `explore_content`
ADD INDEX `idx_explore_content_agency_id` (`agency_id`);

ALTER TABLE `explore_content`
ADD CONSTRAINT `fk_explore_content_agency` 
  FOREIGN KEY (`agency_id`) 
  REFERENCES `agencies`(`id`) 
  ON DELETE SET NULL;

-- ================================================
-- 3. Create composite indexes for performance
-- ================================================
-- Requirements: Performance optimization

-- Agency feed query optimization (agency_id + published status + date)
CREATE INDEX `idx_explore_shorts_agency_published` 
  ON `explore_shorts`(`agency_id`, `is_published`, `published_at` DESC);

-- Agency content query optimization (agency_id + active status + date)
CREATE INDEX `idx_explore_content_agency_active` 
  ON `explore_content`(`agency_id`, `is_active`, `created_at` DESC);

-- Agency analytics optimization (agency_id + performance metrics)
CREATE INDEX `idx_explore_shorts_agency_performance` 
  ON `explore_shorts`(`agency_id`, `performance_score` DESC, `view_count` DESC);

-- ================================================
-- 4. Verification Queries
-- ================================================

-- Verify explore_shorts columns
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'explore_shorts' 
  AND COLUMN_NAME IN ('agency_id')
ORDER BY ORDINAL_POSITION;

-- Verify explore_content columns
SELECT 
  COLUMN_NAME, 
  DATA_TYPE, 
  IS_NULLABLE, 
  COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'explore_content' 
  AND COLUMN_NAME IN ('creator_type', 'agency_id')
ORDER BY ORDINAL_POSITION;

-- Verify indexes
SELECT 
  TABLE_NAME,
  INDEX_NAME,
  GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS COLUMNS
FROM INFORMATION_SCHEMA.STATISTICS
WHERE TABLE_NAME IN ('explore_shorts', 'explore_content')
  AND INDEX_NAME LIKE '%agency%'
GROUP BY TABLE_NAME, INDEX_NAME
ORDER BY TABLE_NAME, INDEX_NAME;

-- Verify foreign keys
SELECT 
  CONSTRAINT_NAME,
  TABLE_NAME,
  COLUMN_NAME,
  REFERENCED_TABLE_NAME,
  REFERENCED_COLUMN_NAME
FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
WHERE TABLE_NAME IN ('explore_shorts', 'explore_content')
  AND CONSTRAINT_NAME LIKE '%agency%'
ORDER BY TABLE_NAME, CONSTRAINT_NAME;

SELECT '✅ Agency attribution migration completed successfully!' AS Status;
