CREATE TABLE `land_assertion_evidence` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assertion_id` int NOT NULL,
  `evidence_document_id` int NOT NULL,
  `relationship` enum('supports','contradicts','context') NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  CONSTRAINT `uq_land_assertion_evidence` UNIQUE (`assertion_id`,`evidence_document_id`),
  CONSTRAINT `fk_land_assertion_evidence_assertion` FOREIGN KEY (`assertion_id`) REFERENCES `land_verification_assertions` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_land_assertion_evidence_document` FOREIGN KEY (`evidence_document_id`) REFERENCES `land_evidence_documents` (`id`) ON DELETE RESTRICT
);
