-- Reconcile tables present in the current Drizzle schema/runtime readiness
-- checks but missing from committed SQL migration history.
--
-- This intentionally does not copy the old local reconciliation migrations:
-- distribution core tables and distribution_identities are already covered by
-- drizzle/migrations/0006_30007_distribution_core_tables.sql.

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

CREATE TABLE IF NOT EXISTS `analytics_events` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL,
  `session_id` VARCHAR(100) NOT NULL,
  `event_type` VARCHAR(50) NOT NULL,
  `event_data` JSON NULL,
  `url` TEXT NULL,
  `referrer` TEXT NULL,
  `user_agent` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_analytics_events_user` (`user_id`),
  KEY `idx_analytics_events_type` (`event_type`),
  KEY `idx_analytics_events_created` (`created_at`)
);
