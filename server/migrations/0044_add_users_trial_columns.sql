SET @has_users_table := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
);

SET @has_plan := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'plan'
);

SET @sql := IF(
  @has_users_table = 1 AND @has_plan = 0,
  'ALTER TABLE `users`
    ADD COLUMN `plan` ENUM(''trial'', ''paid'') NOT NULL DEFAULT ''trial''',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_trial_status := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'trialStatus'
);

SET @sql := IF(
  @has_users_table = 1 AND @has_trial_status = 0,
  'ALTER TABLE `users`
    ADD COLUMN `trialStatus` ENUM(''active'', ''expired'') NOT NULL DEFAULT ''active''',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_trial_started_at := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'trialStartedAt'
);

SET @sql := IF(
  @has_users_table = 1 AND @has_trial_started_at = 0,
  'ALTER TABLE `users`
    ADD COLUMN `trialStartedAt` TIMESTAMP NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_trial_ends_at := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'users'
    AND column_name = 'trialEndsAt'
);

SET @sql := IF(
  @has_users_table = 1 AND @has_trial_ends_at = 0,
  'ALTER TABLE `users`
    ADD COLUMN `trialEndsAt` TIMESTAMP NULL',
  'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
