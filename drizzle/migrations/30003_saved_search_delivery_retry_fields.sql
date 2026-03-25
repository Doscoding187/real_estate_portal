ALTER TABLE `saved_search_delivery_history`
  ADD `retry_state` enum('not_needed','pending','retrying','succeeded','abandoned') NOT NULL DEFAULT 'not_needed',
  ADD `retry_count` int NOT NULL DEFAULT 0,
  ADD `max_retry_count` int NOT NULL DEFAULT 3,
  ADD `next_retry_at` timestamp NULL,
  ADD `last_retry_at` timestamp NULL;
--> statement-breakpoint
CREATE INDEX `idx_saved_search_delivery_history_retry_state`
  ON `saved_search_delivery_history` (`retry_state`);
--> statement-breakpoint
CREATE INDEX `idx_saved_search_delivery_history_next_retry`
  ON `saved_search_delivery_history` (`next_retry_at`);
