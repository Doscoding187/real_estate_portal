CREATE TABLE `boost_credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`total_credits` int DEFAULT 0,
	`used_credits` int DEFAULT 0,
	`reset_at` timestamp,
	`expires_at` timestamp,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `development_documents` (
	`id` varchar(36) NOT NULL,
	`development_id` int NOT NULL,
	`unit_type_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`type` enum('brochure','site-plan','pricing-sheet','estate-rules','engineering-pack','other') NOT NULL,
	`url` varchar(500) NOT NULL,
	`file_size` int,
	`mime_type` varchar(100),
	`uploaded_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	CONSTRAINT `development_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`developerId` int NOT NULL,
	`draftName` varchar(255),
	`draftData` json NOT NULL,
	`progress` int NOT NULL DEFAULT 0,
	`currentStep` int NOT NULL DEFAULT 0,
	`lastModified` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_boost_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`creator_id` int NOT NULL,
	`content_id` int NOT NULL,
	`campaign_name` varchar(255),
	`budget` decimal(10,2),
	`spent` decimal(10,2) DEFAULT '0',
	`duration_days` int,
	`start_date` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`end_date` timestamp,
	`target_audience` json,
	`status` varchar(50) DEFAULT 'active',
	`impressions` int DEFAULT 0,
	`clicks` int DEFAULT 0,
	`conversions` int DEFAULT 0,
	`cost_per_click` decimal(10,2),
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`icon` varchar(50),
	`image` text,
	`type` enum('lifestyle','property','investment','demographic') NOT NULL DEFAULT 'lifestyle',
	`displayOrder` int DEFAULT 0,
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `exploreComments` (
	`id` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`userId` int NOT NULL,
	`comment` text NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_type` varchar(50) NOT NULL,
	`reference_id` int NOT NULL,
	`creator_id` int,
	`creator_type` enum('user','agent','developer','agency') NOT NULL DEFAULT 'user',
	`agency_id` int,
	`title` varchar(255),
	`description` text,
	`thumbnail_url` varchar(500),
	`video_url` varchar(500),
	`metadata` json,
	`tags` json,
	`lifestyle_categories` json,
	`location_lat` decimal(10,8),
	`location_lng` decimal(11,8),
	`price_min` int,
	`price_max` int,
	`view_count` int DEFAULT 0,
	`engagement_score` decimal(5,2) DEFAULT '0',
	`is_active` tinyint DEFAULT 1,
	`is_featured` tinyint DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_creator_follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`creator_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_discovery_videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`explore_content_id` int NOT NULL,
	`property_id` int,
	`development_id` int,
	`video_url` varchar(500) NOT NULL,
	`thumbnail_url` varchar(500) NOT NULL,
	`duration` int NOT NULL,
	`transcoded_urls` json,
	`music_track` varchar(255),
	`has_subtitles` tinyint DEFAULT 0,
	`subtitle_url` varchar(500),
	`total_views` int DEFAULT 0,
	`total_watch_time` int DEFAULT 0,
	`completion_rate` decimal(5,2) DEFAULT '0',
	`save_count` int DEFAULT 0,
	`share_count` int DEFAULT 0,
	`click_through_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_engagements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`content_id` int NOT NULL,
	`engagement_type` varchar(50) NOT NULL,
	`watch_time` int,
	`completed` tinyint DEFAULT 0,
	`session_id` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_feed_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`session_start` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`session_end` timestamp,
	`total_duration` int,
	`videos_viewed` int DEFAULT 0,
	`videos_completed` int DEFAULT 0,
	`properties_saved` int DEFAULT 0,
	`click_throughs` int DEFAULT 0,
	`device_type` varchar(50),
	`session_data` json
);
--> statement-breakpoint
CREATE TABLE `exploreFollows` (
	`id` varchar(191) NOT NULL,
	`followerId` int NOT NULL,
	`followingId` int NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `exploreLikes` (
	`id` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_neighbourhood_follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`neighbourhood_id` int NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_neighbourhood_stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suburb_id` int,
	`title` varchar(255) NOT NULL,
	`cover_image` text,
	`video_url` text,
	`story_data` json,
	`category` varchar(100),
	`is_published` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_neighbourhoods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`city` varchar(100),
	`province` varchar(100),
	`hero_banner_url` varchar(500),
	`description` text,
	`location_lat` decimal(10,8),
	`location_lng` decimal(11,8),
	`boundary_polygon` json,
	`amenities` json,
	`safety_rating` decimal(3,2),
	`walkability_score` int,
	`avg_property_price` int,
	`price_trend` json,
	`highlights` json,
	`follower_count` int DEFAULT 0,
	`property_count` int DEFAULT 0,
	`video_count` int DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `explore_saved_properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`content_id` int NOT NULL,
	`collection_name` varchar(255) DEFAULT 'Default',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_sponsorships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target_type` enum('listing','development','agent','video','neighbourhood') NOT NULL,
	`target_id` int NOT NULL,
	`tier` enum('basic','premium','exclusive') NOT NULL DEFAULT 'basic',
	`start_date` timestamp NOT NULL,
	`end_date` timestamp NOT NULL,
	`impressions_target` int,
	`impressions_delivered` int DEFAULT 0,
	`clicks_delivered` int DEFAULT 0,
	`status` enum('active','scheduled','completed','paused') NOT NULL DEFAULT 'scheduled',
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`coverImage` text,
	`type` enum('curated','algorithmic','seasonal','sponsored') NOT NULL DEFAULT 'curated',
	`isActive` int DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `explore_user_preferences_new` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`price_range_min` int,
	`price_range_max` int,
	`preferred_locations` json,
	`preferred_property_types` json,
	`preferred_lifestyle_categories` json,
	`followed_neighbourhoods` json,
	`followed_creators` json,
	`engagement_history` json,
	`last_active` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `exploreVideoViews` (
	`id` varchar(191) NOT NULL,
	`videoId` varchar(191) NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `location_analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`event_type` varchar(50) NOT NULL,
	`location_id` int,
	`development_id` int,
	`listing_id` int,
	`target_id` int,
	`metadata` json,
	`session_id` varchar(100),
	`user_id` int,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `location_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int NOT NULL,
	`user_id` int,
	`searched_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `location_targeting` (
	`id` int AUTO_INCREMENT NOT NULL,
	`target_type` enum('hero_ad','featured_developer','recommended_agent') NOT NULL,
	`target_id` int NOT NULL,
	`location_type` enum('province','city','suburb') NOT NULL,
	`location_id` int NOT NULL,
	`ranking` int DEFAULT 0,
	`start_date` timestamp,
	`end_date` timestamp,
	`status` enum('active','scheduled','expired','paused') NOT NULL DEFAULT 'scheduled',
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `recent_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`location_id` int NOT NULL,
	`searched_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `spec_variations` (
	`id` varchar(36) NOT NULL,
	`unit_type_id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`price` decimal(15,2) NOT NULL,
	`description` text,
	`overrides` json,
	`feature_overrides` json,
	`media` json,
	`display_order` int DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spec_variations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subscription_id` int,
	`event_type` enum('trial_started','trial_expiring_soon','trial_expired','subscription_created','subscription_renewed','subscription_upgraded','subscription_downgraded','subscription_cancelled','payment_succeeded','payment_failed','feature_locked','limit_reached') NOT NULL,
	`event_data` json,
	`metadata` json,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`plan_id` varchar(100) NOT NULL,
	`category` enum('agent','agency','developer') NOT NULL,
	`name` varchar(100) NOT NULL,
	`display_name` varchar(150) NOT NULL,
	`description` text,
	`price_zar` int NOT NULL,
	`billing_interval` enum('monthly','yearly') NOT NULL DEFAULT 'monthly',
	`trial_days` int DEFAULT 14,
	`is_trial_plan` tinyint DEFAULT 0,
	`is_free_plan` tinyint DEFAULT 0,
	`priority_level` int DEFAULT 0,
	`sort_order` int DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`features` json,
	`limits` json,
	`permissions` json,
	`upgrade_to_plan_id` varchar(100),
	`downgrade_to_plan_id` varchar(100),
	`stripe_price_id` varchar(255),
	`paystack_plan_code` varchar(255),
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `subscription_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`subscription_id` int NOT NULL,
	`period_start` timestamp NOT NULL,
	`period_end` timestamp NOT NULL,
	`listings_created` int DEFAULT 0,
	`projects_created` int DEFAULT 0,
	`agents_added` int DEFAULT 0,
	`boosts_used` int DEFAULT 0,
	`api_calls` int DEFAULT 0,
	`storage_mb` int DEFAULT 0,
	`crm_contacts` int DEFAULT 0,
	`emails_sent` int DEFAULT 0,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `unit_types` (
	`id` varchar(36) NOT NULL,
	`development_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`bedrooms` int NOT NULL,
	`bathrooms` decimal(3,1) NOT NULL,
	`parking` enum('none','1','2','carport','garage') DEFAULT 'none',
	`unit_size` int,
	`yard_size` int,
	`base_price_from` decimal(15,2) NOT NULL,
	`base_price_to` decimal(15,2),
	`base_features` json,
	`base_finishes` json,
	`base_media` json,
	`display_order` int DEFAULT 0,
	`is_active` tinyint DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `unit_types_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `user_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`plan_id` varchar(100) NOT NULL,
	`status` enum('trial_active','trial_expired','active_paid','past_due','cancelled','downgraded','grace_period') NOT NULL DEFAULT 'trial_active',
	`trial_started_at` timestamp,
	`trial_ends_at` timestamp,
	`trial_used` tinyint DEFAULT 0,
	`current_period_start` timestamp,
	`current_period_end` timestamp,
	`cancelled_at` timestamp,
	`ends_at` timestamp,
	`stripe_subscription_id` varchar(255),
	`stripe_customer_id` varchar(255),
	`paystack_subscription_code` varchar(255),
	`paystack_customer_code` varchar(255),
	`amount_zar` int,
	`billing_interval` enum('monthly','yearly'),
	`next_billing_date` timestamp,
	`payment_method_last4` varchar(4),
	`payment_method_type` varchar(50),
	`previous_plan_id` varchar(100),
	`downgrade_scheduled` tinyint DEFAULT 0,
	`downgrade_to_plan_id` varchar(100),
	`downgrade_effective_date` timestamp,
	`created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP',
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
DROP TABLE `advertising_campaigns`;--> statement-breakpoint
DROP TABLE `campaign_budgets`;--> statement-breakpoint
DROP TABLE `campaign_channels`;--> statement-breakpoint
DROP TABLE `campaign_creatives`;--> statement-breakpoint
DROP TABLE `campaign_leads`;--> statement-breakpoint
DROP TABLE `campaign_performance`;--> statement-breakpoint
DROP TABLE `campaign_schedules`;--> statement-breakpoint
DROP TABLE `campaign_targeting`;--> statement-breakpoint
DROP TABLE `failed_payments`;--> statement-breakpoint
DROP TABLE `marketing_campaigns`;--> statement-breakpoint
DROP TABLE `payment_proofs`;--> statement-breakpoint
DROP TABLE `revenue_forecasts`;--> statement-breakpoint
DROP TABLE `subscription_transactions`;--> statement-breakpoint
ALTER TABLE `developments` DROP INDEX `developments_slug_unique`;--> statement-breakpoint
ALTER TABLE `explore_highlight_tags` DROP INDEX `explore_highlight_tags_tag_key_unique`;--> statement-breakpoint
ALTER TABLE `explore_user_preferences` DROP INDEX `explore_user_preferences_user_id_unique`;--> statement-breakpoint
ALTER TABLE `locations` DROP INDEX `locations_place_id_unique`;--> statement-breakpoint
ALTER TABLE `activities` DROP FOREIGN KEY `activities_developerId_developers_id_fk`;
--> statement-breakpoint
ALTER TABLE `activities` DROP FOREIGN KEY `activities_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_notifications` DROP FOREIGN KEY `developer_notifications_developerId_developers_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_notifications` DROP FOREIGN KEY `developer_notifications_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP FOREIGN KEY `developer_subscription_limits_subscriptionId_developer_subscriptions_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP FOREIGN KEY `developer_subscription_usage_subscriptionId_developer_subscriptions_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP FOREIGN KEY `developer_subscriptions_developerId_developers_id_fk`;
--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP FOREIGN KEY `developer_subscriptions_planId_plans_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_phases` DROP FOREIGN KEY `development_phases_developmentId_developments_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_units` DROP FOREIGN KEY `development_units_developmentId_developments_id_fk`;
--> statement-breakpoint
ALTER TABLE `development_units` DROP FOREIGN KEY `development_units_phaseId_development_phases_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_interactions` DROP FOREIGN KEY `explore_interactions_short_id_explore_shorts_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_interactions` DROP FOREIGN KEY `explore_interactions_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_shorts` DROP FOREIGN KEY `explore_shorts_listing_id_listings_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_shorts` DROP FOREIGN KEY `explore_shorts_development_id_developments_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_shorts` DROP FOREIGN KEY `explore_shorts_agent_id_agents_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_shorts` DROP FOREIGN KEY `explore_shorts_developer_id_developers_id_fk`;
--> statement-breakpoint
ALTER TABLE `explore_user_preferences` DROP FOREIGN KEY `explore_user_preferences_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `videoLikes` DROP FOREIGN KEY `videoLikes_video_id_videos_id_fk`;
--> statement-breakpoint
ALTER TABLE `videoLikes` DROP FOREIGN KEY `videoLikes_user_id_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `videos` DROP FOREIGN KEY `videos_agent_id_agents_id_fk`;
--> statement-breakpoint
ALTER TABLE `videos` DROP FOREIGN KEY `videos_property_id_properties_id_fk`;
--> statement-breakpoint
ALTER TABLE `videos` DROP FOREIGN KEY `videos_development_id_developments_id_fk`;
--> statement-breakpoint
DROP INDEX `idx_activities_type` ON `activities`;--> statement-breakpoint
DROP INDEX `idx_activities_feed` ON `activities`;--> statement-breakpoint
DROP INDEX `idx_developments_location` ON `developments`;--> statement-breakpoint
DROP INDEX `idx_activities_developer_id` ON `activities`;--> statement-breakpoint
DROP INDEX `idx_activities_created_at` ON `activities`;--> statement-breakpoint
DROP INDEX `idx_activities_related_entity` ON `activities`;--> statement-breakpoint
DROP INDEX `idx_developer_notifications_developer_id` ON `developer_notifications`;--> statement-breakpoint
DROP INDEX `idx_developer_notifications_user_id` ON `developer_notifications`;--> statement-breakpoint
DROP INDEX `idx_developer_notifications_created_at` ON `developer_notifications`;--> statement-breakpoint
DROP INDEX `idx_developer_notifications_feed` ON `developer_notifications`;--> statement-breakpoint
ALTER TABLE `activities` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `developer_notifications` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `development_phases` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `development_units` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `developments` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `explore_highlight_tags` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `explore_interactions` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `explore_shorts` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `explore_user_preferences` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `listing_analytics` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `listing_approval_queue` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `listing_leads` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `listing_media` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `listing_settings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `listing_viewings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `listings` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `locations` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `developer_notifications` MODIFY COLUMN `read` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_notifications` MODIFY COLUMN `read` tinyint NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `specializations` json;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `pastProjects` int;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `slug` varchar(255);--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `status` enum('now-selling','launching-soon','under-construction','ready-to-move','sold-out','phase-completed','new-phase-launching','planning','completed','coming_soon') NOT NULL DEFAULT 'planning';--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `amenities` json;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `isFeatured` int NOT NULL;--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `views` int NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_highlight_tags` MODIFY COLUMN `is_active` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `explore_highlight_tags` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `explore_interactions` MODIFY COLUMN `timestamp` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `explore_shorts` MODIFY COLUMN `is_published` tinyint NOT NULL DEFAULT 1;--> statement-breakpoint
ALTER TABLE `explore_shorts` MODIFY COLUMN `is_featured` tinyint NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_shorts` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `explore_user_preferences` MODIFY COLUMN `created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listing_analytics` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listing_approval_queue` MODIFY COLUMN `submittedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listing_approval_queue` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listing_leads` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listing_media` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listing_media` MODIFY COLUMN `uploadedAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listing_viewings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `listings` MODIFY COLUMN `createdAt` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `place_id` varchar(255);--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `name` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `latitude` varchar(50);--> statement-breakpoint
ALTER TABLE `locations` MODIFY COLUMN `longitude` varchar(50);--> statement-breakpoint
ALTER TABLE `saved_searches` MODIFY COLUMN `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP';--> statement-breakpoint
ALTER TABLE `saved_searches` MODIFY COLUMN `updatedAt` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `isSubaccount` int NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `developer_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `activity_type` varchar(50) NOT NULL;--> statement-breakpoint
ALTER TABLE `activities` ADD `related_entity_type` enum('development','unit','lead','campaign','team_member');--> statement-breakpoint
ALTER TABLE `activities` ADD `related_entity_id` int;--> statement-breakpoint
ALTER TABLE `activities` ADD `user_id` int;--> statement-breakpoint
ALTER TABLE `activities` ADD `created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `cities` ADD `slug` varchar(200);--> statement-breakpoint
ALTER TABLE `cities` ADD `place_id` varchar(255);--> statement-breakpoint
ALTER TABLE `cities` ADD `seo_title` varchar(255);--> statement-breakpoint
ALTER TABLE `cities` ADD `seo_description` text;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD `developer_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD `user_id` int;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD `action_url` varchar(500);--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD `created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD `subscription_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD `max_developments` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD `max_leads_per_month` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD `max_team_members` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD `analytics_retention_days` int DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD `crm_integration_enabled` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD `advanced_analytics_enabled` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD `bond_integration_enabled` tinyint DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD `created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD `subscription_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD `developments_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD `leads_this_month` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD `team_members_count` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD `last_reset_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD `created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD `developer_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD `plan_id` int;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD `trial_ends_at` timestamp;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD `current_period_start` timestamp;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD `current_period_end` timestamp;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD `stripe_subscription_id` varchar(100);--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD `stripe_customer_id` varchar(100);--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD `created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `developers` ADD `slug` varchar(255);--> statement-breakpoint
ALTER TABLE `development_phases` ADD `development_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `phase_number` int NOT NULL;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `total_units` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `available_units` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `price_from` int;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `price_to` int;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `launch_date` timestamp;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `completion_date` timestamp;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `spec_type` enum('affordable','gap','luxury','custom') DEFAULT 'affordable';--> statement-breakpoint
ALTER TABLE `development_phases` ADD `custom_spec_type` varchar(100);--> statement-breakpoint
ALTER TABLE `development_phases` ADD `finishing_differences` json;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `phase_highlights` json;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `latitude` varchar(50);--> statement-breakpoint
ALTER TABLE `development_phases` ADD `longitude` varchar(50);--> statement-breakpoint
ALTER TABLE `development_phases` ADD `created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `development_phases` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `development_units` ADD `development_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `development_units` ADD `phase_id` int;--> statement-breakpoint
ALTER TABLE `development_units` ADD `unit_number` varchar(100) NOT NULL;--> statement-breakpoint
ALTER TABLE `development_units` ADD `unit_type` enum('studio','1bed','2bed','3bed','4bed+','penthouse','townhouse','house') NOT NULL;--> statement-breakpoint
ALTER TABLE `development_units` ADD `floor_plan` text;--> statement-breakpoint
ALTER TABLE `development_units` ADD `reserved_at` timestamp;--> statement-breakpoint
ALTER TABLE `development_units` ADD `reserved_by` int;--> statement-breakpoint
ALTER TABLE `development_units` ADD `sold_at` timestamp;--> statement-breakpoint
ALTER TABLE `development_units` ADD `created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `development_units` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `developments` ADD `rating` decimal(3,2);--> statement-breakpoint
ALTER TABLE `developments` ADD `suburb` varchar(100);--> statement-breakpoint
ALTER TABLE `developments` ADD `location_id` int;--> statement-breakpoint
ALTER TABLE `developments` ADD `postal_code` varchar(20);--> statement-breakpoint
ALTER TABLE `developments` ADD `gps_accuracy` enum('accurate','approximate') DEFAULT 'approximate';--> statement-breakpoint
ALTER TABLE `developments` ADD `highlights` json;--> statement-breakpoint
ALTER TABLE `developments` ADD `features` json;--> statement-breakpoint
ALTER TABLE `developments` ADD `inquiries_count` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developments` ADD `demand_score` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developments` ADD `is_hot_selling` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developments` ADD `is_high_demand` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD `agency_id` int;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD `content_type` enum('property_tour','development_promo','agent_intro','neighbourhood_tour','market_insight','lifestyle','education') DEFAULT 'property_tour' NOT NULL;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD `topic_id` int;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD `category_id` int;--> statement-breakpoint
ALTER TABLE `listing_settings` ADD `maxImageSizeMb` int DEFAULT 5 NOT NULL;--> statement-breakpoint
ALTER TABLE `listing_settings` ADD `maxVideoSizeMb` int DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` ADD `slug` varchar(200) NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` ADD `type` enum('province','city','suburb','neighborhood') NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` ADD `parentId` int;--> statement-breakpoint
ALTER TABLE `locations` ADD `description` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `viewport_ne_lat` decimal(10,8);--> statement-breakpoint
ALTER TABLE `locations` ADD `viewport_ne_lng` decimal(11,8);--> statement-breakpoint
ALTER TABLE `locations` ADD `viewport_sw_lat` decimal(10,8);--> statement-breakpoint
ALTER TABLE `locations` ADD `viewport_sw_lng` decimal(11,8);--> statement-breakpoint
ALTER TABLE `locations` ADD `seo_title` varchar(255);--> statement-breakpoint
ALTER TABLE `locations` ADD `seo_description` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `hero_image` varchar(500);--> statement-breakpoint
ALTER TABLE `locations` ADD `propertyCount` int;--> statement-breakpoint
ALTER TABLE `locations` ADD `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `properties` ADD `location_id` int;--> statement-breakpoint
ALTER TABLE `provinces` ADD `slug` varchar(200);--> statement-breakpoint
ALTER TABLE `provinces` ADD `place_id` varchar(255);--> statement-breakpoint
ALTER TABLE `provinces` ADD `seo_title` varchar(255);--> statement-breakpoint
ALTER TABLE `provinces` ADD `seo_description` text;--> statement-breakpoint
ALTER TABLE `suburbs` ADD `slug` varchar(200);--> statement-breakpoint
ALTER TABLE `suburbs` ADD `place_id` varchar(255);--> statement-breakpoint
ALTER TABLE `suburbs` ADD `seo_title` varchar(255);--> statement-breakpoint
ALTER TABLE `suburbs` ADD `seo_description` text;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD `videoId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD `userId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `agentId` int;--> statement-breakpoint
ALTER TABLE `videos` ADD `propertyId` int;--> statement-breakpoint
ALTER TABLE `videos` ADD `developmentId` int;--> statement-breakpoint
ALTER TABLE `videos` ADD `videoUrl` text NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `isPublished` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `isFeatured` int NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `createdAt` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `updatedAt` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `boost_credits` ADD CONSTRAINT `boost_credits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_documents` ADD CONSTRAINT `development_documents_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_documents` ADD CONSTRAINT `development_documents_unit_type_id_unit_types_id_fk` FOREIGN KEY (`unit_type_id`) REFERENCES `unit_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_drafts` ADD CONSTRAINT `development_drafts_developerId_developers_id_fk` FOREIGN KEY (`developerId`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD CONSTRAINT `explore_boost_campaigns_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD CONSTRAINT `explore_boost_campaigns_content_id_explore_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD CONSTRAINT `explore_creator_follows_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD CONSTRAINT `explore_creator_follows_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD CONSTRAINT `explore_discovery_videos_explore_content_id_explore_content_id_fk` FOREIGN KEY (`explore_content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD CONSTRAINT `explore_discovery_videos_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD CONSTRAINT `explore_discovery_videos_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD CONSTRAINT `explore_engagements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD CONSTRAINT `explore_engagements_content_id_explore_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD CONSTRAINT `explore_engagements_session_id_explore_feed_sessions_id_fk` FOREIGN KEY (`session_id`) REFERENCES `explore_feed_sessions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD CONSTRAINT `explore_feed_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` ADD CONSTRAINT `explore_neighbourhood_follows_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` ADD CONSTRAINT `explore_neighbourhood_follows_neighbourhood_id_explore_neighbourhoods_id_fk` FOREIGN KEY (`neighbourhood_id`) REFERENCES `explore_neighbourhoods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_stories` ADD CONSTRAINT `explore_neighbourhood_stories_suburb_id_suburbs_id_fk` FOREIGN KEY (`suburb_id`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `explore_saved_properties_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `explore_saved_properties_content_id_explore_content_id_fk` FOREIGN KEY (`content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD CONSTRAINT `explore_user_preferences_new_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_analytics_events` ADD CONSTRAINT `location_analytics_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_searches` ADD CONSTRAINT `location_searches_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_searches` ADD CONSTRAINT `location_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recent_searches` ADD CONSTRAINT `recent_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recent_searches` ADD CONSTRAINT `recent_searches_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD CONSTRAINT `spec_variations_unit_type_id_unit_types_id_fk` FOREIGN KEY (`unit_type_id`) REFERENCES `unit_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_events` ADD CONSTRAINT `subscription_events_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_usage` ADD CONSTRAINT `subscription_usage_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `unit_types` ADD CONSTRAINT `unit_types_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_subscriptions` ADD CONSTRAINT `user_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_user` ON `boost_credits` (`user_id`);--> statement-breakpoint
CREATE INDEX `unique_user_credits` ON `boost_credits` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_docs_development_id` ON `development_documents` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_docs_unit_type_id` ON `development_documents` (`unit_type_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_docs_type` ON `development_documents` (`type`);--> statement-breakpoint
CREATE INDEX `idx_dev_drafts_developer_id` ON `development_drafts` (`developerId`);--> statement-breakpoint
CREATE INDEX `idx_dev_drafts_last_modified` ON `development_drafts` (`lastModified`);--> statement-breakpoint
CREATE INDEX `idx_boost_campaigns_creator` ON `explore_boost_campaigns` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_boost_campaigns_status` ON `explore_boost_campaigns` (`status`);--> statement-breakpoint
CREATE INDEX `idx_boost_campaigns_dates` ON `explore_boost_campaigns` (`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_boost_campaigns_active` ON `explore_boost_campaigns` (`status`,`end_date`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_type` ON `explore_content` (`content_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_creator` ON `explore_content` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_creator_type` ON `explore_content` (`creator_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_agency_id` ON `explore_content` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_location` ON `explore_content` (`location_lat`,`location_lng`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_engagement` ON `explore_content` (`engagement_score`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_active` ON `explore_content` (`is_active`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_content_agency_active` ON `explore_content` (`agency_id`,`is_active`,`created_at`);--> statement-breakpoint
CREATE INDEX `unique_user_creator` ON `explore_creator_follows` (`user_id`,`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_creator_follows_user` ON `explore_creator_follows` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_creator_follows_creator` ON `explore_creator_follows` (`creator_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_discovery_videos_content` ON `explore_discovery_videos` (`explore_content_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_discovery_videos_property` ON `explore_discovery_videos` (`property_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_discovery_videos_development` ON `explore_discovery_videos` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_discovery_videos_performance` ON `explore_discovery_videos` (`completion_rate`,`total_views`);--> statement-breakpoint
CREATE INDEX `idx_explore_engagement_user` ON `explore_engagements` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_engagement_content` ON `explore_engagements` (`content_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_engagement_type` ON `explore_engagements` (`engagement_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_engagement_created` ON `explore_engagements` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_sessions_user` ON `explore_feed_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_sessions_start` ON `explore_feed_sessions` (`session_start`);--> statement-breakpoint
CREATE INDEX `unique_follow` ON `exploreFollows` (`followerId`,`followingId`);--> statement-breakpoint
CREATE INDEX `unique_like` ON `exploreLikes` (`videoId`,`userId`);--> statement-breakpoint
CREATE INDEX `unique_user_neighbourhood` ON `explore_neighbourhood_follows` (`user_id`,`neighbourhood_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_neighbourhood_follows_user` ON `explore_neighbourhood_follows` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_ens_suburb_id` ON `explore_neighbourhood_stories` (`suburb_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_neighbourhoods_location` ON `explore_neighbourhoods` (`location_lat`,`location_lng`);--> statement-breakpoint
CREATE INDEX `idx_explore_neighbourhoods_slug` ON `explore_neighbourhoods` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_explore_neighbourhoods_city` ON `explore_neighbourhoods` (`city`,`province`);--> statement-breakpoint
CREATE INDEX `unique_user_content` ON `explore_saved_properties` (`user_id`,`content_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_saved_user` ON `explore_saved_properties` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_saved_collection` ON `explore_saved_properties` (`user_id`,`collection_name`);--> statement-breakpoint
CREATE INDEX `idx_es_target` ON `explore_sponsorships` (`target_type`,`target_id`);--> statement-breakpoint
CREATE INDEX `idx_es_status` ON `explore_sponsorships` (`status`);--> statement-breakpoint
CREATE INDEX `idx_explore_user_pref_user` ON `explore_user_preferences_new` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_user_pref_active` ON `explore_user_preferences_new` (`last_active`);--> statement-breakpoint
CREATE INDEX `idx_loc_analytics_event` ON `location_analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_loc_analytics_created` ON `location_analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_loc_analytics_location` ON `location_analytics_events` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_loc_analytics_development` ON `location_analytics_events` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_location_searched` ON `location_searches` (`location_id`,`searched_at`);--> statement-breakpoint
CREATE INDEX `idx_user_id` ON `location_searches` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_location_targeting` ON `location_targeting` (`location_type`,`location_id`,`status`);--> statement-breakpoint
CREATE INDEX `idx_user_recent` ON `recent_searches` (`user_id`,`searched_at`);--> statement-breakpoint
CREATE INDEX `unique_user_location` ON `recent_searches` (`user_id`,`location_id`);--> statement-breakpoint
CREATE INDEX `idx_spec_variations_unit_type_id` ON `spec_variations` (`unit_type_id`);--> statement-breakpoint
CREATE INDEX `idx_spec_variations_price` ON `spec_variations` (`price`);--> statement-breakpoint
CREATE INDEX `idx_spec_variations_display_order` ON `spec_variations` (`display_order`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `subscription_events` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_event_type` ON `subscription_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_category` ON `subscription_plans` (`category`);--> statement-breakpoint
CREATE INDEX `idx_active` ON `subscription_plans` (`is_active`);--> statement-breakpoint
CREATE INDEX `plan_id` ON `subscription_plans` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_user_period` ON `subscription_usage` (`user_id`,`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_development_id` ON `unit_types` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_price_range` ON `unit_types` (`base_price_from`,`base_price_to`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_bedrooms_bathrooms` ON `unit_types` (`bedrooms`,`bathrooms`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_display_order` ON `unit_types` (`display_order`);--> statement-breakpoint
CREATE INDEX `idx_user` ON `user_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_status` ON `user_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `unique_user_subscription` ON `user_subscriptions` (`user_id`);--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activities` ADD CONSTRAINT `activities_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD CONSTRAINT `developer_notifications_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_notifications` ADD CONSTRAINT `developer_notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` ADD CONSTRAINT `developer_subscription_limits_subscription_id_developer_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` ADD CONSTRAINT `developer_subscription_usage_subscription_id_developer_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `developer_subscriptions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `developer_subscriptions_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` ADD CONSTRAINT `developer_subscriptions_plan_id_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_phases` ADD CONSTRAINT `development_phases_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_units` ADD CONSTRAINT `development_units_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_units` ADD CONSTRAINT `development_units_phase_id_development_phases_id_fk` FOREIGN KEY (`phase_id`) REFERENCES `development_phases`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_topic_id_explore_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `explore_topics`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_category_id_explore_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `explore_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_analytics` ADD CONSTRAINT `listing_analytics_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_approval_queue` ADD CONSTRAINT `listing_approval_queue_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_leads` ADD CONSTRAINT `listing_leads_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_media` ADD CONSTRAINT `listing_media_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `listing_viewings` ADD CONSTRAINT `listing_viewings_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `properties_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD CONSTRAINT `videoLikes_videoId_videos_id_fk` FOREIGN KEY (`videoId`) REFERENCES `videos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD CONSTRAINT `videoLikes_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_agentId_agents_id_fk` FOREIGN KEY (`agentId`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_developmentId_developments_id_fk` FOREIGN KEY (`developmentId`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_activities_activity_type` ON `activities` (`activity_type`);--> statement-breakpoint
CREATE INDEX `idx_cities_slug` ON `cities` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_cities_place_id` ON `cities` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_cities_slug_province` ON `cities` (`slug`,`provinceId`);--> statement-breakpoint
CREATE INDEX `idx_developer_subscription_limits_subscription_id` ON `developer_subscription_limits` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_subscription_usage_subscription_id` ON `developer_subscription_usage` (`subscription_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_subscriptions_developer_id` ON `developer_subscriptions` (`developer_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_subscriptions_status` ON `developer_subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `idx_developer_subscriptions_tier` ON `developer_subscriptions` (`tier`);--> statement-breakpoint
CREATE INDEX `idx_developers_userId` ON `developers` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_developers_status` ON `developers` (`status`);--> statement-breakpoint
CREATE INDEX `idx_development_phases_development_id` ON `development_phases` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_development_phases_status` ON `development_phases` (`status`);--> statement-breakpoint
CREATE INDEX `idx_development_phases_spec_type` ON `development_phases` (`spec_type`);--> statement-breakpoint
CREATE INDEX `unique_unit_per_development` ON `development_units` (`development_id`,`unit_number`);--> statement-breakpoint
CREATE INDEX `idx_units_development_id` ON `development_units` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_units_phase_id` ON `development_units` (`phase_id`);--> statement-breakpoint
CREATE INDEX `idx_units_status` ON `development_units` (`status`);--> statement-breakpoint
CREATE INDEX `idx_units_unit_type` ON `development_units` (`unit_type`);--> statement-breakpoint
CREATE INDEX `idx_units_price` ON `development_units` (`price`);--> statement-breakpoint
CREATE INDEX `idx_developments_developer_id` ON `developments` (`developerId`);--> statement-breakpoint
CREATE INDEX `idx_developments_status` ON `developments` (`status`);--> statement-breakpoint
CREATE INDEX `idx_developments_gps_accuracy` ON `developments` (`gps_accuracy`);--> statement-breakpoint
CREATE INDEX `idx_developments_suburb` ON `developments` (`suburb`);--> statement-breakpoint
CREATE INDEX `idx_developments_location_id` ON `developments` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_developments_rating` ON `developments` (`rating`);--> statement-breakpoint
CREATE INDEX `idx_developments_published` ON `developments` (`isPublished`,`publishedAt`);--> statement-breakpoint
CREATE INDEX `tag_key` ON `explore_highlight_tags` (`tag_key`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_id` ON `explore_shorts` (`agency_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_published` ON `explore_shorts` (`agency_id`,`is_published`,`published_at`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agency_performance` ON `explore_shorts` (`agency_id`,`performance_score`,`view_count`);--> statement-breakpoint
CREATE INDEX `user_id` ON `explore_user_preferences` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_leads_qualification_status` ON `leads` (`qualification_status`);--> statement-breakpoint
CREATE INDEX `idx_leads_funnel_stage` ON `leads` (`funnel_stage`);--> statement-breakpoint
CREATE INDEX `idx_leads_assigned_to` ON `leads` (`assigned_to`);--> statement-breakpoint
CREATE INDEX `idx_leads_lead_source` ON `leads` (`lead_source`);--> statement-breakpoint
CREATE INDEX `idx_locations_place_id` ON `locations` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_locations_slug` ON `locations` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_locations_parent_id` ON `locations` (`parentId`);--> statement-breakpoint
CREATE INDEX `idx_properties_cityId` ON `properties` (`cityId`);--> statement-breakpoint
CREATE INDEX `idx_properties_suburbId` ON `properties` (`suburbId`);--> statement-breakpoint
CREATE INDEX `idx_properties_location_id` ON `properties` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_properties_cityId_status` ON `properties` (`cityId`,`status`);--> statement-breakpoint
CREATE INDEX `idx_properties_cityId_area` ON `properties` (`cityId`,`area`);--> statement-breakpoint
CREATE INDEX `idx_provinces_slug` ON `provinces` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_provinces_place_id` ON `provinces` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_suburbs_slug` ON `suburbs` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_suburbs_place_id` ON `suburbs` (`place_id`);--> statement-breakpoint
CREATE INDEX `idx_suburbs_slug_city` ON `suburbs` (`slug`,`cityId`);--> statement-breakpoint
CREATE INDEX `idx_activities_developer_id` ON `activities` (`developer_id`);--> statement-breakpoint
CREATE INDEX `idx_activities_created_at` ON `activities` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_activities_related_entity` ON `activities` (`related_entity_type`,`related_entity_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_developer_id` ON `developer_notifications` (`developer_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_user_id` ON `developer_notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_created_at` ON `developer_notifications` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_developer_notifications_feed` ON `developer_notifications` (`developer_id`,`read`,`created_at`);--> statement-breakpoint
ALTER TABLE `activities` DROP COLUMN `developerId`;--> statement-breakpoint
ALTER TABLE `activities` DROP COLUMN `activityType`;--> statement-breakpoint
ALTER TABLE `activities` DROP COLUMN `relatedEntityType`;--> statement-breakpoint
ALTER TABLE `activities` DROP COLUMN `relatedEntityId`;--> statement-breakpoint
ALTER TABLE `activities` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `activities` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `developer_notifications` DROP COLUMN `developerId`;--> statement-breakpoint
ALTER TABLE `developer_notifications` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `developer_notifications` DROP COLUMN `actionUrl`;--> statement-breakpoint
ALTER TABLE `developer_notifications` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP COLUMN `subscriptionId`;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP COLUMN `maxDevelopments`;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP COLUMN `maxLeadsPerMonth`;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP COLUMN `maxTeamMembers`;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP COLUMN `analyticsRetentionDays`;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP COLUMN `crmIntegrationEnabled`;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP COLUMN `advancedAnalyticsEnabled`;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP COLUMN `bondIntegrationEnabled`;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `developer_subscription_limits` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP COLUMN `subscriptionId`;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP COLUMN `developmentsCount`;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP COLUMN `leadsThisMonth`;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP COLUMN `teamMembersCount`;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP COLUMN `lastResetAt`;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `developer_subscription_usage` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP COLUMN `developerId`;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP COLUMN `planId`;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP COLUMN `trialEndsAt`;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP COLUMN `currentPeriodStart`;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP COLUMN `currentPeriodEnd`;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP COLUMN `stripeSubscriptionId`;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP COLUMN `stripeCustomerId`;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `developer_subscriptions` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `development_phases` DROP COLUMN `developmentId`;--> statement-breakpoint
ALTER TABLE `development_phases` DROP COLUMN `phaseNumber`;--> statement-breakpoint
ALTER TABLE `development_phases` DROP COLUMN `totalUnits`;--> statement-breakpoint
ALTER TABLE `development_phases` DROP COLUMN `availableUnits`;--> statement-breakpoint
ALTER TABLE `development_phases` DROP COLUMN `priceFrom`;--> statement-breakpoint
ALTER TABLE `development_phases` DROP COLUMN `priceTo`;--> statement-breakpoint
ALTER TABLE `development_phases` DROP COLUMN `launchDate`;--> statement-breakpoint
ALTER TABLE `development_phases` DROP COLUMN `completionDate`;--> statement-breakpoint
ALTER TABLE `development_phases` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `development_phases` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `development_units` DROP COLUMN `developmentId`;--> statement-breakpoint
ALTER TABLE `development_units` DROP COLUMN `phaseId`;--> statement-breakpoint
ALTER TABLE `development_units` DROP COLUMN `unitNumber`;--> statement-breakpoint
ALTER TABLE `development_units` DROP COLUMN `unitType`;--> statement-breakpoint
ALTER TABLE `development_units` DROP COLUMN `floorPlan`;--> statement-breakpoint
ALTER TABLE `development_units` DROP COLUMN `reservedAt`;--> statement-breakpoint
ALTER TABLE `development_units` DROP COLUMN `reservedBy`;--> statement-breakpoint
ALTER TABLE `development_units` DROP COLUMN `soldAt`;--> statement-breakpoint
ALTER TABLE `development_units` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `development_units` DROP COLUMN `updatedAt`;--> statement-breakpoint
ALTER TABLE `listing_settings` DROP COLUMN `maxImageSizeMB`;--> statement-breakpoint
ALTER TABLE `listing_settings` DROP COLUMN `maxVideoSizeMB`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `full_address`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `location_type`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `province`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `country`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `locations` DROP COLUMN `updated_at`;--> statement-breakpoint
ALTER TABLE `videoLikes` DROP COLUMN `video_id`;--> statement-breakpoint
ALTER TABLE `videoLikes` DROP COLUMN `user_id`;--> statement-breakpoint
ALTER TABLE `videoLikes` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `agent_id`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `property_id`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `development_id`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `video_url`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `is_published`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `is_featured`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `created_at`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `updated_at`;