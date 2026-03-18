SET @has_category_column := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'development_required_documents'
    AND column_name = 'category'
);

SET @add_category_column_sql := IF(
  @has_category_column = 0,
  'ALTER TABLE `development_required_documents` ADD COLUMN `category` ENUM(''developer_document'', ''client_required_document'') NOT NULL DEFAULT ''client_required_document'' AFTER `document_label`',
  'SELECT 1'
);
PREPARE add_category_column_stmt FROM @add_category_column_sql;
EXECUTE add_category_column_stmt;
DEALLOCATE PREPARE add_category_column_stmt;

SET @has_category_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'development_required_documents'
    AND index_name = 'idx_development_required_documents_category'
);

SET @add_category_index_sql := IF(
  @has_category_index = 0,
  'CREATE INDEX idx_development_required_documents_category ON development_required_documents (development_id, category)',
  'SELECT 1'
);
PREPARE add_category_index_stmt FROM @add_category_index_sql;
EXECUTE add_category_index_stmt;
DEALLOCATE PREPARE add_category_index_stmt;
