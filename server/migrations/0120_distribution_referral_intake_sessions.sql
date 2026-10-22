-- Pin each private intake session to the exact published program policy before prospect data is collected.
CREATE TABLE `distribution_referral_intake_sessions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `session_uuid` varchar(36) NOT NULL,
  `policy_release_id` int NOT NULL,
  `policy_version` int NOT NULL,
  `policy_configuration_digest` varchar(64) NOT NULL,
  `partner_user_id` int,
  `status` enum('draft','submitted','withdrawn','closed','expired') NOT NULL DEFAULT 'draft',
  `draft_expires_at` timestamp NOT NULL,
  `submitted_at` timestamp,
  `withdrawn_at` timestamp,
  `closed_at` timestamp,
  `expired_at` timestamp,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_referral_intake_sessions_id` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_referral_intake_session_uuid` UNIQUE (`session_uuid`),
  KEY `idx_distribution_referral_intake_sessions_status_expiry` (`status`,`draft_expires_at`),
  KEY `idx_distribution_referral_intake_sessions_partner_status` (`partner_user_id`,`status`),
  KEY `idx_distribution_referral_intake_sessions_policy` (`policy_release_id`),
  CONSTRAINT `distribution_referral_intake_sessions_policy_release_id_fk` FOREIGN KEY (`policy_release_id`) REFERENCES `distribution_referral_intake_policy_releases` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `distribution_referral_intake_sessions_partner_user_id_fk` FOREIGN KEY (`partner_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
