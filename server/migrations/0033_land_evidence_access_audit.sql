CREATE TABLE `land_evidence_access_audit` (
  `id` int NOT NULL AUTO_INCREMENT,
  `evidence_document_id` int NOT NULL,
  `actor_user_id` int,
  `action` enum('view','retrieve','signed_access','download') NOT NULL,
  `authorization_outcome` enum('allowed','denied') NOT NULL,
  `access_context` enum('author_custodian','agency_custodian','land_reviewer','platform_admin','other') NOT NULL,
  `organisation_id` int,
  `request_correlation_id` varchar(100),
  `occurred_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_land_evidence_access_document_time` (`evidence_document_id`,`occurred_at`),
  KEY `idx_land_evidence_access_actor_time` (`actor_user_id`,`occurred_at`),
  CONSTRAINT `fk_land_evidence_access_document` FOREIGN KEY (`evidence_document_id`) REFERENCES `land_evidence_documents` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_land_evidence_access_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
