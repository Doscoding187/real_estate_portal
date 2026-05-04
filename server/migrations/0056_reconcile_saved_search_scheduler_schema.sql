-- Reconcile scheduler tables with the current Drizzle column names.

ALTER TABLE `platform_settings` RENAME COLUMN `key` TO `setting_key`;
ALTER TABLE `platform_settings` RENAME COLUMN `value` TO `setting_value`;

ALTER TABLE `saved_searches` RENAME COLUMN `userId` TO `user_id`;
ALTER TABLE `saved_searches` RENAME COLUMN `notificationFrequency` TO `notification_frequency`;
ALTER TABLE `saved_searches` RENAME COLUMN `lastNotifiedAt` TO `last_notified_at`;
ALTER TABLE `saved_searches` RENAME COLUMN `createdAt` TO `created_at`;
ALTER TABLE `saved_searches` RENAME COLUMN `updatedAt` TO `updated_at`;

CREATE INDEX IF NOT EXISTS `idx_saved_searches_user` ON `saved_searches` (`user_id`);
CREATE INDEX IF NOT EXISTS `idx_saved_searches_frequency` ON `saved_searches` (`notification_frequency`);

CREATE TABLE IF NOT EXISTS `saved_search_delivery_history` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `saved_search_id` INT NULL,
  `user_id` INT NOT NULL,
  `search_name` VARCHAR(255) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `content` TEXT NOT NULL,
  `saved_search_listing_source` ENUM('manual','development','all') NOT NULL DEFAULT 'all',
  `saved_search_delivery_frequency` ENUM('instant','daily','weekly','never') NOT NULL DEFAULT 'daily',
  `total_matches` INT NOT NULL DEFAULT 0,
  `new_match_count` INT NOT NULL DEFAULT 0,
  `in_app_requested` TINYINT NOT NULL DEFAULT 0,
  `email_requested` TINYINT NOT NULL DEFAULT 0,
  `in_app_delivered` TINYINT NOT NULL DEFAULT 0,
  `email_delivered` TINYINT NOT NULL DEFAULT 0,
  `saved_search_delivery_status` ENUM('delivered','partial','skipped','failed') NOT NULL DEFAULT 'delivered',
  `saved_search_delivery_retry_state` ENUM(
    'not_needed',
    'pending',
    'retrying',
    'succeeded',
    'abandoned'
  ) NOT NULL DEFAULT 'not_needed',
  `retry_count` INT NOT NULL DEFAULT 0,
  `max_retry_count` INT NOT NULL DEFAULT 3,
  `next_retry_at` TIMESTAMP NULL,
  `last_retry_at` TIMESTAMP NULL,
  `action_url` VARCHAR(500) NULL,
  `preview_matches` JSON NULL,
  `error` TEXT NULL,
  `processed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_saved_search_delivery_history_saved_search` (`saved_search_id`),
  KEY `idx_saved_search_delivery_history_user` (`user_id`),
  KEY `idx_saved_search_delivery_history_status` (`saved_search_delivery_status`),
  KEY `idx_saved_search_delivery_history_retry_state` (`saved_search_delivery_retry_state`),
  KEY `idx_saved_search_delivery_history_next_retry` (`next_retry_at`),
  KEY `idx_saved_search_delivery_history_processed` (`processed_at`),
  CONSTRAINT `fk_saved_search_delivery_history_saved_search`
    FOREIGN KEY (`saved_search_id`) REFERENCES `saved_searches` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_saved_search_delivery_history_user`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
);
