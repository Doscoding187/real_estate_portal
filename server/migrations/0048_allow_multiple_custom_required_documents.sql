SET @has_development_required_documents_table := (
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = DATABASE()
    AND table_name = 'development_required_documents'
);

SET @has_unique_code_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'development_required_documents'
    AND index_name = 'ux_development_required_documents_code'
);

SET @drop_unique_code_index_sql := IF(
  @has_development_required_documents_table > 0 AND @has_unique_code_index > 0,
  'ALTER TABLE `development_required_documents` DROP INDEX `ux_development_required_documents_code`',
  'SELECT 1'
);
PREPARE drop_unique_code_index_stmt FROM @drop_unique_code_index_sql;
EXECUTE drop_unique_code_index_stmt;
DEALLOCATE PREPARE drop_unique_code_index_stmt;

SET @has_non_unique_code_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'development_required_documents'
    AND index_name = 'idx_development_required_documents_code'
);

SET @add_non_unique_code_index_sql := IF(
  @has_development_required_documents_table > 0 AND @has_non_unique_code_index = 0,
  'ALTER TABLE `development_required_documents` ADD INDEX `idx_development_required_documents_code` (`development_id`, `document_code`)',
  'SELECT 1'
);
PREPARE add_non_unique_code_index_stmt FROM @add_non_unique_code_index_sql;
EXECUTE add_non_unique_code_index_stmt;
DEALLOCATE PREPARE add_non_unique_code_index_stmt;
