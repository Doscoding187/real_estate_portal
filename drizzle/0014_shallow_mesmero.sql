CREATE TABLE `agent_knowledge` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topic` varchar(200) NOT NULL,
	`content` text NOT NULL,
	`category` varchar(100),
	`tags` json,
	`metadata` json,
	`is_active` int NOT NULL DEFAULT 1,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `agent_memory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(100) NOT NULL,
	`conversation_id` varchar(100),
	`user_id` int,
	`user_input` text NOT NULL,
	`agent_response` text NOT NULL,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now())
);
--> statement-breakpoint
CREATE TABLE `agent_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_id` varchar(100) NOT NULL,
	`session_id` varchar(100),
	`user_id` int,
	`task_type` varchar(50) NOT NULL,
	`status` enum('pending','running','completed','failed') NOT NULL DEFAULT 'pending',
	`priority` int NOT NULL DEFAULT 0,
	`input_data` json,
	`output_data` json,
	`error_message` text,
	`started_at` timestamp,
	`completed_at` timestamp,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `billing_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subscription_id` int,
	`transaction_type` enum('subscription_create','subscription_renew','upgrade','downgrade','addon_purchase','refund','failed_payment','trial_conversion') NOT NULL,
	`amount_zar` int NOT NULL,
	`currency` varchar(3) DEFAULT 'ZAR',
	`status` enum('pending','completed','failed','refunded') DEFAULT 'pending',
	`payment_gateway` enum('stripe','paystack','manual') NOT NULL,
	`gateway_transaction_id` varchar(255),
	`gateway_invoice_id` varchar(255),
	`description` text,
	`metadata` json,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`icon` varchar(100),
	`displayOrder` int NOT NULL DEFAULT 0,
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_neighbourhood_stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`neighbourhood_id` int,
	`title` varchar(255) NOT NULL,
	`content` text NOT NULL,
	`author_id` int,
	`coverImage` text,
	`is_published` int NOT NULL DEFAULT 0,
	`published_at` timestamp,
	`view_count` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_shorts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listing_id` int,
	`development_id` int,
	`agent_id` int,
	`developer_id` int,
	`agency_id` int,
	`content_type` varchar(50) DEFAULT 'property',
	`topic_id` int,
	`category_id` int,
	`title` varchar(255) NOT NULL,
	`caption` text,
	`primary_media_id` int NOT NULL,
	`media_ids` json NOT NULL,
	`highlights` json,
	`performance_score` decimal(5,2) NOT NULL DEFAULT '0',
	`boost_priority` int NOT NULL DEFAULT 0,
	`view_count` int NOT NULL DEFAULT 0,
	`unique_view_count` int NOT NULL DEFAULT 0,
	`save_count` int NOT NULL DEFAULT 0,
	`share_count` int NOT NULL DEFAULT 0,
	`skip_count` int NOT NULL DEFAULT 0,
	`average_watch_time` int NOT NULL DEFAULT 0,
	`view_through_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`save_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`share_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`skip_rate` decimal(5,2) NOT NULL DEFAULT '0',
	`is_published` tinyint NOT NULL DEFAULT 1,
	`is_featured` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`published_at` timestamp
);
--> statement-breakpoint
CREATE TABLE `explore_sponsorships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partner_id` int NOT NULL,
	`content_type` enum('video','story','series','event','topic') NOT NULL,
	`content_id` int NOT NULL,
	`tier` enum('platinum','gold','silver','bronze') NOT NULL DEFAULT 'silver',
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`amount` decimal(10,2),
	`status` enum('pending','active','expired','cancelled') NOT NULL DEFAULT 'pending',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `explore_sponsorships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(150) NOT NULL,
	`slug` varchar(150) NOT NULL,
	`description` text,
	`coverImage` text,
	`tags` json,
	`isActive` int NOT NULL DEFAULT 1,
	`displayOrder` int NOT NULL DEFAULT 0,
	`contentCount` int NOT NULL DEFAULT 0,
	`followerCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `developments` DROP INDEX `unique_slug`;--> statement-breakpoint
