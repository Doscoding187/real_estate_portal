CREATE TABLE IF NOT EXISTS `distribution_agent_access` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `program_id` INT NOT NULL,
  `development_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `min_tier_required` ENUM('tier_1','tier_2','tier_3','tier_4') NOT NULL DEFAULT 'tier_1',
  `access_status` ENUM('active','paused','revoked') NOT NULL DEFAULT 'active',
  `granted_by` INT,
  `granted_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `revoked_at` TIMESTAMP NULL,
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_agent_access_program_agent` (`program_id`,`agent_id`),
  KEY `idx_distribution_agent_access_agent` (`agent_id`),
  KEY `idx_distribution_agent_access_development` (`development_id`),
  KEY `idx_distribution_agent_access_status` (`access_status`),
  KEY `idx_distribution_agent_access_updated_at` (`updated_at`),
  CONSTRAINT `fk_distribution_agent_access_program` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_agent_access_development` FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_agent_access_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_agent_access_granted_by` FOREIGN KEY (`granted_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `distribution_agent_access`;


