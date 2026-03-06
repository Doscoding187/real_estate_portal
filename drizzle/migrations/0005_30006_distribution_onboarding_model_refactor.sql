ALTER TABLE `distribution_programs`
  ADD COLUMN `payout_milestone` ENUM(
    'attorney_instruction',
    'attorney_signing',
    'bond_approval',
    'transfer_registration',
    'occupation',
    'custom'
  ) NOT NULL DEFAULT 'attorney_signing' AFTER `tier_access_policy`,
  ADD COLUMN `payout_milestone_notes` text NULL AFTER `payout_milestone`,
  ADD COLUMN `currency_code` varchar(3) NOT NULL DEFAULT 'ZAR' AFTER `payout_milestone_notes`;
--> statement-breakpoint

UPDATE `distribution_programs`
SET `currency_code` = UPPER(COALESCE(NULLIF(`currency_code`, ''), 'ZAR'));
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `development_required_documents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `development_id` int NOT NULL,
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
  `document_label` varchar(160) NOT NULL,
  `is_required` tinyint NOT NULL DEFAULT 1,
  `sort_order` int NOT NULL DEFAULT 0,
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `development_required_documents_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `development_required_documents_development_id_fk`
    FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade,
  CONSTRAINT `ux_development_required_documents_code` UNIQUE(`development_id`, `document_code`)
);
--> statement-breakpoint

CREATE INDEX `idx_development_required_documents_development`
  ON `development_required_documents` (`development_id`);
--> statement-breakpoint
CREATE INDEX `idx_development_required_documents_required`
  ON `development_required_documents` (`is_required`);
--> statement-breakpoint
CREATE INDEX `idx_development_required_documents_active`
  ON `development_required_documents` (`is_active`);
--> statement-breakpoint
CREATE INDEX `idx_development_required_documents_order`
  ON `development_required_documents` (`development_id`, `sort_order`);
--> statement-breakpoint

INSERT INTO `development_required_documents` (
  `development_id`,
  `document_code`,
  `document_label`,
  `is_required`,
  `sort_order`,
  `is_active`
)
SELECT
  dp.`development_id`,
  CASE LOWER(COALESCE(prd.`document_key`, ''))
    WHEN 'id_document' THEN 'id_document'
    WHEN 'proof_of_address' THEN 'proof_of_address'
    WHEN 'proof_of_income' THEN 'proof_of_income'
    WHEN 'bank_statement' THEN 'bank_statement'
    WHEN 'pre_approval' THEN 'pre_approval'
    WHEN 'signed_offer_to_purchase' THEN 'signed_offer_to_purchase'
    WHEN 'sale_agreement' THEN 'sale_agreement'
    WHEN 'attorney_instruction_letter' THEN 'attorney_instruction_letter'
    WHEN 'transfer_documents' THEN 'transfer_documents'
    ELSE 'custom'
  END AS `document_code`,
  COALESCE(NULLIF(prd.`document_label`, ''), prd.`document_key`, 'Required Document') AS `document_label`,
  COALESCE(prd.`is_required`, 1) AS `is_required`,
  COALESCE(prd.`display_order`, 0) AS `sort_order`,
  1 AS `is_active`
