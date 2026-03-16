ALTER TABLE `explore_content`
ADD `partner_id` varchar(36);
--> statement-breakpoint

CREATE TABLE `location_searches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int NOT NULL,
	`user_id` int,
	`searched_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT `location_searches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint

ALTER TABLE `location_searches` ADD CONSTRAINT `location_searches_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE `location_searches` ADD CONSTRAINT `location_searches_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;
--> statement-breakpoint

CREATE INDEX `idx_location_searched` ON `location_searches` (`location_id`,`searched_at`);
--> statement-breakpoint
CREATE INDEX `idx_location_searches_user` ON `location_searches` (`user_id`);