ALTER TABLE `launch_content_quotas` DROP INDEX `launch_content_quotas_content_type_unique`;--> statement-breakpoint
ALTER TABLE `marketplace_bundles` DROP INDEX `marketplace_bundles_slug_unique`;--> statement-breakpoint
ALTER TABLE `topics` DROP INDEX `topics_slug_unique`;--> statement-breakpoint
ALTER TABLE `activities` DROP FOREIGN KEY `activities_developer_id_developers_id_fk`;
--> statement-breakpoint
ALTER TABLE `activities` DROP FOREIGN KEY `activities_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `boost_campaigns` DROP FOREIGN KEY `boost_campaigns_partner_id_explore_partners_id_fk`;
--> statement-breakpoint
ALTER TABLE `boost_credits` DROP FOREIGN KEY `boost_credits_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `bundle_partners` DROP FOREIGN KEY `bundle_partners_bundle_id_marketplace_bundles_id_fk`;
--> statement-breakpoint
ALTER TABLE `content_approval_queue` DROP FOREIGN KEY `content_approval_queue_partner_id_explore_partners_id_fk`;
--> statement-breakpoint
ALTER TABLE `content_topics` DROP FOREIGN KEY `content_topics_topic_id_topics_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP FOREIGN KEY `developer_subscription_limits_subscription_id_developer_subscriptions_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP FOREIGN KEY `developer_subscription_usage_subscription_id_developer_subscriptions_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP FOREIGN KEY `developer_subscriptions_developer_id_developers_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP FOREIGN KEY `developer_subscriptions_plan_id_plans_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_approval_queue` DROP FOREIGN KEY `development_approval_queue_development_id_developments_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_approval_queue` DROP FOREIGN KEY `development_approval_queue_submitted_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_approval_queue` DROP FOREIGN KEY `development_approval_queue_reviewed_by_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_lead_routes` DROP FOREIGN KEY `development_lead_routes_development_id_developments_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_phases` DROP FOREIGN KEY `development_phases_development_id_developments_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_units` DROP FOREIGN KEY `development_units_development_id_developments_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_units` DROP FOREIGN KEY `development_units_phase_id_development_phases_id_fk`;
--> statement-breakpoint
ALTER TABLE `developments` DROP FOREIGN KEY `developments_developer_id_developers_id_fk`;
--> statement-breakpoint
ALTER TABLE `developments` DROP FOREIGN KEY `developments_location_id_locations_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` DROP FOREIGN KEY `explore_boost_campaigns_content_id_explore_content_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_creator_follows` DROP FOREIGN KEY `explore_creator_follows_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP FOREIGN KEY `explore_discovery_videos_property_id_properties_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP FOREIGN KEY `explore_discovery_videos_development_id_developments_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_engagements` DROP FOREIGN KEY `explore_engagements_content_id_explore_content_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_engagements` DROP FOREIGN KEY `explore_engagements_session_id_explore_feed_sessions_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_saved_properties` DROP FOREIGN KEY `explore_saved_properties_content_id_explore_content_id_fk`;
--> statement-breakpoint
ALTER TABLE `founding_partners` DROP FOREIGN KEY `founding_partners_partner_id_explore_partners_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_analytics` DROP FOREIGN KEY `listing_analytics_listingId_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_approval_queue` DROP FOREIGN KEY `listing_approval_queue_listingId_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_leads` DROP FOREIGN KEY `listing_leads_listingId_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_media` DROP FOREIGN KEY `listing_media_listingId_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `listing_viewings` DROP FOREIGN KEY `listing_viewings_listingId_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `location_analytics_events` DROP FOREIGN KEY `location_analytics_events_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `location_searches` DROP FOREIGN KEY `location_searches_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `partner_leads` DROP FOREIGN KEY `partner_leads_partner_id_explore_partners_id_fk`;
--> statement-breakpoint
ALTER TABLE `partner_subscriptions` DROP FOREIGN KEY `partner_subscriptions_partner_id_explore_partners_id_fk`;
--> statement-breakpoint
ALTER TABLE `recent_searches` DROP FOREIGN KEY `recent_searches_location_id_locations_id_fk`;
--> statement-breakpoint
ALTER TABLE `saved_searches` DROP FOREIGN KEY `saved_searches_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `spec_variations` DROP FOREIGN KEY `spec_variations_unit_type_id_unit_types_id_fk`;
--> statement-breakpoint
ALTER TABLE `subscription_events` DROP FOREIGN KEY `subscription_events_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `subscription_usage` DROP FOREIGN KEY `subscription_usage_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `user_subscriptions` DROP FOREIGN KEY `user_subscriptions_user_id_users_id_fk`;
--> statement-breakpoint
DROP INDEX `idx_cities_slug` ON `cities`;--> statement-breakpoint
DROP INDEX `idx_cities_place_id` ON `cities`;--> statement-breakpoint
DROP INDEX `idx_cities_slug_province` ON `cities`;--> statement-breakpoint
DROP INDEX `idx_dev_drafts_brand_profile_id` ON `development_drafts`;--> statement-breakpoint
DROP INDEX `idx_developments_developer_id` ON `developments`;--> statement-breakpoint
DROP INDEX `idx_developments_status` ON `developments`;--> statement-breakpoint
DROP INDEX `idx_developments_gps_accuracy` ON `developments`;--> statement-breakpoint
DROP INDEX `idx_developments_suburb` ON `developments`;--> statement-breakpoint
DROP INDEX `idx_developments_location_id` ON `developments`;--> statement-breakpoint
DROP INDEX `idx_developments_rating` ON `developments`;--> statement-breakpoint
DROP INDEX `idx_developments_published` ON `developments`;--> statement-breakpoint
DROP INDEX `idx_boost_campaigns_creator` ON `explore_boost_campaigns`;--> statement-breakpoint
DROP INDEX `idx_boost_campaigns_status` ON `explore_boost_campaigns`;--> statement-breakpoint
DROP INDEX `idx_boost_campaigns_dates` ON `explore_boost_campaigns`;--> statement-breakpoint
DROP INDEX `idx_boost_campaigns_active` ON `explore_boost_campaigns`;--> statement-breakpoint
DROP INDEX `idx_content_partner` ON `explore_content`;--> statement-breakpoint
DROP INDEX `idx_content_category` ON `explore_content`;--> statement-breakpoint
DROP INDEX `unique_user_creator` ON `explore_creator_follows`;--> statement-breakpoint
DROP INDEX `idx_explore_creator_follows_user` ON `explore_creator_follows`;--> statement-breakpoint
DROP INDEX `idx_explore_creator_follows_creator` ON `explore_creator_follows`;--> statement-breakpoint
DROP INDEX `idx_explore_discovery_videos_content` ON `explore_discovery_videos`;--> statement-breakpoint
DROP INDEX `idx_explore_discovery_videos_property` ON `explore_discovery_videos`;--> statement-breakpoint
DROP INDEX `idx_explore_discovery_videos_development` ON `explore_discovery_videos`;--> statement-breakpoint
DROP INDEX `idx_explore_discovery_videos_performance` ON `explore_discovery_videos`;--> statement-breakpoint
DROP INDEX `idx_explore_engagement_user` ON `explore_engagements`;--> statement-breakpoint
DROP INDEX `idx_explore_engagement_content` ON `explore_engagements`;--> statement-breakpoint
DROP INDEX `idx_explore_engagement_type` ON `explore_engagements`;--> statement-breakpoint
DROP INDEX `idx_explore_engagement_created` ON `explore_engagements`;--> statement-breakpoint
DROP INDEX `idx_explore_sessions_user` ON `explore_feed_sessions`;--> statement-breakpoint
DROP INDEX `idx_explore_sessions_start` ON `explore_feed_sessions`;--> statement-breakpoint
DROP INDEX `unique_user_neighbourhood` ON `explore_neighbourhood_follows`;--> statement-breakpoint
DROP INDEX `idx_explore_neighbourhood_follows_user` ON `explore_neighbourhood_follows`;--> statement-breakpoint
DROP INDEX `idx_explore_neighbourhoods_location` ON `explore_neighbourhoods`;--> statement-breakpoint
DROP INDEX `unique_user_content` ON `explore_saved_properties`;--> statement-breakpoint
DROP INDEX `idx_explore_saved_user` ON `explore_saved_properties`;--> statement-breakpoint
DROP INDEX `idx_explore_saved_collection` ON `explore_saved_properties`;--> statement-breakpoint
DROP INDEX `idx_explore_user_pref_user` ON `explore_user_preferences_new`;--> statement-breakpoint
DROP INDEX `idx_explore_user_pref_active` ON `explore_user_preferences_new`;--> statement-breakpoint
DROP INDEX `idx_loc_analytics_event` ON `location_analytics_events`;--> statement-breakpoint
DROP INDEX `idx_loc_analytics_created` ON `location_analytics_events`;--> statement-breakpoint
DROP INDEX `idx_loc_analytics_location` ON `location_analytics_events`;--> statement-breakpoint
DROP INDEX `idx_loc_analytics_development` ON `location_analytics_events`;--> statement-breakpoint
DROP INDEX `idx_location_searched` ON `location_searches`;--> statement-breakpoint
DROP INDEX `idx_user_id` ON `location_searches`;--> statement-breakpoint
DROP INDEX `idx_location_targeting` ON `location_targeting`;--> statement-breakpoint
DROP INDEX `idx_locations_slug` ON `locations`;--> statement-breakpoint
DROP INDEX `idx_locations_parent_id` ON `locations`;--> statement-breakpoint
DROP INDEX `idx_provinces_slug` ON `provinces`;--> statement-breakpoint
DROP INDEX `idx_provinces_place_id` ON `provinces`;--> statement-breakpoint
DROP INDEX `idx_user_recent` ON `recent_searches`;--> statement-breakpoint
DROP INDEX `unique_user_location` ON `recent_searches`;--> statement-breakpoint
DROP INDEX `idx_spec_variations_unit_type_id` ON `spec_variations`;--> statement-breakpoint
DROP INDEX `idx_spec_variations_price` ON `spec_variations`;--> statement-breakpoint
DROP INDEX `idx_spec_variations_display_order` ON `spec_variations`;--> statement-breakpoint
DROP INDEX `idx_suburbs_slug` ON `suburbs`;--> statement-breakpoint
DROP INDEX `idx_suburbs_place_id` ON `suburbs`;--> statement-breakpoint
DROP INDEX `idx_suburbs_slug_city` ON `suburbs`;--> statement-breakpoint
DROP INDEX `idx_explore_neighbourhoods_city` ON `explore_neighbourhoods`;--> statement-breakpoint
ALTER TABLE `boost_campaigns` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `content_approval_queue` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `content_quality_scores` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `development_lead_routes` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `explore_partners` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `founding_partners` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `hero_campaigns` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `launch_content_quotas` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `launch_metrics` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `launch_phases` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `marketplace_bundles` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `partner_leads` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `partner_subscriptions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `topics` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `unit_types` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `user_onboarding_state` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `activities` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `agencies` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `agency_branding` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `agency_join_requests` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `agency_subscriptions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `agent_coverage_areas` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `agents` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `amenities` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `analytics_aggregations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `audit_logs` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `boost_campaigns` MODIFY COLUMN `start_date` date NOT NULL;--> statement-breakpoint
ALTER TABLE `boost_campaigns` MODIFY COLUMN `end_date` date;--> statement-breakpoint
ALTER TABLE `boost_campaigns` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `boost_credits` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `cities` MODIFY COLUMN `slug` varchar(100);--> statement-breakpoint
ALTER TABLE `cities` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `commissions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `content_approval_queue` MODIFY COLUMN `submitted_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `content_approval_queue` MODIFY COLUMN `auto_approval_eligible` int;--> statement-breakpoint
ALTER TABLE `content_approval_queue` MODIFY COLUMN `auto_approval_eligible` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `content_quality_scores` MODIFY COLUMN `last_calculated_at` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `content_topics` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `coupons` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `developer_brand_profiles` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `developer_notifications` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` MODIFY COLUMN `last_reset_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `developer_subscriptions` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `rating` decimal(3,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `reviewCount` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `pastProjects` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `is_trusted` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `is_trusted` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `development_approval_queue` MODIFY COLUMN `submitted_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `development_documents` MODIFY COLUMN `uploaded_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `development_drafts` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `development_lead_routes` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `development_partners` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `development_phases` MODIFY COLUMN `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `development_phases` MODIFY COLUMN `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `development_phases` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `development_units` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `marketing_role` enum('exclusive','joint','open');--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `developmentType` enum('residential','commercial','mixed_use','land') NOT NULL;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `legacy_status` enum('planning','under_construction','completed','coming_soon','now-selling','launching-soon','ready-to-move','sold-out','phase-completed','new-phase-launching','pre_launch','ready');--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `ownership_type` varchar(255);--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `structural_type` varchar(255);--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `floors` int;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `amenities` text;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `isFeatured` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `isPublished` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `showHouseAddress` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `views` int NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `nature` enum('new','phase','extension','redevelopment') NOT NULL DEFAULT 'new';--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `is_showcase` int;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `email_templates` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` MODIFY COLUMN `start_date` date NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` MODIFY COLUMN `end_date` date;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` MODIFY COLUMN `status` enum('draft','pending','active','paused','completed','rejected') NOT NULL DEFAULT 'draft';--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` MODIFY COLUMN `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `exploreComments` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_content` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_content` MODIFY COLUMN `updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `explore_creator_follows` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` MODIFY COLUMN `thumbnail_url` varchar(500);--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` MODIFY COLUMN `duration` int;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_engagements` MODIFY COLUMN `engagement_type` enum('view','like','share','save','comment','click_cta','profile_visit') NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_engagements` MODIFY COLUMN `session_id` varchar(100);--> statement-breakpoint
ALTER TABLE `explore_engagements` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `exploreFollows` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_highlight_tags` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_interactions` MODIFY COLUMN `timestamp` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `exploreLikes` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` MODIFY COLUMN `name` varchar(150) NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` MODIFY COLUMN `slug` varchar(150) NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` MODIFY COLUMN `city` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` MODIFY COLUMN `province` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` MODIFY COLUMN `follower_count` int NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` MODIFY COLUMN `property_count` int NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_partners` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_saved_properties` MODIFY COLUMN `collection_name` varchar(100) DEFAULT 'Favorites';--> statement-breakpoint
ALTER TABLE `explore_saved_properties` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_user_preferences` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `exploreVideoViews` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `exploreVideos` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `favorites` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `founding_partners` MODIFY COLUMN `enrollment_date` date NOT NULL;--> statement-breakpoint
ALTER TABLE `founding_partners` MODIFY COLUMN `benefits_end_date` date NOT NULL;--> statement-breakpoint
ALTER TABLE `founding_partners` MODIFY COLUMN `weekly_content_delivered` json;--> statement-breakpoint
ALTER TABLE `founding_partners` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `invitations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `invites` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `invoices` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `launch_content_quotas` MODIFY COLUMN `last_updated` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `launch_metrics` MODIFY COLUMN `metric_date` date NOT NULL;--> statement-breakpoint
ALTER TABLE `launch_metrics` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `launch_phases` MODIFY COLUMN `start_date` date NOT NULL;--> statement-breakpoint
ALTER TABLE `launch_phases` MODIFY COLUMN `end_date` date;--> statement-breakpoint
ALTER TABLE `launch_phases` MODIFY COLUMN `is_active` tinyint;--> statement-breakpoint
ALTER TABLE `launch_phases` MODIFY COLUMN `is_active` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `launch_phases` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `lead_activities` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `leads` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listing_analytics` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listing_approval_queue` MODIFY COLUMN `submittedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listing_approval_queue` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listing_leads` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listing_media` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listing_media` MODIFY COLUMN `uploadedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listing_viewings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `location_analytics_events` MODIFY COLUMN `location_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `location_analytics_events` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `location_search_cache` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `location_targeting` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `market_insights_cache` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `marketplace_bundles` MODIFY COLUMN `is_active` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `marketplace_bundles` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `notifications` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `offers` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `partner_leads` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `partner_subscriptions` MODIFY COLUMN `start_date` date NOT NULL;--> statement-breakpoint
ALTER TABLE `partner_subscriptions` MODIFY COLUMN `end_date` date;--> statement-breakpoint
ALTER TABLE `partner_subscriptions` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `partner_tiers` MODIFY COLUMN `requires_credentials` tinyint;--> statement-breakpoint
ALTER TABLE `partner_tiers` MODIFY COLUMN `requires_credentials` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `partner_tiers` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `partners` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `payment_methods` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `plans` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `platform_inquiries` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `platform_settings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `price_history` MODIFY COLUMN `recordedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `price_history` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `price_predictions` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `properties` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `property_clicks` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `propertyImages` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `property_similarity_index` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `prospect_favorites` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `prospects` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `provinces` MODIFY COLUMN `slug` varchar(100);--> statement-breakpoint
ALTER TABLE `provinces` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `recent_searches` MODIFY COLUMN `user_id` int;--> statement-breakpoint
ALTER TABLE `recent_searches` MODIFY COLUMN `searched_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `recently_viewed` MODIFY COLUMN `viewedAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `reviews` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `saved_searches` MODIFY COLUMN `notificationFrequency` enum('never','daily','weekly') DEFAULT 'never';--> statement-breakpoint
ALTER TABLE `saved_searches` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `scheduled_viewings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `search_analytics` MODIFY COLUMN `createdAt` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `services` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `showings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `spec_variations` MODIFY COLUMN `id` int AUTO_INCREMENT NOT NULL;--> statement-breakpoint
ALTER TABLE `subscription_events` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `subscription_plans` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `subscription_usage` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `suburb_reviews` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `suburbs` MODIFY COLUMN `slug` varchar(100);--> statement-breakpoint
ALTER TABLE `suburbs` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `topics` MODIFY COLUMN `is_active` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `topics` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `unit_types` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `user_behavior_events` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `user_onboarding_state` MODIFY COLUMN `is_first_session` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `user_onboarding_state` MODIFY COLUMN `welcome_overlay_shown` tinyint;--> statement-breakpoint
ALTER TABLE `user_onboarding_state` MODIFY COLUMN `welcome_overlay_shown` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_onboarding_state` MODIFY COLUMN `welcome_overlay_dismissed` tinyint;--> statement-breakpoint
ALTER TABLE `user_onboarding_state` MODIFY COLUMN `welcome_overlay_dismissed` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `user_onboarding_state` MODIFY COLUMN `tooltips_shown` json;--> statement-breakpoint
ALTER TABLE `user_onboarding_state` MODIFY COLUMN `features_unlocked` json;--> statement-breakpoint
ALTER TABLE `user_onboarding_state` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `user_preferences` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `user_recommendations` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `user_subscriptions` MODIFY COLUMN `created_at` timestamp DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `lastSignedIn` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `videoLikes` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `videos` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT (now());--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `location_analytics_events` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `location_searches` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `location_targeting` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `partners` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `platform_inquiries` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `property_clicks` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `recent_searches` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `search_analytics` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `suburb_reviews` ADD PRIMARY KEY(`id`);--> statement-breakpoint
ALTER TABLE `developments` ADD `developerId` int;--> statement-breakpoint
ALTER TABLE `developments` ADD `transaction_type` enum('for_sale','for_rent','auction') DEFAULT 'for_sale' NOT NULL;--> statement-breakpoint
ALTER TABLE `developments` ADD `monthly_rent_from` decimal(15,2);--> statement-breakpoint
ALTER TABLE `developments` ADD `monthly_rent_to` decimal(15,2);--> statement-breakpoint
ALTER TABLE `developments` ADD `auction_start_date` timestamp;--> statement-breakpoint
ALTER TABLE `developments` ADD `auction_end_date` timestamp;--> statement-breakpoint
ALTER TABLE `developments` ADD `starting_bid_from` decimal(15,2);--> statement-breakpoint
ALTER TABLE `developments` ADD `reserve_price_from` decimal(15,2);--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD `user_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD `partner_id` int;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD `content_type` enum('video','story','post','development','listing','profile') NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD `campaign_type` enum('reach','engagement','clicks','conversion') NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD `budget_total` decimal(10,2) NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD `budget_spend` decimal(10,2) DEFAULT '0.00';--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD `targeting` json;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD `metrics` json;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD `payment_status` enum('pending','paid','failed','refunded') DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD `invoice_id` varchar(100);--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD `follower_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD `notification_level` enum('all','highlights','none') DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD `title` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD `description` text;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD `aspect_ratio` varchar(20);--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD `resolution` varchar(20);--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD `file_size` int;--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD `content_type` enum('video','story','post','reels') NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD `duration` int;--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD `metadata` json;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD `session_id` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD `algorithm_version` varchar(50);--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD `feed_type` enum('for_you','following','nearby','trending') DEFAULT 'for_you';--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD `items_viewed` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD `duration_seconds` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD `location_user` json;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD `exit_reason` varchar(50);--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD `started_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD `ended_at` timestamp;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` ADD `notification_level` enum('all','highlights','none') DEFAULT 'all' NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` ADD `cover_image` text;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` ADD `lat` decimal(10,7);--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` ADD `lng` decimal(10,7);--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` ADD `metadata` json;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD `property_id` int;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD `development_id` int;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD `topics` json;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD `categories` json;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD `locations` json;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD `price_range` json;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD `content_types` json;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD `creator_preferences` json;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD `notification_settings` json;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD `last_updated` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `listings` ADD `locationId` int;--> statement-breakpoint
ALTER TABLE `location_analytics_events` ADD `event_data` json;--> statement-breakpoint
ALTER TABLE `location_searches` ADD `session_id` varchar(100);--> statement-breakpoint
ALTER TABLE `location_searches` ADD `search_metadata` json;--> statement-breakpoint
ALTER TABLE `location_searches` ADD `created_at` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `location_targeting` ADD `entity_type` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `location_targeting` ADD `entity_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `location_targeting` ADD `radius_km` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `location_targeting` ADD `weight` int DEFAULT 1;--> statement-breakpoint
ALTER TABLE `recent_searches` ADD `session_id` varchar(255);--> statement-breakpoint
ALTER TABLE `recent_searches` ADD `query` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `recent_searches` ADD `filters` json;--> statement-breakpoint
ALTER TABLE `recent_searches` ADD `location` varchar(255);--> statement-breakpoint
ALTER TABLE `recent_searches` ADD `result_count` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD `listingId` int;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD `unitTypeId` varchar(36);--> statement-breakpoint
ALTER TABLE `spec_variations` ADD `variationName` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD `priceOverride` decimal(15,2);--> statement-breakpoint
ALTER TABLE `spec_variations` ADD `specOverrides` json NOT NULL;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `monthly_rent_from` decimal(15,2);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `monthly_rent_to` decimal(15,2);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `lease_term` varchar(100);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `is_furnished` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `starting_bid` decimal(15,2);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `reserve_price` decimal(15,2);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `auction_start_date` timestamp;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `auction_end_date` timestamp;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `auction_status` enum('scheduled','active','sold','passed_in','withdrawn') DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD CONSTRAINT `unique_creator_follow` UNIQUE(`follower_id`,`creator_id`);--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` ADD CONSTRAINT `unique_nbh_follow` UNIQUE(`user_id`,`neighbourhood_id`);--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `unique_saved_prop` UNIQUE(`user_id`,`property_id`);--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `unique_saved_dev` UNIQUE(`user_id`,`development_id`);--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD CONSTRAINT `idx_user_pref_new` UNIQUE(`user_id`);--> statement-breakpoint
ALTER TABLE `agent_knowledge` ADD CONSTRAINT `agent_knowledge_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_memory` ADD CONSTRAINT `agent_memory_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `agent_tasks` ADD CONSTRAINT `agent_tasks_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `billing_transactions` ADD CONSTRAINT `billing_transactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_stories` ADD CONSTRAINT `explore_neighbourhood_stories_neighbourhood_id_explore_neighbourhoods_id_fk` FOREIGN KEY (`neighbourhood_id`) REFERENCES `explore_neighbourhoods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_stories` ADD CONSTRAINT `explore_neighbourhood_stories_author_id_users_id_fk` FOREIGN KEY (`author_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_sponsorships` ADD CONSTRAINT `explore_sponsorships_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_agent_knowledge_topic` ON `agent_knowledge` (`topic`);--> statement-breakpoint
CREATE INDEX `idx_agent_knowledge_category` ON `agent_knowledge` (`category`);--> statement-breakpoint
CREATE INDEX `idx_agent_knowledge_active` ON `agent_knowledge` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_agent_knowledge_created` ON `agent_knowledge` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_agent_memory_session` ON `agent_memory` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_memory_conversation` ON `agent_memory` (`conversation_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_memory_user` ON `agent_memory` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_memory_created` ON `agent_memory` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_agent_tasks_status` ON `agent_tasks` (`status`);--> statement-breakpoint
CREATE INDEX `idx_agent_tasks_type` ON `agent_tasks` (`task_type`);--> statement-breakpoint
CREATE INDEX `idx_agent_tasks_user` ON `agent_tasks` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_tasks_session` ON `agent_tasks` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_tasks_created` ON `agent_tasks` (`created_at`);--> statement-breakpoint
CREATE INDEX `task_id` ON `agent_tasks` (`task_id`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `billing_transactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `billing_transactions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_explore_categories_slug` ON `explore_categories` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_explore_categories_active` ON `explore_categories` (`isActive`);--> statement-breakpoint
CREATE INDEX `idx_neighbourhood_stories_neighbourhood` ON `explore_neighbourhood_stories` (`neighbourhood_id`);--> statement-breakpoint
CREATE INDEX `idx_neighbourhood_stories_published` ON `explore_neighbourhood_stories` (`is_published`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_listing_id` ON `explore_shorts` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_development_id` ON `explore_shorts` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agent_id` ON `explore_shorts` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_performance_score` ON `explore_shorts` (`performance_score`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_boost_priority` ON `explore_shorts` (`boost_priority`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_published` ON `explore_shorts` (`is_published`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_content_type` ON `explore_shorts` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_topic_id` ON `explore_shorts` (`topic_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_category_id` ON `explore_shorts` (`category_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_id` ON `explore_shorts` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_published` ON `explore_shorts` (`agency_id`,`is_published`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_performance` ON `explore_shorts` (`agency_id`,`performance_score`,`view_count`);--> statement-breakpoint
CREATE INDEX `idx_sponsor_partner` ON `explore_sponsorships` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_sponsor_content` ON `explore_sponsorships` (`content_type`,`content_id`);--> statement-breakpoint
CREATE INDEX `idx_sponsor_status` ON `explore_sponsorships` (`status`);--> statement-breakpoint
CREATE INDEX `idx_explore_topics_slug` ON `explore_topics` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_explore_topics_active` ON `explore_topics` (`isActive`);--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boost_campaigns` ADD CONSTRAINT `boost_campaigns_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `boost_credits` ADD CONSTRAINT `boost_credits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bundle_partners` ADD CONSTRAINT `bundle_partners_bundle_id_marketplace_bundles_id_fk` FOREIGN KEY (`bundle_id`) REFERENCES `marketplace_bundles`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_approval_queue` ADD CONSTRAINT `content_approval_queue_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `content_topics` ADD CONSTRAINT `content_topics_topic_id_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `topics`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD CONSTRAINT `developer_subscription_limits_subscription_id_developer_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD CONSTRAINT `developer_subscription_usage_subscription_id_developer_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `developer_subscriptions_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `developer_subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_submitted_by_users_id_fk` FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_approval_queue` ADD CONSTRAINT `development_approval_queue_reviewed_by_users_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_lead_routes` ADD CONSTRAINT `development_lead_routes_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_phases` ADD CONSTRAINT `development_phases_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_units` ADD CONSTRAINT `development_units_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_units` ADD CONSTRAINT `development_units_phase_id_development_phases_id_fk` FOREIGN KEY (`phase_id`) REFERENCES `development_phases`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_developerId_developers_id_fk` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD CONSTRAINT `explore_boost_campaigns_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD CONSTRAINT `explore_boost_campaigns_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_content` ADD CONSTRAINT `explore_content_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_content` ADD CONSTRAINT `explore_content_agency_id_agencies_id_fk` FOREIGN KEY (`agency_id`) REFERENCES `agencies`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD CONSTRAINT `explore_creator_follows_follower_id_users_id_fk` FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `explore_saved_properties_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `explore_saved_properties_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `founding_partners` ADD CONSTRAINT `founding_partners_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_analytics` ADD CONSTRAINT `listing_analytics_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_approval_queue` ADD CONSTRAINT `listing_approval_queue_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_leads` ADD CONSTRAINT `listing_leads_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_media` ADD CONSTRAINT `listing_media_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD CONSTRAINT `listing_viewings_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listings` ADD CONSTRAINT `listings_locationId_locations_id_fk` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_analytics_events` ADD CONSTRAINT `location_analytics_events_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_targeting` ADD CONSTRAINT `location_targeting_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_leads` ADD CONSTRAINT `partner_leads_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `partner_subscriptions` ADD CONSTRAINT `partner_subscriptions_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD CONSTRAINT `saved_searches_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD CONSTRAINT `spec_variations_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD CONSTRAINT `spec_variations_unitTypeId_unit_types_id_fk` FOREIGN KEY (`unitTypeId`) REFERENCES `unit_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_events` ADD CONSTRAINT `subscription_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_usage` ADD CONSTRAINT `subscription_usage_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_subscriptions` ADD CONSTRAINT `user_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_city_slug` ON `cities` (`slug`);--> statement-breakpoint
CREATE INDEX `` ON `cities` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_developments_slug` ON `developments` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_developments_location` ON `developments` (`latitude`,`longitude`);--> statement-breakpoint
CREATE INDEX `idx_developments_auction_dates` ON `developments` (`auction_start_date`,`auction_end_date`);--> statement-breakpoint
CREATE INDEX `idx_boost_user` ON `explore_boost_campaigns` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_boost_creator` ON `explore_boost_campaigns` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_boost_status` ON `explore_boost_campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `idx_boost_type` ON `explore_boost_campaigns` (`content_type`,`content_id`);--> statement-breakpoint
CREATE INDEX `idx_follower` ON `explore_creator_follows` (`follower_id`);--> statement-breakpoint
CREATE INDEX `idx_creator` ON `explore_creator_follows` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_discovery_content` ON `explore_discovery_videos` (`explore_content_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_user` ON `explore_engagements` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_session` ON `explore_engagements` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_content` ON `explore_engagements` (`content_type`,`content_id`);--> statement-breakpoint
CREATE INDEX `idx_engage_type` ON `explore_engagements` (`engagement_type`);--> statement-breakpoint
CREATE INDEX `idx_feed_user` ON `explore_feed_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_feed_session` ON `explore_feed_sessions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_feed_date` ON `explore_feed_sessions` (`started_at`);--> statement-breakpoint
CREATE INDEX `idx_nbh_user` ON `explore_neighbourhood_follows` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_nbh_id` ON `explore_neighbourhood_follows` (`neighbourhood_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_neighbourhoods_province` ON `explore_neighbourhoods` (`province`);--> statement-breakpoint
CREATE INDEX `idx_saved_user` ON `explore_saved_properties` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_quota_type` ON `launch_content_quotas` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_loc_event_loc` ON `location_analytics_events` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_loc_event_type` ON `location_analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_loc_event_date` ON `location_analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_loc_search_loc` ON `location_searches` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_loc_search_date` ON `location_searches` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_loc_target_entity` ON `location_targeting` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_loc_target_loc` ON `location_targeting` (`location_id`);--> statement-breakpoint
CREATE INDEX `slug` ON `marketplace_bundles` (`slug`);--> statement-breakpoint
CREATE INDEX `` ON `properties` (`suburbId`);--> statement-breakpoint
CREATE INDEX `idx_province_slug` ON `provinces` (`slug`);--> statement-breakpoint
CREATE INDEX `` ON `provinces` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_recent_searches_user` ON `recent_searches` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_recent_searches_session` ON `recent_searches` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_recent_searches_date` ON `recent_searches` (`searched_at`);--> statement-breakpoint
CREATE INDEX `idx_spec_var_listing` ON `spec_variations` (`listingId`);--> statement-breakpoint
CREATE INDEX `idx_spec_var_unit_type` ON `spec_variations` (`unitTypeId`);--> statement-breakpoint
CREATE INDEX `idx_suburb_slug` ON `suburbs` (`slug`);--> statement-breakpoint
CREATE INDEX `` ON `suburbs` (`slug`);--> statement-breakpoint
CREATE INDEX `slug` ON `topics` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_auction_status` ON `unit_types` (`auction_status`);--> statement-breakpoint
CREATE INDEX `idx_explore_neighbourhoods_city` ON `explore_neighbourhoods` (`city`);--> statement-breakpoint
ALTER TABLE `developments` DROP COLUMN `developer_id`;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` DROP COLUMN `campaign_name`;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` DROP COLUMN `budget`;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` DROP COLUMN `spent`;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` DROP COLUMN `duration_days`;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` DROP COLUMN `target_audience`;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` DROP COLUMN `impressions`;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` DROP COLUMN `clicks`;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` DROP COLUMN `conversions`;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` DROP COLUMN `cost_per_click`;--> statement-breakpoint
ALTER TABLE `explore_content` DROP COLUMN `partner_id`;--> statement-breakpoint
ALTER TABLE `explore_content` DROP COLUMN `content_category`;--> statement-breakpoint
ALTER TABLE `explore_content` DROP COLUMN `badge_type`;--> statement-breakpoint
ALTER TABLE `explore_content` DROP COLUMN `is_launch_content`;--> statement-breakpoint
ALTER TABLE `explore_creator_follows` DROP COLUMN `user_id`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `property_id`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `development_id`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `transcoded_urls`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `music_track`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `has_subtitles`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `subtitle_url`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `total_views`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `total_watch_time`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `completion_rate`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `save_count`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `share_count`;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` DROP COLUMN `click_through_count`;--> statement-breakpoint
ALTER TABLE `explore_engagements` DROP COLUMN `watch_time`;--> statement-breakpoint
ALTER TABLE `explore_engagements` DROP COLUMN `completed`;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` DROP COLUMN `session_start`;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` DROP COLUMN `session_end`;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` DROP COLUMN `total_duration`;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` DROP COLUMN `videos_viewed`;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` DROP COLUMN `videos_completed`;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` DROP COLUMN `properties_saved`;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` DROP COLUMN `click_throughs`;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` DROP COLUMN `session_data`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `hero_banner_url`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `location_lat`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `location_lng`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `boundary_polygon`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `amenities`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `safety_rating`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `walkability_score`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `avg_property_price`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `price_trend`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `highlights`;--> statement-breakpoint
ALTER TABLE `explore_neighbourhoods` DROP COLUMN `video_count`;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` DROP COLUMN `content_id`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `price_range_min`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `price_range_max`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `preferred_locations`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `preferred_property_types`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `preferred_lifestyle_categories`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `followed_neighbourhoods`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `followed_creators`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `engagement_history`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `last_active`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` DROP COLUMN `updated_at`;--> statement-breakpoint
ALTER TABLE `location_analytics_events` DROP COLUMN `development_id`;--> statement-breakpoint
ALTER TABLE `location_analytics_events` DROP COLUMN `listing_id`;--> statement-breakpoint
ALTER TABLE `location_analytics_events` DROP COLUMN `target_id`;--> statement-breakpoint
ALTER TABLE `location_analytics_events` DROP COLUMN `metadata`;--> statement-breakpoint
ALTER TABLE `location_searches` DROP COLUMN `searched_at`;--> statement-breakpoint
ALTER TABLE `location_targeting` DROP COLUMN `target_type`;--> statement-breakpoint
ALTER TABLE `location_targeting` DROP COLUMN `target_id`;--> statement-breakpoint
ALTER TABLE `location_targeting` DROP COLUMN `location_type`;--> statement-breakpoint
ALTER TABLE `location_targeting` DROP COLUMN `ranking`;--> statement-breakpoint
ALTER TABLE `location_targeting` DROP COLUMN `start_date`;--> statement-breakpoint
ALTER TABLE `location_targeting` DROP COLUMN `end_date`;--> statement-breakpoint
ALTER TABLE `location_targeting` DROP COLUMN `status`;--> statement-breakpoint
ALTER TABLE `location_targeting` DROP COLUMN `metadata`;--> statement-breakpoint
ALTER TABLE `recent_searches` DROP COLUMN `location_id`;--> statement-breakpoint
ALTER TABLE `saved_searches` DROP COLUMN `filters`;--> statement-breakpoint
ALTER TABLE `saved_searches` DROP COLUMN `notificationMethod`;--> statement-breakpoint
ALTER TABLE `saved_searches` DROP COLUMN `lastNotified`;--> statement-breakpoint
ALTER TABLE `saved_searches` DROP COLUMN `isActive`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `unit_type_id`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `name`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `price`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `description`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `overrides`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `feature_overrides`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `media`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `display_order`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `is_active`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `spec_variations` DROP COLUMN `updated_at`;--> statement-breakpoint
ALTER TABLE `suburbs` DROP COLUMN `place_id`;--> statement-breakpoint
ALTER TABLE `suburbs` DROP COLUMN `seo_title`;--> statement-breakpoint
ALTER TABLE `suburbs` DROP COLUMN `seo_description`;--> statement-breakpoint
ALTER TABLE `suburbs` DROP COLUMN `pros`;--> statement-breakpoint
ALTER TABLE `suburbs` DROP COLUMN `cons`;--> statement-breakpoint
ALTER TABLE `suburbs` DROP COLUMN `ai_generation_date`;--> statement-breakpoint
ALTER TABLE `unit_types` DROP COLUMN `parking`;--> statement-breakpoint
ALTER TABLE `unit_types` DROP COLUMN `size_from`;--> statement-breakpoint
ALTER TABLE `unit_types` DROP COLUMN `size_to`;