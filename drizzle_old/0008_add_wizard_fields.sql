ALTER TABLE `developments` ADD `tagline` varchar(255);--> statement-breakpoint
ALTER TABLE `developments` ADD `marketing_name` varchar(255);--> statement-breakpoint
ALTER TABLE `unit_types` ADD `reserved_units` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `transfer_costs_included` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `unit_types` ADD `monthly_levy` int;