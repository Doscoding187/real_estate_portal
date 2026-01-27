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
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE `property_clicks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`userId` int,
	`sessionId` varchar(255),
	`position` int,
	`searchFilters` json,
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
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
	`createdAt` timestamp DEFAULT CURRENT_TIMESTAMP
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
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE `developments` DROP FOREIGN KEY `developments_developerId_developers_id_fk`;
--> statement-breakpoint
DROP INDEX `idx_developments_developer_id` ON `developments`;--> statement-breakpoint
ALTER TABLE `saved_searches` MODIFY COLUMN `notificationFrequency` enum('never','daily','weekly','instant') DEFAULT 'never';--> statement-breakpoint
ALTER TABLE `developers` ADD `is_trusted` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `developments` ADD `developer_id` int;--> statement-breakpoint
ALTER TABLE `developments` ADD `readiness_score` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `developments` ADD `rejection_reasons` json;--> statement-breakpoint
ALTER TABLE `developments` ADD `rejection_note` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `readiness_score` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `quality_score` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `listings` ADD `quality_breakdown` json;--> statement-breakpoint
ALTER TABLE `listings` ADD `rejection_reasons` json;--> statement-breakpoint
ALTER TABLE `listings` ADD `rejection_note` text;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD `filters` json;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD `notificationMethod` varchar(20) DEFAULT 'email';--> statement-breakpoint
ALTER TABLE `saved_searches` ADD `lastNotified` timestamp;--> statement-breakpoint
ALTER TABLE `saved_searches` ADD `isActive` tinyint DEFAULT 1;--> statement-breakpoint
ALTER TABLE `suburbs` ADD `pros` json;--> statement-breakpoint
ALTER TABLE `suburbs` ADD `cons` json;--> statement-breakpoint
ALTER TABLE `suburbs` ADD `ai_generation_date` timestamp;--> statement-breakpoint
ALTER TABLE `property_clicks` ADD CONSTRAINT `property_clicks_propertyId_properties_id_fk` FOREIGN KEY (`propertyId`) REFERENCES `properties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `property_clicks` ADD CONSTRAINT `property_clicks_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `search_analytics` ADD CONSTRAINT `search_analytics_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_reviews` ADD CONSTRAINT `suburb_reviews_suburb_id_suburbs_id_fk` FOREIGN KEY (`suburb_id`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `suburb_reviews` ADD CONSTRAINT `suburb_reviews_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_partners_status` ON `partners` (`status`);--> statement-breakpoint
CREATE INDEX `idx_partners_category` ON `partners` (`category`);--> statement-breakpoint
CREATE INDEX `idx_property_clicks_property` ON `property_clicks` (`propertyId`);--> statement-breakpoint
CREATE INDEX `idx_property_clicks_created` ON `property_clicks` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_property_clicks_session` ON `property_clicks` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_created` ON `search_analytics` (`createdAt`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_user` ON `search_analytics` (`userId`);--> statement-breakpoint
CREATE INDEX `idx_search_analytics_session` ON `search_analytics` (`sessionId`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_suburb` ON `suburb_reviews` (`suburb_id`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_user` ON `suburb_reviews` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_rating` ON `suburb_reviews` (`rating`);--> statement-breakpoint
CREATE INDEX `idx_suburb_reviews_published` ON `suburb_reviews` (`is_published`);--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `developments_developer_id_developers_id_fk` FOREIGN KEY (`developer_id`) REFERENCES `developers`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_developments_developer_id` ON `developments` (`developer_id`);--> statement-breakpoint
ALTER TABLE `developments` DROP COLUMN `developerId`;