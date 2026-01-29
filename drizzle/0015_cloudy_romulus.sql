ALTER TABLE `listings` DROP FOREIGN KEY `listings_locationId_locations_id_fk`;
--> statement-breakpoint
ALTER TABLE `listings` ADD `location_id` int;--> statement-breakpoint
ALTER TABLE `listings` DROP COLUMN `locationId`;