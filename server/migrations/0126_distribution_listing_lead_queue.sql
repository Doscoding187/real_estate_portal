-- Operational work assignment is separate from primary lead custody and delivery.
CREATE TABLE `distribution_listing_lead_queue` (
  `id` int AUTO_INCREMENT NOT NULL,
  `lead_id` int NOT NULL,
  `source` enum('platform_published_listing','pilot_search_results_unit') NOT NULL,
  `status` enum('open','closed') NOT NULL DEFAULT 'open',
  `assigned_agent_id` int,
  `assigned_by_user_id` int,
  `assigned_at` timestamp,
  `closed_by_user_id` int,
  `closed_at` timestamp,
  `close_reason` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `distribution_listing_lead_queue_id` PRIMARY KEY (`id`),
  CONSTRAINT `ux_distribution_listing_lead_queue_lead` UNIQUE (`lead_id`),
  KEY `idx_distribution_listing_lead_queue_status_created` (`status`,`created_at`),
  KEY `idx_distribution_listing_lead_queue_assignee` (`assigned_agent_id`,`status`),
  CONSTRAINT `distribution_listing_lead_queue_lead_id_fk` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `distribution_listing_lead_queue_assigned_agent_id_fk` FOREIGN KEY (`assigned_agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `distribution_listing_lead_queue_assigned_by_user_id_fk` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `distribution_listing_lead_queue_closed_by_user_id_fk` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
