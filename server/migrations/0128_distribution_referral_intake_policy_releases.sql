-- Store immutable published intake policies and editable program-scoped drafts.
CREATE TABLE `distribution_referral_intake_policy_releases` (
  `id` int AUTO_INCREMENT NOT NULL,
  `program_id` int NOT NULL,
  `policy_version` int NOT NULL,
  `status` enum('draft','active','retired') NOT NULL DEFAULT 'draft',
  `configuration` json NOT NULL,
  `configuration_digest` varchar(64) NOT NULL,
  `approval_reference` varchar(180),
  `published_by` int,
  `published_at` timestamp,
  `created_by` int,
  `updated_by` int,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_referral_intake_policy_releases_id` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_intake_policy_program_version` UNIQUE (`program_id`,`policy_version`),
  KEY `idx_distribution_intake_policy_program_status` (`program_id`,`status`),
  KEY `idx_distribution_intake_policy_published_at` (`published_at`),
  CONSTRAINT `distribution_referral_intake_policy_releases_program_id_fk` FOREIGN KEY (`program_id`) REFERENCES `distribution_programs` (`id`) ON DELETE CASCADE,
  CONSTRAINT `distribution_referral_intake_policy_releases_published_by_fk` FOREIGN KEY (`published_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `distribution_referral_intake_policy_releases_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `distribution_referral_intake_policy_releases_updated_by_fk` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
