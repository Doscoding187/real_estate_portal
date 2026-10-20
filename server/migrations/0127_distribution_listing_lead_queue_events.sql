-- Append-only assignment history for the selected practitioner team queue.
CREATE TABLE `distribution_listing_lead_queue_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `queue_item_id` int NOT NULL,
  `event_type` enum('queued','assigned','reassigned','unassigned','closed','reopened') NOT NULL,
  `actor_user_id` int,
  `from_agent_id` int,
  `to_agent_id` int,
  `note` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `distribution_listing_lead_queue_events_id` PRIMARY KEY (`id`),
  KEY `idx_distribution_listing_lead_queue_events_item` (`queue_item_id`,`created_at`),
  KEY `idx_distribution_listing_lead_queue_events_actor` (`actor_user_id`,`created_at`),
  CONSTRAINT `distribution_listing_lead_queue_events_queue_item_id_fk` FOREIGN KEY (`queue_item_id`) REFERENCES `distribution_listing_lead_queue` (`id`) ON DELETE CASCADE,
  CONSTRAINT `distribution_listing_lead_queue_events_actor_user_id_fk` FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `distribution_listing_lead_queue_events_from_agent_id_fk` FOREIGN KEY (`from_agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `distribution_listing_lead_queue_events_to_agent_id_fk` FOREIGN KEY (`to_agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL
);
