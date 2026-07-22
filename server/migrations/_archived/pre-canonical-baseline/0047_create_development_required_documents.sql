-- Base development document requirements table used by follow-up hardening migrations.

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
  UNIQUE KEY `ux_development_required_documents_code` (`development_id`, `document_code`),
  KEY `idx_development_required_documents_development` (`development_id`),
  KEY `idx_development_required_documents_required` (`is_required`),
  KEY `idx_development_required_documents_active` (`is_active`),
  KEY `idx_development_required_documents_order` (`development_id`, `sort_order`),
  CONSTRAINT `fk_development_required_documents_development`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE
);
