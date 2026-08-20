CREATE TABLE `land_review_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `review_case_id` int NOT NULL,
  `submission_sequence` int NOT NULL,
  `actor_user_id` int,
  `event_type` enum('submitted','review_started','changes_requested','resubmitted','rejected','approved','suspended','reopened') NOT NULL,
  `previous_state` varchar(32),
  `next_state` varchar(32) NOT NULL,
  `reason_code` varchar(100),
  `comment` text,
  `metadata` json,
  `occurred_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_land_review_events_case_time` (`review_case_id`,`occurred_at`),
  KEY `idx_land_review_events_case_submission` (`review_case_id`,`submission_sequence`),
  CONSTRAINT `fk_land_review_event_case` FOREIGN KEY (`review_case_id`) REFERENCES `land_review_cases` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_land_review_event_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
