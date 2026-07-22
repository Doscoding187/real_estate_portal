-- Distribution program workflow engine (developer-specific workflow templates + deal-level operational state).

CREATE TABLE IF NOT EXISTS `distribution_program_workflows` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `program_id` INT NOT NULL,
  `workflow_key` VARCHAR(120) NOT NULL,
  `workflow_name` VARCHAR(180) NOT NULL,
  `bank_strategy` ENUM('single', 'multi_simultaneous', 'sequential') NOT NULL DEFAULT 'single',
  `turnaround_hours` INT NOT NULL DEFAULT 48,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `config_json` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_program_workflows_program` (`program_id`),
  KEY `idx_distribution_program_workflows_strategy` (`bank_strategy`),
  KEY `idx_distribution_program_workflows_active` (`is_active`),
  KEY `idx_distribution_program_workflows_updated_at` (`updated_at`),
  CONSTRAINT `fk_distribution_program_workflows_program` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `distribution_program_workflow_steps` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `workflow_id` INT NOT NULL,
  `step_key` VARCHAR(80) NOT NULL,
  `step_label` VARCHAR(160) NOT NULL,
  `step_type` ENUM('internal', 'document', 'bank', 'decision', 'closure') NOT NULL DEFAULT 'internal',
  `step_order` INT NOT NULL,
  `is_blocking` TINYINT NOT NULL DEFAULT 0,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_program_workflow_steps_key` (`workflow_id`, `step_key`),
  UNIQUE KEY `ux_distribution_program_workflow_steps_order` (`workflow_id`, `step_order`),
  KEY `idx_distribution_program_workflow_steps_workflow` (`workflow_id`),
  KEY `idx_distribution_program_workflow_steps_type` (`step_type`),
  CONSTRAINT `fk_distribution_program_workflow_steps_workflow` FOREIGN KEY (`workflow_id`) REFERENCES `distribution_program_workflows` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `distribution_program_required_documents` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `workflow_id` INT NOT NULL,
  `document_key` VARCHAR(80) NOT NULL,
  `document_label` VARCHAR(160) NOT NULL,
  `is_required` TINYINT NOT NULL DEFAULT 1,
  `applies_when` VARCHAR(120) NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_program_required_docs_key` (`workflow_id`, `document_key`),
  KEY `idx_distribution_program_required_docs_workflow` (`workflow_id`),
  KEY `idx_distribution_program_required_docs_required` (`is_required`),
  KEY `idx_distribution_program_required_docs_order` (`workflow_id`, `display_order`),
  CONSTRAINT `fk_distribution_program_required_docs_workflow` FOREIGN KEY (`workflow_id`) REFERENCES `distribution_program_workflows` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `distribution_deal_document_statuses` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `deal_id` INT NOT NULL,
  `document_key` VARCHAR(80) NOT NULL,
  `is_received` TINYINT NOT NULL DEFAULT 0,
  `received_at` TIMESTAMP NULL,
  `received_by_user_id` INT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_deal_document_statuses_key` (`deal_id`, `document_key`),
  KEY `idx_distribution_deal_document_statuses_deal` (`deal_id`),
  KEY `idx_distribution_deal_document_statuses_received` (`is_received`),
  KEY `idx_distribution_deal_document_statuses_updated_at` (`updated_at`),
  CONSTRAINT `fk_distribution_deal_document_statuses_deal` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deal_document_statuses_received_by` FOREIGN KEY (`received_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `distribution_deal_bank_outcomes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `deal_id` INT NOT NULL,
  `bank_code` VARCHAR(32) NOT NULL,
  `bank_name` VARCHAR(120) NOT NULL,
  `status` ENUM('pending', 'approved', 'declined', 'withdrawn') NOT NULL DEFAULT 'pending',
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `outcome_at` TIMESTAMP NULL,
  `selected_for_client` TINYINT NOT NULL DEFAULT 0,
  `selection_rank` INT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_deal_bank_outcomes_bank` (`deal_id`, `bank_code`),
  KEY `idx_distribution_deal_bank_outcomes_deal` (`deal_id`),
  KEY `idx_distribution_deal_bank_outcomes_status` (`status`),
  KEY `idx_distribution_deal_bank_outcomes_selected` (`selected_for_client`),
  KEY `idx_distribution_deal_bank_outcomes_updated_at` (`updated_at`),
  CONSTRAINT `fk_distribution_deal_bank_outcomes_deal` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE
);

