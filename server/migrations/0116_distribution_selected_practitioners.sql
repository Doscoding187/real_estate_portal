-- Curated listing-lead practitioners are distinct from general referral partners.
CREATE TABLE `distribution_selected_practitioners` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agent_id` int NOT NULL,
  `status` enum('active','paused','revoked') NOT NULL DEFAULT 'active',
  `added_by_user_id` int,
  `status_changed_by_user_id` int,
  `status_changed_at` timestamp,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_selected_practitioners_id` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_selected_practitioners_agent` UNIQUE (`agent_id`),
  KEY `idx_distribution_selected_practitioners_status` (`status`),
  CONSTRAINT `distribution_selected_practitioners_agent_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents` (`id`) ON DELETE CASCADE,
  CONSTRAINT `distribution_selected_practitioners_added_by_user_id_fk` FOREIGN KEY (`added_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `distribution_selected_practitioners_status_changed_by_user_id_fk` FOREIGN KEY (`status_changed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
