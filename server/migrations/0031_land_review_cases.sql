CREATE TABLE `land_review_cases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `listing_id` int NOT NULL,
  `state` enum('draft','pending','reviewing','changes_requested','approved','rejected','suspended') NOT NULL DEFAULT 'draft',
  `submission_sequence` int NOT NULL DEFAULT 0,
  `current_reviewer_user_id` int,
  `decision_by_user_id` int,
  `submitted_at` timestamp NULL,
  `reviewed_at` timestamp NULL,
  `decided_at` timestamp NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_land_review_cases_listing` (`listing_id`),
  KEY `idx_land_review_cases_state` (`state`,`updated_at`),
  CONSTRAINT `fk_land_review_case_listing` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_land_review_case_current_reviewer` FOREIGN KEY (`current_reviewer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_land_review_case_decision_by` FOREIGN KEY (`decision_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
