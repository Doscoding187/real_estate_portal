-- Keep an append-only, PII-free record of intake and evidence lifecycle actions.
CREATE TABLE `distribution_referral_intake_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `session_id` int NOT NULL,
  `evidence_id` int,
  `event_type` enum('session_created','evidence_uploaded','evidence_reviewed','referral_submitted','referral_withdrawn','referral_closed','session_expired','evidence_deleted','evidence_deletion_failed') NOT NULL,
  `actor_user_id` int,
  `details` json,
  `occurred_at` timestamp NOT NULL DEFAULT (now()),
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `distribution_referral_intake_events_id` PRIMARY KEY (`id`),
  KEY `idx_distribution_referral_intake_events_session_time` (`session_id`,`occurred_at`),
  KEY `idx_distribution_referral_intake_events_evidence_time` (`evidence_id`,`occurred_at`),
  KEY `idx_distribution_referral_intake_events_type_time` (`event_type`,`occurred_at`),
  CONSTRAINT `distribution_referral_intake_events_session_id_fk` FOREIGN KEY (`session_id`) REFERENCES `distribution_referral_intake_sessions` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `distribution_referral_intake_events_evidence_id_fk` FOREIGN KEY (`evidence_id`) REFERENCES `distribution_referral_intake_evidence` (`id`) ON DELETE SET NULL,
  CONSTRAINT `distribution_referral_intake_events_actor_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
