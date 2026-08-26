CREATE TABLE `provider_verifications` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` int NOT NULL,
  `dimension` enum('identity','business_registration','professional_registration','regulatory_status','licence_certification','insurance','contact','platform_history') NOT NULL,
  `status` enum('unverified','submitted','verified','failed','expired') NOT NULL DEFAULT 'unverified',
  `evidence_refs` json,
  `verified_by_user_id` int,
  `verified_at` timestamp,
  `expires_at` timestamp,
  `notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_provider_verifications_provider` (`provider_id`),
  KEY `idx_provider_verifications_dimension` (`provider_id`,`dimension`),
  CONSTRAINT `fk_provider_verifications_provider` FOREIGN KEY (`provider_id`) REFERENCES `service_providers` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_provider_verifications_verifier` FOREIGN KEY (`verified_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
