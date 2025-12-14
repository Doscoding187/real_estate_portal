CREATE TABLE `amenities` (
	`id` int AUTO_INCREMENT NOT NULL,
	`location_id` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`type` varchar(100) NOT NULL,
	`rating` decimal(3,1),
	`latitude` varchar(50),
	`longitude` varchar(50),
	`distance` decimal(10,2),
	`metadata` json,
	`created_at` timestamp NOT NULL DEFAULT 'CURRENT_TIMESTAMP'
);
--> statement-breakpoint
ALTER TABLE `amenities` ADD CONSTRAINT `amenities_location_id_locations_id_fk` FOREIGN KEY (`location_id`) REFERENCES `locations`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_amenities_location_id` ON `amenities` (`location_id`);--> statement-breakpoint
CREATE INDEX `idx_amenities_type` ON `amenities` (`type`);