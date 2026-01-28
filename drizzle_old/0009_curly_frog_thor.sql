CREATE TABLE `explore_highlight_tags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`tag_key` varchar(50) NOT NULL,
	`label` varchar(100) NOT NULL,
	`icon` varchar(50),
	`color` varchar(7),
	`category` varchar(50),
	`display_order` int NOT NULL DEFAULT 0,
	`is_active` int NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `explore_highlight_tags_id` PRIMARY KEY(`id`),
	CONSTRAINT `explore_highlight_tags_tag_key_unique` UNIQUE(`tag_key`)
);
--> statement-breakpoint
CREATE TABLE `explore_interactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`short_id` int NOT NULL,
	`user_id` int,
	`session_id` varchar(255) NOT NULL,
	`interaction_type` enum('impression','view','skip','save','share','contact','whatsapp','book_viewing') NOT NULL,
	`duration` int,
	`timestamp` timestamp NOT NULL DEFAULT (now()),
	`feed_type` enum('recommended','area','category','agent','developer') NOT NULL,
	`feed_context` json,
	`device_type` enum('mobile','tablet','desktop') NOT NULL,
	`user_agent` text,
	`ip_address` varchar(45),
	`metadata` json,
	CONSTRAINT `explore_interactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_shorts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`listing_id` int,
	`development_id` int,
	`agent_id` int,
	`developer_id` int,
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
	`is_published` int NOT NULL DEFAULT 1,
	`is_featured` int NOT NULL DEFAULT 0,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`published_at` timestamp,
	CONSTRAINT `explore_shorts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `explore_user_preferences` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`preferred_locations` json,
	`budget_min` int,
	`budget_max` int,
	`property_types` json,
	`interaction_history` json,
	`saved_properties` json,
	`inferred_preferences` json,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `explore_user_preferences_id` PRIMARY KEY(`id`),
	CONSTRAINT `explore_user_preferences_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
ALTER TABLE `videoLikes` DROP FOREIGN KEY `videoLikes_videoId_videos_id_fk`;
--> statement-breakpoint
ALTER TABLE `videoLikes` DROP FOREIGN KEY `videoLikes_userId_users_id_fk`;
--> statement-breakpoint
ALTER TABLE `videos` DROP FOREIGN KEY `videos_agentId_agents_id_fk`;
--> statement-breakpoint
ALTER TABLE `videos` DROP FOREIGN KEY `videos_propertyId_properties_id_fk`;
--> statement-breakpoint
ALTER TABLE `videos` DROP FOREIGN KEY `videos_developmentId_developments_id_fk`;
--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `completedProjects` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `currentProjects` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developers` MODIFY COLUMN `upcomingProjects` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `developments` ADD `showHouseAddress` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD `video_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD `user_id` int NOT NULL;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD `created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `agent_id` int;--> statement-breakpoint
ALTER TABLE `videos` ADD `property_id` int;--> statement-breakpoint
ALTER TABLE `videos` ADD `development_id` int;--> statement-breakpoint
ALTER TABLE `videos` ADD `video_url` text NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `is_published` int DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `is_featured` int NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `created_at` timestamp DEFAULT 'CURRENT_TIMESTAMP' NOT NULL;--> statement-breakpoint
ALTER TABLE `videos` ADD `updated_at` timestamp DEFAULT (now()) NOT NULL ON UPDATE CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE `explore_interactions` ADD CONSTRAINT `explore_interactions_short_id_explore_shorts_id_fk` FOREIGN KEY (`short_id`) REFERENCES `explore_shorts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_interactions` ADD CONSTRAINT `explore_interactions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_listing_id_listings_id_fk` FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `explore_user_preferences` ADD CONSTRAINT `explore_user_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_explore_highlight_tags_category` ON `explore_highlight_tags` (`category`);--> statement-breakpoint
CREATE INDEX `idx_explore_highlight_tags_display_order` ON `explore_highlight_tags` (`display_order`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_short_id` ON `explore_interactions` (`short_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_user_id` ON `explore_interactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_session_id` ON `explore_interactions` (`session_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_type` ON `explore_interactions` (`interaction_type`);--> statement-breakpoint
CREATE INDEX `idx_explore_interactions_timestamp` ON `explore_interactions` (`timestamp`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_listing_id` ON `explore_shorts` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_development_id` ON `explore_shorts` (`development_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_agent_id` ON `explore_shorts` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_performance_score` ON `explore_shorts` (`performance_score`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_boost_priority` ON `explore_shorts` (`boost_priority`);--> statement-breakpoint
CREATE INDEX `idx_explore_shorts_published` ON `explore_shorts` (`is_published`,`published_at`);--> statement-breakpoint
ALTER TABLE `videoLikes` ADD CONSTRAINT `videoLikes_video_id_videos_id_fk` FOREIGN KEY (`video_id`) REFERENCES `videos`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videoLikes` ADD CONSTRAINT `videoLikes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_agent_id_agents_id_fk` FOREIGN KEY (`agent_id`) REFERENCES `agents`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_property_id_properties_id_fk` FOREIGN KEY (`property_id`) REFERENCES `properties`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `videos` ADD CONSTRAINT `videos_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_developments_location` ON `developments` (`latitude`,`longitude`);--> statement-breakpoint
ALTER TABLE `videoLikes` DROP COLUMN `videoId`;--> statement-breakpoint
ALTER TABLE `videoLikes` DROP COLUMN `userId`;--> statement-breakpoint
ALTER TABLE `videoLikes` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `agentId`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `propertyId`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `developmentId`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `videoUrl`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `isPublished`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `isFeatured`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `createdAt`;--> statement-breakpoint
ALTER TABLE `videos` DROP COLUMN `updatedAt`;