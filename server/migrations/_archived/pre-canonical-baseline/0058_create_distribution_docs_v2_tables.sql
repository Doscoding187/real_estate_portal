CREATE TABLE IF NOT EXISTS `development_documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `development_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `document_type` ENUM(
    'price_list',
    'house_plan',
    'brochure',
    'site_map',
    'spec_sheet',
    'availability_sheet',
    'other'
  ) NOT NULL DEFAULT 'other',
  `category` ENUM(
    'sales_asset',
    'technical_asset',
    'legal_asset',
    'application_template',
    'other'
  ) NOT NULL DEFAULT 'other',
  `storage_key` VARCHAR(512) NULL,
  `file_url` VARCHAR(2048) NULL,
  `mime_type` VARCHAR(255) NULL,
  `file_size_bytes` INT NULL,
  `visibility` ENUM('internal','manager','referrer','public') NOT NULL DEFAULT 'internal',
  `downloadable` TINYINT NOT NULL DEFAULT 1,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `version` INT NOT NULL DEFAULT 1,
  `replaced_by_document_id` INT NULL,
  `uploaded_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_development_documents_development` (`development_id`),
  KEY `idx_development_documents_active` (`is_active`),
  KEY `idx_development_documents_visibility` (`visibility`),
  KEY `idx_development_documents_type` (`document_type`),
  CONSTRAINT `fk_development_documents_development`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_development_documents_uploaded_by`
    FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `application_requirements` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `development_id` INT NOT NULL,
  `label` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `required` TINYINT NOT NULL DEFAULT 1,
  `provider` ENUM('buyer','referrer','manager','developer') NOT NULL DEFAULT 'buyer',
  `document_code` VARCHAR(80) NULL,
  `accepted_file_types_json` JSON NULL,
  `linked_development_document_id` INT NULL,
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_by` INT NULL,
  `updated_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_application_requirements_development` (`development_id`),
  KEY `idx_application_requirements_active` (`is_active`),
  KEY `idx_application_requirements_required` (`required`),
  KEY `idx_application_requirements_provider` (`provider`),
  KEY `idx_application_requirements_order` (`development_id`, `sort_order`),
  CONSTRAINT `fk_application_requirements_development`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_application_requirements_linked_development_document`
    FOREIGN KEY (`linked_development_document_id`) REFERENCES `development_documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_application_requirements_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_application_requirements_updated_by`
    FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `deal_requirement_statuses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `deal_id` INT NOT NULL,
  `requirement_id` INT NOT NULL,
  `uploaded_file_storage_key` VARCHAR(512) NULL,
  `uploaded_file_url` VARCHAR(2048) NULL,
  `uploaded_file_name` VARCHAR(255) NULL,
  `linked_development_document_id` INT NULL,
  `status` ENUM('missing','uploaded','pending_review','verified','rejected','waived')
    NOT NULL DEFAULT 'missing',
  `submitted_by` INT NULL,
  `submitted_at` TIMESTAMP NULL,
  `reviewed_by` INT NULL,
  `reviewed_at` TIMESTAMP NULL,
  `rejection_reason` TEXT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_deal_requirement_statuses_deal_requirement` (`deal_id`, `requirement_id`),
  KEY `idx_deal_requirement_statuses_deal` (`deal_id`),
  KEY `idx_deal_requirement_statuses_status` (`status`),
  KEY `idx_deal_requirement_statuses_requirement` (`requirement_id`),
  CONSTRAINT `fk_deal_requirement_statuses_deal`
    FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deal_requirement_statuses_requirement`
    FOREIGN KEY (`requirement_id`) REFERENCES `application_requirements` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_deal_requirement_statuses_linked_development_document`
    FOREIGN KEY (`linked_development_document_id`) REFERENCES `development_documents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_deal_requirement_statuses_submitted_by`
    FOREIGN KEY (`submitted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_deal_requirement_statuses_reviewed_by`
    FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
