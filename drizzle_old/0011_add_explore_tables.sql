CREATE TABLE `explore_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`icon` varchar(50),
	`image` text,
	`type` enum('lifestyle','property','investment','demographic') NOT NULL DEFAULT 'lifestyle',
	`display_order` int DEFAULT 0,
	`is_active` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_categories_id` PRIMARY KEY(`id`)
);

CREATE TABLE `explore_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`description` text,
	`cover_image` text,
	`type` enum('curated','algorithmic','seasonal','sponsored') NOT NULL DEFAULT 'curated',
	`is_active` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_topics_id` PRIMARY KEY(`id`)
);

CREATE TABLE `explore_neighbourhood_stories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suburb_id` int,
	`title` varchar(255) NOT NULL,
	`cover_image` text,
	`video_url` text,
	`story_data` json,
	`category` varchar(100),
	`is_published` int DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_neighbourhood_stories_id` PRIMARY KEY(`id`)
);

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
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `explore_sponsorships_id` PRIMARY KEY(`id`)
);

ALTER TABLE `explore_shorts` ADD `content_type` enum('property_tour','development_promo','agent_intro','neighbourhood_tour','market_insight','lifestyle','education') DEFAULT 'property_tour' NOT NULL;
ALTER TABLE `explore_shorts` ADD `topic_id` int;
ALTER TABLE `explore_shorts` ADD `category_id` int;

ALTER TABLE `explore_neighbourhood_stories` ADD CONSTRAINT `explore_neighbourhood_stories_suburb_id_suburbs_id_fk` FOREIGN KEY (`suburb_id`) REFERENCES `suburbs`(`id`) ON DELETE cascade ON UPDATE no action;
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_topic_id_explore_topics_id_fk` FOREIGN KEY (`topic_id`) REFERENCES `explore_topics`(`id`) ON DELETE set null ON UPDATE no action;
ALTER TABLE `explore_shorts` ADD CONSTRAINT `explore_shorts_category_id_explore_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `explore_categories`(`id`) ON DELETE set null ON UPDATE no action;

CREATE INDEX `idx_ens_suburb_id` ON `explore_neighbourhood_stories` (`suburb_id`);
CREATE INDEX `idx_es_target` ON `explore_sponsorships` (`target_type`,`target_id`);
CREATE INDEX `idx_es_status` ON `explore_sponsorships` (`status`);
