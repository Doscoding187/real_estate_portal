-- Canonicalize explore_content schema across drifted environments.
-- This migration is intentionally idempotent and uses single-column ALTERs so
-- partial state does not block remaining canonical columns/indexes.

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    )
    AND NOT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND column_name = 'actor_id'
    ),
    'ALTER TABLE `explore_content` ADD COLUMN `actor_id` INT NULL AFTER `reference_id`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    )
    AND NOT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND column_name = 'category'
    ),
    'ALTER TABLE `explore_content` ADD COLUMN `category` ENUM(''property'',''renovation'',''finance'',''investment'',''services'') NOT NULL DEFAULT ''property'' AFTER `lifestyle_categories`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    )
    AND NOT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND column_name = 'duration_sec'
    ),
    'ALTER TABLE `explore_content` ADD COLUMN `duration_sec` INT NULL AFTER `category`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    )
    AND NOT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND column_name = 'width'
    ),
    'ALTER TABLE `explore_content` ADD COLUMN `width` INT NULL AFTER `duration_sec`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    )
    AND NOT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND column_name = 'height'
    ),
    'ALTER TABLE `explore_content` ADD COLUMN `height` INT NULL AFTER `width`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    )
    AND NOT EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND column_name = 'orientation'
    ),
    'ALTER TABLE `explore_content` ADD COLUMN `orientation` ENUM(''vertical'',''horizontal'',''square'') NULL DEFAULT ''vertical'' AFTER `height`',
    'SELECT 1'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    )
    AND NOT EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND index_name = 'idx_explore_content_actor_id'
    ),
    'ALTER TABLE `explore_content` ADD KEY `idx_explore_content_actor_id` (`actor_id`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    )
    AND NOT EXISTS(
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND index_name = 'idx_explore_content_category'
    ),
    'ALTER TABLE `explore_content` ADD KEY `idx_explore_content_category` (`category`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    )
    AND EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND column_name = 'actor_id'
    )
    AND EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'economic_actors'
    )
    AND NOT EXISTS(
      SELECT 1
      FROM information_schema.referential_constraints
      WHERE constraint_schema = DATABASE()
        AND table_name = 'explore_content'
        AND constraint_name = 'fk_explore_content_actor_id'
    ),
    'ALTER TABLE `explore_content` ADD CONSTRAINT `fk_explore_content_actor_id` FOREIGN KEY (`actor_id`) REFERENCES `economic_actors` (`id`) ON DELETE SET NULL',
    'SELECT 1'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @ddl := (
  SELECT IF(
    EXISTS(
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
    )
    AND EXISTS(
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = 'explore_content'
        AND column_name IN ('category', 'duration_sec', 'width', 'height', 'orientation', 'metadata')
      GROUP BY table_name
      HAVING COUNT(*) = 6
    ),
    'UPDATE `explore_content`
      SET
        `category` = CASE
          WHEN JSON_VALID(`metadata`)
            AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, ''$.category''))) IN (''property'',''renovation'',''finance'',''investment'',''services'')
            THEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, ''$.category'')))
          ELSE `category`
        END,
        `duration_sec` = COALESCE(`duration_sec`, NULLIF(CAST(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, ''$.durationSec'')) AS SIGNED), 0)),
        `width` = COALESCE(`width`, NULLIF(CAST(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, ''$.width'')) AS SIGNED), 0)),
        `height` = COALESCE(`height`, NULLIF(CAST(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, ''$.height'')) AS SIGNED), 0)),
        `orientation` = COALESCE(
          `orientation`,
          CASE
            WHEN JSON_VALID(`metadata`)
              AND LOWER(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, ''$.orientation''))) IN (''vertical'',''horizontal'',''square'')
              THEN LOWER(JSON_UNQUOTE(JSON_EXTRACT(`metadata`, ''$.orientation'')))
            ELSE NULL
          END
        )
      WHERE JSON_VALID(`metadata`)',
    'SELECT 1'
  )
);
PREPARE stmt FROM @ddl;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