FROM `distribution_program_required_documents` prd
INNER JOIN `distribution_program_workflows` pw ON pw.`id` = prd.`workflow_id`
INNER JOIN `distribution_programs` dp ON dp.`id` = pw.`program_id`
ON DUPLICATE KEY UPDATE
  `document_label` = VALUES(`document_label`),
  `is_required` = VALUES(`is_required`),
  `sort_order` = VALUES(`sort_order`),
  `is_active` = VALUES(`is_active`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `distribution_deal_documents` (
  `id` int AUTO_INCREMENT NOT NULL,
  `deal_id` int NOT NULL,
  `development_required_document_id` int NOT NULL,
  `status` ENUM('pending', 'received', 'verified', 'rejected') NOT NULL DEFAULT 'pending',
  `received_at` timestamp NULL,
  `verified_at` timestamp NULL,
  `received_by` int NULL,
  `verified_by` int NULL,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_deal_documents_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `distribution_deal_documents_deal_id_fk`
    FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_deal_documents_required_doc_fk`
    FOREIGN KEY (`development_required_document_id`) REFERENCES `development_required_documents`(`id`) ON DELETE cascade,
  CONSTRAINT `distribution_deal_documents_received_by_fk`
    FOREIGN KEY (`received_by`) REFERENCES `users`(`id`) ON DELETE set null,
  CONSTRAINT `distribution_deal_documents_verified_by_fk`
    FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE set null,
  CONSTRAINT `ux_distribution_deal_documents_required_document`
    UNIQUE(`deal_id`, `development_required_document_id`)
);
--> statement-breakpoint

CREATE INDEX `idx_distribution_deal_documents_deal`
  ON `distribution_deal_documents` (`deal_id`);
--> statement-breakpoint
CREATE INDEX `idx_distribution_deal_documents_required_document`
  ON `distribution_deal_documents` (`development_required_document_id`);
--> statement-breakpoint
CREATE INDEX `idx_distribution_deal_documents_status`
  ON `distribution_deal_documents` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_distribution_deal_documents_updated_at`
  ON `distribution_deal_documents` (`updated_at`);
--> statement-breakpoint

INSERT INTO `distribution_deal_documents` (
  `deal_id`,
  `development_required_document_id`,
  `status`,
  `received_at`,
  `verified_at`,
  `received_by`,
  `verified_by`,
  `notes`
)
SELECT
  dds.`deal_id`,
  drd.`id` AS `development_required_document_id`,
  CASE WHEN COALESCE(dds.`is_received`, 0) = 1 THEN 'received' ELSE 'pending' END AS `status`,
  dds.`received_at`,
  NULL AS `verified_at`,
  dds.`received_by_user_id`,
  NULL AS `verified_by`,
  dds.`notes`
FROM `distribution_deal_document_statuses` dds
INNER JOIN `distribution_deals` dd ON dd.`id` = dds.`deal_id`
INNER JOIN `development_required_documents` drd
  ON drd.`development_id` = dd.`development_id`
 AND drd.`document_code` = CASE LOWER(COALESCE(dds.`document_key`, ''))
    WHEN 'id_document' THEN 'id_document'
    WHEN 'proof_of_address' THEN 'proof_of_address'
    WHEN 'proof_of_income' THEN 'proof_of_income'
    WHEN 'bank_statement' THEN 'bank_statement'
    WHEN 'pre_approval' THEN 'pre_approval'
    WHEN 'signed_offer_to_purchase' THEN 'signed_offer_to_purchase'
    WHEN 'sale_agreement' THEN 'sale_agreement'
    WHEN 'attorney_instruction_letter' THEN 'attorney_instruction_letter'
    WHEN 'transfer_documents' THEN 'transfer_documents'
    ELSE 'custom'
  END
ON DUPLICATE KEY UPDATE
  `status` = VALUES(`status`),
  `received_at` = VALUES(`received_at`),
  `notes` = VALUES(`notes`);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS `development_manager_assignments` (
  `id` int AUTO_INCREMENT NOT NULL,
  `development_id` int NOT NULL,
  `manager_user_id` int NOT NULL,
  `is_primary` tinyint NOT NULL DEFAULT 0,
  `workload_capacity` int NOT NULL DEFAULT 0,
  `timezone` varchar(64),
  `is_active` tinyint NOT NULL DEFAULT 1,
  `assigned_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `development_manager_assignments_id_pk` PRIMARY KEY (`id`),
  CONSTRAINT `development_manager_assignments_development_id_fk`
    FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade,
  CONSTRAINT `development_manager_assignments_manager_user_id_fk`
    FOREIGN KEY (`manager_user_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  CONSTRAINT `ux_development_manager_assignment_development_manager`
    UNIQUE(`development_id`, `manager_user_id`)
);
--> statement-breakpoint

CREATE INDEX `idx_development_manager_assignments_manager`
  ON `development_manager_assignments` (`manager_user_id`);
--> statement-breakpoint
CREATE INDEX `idx_development_manager_assignments_development`
  ON `development_manager_assignments` (`development_id`);
--> statement-breakpoint
CREATE INDEX `idx_development_manager_assignments_active`
  ON `development_manager_assignments` (`is_active`);
--> statement-breakpoint

INSERT INTO `development_manager_assignments` (
  `development_id`,
  `manager_user_id`,
  `is_primary`,
  `workload_capacity`,
  `timezone`,
  `is_active`,
  `assigned_at`
)
SELECT
  dma.`development_id`,
  dma.`manager_user_id`,
  MAX(dma.`is_primary`) AS `is_primary`,
  MAX(dma.`workload_capacity`) AS `workload_capacity`,
  MAX(dma.`timezone`) AS `timezone`,
  MAX(dma.`is_active`) AS `is_active`,
  MIN(COALESCE(dma.`created_at`, dma.`updated_at`, CURRENT_TIMESTAMP)) AS `assigned_at`
FROM `distribution_manager_assignments` dma
GROUP BY dma.`development_id`, dma.`manager_user_id`
ON DUPLICATE KEY UPDATE
  `is_primary` = VALUES(`is_primary`),
  `workload_capacity` = VALUES(`workload_capacity`),
  `timezone` = VALUES(`timezone`),
  `is_active` = VALUES(`is_active`),
  `assigned_at` = VALUES(`assigned_at`);
--> statement-breakpoint

DROP TABLE IF EXISTS `distribution_deal_document_statuses`;
--> statement-breakpoint
DROP TABLE IF EXISTS `distribution_program_required_documents`;
--> statement-breakpoint
DROP TABLE IF EXISTS `distribution_manager_assignments`;
--> statement-breakpoint
