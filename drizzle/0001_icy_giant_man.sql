CREATE TABLE `development_partnerships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`development_id` int NOT NULL,
	`brand_profile_id` int NOT NULL,
	`partnership_type` enum('co_developer','marketing_agency','primary_developer','investor','architect','contractor','other') NOT NULL,
	`receives_leads` tinyint NOT NULL DEFAULT 0,
	`display_order` int NOT NULL DEFAULT 0,
	`is_visible` tinyint NOT NULL DEFAULT 1,
	`notes` text,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`created_by` int,
	CONSTRAINT `development_partnerships_id` PRIMARY KEY(`id`),
	CONSTRAINT `unique_dev_brand` UNIQUE(`development_id`,`brand_profile_id`)
);
--> statement-breakpoint
DROP TABLE `development_partners`;--> statement-breakpoint
ALTER TABLE `development_partnerships` ADD CONSTRAINT `development_partnerships_development_id_developments_id_fk` FOREIGN KEY (`development_id`) REFERENCES `developments`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_partnerships` ADD CONSTRAINT `development_partnerships_brand_profile_id_developer_brand_profiles_id_fk` FOREIGN KEY (`brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `development_partnerships` ADD CONSTRAINT `development_partnerships_created_by_users_id_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `dev_brand_idx` ON `development_partnerships` (`development_id`,`brand_profile_id`);--> statement-breakpoint
CREATE INDEX `brand_dev_idx` ON `development_partnerships` (`brand_profile_id`,`development_id`);