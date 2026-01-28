CREATE TABLE `developer_brand_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`brand_name` varchar(255) NOT NULL,
	`slug` varchar(255) NOT NULL,
	`logo_url` text,
	`about` text,
	`founded_year` int,
	`head_office_location` varchar(255),
	`operating_provinces` json,
	`property_focus` json,
	`website_url` varchar(500),
	`public_contact_email` varchar(320),
	`brand_tier` enum('national','regional','boutique') DEFAULT 'regional',
	`source_attribution` varchar(255),
	`profile_type` enum('industry_reference','verified_partner') DEFAULT 'industry_reference',
	`is_subscriber` tinyint NOT NULL DEFAULT 0,
	`is_claimable` tinyint NOT NULL DEFAULT 1,
	`is_visible` tinyint NOT NULL DEFAULT 1,
	`is_contact_verified` tinyint NOT NULL DEFAULT 0,
	`linked_developer_account_id` int,
	`owner_type` enum('platform','developer') NOT NULL DEFAULT 'platform',
	`claim_requested_at` timestamp,
	`total_leads_received` int NOT NULL DEFAULT 0,
	`last_lead_date` timestamp,
	`unclaimed_lead_count` int NOT NULL DEFAULT 0,
	`created_by` int,
	`created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	`updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `developer_brand_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `developments` ADD `developer_brand_profile_id` int;--> statement-breakpoint
ALTER TABLE `developments` ADD `dev_owner_type` enum('platform','developer') DEFAULT 'developer';--> statement-breakpoint
ALTER TABLE `developments` ADD `is_showcase` tinyint DEFAULT 0;--> statement-breakpoint
ALTER TABLE `leads` ADD `developer_brand_profile_id` int;--> statement-breakpoint
ALTER TABLE `leads` ADD `brand_lead_status` enum('captured','delivered_unsubscribed','delivered_subscriber','claimed') DEFAULT 'captured';--> statement-breakpoint
ALTER TABLE `leads` ADD `lead_delivery_method` enum('email','crm_export','manual','none') DEFAULT 'email';--> statement-breakpoint
ALTER TABLE `properties` ADD `developer_brand_profile_id` int;--> statement-breakpoint
ALTER TABLE `developer_brand_profiles` ADD CONSTRAINT `brand_profiles_linked_dev_fk` FOREIGN KEY (`linked_developer_account_id`) REFERENCES `developers`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `developer_brand_profiles` ADD CONSTRAINT `brand_profiles_created_by_fk` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `idx_brand_profiles_slug` ON `developer_brand_profiles` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_brand_profiles_tier` ON `developer_brand_profiles` (`brand_tier`);--> statement-breakpoint
CREATE INDEX `idx_brand_profiles_visible` ON `developer_brand_profiles` (`is_visible`);--> statement-breakpoint
CREATE INDEX `idx_brand_profiles_subscriber` ON `developer_brand_profiles` (`is_subscriber`);--> statement-breakpoint
CREATE INDEX `idx_brand_profiles_owner` ON `developer_brand_profiles` (`owner_type`);--> statement-breakpoint
ALTER TABLE `developments` ADD CONSTRAINT `devs_brand_profile_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `leads` ADD CONSTRAINT `leads_brand_profile_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `properties` ADD CONSTRAINT `props_brand_profile_fk` FOREIGN KEY (`developer_brand_profile_id`) REFERENCES `developer_brand_profiles`(`id`) ON DELETE set null ON UPDATE no action;