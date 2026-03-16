CREATE TABLE IF NOT EXISTS `distribution_viewings` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `deal_id` INT NOT NULL,
  `program_id` INT NOT NULL,
  `development_id` INT NOT NULL,
  `agent_id` INT NOT NULL,
  `manager_user_id` INT NOT NULL,
  `scheduled_start_at` TIMESTAMP NOT NULL,
  `scheduled_end_at` TIMESTAMP NULL,
  `timezone` VARCHAR(64) NOT NULL DEFAULT 'Africa/Johannesburg',
  `location_name` VARCHAR(255),
  `status` ENUM('scheduled','completed','no_show','cancelled') NOT NULL DEFAULT 'scheduled',
  `reschedule_count` INT NOT NULL DEFAULT 0,
  `scheduled_by_user_id` INT,
  `last_rescheduled_by` INT,
  `notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_viewings_deal` (`deal_id`),
  KEY `idx_distribution_viewings_program` (`program_id`),
  KEY `idx_distribution_viewings_development` (`development_id`),
  KEY `idx_distribution_viewings_agent` (`agent_id`),
  KEY `idx_distribution_viewings_manager` (`manager_user_id`),
  KEY `idx_distribution_viewings_start` (`scheduled_start_at`),
  KEY `idx_distribution_viewings_status` (`status`),
  CONSTRAINT `fk_distribution_viewings_deal` FOREIGN KEY (`deal_id`) REFERENCES `distribution_deals` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_viewings_program` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_viewings_development` FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_viewings_agent` FOREIGN KEY (`agent_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_viewings_manager` FOREIGN KEY (`manager_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_viewings_scheduled_by` FOREIGN KEY (`scheduled_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_viewings_last_rescheduled_by` FOREIGN KEY (`last_rescheduled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `distribution_viewings`;


