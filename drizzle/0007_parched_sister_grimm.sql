ALTER TABLE `developments` ADD `estateSpecs` json;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `total_units` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `available_units` int DEFAULT 0 NOT NULL;