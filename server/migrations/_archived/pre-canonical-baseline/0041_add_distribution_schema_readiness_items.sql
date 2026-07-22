CREATE TABLE IF NOT EXISTS `development_manager_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `development_id` INT NOT NULL,
  `manager_user_id` INT NOT NULL,
  `is_primary` TINYINT NOT NULL DEFAULT 0,
  `workload_capacity` INT NOT NULL DEFAULT 0,
  `timezone` VARCHAR(64) NULL,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `assigned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_development_manager_assignment_development_manager` (`development_id`, `manager_user_id`),
  KEY `idx_development_manager_assignments_manager` (`manager_user_id`),
  KEY `idx_development_manager_assignments_development` (`development_id`),
  KEY `idx_development_manager_assignments_active` (`is_active`),
  CONSTRAINT `fk_development_manager_assignments_development`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_development_manager_assignments_manager`
    FOREIGN KEY (`manager_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

ALTER TABLE `distribution_programs`
  ADD COLUMN `payout_milestone` ENUM(
    'attorney_instruction',
    'attorney_signing',
    'bond_approval',
    'transfer_registration',
    'occupation',
    'custom'
  ) NOT NULL DEFAULT 'attorney_signing' AFTER `tier_access_policy`;

ALTER TABLE `distribution_programs`
  ADD COLUMN `payout_milestone_notes` TEXT NULL AFTER `payout_milestone`;

ALTER TABLE `distribution_programs`
  ADD COLUMN `currency_code` VARCHAR(3) NOT NULL DEFAULT 'ZAR' AFTER `payout_milestone_notes`;

UPDATE `distribution_programs`
SET
  `payout_milestone` = COALESCE(`payout_milestone`, 'attorney_signing'),
  `currency_code` = COALESCE(NULLIF(TRIM(`currency_code`), ''), 'ZAR')
WHERE
  `payout_milestone` IS NULL
  OR `currency_code` IS NULL
  OR TRIM(`currency_code`) = '';
