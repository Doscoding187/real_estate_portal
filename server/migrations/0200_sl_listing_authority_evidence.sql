CREATE TABLE `sl_listing_authority_evidence` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `authority_id` INT NOT NULL,
  `storage_adapter` ENUM('local','s3') NOT NULL,
  `storage_key` VARCHAR(512) NOT NULL,
  `original_file_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(80) NOT NULL,
  `byte_size` INT NOT NULL,
  `uploaded_by_user_id` INT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sl_authority_evidence_storage_key` (`storage_key`),
  KEY `idx_sl_authority_evidence_authority` (`authority_id`,`created_at`),
  CONSTRAINT `fk_sl_authority_evidence_authority` FOREIGN KEY (`authority_id`) REFERENCES `sl_listing_authorities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sl_authority_evidence_uploader` FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT
);
