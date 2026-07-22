-- Ensure the core analytics event table exists for Agent OS event logging.

CREATE TABLE IF NOT EXISTS `analytics_events` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `user_id` INT NULL,
  `session_id` VARCHAR(100) NOT NULL,
  `event_type` VARCHAR(50) NOT NULL,
  `event_data` JSON NULL,
  `url` TEXT NULL,
  `referrer` TEXT NULL,
  `user_agent` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_analytics_events_user` (`user_id`),
  KEY `idx_analytics_events_type` (`event_type`),
  KEY `idx_analytics_events_created` (`created_at`)
);
