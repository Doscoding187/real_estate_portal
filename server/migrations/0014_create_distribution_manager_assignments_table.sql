CREATE TABLE IF NOT EXISTS `distribution_manager_assignments` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `program_id` INT NOT NULL,
  `development_id` INT NOT NULL,
  `manager_user_id` INT NOT NULL,
  `is_primary` TINYINT NOT NULL DEFAULT 0,
  `workload_capacity` INT NOT NULL DEFAULT 0,
  `timezone` VARCHAR(64),
  `is_active` TINYINT NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_manager_assignment_program_manager` (`program_id`,`manager_user_id`),
  KEY `idx_distribution_manager_assignments_manager` (`manager_user_id`),
  KEY `idx_distribution_manager_assignments_development` (`development_id`),
  KEY `idx_distribution_manager_assignments_active` (`is_active`),
  CONSTRAINT `fk_distribution_manager_assignments_program` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_manager_assignments_development` FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_distribution_manager_assignments_manager` FOREIGN KEY (`manager_user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `distribution_manager_assignments`;


