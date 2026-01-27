CREATE TABLE `hero_campaigns` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_type` enum('province','city','suburb') NOT NULL,
	`target_slug` varchar(255) NOT NULL,
	`image_url` varchar(1024) NOT NULL,
	`landing_page_url` varchar(1024),
	`alt_text` varchar(255),
	`start_date` timestamp,
	`end_date` timestamp,
	`is_active` tinyint NOT NULL DEFAULT 1,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `hero_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `idx_hero_campaigns_slug` ON `hero_campaigns` (`target_slug`);--> statement-breakpoint
CREATE INDEX `idx_hero_campaigns_active` ON `hero_campaigns` (`is_active`);--> statement-breakpoint
CREATE INDEX `idx_hero_campaigns_dates` ON `hero_campaigns` (`start_date`,`end_date`);