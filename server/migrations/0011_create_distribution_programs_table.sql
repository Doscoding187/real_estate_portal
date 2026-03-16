CREATE TABLE IF NOT EXISTS `distribution_programs` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `development_id` INT NOT NULL,
  `is_referral_enabled` TINYINT NOT NULL DEFAULT 0,
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `commission_model` ENUM('flat_percentage','tiered_percentage','fixed_amount','hybrid') NOT NULL DEFAULT 'flat_percentage',
  `default_commission_percent` DECIMAL(5,2),
  `default_commission_amount` INT,
  `tier_access_policy` ENUM('open','restricted','invite_only') NOT NULL DEFAULT 'restricted',
  `created_by` INT,
  `updated_by` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_program_development` (`development_id`),
  KEY `idx_distribution_programs_is_active` (`is_active`),
  KEY `idx_distribution_programs_referral_enabled` (`is_referral_enabled`),
  KEY `idx_distribution_programs_updated_at` (`updated_at`),
  CONSTRAINT `fk_distribution_programs_development` FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_programs_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_programs_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `distribution_programs`;


