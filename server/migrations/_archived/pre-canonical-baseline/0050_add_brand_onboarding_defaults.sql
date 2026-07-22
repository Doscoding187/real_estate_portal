SET @has_onboarding_defaults_json := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'distribution_brand_partnerships'
    AND column_name = 'onboarding_defaults_json'
);

SET @add_onboarding_defaults_json_sql := IF(
  @has_onboarding_defaults_json = 0,
  'ALTER TABLE `distribution_brand_partnerships` ADD COLUMN `onboarding_defaults_json` JSON NULL AFTER `notes`',
  'SELECT 1'
);
PREPARE add_onboarding_defaults_json_stmt FROM @add_onboarding_defaults_json_sql;
EXECUTE add_onboarding_defaults_json_stmt;
DEALLOCATE PREPARE add_onboarding_defaults_json_stmt;
