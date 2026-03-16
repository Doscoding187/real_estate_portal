CREATE TABLE IF NOT EXISTS `outcome_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `content_id` INT NOT NULL,
  `actor_id` INT NULL,
  `viewer_user_id` INT NULL,
  `outcome_type` ENUM('contactClick', 'leadSubmitted', 'viewingRequest', 'quoteRequest') NOT NULL,
  `session_id` VARCHAR(128) NOT NULL,
  `metadata` JSON NULL,
  `created_at` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_outcome_events_content_id` (`content_id`),
  KEY `idx_outcome_events_actor_id` (`actor_id`),
  KEY `idx_outcome_events_outcome_type` (`outcome_type`),
  KEY `idx_outcome_events_viewer_user_id` (`viewer_user_id`),
  KEY `idx_outcome_events_session_id` (`session_id`),
  KEY `idx_outcome_events_created_at` (`created_at`),
  CONSTRAINT `fk_outcome_events_content_id`
    FOREIGN KEY (`content_id`) REFERENCES `explore_content` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_outcome_events_actor_id`
    FOREIGN KEY (`actor_id`) REFERENCES `economic_actors` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_outcome_events_viewer_user_id`
    FOREIGN KEY (`viewer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
