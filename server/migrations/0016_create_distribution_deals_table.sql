CREATE TABLE IF NOT EXISTS `distribution_deals` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `program_id` INT NOT NULL,
  `development_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `manager_user_id` INT,
  `external_ref` VARCHAR(100),
  `buyer_name` VARCHAR(200) NOT NULL,
  `buyer_email` VARCHAR(320),
  `buyer_phone` VARCHAR(50),
  `current_stage` ENUM('viewing_scheduled','viewing_completed','application_submitted','contract_signed','bond_approved','commission_pending','commission_paid','cancelled') NOT NULL DEFAULT 'viewing_scheduled',
  `commission_trigger_stage` ENUM('contract_signed','bond_approved') NOT NULL DEFAULT 'contract_signed',
  `commission_status` ENUM('not_ready','pending','approved','paid','cancelled') NOT NULL DEFAULT 'not_ready',
  `attribution_locked_at` TIMESTAMP NULL,
  `attribution_locked_by` INT,
  `submitted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `closed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_deal_external_ref` (`external_ref`),
  KEY `idx_distribution_deals_program` (`program_id`),
  KEY `idx_distribution_deals_development` (`development_id`),
  KEY `idx_distribution_deals_agent` (`agent_id`),
  KEY `idx_distribution_deals_manager` (`manager_user_id`),
  KEY `idx_distribution_deals_current_stage` (`current_stage`),
  KEY `idx_distribution_deals_commission_status` (`commission_status`),
  KEY `idx_distribution_deals_submitted_at` (`submitted_at`),
  CONSTRAINT `fk_distribution_deals_program` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deals_development` FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deals_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_deals_manager` FOREIGN KEY (`manager_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_deals_locked_by` FOREIGN KEY (`attribution_locked_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `distribution_deals`;


