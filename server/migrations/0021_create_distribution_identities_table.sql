CREATE TABLE IF NOT EXISTS `distribution_identities` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `user_id` INT NOT NULL,
  `identity_type` ENUM('referrer','manager') NOT NULL,
  `active` TINYINT NOT NULL DEFAULT 1,
  `display_name` VARCHAR(255),
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_identity_user_type` (`user_id`,`identity_type`),
  KEY `idx_distribution_identities_type_active` (`identity_type`,`active`),
  CONSTRAINT `fk_distribution_identities_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `distribution_identities`;


