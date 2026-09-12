CREATE TABLE `bundle_attributions` (
  `id` varchar(36) NOT NULL,
  `bundle_id` varchar(64) NOT NULL,
  `partner_id` varchar(64),
  `user_id` varchar(128),
  `event_type` enum('bundle_view','partner_click','profile_view','lead_generated','lead_converted') NOT NULL,
  `content_id` varchar(128),
  `lead_id` varchar(128),
  `metadata` json,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_bundle_attributions_bundle` (`bundle_id`,`created_at`),
  KEY `idx_bundle_attributions_partner` (`partner_id`,`created_at`),
  KEY `idx_bundle_attributions_user` (`user_id`,`created_at`),
  KEY `idx_bundle_attributions_event` (`event_type`,`created_at`)
);
