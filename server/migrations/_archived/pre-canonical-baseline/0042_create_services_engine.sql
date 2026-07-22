-- Services Engine Foundation
-- Creates provider profile surfaces, service catalog coverage, lead lifecycle,
-- and explore moderation entities for contextual services integration.

-- Compatibility precheck: some legacy environments have `explore_partners.id`
-- without an explicit index, which blocks FK creation in this migration.
ALTER TABLE `explore_partners`
  ADD INDEX `idx_explore_partners_id` (`id`);

CREATE TABLE IF NOT EXISTS `service_provider_profiles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` varchar(36) NOT NULL,
  `headline` varchar(180) DEFAULT NULL,
  `bio` text,
  `website_url` varchar(500) DEFAULT NULL,
  `contact_email` varchar(320) DEFAULT NULL,
  `contact_phone` varchar(50) DEFAULT NULL,
  `moderation_tier` enum('basic','verified','pro') NOT NULL DEFAULT 'basic',
  `directory_active` tinyint NOT NULL DEFAULT 1,
  `explore_creator_active` tinyint NOT NULL DEFAULT 1,
  `dashboard_active` tinyint NOT NULL DEFAULT 1,
  `average_rating` decimal(3,2) NOT NULL DEFAULT '0.00',
  `review_count` int NOT NULL DEFAULT 0,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_service_provider_profiles_provider` (`provider_id`),
  KEY `idx_service_provider_profiles_tier` (`moderation_tier`),
  CONSTRAINT `service_provider_profiles_provider_fk`
    FOREIGN KEY (`provider_id`) REFERENCES `explore_partners` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `service_provider_locations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` varchar(36) NOT NULL,
  `country_code` varchar(2) NOT NULL DEFAULT 'ZA',
  `province` varchar(120) DEFAULT NULL,
  `city` varchar(120) DEFAULT NULL,
  `suburb` varchar(120) DEFAULT NULL,
  `postal_code` varchar(20) DEFAULT NULL,
  `latitude` decimal(10,8) DEFAULT NULL,
  `longitude` decimal(11,8) DEFAULT NULL,
  `radius_km` int NOT NULL DEFAULT 25,
  `is_primary` tinyint NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_provider_locations_provider` (`provider_id`),
  KEY `idx_service_provider_locations_geo` (`province`,`city`,`suburb`),
  CONSTRAINT `service_provider_locations_provider_fk`
    FOREIGN KEY (`provider_id`) REFERENCES `explore_partners` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `service_provider_services` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` varchar(36) NOT NULL,
  `service_category` enum('home_improvement','finance_legal','moving','inspection_compliance','insurance','media_marketing') NOT NULL,
  `service_code` varchar(80) NOT NULL,
  `display_name` varchar(140) NOT NULL,
  `description` text,
  `min_price` int DEFAULT NULL,
  `max_price` int DEFAULT NULL,
  `currency` varchar(8) NOT NULL DEFAULT 'ZAR',
  `is_active` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_service_provider_services_unique` (`provider_id`,`service_code`),
  KEY `idx_service_provider_services_provider` (`provider_id`),
  KEY `idx_service_provider_services_category` (`service_category`),
  CONSTRAINT `service_provider_services_provider_fk`
    FOREIGN KEY (`provider_id`) REFERENCES `explore_partners` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `service_provider_subscriptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` varchar(36) NOT NULL,
  `tier` enum('directory','directory_explore','ecosystem_pro') NOT NULL DEFAULT 'directory',
  `status` enum('trial','active','past_due','cancelled') NOT NULL DEFAULT 'trial',
  `starts_at` timestamp NULL DEFAULT NULL,
  `ends_at` timestamp NULL DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `ux_service_provider_subscriptions_provider` (`provider_id`),
  KEY `idx_service_provider_subscriptions_tier` (`tier`),
  KEY `idx_service_provider_subscriptions_status` (`status`),
  CONSTRAINT `service_provider_subscriptions_provider_fk`
    FOREIGN KEY (`provider_id`) REFERENCES `explore_partners` (`id`) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS `service_explore_videos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` varchar(36) NOT NULL,
  `explore_content_id` int DEFAULT NULL,
  `vertical` enum('walkthroughs','home_improvement','finance_legal','moving_lifestyle','developer_story') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text,
  `moderation_status` enum('pending','reviewing','approved','rejected','changes_requested') NOT NULL DEFAULT 'pending',
  `submitted_by_user_id` int DEFAULT NULL,
  `reviewed_by_user_id` int DEFAULT NULL,
  `moderation_notes` text,
  `submitted_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `reviewed_at` timestamp NULL DEFAULT NULL,
  `published_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_service_explore_videos_provider` (`provider_id`),
  KEY `idx_service_explore_videos_status` (`moderation_status`),
  KEY `idx_service_explore_videos_vertical` (`vertical`),
  CONSTRAINT `service_explore_videos_provider_fk`
    FOREIGN KEY (`provider_id`) REFERENCES `explore_partners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_explore_videos_content_fk`
    FOREIGN KEY (`explore_content_id`) REFERENCES `explore_content` (`id`) ON DELETE SET NULL,
  CONSTRAINT `service_explore_videos_submitted_by_fk`
    FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `service_explore_videos_reviewed_by_fk`
    FOREIGN KEY (`reviewed_by_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `service_leads` (
  `id` int NOT NULL AUTO_INCREMENT,
  `requester_user_id` int DEFAULT NULL,
  `provider_id` varchar(36) DEFAULT NULL,
  `service_category` enum('home_improvement','finance_legal','moving','inspection_compliance','insurance','media_marketing') NOT NULL,
  `source_surface` enum('directory','explore','journey_injection','agent_dashboard') NOT NULL,
  `intent_stage` enum('seller_valuation','seller_listing_prep','buyer_saved_property','buyer_offer_intent','buyer_move_ready','developer_listing_wizard','agent_dashboard','general') NOT NULL DEFAULT 'general',
  `property_id` int DEFAULT NULL,
  `listing_id` int DEFAULT NULL,
  `development_id` int DEFAULT NULL,
  `geo_province` varchar(120) DEFAULT NULL,
  `geo_city` varchar(120) DEFAULT NULL,
  `geo_suburb` varchar(120) DEFAULT NULL,
  `notes` text,
  `context_json` json DEFAULT NULL,
  `status` enum('new','accepted','quoted','won','lost','expired') NOT NULL DEFAULT 'new',
  `billing_eligible` tinyint NOT NULL DEFAULT 0,
  `billing_tier_snapshot` enum('directory','directory_explore','ecosystem_pro') DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_leads_provider` (`provider_id`),
  KEY `idx_service_leads_status` (`status`),
  KEY `idx_service_leads_source` (`source_surface`),
  KEY `idx_service_leads_stage` (`intent_stage`),
  KEY `idx_service_leads_created` (`created_at`),
  CONSTRAINT `service_leads_requester_fk`
    FOREIGN KEY (`requester_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `service_leads_provider_fk`
    FOREIGN KEY (`provider_id`) REFERENCES `explore_partners` (`id`) ON DELETE SET NULL,
  CONSTRAINT `service_leads_property_fk`
    FOREIGN KEY (`property_id`) REFERENCES `properties` (`id`) ON DELETE SET NULL,
  CONSTRAINT `service_leads_listing_fk`
    FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `service_leads_development_fk`
    FOREIGN KEY (`development_id`) REFERENCES `developments` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `service_lead_events` (
  `id` int NOT NULL AUTO_INCREMENT,
  `lead_id` int NOT NULL,
  `event_type` enum('created','assigned','accepted','quoted','won','lost','status_changed','billing_marked','note') NOT NULL,
  `actor_user_id` int DEFAULT NULL,
  `payload` json DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_lead_events_lead` (`lead_id`),
  KEY `idx_service_lead_events_type` (`event_type`),
  KEY `idx_service_lead_events_created` (`created_at`),
  CONSTRAINT `service_lead_events_lead_fk`
    FOREIGN KEY (`lead_id`) REFERENCES `service_leads` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_lead_events_actor_fk`
    FOREIGN KEY (`actor_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS `service_provider_reviews` (
  `id` int NOT NULL AUTO_INCREMENT,
  `provider_id` varchar(36) NOT NULL,
  `reviewer_user_id` int DEFAULT NULL,
  `rating` int NOT NULL,
  `title` varchar(200) DEFAULT NULL,
  `content` text,
  `is_verified` tinyint NOT NULL DEFAULT 0,
  `is_published` tinyint NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_service_provider_reviews_provider` (`provider_id`),
  KEY `idx_service_provider_reviews_rating` (`rating`),
  KEY `idx_service_provider_reviews_created` (`created_at`),
  CONSTRAINT `service_provider_reviews_provider_fk`
    FOREIGN KEY (`provider_id`) REFERENCES `explore_partners` (`id`) ON DELETE CASCADE,
  CONSTRAINT `service_provider_reviews_reviewer_fk`
    FOREIGN KEY (`reviewer_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
);
