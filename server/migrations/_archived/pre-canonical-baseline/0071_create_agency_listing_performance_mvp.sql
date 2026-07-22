CREATE TABLE IF NOT EXISTS `agency_listing_performance_reviews` (
  `id` int AUTO_INCREMENT NOT NULL,
  `agency_id` int NOT NULL, `listing_id` int NOT NULL, `responsible_agent_id` int NULL, `created_by_user_id` int NULL,
  `review_status` enum('scheduled','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `contact_channel` enum('call','whatsapp','email','meeting','other') NULL,
  `review_period_start` timestamp NULL, `review_period_end` timestamp NULL,
  `metrics_snapshot` json NOT NULL, `health_flags_snapshot` json NOT NULL,
  `agent_assessment` text NULL, `buyer_feedback_themes` text NULL,
  `recommendation` enum('keep_unchanged','improve_media','improve_description','correct_information','change_price','adjust_viewing_availability','increase_marketing','pause_listing','withdraw_listing','review_later') NOT NULL DEFAULT 'review_later',
  `recommendation_reason` text NULL, `seller_feedback` text NULL,
  `seller_decision` enum('pending','accepted','partially_accepted','rejected','deferred','unable_to_contact','unavailable') NOT NULL DEFAULT 'pending',
  `proposed_price` decimal(15,2) NULL, `effective_date` timestamp NULL, `next_review_at` timestamp NULL, `revision_requested_at` timestamp NULL, `canonical_revision_listing_id` int NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP, `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_listing_performance_review_agency_listing` (`agency_id`,`listing_id`), KEY `idx_listing_performance_review_due` (`agency_id`,`next_review_at`), KEY `idx_listing_performance_review_agent` (`agency_id`,`responsible_agent_id`),
  CONSTRAINT `listing_performance_review_agency_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_performance_review_listing_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_performance_review_agent_fk` FOREIGN KEY (`responsible_agent_id`) REFERENCES `agents` (`id`) ON DELETE SET NULL,
  CONSTRAINT `listing_performance_review_creator_fk` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
ALTER TABLE `listings` ADD COLUMN `revision_of_listing_id` int NULL;
CREATE INDEX `idx_listings_revision_of` ON `listings` (`revision_of_listing_id`);
CREATE TABLE IF NOT EXISTS `agency_listing_performance_activity` (
  `id` int AUTO_INCREMENT NOT NULL, `agency_id` int NOT NULL, `review_id` int NOT NULL, `user_id` int NULL,
  `event_type` varchar(80) NOT NULL, `description` text NOT NULL, `metadata` json NULL, `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`), KEY `idx_listing_performance_activity_review` (`agency_id`,`review_id`,`created_at`),
  CONSTRAINT `listing_performance_activity_agency_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_performance_activity_review_fk` FOREIGN KEY (`review_id`) REFERENCES `agency_listing_performance_reviews` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_performance_activity_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
