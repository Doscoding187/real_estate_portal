CREATE TABLE `sl_verifications` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `subject_type` ENUM('user','listing') NOT NULL,
  `subject_id` INT NOT NULL,
  `rung` ENUM('phone','email','relationship','property','student_accreditation') NOT NULL,
  `status` ENUM('verified','failed','revoked','pending_evidence') NOT NULL,
  `evidence_ref` VARCHAR(255) NULL,
  `reviewed_by` INT NULL,
  `notes` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_sl_verifications_subject` (`subject_type`,`subject_id`,`rung`,`status`),
  CONSTRAINT `fk_sl_verifications_reviewer` FOREIGN KEY (`reviewed_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
