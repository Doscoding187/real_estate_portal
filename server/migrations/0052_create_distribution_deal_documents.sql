-- Base deal document checklist table used by file upload workflow migrations.

CREATE TABLE IF NOT EXISTS `distribution_deal_documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `deal_id` INT NOT NULL,
  `development_required_document_id` INT NOT NULL,
  `status` ENUM('pending','received','verified','rejected') NOT NULL DEFAULT 'pending',
  `received_at` TIMESTAMP NULL,
  `verified_at` TIMESTAMP NULL,
  `received_by` INT NULL,
  `verified_by` INT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_deal_documents_required_document` (`deal_id`, `development_required_document_id`),
  KEY `idx_distribution_deal_documents_deal` (`deal_id`),
  KEY `idx_distribution_deal_documents_required_document` (`development_required_document_id`),
  KEY `idx_distribution_deal_documents_status` (`status`),
  KEY `idx_distribution_deal_documents_updated_at` (`updated_at`),
  CONSTRAINT `fk_distribution_deal_documents_deal`
    FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deal_documents_required_document`
    FOREIGN KEY (`development_required_document_id`) REFERENCES `development_required_documents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deal_documents_received_by`
    FOREIGN KEY (`received_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_deal_documents_verified_by`
    FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
