CREATE TABLE IF NOT EXISTS `distribution_viewing_validations` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `deal_id` INT NOT NULL,
  `development_id` INT NOT NULL,
  `manager_user_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `validation_status` ENUM('pending','completed_proceeding','completed_not_proceeding','no_show','cancelled') NOT NULL DEFAULT 'pending',
  `attribution_lock_applied` TINYINT NOT NULL DEFAULT 0,
  `attribution_lock_at` TIMESTAMP NULL,
  `validated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_distribution_viewing_validations_deal` (`deal_id`),
  KEY `idx_distribution_viewing_validations_status` (`validation_status`),
  KEY `idx_distribution_viewing_validations_validated_at` (`validated_at`),
  CONSTRAINT `fk_distribution_viewing_validations_deal` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_viewing_validations_development` FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_viewing_validations_manager` FOREIGN KEY (`manager_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_viewing_validations_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `distribution_viewing_validations`;


