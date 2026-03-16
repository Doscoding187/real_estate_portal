CREATE TABLE IF NOT EXISTS `distribution_commission_entries` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `deal_id` INT NOT NULL,
  `program_id` INT NOT NULL,
  `development_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `calculation_base_amount` INT NOT NULL DEFAULT 0,
  `commission_percent` DECIMAL(5,2),
  `commission_amount` INT NOT NULL DEFAULT 0,
  `currency` VARCHAR(10) NOT NULL DEFAULT 'ZAR',
  `trigger_stage` ENUM('contract_signed','bond_approved') NOT NULL,
  `entry_status` ENUM('pending','approved','paid','cancelled') NOT NULL DEFAULT 'pending',
  `approved_at` TIMESTAMP NULL,
  `approved_by` INT,
  `paid_at` TIMESTAMP NULL,
  `paid_by` INT,
  `payment_reference` VARCHAR(100),
  `notes` TEXT,
  `created_by` INT,
  `updated_by` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_commission_entry_deal_trigger` (`deal_id`,`trigger_stage`),
  KEY `idx_distribution_commission_entries_program` (`program_id`),
  KEY `idx_distribution_commission_entries_development` (`development_id`),
  KEY `idx_distribution_commission_entries_agent` (`agent_id`),
  KEY `idx_distribution_commission_entries_status` (`entry_status`),
  KEY `idx_distribution_commission_entries_updated_at` (`updated_at`),
  CONSTRAINT `fk_distribution_commission_entries_deal` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_commission_entries_program` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_commission_entries_development` FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_commission_entries_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_commission_entries_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_commission_entries_paid_by` FOREIGN KEY (`paid_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_commission_entries_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_commission_entries_updated_by` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `distribution_commission_entries`;


