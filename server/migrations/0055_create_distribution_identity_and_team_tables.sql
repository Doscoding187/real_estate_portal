-- Create distribution identity and platform team registration tables used by the
-- distribution admin schema readiness gate.

CREATE TABLE IF NOT EXISTS `distribution_identities` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `identity_type` ENUM('referrer','manager') NOT NULL,
  `active` TINYINT NOT NULL DEFAULT 1,
  `display_name` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_distribution_identity_user_type` (`user_id`, `identity_type`),
  KEY `idx_distribution_identities_type_active` (`identity_type`, `active`),
  CONSTRAINT `fk_distribution_identities_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `platform_team_registrations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `full_name` VARCHAR(200) NOT NULL,
  `email` VARCHAR(320) NOT NULL,
  `phone` VARCHAR(50) NULL,
  `company` VARCHAR(200) NULL,
  `current_role` VARCHAR(150) NULL,
  `requested_area` ENUM(
    'distribution_manager',
    'agent',
    'agency_operations',
    'developer_operations',
    'other'
  ) NOT NULL DEFAULT 'distribution_manager',
  `notes` TEXT NULL,
  `status` ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `user_id` INT NULL,
  `reviewed_by` INT NULL,
  `reviewed_at` TIMESTAMP NULL,
  `review_notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_platform_team_registrations_email` (`email`),
  KEY `idx_platform_team_registrations_status` (`status`),
  KEY `idx_platform_team_registrations_area` (`requested_area`),
  KEY `idx_platform_team_registrations_user` (`user_id`),
  KEY `idx_platform_team_registrations_created` (`created_at`),
  CONSTRAINT `fk_platform_team_registrations_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_platform_team_registrations_reviewed_by`
    FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