-- Seed one workflow definition per program (Cosmopolitan defaults to multi-bank simultaneous).
INSERT INTO `distribution_program_workflows` (
  `program_id`,
  `workflow_key`,
  `workflow_name`,
  `bank_strategy`,
  `turnaround_hours`,
  `is_active`,
  `config_json`
)
SELECT
  p.`id` AS program_id,
  CASE
    WHEN LOWER(COALESCE(d.`name`, '')) LIKE '%cosmopolitan%' OR LOWER(COALESCE(d.`name`, '')) LIKE '%cosmo%'
      THEN 'cosmopolitan_jhb_multibank'
    ELSE 'default_referral_workflow'
  END AS workflow_key,
  CASE
    WHEN LOWER(COALESCE(d.`name`, '')) LIKE '%cosmopolitan%' OR LOWER(COALESCE(d.`name`, '')) LIKE '%cosmo%'
      THEN 'Cosmopolitan JHB Referral Program'
    ELSE CONCAT(COALESCE(d.`name`, 'Development'), ' Referral Workflow')
  END AS workflow_name,
  CASE
    WHEN LOWER(COALESCE(d.`name`, '')) LIKE '%cosmopolitan%' OR LOWER(COALESCE(d.`name`, '')) LIKE '%cosmo%'
      THEN 'multi_simultaneous'
    ELSE 'single'
  END AS bank_strategy,
  CASE
    WHEN LOWER(COALESCE(d.`name`, '')) LIKE '%cosmopolitan%' OR LOWER(COALESCE(d.`name`, '')) LIKE '%cosmo%'
      THEN 48
    ELSE 72
  END AS turnaround_hours,
  1 AS is_active,
  NULL AS config_json
FROM `distribution_programs` p
INNER JOIN `developments` d ON d.`id` = p.`development_id`
LEFT JOIN `distribution_program_workflows` w ON w.`program_id` = p.`id`
WHERE w.`id` IS NULL;

-- Cosmopolitan step template.
INSERT IGNORE INTO `distribution_program_workflow_steps` (
  `workflow_id`,
  `step_key`,
  `step_label`,
  `step_type`,
  `step_order`,
  `is_blocking`,
  `metadata`
)
SELECT `id`, 'qualification', 'Qualification', 'internal', 10, 0, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'viewing_completed', 'Viewing Completed', 'internal', 20, 1, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'documents_collected', 'Cosmo Documents Complete', 'document', 30, 1, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'bank_submission', 'Submitted to FNB / STD / NED / ABSA', 'bank', 40, 1, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'bank_decision', 'Bank Outcomes Tracked', 'decision', 50, 1, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'bank_selected', 'Final Bank Selected', 'decision', 60, 1, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'bond_approved', 'Final Bond Approval', 'closure', 70, 1, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'contract_signed', 'Contract Signed', 'closure', 80, 1, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'commission_paid', 'Commission Paid', 'closure', 90, 0, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank';

-- Generic fallback step template.
INSERT IGNORE INTO `distribution_program_workflow_steps` (
  `workflow_id`,
  `step_key`,
  `step_label`,
  `step_type`,
  `step_order`,
  `is_blocking`,
  `metadata`
)
SELECT `id`, 'viewing_scheduled', 'Viewing Scheduled', 'internal', 10, 0, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` <> 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'application_submitted', 'Application Submitted', 'internal', 20, 1, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` <> 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'contract_signed', 'Contract Signed', 'closure', 30, 1, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` <> 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'bond_approved', 'Bond Approved', 'closure', 40, 1, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` <> 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'commission_paid', 'Commission Paid', 'closure', 50, 0, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` <> 'cosmopolitan_jhb_multibank';

-- Cosmopolitan required docs.
INSERT IGNORE INTO `distribution_program_required_documents` (
  `workflow_id`,
  `document_key`,
  `document_label`,
  `is_required`,
  `applies_when`,
  `display_order`,
  `notes`
)
SELECT `id`, 'id_copy', 'ID copy', 1, NULL, 10, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'marriage_certificate', 'Marriage certificate', 0, 'if_married', 20, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'nca_form', 'NCA form', 1, NULL, 30, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'popia_form', 'POPIA form (EUF)', 1, NULL, 40, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'price_structure', 'Price structure', 1, NULL, 50, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'plan', 'Plan', 1, NULL, 60, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'payslips_3_months', 'Payslips (3 months)', 1, NULL, 70, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'bank_statements_3_months', 'Bank statements (3 months)', 1, NULL, 80, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` = 'cosmopolitan_jhb_multibank';

-- Generic required docs.
INSERT IGNORE INTO `distribution_program_required_documents` (
  `workflow_id`,
  `document_key`,
  `document_label`,
  `is_required`,
  `applies_when`,
  `display_order`,
  `notes`
)
SELECT `id`, 'id_copy', 'ID copy', 1, NULL, 10, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` <> 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'payslips_3_months', 'Payslips (3 months)', 1, NULL, 20, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` <> 'cosmopolitan_jhb_multibank'
UNION ALL
SELECT `id`, 'bank_statements_3_months', 'Bank statements (3 months)', 1, NULL, 30, NULL
FROM `distribution_program_workflows`
WHERE `workflow_key` <> 'cosmopolitan_jhb_multibank';
