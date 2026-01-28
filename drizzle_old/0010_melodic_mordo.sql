ALTER TABLE `developments` MODIFY COLUMN `monthly_levy_from` decimal(10,2);--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `monthly_levy_to` decimal(10,2);--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `rates_from` decimal(10,2);--> statement-breakpoint
ALTER TABLE `developments` MODIFY COLUMN `rates_to` decimal(10,2);--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `unique_slug` UNIQUE(`slug`);