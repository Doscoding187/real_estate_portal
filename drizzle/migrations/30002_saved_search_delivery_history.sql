CREATE TABLE `saved_search_delivery_history` (
  `id` int AUTO_INCREMENT NOT NULL,
  `saved_search_id` int,
  `user_id` int NOT NULL,
  `search_name` varchar(255) NOT NULL,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `listingSource` enum('manual','development','all') NOT NULL DEFAULT 'all',
  `notificationFrequency` enum('instant','daily','weekly','never') NOT NULL DEFAULT 'daily',
  `total_matches` int NOT NULL DEFAULT 0,
  `new_match_count` int NOT NULL DEFAULT 0,
  `in_app_requested` tinyint NOT NULL DEFAULT 0,
  `email_requested` tinyint NOT NULL DEFAULT 0,
  `in_app_delivered` tinyint NOT NULL DEFAULT 0,
  `email_delivered` tinyint NOT NULL DEFAULT 0,
  `status` enum('delivered','partial','skipped','failed') NOT NULL DEFAULT 'delivered',
  `action_url` varchar(500),
  `preview_matches` json,
  `error` text,
  `processed_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `saved_search_delivery_history_id` PRIMARY KEY(`id`),
  CONSTRAINT `saved_search_delivery_history_saved_search_id_saved_searches_id_fk`
    FOREIGN KEY (`saved_search_id`) REFERENCES `saved_searches`(`id`) ON DELETE SET NULL ON UPDATE NO ACTION,
  CONSTRAINT `saved_search_delivery_history_user_id_users_id_fk`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE NO ACTION
);
--> statement-breakpoint
CREATE INDEX `idx_saved_search_delivery_history_saved_search` ON `saved_search_delivery_history` (`saved_search_id`);
--> statement-breakpoint
CREATE INDEX `idx_saved_search_delivery_history_user` ON `saved_search_delivery_history` (`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_saved_search_delivery_history_status` ON `saved_search_delivery_history` (`status`);
--> statement-breakpoint
CREATE INDEX `idx_saved_search_delivery_history_processed` ON `saved_search_delivery_history` (`processed_at`);
