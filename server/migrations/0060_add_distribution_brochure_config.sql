SET @has_distribution_development_access_brochure_config := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'distribution_development_access'
    AND column_name = 'brochure_config_json'
);

SET @add_distribution_development_access_brochure_config_sql := IF(
  @has_distribution_development_access_brochure_config = 0,
  'ALTER TABLE `distribution_development_access` ADD COLUMN `brochure_config_json` JSON NULL AFTER `notes`',
  'SELECT 1'
);

PREPARE add_distribution_development_access_brochure_config_stmt
FROM @add_distribution_development_access_brochure_config_sql;
EXECUTE add_distribution_development_access_brochure_config_stmt;
DEALLOCATE PREPARE add_distribution_development_access_brochure_config_stmt;
