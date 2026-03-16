CREATE TABLE IF NOT EXISTS `distribution_agent_tiers` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `agent_id` INT NOT NULL,
  `tier` ENUM('tier_1','tier_2','tier_3','tier_4') NOT NULL,
  `score` INT NOT NULL DEFAULT 0,
  `window_days` INT NOT NULL DEFAULT 90,
  `reason` TEXT,
  `effective_from` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `effective_to` TIMESTAMP NULL,
  `assigned_by` INT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_distribution_agent_tiers_agent` (`agent_id`),
  KEY `idx_distribution_agent_tiers_effective_to` (`effective_to`),
  KEY `idx_distribution_agent_tiers_tier` (`tier`),
  CONSTRAINT `fk_distribution_agent_tiers_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_agent_tiers_assigned_by` FOREIGN KEY (`assigned_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `distribution_agent_tiers`;


