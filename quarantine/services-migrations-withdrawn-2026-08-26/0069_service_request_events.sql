CREATE TABLE `service_request_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `introduction_id` int,
  `event_type` enum('request_created','request_updated','request_cancelled','request_closed_no_match','request_closed_matched','shortlist_computed','introduction_created','introduction_viewed','introduction_accepted','introduction_declined','introduction_contacted','quote_requested','quote_submitted','introduction_shortlisted','provider_hired','work_completed','introduction_lost','introduction_no_response','introduction_expired','recommendations_shown','provider_card_clicked','results_empty_shown','note_added') NOT NULL,
  `actor_user_id` int,
  `actor_type` enum('consumer','provider','admin','system') NOT NULL DEFAULT 'system',
  `payload` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_request_events_request` (`request_id`),
  KEY `idx_service_request_events_introduction` (`introduction_id`),
  KEY `idx_service_request_events_type` (`event_type`),
  KEY `idx_service_request_events_created` (`created_at`),
  CONSTRAINT `fk_service_request_events_request` FOREIGN KEY (`request_id`) REFERENCES `service_requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_service_request_events_introduction` FOREIGN KEY (`introduction_id`) REFERENCES `service_introductions` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_service_request_events_actor` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
