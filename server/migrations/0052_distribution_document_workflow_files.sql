ALTER TABLE `development_required_documents`
  ADD COLUMN IF NOT EXISTS `template_file_url` VARCHAR(2048) NULL AFTER `category`,
  ADD COLUMN IF NOT EXISTS `template_file_name` VARCHAR(255) NULL AFTER `template_file_url`,
  ADD COLUMN IF NOT EXISTS `template_uploaded_at` TIMESTAMP NULL AFTER `template_file_name`,
  ADD COLUMN IF NOT EXISTS `template_uploaded_by` INT NULL AFTER `template_uploaded_at`;

SET @has_template_uploaded_by_fk := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'development_required_documents'
    AND constraint_name = 'fk_development_required_documents_template_uploaded_by'
);

SET @add_template_uploaded_by_fk_sql := IF(
  @has_template_uploaded_by_fk = 0,
  'ALTER TABLE `development_required_documents`
     ADD CONSTRAINT `fk_development_required_documents_template_uploaded_by`
     FOREIGN KEY (`template_uploaded_by`) REFERENCES `users`(`id`) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE add_template_uploaded_by_fk_stmt FROM @add_template_uploaded_by_fk_sql;
EXECUTE add_template_uploaded_by_fk_stmt;
DEALLOCATE PREPARE add_template_uploaded_by_fk_stmt;

ALTER TABLE `distribution_deal_documents`
  ADD COLUMN IF NOT EXISTS `submitted_file_url` VARCHAR(2048) NULL AFTER `verified_by`,
  ADD COLUMN IF NOT EXISTS `submitted_file_name` VARCHAR(255) NULL AFTER `submitted_file_url`,
  ADD COLUMN IF NOT EXISTS `submitted_at` TIMESTAMP NULL AFTER `submitted_file_name`,
  ADD COLUMN IF NOT EXISTS `submitted_by` INT NULL AFTER `submitted_at`;

SET @has_submitted_by_fk := (
  SELECT COUNT(*)
  FROM information_schema.table_constraints
  WHERE table_schema = DATABASE()
    AND table_name = 'distribution_deal_documents'
    AND constraint_name = 'fk_distribution_deal_documents_submitted_by'
);

SET @add_submitted_by_fk_sql := IF(
  @has_submitted_by_fk = 0,
  'ALTER TABLE `distribution_deal_documents`
     ADD CONSTRAINT `fk_distribution_deal_documents_submitted_by`
     FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE add_submitted_by_fk_stmt FROM @add_submitted_by_fk_sql;
EXECUTE add_submitted_by_fk_stmt;
DEALLOCATE PREPARE add_submitted_by_fk_stmt;

