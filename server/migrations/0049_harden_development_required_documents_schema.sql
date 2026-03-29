CREATE TABLE IF NOT EXISTS `development_required_documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `development_id` INT NOT NULL,
  `document_code` ENUM(
    'id_document',
    'proof_of_address',
    'proof_of_income',
    'bank_statement',
    'pre_approval',
    'signed_offer_to_purchase',
    'sale_agreement',
    'attorney_instruction_letter',
    'transfer_documents',
    'custom'
  ) NOT NULL,
  `document_label` VARCHAR(160) NOT NULL,
  `is_required` TINYINT NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_development_required_documents_development`
    FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE CASCADE
);

SET @has_is_active := (
  SELECT COUNT(*)
  FROM information_schema.columns
  WHERE table_schema = DATABASE()
    AND table_name = 'development_required_documents'
    AND column_name = 'is_active'
);

SET @add_is_active_sql := IF(
  @has_is_active = 0,
  'ALTER TABLE `development_required_documents` ADD COLUMN `is_active` TINYINT NOT NULL DEFAULT 1 AFTER `sort_order`',
  'SELECT 1'
);
PREPARE add_is_active_stmt FROM @add_is_active_sql;
EXECUTE add_is_active_stmt;
DEALLOCATE PREPARE add_is_active_stmt;

UPDATE `development_required_documents`
SET `is_active` = 1
WHERE `is_active` IS NULL;

SET @has_active_index := (
  SELECT COUNT(*)
  FROM information_schema.statistics
  WHERE table_schema = DATABASE()
    AND table_name = 'development_required_documents'
    AND index_name = 'idx_development_required_documents_active'
);

SET @add_active_index_sql := IF(
  @has_active_index = 0,
  'ALTER TABLE `development_required_documents` ADD INDEX `idx_development_required_documents_active` (`is_active`)',
  'SELECT 1'
);
PREPARE add_active_index_stmt FROM @add_active_index_sql;
EXECUTE add_active_index_stmt;
DEALLOCATE PREPARE add_active_index_stmt;
