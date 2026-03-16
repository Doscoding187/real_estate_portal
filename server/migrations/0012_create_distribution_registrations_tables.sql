CREATE TABLE IF NOT EXISTS `distribution_referrer_applications` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `requested_identity` ENUM('referrer','manager') NOT NULL DEFAULT 'referrer',
  `full_name` VARCHAR(200) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `phone` VARCHAR(50),
  `notes` TEXT,
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `user_id` INT,
  `reviewed_by` INT,
  `reviewed_at` TIMESTAMP NULL,
  `review_notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_distribution_referrer_applications_email` (`email`),
  KEY `idx_distribution_referrer_applications_status` (`status`),
  KEY `idx_distribution_referrer_applications_created` (`created_at`),
  CONSTRAINT `fk_distribution_referrer_applications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_distribution_referrer_applications_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `platform_team_registrations` (
  `id` INT AUTO_INCREMENT NOT NULL,
  `full_name` VARCHAR(200) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `phone` VARCHAR(50),
  `company` VARCHAR(200),
  `current_role` VARCHAR(150),
  `requested_area` ENUM('distribution_manager','agent','agency_operations','developer_operations','other') NOT NULL DEFAULT 'distribution_manager',
  `notes` TEXT,
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `user_id` INT,
  `reviewed_by` INT,
  `reviewed_at` TIMESTAMP NULL,
  `review_notes` TEXT,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_platform_team_registrations_email` (`email`),
  KEY `idx_platform_team_registrations_status` (`status`),
  KEY `idx_platform_team_registrations_area` (`requested_area`),
  KEY `idx_platform_team_registrations_user` (`user_id`),
  KEY `idx_platform_team_registrations_created` (`created_at`),
  CONSTRAINT `fk_platform_team_registrations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_platform_team_registrations_reviewed_by` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

-- DOWN (manual rollback, keep commented so runSqlMigrations.ts does not execute it)
-- DROP TABLE IF EXISTS `platform_team_registrations`;
-- DROP TABLE IF EXISTS `distribution_referrer_applications`;


