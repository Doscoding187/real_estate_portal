CREATE TABLE `development_documents` (
	`id` varchar(36) NOT NULL,
	`development_id` int NOT NULL,
	`unit_type_id` varchar(36),
	`name` varchar(255) NOT NULL,
	`type` enum('brochure','site-plan','pricing-sheet','estate-rules','engineering-pack','other') NOT NULL,
	`url` varchar(500) NOT NULL,
	`file_size` int,
	`mime_type` varchar(100),
	`uploaded_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `development_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `development_partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`brand_profile_id` int NOT NULL,
	`partner_type` enum('co_developer','joint_venture','investor','builder','marketing_agency','selling_agency') NOT NULL DEFAULT 'co_developer',
	`permissions` json,
	`visibility_scope` enum('profile_public','internal_only','marketing_only') NOT NULL DEFAULT 'profile_public',
	`display_order` int NOT NULL DEFAULT 0,
	`is_primary` tinyint NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `development_partners_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_dev_partner_unique` UNIQUE(`development_id`,`brand_profile_id`)
);
--> statement-breakpoint
CREATE TABLE `explore_boost_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`creator_id` int NOT NULL,
	`partner_id` int,
	`content_type` enum('video','story','post','development','listing','profile') NOT NULL,
	`content_id` int NOT NULL,
	`campaign_type` enum('reach','engagement','clicks','conversion') NOT NULL,
	`status` enum('draft','pending','active','paused','completed','rejected') NOT NULL DEFAULT 'draft',
	`budget_total` decimal(10,2) NOT NULL,
	`budget_spend` decimal(10,2) DEFAULT '0.00',
	`start_date` date NOT NULL,
	`end_date` date,
	`targeting` json,
	`metrics` json,
	`payment_status` enum('pending','paid','failed','refunded') NOT NULL DEFAULT 'pending',
	`invoice_id` varchar(100),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_boost_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_creator_follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`follower_id` int NOT NULL,
	`creator_id` int NOT NULL,
	`notification_level` enum('all','highlights','none') NOT NULL DEFAULT 'all',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `explore_creator_follows_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_creator_follow` UNIQUE(`follower_id`,`creator_id`)
);
--> statement-breakpoint
CREATE TABLE `explore_discovery_videos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`explore_content_id` int NOT NULL,
	`title` varchar(255) NOT NULL,
	`description` text,
	`video_url` varchar(500) NOT NULL,
	`thumbnail_url` varchar(500),
	`duration` int,
	`aspect_ratio` varchar(20),
	`resolution` varchar(20),
	`file_size` int,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `explore_discovery_videos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_engagements` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`session_id` varchar(100),
	`content_type` enum('video','story','post','reels') NOT NULL,
	`content_id` int NOT NULL,
	`engagement_type` enum('view','like','share','save','comment','click_cta','profile_visit') NOT NULL,
	`duration` int,
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `explore_engagements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_feed_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`session_id` varchar(100) NOT NULL,
	`algorithm_version` varchar(50),
	`feed_type` enum('for_you','following','nearby','trending') DEFAULT 'for_you',
	`items_viewed` int DEFAULT 0,
	`duration_seconds` int DEFAULT 0,
	`device_type` varchar(50),
	`location_user` json,
	`exit_reason` varchar(50),
	`started_at` timestamp NOT NULL DEFAULT (now()),
	`ended_at` timestamp,
	CONSTRAINT `explore_feed_sessions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_neighbourhood_follows` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`neighbourhood_id` int NOT NULL,
	`notification_level` enum('all','highlights','none') NOT NULL DEFAULT 'all',
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `explore_neighbourhood_follows_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_nbh_follow` UNIQUE(`user_id`,`neighbourhood_id`)
);
--> statement-breakpoint
CREATE TABLE `explore_saved_properties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`property_id` int,
	`development_id` int,
	`collection_name` varchar(100) DEFAULT 'Favorites',
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `explore_saved_properties_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_saved_prop` UNIQUE(`user_id`,`property_id`),
	CONSTRAINT `unique_saved_dev` UNIQUE(`user_id`,`development_id`)
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
CREATE TABLE `explore_user_preferences_new` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`topics` json,
	`categories` json,
	`locations` json,
	`price_range` json,
	`content_types` json,
	`creator_preferences` json,
	`notification_settings` json,
	`last_updated` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_user_preferences_new_id` PRIMARY KEY(`id`),
	CONSTRAINT `idx_user_pref_new` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `location_analytics_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int NOT NULL,
	`event_type` varchar(50) NOT NULL,
	`event_data` json,
	`user_id` int,
	`session_id` varchar(100),
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `location_analytics_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int NOT NULL,
	`user_id` int,
	`session_id` varchar(100),
	`search_metadata` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `location_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `location_targeting` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` varchar(50) NOT NULL,
	`entity_id` int NOT NULL,
	`location_id` int NOT NULL,
	`radius_km` int DEFAULT 0,
	`weight` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `location_targeting_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partners` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` enum('mortgage_broker','lawyer','photographer','inspector','mover','other') NOT NULL DEFAULT 'other',
	`description` text,
	`contact_person` varchar(255),
	`email` varchar(320),
	`phone` varchar(50),
	`website` varchar(255),
	`logo` text,
	`status` enum('active','inactive','pending') NOT NULL DEFAULT 'active',
	`rating` int,
	`is_verified` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `partners_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `platform_inquiries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(50),
	`userType` enum('agent','developer','seller','partner','other') NOT NULL,
	`intent` enum('advertise','software','partnership','support') NOT NULL DEFAULT 'advertise',
	`message` text,
	`status` enum('new','contacted','converted','closed') NOT NULL DEFAULT 'new',
	`metadata` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `platform_inquiries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `property_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`userId` int,
	`sessionId` varchar(255),
	`position` int,
	`searchFilters` json,
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `property_clicks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `recent_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`session_id` varchar(255),
	`query` varchar(255) NOT NULL,
	`filters` json,
	`location` varchar(255),
	`result_count` int DEFAULT 0,
	`searched_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `recent_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `search_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`sessionId` varchar(255),
	`filters` json NOT NULL,
	`resultCount` int,
	`sortOrder` varchar(50),
	`viewMode` varchar(20),
	`createdAt` timestamp DEFAULT (now()),
	CONSTRAINT `search_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `spec_variations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listingId` int,
	`unitTypeId` varchar(36),
	`variationName` varchar(255) NOT NULL,
	`priceOverride` decimal(15,2),
	`specOverrides` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `spec_variations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `suburb_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suburb_id` int NOT NULL,
	`user_id` int,
	`rating` int NOT NULL,
	`user_type` enum('resident','tenant','landlord','visitor') NOT NULL DEFAULT 'resident',
	`pros` text,
	`cons` text,
	`comment` text,
	`is_verified` tinyint DEFAULT 0,
	`is_published` tinyint DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `suburb_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `developments` ADD `auction_start_date` timestamp;--> statement-breakpoint
ALTER TABLE `developments` ADD `auction_end_date` timestamp;--> statement-breakpoint
ALTER TABLE `developments` ADD `starting_bid_from` decimal(15,2);--> statement-breakpoint
ALTER TABLE `developments` ADD `reserve_price_from` decimal(15,2);--> statement-breakpoint
ALTER TABLE `listings` ADD `locationId` int;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `starting_bid` decimal(15,2);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `reserve_price` decimal(15,2);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `auction_start_date` timestamp;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `auction_end_date` timestamp;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `auction_status` enum('scheduled','active','sold','passed_in','withdrawn') DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE `development_documents` ADD CONSTRAINT `development_documents_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_documents` ADD CONSTRAINT `development_documents_unit_type_id_unit_types_id_fk` FOREIGN KEY (`unit_type_id`) REFERENCES `unit_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_partners` ADD CONSTRAINT `development_partners_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_partners` ADD CONSTRAINT `development_partners_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD CONSTRAINT `explore_boost_campaigns_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD CONSTRAINT `explore_boost_campaigns_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_boost_campaigns` ADD CONSTRAINT `explore_boost_campaigns_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD CONSTRAINT `explore_creator_follows_follower_id_users_id_fk` FOREIGN KEY (`follower_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_creator_follows` ADD CONSTRAINT `explore_creator_follows_creator_id_users_id_fk` FOREIGN KEY (`creator_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_discovery_videos` ADD CONSTRAINT `explore_discovery_videos_explore_content_id_explore_content_id_fk` FOREIGN KEY (`explore_content_id`) REFERENCES `explore_content`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_engagements` ADD CONSTRAINT `explore_engagements_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_feed_sessions` ADD CONSTRAINT `explore_feed_sessions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` ADD CONSTRAINT `explore_neighbourhood_follows_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_neighbourhood_follows` ADD CONSTRAINT `explore_neighbourhood_follows_neighbourhood_id_explore_neighbourhoods_id_fk` FOREIGN KEY (`neighbourhood_id`) REFERENCES `explore_neighbourhoods`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `explore_saved_properties_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `explore_saved_properties_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_saved_properties` ADD CONSTRAINT `explore_saved_properties_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_sponsorships` ADD CONSTRAINT `explore_sponsorships_partner_id_explore_partners_id_fk` FOREIGN KEY (`partner_id`) REFERENCES `explore_partners`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_user_preferences_new` ADD CONSTRAINT `explore_user_preferences_new_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_analytics_events` ADD CONSTRAINT `location_analytics_events_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_searches` ADD CONSTRAINT `location_searches_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `location_targeting` ADD CONSTRAINT `location_targeting_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_clicks` ADD CONSTRAINT `property_clicks_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_clicks` ADD CONSTRAINT `property_clicks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `recent_searches` ADD CONSTRAINT `recent_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `search_analytics` ADD CONSTRAINT `search_analytics_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD CONSTRAINT `spec_variations_listingId_listings_id_fk` FOREIGN KEY (`listingId`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `spec_variations` ADD CONSTRAINT `spec_variations_unitTypeId_unit_types_id_fk` FOREIGN KEY (`unitTypeId`) REFERENCES `unit_types`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_reviews` ADD CONSTRAINT `suburb_reviews_suburb_id_suburbs_id_fk` FOREIGN KEY (`suburb_id`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_reviews` ADD CONSTRAINT `suburb_reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_dev_docs_development_id` ON `development_documents` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_docs_unit_type_id` ON `development_documents` (`unit_type_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_docs_type` ON `development_documents` (`type`);--> statement-breakpoint
CREATE INDEX `idx_dev_partners_development_id` ON `development_partners` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_partners_brand_profile_id` ON `development_partners` (`brand_profile_id`);--> statement-breakpoint
CREATE INDEX `idx_dev_partners_partner_type` ON `development_partners` (`partner_type`);--> statement-breakpoint
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
CREATE INDEX `idx_saved_user` ON `explore_saved_properties` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_sponsor_partner` ON `explore_sponsorships` (`partner_id`);--> statement-breakpoint
CREATE INDEX `idx_sponsor_content` ON `explore_sponsorships` (`content_type`,`content_id`);--> statement-breakpoint
CREATE INDEX `idx_sponsor_status` ON `explore_sponsorships` (`status`);--> statement-breakpoint
CREATE INDEX `idx_loc_event_loc` ON `location_analytics_events` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_loc_event_type` ON `location_analytics_events` (`event_type`);--> statement-breakpoint
CREATE INDEX `idx_loc_event_date` ON `location_analytics_events` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_loc_search_loc` ON `location_searches` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_loc_search_date` ON `location_searches` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_loc_target_entity` ON `location_targeting` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_loc_target_loc` ON `location_targeting` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_partners_status` ON `partners` (`status`);--> statement-breakpoint
CREATE INDEX `idx_partners_category` ON `partners` (`category`);--> statement-breakpoint
CREATE INDEX `idx_property_clicks_property` ON `property_clicks` (`propertyId`);--> statement-breakpoint
CREATE INDEX `idx_property_clicks_created` ON `property_clicks` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_property_clicks_session` ON `property_clicks` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_recent_searches_user` ON `recent_searches` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_recent_searches_session` ON `recent_searches` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_recent_searches_date` ON `recent_searches` (`searched_at`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_created` ON `search_analytics` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_user` ON `search_analytics` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_session` ON `search_analytics` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_spec_var_listing` ON `spec_variations` (`listingId`);--> statement-breakpoint
CREATE INDEX `idx_spec_var_unit_type` ON `spec_variations` (`unitTypeId`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_suburb` ON `suburb_reviews` (`suburb_id`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_user` ON `suburb_reviews` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_rating` ON `suburb_reviews` (`rating`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_published` ON `suburb_reviews` (`is_published`);--> statement-breakpoint
ALTER TABLE `listings` ADD CONSTRAINT `listings_locationId_locations_id_fk` FOREIGN KEY (`locationId`) REFERENCES `locations`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_developments_auction_dates` ON `developments` (`auction_start_date`,`auction_end_date`);--> statement-breakpoint
CREATE INDEX `idx_unit_types_auction_status` ON `unit_types` (`auction_status`);